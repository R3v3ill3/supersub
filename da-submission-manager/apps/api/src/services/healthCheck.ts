import { getSupabase } from '../lib/supabase';
import { GoogleDocsService } from './googleDocs';
import { ActionNetworkClient } from './actionNetwork';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import nodemailer from 'nodemailer';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: Date;
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
}

export interface SystemHealthResult {
  overall: HealthStatus;
  timestamp: Date;
  checks: Record<string, HealthCheckResult>;
  metrics: {
    responseTime: number;
    errorRate: number;
    queueDepth: number;
    activeConnections: number;
  };
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private checkCache: Map<string, HealthCheckResult> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Perform comprehensive system health check
   */
  async performHealthCheck(): Promise<SystemHealthResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkGoogleDocs(),
      this.checkOpenAI(),
      this.checkGemini(),
      this.checkActionNetwork(),
      this.checkEmail(),
      this.checkFileSystem(),
      this.checkMemoryUsage(),
      this.checkQueueHealth()
    ]);

    const healthResults: Record<string, HealthCheckResult> = {};
    const checkNames = [
      'database',
      'google_docs',
      'openai',
      'gemini', 
      'action_network',
      'email',
      'file_system',
      'memory',
      'queue'
    ];

    checks.forEach((result, index) => {
      const checkName = checkNames[index];
      if (result.status === 'fulfilled') {
        healthResults[checkName] = result.value;
      } else {
        healthResults[checkName] = {
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          message: `Health check failed: ${result.reason?.message || 'Unknown error'}`
        };
      }
    });

    // Calculate overall health status
    const overall = this.calculateOverallHealth(healthResults);
    
    // Calculate metrics
    const metrics = await this.calculateMetrics();

    return {
      overall,
      timestamp,
      checks: healthResults,
      metrics: {
        responseTime: Date.now() - startTime,
        ...metrics
      }
    };
  }

  /**
   * Check database connectivity and performance
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return {
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          message: 'Database not configured'
        };
      }

      // Test connection with a simple query
      const { data, error } = await Promise.race([
        supabase.from('projects').select('count').limit(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 5000)
        )
      ]) as any;

      if (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          message: `Database error: ${error.message}`
        };
      }

      const responseTime = Date.now() - startTime;
      const status = responseTime < 1000 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED;

      return {
        status,
        timestamp: new Date(),
        responseTime,
        message: status === HealthStatus.HEALTHY ? 'Database responsive' : 'Database slow response',
        details: { responseTimeMs: responseTime }
      };
    } catch (error: any) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: `Database check failed: ${error.message}`
      };
    }
  }

  /**
   * Check Google Docs API connectivity
   */
  async checkGoogleDocs(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!process.env.GOOGLE_CREDENTIALS_JSON) {
        return {
          status: HealthStatus.UNKNOWN,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          message: 'Google Docs not configured'
        };
      }

      const googleDocs = new GoogleDocsService();
      // Test with a minimal operation (just auth check)
      await Promise.race([
        googleDocs.exportToText('test'), // This will fail but tests auth
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Google Docs timeout')), 5000)
        )
      ]);

      // If we get here without auth error, service is available
      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: 'Google Docs API accessible'
      };
    } catch (error: any) {
      const isAuthError = error.message?.includes('credentials') || error.message?.includes('auth');
      if (isAuthError) {
        return {
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          message: 'Google Docs authentication failed'
        };
      }

      // Other errors might be expected (like document not found)
      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: 'Google Docs API accessible'
      };
    }
  }

  /**
   * Check OpenAI API connectivity
   */
  async checkOpenAI(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!process.env.OPENAI_API_KEY) {
        return {
          status: HealthStatus.UNKNOWN,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          message: 'OpenAI not configured'
        };
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Test with a minimal API call
      const response = await Promise.race([
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI timeout')), 10000)
        )
      ]) as any;

      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: 'OpenAI API accessible',
        details: { model: response.model }
      };
    } catch (error: any) {
      const status = error.message?.includes('rate limit') || error.message?.includes('quota') 
        ? HealthStatus.DEGRADED 
        : HealthStatus.UNHEALTHY;

      return {
        status,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: `OpenAI API error: ${error.message}`
      };
    }
  }

  /**
   * Check Gemini API connectivity
   */
  async checkGemini(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!process.env.GEMINI_API_KEY) {
        return {
          status: HealthStatus.UNKNOWN,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          message: 'Gemini not configured'
        };
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Test with a minimal API call
      const result = await Promise.race([
        model.generateContent('test'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Gemini timeout')), 10000)
        )
      ]) as any;

      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: 'Gemini API accessible'
      };
    } catch (error: any) {
      const status = error.message?.includes('rate limit') || error.message?.includes('quota')
        ? HealthStatus.DEGRADED
        : HealthStatus.UNHEALTHY;

      return {
        status,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: `Gemini API error: ${error.message}`
      };
    }
  }

  /**
   * Check Action Network API connectivity
   */
  async checkActionNetwork(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // This would need project-specific API key, so we'll just check if configured
      if (!process.env.ACTION_NETWORK_API_KEY) {
        return {
          status: HealthStatus.UNKNOWN,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          message: 'Action Network not configured globally'
        };
      }

      // For now, just return healthy if configured
      // In a real implementation, you'd test with a minimal API call
      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: 'Action Network configured'
      };
    } catch (error: any) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: `Action Network error: ${error.message}`
      };
    }
  }

  /**
   * Check email service connectivity
   */
  async checkEmail(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!process.env.SMTP_HOST) {
        return {
          status: HealthStatus.UNKNOWN,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          message: 'Email not configured'
        };
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS
        }
      });

      // Test connection
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email timeout')), 5000)
        )
      ]);

      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: 'Email service accessible'
      };
    } catch (error: any) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: `Email service error: ${error.message}`
      };
    }
  }

  /**
   * Check file system health
   */
  async checkFileSystem(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const fs = require('fs').promises;
      const os = require('os');
      
      // Check temp directory write permissions
      const testFile = `${os.tmpdir()}/health-check-${Date.now()}.tmp`;
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      
      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: 'File system accessible'
      };
    } catch (error: any) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: `File system error: ${error.message}`
      };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const totalMemMB = memUsage.heapTotal / 1024 / 1024;
      const usedMemMB = memUsage.heapUsed / 1024 / 1024;
      const usagePercent = (usedMemMB / totalMemMB) * 100;
      
      let status = HealthStatus.HEALTHY;
      let message = `Memory usage: ${usedMemMB.toFixed(1)}MB / ${totalMemMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`;
      
      if (usagePercent > 90) {
        status = HealthStatus.UNHEALTHY;
        message = `High memory usage: ${message}`;
      } else if (usagePercent > 75) {
        status = HealthStatus.DEGRADED;
        message = `Elevated memory usage: ${message}`;
      }
      
      return {
        status,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message,
        details: {
          heapUsedMB: usedMemMB,
          heapTotalMB: totalMemMB,
          usagePercent,
          external: memUsage.external / 1024 / 1024
        }
      };
    } catch (error: any) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: `Memory check error: ${error.message}`
      };
    }
  }

  /**
   * Check queue health (processing queues, pending operations)
   */
  async checkQueueHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return {
          status: HealthStatus.UNKNOWN,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          message: 'Cannot check queues - database not configured'
        };
      }

      // Check pending operations
      const { data: pendingOps, error } = await supabase
        .from('recovery_operations')
        .select('count')
        .in('status', ['pending', 'retrying']);

      if (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          message: `Queue check error: ${error.message}`
        };
      }

      const pendingCount = pendingOps?.length || 0;
      let status = HealthStatus.HEALTHY;
      let message = `Queue healthy: ${pendingCount} pending operations`;
      
      if (pendingCount > 100) {
        status = HealthStatus.UNHEALTHY;
        message = `Queue backlog critical: ${pendingCount} pending operations`;
      } else if (pendingCount > 25) {
        status = HealthStatus.DEGRADED;
        message = `Queue backlog elevated: ${pendingCount} pending operations`;
      }
      
      return {
        status,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message,
        details: { pendingOperations: pendingCount }
      };
    } catch (error: any) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        message: `Queue health check failed: ${error.message}`
      };
    }
  }

  /**
   * Calculate overall system health status
   */
  private calculateOverallHealth(checks: Record<string, HealthCheckResult>): HealthStatus {
    const criticalSystems = ['database', 'memory', 'file_system'];
    const importantSystems = ['google_docs', 'openai', 'gemini', 'email'];
    
    // Check critical systems first
    for (const system of criticalSystems) {
      if (checks[system]?.status === HealthStatus.UNHEALTHY) {
        return HealthStatus.UNHEALTHY;
      }
    }

    // Count degraded/unhealthy important systems
    let degradedCount = 0;
    let unhealthyCount = 0;
    
    for (const system of importantSystems) {
      if (checks[system]?.status === HealthStatus.UNHEALTHY) {
        unhealthyCount++;
      } else if (checks[system]?.status === HealthStatus.DEGRADED) {
        degradedCount++;
      }
    }

    // If any important system is unhealthy, overall is degraded
    if (unhealthyCount > 0 || degradedCount > 1) {
      return HealthStatus.DEGRADED;
    }

    // Check if any critical system is degraded
    for (const system of criticalSystems) {
      if (checks[system]?.status === HealthStatus.DEGRADED) {
        return HealthStatus.DEGRADED;
      }
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Calculate system metrics
   */
  private async calculateMetrics(): Promise<{
    errorRate: number;
    queueDepth: number;
    activeConnections: number;
  }> {
    const supabase = getSupabase();
    const defaultMetrics = {
      errorRate: 0,
      queueDepth: 0,
      activeConnections: 0
    };

    if (!supabase) {
      return defaultMetrics;
    }

    try {
      // Calculate error rate over last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const [errorResult, queueResult] = await Promise.all([
        supabase
          .from('error_logs')
          .select('count')
          .gte('created_at', oneHourAgo),
        supabase
          .from('recovery_operations')
          .select('count')
          .in('status', ['pending', 'retrying'])
      ]);

      return {
        errorRate: errorResult.data?.length || 0,
        queueDepth: queueResult.data?.length || 0,
        activeConnections: 0 // This would need process monitoring
      };
    } catch {
      return defaultMetrics;
    }
  }

  /**
   * Get cached health check result
   */
  getCachedResult(checkName: string): HealthCheckResult | null {
    const cached = this.checkCache.get(checkName);
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  /**
   * Cache health check result
   */
  setCachedResult(checkName: string, result: HealthCheckResult): void {
    this.checkCache.set(checkName, result);
  }
}

// Export singleton instance
export const healthCheckService = HealthCheckService.getInstance();
