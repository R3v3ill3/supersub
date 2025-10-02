import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { SuccessIcon, BoltIcon } from '@da/ui/icons';
import { api } from '../lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GoogleAddressAutocomplete from '../components/GoogleAddressAutocomplete';

type SubmissionTrack = 'followup' | 'comprehensive';

interface FormData {
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_email: string;
  // Residential address (required)
  applicant_residential_address: string;
  applicant_suburb: string;
  applicant_state: string;
  applicant_postcode: string;
  // Postal address (can be same as residential)
  postal_address_same: boolean;
  applicant_postal_address: string;
  postal_suburb: string;
  postal_state: string;
  postal_postcode: string;
  postal_email: string;
  // Property details
  lot_number: string;
  plan_number: string;
  site_address: string;
  application_number: string;
  submission_pathway: 'direct' | 'review' | 'draft';
  submission_track: SubmissionTrack;
  is_returning_submitter: boolean;
}

interface ProjectResponse {
  project: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    test_submission_email?: string | null;
    default_application_number: string;
    default_pathway: 'direct' | 'review' | 'draft';
    is_dual_track?: boolean;
    dual_track_config?: {
      track_selection_prompt?: string;
      track_descriptions?: {
        followup: string;
        comprehensive: string;
      };
      default_track?: SubmissionTrack;
    } | null;
    action_network_config?: {
      form_url?: string;
      action_url?: string;
    } | null;
  };
}

interface ActionNetworkSyncResult {
  status: 'skipped' | 'synced' | 'failed';
  personHref?: string | null;
  submissionHref?: string | null;
  error?: string;
}

interface SurveyData {
  selected_keys: string[];
  user_style_sample: string;
  ordered_keys: string[];
  custom_grounds: string;
  submission_track: SubmissionTrack;
}


/**
 * Adds proper paragraph breaks to markdown text for better readability
 * - Ensures double newlines after sentence endings
 * - Preserves existing formatting
 * - Adds breaks before numbered sections and headings
 */
function addParagraphBreaks(text: string): string {
  if (!text) return text;
  
  let processed = text;
  
  // First, normalize all existing line breaks to single newlines
  processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Add double newlines after sentences (period/exclamation/question mark followed by space and capital letter)
  processed = processed.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');

  // Ensure numbered sections (e.g., 1. Heading) start on a new paragraph when following a sentence
  processed = processed.replace(/([.!?])\s+(\d+\.\s+[A-Z])/g, '$1\n\n$2');
  
  // Ensure double newlines before numbered sections (1., 2., etc.) - both at start and after newline
  processed = processed.replace(/(^|\n)(\d+\.\s+[A-Z])/gm, '$1\n$2');

  // Format numbered section headings: keep them bold and separated from body text
  processed = processed.replace(
    /(^|\n)(\d+\.\s+(?:[A-Z][A-Za-z\-/]+(?:\s+[A-Z][A-Za-z\-/]+)*))(?:\s+)(?=[A-Z][a-z])/g,
    (_match, prefix, heading) => {
      const trimmed = heading.trim();
      const isAlreadyBold = trimmed.startsWith('**') && trimmed.endsWith('**');
      const boldHeading = isAlreadyBold ? trimmed : `**${trimmed}**`;
      return `${prefix}${boldHeading}\n\n`;
    }
  );
  
  // Ensure double newlines before headings (###, ##, #)
  processed = processed.replace(/(^|\n)(#{1,6}\s)/gm, '$1\n$2');
  
  // Ensure double newlines before bullet points (-, *, •)
  processed = processed.replace(/(^|\n)([•\-\*]\s)/gm, '$1\n$2');
  
  // Add breaks after bold sections followed by new sentences
  processed = processed.replace(/(\*\*[^*]+[.!?]\*\*)\s+([A-Z])/g, '$1\n\n$2');
  
  // Add breaks before subsections (1.1, 2.3, etc.)
  processed = processed.replace(/(^|\n)(\d+\.\d+\s)/gm, '$1\n$2');
  
  // Ensure spacing around planning code references (common pattern: "Section X.X" or "Code X.X")
  processed = processed.replace(/\.\s+(Section|Code|Part|Clause)\s+/g, '.\n\n$1 ');
  
  // Clean up any triple+ newlines to exactly double newlines
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // Clean up any leading/trailing whitespace
  processed = processed.trim();
  
  // Final pass: ensure there's always a blank line between paragraphs of 3+ sentences
  // Split by double newlines, process each block
  const blocks = processed.split('\n\n');
  const processedBlocks = blocks.map(block => {
    // If block has multiple sentences without breaks, add some
    const sentences = block.split(/([.!?]\s+)/);
    if (sentences.length > 6) {
      // Rejoin with occasional paragraph breaks
      let result = '';
      for (let i = 0; i < sentences.length; i += 2) {
        result += sentences[i] + (sentences[i + 1] || '');
        // Add paragraph break every 3-4 sentences
        if (i > 0 && i % 6 === 0 && i < sentences.length - 2) {
          result += '\n\n';
        }
      }
      return result;
    }
    return block;
  });
  
  return processedBlocks.join('\n\n');
}

export default function SubmissionForm() {
  const { projectSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    applicant_first_name: '',
    applicant_last_name: '',
    applicant_email: '',
    // Residential address (required)
    applicant_residential_address: '',
    applicant_suburb: '',
    applicant_state: 'QLD',
    applicant_postcode: '',
    // Postal address (can be same as residential)
    postal_address_same: true,
    applicant_postal_address: '',
    postal_suburb: '',
    postal_state: 'QLD',
    postal_postcode: '',
    postal_email: '',
    // Property details
    lot_number: '1',
    plan_number: 'RP1 42226',
    site_address: '',
    application_number: '',
    submission_pathway: 'review',
    submission_track: 'comprehensive',
    is_returning_submitter: false,
  });
  const [surveyData, setSurveyData] = useState<SurveyData>({
    selected_keys: [],
    user_style_sample: '',
    ordered_keys: [],
    custom_grounds: '',
    submission_track: 'comprehensive',
  });
  const [submissionId, setSubmissionId] = useState<string>('');
  const [actionNetworkResult, setActionNetworkResult] = useState<ActionNetworkSyncResult | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [generatedText, setGeneratedText] = useState<string>('');
  const [originalGeneratedText, setOriginalGeneratedText] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [originalEmailBody, setOriginalEmailBody] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isEmailEditMode, setIsEmailEditMode] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showEmailResetConfirm, setShowEmailResetConfirm] = useState<boolean>(false);

  const {
    data: projectResponse,
    isLoading: loadingProject,
    isError: projectError,
    error: projectErrorValue,
  } = useQuery<ProjectResponse | null>({
    queryKey: ['project', projectSlug],
    enabled: Boolean(projectSlug),
    queryFn: async () => {
      if (!projectSlug) return null;
      try {
        const response = await api.projects.get(projectSlug);
        return response.data as ProjectResponse;
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });

  const project = projectResponse?.project;
  const projectInactive = projectResponse && !project?.is_active;

  useEffect(() => {
    if (!projectSlug) return;

    const defaults: Partial<FormData> = {};

    if (project?.default_application_number) {
      defaults.application_number = project.default_application_number;
    }

    if (project?.default_pathway) {
      defaults.submission_pathway = project.default_pathway;
    }

    // Load default site address from project config
    const defaultSiteAddress = (project?.action_network_config as any)?.default_site_address;
    if (defaultSiteAddress) {
      defaults.site_address = defaultSiteAddress;
    }

    const queryDefaults: Partial<FormData> = {};
    const firstName = searchParams.get('first_name') || searchParams.get('fname');
    const lastName = searchParams.get('last_name') || searchParams.get('lname');
    const email = searchParams.get('email');
    const siteAddress = searchParams.get('site_address');
    const applicationNumber = searchParams.get('application_number');

    if (firstName) queryDefaults.applicant_first_name = firstName;
    if (lastName) queryDefaults.applicant_last_name = lastName;
    if (email) queryDefaults.applicant_email = email;
    if (siteAddress) queryDefaults.site_address = siteAddress;
    if (applicationNumber) queryDefaults.application_number = applicationNumber;

    setFormData((prev) => ({
      ...prev,
      ...defaults,
      ...queryDefaults,
    }));
    setActionNetworkResult(null);
  }, [projectSlug, project?.default_application_number, project?.default_pathway, project?.action_network_config, searchParams]);

  // Load survey templates
  const { data: surveyTemplates, isLoading: loadingSurvey } = useQuery({
    queryKey: ['survey-templates', surveyData.submission_track, project?.id],
    queryFn: async () => {
      const response = await api.survey.getTemplates({
        track: surveyData.submission_track,
        project_id: project?.id
      });
      return response.data;
    },
    enabled: !!project?.id, // Don't query until we have project
  });

  // Create submission mutation
  const createSubmissionMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!projectSlug) throw new Error('Missing project slug');
      if (projectInactive) throw new Error('Project is not accepting submissions');
      const response = await api.submissions.create({
        project_identifier: projectSlug,
        applicant_first_name: data.applicant_first_name,
        applicant_last_name: data.applicant_last_name,
        applicant_email: data.applicant_email,
        // Residential address fields
        applicant_residential_address: data.applicant_residential_address,
        applicant_suburb: data.applicant_suburb,
        applicant_state: data.applicant_state,
        applicant_postcode: data.applicant_postcode,
        // Postal address fields (use residential if same)
        applicant_postal_address: data.postal_address_same ? data.applicant_residential_address : data.applicant_postal_address,
        applicant_postal_city: data.postal_address_same ? data.applicant_suburb : data.postal_suburb,
        applicant_postal_region: data.postal_address_same ? data.applicant_state : data.postal_state,
        applicant_postal_postcode: data.postal_address_same ? data.applicant_postcode : data.postal_postcode,
        postal_email: data.postal_address_same ? data.applicant_email : data.postal_email,
        // Property details
        lot_number: data.lot_number,
        plan_number: data.plan_number,
        site_address: data.site_address,
        application_number: data.application_number,
        submission_pathway: 'direct', // Direct pathway - generates PDFs with Puppeteer, sends to council
        submission_track: data.submission_track,
        is_returning_submitter: data.is_returning_submitter,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setSubmissionId(data.submissionId);
      setActionNetworkResult(data.actionNetwork ?? null);
      setStep(2);
    },
  });

  // Save survey mutation
  const saveSurveyMutation = useMutation({
    mutationFn: async (data: SurveyData) => {
      const response = await api.survey.saveResponse(submissionId, {
        version: 'v1',
        selected_keys: data.selected_keys,
        user_style_sample: data.user_style_sample,
        submission_track: data.submission_track,
        ordered_keys: data.ordered_keys,
        custom_grounds: data.custom_grounds,
      });
      return response.data;
    },
    onSuccess: () => {
      // Move to loading step before generation
      setStep(3);
      // Auto-trigger generation after survey is saved
      generateMutation.mutate();
    },
  });

  // Generate submission mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.generation.generate(submissionId);
      return response.data;
    },
    onSuccess: (data) => {
      const preview = data.preview || '';
      setGeneratedText(preview);
      setOriginalGeneratedText(preview); // Save original for reset functionality
      setStep(4);
    },
  });

  // Preview email body mutation
  const previewEmailBodyMutation = useMutation({
    mutationFn: async () => {
      const response = await api.submissions.previewEmailBody(submissionId, { finalText: generatedText });
      return response.data;
    },
    onSuccess: (data) => {
      setEmailBody(data.emailBody || '');
      setOriginalEmailBody(data.emailBody || '');
      setEmailSubject(data.subject || '');
      setStep(5);
    },
  });

  // Submit final submission mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await api.submissions.submit(submissionId, { 
        finalText: generatedText,
        emailBody: emailBody 
      });
      return response.data;
    },
    onSuccess: () => {
      navigate('/thank-you', { 
        state: { 
          submissionId,
          applicantEmail: formData.applicant_email,
          applicantName: `${formData.applicant_first_name} ${formData.applicant_last_name}`,
          siteAddress: formData.site_address
        } 
      });
    },
    onError: (error: any) => {
      console.error('Submission error:', error);
      console.error('Error details:', error?.response?.data);
      alert('Submission failed: ' + (error?.response?.data?.error || error.message));
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSubmissionMutation.mutate(formData);
  };

  const handleSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSurveyMutation.mutate(surveyData);
  };

  const handleFastTrack = () => {
    const concerns = surveyTemplates?.concerns || [];
    const allConcernKeys = concerns.map((c: any) => c.key);
    
    if (allConcernKeys.length === 0) {
      return;
    }
    
    const fastTrackData: SurveyData = {
      selected_keys: allConcernKeys,
      ordered_keys: allConcernKeys,
      user_style_sample: 'I object to this development on the following comprehensive grounds.',
      custom_grounds: '',
      submission_track: surveyData.submission_track
    };
    
    saveSurveyMutation.mutate(fastTrackData);
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  if (!projectSlug) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Project Not Specified</h1>
          <p className="text-gray-600">
            Please ensure the submission link includes a valid project slug (e.g. <code>/cool-project</code>).
          </p>
        </div>
      </div>
    );
  }

  if (loadingProject) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-gray-600">Loading project…</p>
        </div>
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Unable to load project</h1>
          <p className="text-gray-600 mb-4">
            {projectErrorValue instanceof Error ? projectErrorValue.message : 'Please try again later.'}
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-gray-600">The project you’re trying to access no longer exists or has been removed.</p>
        </div>
      </div>
    );
  }

  if (projectInactive) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Submissions Closed</h1>
          <p className="text-gray-600">
            This project is no longer accepting submissions. Reach out to the campaign organisers if you believe this is an
            error.
          </p>
        </div>
      </div>
    );
  }

  const testModeEmail = project.test_submission_email;
  const projectName = project.name || project.slug;
  const isHighTreesProject = projectSlug === 'high-trees-currumbin-valley';
  const landingTitle = isHighTreesProject ? 'Currumbin Valley Proposed Development' : projectName;
  const landingSubtitle = isHighTreesProject
    ? 'Lodge your submission to the High Trees Currumbin Valley Development Application'
    : `Submit your objection or support for ${projectName}.`;

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {project.action_network_config?.form_url ? (
                <a
                  href={project.action_network_config.form_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {landingTitle}
                </a>
              ) : (
                landingTitle
              )}
            </h1>
            <p className="text-gray-600">
              {landingSubtitle}
            </p>
          </div>

          {testModeEmail ? (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4">
              <p className="font-medium">Test run enabled</p>
              <p className="text-sm">All notifications and submissions will be routed to {testModeEmail}.</p>
            </div>
          ) : null}

          {/* Dual-track selection UI */}
          {project.is_dual_track && project.dual_track_config ? (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                {(project.dual_track_config as any)?.track_selection_prompt ||
                 'Have you previously made a submission on this development application?'}
              </h3>
              <div className="space-y-4">
                <label className="flex items-start p-4 border-2 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
                  style={{
                    borderColor: formData.submission_track === 'followup' ? '#3b82f6' : '#d1d5db',
                    backgroundColor: formData.submission_track === 'followup' ? '#eff6ff' : 'white'
                  }}>
                  <input
                    type="radio"
                    name="submission_track"
                    value="followup"
                    checked={formData.submission_track === 'followup'}
                    onChange={() => {
                      setFormData({ ...formData, submission_track: 'followup', is_returning_submitter: true });
                      setSurveyData({ ...surveyData, submission_track: 'followup' });
                    }}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900 block mb-1">
                      Yes, I previously submitted
                    </span>
                    <p className="text-sm text-gray-700">
                      {(project.dual_track_config as any)?.track_descriptions?.followup ||
                       'I have previously made a submission and want to add additional points'}
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
                  style={{
                    borderColor: formData.submission_track === 'comprehensive' ? '#3b82f6' : '#d1d5db',
                    backgroundColor: formData.submission_track === 'comprehensive' ? '#eff6ff' : 'white'
                  }}>
                  <input
                    type="radio"
                    name="submission_track"
                    value="comprehensive"
                    checked={formData.submission_track === 'comprehensive'}
                    onChange={() => {
                      setFormData({ ...formData, submission_track: 'comprehensive', is_returning_submitter: false });
                      setSurveyData({ ...surveyData, submission_track: 'comprehensive' });
                    }}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900 block mb-1">
                      No, this is my first submission
                    </span>
                    <p className="text-sm text-gray-700">
                      {(project.dual_track_config as any)?.track_descriptions?.comprehensive ||
                       'This is my first submission (includes all objection grounds)'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Property Details Section */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-semibold text-gray-900 mb-4">Property Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lot Number
                  </label>
                  <input
                    type="text"
                    value={formData.lot_number}
                    onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan Number
                  </label>
                  <input
                    type="text"
                    value={formData.plan_number}
                    onChange={(e) => setFormData({ ...formData, plan_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., SP123456"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.site_address}
                  onChange={(e) => setFormData({ ...formData, site_address: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Example Street, Gold Coast QLD 4000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.application_number}
                  onChange={(e) => setFormData({ ...formData, application_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="COM/2025/271"
                />
              </div>
            </div>

            {/* Submitter Details Section */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-semibold text-gray-900 mb-4">Submitter Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.applicant_first_name}
                    onChange={(e) => setFormData({ ...formData, applicant_first_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Surname *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.applicant_last_name}
                    onChange={(e) => setFormData({ ...formData, applicant_last_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.applicant_email}
                  onChange={(e) => setFormData({ ...formData, applicant_email: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Residential Address */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Residential Address *
                </label>
                <GoogleAddressAutocomplete
                  value={formData.applicant_residential_address}
                  onChange={(address) => setFormData({ ...formData, applicant_residential_address: address })}
                  onAddressSelect={(components) => {
                    setFormData({
                      ...formData,
                      applicant_residential_address: components.fullAddress,
                      applicant_suburb: components.suburb,
                      applicant_state: components.state,
                      applicant_postcode: components.postcode
                    });
                  }}
                  placeholder="Start typing your street address..."
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={formData.applicant_suburb}
                    onChange={(e) => setFormData({ ...formData, applicant_suburb: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Suburb"
                  />
                  <select
                    required
                    value={formData.applicant_state}
                    onChange={(e) => setFormData({ ...formData, applicant_state: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select State</option>
                    <option value="QLD">QLD</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="SA">SA</option>
                    <option value="WA">WA</option>
                    <option value="TAS">TAS</option>
                    <option value="NT">NT</option>
                    <option value="ACT">ACT</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={formData.applicant_postcode}
                    onChange={(e) => setFormData({ ...formData, applicant_postcode: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Postcode"
                  />
                </div>
              </div>

              {/* Postal Address Option */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Postal Address
                </label>
                <div className="flex items-center space-x-4 mb-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formData.postal_address_same}
                      onChange={() => setFormData({ ...formData, postal_address_same: true })}
                      className="mr-2"
                    />
                    <span>Same as residential address</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!formData.postal_address_same}
                      onChange={() => setFormData({ ...formData, postal_address_same: false })}
                      className="mr-2"
                    />
                    <span>Different postal address</span>
                  </label>
                </div>

                {!formData.postal_address_same && (
                  <div>
                    <input
                      type="text"
                      value={formData.applicant_postal_address}
                      onChange={(e) => setFormData({ ...formData, applicant_postal_address: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                      placeholder="Postal address"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                      <input
                        type="text"
                        value={formData.postal_suburb}
                        onChange={(e) => setFormData({ ...formData, postal_suburb: e.target.value })}
                        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Suburb"
                      />
                      <select
                        value={formData.postal_state}
                        onChange={(e) => setFormData({ ...formData, postal_state: e.target.value })}
                        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select State</option>
                        <option value="QLD">QLD</option>
                        <option value="NSW">NSW</option>
                        <option value="VIC">VIC</option>
                        <option value="SA">SA</option>
                        <option value="WA">WA</option>
                        <option value="TAS">TAS</option>
                        <option value="NT">NT</option>
                        <option value="ACT">ACT</option>
                      </select>
                      <input
                        type="text"
                        value={formData.postal_postcode}
                        onChange={(e) => setFormData({ ...formData, postal_postcode: e.target.value })}
                        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Postcode"
                      />
                    </div>
                    <input
                      type="email"
                      value={formData.postal_email}
                      onChange={(e) => setFormData({ ...formData, postal_email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Email address (if different)"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Submission Position */}
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <h3 className="font-semibold text-red-900 mb-2">Position on Development Application</h3>
              <p className="text-red-800 font-medium">OBJECTING to this development</p>
              <p className="text-sm text-red-700 mt-1">
                This form is specifically for objecting to development applications.
              </p>
            </div>

            <button
              type="submit"
              disabled={createSubmissionMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md disabled:opacity-50"
            >
              {createSubmissionMutation.isPending ? 'Starting...' : 'Continue'}
            </button>

            {createSubmissionMutation.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">
                  {createSubmissionMutation.error instanceof Error
                    ? createSubmissionMutation.error.message
                    : 'Failed to start submission. Please try again.'}
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const concerns = surveyTemplates?.concerns || [];

    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          
          {/* Fast Track Banner */}
          <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <BoltIcon className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  ⚡ Fast Track - Generate with All Issues
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Skip the survey and automatically generate a comprehensive submission 
                  including all {concerns.length} objection grounds in the recommended order.
                </p>
                <button
                  type="button"
                  onClick={handleFastTrack}
                  disabled={saveSurveyMutation.isPending || generateMutation.isPending || loadingSurvey}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-md disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                >
                  <BoltIcon className="w-5 h-5 inline mr-2 -mt-1" />
                  {saveSurveyMutation.isPending || generateMutation.isPending ? 'Generating Submission...' : 'Fast Track My Submission'}
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or customize your submission</span>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Tell Us Your Concerns
            </h1>
            <p className="text-gray-600">
              Help us create a personalized submission by selecting your main concerns and providing a sample of your writing style.
            </p>
          </div>

          {actionNetworkResult && actionNetworkResult.status === 'synced' ? (
            <div className="mb-6 border rounded-md p-4 bg-green-50 border-green-200 text-green-800">
              <p className="font-medium">Action Network sync succeeded</p>
              <p className="text-sm mt-1">
                {(actionNetworkResult.personHref || actionNetworkResult.submissionHref)
                  ? `Person: ${actionNetworkResult.personHref || 'n/a'}${
                      actionNetworkResult.submissionHref ? ` • Submission: ${actionNetworkResult.submissionHref}` : ''
                    }`
                  : 'Successfully synced to Action Network'}
              </p>
            </div>
          ) : null}

          <form onSubmit={handleSurveySubmit} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Which issues concern you most? (Select all that apply)
                </label>
                {concerns.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (surveyData.selected_keys.length === concerns.length) {
                        // Deselect all
                        setSurveyData({ ...surveyData, selected_keys: [], ordered_keys: [] });
                      } else {
                        // Select all
                        const allKeys = concerns.map((c: any) => c.key);
                        setSurveyData({ ...surveyData, selected_keys: allKeys, ordered_keys: allKeys });
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {surveyData.selected_keys.length === concerns.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {loadingSurvey ? (
                  <div>Loading concerns...</div>
                ) : (
                  concerns.map((concern: any) => (
                    <label key={concern.key} className="flex items-start">
                      <input
                        type="checkbox"
                        value={concern.key}
                        checked={surveyData.selected_keys.includes(concern.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSurveyData({
                              ...surveyData,
                              selected_keys: [...surveyData.selected_keys, concern.key],
                              ordered_keys: [...surveyData.selected_keys, concern.key]
                            });
                          } else {
                            setSurveyData({
                              ...surveyData,
                              selected_keys: surveyData.selected_keys.filter(k => k !== concern.key),
                              ordered_keys: surveyData.selected_keys.filter(k => k !== concern.key)
                            });
                          }
                        }}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <span className="font-medium">{concern.label}</span>
                        <p className="text-sm text-gray-600 mt-1">{concern.body}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {surveyData.selected_keys.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Prioritize your concerns (top = most important)
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="hidden md:inline">Drag and drop the cards below to rank them in order of importance.</span>
                  <span className="md:hidden">Tap the arrow buttons to reorder your concerns.</span>
                  {' '}Your highest priority concern should be at the top.
                </p>
                <div className="space-y-2">
                  {surveyData.selected_keys.map((key, idx) => {
                    const concern = concerns.find((c: any) => c.key === key);
                    const isDragging = draggedIndex === idx;
                    const isFirst = idx === 0;
                    const isLast = idx === surveyData.selected_keys.length - 1;

                    const moveUp = () => {
                      if (isFirst) return;
                      const newOrder = [...surveyData.selected_keys];
                      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
                      setSurveyData({ ...surveyData, selected_keys: newOrder, ordered_keys: newOrder });
                    };

                    const moveDown = () => {
                      if (isLast) return;
                      const newOrder = [...surveyData.selected_keys];
                      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                      setSurveyData({ ...surveyData, selected_keys: newOrder, ordered_keys: newOrder });
                    };

                    return (
                      <div
                        key={key}
                        draggable
                        onDragStart={(e) => {
                          setDraggedIndex(idx);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedIndex === null || draggedIndex === idx) return;

                          const newOrder = [...surveyData.selected_keys];
                          const [movedItem] = newOrder.splice(draggedIndex, 1);
                          newOrder.splice(idx, 0, movedItem);

                          setSurveyData({ ...surveyData, selected_keys: newOrder, ordered_keys: newOrder });
                          setDraggedIndex(null);
                        }}
                        onDragEnd={() => setDraggedIndex(null)}
                        className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg border-2 transition-all md:cursor-move"
                        style={{
                          backgroundColor: isDragging ? '#f3f4f6' : '#ffffff',
                          borderColor: isDragging ? '#9ca3af' : '#e5e7eb',
                          opacity: isDragging ? 0.5 : 1,
                          boxShadow: isDragging ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        }}
                      >
                        {/* Priority number badge */}
                        <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full text-white font-bold text-xs md:text-sm flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                          {idx + 1}
                        </div>

                        {/* Concern label */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm md:text-base font-medium text-gray-900 break-words">
                            {concern?.label || key}
                          </span>
                        </div>

                        {/* Mobile: Up/Down buttons */}
                        <div className="flex md:hidden flex-col gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={moveUp}
                            disabled={isFirst}
                            className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-gray-100 active:bg-gray-300 transition-colors touch-manipulation"
                            aria-label="Move up"
                          >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 15V5M10 5L5 10M10 5L15 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={moveDown}
                            disabled={isLast}
                            className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-gray-100 active:bg-gray-300 transition-colors touch-manipulation"
                            aria-label="Move down"
                          >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 5V15M10 15L15 10M10 15L5 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>

                        {/* Desktop: Drag handle */}
                        <div className="hidden md:block text-gray-400 flex-shrink-0">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 4H13M7 10H13M7 16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                In your own words, briefly describe your thoughts on this development *
              </label>
              <textarea
                required
                rows={4}
                value={surveyData.user_style_sample}
                onChange={(e) => setSurveyData({ ...surveyData, user_style_sample: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please share your thoughts about this development application in your own words."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add any additional grounds you'd like included
              </label>
              <textarea
                rows={3}
                value={surveyData.custom_grounds}
                onChange={(e) => setSurveyData({ ...surveyData, custom_grounds: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional: additional points that matter to you."
              />
            </div>

            <button
              type="submit"
              disabled={saveSurveyMutation.isPending || generateMutation.isPending || surveyData.selected_keys.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md disabled:opacity-50"
            >
              {saveSurveyMutation.isPending || generateMutation.isPending ? 'Generating Submission...' : 'Generate My Submission'}
            </button>

            {saveSurveyMutation.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">
                  {saveSurveyMutation.error instanceof Error
                    ? saveSurveyMutation.error.message
                    : 'Failed to save survey. Please try again.'}
                </p>
              </div>
            )}

            {generateMutation.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">
                  {generateMutation.error instanceof Error
                    ? generateMutation.error.message
                    : 'Failed to generate submission. Please try again.'}
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Step 3 - Loading/Generating state
  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Generating Your Submission
            </h1>
            <p className="text-gray-600 mb-8">
              Our AI is crafting a professional submission based on your input. This may take 30-60 seconds.
            </p>

            {/* Spinner */}
            <div className="flex justify-center mb-8">
              <div className="relative w-24 h-24">
                {/* Outer spinning circle */}
                <div className="absolute inset-0 border-8 border-blue-200 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-8 border-transparent border-t-blue-600 rounded-full animate-spin"
                  style={{ animationDuration: '1s' }}
                ></div>
                {/* Inner pulsing circle */}
                <div className="absolute inset-3 bg-blue-100 rounded-full animate-pulse"></div>
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg 
                    className="w-10 h-10 text-blue-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-full animate-progress"
                  style={{
                    animation: 'progress 3s ease-in-out infinite'
                  }}
                ></div>
              </div>
            </div>

            {/* Status messages */}
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Analyzing your concerns...</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Drafting submission text...</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span>Formatting document...</span>
              </div>
            </div>

            {generateMutation.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-6">
                <p className="text-sm text-red-600 mb-3">
                  {generateMutation.error instanceof Error
                    ? generateMutation.error.message
                    : 'Failed to generate submission. Please try again.'}
                </p>
                <button
                  onClick={() => generateMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md text-sm"
                >
                  Retry Generation
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add CSS animation for progress bar */}
        <style>{`
          @keyframes progress {
            0% {
              width: 0%;
              opacity: 0.8;
            }
            50% {
              width: 70%;
              opacity: 1;
            }
            100% {
              width: 100%;
              opacity: 0.9;
            }
          }
        `}</style>
      </div>
    );
  }
  
  if (step === 4) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Review Your Submission
            </h1>
            <div className="flex gap-2">
              {isEditMode && generatedText !== originalGeneratedText && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md transition-colors"
                  title="Reset to original draft"
                >
                  🔄 Reset
                </button>
              )}
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {isEditMode ? '👁️ Preview' : '✏️ Edit'}
              </button>
            </div>
          </div>
          <p className="text-gray-600 mb-6">
            {isEditMode 
              ? 'Edit your submission text directly. You can modify any part of the submission. Click Preview to see the formatted version.'
              : 'Review your formatted submission below. Click Edit to make changes.'}
          </p>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {isEditMode ? 'Edit Your Submission' : 'Formatted Preview'}
              </label>
              <p className="text-sm text-gray-500">
                Word count: {generatedText.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
            
            {isEditMode ? (
              <textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                rows={30}
                className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                style={{ minHeight: '600px' }}
              />
            ) : (
              <div 
                className="w-full border border-gray-300 rounded-md px-6 py-4 bg-gray-50"
                style={{ minHeight: '500px', maxHeight: '700px', overflowY: 'auto' }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-sm md:prose-base max-w-none"
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4 text-gray-800 leading-relaxed" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-800" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-800" {...props} />,
                    li: ({node, ...props}) => <li className="ml-4 leading-relaxed" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-700" {...props} />,
                    code: ({node, inline, ...props}: any) => 
                      inline 
                        ? <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono text-gray-900" {...props} />
                        : <code className="block bg-gray-200 p-3 rounded text-sm font-mono overflow-x-auto mb-4" {...props} />,
                  }}
                >
                  {addParagraphBreaks(generatedText)}
                </ReactMarkdown>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              disabled={previewEmailBodyMutation.isPending}
              className="text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              onClick={() => previewEmailBodyMutation.mutate()}
              disabled={previewEmailBodyMutation.isPending || !generatedText.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-md disabled:opacity-50"
            >
              {previewEmailBodyMutation.isPending ? 'Loading Email Preview...' : 'Continue to Email Preview'}
            </button>
          </div>

          {previewEmailBodyMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
              <p className="text-sm text-red-600">
                {previewEmailBodyMutation.error instanceof Error
                  ? previewEmailBodyMutation.error.message
                  : 'Failed to load email preview. Please try again.'}
              </p>
            </div>
          )}

          {/* Reset Confirmation Modal */}
          {showResetConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-start mb-4">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Reset to Original Draft?
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      This will discard all your edits and restore the original generated draft. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedText(originalGeneratedText);
                      setShowResetConfirm(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors"
                  >
                    Reset to Original
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Review Your Email
            </h1>
            <div className="flex gap-2">
              {isEmailEditMode && emailBody !== originalEmailBody && (
                <button
                  onClick={() => setShowEmailResetConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md transition-colors"
                  title="Reset to original"
                >
                  🔄 Reset
                </button>
              )}
              <button
                onClick={() => setIsEmailEditMode(!isEmailEditMode)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {isEmailEditMode ? '👁️ Preview' : '✏️ Edit'}
              </button>
            </div>
          </div>
          <p className="text-gray-600 mb-6">
            This is the email body that will be sent to the council. The submission document will be attached as a PDF.
          </p>

          {/* Email Subject */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <div className="w-full border border-gray-300 rounded-md px-4 py-3 bg-gray-50 text-gray-800">
              {emailSubject}
            </div>
          </div>

          {/* Email Body */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {isEmailEditMode ? 'Edit Email Body' : 'Email Body Preview'}
              </label>
              <p className="text-sm text-gray-500">
                Word count: {emailBody.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
            
            {isEmailEditMode ? (
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-3 font-mono text-sm"
                style={{ minHeight: '400px', maxHeight: '600px' }}
              />
            ) : (
              <div 
                className="w-full border border-gray-300 rounded-md px-6 py-4 bg-gray-50"
                style={{ minHeight: '400px', maxHeight: '600px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}
              >
                {emailBody}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>📎 Attachment:</strong> Your submission document will be attached as a PDF to this email.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(4)}
              disabled={submitMutation.isPending}
              className="text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !emailBody.trim()}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-md disabled:opacity-50"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit to Council'}
            </button>
          </div>

          {submitMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
              <p className="text-sm text-red-600">
                {submitMutation.error instanceof Error
                  ? submitMutation.error.message
                  : 'Failed to submit. Please try again.'}
              </p>
            </div>
          )}

          {/* Reset Confirmation Modal */}
          {showEmailResetConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-start mb-4">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Reset to Original Email?
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      This will discard all your edits and restore the original generated email. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowEmailResetConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setEmailBody(originalEmailBody);
                      setShowEmailResetConfirm(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors"
                  >
                    Reset to Original
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
