import { SuccessIcon } from '@da/ui/icons';

export default function ThankYou() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <SuccessIcon className="mx-auto h-16 w-16 text-green-500 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Great Work!
        </h1>
        <p className="text-gray-600 mb-6">
          Congratulations on standing up for your community, your submission has been lodged with GCCC.
        </p>
        
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
