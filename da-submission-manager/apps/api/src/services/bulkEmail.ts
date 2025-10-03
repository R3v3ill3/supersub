import { getSupabase } from '../lib/supabase';
import { EmailService } from './email';
import { logger } from '../lib/logger';
import { parse } from 'csv-parse/sync';

export type BulkEmailRecipient = {
  name: string;
  email: string;
  mergeFields?: Record<string, string>;
};

export type BulkEmailCampaign = {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  bodyText?: string;
  bodyHtml: string;
  previewText?: string;
  status: 'draft' | 'testing' | 'sending' | 'completed' | 'failed' | 'cancelled';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  createdBy?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
};

export type CreateCampaignInput = {
  projectId?: string;
  name: string;
  description?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  bodyText?: string;
  bodyHtml: string;
  previewText?: string;
  createdBy?: string;
};

export type CampaignProgress = {
  campaignId: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  status: string;
  percentComplete: number;
};

export class BulkEmailService {
  private emailService: EmailService;
  private batchSize: number = 50; // SendGrid recommended batch size
  private delayBetweenBatches: number = 1000; // 1 second between batches

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Parse CSV file content to extract recipients
   */
  parseCSV(csvContent: string): BulkEmailRecipient[] {
    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle UTF-8 BOM
      });

      const recipients: BulkEmailRecipient[] = [];
      const seenEmails = new Set<string>();

      for (const record of records) {
        // Support multiple column name formats
        // First try first_name + last_name combination
        const firstName = record.first_name || record.First_Name || record.firstName || '';
        const lastName = record.last_name || record.Last_Name || record.lastName || '';
        
        // Fall back to single name field if first/last not available
        const singleName = record.name || record.Name || record.NAME || 
                          record['Activist Name'] || record['Full Name'] || '';
        
        // Combine first and last name, or use single name field
        let name = '';
        if (firstName || lastName) {
          name = `${firstName} ${lastName}`.trim();
        } else {
          name = singleName.trim();
        }
        
        const email = (record.email || record.Email || record.EMAIL || 
                      record['Email Address'] || '').toLowerCase().trim();

        if (!email) {
          logger.warn('Skipping row with missing email', { record });
          continue;
        }

        // Basic email validation
        if (!this.isValidEmail(email)) {
          logger.warn('Skipping invalid email', { email });
          continue;
        }

        // Skip duplicates
        if (seenEmails.has(email)) {
          logger.warn('Skipping duplicate email', { email });
          continue;
        }

        // Extract additional fields for merge_fields (optional data)
        const mergeFields: Record<string, string> = {};
        
        if (firstName) mergeFields.first_name = firstName;
        if (lastName) mergeFields.last_name = lastName;
        
        const zipCode = record.zip_code || record.zipcode || record.zip || record.postcode || '';
        if (zipCode) mergeFields.zip_code = zipCode.toString();
        
        const phone = record.can2_phone || record.phone || record.Phone || record.mobile || '';
        if (phone) mergeFields.phone = phone.toString();

        seenEmails.add(email);
        recipients.push({
          name: name || email,
          email,
          mergeFields: Object.keys(mergeFields).length > 0 ? mergeFields : undefined,
        });
      }

      return recipients;
    } catch (error: any) {
      logger.error('Failed to parse CSV', { error: error.message });
      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create a new bulk email campaign
   */
  async createCampaign(
    input: CreateCampaignInput,
    recipients: BulkEmailRecipient[],
    csvFilename?: string
  ): Promise<string> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('bulk_email_campaigns')
      .insert({
        project_id: input.projectId,
        name: input.name,
        description: input.description,
        from_email: input.fromEmail,
        from_name: input.fromName,
        reply_to: input.replyTo,
        subject: input.subject,
        body_text: input.bodyText,
        body_html: input.bodyHtml,
        preview_text: input.previewText,
        total_recipients: recipients.length,
        pending_count: recipients.length,
        csv_filename: csvFilename,
        created_by: input.createdBy,
        status: 'draft',
      })
      .select('id')
      .single();

    if (campaignError || !campaign) {
      logger.error('Failed to create campaign', { error: campaignError });
      throw new Error('Failed to create campaign');
    }

    // Insert recipients in batches
    const recipientRecords = recipients.map((r) => ({
      campaign_id: campaign.id,
      name: r.name,
      email: r.email,
      merge_fields: r.mergeFields,
      status: 'pending',
    }));

    const batchSize = 500;
    for (let i = 0; i < recipientRecords.length; i += batchSize) {
      const batch = recipientRecords.slice(i, i + batchSize);
      const { error: recipientsError } = await supabase
        .from('bulk_email_recipients')
        .insert(batch);

      if (recipientsError) {
        logger.error('Failed to insert recipients batch', { error: recipientsError });
        throw new Error('Failed to insert recipients');
      }
    }

    logger.info('Created bulk email campaign', {
      campaignId: campaign.id,
      recipientCount: recipients.length,
    });

    return campaign.id;
  }

  /**
   * Send test emails to specific addresses
   */
  async sendTestEmails(
    campaignId: string,
    testEmails: { name: string; email: string }[]
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    if (testEmails.length === 0 || testEmails.length > 4) {
      throw new Error('Test emails must be between 1 and 4 addresses');
    }

    // Get campaign details
    const { data: campaign, error } = await supabase
      .from('bulk_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      throw new Error('Campaign not found');
    }

    // Update campaign status to testing
    await supabase
      .from('bulk_email_campaigns')
      .update({ status: 'testing' })
      .eq('id', campaignId);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send to each test email
    for (const recipient of testEmails) {
      try {
        // Personalize the email if needed
        const personalizedHtml = campaign.body_html.replace(
          /\{\{name\}\}/g,
          recipient.name || recipient.email
        );
        const personalizedText = campaign.body_text?.replace(
          /\{\{name\}\}/g,
          recipient.name || recipient.email
        );

        await this.emailService.sendEmail({
          to: recipient.email,
          from: campaign.from_email,
          fromName: `[TEST] ${campaign.from_name}`,
          subject: `[TEST] ${campaign.subject}`,
          html: `<div style="background: #fff3cd; padding: 10px; margin-bottom: 20px; border: 2px solid #ffc107;">
            <strong>⚠️ TEST EMAIL</strong> - This is a test send for campaign: ${campaign.name}
          </div>${personalizedHtml}`,
          text: `*** TEST EMAIL *** - Campaign: ${campaign.name}\n\n${personalizedText || ''}`,
          emailType: 'bulk-test',
        });

        sent++;
        logger.info('Test email sent', { campaignId, to: recipient.email });
      } catch (error: any) {
        failed++;
        const errorMsg = `Failed to send to ${recipient.email}: ${error.message}`;
        errors.push(errorMsg);
        logger.error('Test email failed', { campaignId, to: recipient.email, error });
      }
    }

    // Update campaign status back to draft
    await supabase
      .from('bulk_email_campaigns')
      .update({ status: 'draft' })
      .eq('id', campaignId);

    return { sent, failed, errors };
  }

  /**
   * Start sending bulk email campaign
   */
  async sendCampaign(campaignId: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('bulk_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'draft') {
      throw new Error(`Campaign is not in draft status (current: ${campaign.status})`);
    }

    // Update campaign status
    await supabase
      .from('bulk_email_campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    logger.info('Starting bulk email campaign', {
      campaignId,
      totalRecipients: campaign.total_recipients,
    });

    // Process in background
    this.processCampaign(campaignId).catch((error) => {
      logger.error('Campaign processing failed', { campaignId, error });
      supabase
        .from('bulk_email_campaigns')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', campaignId);
    });
  }

  /**
   * Process campaign by sending emails in batches
   */
  private async processCampaign(campaignId: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    // Get campaign
    const { data: campaign } = await supabase
      .from('bulk_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    let hasMore = true;
    let sentCount = 0;
    let failedCount = 0;

    while (hasMore) {
      // Get next batch of pending recipients
      const { data: recipients, error } = await supabase
        .from('bulk_email_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(this.batchSize);

      if (error || !recipients || recipients.length === 0) {
        hasMore = false;
        break;
      }

      // Send emails in this batch
      for (const recipient of recipients) {
        try {
          // Mark as sending
          await supabase
            .from('bulk_email_recipients')
            .update({ status: 'sending' })
            .eq('id', recipient.id);

          // Personalize email
          const personalizedHtml = campaign.body_html.replace(
            /\{\{name\}\}/g,
            recipient.name
          );
          const personalizedText = campaign.body_text?.replace(
            /\{\{name\}\}/g,
            recipient.name
          );

          // Send email
          const result = await this.emailService.sendEmail({
            to: recipient.email,
            from: campaign.from_email,
            fromName: campaign.from_name,
            subject: campaign.subject,
            html: personalizedHtml,
            text: personalizedText,
            emailType: 'bulk-campaign',
          });

          // Update recipient status
          await supabase
            .from('bulk_email_recipients')
            .update({
              status: 'sent',
              message_id: result.messageId,
              sent_at: new Date().toISOString(),
            })
            .eq('id', recipient.id);

          sentCount++;
        } catch (error: any) {
          // Mark as failed
          await supabase
            .from('bulk_email_recipients')
            .update({
              status: 'failed',
              error_message: error.message,
              retry_count: recipient.retry_count + 1,
            })
            .eq('id', recipient.id);

          failedCount++;
          logger.error('Failed to send email to recipient', {
            campaignId,
            recipientId: recipient.id,
            email: recipient.email,
            error,
          });
        }
      }

      // Update campaign counts
      await supabase
        .from('bulk_email_campaigns')
        .update({
          sent_count: sentCount,
          failed_count: failedCount,
          pending_count: campaign.total_recipients - sentCount - failedCount,
        })
        .eq('id', campaignId);

      // Delay between batches to respect rate limits
      if (recipients.length === this.batchSize) {
        await this.delay(this.delayBetweenBatches);
      } else {
        hasMore = false;
      }
    }

    // Mark campaign as completed
    await supabase
      .from('bulk_email_campaigns')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
        pending_count: 0,
      })
      .eq('id', campaignId);

    logger.info('Bulk email campaign completed', {
      campaignId,
      sentCount,
      failedCount,
    });
  }

  /**
   * Get campaign progress
   */
  async getCampaignProgress(campaignId: string): Promise<CampaignProgress> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    const { data: campaign, error } = await supabase
      .from('bulk_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      throw new Error('Campaign not found');
    }

    const percentComplete =
      campaign.total_recipients > 0
        ? Math.round(
            ((campaign.sent_count + campaign.failed_count) /
              campaign.total_recipients) *
              100
          )
        : 0;

    return {
      campaignId: campaign.id,
      totalRecipients: campaign.total_recipients,
      sentCount: campaign.sent_count,
      failedCount: campaign.failed_count,
      pendingCount: campaign.pending_count,
      status: campaign.status,
      percentComplete,
    };
  }

  /**
   * Get all campaigns
   */
  async getCampaigns(projectId?: string): Promise<BulkEmailCampaign[]> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    let query = supabase
      .from('bulk_email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch campaigns', { error });
      throw new Error('Failed to fetch campaigns');
    }

    return (data || []).map(this.mapCampaignFromDb);
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<BulkEmailCampaign | null> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    const { data, error } = await supabase
      .from('bulk_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapCampaignFromDb(data);
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(campaignId: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    await supabase
      .from('bulk_email_campaigns')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    logger.info('Campaign cancelled', { campaignId });
  }

  /**
   * Map database record to campaign object
   */
  private mapCampaignFromDb(data: any): BulkEmailCampaign {
    return {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      description: data.description,
      fromEmail: data.from_email,
      fromName: data.from_name,
      replyTo: data.reply_to,
      subject: data.subject,
      bodyText: data.body_text,
      bodyHtml: data.body_html,
      previewText: data.preview_text,
      status: data.status,
      totalRecipients: data.total_recipients,
      sentCount: data.sent_count,
      failedCount: data.failed_count,
      pendingCount: data.pending_count,
      createdBy: data.created_by,
      createdAt: data.created_at,
      startedAt: data.started_at,
      completedAt: data.completed_at,
    };
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

