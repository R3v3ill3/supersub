import { GoogleDocsService } from './googleDocs';
import { EmailService } from './email';
import { getSupabase } from '../lib/supabase';
import { config } from '../lib/config';
import { ActionNetworkClient } from './actionNetwork';

type SubmissionData = {
  id: string;
  project_id: string;
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_email: string;
  applicant_postal_address?: string;
  site_address: string;
  application_number?: string;
  submission_pathway: 'direct' | 'review' | 'draft';
  status: string;
  google_doc_id?: string;
  google_doc_url?: string;
  pdf_url?: string;
  grounds_text_generated?: string;
  grounds_doc_id?: string;
  grounds_pdf_url?: string;
};

type ProjectData = {
  id: string;
  name: string;
  slug: string;
  council_email: string;
  council_name: string;
  google_doc_template_id?: string; // legacy single template
  cover_template_id?: string;
  grounds_template_id?: string;
  from_email?: string;
  from_name?: string;
  subject_template: string;
  council_subject_template?: string;
  council_email_body_template?: string;
  default_application_number?: string;
  default_pathway: string;
  enable_ai_generation: boolean;
  action_network_config?: Record<string, any>;
  test_submission_email?: string | null;
};

type DocumentWorkflowResult = {
  submissionId: string;
  documentId?: string;
  editUrl?: string;
  viewUrl?: string;
  pdfUrl?: string;
  emailSent: boolean;
  status: string;
};

export class DocumentWorkflowService {
  private googleDocs: GoogleDocsService;
  private emailService: EmailService;
  private static readonly DEFAULT_COUNCIL_EMAIL_BODY = `Dear {{council_name}},

Please find attached the development application submission for {{site_address}}.

Applicant: {{applicant_full_name}}
Email: {{applicant_email}}
{{application_number_line}}

Kind regards,
{{sender_name}}`;

  constructor() {
    this.googleDocs = new GoogleDocsService();
    this.emailService = new EmailService();
  }

  /**
   * Process a complete submission workflow based on the submission pathway
   */
  async processSubmission(submissionId: string, generatedContent?: string): Promise<DocumentWorkflowResult> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    // Get submission and project data
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select(`
        *,
        projects!inner(*)
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      throw new Error(`Submission not found: ${submissionError?.message}`);
    }

    const submissionData = submission as SubmissionData;
    const projectData = submission.projects as ProjectData;

    // Update submission status
    await supabase
      .from('submissions')
      .update({ status: 'PROCESSING' })
      .eq('id', submissionId);

    try {
      switch (submissionData.submission_pathway) {
        case 'direct':
          return await this.processDirectSubmission(submissionData, projectData, generatedContent);
        
        case 'review':
          return await this.processReviewSubmission(submissionData, projectData, generatedContent);
        
        case 'draft':
          return await this.processDraftSubmission(submissionData, projectData, generatedContent);
        
        default:
          throw new Error(`Unknown submission pathway: ${submissionData.submission_pathway}`);
      }
    } catch (error: any) {
      // Update submission status on error
      await supabase
        .from('submissions')
        .update({ 
          status: 'ERROR',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);
      
      throw error;
    }
  }

  /**
   * Direct pathway: Generate document, export PDF, email directly to council
   */
  private async processDirectSubmission(
    submission: SubmissionData,
    project: ProjectData,
    generatedContent?: string
  ): Promise<DocumentWorkflowResult> {
    const supabase = getSupabase()!;

    // Generate both documents (cover + grounds)
    const { cover, grounds } = await this.createCoverAndGrounds(submission, project, generatedContent);

    // Export PDFs
    const coverPdf = await this.googleDocs.exportToPdf(cover.documentId);
    const coverPdfName = `DA_Cover_${submission.site_address.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const groundsPdf = await this.googleDocs.exportToPdf(grounds.documentId);
    const groundsPdfName = `DA_Grounds_${submission.site_address.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    // Email subject (prefer council_subject_template if present)
    const subjectTpl = project.council_subject_template || project.subject_template || 'Development Application Submission - {{site_address}}';
    const applicationNumber = submission.application_number || project.default_application_number || '';
    const subject = this.processTemplate(subjectTpl, {
      site_address: submission.site_address,
      application_number: applicationNumber,
      applicant_name: `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim()
    });

    // Send email directly to council with both attachments
    const emailRecipient = project.test_submission_email || project.council_email;

    const { bodyText, bodyHtml } = this.buildCouncilEmailContent(submission, project);

    const emailResult = await this.emailService.sendDirectSubmissionWithAttachments(
      submission.id,
      emailRecipient,
      project.from_email || process.env.DEFAULT_FROM_EMAIL!,
      project.from_name || process.env.DEFAULT_FROM_NAME || 'DA Submission Manager',
      subject,
      bodyText,
      [
        { filename: coverPdfName, buffer: coverPdf },
        { filename: groundsPdfName, buffer: groundsPdf }
      ],
      {
        name: `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim(),
        email: submission.applicant_email,
        siteAddress: submission.site_address,
        postalAddress: submission.applicant_postal_address,
        applicationNumber
      },
      bodyHtml
    );

    // Update submission
    await supabase
      .from('submissions')
      .update({
        status: 'SUBMITTED',
        google_doc_id: cover.documentId,
        google_doc_url: cover.editUrl,
        pdf_url: cover.pdfUrl,
        grounds_doc_id: grounds.documentId,
        grounds_pdf_url: grounds.pdfUrl,
        submitted_to_council_at: new Date().toISOString(),
        council_confirmation_id: emailResult.messageId
      })
      .eq('id', submission.id);

    // Save document record
    await this.saveDocumentRecord(submission.id, cover, project.cover_template_id || project.google_doc_template_id, 'cover');
    await this.saveDocumentRecord(submission.id, grounds, project.grounds_template_id, 'grounds');

    return {
      submissionId: submission.id,
      documentId: cover.documentId,
      editUrl: cover.editUrl,
      viewUrl: cover.viewUrl,
      pdfUrl: cover.pdfUrl,
      emailSent: true,
      status: 'SUBMITTED'
    };
  }

  /**
   * Review pathway: Generate document, send edit link to user for review
   */
  private async processReviewSubmission(
    submission: SubmissionData,
    project: ProjectData,
    generatedContent?: string
  ): Promise<DocumentWorkflowResult> {
    const supabase = getSupabase()!;

    // Generate document
    const documentResult = await this.createDocument(submission, project, generatedContent);

    // Send review email to user
    const subject = `Review your DA submission for ${submission.site_address}`;
    
    const reviewEmailContent = this.buildCouncilEmailContent(submission, project);

    const emailResult = await this.emailService.sendReviewLink(
      submission.id,
      submission.applicant_email,
      project.from_email || process.env.DEFAULT_FROM_EMAIL!,
      project.from_name || process.env.DEFAULT_FROM_NAME || 'DA Submission Manager',
      subject,
      documentResult.editUrl,
      {
        name: `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim(),
        siteAddress: submission.site_address
      },
      reviewEmailContent.bodyText,
      reviewEmailContent.bodyHtml
    );

    // Update submission
    await supabase
      .from('submissions')
      .update({
        status: 'AWAITING_REVIEW',
        google_doc_id: documentResult.documentId,
        google_doc_url: documentResult.editUrl,
        pdf_url: documentResult.pdfUrl
      })
      .eq('id', submission.id);

    // Save document record
    await this.saveDocumentRecord(submission.id, documentResult, project.google_doc_template_id);

    return {
      submissionId: submission.id,
      documentId: documentResult.documentId,
      editUrl: documentResult.editUrl,
      viewUrl: documentResult.viewUrl,
      pdfUrl: documentResult.pdfUrl,
      emailSent: true,
      status: 'AWAITING_REVIEW'
    };
  }

  /**
   * Draft pathway: Generate document, send with info pack to user
   */
  private async processDraftSubmission(
    submission: SubmissionData,
    project: ProjectData,
    generatedContent?: string
  ): Promise<DocumentWorkflowResult> {
    const supabase = getSupabase()!;

    // Generate document
    const documentResult = await this.createDocument(submission, project, generatedContent);

    // Load info pack (could be from database or file)
    const infoPack = await this.getInfoPack(project.id);

    // Send draft email with info pack to user
    const subject = `Your DA submission draft for ${submission.site_address}`;
    
    const draftEmailContent = this.buildCouncilEmailContent(submission, project);

    const emailResult = await this.emailService.sendDraftWithInfoPack(
      submission.id,
      submission.applicant_email,
      project.from_email || process.env.DEFAULT_FROM_EMAIL!,
      project.from_name || process.env.DEFAULT_FROM_NAME || 'DA Submission Manager',
      subject,
      documentResult.editUrl,
      infoPack,
      {
        name: `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim(),
        siteAddress: submission.site_address
      },
      draftEmailContent.bodyText,
      draftEmailContent.bodyHtml
    );

    // Update submission
    await supabase
      .from('submissions')
      .update({
        status: 'DRAFT_SENT',
        google_doc_id: documentResult.documentId,
        google_doc_url: documentResult.editUrl,
        pdf_url: documentResult.pdfUrl
      })
      .eq('id', submission.id);

    // Save document record
    await this.saveDocumentRecord(submission.id, documentResult, project.google_doc_template_id);

    return {
      submissionId: submission.id,
      documentId: documentResult.documentId,
      editUrl: documentResult.editUrl,
      viewUrl: documentResult.viewUrl,
      pdfUrl: documentResult.pdfUrl,
      emailSent: true,
      status: 'DRAFT_SENT'
    };
  }

  /**
   * Create document from template with placeholders
   */
  private async createDocument(
    submission: SubmissionData,
    project: ProjectData,
    generatedContent?: string
  ): Promise<{
    documentId: string;
    editUrl: string;
    viewUrl: string;
    pdfUrl: string;
    pdfFileId: string;
  }> {
    if (!project.google_doc_template_id) {
      throw new Error('No Google Doc template configured for this project');
    }

    const placeholders = {
      applicant_name: `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim(),
      applicant_email: submission.applicant_email,
      site_address: submission.site_address,
      application_number: submission.application_number || project.default_application_number || '',
      submission_date: new Date().toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      submission_body: generatedContent || 'Please update this section with your submission content.',
      council_name: project.council_name,
      project_name: project.name
    };

    const title = `DA Submission - ${submission.site_address} - ${new Date().toISOString().split('T')[0]}`;

    return await this.googleDocs.createSubmissionDocument(
      project.google_doc_template_id,
      placeholders,
      title
    );
  }

  /**
   * Create cover and grounds documents
   */
  private async createCoverAndGrounds(
    submission: SubmissionData,
    project: ProjectData,
    generatedGroundsText?: string
  ): Promise<{
    cover: { documentId: string; editUrl: string; viewUrl: string; pdfUrl: string; pdfFileId: string };
    grounds: { documentId: string; editUrl: string; viewUrl: string; pdfUrl: string; pdfFileId: string };
  }> {
    const coverTemplate = project.cover_template_id || project.google_doc_template_id;
    const groundsTemplate = project.grounds_template_id || project.google_doc_template_id;
    if (!coverTemplate || !groundsTemplate) {
      throw new Error('Project is missing cover or grounds template configuration');
    }

    const applicantName = `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim();
    const basePlaceholders = {
      applicant_name: applicantName,
      applicant_email: submission.applicant_email,
      applicant_postal_address: submission.applicant_postal_address || '',
      site_address: submission.site_address,
      application_number: submission.application_number || project.default_application_number || '',
      submission_date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
      council_name: project.council_name,
      project_name: project.name
    };

    // Cover doc placeholders
    const coverPlaceholders = {
      ...basePlaceholders,
      submission_body: 'Please see the attached Grounds for Submission accompanying this cover letter.'
    };
    const coverTitle = `DA Cover - ${submission.site_address} - ${new Date().toISOString().split('T')[0]}`;
    const cover = await this.googleDocs.createSubmissionDocument(coverTemplate, coverPlaceholders, coverTitle);

    // Grounds doc
    const groundsText = generatedGroundsText || submission.grounds_text_generated || 'Grounds for submission will be detailed here.';
    const groundsPlaceholders = {
      ...basePlaceholders,
      submission_body: groundsText
    };
    const groundsTitle = `DA Grounds - ${submission.site_address} - ${new Date().toISOString().split('T')[0]}`;
    const grounds = await this.googleDocs.createSubmissionDocument(groundsTemplate, groundsPlaceholders, groundsTitle);

    return { cover, grounds };
  }

  /**
   * Save document record to database
   */
  private async saveDocumentRecord(
    submissionId: string,
    documentResult: {
      documentId: string;
      editUrl: string;
      viewUrl: string;
      pdfUrl: string;
    },
    templateId?: string,
    docType?: 'cover' | 'grounds'
  ): Promise<void> {
    const supabase = getSupabase()!;

    await supabase
      .from('documents')
      .insert({
        submission_id: submissionId,
        google_doc_id: documentResult.documentId,
        google_doc_url: documentResult.editUrl,
        pdf_url: documentResult.pdfUrl,
        template_id: templateId,
        doc_type: docType,
        status: 'created'
      });
  }

  /**
   * Get info pack content for a project
   */
  private async getInfoPack(projectId: string): Promise<string> {
    // This could load from database or file system
    // For now, return a default info pack
    return `Development Application Process Information

What is a Development Application?
A Development Application (DA) is a formal request to council to develop or use land in a particular way. Most building work, changes to existing buildings, and changes to land use require development consent from council.

The Assessment Process
1. Application lodgement and initial assessment
2. Public exhibition (where required)
3. Assessment against planning controls
4. Decision notification

Your Rights
- You have the right to make a submission on development applications
- Your submission will be considered as part of the assessment
- You may request to speak at a council meeting about the application

Making an Effective Submission
- Focus on planning matters relevant to the Development Control Plan and Local Environmental Plan
- Be specific about impacts on your property or the local area
- Provide evidence where possible
- Be respectful and factual

This draft submission has been prepared to help you participate in the planning process. You can edit the document to add your own concerns and observations.`;
  }

  /**
   * Process template strings with placeholders
   */
  private processTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  /**
   * Finalize and submit a document that's been reviewed by the user
   */
  async finalizeAndSubmit(submissionId: string): Promise<DocumentWorkflowResult> {
    const supabase = getSupabase()!;

    // Get submission and project data
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select(`
        *,
        projects!inner(*)
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      throw new Error(`Submission not found: ${submissionError?.message}`);
    }

    const submissionData = submission as SubmissionData;
    const projectData = submission.projects as ProjectData;

    if (!submissionData.google_doc_id) {
      throw new Error('No Google Doc associated with this submission');
    }

    // Export fresh PDF
    const pdfBuffer = await this.googleDocs.exportToPdf(submissionData.google_doc_id);
    const pdfFileName = `DA_Submission_${submissionData.site_address.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    // Send to council
    const subject = this.processTemplate(projectData.subject_template, {
      site_address: submissionData.site_address,
      application_number: submissionData.application_number || '',
      applicant_name: `${submissionData.applicant_first_name} ${submissionData.applicant_last_name}`.trim()
    });

    const recipient = projectData.test_submission_email || projectData.council_email;

    const { bodyText, bodyHtml } = this.buildCouncilEmailContent(submissionData, projectData);

    const emailResult = await this.emailService.sendDirectSubmission(
      submissionData.id,
      recipient,
      projectData.council_name,
      projectData.from_email || process.env.DEFAULT_FROM_EMAIL!,
      projectData.from_name || process.env.DEFAULT_FROM_NAME || 'DA Submission Manager',
      subject,
      bodyText,
      pdfBuffer,
      pdfFileName,
      {
        name: `${submissionData.applicant_first_name} ${submissionData.applicant_last_name}`.trim(),
        email: submissionData.applicant_email,
        siteAddress: submissionData.site_address,
        applicationNumber: submissionData.application_number
      },
      bodyHtml
    );

    // Update submission
    await supabase
      .from('submissions')
      .update({
        status: 'SUBMITTED',
        submitted_to_council_at: new Date().toISOString(),
        council_confirmation_id: emailResult.messageId
      })
      .eq('id', submissionId);

    // Update document status
    await supabase
      .from('documents')
      .update({ status: 'submitted' })
      .eq('submission_id', submissionId);

    return {
      submissionId,
      documentId: submissionData.google_doc_id,
      editUrl: submissionData.google_doc_url,
      viewUrl: submissionData.google_doc_url?.replace('/edit', '/view'),
      pdfUrl: submissionData.pdf_url,
      emailSent: true,
      status: 'SUBMITTED'
    };
  }

  private buildCouncilEmailContent(
    submission: SubmissionData,
    project: ProjectData
  ): { bodyText: string; bodyHtml: string } {
    const template = project.council_email_body_template || DocumentWorkflowService.DEFAULT_COUNCIL_EMAIL_BODY;

    const applicantFullName = `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim();
    const applicationNumberLine = submission.application_number
      ? `Application Number: ${submission.application_number}`
      : '';

    const variables: Record<string, string> = {
      council_name: project.council_name,
      site_address: submission.site_address,
      applicant_full_name: applicantFullName,
      applicant_email: submission.applicant_email,
      application_number_line: applicationNumberLine,
      sender_name: project.from_name || 'DA Submission Manager',
      sender_email: project.from_email || process.env.DEFAULT_FROM_EMAIL || '',
      project_name: project.name
    };

    const bodyText = this.processTemplate(template, variables);

    const bodyHtml = bodyText
      .split('\n')
      .map(line => `<p>${line || '&nbsp;'}</p>`)
      .join('');

    return { bodyText, bodyHtml };
  }
}
