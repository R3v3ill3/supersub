import React from 'react';
import {
  SuccessIcon,
  PendingIcon,
  AlertIcon,
  SuccessIconSolid,
} from '@da/ui/icons';
import type { DocumentReviewSummary } from '../types/documents';

interface SubmissionStatusTrackerProps {
  reviewSummary: DocumentReviewSummary | null;
  currentStep?: 'generation' | 'review' | 'submission' | 'council' | 'completed';
}

interface Step {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  icon: React.ReactNode;
}

export default function SubmissionStatusTracker({ 
  reviewSummary, 
  currentStep = 'review' 
}: SubmissionStatusTrackerProps) {
  const getSteps = (): Step[] => {
    const hasValidDocuments = reviewSummary?.documents.some(doc => doc.googleDocUrl);
    const isDocumentReady = reviewSummary?.documents.some(doc => doc.status === 'finalized');
    const isSubmitted = reviewSummary?.submission.submittedAt;

    const steps: Step[] = [
      {
        id: 'generation',
        title: 'Document Generation',
        description: 'AI-generated submission created',
        status: hasValidDocuments ? 'completed' : 'pending',
        icon: hasValidDocuments ? (
          <SuccessIconSolid className="w-5 h-5 text-green-500" />
        ) : (
          <PendingIcon className="w-5 h-5 text-gray-400" />
        ),
      },
      {
        id: 'review',
        title: 'Document Review',
        description: 'Review and edit your submission',
        status: currentStep === 'review' ? 'current' : 
               isDocumentReady ? 'completed' : 'pending',
        icon: isDocumentReady ? (
          <SuccessIconSolid className="w-5 h-5 text-green-500" />
        ) : currentStep === 'review' ? (
          <PendingIcon className="w-5 h-5 text-blue-500" />
        ) : (
          <PendingIcon className="w-5 h-5 text-gray-400" />
        ),
      },
      {
        id: 'submission',
        title: 'Final Submission',
        description: 'Approve and send to council',
        status: currentStep === 'submission' ? 'current' :
               isSubmitted ? 'completed' : 'pending',
        icon: isSubmitted ? (
          <SuccessIconSolid className="w-5 h-5 text-green-500" />
        ) : currentStep === 'submission' ? (
          <PendingIcon className="w-5 h-5 text-blue-500" />
        ) : (
          <PendingIcon className="w-5 h-5 text-gray-400" />
        ),
      },
      {
        id: 'council',
        title: 'Council Delivery',
        description: 'Submission sent to council',
        status: isSubmitted ? 'completed' : 'pending',
        icon: isSubmitted ? (
          <SuccessIconSolid className="w-5 h-5 text-green-500" />
        ) : (
          <ClockIcon className="w-5 h-5 text-gray-400" />
        ),
      },
      {
        id: 'completed',
        title: 'Completed',
        description: 'Process finished successfully',
        status: isSubmitted && currentStep === 'completed' ? 'completed' : 'pending',
        icon: isSubmitted && currentStep === 'completed' ? (
          <CheckCircleIconSolid className="w-5 h-5 text-green-500" />
        ) : (
          <SuccessIcon className="w-5 h-5 text-gray-400" />
        ),
      },
    ];

    return steps;
  };

  const steps = getSteps();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Submission Progress</h3>
      
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start">
            {/* Icon */}
            <div className={`flex-shrink-0 p-1 rounded-full ${
              step.status === 'completed' ? 'bg-green-100' :
              step.status === 'current' ? 'bg-blue-100' :
              step.status === 'error' ? 'bg-red-100' :
              'bg-gray-100'
            }`}>
              {step.status === 'error' ? (
                <AlertIcon className="w-5 h-5 text-red-500" />
              ) : (
                step.icon
              )}
            </div>

            {/* Content */}
            <div className="ml-3 flex-1 min-w-0">
              <div className="flex items-center">
                <h4 className={`text-sm font-medium ${
                  step.status === 'completed' ? 'text-green-900' :
                  step.status === 'current' ? 'text-blue-900' :
                  step.status === 'error' ? 'text-red-900' :
                  'text-gray-500'
                }`}>
                  {step.title}
                </h4>
                {step.status === 'current' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Current Step
                  </span>
                )}
                {step.status === 'completed' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Completed
                  </span>
                )}
              </div>
              <p className={`mt-1 text-sm ${
                step.status === 'completed' ? 'text-green-700' :
                step.status === 'current' ? 'text-blue-700' :
                step.status === 'error' ? 'text-red-700' :
                'text-gray-500'
              }`}>
                {step.description}
              </p>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className={`absolute left-6 mt-8 w-0.5 h-6 ${
                steps[index + 1].status === 'completed' || steps[index + 1].status === 'current'
                  ? 'bg-blue-200'
                  : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Additional info */}
      {reviewSummary?.submission && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {reviewSummary.submission.reviewStartedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Review Started</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(reviewSummary.submission.reviewStartedAt).toLocaleString()}
                </dd>
              </div>
            )}
            {reviewSummary.submission.reviewDeadline && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Review Deadline</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(reviewSummary.submission.reviewDeadline).toLocaleDateString()}
                </dd>
              </div>
            )}
            {reviewSummary.submission.submittedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Submitted to Council</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(reviewSummary.submission.submittedAt).toLocaleString()}
                </dd>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
