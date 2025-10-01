import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getSupabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { EmailQueueService } from './emailQueue';
import { EmailTemplateService } from './emailTemplates';

type EmailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  path?: string;
};

export type SendEmailOptions = {
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  submissionId?: string;
  // For internal tracking
  emailType?: string;
  emailQueueId?: string;
  retryCount?: number;
};

type ReviewReminderOptions = {
  submissionId: string;
  to: string;
  applicantName: string;
  siteAddress: string;
  deadline?: string | null;
  editUrl?: string | null;
};

type ReviewCompletionOptions = {
  submissionId: string;
  to: string;
  applicantName: string;
  siteAddress: string;
  councilName: string;
  submittedAt: string;
};

export type EmailResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
};

export class EmailService {
  private transporter: Transporter;
  private queue: EmailQueueService;
  private templates: EmailTemplateService;

  constructor() {
    this.transporter = this.createTransporter();
    this.queue = new EmailQueueService(this);
    this.templates = new EmailTemplateService();
  }

  private createTransporter(): Transporter {
    const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();

    switch (provider) {
      case 'disabled':
      case 'none':
      case 'off':
        // Do not send real emails; output JSON locally for testing
        return nodemailer.createTransport({ jsonTransport: true });

      case 'sendgrid':
        return nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        });

      case 'ses':
        return nodemailer.createTransport({
          SES: { aws: require('aws-sdk') },
          sendingRate: 14 // max 14 messages/second for SES
        } as any);

      case 'gmail':
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        });

      case 'smtp':
      default:
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
          // Fallback to JSON transport if SMTP not configured
          return nodemailer.createTransport({ jsonTransport: true });
        }
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    const supabase = getSupabase();
    let emailLogId: string | null = null;
    
    try {
      // 1. Log email attempt
      if (supabase && options.submissionId) {
        const { data, error } = await supabase
          .from('email_logs')
          .insert({
            submission_id: options.submissionId,
            to_email: options.to,
            from_email: options.from,
            subject: options.subject,
            body_text: options.text,
            body_html: options.html,
            status: 'sending',
            email_type: options.emailType,
            retry_count: options.retryCount || 0,
          })
          .select('id')
          .single();

        if (error) {
            logger.error('Failed to create email log', { err: error });
        } else {
            emailLogId = data.id;
        }
      }

      // 2. Send email
      const info = await this.transporter.sendMail({
        from: options.fromName ? `"${options.fromName}" <${options.from}>` : options.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      const result: EmailResult = {
        messageId: info.messageId,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        pending: info.pending || []
      };

      // 3. Update email log with success
      if (supabase && emailLogId) {
        await this.trackEmailDelivery(emailLogId, 'sent', {
          service: 'nodemailer',
          service_id: result.messageId,
        });
      }

      return result;

    } catch (error: any) {
      logger.error('Failed to send email directly', { err: error, emailLogId });
      // 4. Update email log with failure
      if (supabase && emailLogId) {
        await supabase
          .from('email_logs')
          .update({
            status: 'failed',
            error_message: error.message,
            sent_at: new Date().toISOString()
          })
          .eq('id', emailLogId);
      }
      throw error; // Re-throw to allow queue to handle retry logic
    }
  }

  // --- NEW METHODS ---

  async enqueueTemplatedEmail(
    templateName: string,
    context: object,
    options: {
      to: string;
      from?: string;
      fromName?: string;
      attachments?: EmailAttachment[];
      submissionId?: string;
    }
  ) {
    const rendered = await this.templates.renderTemplate(templateName, context);
    if (!rendered) {
      logger.error(`Could not render template ${templateName}, email not enqueued.`);
      return;
    }

    const fromEmail = options.from || process.env.DEFAULT_FROM_EMAIL || 'no-reply@example.com';
    const fromName = options.fromName || process.env.DEFAULT_FROM_NAME || 'System';

    const payload: SendEmailOptions = {
      to: options.to,
      from: fromEmail,
      fromName: fromName,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      attachments: options.attachments,
      submissionId: options.submissionId,
    };

    return this.queue.enqueue(templateName, payload);
  }

  async trackEmailDelivery(emailLogId: string, status: string, metadata: object) {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('email_logs')
      .update({
        delivery_status: status,
        delivery_metadata: metadata,
        updated_at: new Date().toISOString(),
        ...(status === 'sent' && { sent_at: new Date().toISOString() })
      })
      .eq('id', emailLogId);

    if (error) {
      logger.error('Error updating email delivery status', { err: error, emailLogId });
    }
  }

  async getEmailStatus(submissionId: string, emailType: string) {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('email_logs')
      .select('status, delivery_status, sent_at')
      .eq('submission_id', submissionId)
      .eq('email_type', emailType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
        logger.error(`Could not get email status for submission ${submissionId}`, { err: error });
        return null;
    }
    return data;
  }

  async retryFailedEmail(emailLogId: string) {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: log, error } = await supabase.from('email_logs').select('*').eq('id', emailLogId).single();
    if (error || !log) {
      logger.error(`Cannot retry: email log ${emailLogId} not found.`);
      return;
    }

    const payload: SendEmailOptions = {
        to: log.to_email,
        from: log.from_email,
        subject: log.subject,
        text: log.body_text,
        html: log.body_html,
        submissionId: log.submission_id
    };

    // Re-queue with a high priority
    await this.queue.enqueue(log.email_type, payload, { priority: 1 });
  }

  async scheduleEmailReminder(submissionId: string, reminderType: string, delayMs: number) {
    const scheduledFor = new Date(Date.now() + delayMs);
    logger.info(`Scheduling email reminder '${reminderType}' for submission ${submissionId} at ${scheduledFor.toISOString()}`);

    const supabase = getSupabase();
    if(!supabase) return;
    const {data: submission} = await supabase.from('submissions').select('id, user_email').eq('id', submissionId).single();
    if(!submission) {
      logger.error(`Cannot schedule reminder, submission ${submissionId} not found.`);
      return;
    };

    const payload: SendEmailOptions = {
      to: submission.user_email,
      from: process.env.DEFAULT_FROM_EMAIL!,
      subject: 'Reminder', // This will be replaced by the template
      submissionId: submissionId
    };

    await this.queue.enqueue(reminderType, payload, { scheduledFor });
  }


  /**
   * Send submission directly to council with PDF attachment
   */
  async sendDirectSubmission(
    submissionId: string,
    councilEmail: string,
    councilName: string,
    fromEmail: string,
    fromName: string,
    subject: string,
    bodyText: string,
    pdfBuffer: Buffer,
    pdfFileName: string,
    applicantDetails: {
      name: string;
      email: string;
      siteAddress: string;
      postalAddress?: string;
      applicationNumber?: string;
    }
  ): Promise<EmailResult> {
    const context = {
      ...applicantDetails,
      submissionBody: bodyText,
    };
    await this.enqueueTemplatedEmail('direct-submission', context, {
        to: councilEmail,
        from: fromEmail,
        fromName: fromName,
        attachments: [{
          filename: pdfFileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }],
        submissionId: submissionId,
    });
    return { messageId: 'queued', accepted: [], rejected: [], pending: [] };
  }

  /**
   * Send document review link to user
   */
  async sendReviewLink(
    submissionId: string,
    userEmail: string,
    fromEmail: string,
    fromName: string,
    subject: string, // subject is now templated
    editUrl: string,
    applicantDetails: {
      name: string;
      siteAddress: string;
    },
    bodyText?: string,
    bodyHtml?: string
  ): Promise<EmailResult> {
    const context = {
        ...applicantDetails,
        editUrl: editUrl,
    };
    await this.enqueueTemplatedEmail('review-link', context, {
        to: userEmail,
        from: fromEmail,
        fromName: fromName,
        submissionId: submissionId,
    });
    return { messageId: 'queued', accepted: [], rejected: [], pending: [] };
  }

  /**
   * Send draft document with info pack to user
   */
  async sendDraftWithInfoPack(
    submissionId: string,
    userEmail: string,
    fromEmail: string,
    fromName: string,
    subject: string, // subject is now templated
    editUrl: string,
    infoPack: string,
    applicantDetails: {
      name: string;
      siteAddress: string;
    },
    bodyText?: string,
    bodyHtml?: string
  ): Promise<EmailResult> {
    const context = {
        ...applicantDetails,
        editUrl: editUrl,
        infoPack: infoPack,
    };
    await this.enqueueTemplatedEmail('draft-with-info-pack', context, {
        to: userEmail,
        from: fromEmail,
        fromName: fromName,
        submissionId: submissionId,
    });
    return { messageId: 'queued', accepted: [], rejected: [], pending: [] };
  }

  async sendReviewDeadlineReminder(options: ReviewReminderOptions): Promise<void> {
    await this.enqueueTemplatedEmail('review-deadline-reminder', options, {
      to: options.to,
      submissionId: options.submissionId
    });
  }

  async sendReviewCompletionConfirmation(options: ReviewCompletionOptions): Promise<void> {
    await this.enqueueTemplatedEmail('review-completion-confirmation', options, {
        to: options.to,
        submissionId: options.submissionId,
    });
  }

  /**
   * Send submission with multiple PDF attachments (e.g., cover + grounds)
   */
  async sendDirectSubmissionWithAttachments(
    submissionId: string,
    councilEmail: string,
    fromEmail: string,
    fromName: string,
    subject: string, // subject is now templated
    bodyText: string,
    attachments: Array<{ filename: string; buffer: Buffer }>,
    applicantDetails: {
      name: string;
      email: string;
      siteAddress: string;
      postalAddress?: string;
      applicationNumber?: string;
    },
    bodyHtml?: string
  ): Promise<EmailResult> {
    const context = {
      ...applicantDetails,
      submissionBody: bodyText,
    };
    await this.enqueueTemplatedEmail('direct-submission', context, {
      to: councilEmail,
      from: fromEmail,
      fromName: fromName,
      attachments: attachments.map(a => ({ filename: a.filename, content: a.buffer, contentType: 'application/pdf' })),
      submissionId
    });
    return { messageId: 'queued', accepted: [], rejected: [], pending: [] };
  }
}
