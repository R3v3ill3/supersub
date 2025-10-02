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

    console.log('[generate] Starting generation request', { submissionId, version });

    const supabase = getSupabase();
    // Load submission and latest survey response
    let submission: any = null;
    let survey: any = null;
    if (!supabase) {
      console.error('[generate] Database not configured', { submissionId });
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: subData, error: subErr } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle();
    if (subErr) {
      console.error('[generate] Error fetching submission', { submissionId, error: subErr.message });
      throw subErr;
    }
    if (!subData) {
      console.error('[generate] Submission not found', { submissionId });
      return res.status(404).json({ error: 'Submission not found' });
    }
    submission = subData;
    console.log('[generate] Submission found', { submissionId, status: submission.status });

    const { data: surveyData, error: surveyErr } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (surveyErr) {
      console.error('[generate] Error fetching survey response', { submissionId, error: surveyErr.message });
      throw surveyErr;
    }
    if (!surveyData) {
      console.error('[generate] Survey response not found', { 
        submissionId,
        hint: 'User may have skipped step 2 or survey save failed'
      });
      return res.status(400).json({ error: 'Survey response not found' });
    }
    survey = surveyData;
    console.log('[generate] Survey response found', { 
      submissionId, 
      selectedKeysCount: survey.selected_keys?.length || 0,
      orderedKeysCount: survey.ordered_keys?.length || 0,
      hasStyleSample: !!(survey.user_style_sample?.trim()),
      hasCustomGrounds: !!(survey.custom_grounds?.trim())
    });

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
      console.error('[generate] Invalid or inactive concern keys', {
        submissionId,
        version,
        selectedKeys,
        foundKeys: concerns.map(c => c.key),
        missingKeys: selectedKeys.filter(k => !concerns.find(c => c.key === k))
      });
      return res.status(400).json({ 
        error: 'One or more selected concern keys are invalid or inactive',
        details: {
          requested: selectedKeys,
          found: concerns.map(c => c.key)
        }
      });
    }

    // Load approved facts (v1 reads from file)
    const factsPath = path.resolve(process.cwd(), `packages/templates/facts.${version}.md`);
    const approvedFacts = await fs.readFile(factsPath, 'utf8');

    const allowedLinks = [
      ...extractLinks(approvedFacts),
      ...concerns.flatMap((c) => extractLinks(c.body))
    ];

    // Note: applicant_* fields are the SUBMITTER (objector), not the developer
    // DO NOT pass submitter name to avoid confusion - the AI should not reference the submitter by name
    const applicationNumber = submission.application_number || undefined;
    const meta = {
      recipient_name: 'Council Assessment Team',
      subject: 'Submission regarding Development Application',
      application_number: applicationNumber || '',
      site_address: submission.site_address || ''
    } as any;

    const enabled = process.env.OPENAI_ENABLED !== 'false';
    console.log('[generate] Calling LLM generation', { 
      submissionId, 
      enabled, 
      concernCount: concerns.length,
      concernKeys: concerns.map(c => c.key),
      firstConcernPreview: concerns[0] ? concerns[0].body.substring(0, 100) + '...' : 'none',
      hasMeasurements: concerns.some(c => c.body.includes('12,600'))
    });

    const gen = enabled
      ? await generateSubmission({
          meta,
          approvedFacts,
          selectedConcerns: concerns,
          styleSample: survey.user_style_sample || '',
          customGrounds: survey.custom_grounds || '',
          allowedLinks
        })
      : await generateSubmissionMock({
          meta,
          approvedFacts,
          selectedConcerns: concerns,
          styleSample: survey.user_style_sample || '',
          customGrounds: survey.custom_grounds || '',
          allowedLinks
        });

    let { finalText, usage, model, temperature, provider } = gen;
    
    // Post-process: Remove any instance of submitter name appearing as applicant
    // This includes patterns like "Applicant: [Name]" or "by [Name]"
    // We need to be careful to only remove the submitter's name, not legitimate applicant references
    const submitterFullName = `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim();
    
    if (submitterFullName) {
      // Pattern 1: "Applicant: [Submitter Name]" - common at start of generated text
      const applicantPattern = new RegExp(`Applicant:\\s*${submitterFullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
      
      // Pattern 2: "by [Submitter Name]" - sometimes appears in signatures
      const byPattern = new RegExp(`\\s+by\\s+${submitterFullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
      
      // Apply both patterns
      let cleanedText = finalText.replace(applicantPattern, 'Applicant: [Developer Name]');
      cleanedText = cleanedText.replace(byPattern, '');
      
      if (cleanedText !== finalText) {
        console.log('[generate] Removed submitter name references from output', {
          submitterName: submitterFullName,
          applicantPatternFound: applicantPattern.test(finalText),
          byPatternFound: byPattern.test(finalText)
        });
        finalText = cleanedText;
      }
    }
    
    console.log('[generate] LLM generation complete', { 
      submissionId, 
      provider, 
      model, 
      temperature,
      textLength: finalText.length,
      textPreview: finalText.substring(0, 150) + '...',
      tokensUsed: usage.completion,
      deploymentCheck: 'BUILD_' + new Date().toISOString()
    });

    // Format the grounds into proper Gold Coast submission structure
    const formatter = new SubmissionFormatterService();
    const postalAddressSame = (
      (!submission.applicant_postal_address && !submission.postal_suburb && !submission.postal_state && !submission.postal_postcode) ||
      (
        (submission.applicant_postal_address || '').trim() === (submission.applicant_residential_address || '').trim() &&
        (submission.postal_suburb || '').trim() === (submission.applicant_suburb || '').trim() &&
        (submission.postal_state || '').trim() === (submission.applicant_state || '').trim() &&
        (submission.postal_postcode || '').trim() === (submission.applicant_postcode || '').trim()
      )
    );

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
      postal_address_same: postalAddressSame,
      applicant_postal_address: postalAddressSame ? submission.applicant_residential_address : submission.applicant_postal_address || undefined,
      postal_suburb: postalAddressSame ? submission.applicant_suburb : submission.postal_suburb || undefined,
      postal_state: postalAddressSame ? submission.applicant_state : submission.postal_state || undefined,
      postal_postcode: postalAddressSame ? submission.applicant_postcode : submission.postal_postcode || undefined,
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
    if (insertErr) {
      console.error('[generate] Error saving draft', { submissionId, error: insertErr.message });
      throw insertErr;
    }
    console.log('[generate] Draft saved successfully', { submissionId });

    // Update submission status
    await supabase
      .from('submissions')
      .update({ status: 'READY_FOR_REVIEW' })
      .eq('id', submissionId);

    // Document workflow trigger is now handled via dedicated API routes

    const response: any = {
      ok: true,
      preview: formattedSubmission, // Full formatted submission (for backwards compatibility)
      groundsOnly: finalText,        // Just the AI-generated grounds content (editable)
      fullPreview: formattedSubmission, // Complete formatted document (for preview)
      submissionId,
      status: 'READY_FOR_REVIEW'
    };

    console.log('[generate] Generation completed successfully', { submissionId });
    res.json(response);
  } catch (err: any) {
    console.error('[generate] Generation failed', {
      submissionId: req.params.submissionId,
      error: err?.message,
      stack: err?.stack,
      name: err?.name
    });
    res.status(400).json({ error: err?.message ?? 'Generation failed' });
  }
});

export default router;

