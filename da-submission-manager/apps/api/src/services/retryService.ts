import { getSupabase } from '../lib/supabase';
import { errorHandler, ErrorType, ErrorCode, ErrorContext } from './errorHandler';

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Circuit breaker triggered, blocking calls
  HALF_OPEN = 'half_open' // Testing if service has recovered
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  successThreshold: number;    // Number of successes needed to close from half-open
  timeout: number;            // How long to wait before trying half-open (ms)
  monitoringPeriod: number;   // Time window for counting failures (ms)
}

export interface RetryContext {
  operation: string;
  submissionId?: string;
  attempt: number;
  maxAttempts: number;
  lastError?: Error;
  startTime: number;
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

type AsyncOperation<T> = () => Promise<T>;

export class RetryService {
  private static instance: RetryService;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true
  };
  private defaultCircuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    monitoringPeriod: 300000 // 5 minutes
  };

  static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  /**
   * Execute operation with retry logic and circuit breaker protection
   */
  async executeWithRetry<T>(
    operation: AsyncOperation<T>,
    context: {
      operationName: string;
      submissionId?: string;
      retryConfig?: Partial<RetryConfig>;
      circuitConfig?: Partial<CircuitBreakerConfig>;
      errorContext?: ErrorContext;
    }
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...context.retryConfig };
    const circuitConfig = { ...this.defaultCircuitConfig, ...context.circuitConfig };
    
    // Check circuit breaker
    if (!this.canExecute(context.operationName, circuitConfig)) {
      const error = new Error(`Circuit breaker is OPEN for operation: ${context.operationName}`);
      throw await errorHandler.handleError(
        ErrorType.INTEGRATION,
        ErrorCode.SERVICE_UNAVAILABLE,
        `Service temporarily unavailable due to repeated failures`,
        { 
          ...context.errorContext,
          operation: context.operationName,
          submissionId: context.submissionId,
          retryable: true,
          retryAfter: Math.ceil(circuitConfig.timeout / 1000)
        },
        error
      );
    }

    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      const retryContext: RetryContext = {
        operation: context.operationName,
        submissionId: context.submissionId,
        attempt,
        maxAttempts: config.maxRetries + 1,
        lastError: lastError || undefined,
        startTime
      };

      try {
        const result = await operation();
        
        // Record success for circuit breaker
        this.recordSuccess(context.operationName, circuitConfig);
        
        // Log successful retry if it wasn't the first attempt
        if (attempt > 1) {
          await this.logRetrySuccess(retryContext);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Record failure for circuit breaker
        this.recordFailure(context.operationName, circuitConfig);
        
        // Check if this is a retriable error
        if (!this.isRetriableError(error) || attempt > config.maxRetries) {
          // Log final failure
          await this.logRetryFailure(retryContext, error, attempt > config.maxRetries);
          throw error;
        }

        // Calculate delay for next retry
        const delay = this.calculateDelay(attempt - 1, config);
        
        // Log retry attempt
        await this.logRetryAttempt(retryContext, error, delay);
        
        // Wait before retry
        await this.delay(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Unexpected retry loop exit');
  }

  /**
   * Manual retry for failed operations (admin interface)
   */
  async retryFailedOperation(operationId: string): Promise<{ success: boolean; message: string; result?: any }> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    // Get operation details
    const { data: operation, error } = await supabase
      .from('recovery_operations')
      .select('*')
      .eq('id', operationId)
      .single();

    if (error || !operation) {
      throw new Error(`Recovery operation not found: ${operationId}`);
    }

    if (operation.status === 'completed') {
      return { success: false, message: 'Operation already completed' };
    }

    if (operation.retry_count >= operation.max_retries) {
      return { success: false, message: 'Maximum retries exceeded' };
    }

    try {
      // Update operation status
      await supabase
        .from('recovery_operations')
        .update({
          status: 'retrying',
          retry_count: operation.retry_count + 1,
          next_retry_at: null
        })
        .eq('id', operationId);

      // Execute the retry based on operation type
      const result = await this.executeOperationRetry(operation);

      // Mark as completed
      await supabase
        .from('recovery_operations')
        .update({
          status: 'completed',
          error_details: {
            ...operation.error_details,
            completedAt: new Date().toISOString(),
            result
          }
        })
        .eq('id', operationId);

      return { success: true, message: 'Operation completed successfully', result };
    } catch (retryError: any) {
      // Update operation with new error
      await supabase
        .from('recovery_operations')
        .update({
          status: 'failed',
          error_details: {
            ...operation.error_details,
            lastRetryError: retryError.message,
            lastRetryAt: new Date().toISOString()
          }
        })
        .eq('id', operationId);

      return { success: false, message: `Retry failed: ${retryError.message}` };
    }
  }

  /**
   * Get retry statistics for monitoring
   */
  async getRetryStatistics(timeWindow: number = 24 * 60 * 60 * 1000): Promise<{
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    operationStats: Record<string, { attempts: number; successes: number; failures: number }>;
    circuitBreakerStats: Record<string, CircuitBreakerState>;
  }> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    const since = new Date(Date.now() - timeWindow).toISOString();

    const { data: operations, error } = await supabase
      .from('recovery_operations')
      .select('*')
      .gte('created_at', since);

    if (error) {
      throw new Error(`Failed to get retry statistics: ${error.message}`);
    }

    const totalRetries = operations?.length || 0;
    const successfulRetries = operations?.filter(op => op.status === 'completed').length || 0;
    const failedRetries = operations?.filter(op => op.status === 'failed').length || 0;

    const operationStats: Record<string, { attempts: number; successes: number; failures: number }> = {};
    operations?.forEach(op => {
      if (!operationStats[op.operation_type]) {
        operationStats[op.operation_type] = { attempts: 0, successes: 0, failures: 0 };
      }
      operationStats[op.operation_type].attempts++;
      if (op.status === 'completed') {
        operationStats[op.operation_type].successes++;
      } else if (op.status === 'failed') {
        operationStats[op.operation_type].failures++;
      }
    });

    const circuitBreakerStats: Record<string, CircuitBreakerState> = {};
    this.circuitBreakers.forEach((state, operation) => {
      circuitBreakerStats[operation] = { ...state };
    });

    return {
      totalRetries,
      successfulRetries,
      failedRetries,
      operationStats,
      circuitBreakerStats
    };
  }

  /**
   * Check if operation can be executed (circuit breaker logic)
   */
  private canExecute(operationName: string, config: CircuitBreakerConfig): boolean {
    const state = this.getCircuitState(operationName);
    const now = Date.now();

    switch (state.state) {
      case CircuitState.CLOSED:
        return true;
      case CircuitState.OPEN:
        if (now >= state.nextAttemptTime) {
          // Transition to half-open
          state.state = CircuitState.HALF_OPEN;
          state.successCount = 0;
          return true;
        }
        return false;
      case CircuitState.HALF_OPEN:
        return true;
      default:
        return true;
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(operationName: string, config: CircuitBreakerConfig): void {
    const state = this.getCircuitState(operationName);
    const now = Date.now();

    if (state.state === CircuitState.HALF_OPEN) {
      state.successCount++;
      if (state.successCount >= config.successThreshold) {
        // Close the circuit
        state.state = CircuitState.CLOSED;
        state.failureCount = 0;
        state.successCount = 0;
      }
    } else if (state.state === CircuitState.CLOSED) {
      // Reset failure count on success
      if (now - state.lastFailureTime > config.monitoringPeriod) {
        state.failureCount = 0;
      }
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(operationName: string, config: CircuitBreakerConfig): void {
    const state = this.getCircuitState(operationName);
    const now = Date.now();

    state.lastFailureTime = now;

    if (state.state === CircuitState.HALF_OPEN) {
      // Failed in half-open, go back to open
      state.state = CircuitState.OPEN;
      state.nextAttemptTime = now + config.timeout;
      state.failureCount++;
    } else if (state.state === CircuitState.CLOSED) {
      state.failureCount++;
      if (state.failureCount >= config.failureThreshold) {
        // Open the circuit
        state.state = CircuitState.OPEN;
        state.nextAttemptTime = now + config.timeout;
      }
    }
  }

  /**
   * Get or create circuit breaker state
   */
  private getCircuitState(operationName: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.set(operationName, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0
      });
    }
    return this.circuitBreakers.get(operationName)!;
  }

  /**
   * Check if error is retriable
   */
  private isRetriableError(error: any): boolean {
    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // HTTP errors
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408;
    }

    // Specific error patterns
    const message = error.message?.toLowerCase() || '';
    if (message.includes('timeout') || 
        message.includes('rate limit') || 
        message.includes('quota') ||
        message.includes('service unavailable') ||
        message.includes('temporary')) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = Math.min(config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt), config.maxDelayMs);
    
    if (config.jitter) {
      // Add random jitter ±25%
      const jitterAmount = delay * 0.25;
      delay += (Math.random() * 2 - 1) * jitterAmount;
    }
    
    return Math.floor(delay);
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute specific operation retry based on type
   */
  private async executeOperationRetry(operation: any): Promise<any> {
    // This would need to be implemented based on specific operation types
    // For now, return a placeholder
    switch (operation.operation_type) {
      case 'document_generation':
        return { message: 'Document generation retry not implemented yet' };
      case 'email_delivery':
        return { message: 'Email delivery retry not implemented yet' };
      case 'action_network_sync':
        return { message: 'Action Network sync retry not implemented yet' };
      default:
        throw new Error(`Unknown operation type: ${operation.operation_type}`);
    }
  }

  /**
   * Log retry attempt
   */
  private async logRetryAttempt(context: RetryContext, error: Error, delay: number): Promise<void> {
    console.warn(`Retry attempt ${context.attempt}/${context.maxAttempts} for ${context.operation} in ${delay}ms`, {
      submissionId: context.submissionId,
      error: error.message,
      attempt: context.attempt,
      delay
    });
  }

  /**
   * Log successful retry
   */
  private async logRetrySuccess(context: RetryContext): Promise<void> {
    console.info(`Retry successful for ${context.operation} after ${context.attempt} attempts`, {
      submissionId: context.submissionId,
      totalAttempts: context.attempt,
      duration: Date.now() - context.startTime
    });
  }

  /**
   * Log retry failure
   */
  private async logRetryFailure(context: RetryContext, error: Error, maxRetriesExceeded: boolean): Promise<void> {
    console.error(`Retry failed for ${context.operation}`, {
      submissionId: context.submissionId,
      attempts: context.attempt,
      maxRetriesExceeded,
      error: error.message,
      duration: Date.now() - context.startTime
    });
  }
}

// Export singleton instance
export const retryService = RetryService.getInstance();
