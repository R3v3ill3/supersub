import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { api } from '../lib/api';

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
    lot_number: '',
    plan_number: '',
    site_address: '',
    application_number: '',
    submission_pathway: 'review',
  });
  const [surveyData, setSurveyData] = useState<SurveyData>({
    selected_keys: [],
    user_style_sample: '',
    ordered_keys: [],
    custom_grounds: '',
  });
  const [submissionId, setSubmissionId] = useState<string>('');
  const [actionNetworkResult, setActionNetworkResult] = useState<ActionNetworkSyncResult | null>(null);

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
  }, [projectSlug, project?.default_application_number, project?.default_pathway, searchParams]);

  // Load survey templates
  const { data: surveyTemplates, isLoading: loadingSurvey } = useQuery({
    queryKey: ['survey-templates'],
    queryFn: async () => {
      const response = await api.survey.getTemplates();
      return response.data;
    },
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

          {actionNetworkResult ? (
            <div
              className={`mb-6 border rounded-md p-4 ${
                actionNetworkResult.status === 'synced'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : actionNetworkResult.status === 'failed'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              <p className="font-medium">
                {actionNetworkResult.status === 'synced'
                  ? 'Action Network sync succeeded'
                  : actionNetworkResult.status === 'failed'
                  ? 'Action Network sync failed'
                  : 'Action Network sync skipped'}
              </p>
              <p className="text-sm mt-1">
                {actionNetworkResult.status === 'synced' && (actionNetworkResult.personHref || actionNetworkResult.submissionHref)
                  ? `Person: ${actionNetworkResult.personHref || 'n/a'}${
                      actionNetworkResult.submissionHref ? ` • Submission: ${actionNetworkResult.submissionHref}` : ''
                    }`
                  : actionNetworkResult.status === 'failed'
                  ? actionNetworkResult.error || 'We could not sync this supporter to Action Network. Our team has been notified.'
                  : 'Action Network configuration is optional. No sync was attempted for this project.'}
              </p>
            </div>
          ) : null}

          <form onSubmit={handleSurveySubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Which issues concern you most? (Select all that apply)
              </label>
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
                              selected_keys: [...surveyData.selected_keys, concern.key]
                            });
                          } else {
                            setSurveyData({
                              ...surveyData,
                              selected_keys: surveyData.selected_keys.filter(k => k !== concern.key)
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioritise your concerns (top = most important)
                </label>
                <ol className="list-decimal ml-6 space-y-1">
                  {surveyData.selected_keys.map((key, idx) => (
                    <li key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-800">{concerns.find((c: any) => c.key === key)?.label || key}</span>
                      <span className="space-x-2">
                        <button type="button" className="text-xs px-2 py-1 bg-gray-100 rounded" onClick={() => {
                          if (idx === 0) return;
                          const arr = [...surveyData.selected_keys];
                          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                          setSurveyData({ ...surveyData, selected_keys: arr, ordered_keys: arr });
                        }}>Up</button>
                        <button type="button" className="text-xs px-2 py-1 bg-gray-100 rounded" onClick={() => {
                          if (idx === surveyData.selected_keys.length - 1) return;
                          const arr = [...surveyData.selected_keys];
                          [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                          setSurveyData({ ...surveyData, selected_keys: arr, ordered_keys: arr });
                        }}>Down</button>
                      </span>
                    </li>
                  ))}
                </ol>
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
                placeholder="Please share your thoughts about this development application in your own words. This helps us match your writing style when preparing your submission."
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
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
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
