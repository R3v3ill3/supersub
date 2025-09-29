import { Request, Response } from 'express';
import { getSupabase } from '../lib/supabase';
import { AnalyticsService } from './analytics';

export enum ErrorType {
  USER = 'user',
  SYSTEM = 'system', 
  INTEGRATION = 'integration',
  TEMPORARY = 'temporary'
}

export enum ErrorCode {
  // User Errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // System Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Integration Errors
  GOOGLE_API_ERROR = 'GOOGLE_API_ERROR',
  OPENAI_API_ERROR = 'OPENAI_API_ERROR',
  GEMINI_API_ERROR = 'GEMINI_API_ERROR',
  ACTION_NETWORK_ERROR = 'ACTION_NETWORK_ERROR',
  EMAIL_DELIVERY_ERROR = 'EMAIL_DELIVERY_ERROR',
  
  // Temporary Errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

export interface ErrorContext {
  submissionId?: string;
  projectId?: string;
  userId?: string;
  operation?: string;
  metadata?: Record<string, any>;
  retryable?: boolean;
  retryAfter?: number; // seconds
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'manual_intervention' | 'graceful_degradation';
  description: string;
  automated: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface StandardError {
  id: string;
  type: ErrorType;
  code: ErrorCode;
  message: string;
  userMessage: string;
  context: ErrorContext;
  recoveryActions: RecoveryAction[];
  timestamp: Date;
  stack?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Create a standardized error object
   */
  createError(
    type: ErrorType,
    code: ErrorCode,
    message: string,
    context: ErrorContext = {},
    originalError?: Error
  ): StandardError {
    const id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();
    
    const standardError: StandardError = {
      id,
      type,
      code,
      message,
      userMessage: this.generateUserMessage(type, code, context),
      context,
      recoveryActions: this.determineRecoveryActions(type, code, context),
      timestamp,
      stack: originalError?.stack
    };

    return standardError;
  }

  /**
   * Handle and process an error through the complete workflow
   */
  async handleError(
    type: ErrorType,
    code: ErrorCode,
    message: string,
    context: ErrorContext = {},
    originalError?: Error
  ): Promise<StandardError> {
    const error = this.createError(type, code, message, context, originalError);
    
    // Log to database
    await this.logError(error);
    
    // Send analytics
    if (typeof this.analyticsService.trackError === 'function') {
      this.analyticsService.trackError({
        errorId: error.id,
        type: error.type,
        code: error.code,
        submissionId: context.submissionId,
        operation: context.operation
      });
    }

    // Determine if admin notification is needed
    if (this.shouldNotifyAdmin(error)) {
      await this.notifyAdmin(error);
    }

    // Schedule automatic recovery if applicable
    if (error.context.retryable) {
      await this.scheduleRetry(error);
    }

    return error;
  }

  /**
   * Express middleware for centralized error handling
   */
  middleware() {
    return async (err: any, req: Request, res: Response, next: Function) => {
      // Don't handle if response already sent
      if (res.headersSent) {
        return next(err);
      }

      const context: ErrorContext = {
        operation: `${req.method} ${req.path}`,
        metadata: {
          body: req.body,
          query: req.query,
          params: req.params,
          headers: req.headers,
          ip: req.ip
        }
      };

      let standardError: StandardError;

      if (err.name === 'ZodError') {
        standardError = await this.handleError(
          ErrorType.USER,
          ErrorCode.VALIDATION_FAILED,
          'Request validation failed',
          context,
          err
        );
      } else if (err.message?.includes('not found')) {
        standardError = await this.handleError(
          ErrorType.USER,
          ErrorCode.NOT_FOUND,
          'Resource not found',
          context,
          err
        );
      } else if (err.code === 'PGRST116') { // Supabase not found
        standardError = await this.handleError(
          ErrorType.USER,
          ErrorCode.NOT_FOUND,
          'Database record not found',
          context,
          err
        );
      } else if (err.message?.includes('quota') || err.message?.includes('rate limit')) {
        const retryAfter = this.extractRetryAfter(err);
        standardError = await this.handleError(
          ErrorType.TEMPORARY,
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Service rate limit exceeded',
          { ...context, retryable: true, retryAfter },
          err
        );
      } else if (err.message?.includes('timeout')) {
        standardError = await this.handleError(
          ErrorType.TEMPORARY,
          ErrorCode.TIMEOUT,
          'Operation timed out',
          { ...context, retryable: true },
          err
        );
      } else if (err.message?.includes('Google')) {
        standardError = await this.handleError(
          ErrorType.INTEGRATION,
          ErrorCode.GOOGLE_API_ERROR,
          'Google API integration failed',
          { ...context, retryable: true },
          err
        );
      } else if (err.message?.includes('OpenAI')) {
        standardError = await this.handleError(
          ErrorType.INTEGRATION,
          ErrorCode.OPENAI_API_ERROR,
          'OpenAI API integration failed',
          { ...context, retryable: true },
          err
        );
      } else if (err.message?.includes('Action Network')) {
        standardError = await this.handleError(
          ErrorType.INTEGRATION,
          ErrorCode.ACTION_NETWORK_ERROR,
          'Action Network integration failed',
          { ...context, retryable: true },
          err
        );
      } else {
        // Generic system error
        standardError = await this.handleError(
          ErrorType.SYSTEM,
          ErrorCode.DATABASE_ERROR,
          err.message || 'An unexpected error occurred',
          context,
          err
        );
      }

      const statusCode = this.getHttpStatusCode(standardError);
      const response = this.formatErrorResponse(standardError);

      res.status(statusCode).json(response);
    };
  }

  /**
   * Generate user-friendly error messages
   */
  private generateUserMessage(type: ErrorType, code: ErrorCode, context: ErrorContext): string {
    switch (code) {
      case ErrorCode.VALIDATION_FAILED:
        return 'Please check your input and try again.';
      case ErrorCode.NOT_FOUND:
        return 'The requested resource was not found.';
      case ErrorCode.UNAUTHORIZED:
        return 'You need to be logged in to perform this action.';
      case ErrorCode.FORBIDDEN:
        return 'You do not have permission to perform this action.';
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return context.retryAfter 
          ? `Service temporarily busy. Please try again in ${context.retryAfter} seconds.`
          : 'Service temporarily busy. Please try again in a few minutes.';
      case ErrorCode.TIMEOUT:
        return 'The operation took too long to complete. Please try again.';
      case ErrorCode.GOOGLE_API_ERROR:
        return 'Document service temporarily unavailable. Please try again.';
      case ErrorCode.OPENAI_API_ERROR:
      case ErrorCode.GEMINI_API_ERROR:
        return 'AI service temporarily unavailable. Please try again.';
      case ErrorCode.ACTION_NETWORK_ERROR:
        return 'Supporter network sync temporarily unavailable.';
      case ErrorCode.EMAIL_DELIVERY_ERROR:
        return 'Email delivery failed. Please check the recipient address.';
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Our team has been notified.';
    }
  }

  /**
   * Determine appropriate recovery actions
   */
  private determineRecoveryActions(type: ErrorType, code: ErrorCode, context: ErrorContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (type) {
      case ErrorType.TEMPORARY:
        actions.push({
          type: 'retry',
          description: 'Automatic retry with exponential backoff',
          automated: true,
          priority: 'medium'
        });
        break;
        
      case ErrorType.INTEGRATION:
        actions.push({
          type: 'retry',
          description: 'Retry with circuit breaker protection',
          automated: true,
          priority: 'medium'
        });
        
        if (code === ErrorCode.OPENAI_API_ERROR) {
          actions.push({
            type: 'fallback',
            description: 'Fallback to Gemini API',
            automated: true,
            priority: 'high'
          });
        }
        
        if (code === ErrorCode.GOOGLE_API_ERROR && context.submissionId) {
          actions.push({
            type: 'manual_intervention',
            description: 'Manual document generation required',
            automated: false,
            priority: 'high'
          });
        }
        break;
        
      case ErrorType.SYSTEM:
        actions.push({
          type: 'manual_intervention',
          description: 'System administrator review required',
          automated: false,
          priority: 'critical'
        });
        break;
        
      case ErrorType.USER:
        actions.push({
          type: 'graceful_degradation',
          description: 'User input correction required',
          automated: false,
          priority: 'low'
        });
        break;
    }

    return actions;
  }

  /**
   * Log error to database
   */
  private async logError(error: StandardError): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      await supabase.from('error_logs').insert({
        id: error.id,
        submission_id: error.context.submissionId || null,
        error_type: error.type,
        error_code: error.code,
        error_message: error.message,
        stack_trace: error.stack || null,
        context: error.context,
        resolution_status: 'unresolved',
        retry_count: 0
      });
    } catch (logError) {
      // Fallback to console logging if database logging fails
      console.error('Failed to log error to database:', logError);
      console.error('Original error:', error);
    }
  }

  /**
   * Schedule automatic retry operation
   */
  private async scheduleRetry(error: StandardError): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase || !error.context.submissionId) return;

      const retryAfter = error.context.retryAfter || 30; // Default 30 seconds
      const nextRetryAt = new Date(Date.now() + (retryAfter * 1000));

      await supabase.from('recovery_operations').insert({
        submission_id: error.context.submissionId,
        operation_type: error.context.operation || 'unknown',
        status: 'pending',
        retry_count: 0,
        max_retries: this.getMaxRetries(error.code),
        next_retry_at: nextRetryAt.toISOString(),
        error_details: {
          errorId: error.id,
          originalError: error.message,
          context: error.context
        }
      });
    } catch (scheduleError) {
      console.error('Failed to schedule retry:', scheduleError);
    }
  }

  /**
   * Determine if admin notification is needed
   */
  private shouldNotifyAdmin(error: StandardError): boolean {
    // Notify on critical errors or repeated failures
    if (error.type === ErrorType.SYSTEM) return true;
    if (error.recoveryActions.some(action => action.priority === 'critical')) return true;
    if (error.code === ErrorCode.DATABASE_ERROR) return true;
    if (error.code === ErrorCode.CONFIGURATION_ERROR) return true;
    
    return false;
  }

  /**
   * Send admin notification (placeholder for now)
   */
  private async notifyAdmin(error: StandardError): Promise<void> {
    // This would integrate with email/slack/etc notification system
    console.error('ADMIN NOTIFICATION REQUIRED:', {
      errorId: error.id,
      type: error.type,
      code: error.code,
      message: error.message,
      context: error.context
    });
  }

  /**
   * Get HTTP status code for error
   */
  private getHttpStatusCode(error: StandardError): number {
    switch (error.code) {
      case ErrorCode.VALIDATION_FAILED:
        return 400;
      case ErrorCode.UNAUTHORIZED:
        return 401;
      case ErrorCode.FORBIDDEN:
        return 403;
      case ErrorCode.NOT_FOUND:
        return 404;
      case ErrorCode.CONFLICT:
        return 409;
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return 429;
      case ErrorCode.SERVICE_UNAVAILABLE:
      case ErrorCode.TIMEOUT:
        return 503;
      default:
        return 500;
    }
  }

  /**
   * Format error response for API
   */
  private formatErrorResponse(error: StandardError) {
    return {
      error: {
        id: error.id,
        type: error.type,
        code: error.code,
        message: error.userMessage,
        timestamp: error.timestamp.toISOString(),
        retryable: error.context.retryable || false,
        retryAfter: error.context.retryAfter,
        recoveryActions: error.recoveryActions.filter(action => !action.automated)
      }
    };
  }

  /**
   * Extract retry-after value from error
   */
  private extractRetryAfter(error: any): number | undefined {
    if (error.response?.headers?.['retry-after']) {
      return parseInt(error.response.headers['retry-after']);
    }
    if (error.message?.match(/retry after (\d+)/i)) {
      return parseInt(error.message.match(/retry after (\d+)/i)![1]);
    }
    return undefined;
  }

  /**
   * Get maximum retry attempts for error code
   */
  private getMaxRetries(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return 5;
      case ErrorCode.TIMEOUT:
        return 3;
      case ErrorCode.GOOGLE_API_ERROR:
      case ErrorCode.OPENAI_API_ERROR:
      case ErrorCode.GEMINI_API_ERROR:
      case ErrorCode.ACTION_NETWORK_ERROR:
        return 3;
      case ErrorCode.EMAIL_DELIVERY_ERROR:
        return 2;
      default:
        return 1;
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
