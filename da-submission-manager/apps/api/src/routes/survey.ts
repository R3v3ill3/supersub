import { Router } from 'express';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getSupabase } from '../lib/supabase';
import { surveyLimiter, standardLimiter } from '../middleware/rateLimit';

const router = Router();

const qVersion = z.object({
  version: z.string().default('v1'),
  track: z.enum(['followup', 'comprehensive', 'single']).optional(),
  project_id: z.string().uuid().optional(),
});

function isConcernApplicableToTrack(concernTrack: string | undefined, requestedTrack?: string) {
  if (!requestedTrack) return true;
  if (!concernTrack) return true;
  if (concernTrack === 'all') return true;
  return concernTrack === requestedTrack;
}

function filterConcernsByTrack<T extends { track?: string | null }>(concerns: T[], track?: string): T[] {
  if (!track) return concerns;
  return concerns.filter((concern) => {
    const concernTrack = concern.track ?? undefined;
    return isConcernApplicableToTrack(concernTrack ?? undefined, track);
  });
}

router.get('/api/survey/templates', standardLimiter, async (req, res) => {
  try {
    const { version, track, project_id } = qVersion.parse(req.query);
    const supabase = getSupabase();

    // Try DB first (active concerns for version)
    if (supabase) {
      let rows = null;
      let error = null;

      // If project_id provided, try to get project-specific concerns first
      if (project_id) {
        const result = await supabase
          .from('concern_templates')
          .select('key,label,body,is_active,version,metadata,track,project_id')
          .eq('version', version)
          .eq('is_active', true)
          .eq('project_id', project_id)
          .order('key');

        rows = result.data;
        error = result.error;
      }

      // If no project-specific concerns found, fall back to global concerns (NULL project_id)
      if (!error && (!rows || rows.length === 0)) {
        const result = await supabase
          .from('concern_templates')
          .select('key,label,body,is_active,version,metadata,track,project_id')
          .eq('version', version)
          .eq('is_active', true)
          .is('project_id', null)
          .order('key');

        rows = result.data;
        error = result.error;
      }

      if (!error && rows && rows.length) {
        const filtered = filterConcernsByTrack(rows, track);
        return res.json({ version, concerns: filtered });
      }
    }

    // Fallback to file
    const file = path.resolve(process.cwd(), `packages/templates/concerns.${version}.json`);
    const data = JSON.parse(await fs.readFile(file, 'utf8')) as Array<{ key: string; label: string; body: string; track?: string }>;
    const list = data
      .filter((d) => isConcernApplicableToTrack(d.track, track))
      .map((d) => ({ key: d.key, label: d.label, body: d.body }));
    res.json({ version, concerns: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

const postBody = z.object({
  version: z.string().default('v1'),
  selected_keys: z.array(z.string()).min(1),
  ordered_keys: z.array(z.string()).optional(),
  user_style_sample: z.string().optional(),  // Made optional - not all users fill this
  custom_grounds: z.string().optional(),
  submission_track: z.enum(['followup', 'comprehensive', 'single']).optional()
});

router.post('/api/survey/:submissionId', surveyLimiter, async (req, res) => {
  try {
    const { submissionId } = req.params;
    console.log('[survey] Received survey data:', {
      submissionId,
      dataKeys: Object.keys(req.body || {}),
      selectedKeysCount: (req.body?.selected_keys || []).length,
      hasStyleSample: !!(req.body?.user_style_sample),
      hasCustomGrounds: !!(req.body?.custom_grounds),
      hasOrderedKeys: !!(req.body?.ordered_keys)
    });
    
    const body = postBody.parse(req.body);
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Validate that the submission exists
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Validate that selected keys exist in concern templates
    const { data: validConcerns, error: concernsError } = await supabase
      .from('concern_templates')
      .select('key')
      .eq('version', body.version)
      .eq('is_active', true)
      .in('key', body.selected_keys);

    if (concernsError) {
      // Fallback to file-based validation
      try {
        const file = path.resolve(process.cwd(), `packages/templates/concerns.${body.version}.json`);
        const fileJson = JSON.parse(await fs.readFile(file, 'utf8')) as Array<{ key: string; label: string }>;
        const validKeys = new Set(fileJson.map(c => c.key));
        const invalidKeys = body.selected_keys.filter(key => !validKeys.has(key));
        
        if (invalidKeys.length > 0) {
          return res.status(400).json({ 
            error: `Invalid concern keys: ${invalidKeys.join(', ')}` 
          });
        }
      } catch (fileError) {
        return res.status(500).json({ error: 'Failed to validate concern keys' });
      }
    } else {
      const validKeys = new Set(validConcerns.map((c: any) => c.key));
      const invalidKeys = body.selected_keys.filter(key => !validKeys.has(key));
      
      if (invalidKeys.length > 0) {
        return res.status(400).json({ 
          error: `Invalid concern keys: ${invalidKeys.join(', ')}` 
        });
      }
    }

    // Save survey response
    const { data: surveyResponse, error: insertError } = await supabase
      .from('survey_responses')
      .insert({
        submission_id: submissionId,
        version: body.version,
        selected_keys: body.selected_keys,
        ordered_keys: body.ordered_keys || null,
        user_style_sample: body.user_style_sample || null,  // Can be null if not provided
        custom_grounds: body.custom_grounds || null,
        submission_track: body.submission_track || null
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save survey response: ${insertError.message}`);
    }

    // Update submission status
    await supabase
      .from('submissions')
      .update({ status: 'SURVEY_COMPLETED' })
      .eq('id', submissionId);

    res.json({ 
      ok: true, 
      submissionId, 
      version: body.version,
      surveyResponseId: surveyResponse.id,
      status: 'SURVEY_COMPLETED'
    });
  } catch (err: any) {
    console.error('[survey] ERROR saving survey:', {
      submissionId: req.params.submissionId,
      error: err?.message,
      errorType: err?.constructor?.name,
      receivedData: req.body,
      stack: err?.stack?.split('\n').slice(0, 3).join('\n')
    });
    res.status(400).json({ error: err?.message ?? 'Bad request' });
  }
});

export default router;

