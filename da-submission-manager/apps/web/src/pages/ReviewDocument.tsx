import { useParams } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export default function ReviewDocument() {
  const { submissionId } = useParams<{ submissionId: string }>();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <DocumentTextIcon className="mx-auto h-16 w-16 text-blue-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Review Your Submission
          </h1>
          <p className="text-gray-600">
            Submission ID: {submissionId}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-6 mb-8">
          <h2 className="text-lg font-medium text-blue-900 mb-2">
            Document Review Process
          </h2>
          <p className="text-blue-800">
            This page will allow users to review their generated Google Doc, make edits, 
            and confirm submission to council. Features include:
          </p>
          <ul className="list-disc list-inside text-blue-800 mt-2 space-y-1">
            <li>Embedded Google Doc viewer/editor</li>
            <li>Submission preview and confirmation</li>
            <li>Final submission to council with PDF attachment</li>
            <li>Status tracking and confirmation receipt</li>
          </ul>
        </div>

        <div className="text-center">
          <div className="space-x-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md">
              Open Document to Edit
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md">
              Approve & Send to Council
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
