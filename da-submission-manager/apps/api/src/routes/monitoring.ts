import express from 'express';
import { requireAuth } from '../middleware/auth';
import { getSupabase } from '../lib/supabase';

const router = express.Router();

// Public stats endpoint
router.get('/stats', (_req, res) => {
  res.json({ status: 'ok' });
});

// Admin monitoring endpoints - require authentication
router.get('/api/admin/submissions/overview', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Mock data for now - replace with actual queries
    res.json({
      stats: {
        total: 42,
        byStatus: { 'completed': 25, 'pending': 10, 'failed': 7 },
        byPathway: { 'direct': 15, 'review': 20, 'draft': 7 },
        todayCount: 3,
        weekCount: 12,
        monthCount: 42,
        successRate: 85.7,
        errorRate: 14.3,
        avgProcessingTime: 1200
      },
      stale: []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load submission overview' });
  }
});

router.get('/api/admin/submissions/recent', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Mock data for now - replace with actual queries
    res.json({
      submissions: [
        {
          id: '1',
          applicant_name: 'John Smith',
          project_name: 'High Trees Development', 
          status: 'completed',
          pathway: 'direct',
          created_at: new Date().toISOString(),
          site_address: '123 Main St'
        }
      ]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load recent submissions' });
  }
});

router.get('/api/admin/submissions/failed', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Mock data for now
    res.json({
      submissions: []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load failed submissions' });
  }
});

export default router;
