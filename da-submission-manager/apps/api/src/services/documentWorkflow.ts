import { GoogleDocsService } from './googleDocs';
import { EmailService } from './email';
import { getSupabase } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { Logger } from '../lib/logger';
import { resolveActiveTemplate } from './templateVersionResolver';
import { TemplateCombinerService } from './templateCombiner';
import { UploadService } from './upload';
import { extractDocxText, extractPdfText } from './templateParser';
import { PdfGeneratorService } from './pdfGenerator';
import Handlebars from 'handlebars';

type SubmissionData = {
  id: string;
  project_id: string;
  project?: ProjectData;
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_email: string;
  applicant_residential_address?: string;
  applicant_suburb?: string;
  applicant_state?: string;
  applicant_postcode?: string;
  applicant_postal_address?: string;
  postal_suburb?: string;
  postal_state?: string;
  postal_postcode?: string;
  postal_email?: string;
  lot_number?: string;
  plan_number?: string;
  site_address: string;
  application_number?: string;
  submission_pathway: 'direct' | 'review' | 'draft';
  submission_track?: 'followup' | 'comprehensive' | 'single';
  is_returning_submitter?: boolean;
  review_deadline?: string | null;
  submitted_to_council_at?: string | null;
  status: string;
  google_doc_id?: string;
  google_doc_url?: string;
  pdf_url?: string;
  review_completed_at?: string | null;
  review_started_at?: string | null;
  last_modified_at?: string | null;
  grounds_text_generated?: string;
  grounds_doc_id?: string;
  grounds_pdf_url?: string;
  created_at?: string;
  updated_at?: string;
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
  is_dual_track?: boolean;
  dual_track_config?: {
    original_grounds_template_id: string;
    followup_grounds_template_id: string;
    track_selection_prompt?: string;
    track_descriptions?: {
      followup: string;
      comprehensive: string;
    };
  };
};

export type DocumentWorkflowResult = {
  submissionId: string;
  documentId?: string;
  editUrl?: string;
  viewUrl?: string;
  pdfUrl?: string;
  emailSent: boolean;
  status: string;
  reviewDeadline?: string | null;
  reviewStartedAt?: string | null;
  reviewCompletedAt?: string | null;
  // PDF data for immediate download (avoids database storage/retrieval)
  pdfData?: {
    groundsPdf?: Buffer;
    groundsPdfFilename?: string;
    coverPdf?: Buffer;
    coverPdfFilename?: string;
  };
};

export type DocumentStatus = 'created' | 'user_editing' | 'finalized' | 'submitted' | 'approved';

export type DocumentReviewStatus =
  | 'not_started'
  | 'in_progress'
  | 'changes_requested'
  | 'ready_for_submission'
  | 'submitted';

export type SubmissionStatusSummary = {
  submissionId: string;
  status: string;
  pathway: SubmissionData['submission_pathway'];
  reviewDeadline?: string | null;
  submittedAt?: string | null;
  reviewStartedAt?: string | null;
  reviewCompletedAt?: string | null;
};

export type DocumentStatusSummary = {
  documentId?: string;
  docType?: 'cover' | 'grounds';
  googleDocId?: string;
  googleDocUrl?: string;
  pdfUrl?: string;
  status: DocumentStatus;
  reviewStartedAt?: string | null;
  reviewCompletedAt?: string | null;
  lastModifiedAt?: string | null;
};

export type DocumentReviewSummary = {
  submission: SubmissionStatusSummary;
  documents: DocumentStatusSummary[];
};

type SubmissionRow = Database['public']['Tables']['submissions']['Row'];
type DocumentRow = Database['public']['Tables']['documents']['Row'];

export class DocumentWorkflowService {
  private googleDocs: GoogleDocsService;
  private emailService: EmailService;
  private logger: Logger;
  private static readonly DEFAULT_COUNCIL_EMAIL_BODY = `Dear {{council_name}},

Attention: Tim Baker CEO,

Please find attached the development application submission for {{site_address}}.

Email: {{applicant_email}}
{{application_number_line}}

Kind regards,
{{applicant_full_name}}`;

  constructor() {
    this.googleDocs = new GoogleDocsService();
    this.emailService = new EmailService();
    this.logger = new Logger({ namespace: 'documentWorkflow' });

    // Register Handlebars helpers for template processing
    Handlebars.registerHelper('if', function(this: any, conditional, options) {
      if (conditional) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });

    Handlebars.registerHelper('applicant_full_name', function(firstName: string, lastName: string) {
      return [firstName, lastName].filter(Boolean).join(' ').trim();
    });

    Handlebars.registerHelper('format_date', function(date?: string) {
      if (!date) return new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
      return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    });
  }

  private getClient(): SupabaseClient<Database> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }
    return supabase as SupabaseClient<Database>;
  }

  async getDocumentStatus(submissionId: string): Promise<DocumentReviewSummary> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('submissions')
      .select(
        `
        id,
        status,
        submission_pathway,
        review_deadline,
        review_started_at,
        review_completed_at,
        submitted_to_council_at,
        documents (
          id,
          doc_type,
          google_doc_id,
          google_doc_url,
          pdf_url,
          status,
          review_started_at,
          review_completed_at,
          last_modified_at,
          updated_at
        )
      `
      )
      .eq('id', submissionId)
      .maybeSingle();

    if (error || !data) {
      throw new Error(`Submission not found: ${error?.message ?? submissionId}`);
    }

    const submission = data as SubmissionRow & { documents: DocumentRow[] };
    return {
      submission: {
        submissionId: submission.id,
        status: submission.status,
        pathway: submission.submission_pathway as SubmissionData['submission_pathway'],
        reviewDeadline: submission.review_deadline,
        submittedAt: submission.submitted_to_council_at,
        reviewStartedAt: submission.review_started_at,
        reviewCompletedAt: submission.review_completed_at,
      },
      documents: (submission.documents || []).map((doc) => ({
        documentId: doc.id,
        docType: doc.doc_type || undefined,
        googleDocId: doc.google_doc_id || undefined,
        googleDocUrl: doc.google_doc_url || undefined,
        pdfUrl: doc.pdf_url || undefined,
        status: doc.status,
        reviewStartedAt: doc.review_started_at,
        reviewCompletedAt: doc.review_completed_at,
        lastModifiedAt: doc.last_modified_at || doc.updated_at,
      })),
    };
  }

  async validateDocumentForSubmission(submissionId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        status,
        submission_pathway,
        google_doc_id,
        google_doc_url,
        review_deadline,
        review_completed_at,
        review_started_at,
        documents (
          id,
          status,
          doc_type,
          review_completed_at,
          review_started_at,
          last_modified_at
        )
      `)
      .eq('id', submissionId)
      .maybeSingle();

    if (error || !data) {
      throw new Error(`Submission not found: ${error?.message ?? submissionId}`);
    }

    const issues: string[] = [];
    const submission = data as SubmissionRow & { documents: DocumentRow[] };

    if (!submission.google_doc_id) {
      issues.push('Submission is missing a Google Doc reference.');
    }

    if (!submission.review_started_at) {
      issues.push('Review has not been started.');
    }

    const documents = submission.documents || [];
    const incompleteDocs = documents.filter((doc) => doc.status !== 'finalized' && doc.status !== 'approved');
    if (incompleteDocs.length > 0) {
      issues.push('One or more documents are not finalized.');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  async updateDocumentStatus(
    submissionId: string,
    status: DocumentStatus,
    options?: {
      reviewStatus?: DocumentReviewStatus;
      reviewStartedAt?: string;
      reviewCompletedAt?: string;
      lastModifiedAt?: string;
    }
  ): Promise<void> {
    const supabase = this.getClient();

    const now = (options?.lastModifiedAt) ?? new Date().toISOString();

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, status, review_started_at, review_completed_at')
      .eq('id', submissionId)
      .maybeSingle();

    if (submissionError || !submission) {
      throw new Error(`Submission not found: ${submissionError?.message ?? submissionId}`);
    }

    const updates: any = {
      last_modified_at: now,
      updated_at: now,
    };

    if (options && options.reviewStatus === 'in_progress' && !(submission as any).review_started_at) {
      updates.review_started_at = options.reviewStartedAt ?? now;
    }

    if (options && (options.reviewStatus === 'ready_for_submission' || status === 'finalized' || status === 'approved')) {
      updates.review_completed_at = options.reviewCompletedAt ?? now;
    }

    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      // @ts-expect-error - Supabase type inference issue with partial updates
      .update(updates)
      .eq('id', submissionId)
      .select('review_started_at, review_completed_at')
      .single();

    if (updateError || !updatedSubmission) {
      throw new Error(`Failed to update submission status: ${updateError?.message ?? 'unknown error'}`);
    }

    const { error: docError } = await supabase
      .from('documents')
      // @ts-expect-error - Supabase type inference issue with partial updates
      .update({
        status,
        last_modified_at: now,
        review_started_at: (options?.reviewStartedAt) ?? (updatedSubmission as any).review_started_at ?? (submission as any).review_started_at ?? null,
        review_completed_at: (options?.reviewCompletedAt) ?? (updatedSubmission as any).review_completed_at ?? (submission as any).review_completed_at ?? null,
        updated_at: now,
      } as any)
      .eq('submission_id', submissionId);

    if (docError) {
      throw new Error(`Failed to update document status: ${docError.message}`);
    }
  }

  async getDocumentPreview(submissionId: string): Promise<{ documentId: string; googleDocUrl: string; pdfUrl?: string | null }> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('documents')
      .select('id, google_doc_url, pdf_url')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(`Document preview not available: ${error?.message ?? submissionId}`);
    }

    return {
      documentId: (data as any).id,
      googleDocUrl: (data as any).google_doc_url,
      pdfUrl: (data as any).pdf_url,
    };
  }

  /**
   * Process a complete submission workflow based on the submission pathway
   */
  async processSubmission(submissionId: string, generatedContent?: string, customEmailBody?: string, downloadPdf: boolean = true): Promise<DocumentWorkflowResult> {
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

    const nowIso = new Date().toISOString();

    // Update submission status
    await supabase
      .from('submissions')
      .update({ status: 'PROCESSING' })
      .eq('id', submissionId);

    try {
      switch (submissionData.submission_pathway) {
        case 'direct':
          return await this.processDirectSubmission(submissionData, projectData, generatedContent, customEmailBody, downloadPdf);
        
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
    generatedContent?: string,
    customEmailBody?: string,
    downloadPdf: boolean = true
  ): Promise<DocumentWorkflowResult> {
    const supabase = this.getClient();

    // Prepare complete submission data for all templates
    const submissionData = await this.prepareSubmissionData(submission, project, generatedContent);

    // 1. Generate cover letter content (for email body - not as PDF attachment)
    // Use custom email body if provided, otherwise generate from template
    const coverContent = customEmailBody || await this.generateCoverContent(project, submissionData);
    
    // Convert markdown cover content to plain text and HTML for email body
    const coverBodyText = coverContent;
    const coverBodyHtml = `<div style="white-space: pre-wrap; font-family: Arial, sans-serif;">${coverContent.replace(/\n/g, '<br />')}</div>`;

    // 2. Generate grounds document content and PDF (the only attachment)
    const groundsContent = await this.generateGroundsContent(submission, project, submissionData);
    const groundsTitle = `DA Submission - ${submission.site_address}`;
    const groundsFileName = `DA_Submission_${submission.site_address.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const groundsFile = await this.createFileFromMarkdown(groundsContent, groundsTitle);

    // Email subject (prefer council_subject_template if present)
    const subjectTpl = project.council_subject_template || project.subject_template || 'Development Application Submission - {{site_address}}';
    const applicationNumber = submission.application_number || project.default_application_number || '';
    const subject = this.processTemplate(subjectTpl, {
      site_address: submission.site_address,
      application_number: applicationNumber,
      applicant_name: `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim()
    });

    // Send email directly to council with cover as body and only grounds as attachment
    const emailRecipient = project.test_submission_email || project.council_email;

    const emailResult = await this.emailService.sendDirectSubmissionWithAttachments(
      submission.id,
      emailRecipient,
      project.from_email || process.env.DEFAULT_FROM_EMAIL!,
      project.from_name || process.env.DEFAULT_FROM_NAME || 'DA Submission Manager',
      subject,
      coverBodyText,
      [
        { filename: groundsFileName, buffer: groundsFile }
      ],
      {
        name: `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim(),
        email: submission.applicant_email,
        siteAddress: submission.site_address,
        postalAddress: submission.applicant_postal_address,
        applicationNumber
      },
      coverBodyHtml
    );

    // Update submission status (don't store PDF in database for direct downloads)
    const submittedAt = new Date().toISOString();

    await supabase
      .from('submissions')
      // @ts-expect-error - Supabase type inference issue with partial updates
      .update({
        status: 'SUBMITTED',
        submitted_to_council_at: submittedAt,
        council_confirmation_id: emailResult.messageId,
        updated_at: submittedAt
      } as any)
      .eq('id', submission.id);

    // No Google Docs created for direct pathway, so no document records to save
    // Return PDF data for immediate frontend download instead of storing in database
    // Cover letter content is used as the email body

    return {
      submissionId: submission.id,
      emailSent: true,
      status: 'SUBMITTED',
      ...(downloadPdf && {
        pdfData: {
          groundsPdf: groundsFile,
          groundsPdfFilename: groundsFileName
        }
      })
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
    const supabase = this.getClient();

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

    const nowIso = new Date().toISOString();
    const reviewDeadlineDays = Number(process.env.REVIEW_DEADLINE_DAYS ?? '0');
    const reviewDeadline = Number.isFinite(reviewDeadlineDays) && reviewDeadlineDays > 0
      ? new Date(Date.now() + reviewDeadlineDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Update submission
    await supabase
      .from('submissions')
      // @ts-expect-error - Supabase type inference issue with partial updates
      .update({
        status: 'AWAITING_REVIEW',
        google_doc_id: documentResult.documentId,
        google_doc_url: documentResult.editUrl,
        pdf_url: documentResult.pdfUrl,
        review_started_at: nowIso,
        last_modified_at: nowIso,
        review_deadline: reviewDeadline
      } as any)
      .eq('id', submission.id);

    // Save document record
    await this.saveDocumentRecord(submission.id, documentResult, {
      templateId: project.google_doc_template_id,
      status: 'user_editing',
      reviewStartedAt: nowIso,
      lastModifiedAt: nowIso,
    });

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
    const supabase = this.getClient();

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
      // @ts-expect-error - Supabase type inference issue with partial updates
      .update({
        status: 'DRAFT_SENT',
        google_doc_id: documentResult.documentId,
        google_doc_url: documentResult.editUrl,
        pdf_url: documentResult.pdfUrl
      } as any)
      .eq('id', submission.id);

    // Save document record
    await this.saveDocumentRecord(submission.id, documentResult, {
      templateId: project.google_doc_template_id,
      status: 'created',
      lastModifiedAt: new Date().toISOString(),
    });

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
    const title = `DA Submission - ${submission.site_address} - ${new Date().toISOString().split('T')[0]}`;
    
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

    // If no template configured, create a blank document with the content
    if (!project.google_doc_template_id) {
      this.logger.warn('No Google Doc template configured, creating blank document');
      return await this.googleDocs.createBlankDocument(title, placeholders, generatedContent || '');
    }

    return await this.googleDocs.createSubmissionDocument(
      project.google_doc_template_id,
      placeholders,
      title
    );
  }

  /**
   * Create cover email and grounds submission document with template combination
   */
  private async createCoverAndGrounds(
    submission: SubmissionData,
    project: ProjectData,
    generatedGroundsText?: string
  ): Promise<{
    cover: { documentId: string; editUrl: string; viewUrl: string; pdfUrl: string; pdfFileId: string };
    grounds: { documentId: string; editUrl: string; viewUrl: string; pdfUrl: string; pdfFileId: string };
  }> {
    this.logger.info('Creating cover and grounds documents', { submissionId: submission.id, isDualTrack: project.is_dual_track });

    // Prepare complete submission data for all templates
    const submissionData = await this.prepareSubmissionData(submission, project, generatedGroundsText);

    // 1. Generate cover letter/email
    const coverContent = await this.generateCoverContent(project, submissionData);
    const coverTitle = `DA_Cover_${submission.site_address.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const cover = await this.createDocumentFromMarkdown(coverContent, coverTitle);

    // 2. Generate grounds document with template combination
    const groundsContent = await this.generateGroundsContent(submission, project, submissionData);
    const groundsTitle = `DA_Submission_${submission.site_address.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const grounds = await this.createDocumentFromMarkdown(groundsContent, groundsTitle);

    return { cover, grounds };
  }

  /**
   * Prepare complete submission data with all fields for template merging
   */
  private async prepareSubmissionData(
    submission: SubmissionData,
    project: ProjectData,
    generatedGroundsText?: string
  ): Promise<Record<string, any>> {
    const applicantFullName = `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim();
    const submissionDate = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    const applicationNumber = submission.application_number || project.default_application_number || '';

    // Check if postal address is same as residential
    const postalAddressSame = !submission.applicant_postal_address ||
      submission.applicant_postal_address === submission.applicant_residential_address;

    return {
      // Applicant details
      applicant_first_name: submission.applicant_first_name,
      applicant_last_name: submission.applicant_last_name,
      applicant_name: applicantFullName,
      applicant_full_name: applicantFullName,
      applicant_email: submission.applicant_email,

      // Residential address
      applicant_residential_address: submission.applicant_residential_address || '',
      applicant_suburb: submission.applicant_suburb || '',
      applicant_state: submission.applicant_state || '',
      applicant_postcode: submission.applicant_postcode || '',

      // Postal address
      postal_address_same: postalAddressSame,
      applicant_postal_address: submission.applicant_postal_address || submission.applicant_residential_address || '',
      postal_suburb: submission.postal_suburb || submission.applicant_suburb || '',
      postal_state: submission.postal_state || submission.applicant_state || '',
      postal_postcode: submission.postal_postcode || submission.applicant_postcode || '',
      postal_email: submission.postal_email || submission.applicant_email,

      // Property details
      lot_number: submission.lot_number || '',
      plan_number: submission.plan_number || '',
      site_address: submission.site_address,
      application_number: applicationNumber,
      application_number_line: applicationNumber ? `Application Number: ${applicationNumber}` : '',

      // Council details
      council_name: project.council_name,
      council_email: project.council_email,

      // Submission details
      submission_date: submissionDate,
      submission_pathway: submission.submission_pathway,
      submission_track: submission.submission_track || 'single',
      is_returning_submitter: submission.is_returning_submitter || false,
      previous_submission_date: submission.is_returning_submitter ? 'October 2024' : '', // TODO: Get from history

      // Generated content placeholder (will be filled by template combiner)
      grounds_content: generatedGroundsText || submission.grounds_text_generated || '',

      // Project details
      project_name: project.name,
      project_slug: project.slug
    };
  }

  /**
   * Generate cover letter/email content
   */
  private async generateCoverContent(
    project: ProjectData,
    submissionData: Record<string, any>
  ): Promise<string> {
    // Load cover template (email body or default)
    let coverTemplate: string;

    if (project.council_email_body_template) {
      coverTemplate = project.council_email_body_template;
    } else {
      // Load default Gold Coast cover template
      const uploadService = new UploadService();
      try {
        const buffer = await uploadService.downloadFromStorage('templates/gold-coast-cover-template.md');
        coverTemplate = buffer.toString('utf-8');
      } catch (error) {
        // Fallback to basic template
        coverTemplate = DocumentWorkflowService.DEFAULT_COUNCIL_EMAIL_BODY;
      }
    }

    // Merge with Handlebars
    const template = Handlebars.compile(coverTemplate);
    return template(submissionData);
  }

  /**
   * Generate grounds document with template combination for dual-track
   */
  private async generateGroundsContent(
    submission: SubmissionData,
    project: ProjectData,
    submissionData: Record<string, any>
  ): Promise<string> {
    const uploadService = new UploadService();
    const templateCombiner = new TemplateCombinerService();

    // 1. Load structure template (submission_format type from template_files)
    let structureTemplate: string;
    try {
      const structureTemplateData = await resolveActiveTemplate(project.id, 'submission_format');
      if (structureTemplateData) {
        const buffer = await uploadService.downloadFromStorage(structureTemplateData.storagePath);
        structureTemplate = buffer.toString('utf-8');
        this.logger.info('Loaded submission_format template from project', { projectId: project.id });
      } else {
        throw new Error('No submission_format template found');
      }
    } catch (error) {
      this.logger.warn('Project submission_format template not found, using basic template');
      structureTemplate = '# Submission\n\n## Property Details\n**Property Address:** {{site_address}}\n**Application Number:** {{application_number}}\n\n## Submitter Details\n**Name:** {{applicant_full_name}}\n**Email:** {{applicant_email}}\n\n## Grounds for Submission\n\n{{grounds_content}}';
    }

    // 2. Get grounds content based on track (dual-track or single)
    let groundsContent: string;

    if (project.is_dual_track && project.dual_track_config) {
      const track = (submission.submission_track || 'comprehensive') as 'followup' | 'comprehensive';
      this.logger.info('Using dual-track template combination', { track });

      try {
        groundsContent = await templateCombiner.getTrackSpecificTemplate(
          project.id,
          track,
          project.dual_track_config as any
        );
      } catch (error: any) {
        this.logger.error('Failed to combine dual-track templates, using generated content directly', { error: error.message });
        // Fallback to using the generated content directly
        groundsContent = submissionData.grounds_content || 'No grounds content available';
      }
    } else if (project.grounds_template_id) {
      // Single-track: load single grounds template
      this.logger.info('Using single-track grounds template');
      try {
        const buffer = await uploadService.downloadFromStorage(project.grounds_template_id);
        const isDocx = project.grounds_template_id.endsWith('.docx');
        const isPdf = project.grounds_template_id.endsWith('.pdf');

        if (isDocx) {
          groundsContent = await extractDocxText(buffer);
        } else if (isPdf) {
          groundsContent = await extractPdfText(buffer);
        } else {
          groundsContent = buffer.toString('utf-8');
        }
      } catch (error: any) {
        this.logger.error('Failed to load grounds template, using generated content directly', { error: error.message });
        // Fallback to using the generated content directly
        groundsContent = submissionData.grounds_content || 'No grounds content available';
      }
    } else {
      this.logger.warn('No grounds template configured, using generated content directly');
      // Use the generated content directly instead of throwing error
      groundsContent = submissionData.grounds_content || 'No grounds content available';
    }

    // 3. Merge grounds content into structure template
    submissionData.grounds_content = groundsContent;
    const template = Handlebars.compile(structureTemplate);
    return template(submissionData);
  }

  /**
   * Create Google Doc from markdown content
   */
  private async createDocumentFromMarkdown(
    content: string,
    title: string
  ): Promise<{ documentId: string; editUrl: string; viewUrl: string; pdfUrl: string; pdfFileId: string }> {
    // Create a blank Google Doc and populate with content
    // Google Docs service will need to support plain text/markdown creation
    const placeholders = {
      applicant_name: '',
      applicant_email: '',
      site_address: '',
      application_number: '',
      submission_date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
      submission_body: content
    };
    return await this.googleDocs.createSubmissionDocument(
      '', // No template needed, creating from content
      placeholders,
      title
    );
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
    options: {
      templateId?: string;
      docType?: 'cover' | 'grounds';
      status?: DocumentStatus;
      reviewStartedAt?: string | null;
      reviewCompletedAt?: string | null;
      lastModifiedAt?: string;
    } = {}
  ): Promise<void> {
    const supabase = this.getClient();
    const nowIso = options.lastModifiedAt ?? new Date().toISOString();

    const payload: any = {
      submission_id: submissionId,
      google_doc_id: documentResult.documentId,
      google_doc_url: documentResult.editUrl,
      pdf_url: documentResult.pdfUrl,
      template_id: options.templateId ?? null,
      doc_type: options.docType ?? null,
      status: options.status ?? 'created',
      review_started_at: options.reviewStartedAt ?? null,
      review_completed_at: options.reviewCompletedAt ?? null,
      last_modified_at: nowIso,
    };

    const { error } = await supabase.from('documents').insert(payload);
    if (error) {
      throw new Error(`Failed to save document record: ${error.message}`);
    }
  }

  private buildCouncilEmailContent(submission: SubmissionData, project: ProjectData) {
    const template = project.council_email_body_template || DocumentWorkflowService.DEFAULT_COUNCIL_EMAIL_BODY;
    const applicantFullName = `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim();
    const applicationNumber = submission.application_number || project.default_application_number || '';
    const templateFn = Handlebars.compile(template, { noEscape: true });

    const variables = {
      council_name: project.council_name,
      site_address: submission.site_address,
      applicant_full_name: applicantFullName,
      applicant_email: submission.applicant_email,
      application_number: applicationNumber,
      application_number_line: applicationNumber ? `Application Number: ${applicationNumber}` : '',
      sender_name: project.from_name || 'DA Submission Manager',
    };

    const bodyText = templateFn(variables);
    return {
      bodyText,
      bodyHtml: `<p>${bodyText.replace(/\n/g, '<br />')}</p>`,
    };
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
   * Create PDF file buffer from markdown content using Puppeteer
   */
  private async createFileFromMarkdown(content: string, title: string): Promise<Buffer> {
    const pdfGenerator = new PdfGeneratorService();
    this.logger.info('Generating PDF from markdown', { title });
    return await pdfGenerator.generatePdfFromMarkdown(content, title);
  }

  async finalizeAndSubmit(
    submissionId: string,
    options: {
      notifyApplicant?: boolean;
    } = {}
  ): Promise<DocumentWorkflowResult> {
    const supabase = this.getClient();

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select(
        `*,
        projects!inner(*)`
      )
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      throw new Error(`Failed to fetch submission: ${submissionError?.message || 'Submission not found'}`);
    }

    const submissionData = submission as SubmissionData;
    const project = (submission as any).projects as ProjectData;

    if (!submissionData.google_doc_id) {
      throw new Error('Submission document not generated');
    }

    const emailContent = this.buildCouncilEmailContent(submissionData, project);

    const emailResult = await this.emailService.sendDirectSubmissionWithAttachments(
      submissionId,
      project.test_submission_email || project.council_email,
      project.from_email || process.env.DEFAULT_FROM_EMAIL!,
      project.from_name || process.env.DEFAULT_FROM_NAME || 'DA Submission Manager',
      this.processTemplate(project.council_subject_template || project.subject_template || 'Development Application Submission - {{site_address}}', {
        site_address: submissionData.site_address,
        application_number: submissionData.application_number || project.default_application_number || '',
        applicant_name: `${submissionData.applicant_first_name} ${submissionData.applicant_last_name}`.trim(),
      }),
      emailContent.bodyText,
      [],
      {
        name: `${submissionData.applicant_first_name} ${submissionData.applicant_last_name}`.trim(),
        email: submissionData.applicant_email,
        siteAddress: submissionData.site_address,
        postalAddress: submissionData.applicant_postal_address,
        applicationNumber: submissionData.application_number || project.default_application_number || undefined,
      }
    );

    const now = new Date().toISOString();

    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      // @ts-expect-error - Supabase type inference issue with partial updates
      .update({
        status: 'SUBMITTED',
        submitted_to_council_at: now,
        council_confirmation_id: emailResult?.messageId ?? null,
        updated_at: now,
      } as any)
      .eq('id', submissionId)
      .select('id, submitted_to_council_at')
      .single();

    if (updateError || !updatedSubmission) {
      throw new Error(`Failed to update submission: ${updateError?.message ?? 'unknown error'}`);
    }

    await supabase
      .from('documents')
      // @ts-expect-error - Supabase type inference issue with partial updates
      .update({
        status: 'submitted',
        review_completed_at: now,
        last_modified_at: now,
        updated_at: now,
      } as any)
      .eq('submission_id', submissionId);

    return {
      submissionId,
      emailSent: Boolean(emailResult?.messageId),
      status: 'SUBMITTED',
      reviewCompletedAt: now,
      reviewDeadline: submissionData.review_deadline || null,
      reviewStartedAt: submissionData.review_started_at || null,
    };
  }
}
