import { Router } from 'express';
import { getSupabase } from '../lib/supabase';
// import { requireAuth } from '../middleware/auth'; // Disabled for development

const router = Router();

router.get('/api/stats', async (_req, res) => {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const [projectsResult, submissionsResult, pendingResult, failedResult] = await Promise.all([
      supabase
        .from('projects')
        .select('id, is_active', { count: 'exact', head: true }),
      supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'NEW'),
      supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'FAILED'),
    ]);

    const { count: totalProjects } = projectsResult;
    const { count: totalSubmissions } = submissionsResult;

    const { data: activeProjectsData } = await supabase
      .from('projects')
      .select('id')
      .eq('is_active', true);

    const stats = {
      projects: {
        total: totalProjects ?? 0,
        active: activeProjectsData?.length ?? 0,
      },
      submissions: {
        total: totalSubmissions ?? 0,
        pending: pendingResult.count ?? 0,
        completed: totalSubmissions ?? 0 - (pendingResult.count ?? 0) - (failedResult.count ?? 0),
        failed: failedResult.count ?? 0,
      },
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to fetch dashboard stats' });
  }
});

export default router;
