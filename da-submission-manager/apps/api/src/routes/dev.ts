import { Router } from 'express';
import { getSupabase } from '../lib/supabase';
import { GoogleDocsService } from '../services/googleDocs';
import { extractConcernsFromText, generateGroundsText } from '../services/aiGrounds';

const router = Router();

router.post('/api/dev/submissions', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const body = (req as any).body || {};

    // Try to get an existing dev project, or create one
    let projectId = process.env.DEFAULT_PROJECT_ID;
    
    if (!projectId) {
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', 'dev-project')
        .eq('is_active', true)
        .single();

      if (existingProject) {
        projectId = existingProject.id;
      } else {
        // Create a dev project
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: 'Development Project',
            slug: 'dev-project',
            description: 'Automatically created project for development testing',
            council_email: 'dev@example.com',
            council_name: 'Development Council',
            from_email: 'dev@example.com',
            from_name: 'Dev DA Manager',
            subject_template: 'Test DA Submission - {{site_address}}',
            default_pathway: 'review',
            enable_ai_generation: true,
            is_active: true
          })
          .select('id')
          .single();

        if (projectError) {
          throw new Error(`Failed to create dev project: ${projectError.message}`);
        }
        
        projectId = newProject.id;
      }
    }

    const now = new Date();
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        project_id: projectId,
        applicant_first_name: body.applicant_first_name || 'Dev',
        applicant_last_name: body.applicant_last_name || 'User',
        applicant_email: body.applicant_email || 'dev@example.com',
        applicant_postal_address: body.applicant_postal_address || null,
        site_address: body.site_address || '1 Example St',
        application_number: (await (async () => {
          const { data: proj } = await supabase
            .from('projects')
            .select('default_application_number')
            .eq('id', projectId!)
            .single();
          return proj?.default_application_number || null;
        })()),
        submission_pathway: body.submission_pathway || 'review',
        status: 'NEW',
        updated_at: now.toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    res.json({ ok: true, submissionId: data.id, projectId });
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? 'Failed to create submission' });
  }
});

// Create a dev project endpoint
router.post('/api/dev/project', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: 'Development Project',
        slug: 'dev-project',
        description: 'Automatically created project for development testing',
        council_email: 'dev@example.com',
        council_name: 'Development Council',
        from_email: 'dev@example.com',
        from_name: 'Dev DA Manager',
        subject_template: 'Test DA Submission - {{site_address}}',
        default_pathway: 'review',
        enable_ai_generation: true,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Dev project already exists' });
      }
      throw error;
    }
    
    res.json({ ok: true, project });
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? 'Failed to create project' });
  }
});

export default router;

// --- Admin utilities for AI extraction and grounds generation (dev endpoints) ---

// Analyze grounds template: fetch doc text, extract concerns, seed concern_templates
router.post('/api/dev/projects/:projectId/extract-grounds', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (pErr || !project) return res.status(404).json({ error: 'Project not found' });
    if (!project.grounds_template_id) return res.status(400).json({ error: 'grounds_template_id not set' });

    const gdocs = new GoogleDocsService();
    const text = await gdocs.exportToText(project.grounds_template_id);
    const concerns = await extractConcernsFromText(text);

    // Insert/Upsert concerns for version v1 (admin may manage versions later)
    const rows = concerns.map(c => ({ version: 'v1', key: c.key, label: c.label, body: c.body, is_active: true }));
    // Upsert by (version, key)
    const { error: upErr } = await supabase
      .from('concern_templates')
      .upsert(rows, { onConflict: 'version,key' });
    if (upErr) throw upErr;

    res.json({ ok: true, count: rows.length });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Extraction failed' });
  }
});

// Generate grounds text for a submission from ordered concerns and extra input
router.post('/api/dev/submissions/:submissionId/generate-grounds', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { ordered_keys = [], extra = '' } = (req as any).body || {};
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    // Load latest survey and map keys to bodies
    const { data: survey } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const version = survey?.version || 'v1';
    const { data: templates } = await supabase
      .from('concern_templates')
      .select('key, body')
      .eq('version', version)
      .eq('is_active', true);
    const byKey = new Map((templates || []).map((r: any) => [r.key, r.body] as const));
    const orderedConcerns = (ordered_keys as string[]).map(k => ({ key: k, body: byKey.get(k) || '' })).filter(c => c.body);

    const text = await generateGroundsText({ orderedConcerns, extraGrounds: String(extra || '') });

    // Save to submission
    await supabase
      .from('submissions')
      .update({ grounds_text_generated: text })
      .eq('id', submissionId);

    res.json({ ok: true, text });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to generate grounds' });
  }
});
