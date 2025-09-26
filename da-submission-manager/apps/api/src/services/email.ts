import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getSupabase } from '../lib/supabase';

type EmailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  path?: string;
};

type SendEmailOptions = {
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  submissionId?: string;
};

type EmailResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
};

export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = this.createTransporter();
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
    
    try {
      // Prepare email
      const mailOptions = {
        from: options.fromName ? `"${options.fromName}" <${options.from}>` : options.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          path: att.path
        }))
      };

      // Log email attempt
      let emailLogId: string | null = null;
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
            attachments: options.attachments ? JSON.stringify(options.attachments.map(a => ({ 
              filename: a.filename, 
              contentType: a.contentType 
            }))) : null,
            status: 'pending'
          })
          .select('id')
          .single();

        if (!error && data) {
          emailLogId = data.id;
        }
      }

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      const result: EmailResult = {
        messageId: info.messageId,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        pending: info.pending || []
      };

      // Update email log with success
      if (supabase && emailLogId) {
        await supabase
          .from('email_logs')
          .update({
            status: result.rejected.length > 0 ? 'failed' : 'sent',
            email_service_id: result.messageId,
            sent_at: new Date().toISOString(),
            error_message: result.rejected.length > 0 ? `Rejected: ${result.rejected.join(', ')}` : null
          })
          .eq('id', emailLogId);
      }

      return result;
    } catch (error: any) {
      // Update email log with failure
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

      throw new Error(`Failed to send email: ${error.message}`);
    }
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
    },
    htmlOverride?: string
  ): Promise<EmailResult> {
    const emailBody = this.generateDirectSubmissionBody(bodyText, applicantDetails);
    const emailHtml = htmlOverride || this.generateDirectSubmissionHtml(bodyText, applicantDetails);

    return await this.sendEmail({
      to: councilEmail,
      from: fromEmail,
      fromName,
      subject,
      text: emailBody,
      html: emailHtml,
      attachments: [
        {
          filename: pdfFileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ],
      submissionId
    });
  }

  /**
   * Send document review link to user
   */
  async sendReviewLink(
    submissionId: string,
    userEmail: string,
    fromEmail: string,
    fromName: string,
    subject: string,
    editUrl: string,
    applicantDetails: {
      name: string;
      siteAddress: string;
    },
    textOverride?: string,
    htmlOverride?: string
  ): Promise<EmailResult> {
    const bodyText = textOverride || this.generateReviewEmailBody(editUrl, applicantDetails);
    const bodyHtml = htmlOverride || this.generateReviewEmailHtml(editUrl, applicantDetails);

    return await this.sendEmail({
      to: userEmail,
      from: fromEmail,
      fromName,
      subject,
      text: bodyText,
      html: bodyHtml,
      submissionId
    });
  }

  /**
   * Send draft document with info pack to user
   */
  async sendDraftWithInfoPack(
    submissionId: string,
    userEmail: string,
    fromEmail: string,
    fromName: string,
    subject: string,
    editUrl: string,
    infoPack: string,
    applicantDetails: {
      name: string;
      siteAddress: string;
    },
    textOverride?: string,
    htmlOverride?: string
  ): Promise<EmailResult> {
    const bodyText = textOverride || this.generateDraftEmailBody(editUrl, infoPack, applicantDetails);
    const bodyHtml = htmlOverride || this.generateDraftEmailHtml(editUrl, infoPack, applicantDetails);

    return await this.sendEmail({
      to: userEmail,
      from: fromEmail,
      fromName,
      subject,
      text: bodyText,
      html: bodyHtml,
      submissionId
    });
  }

  private generateDirectSubmissionBody(
    submissionBody: string,
    applicant: { name: string; email: string; siteAddress: string; postalAddress?: string; applicationNumber?: string }
  ): string {
    return `Development Application Submission

Applicant: ${applicant.name}
Email: ${applicant.email}
Site Address: ${applicant.siteAddress}
Postal Address: ${applicant.postalAddress || ''}
${applicant.applicationNumber ? `Application Number: ${applicant.applicationNumber}` : ''}

Submission:

${submissionBody}

---
This submission was generated using the DA Submission Manager system.
`;
  }

  private generateDirectSubmissionHtml(
    submissionBody: string,
    applicant: { name: string; email: string; siteAddress: string; postalAddress?: string; applicationNumber?: string }
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Development Application Submission</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .header { background: #f4f4f4; padding: 10px; border-left: 4px solid #007cba; }
        .content { margin: 20px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Development Application Submission</h2>
    </div>
    
    <div class="content">
        <p><strong>Applicant:</strong> ${applicant.name}</p>
        <p><strong>Email:</strong> ${applicant.email}</p>
        <p><strong>Site Address:</strong> ${applicant.siteAddress}</p>
        ${applicant.postalAddress ? `<p><strong>Postal Address:</strong> ${applicant.postalAddress}</p>` : ''}
        ${applicant.applicationNumber ? `<p><strong>Application Number:</strong> ${applicant.applicationNumber}</p>` : ''}
        
        <h3>Submission:</h3>
        <div style="white-space: pre-wrap;">${submissionBody}</div>
    </div>
    
    <div class="footer">
        <p>This submission was generated using the DA Submission Manager system.</p>
    </div>
</body>
</html>`;
  }

  private generateReviewEmailBody(
    editUrl: string,
    applicant: { name: string; siteAddress: string }
  ): string {
    return `Dear ${applicant.name},

Your development application submission for ${applicant.siteAddress} has been prepared and is ready for your review.

You can review and edit your submission using this link:
${editUrl}

Please review the document carefully and make any necessary changes. Once you're satisfied with the submission, please reply to this email to confirm that it should be sent to council.

If you have any questions, please don't hesitate to contact us.

Best regards,
DA Submission Manager`;
  }

  private generateReviewEmailHtml(
    editUrl: string,
    applicant: { name: string; siteAddress: string }
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Review Your DA Submission</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .button { background: #007cba; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        .content { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="content">
        <h2>Review Your DA Submission</h2>
        <p>Dear ${applicant.name},</p>
        
        <p>Your development application submission for <strong>${applicant.siteAddress}</strong> has been prepared and is ready for your review.</p>
        
        <p><a href="${editUrl}" class="button">Review & Edit Your Submission</a></p>
        
        <p>Please review the document carefully and make any necessary changes. Once you're satisfied with the submission, please reply to this email to confirm that it should be sent to council.</p>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>DA Submission Manager</p>
    </div>
</body>
</html>`;
  }

  private generateDraftEmailBody(
    editUrl: string,
    infoPack: string,
    applicant: { name: string; siteAddress: string }
  ): string {
    return `Dear ${applicant.name},

Your development application submission draft for ${applicant.siteAddress} has been prepared along with background information to help you understand the process.

Background Information:
${infoPack}

You can review and edit your submission draft using this link:
${editUrl}

Take your time to review the information and customize the submission as needed. You can submit it to council when you're ready, or contact us for assistance.

Best regards,
DA Submission Manager`;
  }

  private generateDraftEmailHtml(
    editUrl: string,
    infoPack: string,
    applicant: { name: string; siteAddress: string }
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your DA Submission Draft</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .button { background: #007cba; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        .info-pack { background: #f9f9f9; padding: 15px; border-left: 4px solid #007cba; margin: 20px 0; }
        .content { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="content">
        <h2>Your DA Submission Draft</h2>
        <p>Dear ${applicant.name},</p>
        
        <p>Your development application submission draft for <strong>${applicant.siteAddress}</strong> has been prepared along with background information to help you understand the process.</p>
        
        <div class="info-pack">
            <h3>Background Information:</h3>
            <div style="white-space: pre-wrap;">${infoPack}</div>
        </div>
        
        <p><a href="${editUrl}" class="button">Review & Edit Your Draft</a></p>
        
        <p>Take your time to review the information and customize the submission as needed. You can submit it to council when you're ready, or contact us for assistance.</p>
        
        <p>Best regards,<br>DA Submission Manager</p>
    </div>
</body>
</html>`;
  }

  /**
   * Send submission with multiple PDF attachments (e.g., cover + grounds)
   */
  async sendDirectSubmissionWithAttachments(
    submissionId: string,
    councilEmail: string,
    fromEmail: string,
    fromName: string,
    subject: string,
    bodyText: string,
    attachments: Array<{ filename: string; buffer: Buffer }>,
    applicantDetails: {
      name: string;
      email: string;
      siteAddress: string;
      postalAddress?: string;
      applicationNumber?: string;
    },
    htmlOverride?: string
  ): Promise<EmailResult> {
    const emailBody = this.generateDirectSubmissionBody(bodyText, applicantDetails);
    const emailHtml = htmlOverride || this.generateDirectSubmissionHtml(bodyText, applicantDetails);

    return await this.sendEmail({
      to: councilEmail,
      from: fromEmail,
      fromName,
      subject,
      text: emailBody,
      html: emailHtml,
      attachments: attachments.map(a => ({ filename: a.filename, content: a.buffer, contentType: 'application/pdf' })),
      submissionId
    });
  }
}
