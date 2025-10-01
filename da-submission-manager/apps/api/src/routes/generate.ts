import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getSupabase } from '../lib/supabase';
import { generateSubmission, generateSubmissionMock } from '../services/llm';
import type { DocumentWorkflowResult } from '../services/documentWorkflow';
import { aiGenerationLimiter } from '../middleware/rateLimit';
import { SubmissionFormatterService } from '../services/submissionFormatter';

const router = Router();

function extractLinks(text: string): string[] {
  const linkRegex = /(https?:\/\/[^\s)]+)/gi;
  const set = new Set<string>();
  for (const m of text.matchAll(linkRegex)) set.add(m[0]);
  return Array.from(set);
}

router.post('/api/generate/:submissionId', aiGenerationLimiter, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const version = String(process.env.TEMPLATE_VERSION || 'v1');

    const supabase = getSupabase();
    // Load submission and latest survey response
    let submission: any = null;
    let survey: any = null;
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data: subData, error: subErr } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle();
    if (subErr) throw subErr;
    if (!subData) return res.status(404).json({ error: 'Submission not found' });
    submission = subData;

    const { data: surveyData, error: surveyErr } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (surveyErr) throw surveyErr;
    if (!surveyData) return res.status(400).json({ error: 'Survey response not found' });
    survey = surveyData;

    // Use ordered_keys if available (user's priority order), otherwise fall back to selected_keys
    const selectedKeys: string[] = survey.ordered_keys?.length > 0 ? survey.ordered_keys : (survey.selected_keys ?? []);

    // Load concern bodies for selected keys (DB first, fallback to file)
    // We'll build a map first, then reconstruct in the correct order
    let concerns: Array<{ key: string; body: string }> = [];
    const { data: cData, error: cErr } = await supabase
      .from('concern_templates')
      .select('key,body,is_active,version')
      .eq('version', version)
      .in('key', selectedKeys)
      .eq('is_active', true);
    if (!cErr && cData && cData.length) {
      // Build a map of key -> body
      const concernMap = new Map(cData.map((r: any) => [r.key, r.body]));
      // Reconstruct in the user's priority order
      concerns = selectedKeys
        .filter((k) => concernMap.has(k))
        .map((k) => ({ key: k, body: concernMap.get(k)! }));
    } else {
      const file = path.resolve(process.cwd(), `packages/templates/concerns.${version}.json`);
      const fileJson = JSON.parse(await fs.readFile(file, 'utf8')) as Array<{ key: string; body: string }>;
      const byKey = new Map(fileJson.map((i) => [i.key, i.body] as const));
      concerns = selectedKeys
        .filter((k) => byKey.has(k))
        .map((k) => ({ key: k, body: byKey.get(k)! }));
    }
    if (concerns.length !== selectedKeys.length) {
      return res.status(400).json({ error: 'One or more selected concern keys are invalid or inactive' });
    }

    // Load approved facts (v1 reads from file)
    const factsPath = path.resolve(process.cwd(), `packages/templates/facts.${version}.md`);
    const approvedFacts = await fs.readFile(factsPath, 'utf8');

    const allowedLinks = [
      ...extractLinks(approvedFacts),
      ...concerns.flatMap((c) => extractLinks(c.body))
    ];

    const applicantName = [submission.applicant_first_name, submission.applicant_last_name].filter(Boolean).join(' ').trim();

    const applicationNumber = submission.application_number || undefined;
    const meta = {
      recipient_name: 'Council Assessment Team',
      subject: 'Submission regarding Development Application',
      applicant_name: applicantName || 'Applicant',
      application_number: applicationNumber || '',
      site_address: submission.site_address || ''
    } as any;

    const enabled = process.env.OPENAI_ENABLED !== 'false';

    const gen = enabled
      ? await generateSubmission({
          meta,
          approvedFacts,
          selectedConcerns: concerns,
          styleSample: survey.user_style_sample || '',
          allowedLinks
        })
      : await generateSubmissionMock({
          meta,
          approvedFacts,
          selectedConcerns: concerns,
          styleSample: survey.user_style_sample || '',
          allowedLinks
        });

    const { finalText, usage, model, temperature, provider } = gen;

    // Format the grounds into proper Gold Coast submission structure
    const formatter = new SubmissionFormatterService();
    const formattedSubmission = formatter.formatGoldCoastSubmission({
      lot_number: submission.lot_number || undefined,
      plan_number: submission.plan_number || undefined,
      site_address: submission.site_address,
      application_number: submission.application_number,
      applicant_first_name: submission.applicant_first_name,
      applicant_last_name: submission.applicant_last_name,
      applicant_residential_address: submission.applicant_residential_address,
      applicant_suburb: submission.applicant_suburb,
      applicant_state: submission.applicant_state,
      applicant_postcode: submission.applicant_postcode,
      applicant_email: submission.applicant_email,
      postal_address_same: submission.applicant_postal_address ? false : true,
      applicant_postal_address: submission.applicant_postal_address || undefined,
      postal_suburb: submission.postal_suburb || undefined,
      postal_state: submission.postal_state || undefined,
      postal_postcode: submission.postal_postcode || undefined,
      postal_email: submission.postal_email || undefined,
      grounds_content: finalText,
      submission_date: new Date().toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    });

    // Persist draft with provider information
    const inputSummary = {
      version,
      selected_keys: selectedKeys,
      lengths: {
        facts: approvedFacts.length,
        style_sample: (survey.user_style_sample || '').length
      },
      allowed_links: allowedLinks
    };

    const { error: insertErr } = await supabase.from('llm_drafts').insert({
      submission_id: submissionId,
      model,
      temperature,
      prompt_version: version,
      input_summary: inputSummary,
      output_text: formattedSubmission, // Store the formatted version
      tokens_prompt: usage.prompt,
      tokens_completion: usage.completion,
      provider: provider || 'unknown' // Track which AI provider was used
    });
    if (insertErr) throw insertErr;

    // Update submission status
    await supabase
      .from('submissions')
      .update({ status: 'READY_FOR_REVIEW' })
      .eq('id', submissionId);

    // Document workflow trigger is now handled via dedicated API routes

    const response: any = {
      ok: true,
      preview: formattedSubmission, // Return the formatted submission
      submissionId,
      status: 'READY_FOR_REVIEW'
    };

    res.json(response);
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? 'Generation failed' });
  }
});

export default router;

