import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SuccessIcon } from '@da/ui/icons';
import { api } from '../lib/api';

export default function ThankYou() {
  const location = useLocation();
  const [downloading, setDownloading] = useState<string | null>(null);

  const state = location.state as {
    submissionId?: string;
    applicantEmail?: string;
    applicantName?: string;
    siteAddress?: string;
  } | null;

  const handleDownload = async () => {
    if (!state?.submissionId) return;

    try {
      setDownloading('grounds');
      const response = await api.submissions.downloadPdf(state.submissionId, 'grounds');
      
      // response.data is already a Blob when using responseType: 'blob'
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'DA_Submission.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
      alert('Failed to download file: ' + (error?.response?.data?.error || error.message));
    } finally {
      setDownloading(null);
    }
  };

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
                A copy of the submission has been sent to <strong>{state.applicantEmail}</strong>
              </p>
            </div>
          )}

          {state?.submissionId && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Download a copy of your submission:</p>
              
              <div className="flex justify-center">
                <button
                  onClick={handleDownload}
                  disabled={!!downloading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-8 rounded-md transition-colors"
                >
                  {downloading ? 'Downloading...' : 'Download Your Submission PDF'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center border-t pt-6">
          <a
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md inline-block"
          >
            Submit Another
          </a>
        </div>
      </div>
    </div>
  );
}
