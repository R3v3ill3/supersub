import { Router } from 'express';
import { z } from 'zod';
import { getSupabase } from '../lib/supabase';
import { config, ProjectActionNetworkConfig, getActionNetworkClientForProject, ProjectWithApiKey } from '../lib/config';
import { ActionNetworkClient } from '../services/actionNetwork';
import { TemplateCombinerService, DualTrackConfig } from '../services/templateCombiner';
import { submissionLimiter, standardLimiter } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { DocumentWorkflowService } from '../services/documentWorkflow';
import { logger } from '../lib/logger';

const router = Router();

const createSubmissionSchema = z.object({
  project_identifier: z.string().min(1), // slug or UUID
  applicant_first_name: z.string().min(1),
  applicant_last_name: z.string().min(1),
  applicant_email: z.string().email(),
  // Residential address (required by Gold Coast Council)
  applicant_residential_address: z.string().min(1),
  applicant_suburb: z.string().min(1),
  applicant_state: z.string().min(1),
  applicant_postcode: z.string().min(1),
  // Postal address (can be same as residential)
  applicant_postal_address: z.string().optional(),
  applicant_postal_city: z.string().optional(),
  applicant_postal_region: z.string().optional(),
  applicant_postal_postcode: z.string().optional(),
  applicant_postal_country: z.string().optional(),
  postal_email: z.string().email().optional(),
  // Property details (Gold Coast Council requirements)
  lot_number: z.string().optional(),
  plan_number: z.string().optional(),
  site_address: z.string().min(1),
  application_number: z.string().optional(), // User can override default
  submission_pathway: z.enum(['direct', 'review', 'draft']).default('review'),
  submission_track: z.enum(['followup', 'comprehensive', 'single']).optional(),
  is_returning_submitter: z.boolean().optional(),
});

type ActionNetworkSyncResult = {
  status: 'skipped' | 'synced' | 'failed';
  personHref?: string | null;
  submissionHref?: string | null;
  error?: string;
};

/**
 * Create a submission for a specific project (by id or slug)
 */
router.post('/api/submissions', submissionLimiter, async (req, res) => {
  try {
    const body = createSubmissionSchema.parse(req.body);
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Resolve project by id or slug
    const identifier = body.project_identifier;
    let projectQuery = supabase
      .from('projects')
      .select('id, name, slug, action_network_config, action_network_api_key_encrypted, default_application_number, is_dual_track, dual_track_config')
      .eq('is_active', true)
      .limit(1);

    if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      projectQuery = projectQuery.eq('id', identifier);
    } else {
      projectQuery = projectQuery.eq('slug', identifier);
    }

    const { data: project, error: projectError } = await projectQuery.single();
    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const actionNetworkConfig = config.actionNetwork;
    let actionNetworkProjectConfig: ProjectActionNetworkConfig | null = null;
    if (project.action_network_config) {
      actionNetworkProjectConfig = project.action_network_config as ProjectActionNetworkConfig;
    }

    // Create submission
    const now = new Date();
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        project_id: project.id,
        applicant_first_name: body.applicant_first_name,
        applicant_last_name: body.applicant_last_name,
        applicant_email: body.applicant_email,
        // Residential address fields
        applicant_residential_address: body.applicant_residential_address,
        applicant_suburb: body.applicant_suburb,
        applicant_state: body.applicant_state,
        applicant_postcode: body.applicant_postcode,
        // Postal address fields
        applicant_postal_address: body.applicant_postal_address || null,
        postal_suburb: body.applicant_postal_city || null,
        postal_state: body.applicant_postal_region || null,
        postal_postcode: body.applicant_postal_postcode || null,
        postal_email: body.postal_email || null,
        // Property details
        lot_number: body.lot_number || null,
        plan_number: body.plan_number || null,
        site_address: body.site_address,
        application_number: body.application_number || project.default_application_number,
        submission_pathway: body.submission_pathway,
        submission_track: body.submission_track || (project.is_dual_track ? 'comprehensive' : 'single'),
        is_returning_submitter: body.is_returning_submitter ?? false,
        status: 'NEW',
        action_network_sync_status: 'pending',
        updated_at: now.toISOString()
      })
      .select('id')
      .single();

    if (submissionError) {
      throw new Error(`Failed to create submission: ${submissionError.message}`);
    }

    let actionNetworkResult: ActionNetworkSyncResult = { status: 'skipped' };

    if (actionNetworkProjectConfig) {
      // Check if we have an API key configured before attempting to sync
      const hasApiKey = project.action_network_api_key_encrypted || config.actionNetwork?.apiKey;

      if (!hasApiKey) {
        // No API key configured, skip sync silently
        actionNetworkResult = { status: 'skipped' };
      } else {
        let client: ActionNetworkClient | null = null;
        try {
          // Use project-specific API key if available, otherwise fall back to global config
          client = getActionNetworkClientForProject(project as ProjectWithApiKey);
        } catch (clientError: any) {
          console.error('Failed to create Action Network client:', clientError.message);
          actionNetworkResult = { status: 'failed', error: clientError.message };
        }

        if (client) {
      const postalHasValues = [
        body.applicant_postal_address,
        body.applicant_postal_city,
        body.applicant_postal_region,
        body.applicant_postal_postcode,
        body.applicant_postal_country,
      ].some((value) => typeof value === 'string' && value.trim().length > 0);

      const postalAddresses = postalHasValues
        ? [
            {
              address_lines: body.applicant_postal_address
                ? [body.applicant_postal_address]
                : undefined,
              locality: body.applicant_postal_city || undefined,
              region: body.applicant_postal_region || undefined,
              postal_code: body.applicant_postal_postcode || undefined,
              country: body.applicant_postal_country || undefined,
            },
          ]
        : undefined;

      const personCustomFields = {
        ...(actionNetworkProjectConfig.custom_fields ?? {}),
        project_id: project.id,
        submission_id: submission.id,
        application_number: body.application_number || project.default_application_number,
        submission_pathway: body.submission_pathway,
        site_address: body.site_address,
      };

        try {
          const person = await client.upsertPerson({
            given_name: body.applicant_first_name,
            family_name: body.applicant_last_name,
            email_addresses: [{ address: body.applicant_email }],
            postal_addresses: postalAddresses,
            custom_fields: personCustomFields,
          });

          const personUrl = (person as any)?._links?.self?.href ?? null;

          if (personUrl) {
            await Promise.all([
              client.addTags(personUrl, actionNetworkProjectConfig.tag_hrefs || []),
              client.addToLists(personUrl, actionNetworkProjectConfig.list_hrefs || []),
              client.addToGroups(personUrl, actionNetworkProjectConfig.group_hrefs || []),
            ]);

            let submissionRecord: any = null;
            let submissionUrl: string | null = null;

            if (actionNetworkProjectConfig.action_url) {
              submissionRecord = await client.recordSubmission({
                personHref: personUrl,
                actionHref: client.buildActionHref(actionNetworkProjectConfig.action_url),
                fields: {
                  submission_pathway: body.submission_pathway,
                  site_address: body.site_address,
                  application_number: body.application_number || project.default_application_number,
                  project_id: project.id,
                  submission_id: submission.id,
                },
              });

              submissionUrl = submissionRecord?._links?.self?.href ?? null;
            } else {
              throw new Error('Project missing Action Network action URL');
            }

            const updates: Record<string, any> = {
              action_network_person_id: personUrl,
              action_network_payload: {
                person,
                submission: submissionRecord,
              },
              action_network_submission_id: submissionUrl,
              action_network_sync_status: 'synced',
              action_network_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            await supabase
              .from('submissions')
              .update(updates)
              .eq('id', submission.id);

            actionNetworkResult = {
              status: 'synced',
              personHref: personUrl,
              submissionHref: submissionUrl,
            };
          } else {
            throw new Error('Action Network did not return a person URL');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error syncing to Action Network';
          console.error('Failed to sync to Action Network', error);
          await supabase
            .from('submissions')
            .update({
              action_network_sync_status: 'failed',
              action_network_sync_error: errorMessage,
              updated_at: new Date().toISOString(),
            })
            .eq('id', submission.id);

          actionNetworkResult = {
            status: 'failed',
            error: errorMessage,
          };
        }
      }
      }
    }

    res.status(201).json({
      ok: true,
      submissionId: submission.id,
      projectId: project.id,
      actionNetwork: actionNetworkResult,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * Submit final edited submission text
 */
router.post('/api/submissions/:submissionId/submit', submissionLimiter, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { finalText, emailBody, downloadPdf = true }: { finalText: string; emailBody?: string; downloadPdf?: boolean } = req.body;

    if (!finalText || typeof finalText !== 'string') {
      return res.status(400).json({ error: 'Final text is required' });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get submission details including project info
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*, projects!inner(*)')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Store the final edited text in llm_drafts before processing
    await supabase.from('llm_drafts').insert({
      submission_id: submissionId,
      model: 'user-edited',
      temperature: 0,
      prompt_version: 'v1',
      input_summary: { source: 'user_edit' },
      output_text: finalText,
      tokens_prompt: 0,
      tokens_completion: 0,
      provider: 'user'
    });

    // Store custom email body if provided
    if (emailBody && typeof emailBody === 'string') {
      await supabase
        .from('submissions')
        .update({ custom_email_body: emailBody })
        .eq('id', submissionId);
    }

    // Trigger document workflow to generate PDFs and send emails
    // This will handle the submission based on the project's submission_pathway
    const documentWorkflow = new DocumentWorkflowService();
    logger.info(`[submissions] Starting document workflow`, { submissionId, downloadPdf });
    
    const workflowResult = await documentWorkflow.processSubmission(submissionId, finalText, emailBody, downloadPdf);

    logger.info(`[submissions] Document workflow completed`, {
      submissionId,
      emailSent: workflowResult.emailSent,
      status: workflowResult.status,
      hasPdfData: !!workflowResult.pdfData
    });

    // Prepare response with PDF data for immediate download
    const response: any = {
      ok: true,
      submissionId,
      status: workflowResult.status,
      emailSent: workflowResult.emailSent,
      documentId: workflowResult.documentId
    };

    // Include PDF data if available (convert Buffer to base64 for JSON transport)
    // Only include if user opted for download
    if (workflowResult.pdfData && downloadPdf) {
      response.pdfData = {};
      if (workflowResult.pdfData.groundsPdf) {
        response.pdfData.groundsPdf = workflowResult.pdfData.groundsPdf.toString('base64');
        response.pdfData.groundsPdfFilename = workflowResult.pdfData.groundsPdfFilename;
      }
      if (workflowResult.pdfData.coverPdf) {
        response.pdfData.coverPdf = workflowResult.pdfData.coverPdf.toString('base64');
        response.pdfData.coverPdfFilename = workflowResult.pdfData.coverPdfFilename;
      }
    }

    res.json(response);
  } catch (error: any) {
    logger.error('[submissions] Error processing submission', { 
      submissionId: req.params.submissionId, 
      error: error.message,
      stack: error.stack,
      errorName: error.name
    });
    res.status(400).json({ error: error.message });
  }
});


// Preview email body (cover letter content)
router.post('/api/submissions/:submissionId/preview-email-body', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { finalText } = req.body;

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get submission details including project info
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*, projects!inner(*)')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submissionData = submission as any;
    const project = submissionData.projects;

    // Use DocumentWorkflowService to prepare submission data and generate cover content
    const documentWorkflow = new DocumentWorkflowService();
    const preparedData = await (documentWorkflow as any).prepareSubmissionData(
      submissionData,
      project,
      finalText || submissionData.ai_generated_text
    );

    const coverContent = await (documentWorkflow as any).generateCoverContent(project, preparedData);

    res.json({
      ok: true,
      emailBody: coverContent,
      subject: (documentWorkflow as any).processTemplate(
        project.council_subject_template || project.subject_template || 'Development Application Submission - {{site_address}}',
        {
          site_address: submissionData.site_address,
          application_number: submissionData.application_number || project.default_application_number || '',
          applicant_name: `${submissionData.applicant_first_name} ${submissionData.applicant_last_name}`.trim()
        }
      )
    });
  } catch (error: any) {
    logger.error('[submissions] Error previewing email body', { 
      submissionId: req.params.submissionId, 
      error: error.message 
    });
    res.status(500).json({ error: error.message });
  }
});

export default router;


