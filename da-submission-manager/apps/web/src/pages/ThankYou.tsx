import { useLocation } from 'react-router-dom';
import { SuccessIcon } from '@da/ui/icons';

export default function ThankYou() {
  const location = useLocation();

  const state = location.state as {
    submissionId?: string;
    applicantEmail?: string;
    applicantName?: string;
    siteAddress?: string;
  } | null;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <SuccessIcon className="mx-auto h-16 w-16 text-green-500 mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Great Work!
          </h1>
          <p className="text-gray-600 mb-6">
            Congratulations on standing up for your community, your submission has been lodged with GCCC.
          </p>

          {state?.applicantEmail && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                A copy of your submission has been sent to <strong>{state.applicantEmail}</strong> and the PDF has been downloaded to your device.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
