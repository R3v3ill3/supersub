import { Router } from 'express';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getSupabase } from '../lib/supabase';

const router = Router();

const qVersion = z.object({ version: z.string().default('v1') });

router.get('/api/survey/templates', async (req, res) => {
  try {
    const { version } = qVersion.parse(req.query);
    const supabase = getSupabase();

    // Try DB first (active concerns for version)
    if (supabase) {
      const { data: rows, error } = await supabase
        .from('concern_templates')
        .select('key,label,body,is_active,version')
        .eq('version', version)
        .eq('is_active', true)
        .order('key');

      if (!error && rows && rows.length) {
        return res.json({ version, concerns: rows.map(r => ({ key: r.key, label: r.label, body: r.body })) });
      }
    }

    // Fallback to file
    const file = path.resolve(process.cwd(), `packages/templates/concerns.${version}.json`);
    const data = JSON.parse(await fs.readFile(file, 'utf8')) as Array<{ key: string; label: string; body: string }>;
    const list = data.map((d) => ({ key: d.key, label: d.label, body: d.body }));
    res.json({ version, concerns: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

const postBody = z.object({
  version: z.string().default('v1'),
  selected_keys: z.array(z.string()).min(1),
  user_style_sample: z.string().min(1)
});

router.post('/api/survey/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
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
        user_style_sample: body.user_style_sample
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
    res.status(400).json({ error: err?.message ?? 'Bad request' });
  }
});

export default router;

