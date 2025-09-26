import { Router } from 'express';
import { z } from 'zod';
import { getSupabase } from '../lib/supabase';

const router = Router();

// Action Network webhook payload schema
const actionNetworkWebhookSchema = z.object({
  event_type: z.string(),
  identifiers: z.array(z.string()).optional(),
  person: z.object({
    email_addresses: z.array(z.object({
      address: z.string(),
      status: z.string().optional()
    })),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    postal_addresses: z.array(z.object({
      locality: z.string().optional(),
      region: z.string().optional(),
      postal_code: z.string().optional(),
      address_lines: z.array(z.string()).optional()
    })).optional(),
    custom_fields: z.record(z.string()).optional()
  }),
  submission: z.object({
    form: z.object({
      title: z.string().optional(),
      description: z.string().optional()
    }).optional(),
    person: z.object({
      email_addresses: z.array(z.object({
        address: z.string()
      })),
      given_name: z.string().optional(),
      family_name: z.string().optional()
    }),
    responses: z.record(z.string()).optional()
  }).optional()
});

type ActionNetworkWebhook = z.infer<typeof actionNetworkWebhookSchema>;

/**
 * Action Network webhook endpoint
 * Receives form submissions and creates DA submissions
 */
router.post('/api/webhooks/action-network', async (req, res) => {
  const supabase = getSupabase();
  
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const payload = actionNetworkWebhookSchema.parse(req.body);
    const signature = req.headers['action-network-signature'] as string;

    if (process.env.ACTION_NETWORK_WEBHOOK_SECRET) {
      if (!signature) {
        return res.status(400).json({ error: 'Missing webhook signature' });
      }

      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const isValidSignature = await verifyActionNetworkSignature(
        rawBody,
        signature,
        process.env.ACTION_NETWORK_WEBHOOK_SECRET
      );
      
      if (!isValidSignature) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    // Log the webhook event
    const { data: webhookEvent, error: webhookError } = await supabase
      .from('webhook_events')
      .insert({
        source: 'action_network',
        event_type: payload.event_type,
        external_id: payload.identifiers?.[0],
        payload: req.body,
        processed: false
      })
      .select('id')
      .single();

    if (webhookError) {
      throw new Error(`Failed to log webhook event: ${webhookError.message}`);
    }

    let processed = false;
    let submissionId: string | null = null;

    if (payload.event_type === 'osdi:advocacy_campaign_submission' && payload.submission) {
      submissionId = await processFormSubmission(payload, supabase);
      processed = true;
    } else if (payload.event_type === 'osdi:person_signup') {
      processed = await updatePersonFromWebhook(payload, supabase);
    }

    await supabase
      .from('webhook_events')
      .update({
        processed,
        submission_id: submissionId,
        processed_at: processed ? new Date().toISOString() : null
      })
      .eq('id', webhookEvent.id);

    res.json({ ok: true, submissionId, processed });

  } catch (error: any) {
    console.error('Webhook processing error:', error);

    // Try to log error to webhook event if we have the ID
    if (supabase) {
      try {
        await supabase
          .from('webhook_events')
          .insert({
            source: 'action_network',
            event_type: req.body?.event_type || 'unknown',
            payload: req.body,
            processed: false,
            error_message: error.message
          });
      } catch (logError) {
        console.error('Failed to log webhook error:', logError);
      }
    }

    res.status(400).json({ error: error.message });
  }
});

/**
 * Generic webhook endpoint for other form providers
 */
router.post('/api/webhooks/generic', async (req, res) => {
  const supabase = getSupabase();
  
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const payload = req.body;
    
    // Extract common fields (customize based on your form provider)
    const submissionData = {
      applicant_first_name: payload.first_name || payload.firstName || '',
      applicant_last_name: payload.last_name || payload.lastName || '',
      applicant_email: payload.email || '',
      site_address: payload.site_address || payload.siteAddress || payload.address || '',
      application_number: payload.application_number || payload.applicationNumber || '',
      submission_pathway: payload.pathway || 'review',
      project_id: payload.project_id || process.env.DEFAULT_PROJECT_ID
    };

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        ...submissionData,
        status: 'NEW'
      })
      .select('id')
      .single();

    if (submissionError) {
      throw new Error(`Failed to create submission: ${submissionError.message}`);
    }

    // Log the webhook event
    await supabase
      .from('webhook_events')
      .insert({
        source: 'generic',
        event_type: 'form_submission',
        payload: req.body,
        processed: true,
        submission_id: submission.id,
        processed_at: new Date().toISOString()
      });

    res.json({ 
      ok: true, 
      submissionId: submission.id,
      message: 'Form submission created successfully' 
    });

  } catch (error: any) {
    console.error('Generic webhook processing error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Process Action Network form submission
 */
async function processFormSubmission(
  payload: ActionNetworkWebhook,
  supabase: any
): Promise<string> {
  const submission = payload.submission!;
  const person = submission.person;
  const responses = submission.responses || {};

  // Extract applicant details
  const email = person.email_addresses[0]?.address || '';
  const firstName = person.given_name || '';
  const lastName = person.family_name || '';

  // Extract site address from responses (customize field names as needed)
  const siteAddress = responses.site_address || 
                     responses['Site Address'] || 
                     responses.address || 
                     '';

  const applicationNumber = responses.application_number || 
                           responses['Application Number'] || 
                           '';

  const pathway = responses.pathway || 
                 responses['Submission Type'] || 
                 'review';

  // Determine project from form title or use default
  let projectId = process.env.DEFAULT_PROJECT_ID;
  const formTitle = submission.form?.title;
  
  if (formTitle) {
    // Try to find project by form title or slug
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .or(`name.ilike.%${formTitle}%,slug.eq.${formTitle.toLowerCase().replace(/\s+/g, '-')}`)
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (project) {
      projectId = project.id;
    }
  }

  // Create submission
  const { data: newSubmission, error: submissionError } = await supabase
    .from('submissions')
    .insert({
      project_id: projectId,
      applicant_first_name: firstName,
      applicant_last_name: lastName,
      applicant_email: email,
      site_address: siteAddress,
      application_number: applicationNumber,
      submission_pathway: pathway,
      status: 'NEW'
    })
    .select('id')
    .single();

  if (submissionError) {
    throw new Error(`Failed to create submission: ${submissionError.message}`);
  }

  return newSubmission.id;
}

async function updatePersonFromWebhook(payload: ActionNetworkWebhook, supabase: any) {
  const email = payload.person.email_addresses[0]?.address;
  if (!email) return false;

  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('id')
    .eq('applicant_email', email)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !submissions?.length) {
    return false;
  }

  const updates = submissions.map((submission: any) =>
    supabase
      .from('submissions')
      .update({
        action_network_sync_status: 'synced',
        action_network_synced_at: new Date().toISOString(),
      })
      .eq('id', submission.id)
  );

  await Promise.all(updates);
  return true;
}

/**
 * Verify Action Network webhook signature
 */
async function verifyActionNetworkSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const crypto = await import('crypto');
  
  // Action Network uses HMAC-SHA1
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(payload);
  const expectedSignature = 'sha1=' + hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export default router;
