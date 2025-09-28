// Types for document review and submission status
export type DocumentStatus = 'created' | 'user_editing' | 'finalized' | 'submitted' | 'approved';

export type DocumentReviewStatus =
  | 'not_started'
  | 'in_progress'
  | 'changes_requested'
  | 'ready_for_submission'
  | 'submitted';

export type SubmissionPathway = 'direct' | 'review' | 'draft';

export type SubmissionStatusSummary = {
  submissionId: string;
  status: string;
  pathway: SubmissionPathway;
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

export type FinalizationResult = {
  success: boolean;
  submissionId: string;
  councilSubmissionId?: string;
  message: string;
  timestamp: string;
};

export type ValidationResult = {
  isValid: boolean;
  issues: string[];
};

export type ReviewDocumentState = {
  submission: SubmissionStatusSummary | null;
  documents: DocumentStatusSummary[];
  status: 'loading' | 'ready' | 'submitting' | 'completed' | 'error';
  error: string | null;
  previewOpen: boolean;
  submissionComplete: boolean;
  validationResult: ValidationResult | null;
};
