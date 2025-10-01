import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { SuccessIcon } from '@da/ui/icons';
import { api } from '../lib/api';
import { WizardHeader, WizardNavigation, FormSection, ChoiceCard } from '../components/Wizard';

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

const TRACK_LABELS: Record<SubmissionTrack, { title: string; badge: string }> = {
  followup: { title: 'Follow-up submission', badge: 'Returning supporters' },
  comprehensive: { title: 'Comprehensive submission', badge: 'Full submission' },
};

// Inline styles matching admin app design
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  fontSize: '14px',
  color: '#111827',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#1f2937',
  marginBottom: '8px',
  display: 'block',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const twoColumnGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: '24px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
};

const helpTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: 1.6,
  margin: 0,
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '16px',
  borderRadius: '12px',
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
};

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
    lot_number: '',
    plan_number: '',
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
        postal_suburb: data.postal_address_same ? data.applicant_suburb : data.postal_suburb,
        postal_state: data.postal_address_same ? data.applicant_state : data.postal_state,
        postal_postcode: data.postal_address_same ? data.applicant_postcode : data.postal_postcode,
        postal_email: data.postal_address_same ? data.applicant_email : data.postal_email,
        // Property details
        lot_number: data.lot_number,
        plan_number: data.plan_number,
        site_address: data.site_address,
        application_number: data.application_number,
        submission_pathway: data.submission_pathway,
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
      setStep(3);
    },
  });

  // Generate submission mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.generation.generate(submissionId, { process_document: 'true' });
      return response.data;
    },
    onSuccess: () => {
      navigate('/thank-you');
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
                  {projectName}
                </a>
              ) : (
                projectName
              )}
            </h1>
            <p className="text-gray-600">
              Submit your objection or support for {projectName}.
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
                    onChange={(e) => {
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
                    onChange={(e) => {
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
                <input
                  type="text"
                  required
                  value={formData.applicant_residential_address}
                  onChange={(e) => setFormData({ ...formData, applicant_residential_address: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  placeholder="Street address"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How would you like to proceed? *
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="review"
                    checked={formData.submission_pathway === 'review'}
                    onChange={(e) => setFormData({ ...formData, submission_pathway: e.target.value as any })}
                    className="mr-3"
                  />
                  <span>I'd like to review and edit the submission before sending</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="direct"
                    checked={formData.submission_pathway === 'direct'}
                    onChange={(e) => setFormData({ ...formData, submission_pathway: e.target.value as any })}
                    className="mr-3"
                  />
                  <span>Send the submission directly to council</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="draft"
                    checked={formData.submission_pathway === 'draft'}
                    onChange={(e) => setFormData({ ...formData, submission_pathway: e.target.value as any })}
                    className="mr-3"
                  />
                  <span>I need more information and want to prepare my own submission</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={createSubmissionMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md disabled:opacity-50"
            >
              {createSubmissionMutation.isPending ? 'Starting...' : 'Continue to Survey'}
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
                  Drag to prioritize your concerns (top = most important)
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop the cards below to rank them in order of importance. Your highest priority concern should be at the top.
                </p>
                <div className="space-y-2">
                  {surveyData.selected_keys.map((key, idx) => {
                    const concern = concerns.find((c: any) => c.key === key);
                    const isDragging = draggedIndex === idx;

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
                        className="flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-move"
                        style={{
                          backgroundColor: isDragging ? '#f3f4f6' : '#ffffff',
                          borderColor: isDragging ? '#9ca3af' : '#e5e7eb',
                          opacity: isDragging ? 0.5 : 1,
                          boxShadow: isDragging ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        }}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{concern?.label || key}</span>
                        </div>
                        <div className="text-gray-400">
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
              disabled={saveSurveyMutation.isPending || surveyData.selected_keys.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md disabled:opacity-50"
            >
              {saveSurveyMutation.isPending ? 'Saving...' : 'Continue to Generation'}
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
          </form>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <SuccessIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Generate Your Submission
          </h1>
          <p className="text-gray-600 mb-8">
            Based on your responses, we'll create a personalized submission that combines your concerns with approved facts and follows your writing style.
          </p>
          
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-md disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Generating Submission...' : 'Generate My Submission'}
          </button>

          {generateMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
              <p className="text-sm text-red-600">
                {generateMutation.error instanceof Error
                  ? generateMutation.error.message
                  : 'Failed to generate submission. Please try again.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
