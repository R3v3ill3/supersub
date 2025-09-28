import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  XMarkIcon, 
  DocumentTextIcon, 
  EnvelopeIcon, 
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { DocumentReviewSummary, ValidationResult } from '../types/documents';

interface SubmissionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reviewSummary: DocumentReviewSummary | null;
  validationResult: ValidationResult | null;
  isSubmitting?: boolean;
}

export default function SubmissionPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  reviewSummary,
  validationResult,
  isSubmitting = false
}: SubmissionPreviewModalProps) {
  const hasValidationIssues = validationResult && !validationResult.isValid;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                        <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                          Final Submission Review
                        </Dialog.Title>
                        <p className="text-sm text-gray-500">
                          Please review before sending to council
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                      onClick={onClose}
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Validation Issues */}
                  {hasValidationIssues && (
                    <div className="mb-6 rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Issues Found
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            <ul className="list-disc pl-5 space-y-1">
                              {validationResult!.issues.map((issue, index) => (
                                <li key={index}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submission Details */}
                  {reviewSummary && (
                    <div className="space-y-6">
                      {/* Submission Info */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Submission Details</h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          <div className="flex items-center text-sm">
                            <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-600">Submission ID:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {reviewSummary.submission.submissionId}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-600">Pathway:</span>
                            <span className="ml-2 font-medium text-gray-900 capitalize">
                              {reviewSummary.submission.pathway}
                            </span>
                          </div>
                          {reviewSummary.submission.reviewDeadline && (
                            <div className="flex items-center text-sm">
                              <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">Review Deadline:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {new Date(reviewSummary.submission.reviewDeadline).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Documents */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Documents to Submit</h4>
                        <div className="space-y-3">
                          {reviewSummary.documents.map((doc, index) => (
                            <div key={doc.documentId || index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                              <div className="flex items-center">
                                <DocumentTextIcon className="h-5 w-5 text-blue-500 mr-3" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {doc.docType === 'cover' ? 'Cover Letter' : 
                                     doc.docType === 'grounds' ? 'Grounds Document' : 
                                     'Submission Document'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Status: {doc.status}
                                    {doc.lastModifiedAt && (
                                      <span className="ml-2">
                                        • Modified: {new Date(doc.lastModifiedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                {doc.googleDocUrl && (
                                  <a
                                    href={doc.googleDocUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    View Doc
                                  </a>
                                )}
                                {doc.pdfUrl && (
                                  <a
                                    href={doc.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    View PDF
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Warning */}
                      <div className="rounded-md bg-yellow-50 p-4">
                        <div className="flex">
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              Final Confirmation
                            </h3>
                            <p className="mt-2 text-sm text-yellow-700">
                              Once you confirm, your submission will be sent to the council and cannot be modified. 
                              Please ensure you have reviewed all documents carefully.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    disabled={hasValidationIssues || isSubmitting}
                    className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${
                      hasValidationIssues || isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-500'
                    }`}
                    onClick={onConfirm}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Confirm & Send to Council'
                    )}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
