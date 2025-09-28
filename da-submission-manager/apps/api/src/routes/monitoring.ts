import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getSupabase } from '../lib/supabase';
import AnalyticsService from '../services/analytics';
import StatusTrackerService from '../services/statusTracker';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth';

const router = Router();
const adminGuard = [requireAuth, requireRole(['admin', 'super_admin'])] as const;

const publicStatusLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? req.get('x-forwarded-for') ?? 'unknown',
});

router.get('/api/admin/submissions/overview', ...adminGuard, async (req, res) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;

    const [stats, trackBreakdown] = await Promise.all([
      AnalyticsService.getSubmissionStats(projectId, { start, end }),
      AnalyticsService.getTrackBreakdown(projectId),
    ]);
    const stale = await StatusTrackerService.checkStaleSubmissions(45);

    res.json({
      stats,
      stale,
      tracks: trackBreakdown,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load submission overview' });
  }
});

router.get('/api/admin/submissions/recent', ...adminGuard, async (req, res) => {
  const querySchema = z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
    project_id: z.string().uuid().optional(),
    status: z.string().optional(),
  });

  try {
    const params = querySchema.parse(req.query);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase.rpc('get_recent_submissions', {
      p_limit: params.limit,
      p_offset: params.offset,
      p_project_id: params.project_id ?? null,
      p_status: params.status ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    res.json({ submissions: data ?? [] });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to load recent submissions' });
  }
});

router.get('/api/admin/submissions/failed', ...adminGuard, async (req, res) => {
  const querySchema = z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
    project_id: z.string().uuid().optional(),
  });

  try {
    const params = querySchema.parse(req.query);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase.rpc('get_failed_submissions', {
      p_limit: params.limit,
      p_offset: params.offset,
      p_project_id: params.project_id ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    res.json({ submissions: data ?? [] });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to load failed submissions' });
  }
});

router.get('/api/admin/submissions/by-status', ...adminGuard, async (req, res) => {
  const querySchema = z.object({
    status: z.string().min(1),
    pathway: z.string().optional(),
    project_id: z.string().uuid().optional(),
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
  });

  try {
    const params = querySchema.parse(req.query);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase.rpc('get_submissions_by_status', {
      p_status: params.status,
      p_project_id: params.project_id ?? null,
      p_pathway: params.pathway ?? null,
      p_limit: params.limit,
      p_offset: params.offset,
    });

    if (error) {
      throw new Error(error.message);
    }

    res.json({ submissions: data ?? [] });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to load submissions by status' });
  }
});

router.get('/api/submissions/:id/status', publicStatusLimiter, optionalAuth, async (req, res) => {
  const paramsSchema = z.object({ id: z.string().uuid() });

  try {
    const { id } = paramsSchema.parse(req.params);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase.rpc('get_public_submission_status', {
      p_submission_id: id,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(data[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid submission ID' });
    }
    res.status(400).json({ error: error.message || 'Failed to load submission status' });
  }
});

export default router;
