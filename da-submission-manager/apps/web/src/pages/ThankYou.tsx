import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function ThankYou() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Submission Complete!
        </h1>
        <p className="text-gray-600 mb-6">
          Your development application submission has been processed successfully. 
          Depending on your selected pathway, you may receive an email with next steps.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            <strong>What happens next?</strong>
            <br />
            • If you chose "Direct": Your submission has been sent to council
            <br />
            • If you chose "Review": Check your email for the document review link  
            <br />
            • If you chose "Draft": Check your email for background information and your draft
          </p>
        </div>
        
        <div className="mt-6">
          <a
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md"
          >
            Submit Another
          </a>
        </div>
      </div>
    </div>
  );
}
