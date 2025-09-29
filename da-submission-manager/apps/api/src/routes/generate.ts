import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getSupabase } from '../lib/supabase';
import { generateSubmission, generateSubmissionMock } from '../services/llm';
import type { DocumentWorkflowResult } from '../services/documentWorkflow';

const router = Router();

function extractLinks(text: string): string[] {
  const linkRegex = /(https?:\/\/[^\s)]+)/gi;
  const set = new Set<string>();
  for (const m of text.matchAll(linkRegex)) set.add(m[0]);
  return Array.from(set);
}

router.post('/api/generate/:submissionId', async (req, res) => {
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

    const selectedKeys: string[] = survey.selected_keys ?? [];

    // Load concern bodies for selected keys (DB first, fallback to file)
    let concerns: Array<{ key: string; body: string }> = [];
    const { data: cData, error: cErr } = await supabase
      .from('concern_templates')
      .select('key,body,is_active,version')
      .eq('version', version)
      .in('key', selectedKeys)
      .eq('is_active', true);
    if (!cErr && cData && cData.length) {
      concerns = cData.map((r: any) => ({ key: r.key, body: r.body }));
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
      output_text: finalText,
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

    // Check if we should also process the document workflow
    const processDocument = req.query.process_document === 'true';
    let workflowResult: DocumentWorkflowResult | null = null;

    // Document workflow trigger is now handled via dedicated API routes

    const response: any = { 
      ok: true, 
      preview: finalText, 
      submissionId, 
      status: workflowResult?.status || 'READY_FOR_REVIEW' 
    };

    if (workflowResult) {
      response.document = {
        id: workflowResult.documentId,
        editUrl: workflowResult.editUrl,
        viewUrl: workflowResult.viewUrl,
        pdfUrl: workflowResult.pdfUrl,
        emailSent: workflowResult.emailSent
      };
    }

    res.json(response);
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? 'Generation failed' });
  }
});

export default router;

