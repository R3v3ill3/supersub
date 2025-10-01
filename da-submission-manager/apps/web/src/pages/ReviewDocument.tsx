import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DocumentIcon,
  AlertIcon,
  SuccessIcon,
  ViewIcon,
  EditIcon,
  RefreshIcon,
} from '@da/ui/icons';
import { api } from '../lib/api';
import type { 
  DocumentReviewSummary, 
  ReviewDocumentState, 
  ValidationResult,
  FinalizationResult
} from '../types/documents';
import SubmissionStatusTracker from '../components/SubmissionStatusTracker';
import SubmissionPreviewModal from '../components/SubmissionPreviewModal';

export default function ReviewDocument() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [state, setState] = useState<ReviewDocumentState>({
    submission: null,
    documents: [],
    status: 'loading',
    error: null,
    previewOpen: false,
    submissionComplete: false,
    validationResult: null,
  });

  // Fetch submission status
  const { 
    data: reviewSummary, 
    error: fetchError, 
    isLoading,
    refetch
  } = useQuery<DocumentReviewSummary>({
    queryKey: ['document-status', submissionId],
    queryFn: () => api.documents.getStatus(submissionId!).then(res => res.data),
    enabled: !!submissionId,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (data: {
      status: 'created' | 'user_editing' | 'finalized' | 'submitted' | 'approved';
      reviewStatus?: 'not_started' | 'in_progress' | 'changes_requested' | 'ready_for_submission' | 'submitted';
      reviewStartedAt?: string;
      reviewCompletedAt?: string;
      lastModifiedAt?: string;
    }) => api.documents.updateStatus(submissionId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-status', submissionId] });
    },
  });

  // Finalize submission mutation
  const finalizeMutation = useMutation<FinalizationResult, Error, {confirm: true; notifyApplicant?: boolean}>({
    mutationFn: (data) => api.documents.finalize(submissionId!, data).then(res => res.data),
    onSuccess: (result) => {
      setState(prev => ({ 
        ...prev, 
        status: 'completed', 
        submissionComplete: true 
      }));
      queryClient.invalidateQueries({ queryKey: ['document-status', submissionId] });
      // Show success message or redirect
      setTimeout(() => {
        navigate('/thank-you', { 
          state: { 
            submissionComplete: true, 
            councilSubmissionId: result.councilSubmissionId 
          }
        });
      }, 2000);
    },
    onError: (error) => {
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error.message 
      }));
    },
  });

  // Validation check
  const validateSubmission = async (): Promise<ValidationResult> => {
    // This would ideally call a separate validation endpoint
    // For now, we'll do basic client-side validation
    const issues: string[] = [];
    
    if (!reviewSummary?.documents?.length) {
      issues.push('No documents available for submission');
    }
    
    const hasReadyDocument = reviewSummary?.documents?.some(doc => 
      doc.status === 'finalized' || doc.status === 'user_editing'
    );
    
    if (!hasReadyDocument) {
      issues.push('Documents are not ready for submission');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  };

  // Update state when data changes
  useEffect(() => {
    if (reviewSummary) {
      setState(prev => ({
        ...prev,
        submission: reviewSummary.submission,
        documents: reviewSummary.documents,
        status: 'ready',
        error: null,
      }));
    }
    
    if (fetchError) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: fetchError.message,
      }));
    }
  }, [reviewSummary, fetchError]);

  // Mark review as started when component mounts
  useEffect(() => {
    if (reviewSummary && !reviewSummary.submission.reviewStartedAt) {
      updateStatusMutation.mutate({
        status: 'user_editing',
        reviewStatus: 'in_progress',
        reviewStartedAt: new Date().toISOString(),
      });
    }
  }, [reviewSummary]);

  const handleOpenDocument = (documentUrl: string) => {
    // Mark as editing when user opens document
    updateStatusMutation.mutate({
      status: 'user_editing',
      reviewStatus: 'in_progress',
      lastModifiedAt: new Date().toISOString(),
    });
    
    // Open in new tab
    window.open(documentUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenPreview = async () => {
    const validation = await validateSubmission();
    setState(prev => ({ 
      ...prev, 
      validationResult: validation, 
      previewOpen: true 
    }));
  };

  const handleConfirmSubmission = async () => {
    setState(prev => ({ ...prev, status: 'submitting' }));
    
    // Update to finalized status first
    await updateStatusMutation.mutateAsync({
      status: 'finalized',
      reviewStatus: 'ready_for_submission',
      reviewCompletedAt: new Date().toISOString(),
    });
    
    // Then finalize and submit
    finalizeMutation.mutate({
      confirm: true,
      notifyApplicant: true,
    });
  };

  const handleRetry = () => {
    setState(prev => ({ ...prev, error: null, status: 'loading' }));
    refetch();
  };

  if (!submissionId) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <div className="flex items-center">
            <AlertIcon className="h-6 w-6 text-red-500 mr-2" />
            <h2 className="text-lg font-medium text-red-900">Invalid Submission ID</h2>
          </div>
          <p className="mt-2 text-red-700">
            No submission ID provided. Please check your link and try again.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === 'loading' || isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <RefreshIcon className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
            <h2 className="text-xl font-medium text-gray-900">Loading your submission...</h2>
            <p className="mt-2 text-gray-600">Please wait while we fetch your document details.</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <div className="flex items-center mb-4">
            <AlertIcon className="h-6 w-6 text-red-500 mr-2" />
            <h2 className="text-lg font-medium text-red-900">Error Loading Submission</h2>
          </div>
          <p className="text-red-700 mb-4">
            {state.error || 'Unable to load submission details. Please try again.'}
          </p>
          <button
            onClick={handleRetry}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (state.submissionComplete) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <SuccessIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold text-green-900 mb-4">
            Submission Complete!
          </h1>
          <p className="text-green-700 mb-6">
            Your submission has been successfully sent to the council. 
            You will receive a confirmation email shortly.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/thank-you')}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md"
            >
              View Confirmation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <DocumentIcon className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Review Your Submission
                  </h1>
                  <p className="text-gray-600">
                    Submission ID: {submissionId}
                  </p>
                </div>
              </div>
              {reviewSummary?.submission.reviewDeadline && (
                <p className="text-sm text-orange-600">
                  Review deadline: {new Date(reviewSummary.submission.reviewDeadline).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Documents Section */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Documents</h2>
              
              {state.documents.length > 0 ? (
                <div className="space-y-4">
                  {state.documents.map((doc, index) => (
                    <div key={doc.documentId || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DocumentIcon className="h-6 w-6 text-blue-500 mr-3" />
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {doc.docType === 'cover' ? 'Cover Letter' : 
                               doc.docType === 'grounds' ? 'Grounds Document' : 
                               'Submission Document'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Status: <span className="capitalize">{doc.status.replace('_', ' ')}</span>
                              {doc.lastModifiedAt && (
                                <span className="ml-2">
                                  • Last modified: {new Date(doc.lastModifiedAt).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {doc.googleDocUrl && (
                            <button
                              onClick={() => handleOpenDocument(doc.googleDocUrl!)}
                              className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50"
                            >
                            <EditIcon className="h-4 w-4 mr-1" />
                              Edit Document
                            </button>
                          )}
                          {doc.pdfUrl && (
                            <a
                              href={doc.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-md hover:bg-gray-50"
                            >
                              <ViewIcon className="h-4 w-4 mr-1" />
                              View PDF
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Embedded Google Doc */}
                      {doc.googleDocUrl && doc.status === 'user_editing' && (
                        <div className="mt-4 border-t pt-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-3">
                              Document embedded below. You can edit directly or open in a new tab.
                            </p>
                            <div className="w-full h-96 bg-white border border-gray-300 rounded">
                              <iframe
                                src={`${doc.googleDocUrl}?embedded=true`}
                                className="w-full h-full rounded"
                                title={`Document: ${doc.docType}`}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DocumentIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No documents available yet.</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleOpenPreview}
                  disabled={state.documents.length === 0 || state.status === 'submitting'}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-md transition-colors"
                >
                  {state.status === 'submitting' ? (
                    <>
                      <RefreshIcon className="inline h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Review & Send to Council'
                  )}
                </button>
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <SubmissionStatusTracker 
            reviewSummary={reviewSummary || null} 
            currentStep={state.submissionComplete ? 'completed' : 'review'}
          />
        </div>
      </div>

      {/* Preview Modal */}
      <SubmissionPreviewModal
        isOpen={state.previewOpen}
        onClose={() => setState(prev => ({ ...prev, previewOpen: false }))}
        onConfirm={handleConfirmSubmission}
        reviewSummary={reviewSummary || null}
        validationResult={state.validationResult}
        isSubmitting={state.status === 'submitting'}
      />
    </div>
  );
}
