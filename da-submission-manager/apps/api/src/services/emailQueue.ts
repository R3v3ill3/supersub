import { getSupabase } from '../lib/supabase';
import { EmailService, SendEmailOptions } from './email';
import { logger } from '../lib/logger';

// Corresponds to the email_queue table
export type EmailJob = {
  id: string;
  submission_id?: string | null;
  email_type: string;
  priority: number;
  scheduled_for: string;
  retry_count: number;
  max_retries: number;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  payload: SendEmailOptions;
  error_log?: string | null;
  created_at: string;
  updated_at: string;
};

export class EmailQueueService {
  private emailService: EmailService;

  constructor(emailService?: EmailService) {
    this.emailService = emailService || new EmailService();
  }

  async enqueue(
    emailType: string,
    payload: SendEmailOptions,
    options: {
      priority?: number;
      maxRetries?: number;
      scheduledFor?: Date;
      submissionId?: string;
    } = {}
  ) {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('Supabase client not available, cannot queue email. Sending synchronously.');
      // Fallback to synchronous sending if DB is not available
      return this.emailService.sendEmail(payload);
    }

    const {
      priority = 5,
      maxRetries = 3,
      scheduledFor = new Date(),
      submissionId = payload.submissionId,
    } = options;

    // Convert Buffer attachments to base64 strings for database storage
    const payloadForDb = { ...payload };
    if (payloadForDb.attachments && Array.isArray(payloadForDb.attachments)) {
      payloadForDb.attachments = payloadForDb.attachments.map((att: any) => {
        if (att.content && Buffer.isBuffer(att.content)) {
          return {
            ...att,
            content: att.content.toString('base64'),
            encoding: 'base64'
          };
        }
        return att;
      });
    }

    const { error } = await supabase.from('email_queue').insert({
      submission_id: submissionId,
      email_type: emailType,
      payload: payloadForDb,
      priority,
      max_retries: maxRetries,
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending',
    });

    if (error) {
      logger.error('Error enqueueing email', { err: error });
      throw error;
    }
  }

  async processQueue(batchSize = 10) {
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('Supabase client not available, cannot process email queue.');
      return;
    }

    // Get pending jobs
    const { data: jobs, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (error) {
      logger.error('Error fetching email queue', { err: error });
      return;
    }

    if (jobs && jobs.length > 0) {
      logger.info(`Processing ${jobs.length} email jobs.`);
      await Promise.all(jobs.map(job => this.processJob(job as EmailJob)));
    }
  }

  private async processJob(job: EmailJob) {
    const supabase = getSupabase();
    if (!supabase) return;

    logger.info(`Processing email job ${job.id}`);

    try {
      // Mark as processing
      await supabase
        .from('email_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', job.id);
      
      // Convert attachment data back to Buffers if needed
      let payload = { ...job.payload };
      if (payload.attachments && Array.isArray(payload.attachments)) {
        payload.attachments = payload.attachments.map((att: any) => {
          if (att.content && typeof att.content === 'object' && att.content.type === 'Buffer') {
            // Convert from {type: 'Buffer', data: [1,2,3...]} back to Buffer
            return {
              ...att,
              content: Buffer.from(att.content.data)
            };
          }
          return att;
        });
      }
      
      // The payload should be compatible with EmailService.sendEmail
      await this.emailService.sendEmail({
        ...payload,
        emailType: job.email_type,
        emailQueueId: job.id
      });

      // Mark as sent
      await supabase
        .from('email_queue')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', job.id);
        
      logger.info(`Successfully processed email job ${job.id}`);

    } catch (error: any) {
      logger.error(`Error processing email job`, { err: error, jobId: job.id });
      if (job.retry_count < job.max_retries) {
        await this.retryEmail(job, error);
      } else {
        await this.markAsFailed(job, error);
      }
    }
  }

  private async retryEmail(job: EmailJob, error: any) {
    const supabase = getSupabase();
    if (!supabase) return;

    const newRetryCount = job.retry_count + 1;
    // Exponential backoff: 2^retry_count * 5 minutes
    const delayMinutes = Math.pow(2, newRetryCount-1) * 5;
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);
    
    logger.info(`Retrying email job ${job.id}. Attempt ${newRetryCount}. Scheduled for ${scheduledFor.toISOString()}`);

    await supabase
      .from('email_queue')
      .update({
        status: 'pending',
        retry_count: newRetryCount,
        scheduled_for: scheduledFor.toISOString(),
        error_log: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  }

  private async markAsFailed(job: EmailJob, error: any) {
    const supabase = getSupabase();
    if (!supabase) return;

    logger.warn(`Email job ${job.id} has failed permanently after ${job.max_retries} retries.`);

    // Dead letter queue logic: just mark as failed
    await supabase
      .from('email_queue')
      .update({
        status: 'failed',
        error_log: `Max retries exceeded. Last error: ${error.message}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // TODO: Implement admin notification for failed emails
  }
}
