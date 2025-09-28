import { Router } from 'express';
import { z } from 'zod';
import { getSupabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { healthCheckService } from '../services/healthCheck';
import { retryService } from '../services/retryService';

const router = Router();

router.get('/api/health/system', async (_req, res) => {
  try {
    const healthResult = await healthCheckService.performHealthCheck();
    
    const response = {
      ok: healthResult.overall === 'healthy',
      status: healthResult.overall,
      timestamp: healthResult.timestamp,
      responseTime: healthResult.metrics.responseTime,
      components: Object.entries(healthResult.checks).map(([name, check]) => ({
        name,
        status: check.status,
        responseTime: check.responseTime,
        message: check.message,
        details: check.details
      })),
      metrics: healthResult.metrics
    };

    const statusCode = healthResult.overall === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(response);
  } catch (error: any) {
    logger.error('System health check failed', error);
    res.status(500).json({ ok: false, error: error.message || 'System health check failed' });
  }
});

router.get('/api/health/integrations', async (_req, res) => {
  try {
    const healthResult = await healthCheckService.performHealthCheck();
    
    const integrationChecks = ['google_docs', 'action_network', 'email'];
    const integrations = integrationChecks.map(name => ({
      name,
      status: healthResult.checks[name]?.status || 'unknown',
      responseTime: healthResult.checks[name]?.responseTime,
      message: healthResult.checks[name]?.message,
      details: healthResult.checks[name]?.details
    }));

    const allHealthy = integrations.every(i => i.status === 'healthy');
    res.json({ ok: allHealthy, integrations });
  } catch (error: any) {
    logger.error('Integration health check failed', error);
    res.status(500).json({ ok: false, error: error.message || 'Integration health check failed' });
  }
});

router.get('/api/health/ai-providers', async (_req, res) => {
  try {
    const healthResult = await healthCheckService.performHealthCheck();
    
    const aiProviders = ['openai', 'gemini'];
    const providers = aiProviders.map(name => ({
      name,
      status: healthResult.checks[name]?.status || 'unknown',
      responseTime: healthResult.checks[name]?.responseTime,
      message: healthResult.checks[name]?.message,
      details: healthResult.checks[name]?.details
    }));

    const allHealthy = providers.every(p => p.status === 'healthy');
    res.json({ ok: allHealthy, providers });
  } catch (error: any) {
    logger.error('AI provider health check failed', error);
    res.status(500).json({ ok: false, error: error.message || 'AI provider health check failed' });
  }
});

router.get('/api/admin/health/detailed', async (req, res) => {
  const querySchema = z.object({
    since: z.coerce.date().optional(),
    limit: z.coerce.number().min(1).max(500).default(100),
  });

  try {
    const params = querySchema.parse(req.query);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const sinceIso = params.since ? params.since.toISOString() : null;

    // Get historical health check data
    const { data: healthChecks, error } = await supabase
      .from('health_check_results')
      .select('*')
      .order('created_at', { ascending: false })
      .gte('created_at', sinceIso || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(params.limit);

    if (error) {
      throw new Error(error.message);
    }

    // Get current health status
    const currentHealth = await healthCheckService.performHealthCheck();

    // Get retry statistics
    const retryStats = await retryService.getRetryStatistics();

    res.json({
      current: currentHealth,
      history: healthChecks || [],
      retryStatistics: retryStats
    });
  } catch (error: any) {
    logger.error('Detailed health check failed', error);
    res.status(400).json({ error: error.message || 'Failed to load detailed health checks' });
  }
});

// Admin endpoint for manual retry operations
router.post('/api/admin/retry/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;
    const result = await retryService.retryFailedOperation(operationId);
    
    res.json(result);
  } catch (error: any) {
    logger.error('Manual retry failed', error);
    res.status(400).json({ error: error.message || 'Manual retry failed' });
  }
});

// Admin endpoint to get retry statistics
router.get('/api/admin/retry/statistics', async (req, res) => {
  const querySchema = z.object({
    hours: z.coerce.number().min(1).max(168).default(24), // Max 1 week
  });

  try {
    const params = querySchema.parse(req.query);
    const stats = await retryService.getRetryStatistics(params.hours * 60 * 60 * 1000);
    
    res.json(stats);
  } catch (error: any) {
    logger.error('Failed to get retry statistics', error);
    res.status(400).json({ error: error.message || 'Failed to get retry statistics' });
  }
});

export default router;

