import { useState, useRef } from 'react';
import { Upload, Send, TestTube2, Mail, Users, CheckCircle2, XCircle, Loader2, Eye, X, Code, Monitor } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3500/api';

type Recipient = {
  name: string;
  email: string;
};

type TestEmail = {
  name: string;
  email: string;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  createdAt: string;
};

type CampaignProgress = {
  campaignId: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  status: string;
  percentComplete: number;
};

export default function BulkEmail() {
  // Step 1: CSV Upload
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Email Composition
  const [campaignName, setCampaignName] = useState('');
  const [fromEmail, setFromEmail] = useState('cvcommunitycare@reveille.net.au');
  const [fromName, setFromName] = useState('Currumbin Valley Community Care');
  const [replyTo, setReplyTo] = useState('cvcommunitycare@reveille.net.au');
  const [subject, setSubject] = useState('Act Now – Objections Close 10 October (COM/2025/271 - 940 Currumbin Creek Road');
  const [previewText, setPreviewText] = useState('The clock is ticking. Another application has been lodged for 940 Currumbin Creek Road');
  const [bodyHtml, setBodyHtml] = useState('');

  // Step 3: Test Send
  const [testEmails, setTestEmails] = useState<TestEmail[]>([{ name: '', email: '' }]);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  // Step 4: Campaign Creation & Sending
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress | null>(null);

  // UI State
  const [currentStep, setCurrentStep] = useState<'upload' | 'compose' | 'test' | 'review' | 'sending'>('upload');
  const [showPreview, setShowPreview] = useState(false);
  const [htmlEditorMode, setHtmlEditorMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [error, setError] = useState<string | null>(null);

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('auth_token');
  };

  // Handle CSV file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setError(null);
    }
  };

  // Parse CSV file
  const handleParseCsv = async () => {
    if (!csvFile) return;

    setIsParsingCsv(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);

      const response = await axios.post(`${API_URL}/bulk-email/parse-csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      setRecipients(response.data.recipients);
      setCurrentStep('compose');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse CSV file');
    } finally {
      setIsParsingCsv(false);
    }
  };

  // Create campaign
  const handleCreateCampaign = async () => {
    if (!csvFile || recipients.length === 0) return;

    setIsCreatingCampaign(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      formData.append('name', campaignName || `Campaign ${new Date().toLocaleDateString()}`);
      formData.append('fromEmail', fromEmail);
      formData.append('fromName', fromName);
      formData.append('replyTo', replyTo);
      formData.append('subject', subject);
      formData.append('bodyHtml', bodyHtml);
      formData.append('previewText', previewText);

      const response = await axios.post(`${API_URL}/bulk-email/campaigns`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      // Fetch the created campaign
      const campaignResponse = await axios.get(
        `${API_URL}/bulk-email/campaigns/${response.data.campaignId}`,
        {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        }
      );

      setCurrentCampaign(campaignResponse.data.campaign);
      setCurrentStep('review');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  // Send test emails
  const handleSendTest = async () => {
    if (!currentCampaign) {
      // Create campaign first if it doesn't exist
      await handleCreateCampaign();
      return;
    }

    const validTestEmails = testEmails.filter(t => t.email && t.email.includes('@'));
    if (validTestEmails.length === 0 || validTestEmails.length > 4) {
      setError('Please provide 1-4 valid email addresses for testing');
      return;
    }

    setIsSendingTest(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await axios.post(
        `${API_URL}/bulk-email/campaigns/${currentCampaign.id}/test`,
        { testEmails: validTestEmails },
        {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        }
      );

      setTestResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send test emails');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Send campaign
  const handleSendCampaign = async () => {
    if (!currentCampaign) return;

    setIsSendingCampaign(true);
    setError(null);

    try {
      await axios.post(
        `${API_URL}/bulk-email/campaigns/${currentCampaign.id}/send`,
        {},
        {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        }
      );

      setCurrentStep('sending');
      startProgressPolling(currentCampaign.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start campaign');
      setIsSendingCampaign(false);
    }
  };

  // Poll for campaign progress
  const startProgressPolling = (campaignId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(
          `${API_URL}/bulk-email/campaigns/${campaignId}/progress`,
          {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
          }
        );

        setCampaignProgress(response.data.progress);

        // Stop polling when complete
        if (response.data.progress.status === 'completed' || 
            response.data.progress.status === 'failed' ||
            response.data.progress.status === 'cancelled') {
          clearInterval(pollInterval);
          setIsSendingCampaign(false);
        }
      } catch (err) {
        console.error('Failed to fetch progress', err);
      }
    }, 3000); // Poll every 3 seconds
  };

  // Add test email field
  const addTestEmailField = () => {
    if (testEmails.length < 4) {
      setTestEmails([...testEmails, { name: '', email: '' }]);
    }
  };

  // Remove test email field
  const removeTestEmailField = (index: number) => {
    setTestEmails(testEmails.filter((_, i) => i !== index));
  };

  // Reset form
  const handleReset = () => {
    setCsvFile(null);
    setRecipients([]);
    setCurrentCampaign(null);
    setCampaignProgress(null);
    setTestResult(null);
    setCurrentStep('upload');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-7 h-7 text-blue-600" />
                Bulk Email Campaign
              </h1>
              <p className="text-gray-600 mt-1">Send personalized emails to multiple recipients</p>
            </div>
            {currentStep !== 'upload' && (
              <Button onClick={handleReset} variant="outline">
                Start New Campaign
              </Button>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <Step number={1} title="Upload CSV" active={currentStep === 'upload'} completed={recipients.length > 0} />
            <div className="flex-1 h-1 bg-gray-200 mx-4">
              <div className={`h-full transition-all ${recipients.length > 0 ? 'bg-blue-600' : ''}`} />
            </div>
            <Step number={2} title="Compose Email" active={currentStep === 'compose'} completed={currentStep !== 'upload' && currentStep !== 'compose'} />
            <div className="flex-1 h-1 bg-gray-200 mx-4">
              <div className={`h-full transition-all ${currentCampaign ? 'bg-blue-600' : ''}`} />
            </div>
            <Step number={3} title="Test & Review" active={currentStep === 'test' || currentStep === 'review'} completed={currentStep === 'sending'} />
            <div className="flex-1 h-1 bg-gray-200 mx-4">
              <div className={`h-full transition-all ${currentStep === 'sending' ? 'bg-blue-600' : ''}`} />
            </div>
            <Step number={4} title="Send" active={currentStep === 'sending'} completed={campaignProgress?.status === 'completed'} />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: CSV Upload */}
        {currentStep === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Recipient List (CSV)
            </h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  {csvFile ? (
                    <span className="font-semibold text-blue-600">{csvFile.name}</span>
                  ) : (
                    <>Click to upload or drag and drop</>
                  )}
                </p>
                <p className="text-xs text-gray-500">CSV file with "name" and "email" columns</p>
              </label>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 text-sm mb-2">CSV Format Requirements:</h3>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Required: <code className="bg-blue-100 px-1 rounded">first_name</code>, <code className="bg-blue-100 px-1 rounded">last_name</code>, <code className="bg-blue-100 px-1 rounded">email</code></li>
                <li>Optional: <code className="bg-blue-100 px-1 rounded">zip_code</code>, <code className="bg-blue-100 px-1 rounded">can2_phone</code></li>
                <li>Column names are case-insensitive</li>
                <li>Duplicate emails will be automatically removed</li>
                <li>Invalid email addresses will be skipped</li>
              </ul>
            </div>

            {csvFile && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleParseCsv}
                  disabled={isParsingCsv}
                  className="flex items-center gap-2"
                >
                  {isParsingCsv ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing CSV...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      Parse Recipients ({recipients.length || 0})
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Email Composition */}
        {currentStep === 'compose' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Compose Email
              </h2>
              <div className="bg-green-50 px-3 py-1 rounded-full text-sm font-medium text-green-700">
                {recipients.length} recipients loaded
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name (Internal)
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., High Trees Currumbin - October 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Email *
                  </label>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Name *
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reply-To Email
                </label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preview Text (appears in inbox preview)
                </label>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  maxLength={150}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">{previewText.length}/150 characters</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Email Body (HTML) *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHtmlEditorMode('edit')}
                      className={`px-3 py-1 text-xs rounded-md flex items-center gap-1 ${
                        htmlEditorMode === 'edit'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <Code className="w-3 h-3" />
                      Edit HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setHtmlEditorMode('preview')}
                      className={`px-3 py-1 text-xs rounded-md flex items-center gap-1 ${
                        htmlEditorMode === 'preview'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <Monitor className="w-3 h-3" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setHtmlEditorMode('split')}
                      className={`px-3 py-1 text-xs rounded-md flex items-center gap-1 ${
                        htmlEditorMode === 'split'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      Split View
                    </button>
                  </div>
                </div>

                <div className={`grid gap-4 ${htmlEditorMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {/* HTML Editor */}
                  {(htmlEditorMode === 'edit' || htmlEditorMode === 'split') && (
                    <div className="relative">
                      <textarea
                        value={bodyHtml}
                        onChange={(e) => setBodyHtml(e.target.value)}
                        rows={htmlEditorMode === 'split' ? 16 : 12}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="<p>Dear {{name}},</p>&#10;&#10;<p>Your email content here...</p>"
                        required
                        style={{ resize: 'vertical' }}
                      />
                      {htmlEditorMode === 'split' && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-gray-800 text-white text-xs rounded">
                          HTML Source
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preview Pane */}
                  {(htmlEditorMode === 'preview' || htmlEditorMode === 'split') && (
                    <div className="relative">
                      <div
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg bg-white overflow-auto ${
                          htmlEditorMode === 'split' ? 'min-h-[400px]' : 'min-h-[300px]'
                        }`}
                        style={{ maxHeight: htmlEditorMode === 'split' ? '500px' : '400px' }}
                      >
                        {bodyHtml ? (
                          <div
                            className="prose max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: bodyHtml.replace(/\{\{name\}\}/g, '<span class="bg-yellow-100 px-1 rounded">Sample Recipient</span>'),
                            }}
                          />
                        ) : (
                          <p className="text-gray-400 text-sm italic">
                            Email preview will appear here...
                          </p>
                        )}
                      </div>
                      {htmlEditorMode === 'split' && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-gray-800 text-white text-xs rounded">
                          Live Preview
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">
                    Use <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code> to personalize with recipient's name
                  </p>
                  <p className="text-xs text-gray-500">
                    Paste HTML directly from your email editor or write custom HTML
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="flex gap-3">
                <Button onClick={() => setShowPreview(true)} variant="outline" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview Full Email
                </Button>
                {bodyHtml && (
                  <div className="text-xs text-gray-500 self-center">
                    {bodyHtml.length} characters
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setCurrentStep('upload')} variant="outline">
                  Back
                </Button>
                <Button
                  onClick={handleCreateCampaign}
                  disabled={!fromEmail || !fromName || !subject || !bodyHtml || isCreatingCampaign}
                  className="flex items-center gap-2"
                >
                  {isCreatingCampaign ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Continue to Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Test & Review */}
        {(currentStep === 'test' || currentStep === 'review') && currentCampaign && (
          <div className="space-y-6">
            {/* Test Send Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TestTube2 className="w-5 h-5 text-purple-600" />
                Send Test Emails (1-4 addresses)
              </h2>

              <div className="space-y-3">
                {testEmails.map((testEmail, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="text"
                      value={testEmail.name}
                      onChange={(e) => {
                        const updated = [...testEmails];
                        updated[index].name = e.target.value;
                        setTestEmails(updated);
                      }}
                      placeholder="Name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <input
                      type="email"
                      value={testEmail.email}
                      onChange={(e) => {
                        const updated = [...testEmails];
                        updated[index].email = e.target.value;
                        setTestEmails(updated);
                      }}
                      placeholder="email@example.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {testEmails.length > 1 && (
                      <Button
                        onClick={() => removeTestEmailField(index)}
                        variant="outline"
                        size="sm"
                        className="px-3"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {testEmails.length < 4 && (
                <Button
                  onClick={addTestEmailField}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  + Add Another Test Email
                </Button>
              )}

              {testResult && (
                <div className={`mt-4 p-4 rounded-lg ${testResult.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.failed > 0 ? (
                      <XCircle className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    <h3 className="font-semibold">Test Results</h3>
                  </div>
                  <p className="text-sm">
                    ✅ Sent: {testResult.sent} | ❌ Failed: {testResult.failed}
                  </p>
                  {testResult.errors.length > 0 && (
                    <ul className="mt-2 text-sm space-y-1">
                      {testResult.errors.map((err, i) => (
                        <li key={i} className="text-red-600">• {err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleSendTest}
                  disabled={isSendingTest || testEmails.every(t => !t.email)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Test...
                    </>
                  ) : (
                    <>
                      <TestTube2 className="w-4 h-4" />
                      Send Test Emails
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Review & Send Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Review Campaign</h2>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Recipients:</span>
                  <span className="font-semibold">{currentCampaign.totalRecipients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium">{fromName} &lt;{fromEmail}&gt;</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subject:</span>
                  <span className="font-medium">{subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                    {currentCampaign.status}
                  </span>
                </div>
              </div>

              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 text-sm mb-2">⚠️ Important:</h3>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>This will send {currentCampaign.totalRecipients} emails immediately</li>
                  <li>Make sure you've sent and reviewed test emails</li>
                  <li>This action cannot be undone once started</li>
                </ul>
              </div>

              <div className="mt-6 flex justify-between">
                <Button onClick={() => setCurrentStep('compose')} variant="outline">
                  Back to Edit
                </Button>
                <Button
                  onClick={handleSendCampaign}
                  disabled={isSendingCampaign}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isSendingCampaign ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to All {currentCampaign.totalRecipients} Recipients
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Sending Progress */}
        {currentStep === 'sending' && campaignProgress && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              Campaign Sending
            </h2>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold">{campaignProgress.percentComplete}%</span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all duration-500"
                  style={{ width: `${campaignProgress.percentComplete}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{campaignProgress.totalRecipients}</div>
                <div className="text-sm text-blue-700 mt-1">Total</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{campaignProgress.sentCount}</div>
                <div className="text-sm text-green-700 mt-1">Sent</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{campaignProgress.pendingCount}</div>
                <div className="text-sm text-yellow-700 mt-1">Pending</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{campaignProgress.failedCount}</div>
                <div className="text-sm text-red-700 mt-1">Failed</div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              {campaignProgress.status === 'sending' && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-medium">Sending emails...</span>
                </div>
              )}
              {campaignProgress.status === 'completed' && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Campaign completed!</span>
                </div>
              )}
              {campaignProgress.status === 'failed' && (
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Campaign failed</span>
                </div>
              )}
            </div>

            {campaignProgress.status === 'completed' && (
              <div className="mt-6 flex justify-center">
                <Button onClick={handleReset} className="flex items-center gap-2">
                  Create New Campaign
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center">
                <h3 className="text-lg font-semibold">Email Preview</h3>
                <Button onClick={() => setShowPreview(false)} variant="outline" size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6">
                <div className="mb-4 pb-4 border-b">
                  <div className="text-sm text-gray-600 mb-1">From:</div>
                  <div className="font-medium">{fromName} &lt;{fromEmail}&gt;</div>
                </div>
                <div className="mb-4 pb-4 border-b">
                  <div className="text-sm text-gray-600 mb-1">Subject:</div>
                  <div className="font-medium">{subject}</div>
                </div>
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml.replace(/\{\{name\}\}/g, 'Sample Recipient') }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Step indicator component
function Step({ number, title, active, completed }: { number: number; title: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all
        ${completed ? 'bg-green-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
        {completed ? <CheckCircle2 className="w-5 h-5" /> : number}
      </div>
      <div className={`mt-2 text-xs font-medium ${active || completed ? 'text-gray-900' : 'text-gray-500'}`}>
        {title}
      </div>
    </div>
  );
}

