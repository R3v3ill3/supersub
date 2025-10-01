import { useMemo, useState, type ChangeEvent, type FormEvent, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { ActionNetworkItem, CreateProjectData } from '../lib/api';
import { getDefaultDualTrackConfig, validateDualTrackConfig } from '../components/DualTrackConfiguration';
import { type TemplateSelectorValue } from '../components/TemplateSelector';
import { WizardStep } from '../components/Wizard';
import { 
  Step1ProjectType, 
  Step2CouncilConfig, 
  Step3TemplateSetup, 
  Step4ActionNetwork, 
  Step5ReviewLaunch 
} from '../components/WizardSteps';
import type { TemplateSetupMethod } from '../components/TemplateSetupGuide';

const pageStyle: CSSProperties = {
  padding: '32px',
  backgroundColor: '#f3f4f6',
  minHeight: '100%',
  display: 'flex',
  justifyContent: 'center',
};

const contentStyle: CSSProperties = {
  width: '100%',
  maxWidth: '1080px',
};

const headerStyle: CSSProperties = {
  marginBottom: '32px',
};

const titleStyle: CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: '#111827',
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: '#4b5563',
  marginTop: '8px',
  fontSize: '16px',
};

const sectionStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
  border: '1px solid #e5e7eb',
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const sectionTitleStyle: CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#111827',
  margin: 0,
};

const sectionDescriptionStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  margin: 0,
  lineHeight: 1.5,
};

const twoColumnGridStyle: CSSProperties = {
  display: 'grid',
  gap: '24px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#1f2937',
};

const requiredBadgeStyle: CSSProperties = {
  color: '#ef4444',
  marginLeft: '4px',
};

const inputStyle: CSSProperties = {
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

const monospaceInputStyle: CSSProperties = {
  ...inputStyle,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', monospace",
  fontSize: '15px',
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: '140px',
  resize: 'vertical',
  lineHeight: 1.5,
};

const helpTextStyle: CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: 1.6,
  margin: 0,
};

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '18px 20px',
  borderRadius: '12px',
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
};

const checkboxStyle: CSSProperties = {
  width: '18px',
  height: '18px',
  accentColor: '#2563eb',
};

const actionsRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '16px',
  marginTop: '32px',
};

const secondaryButtonStyle: CSSProperties = {
  padding: '12px 22px',
  borderRadius: '12px',
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const primaryButtonStyle: CSSProperties = {
  padding: '12px 22px',
  borderRadius: '12px',
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 14px 35px rgba(37, 99, 235, 0.25)',
};

const primaryButtonDisabledStyle: CSSProperties = {
  ...primaryButtonStyle,
  opacity: 0.7,
  cursor: 'not-allowed',
  boxShadow: 'none',
};

const statusContainerStyle = (variant: 'success' | 'error'): CSSProperties => ({
  marginTop: '28px',
  padding: '22px',
  borderRadius: '12px',
  border: `1px solid ${variant === 'success' ? '#bbf7d0' : '#fecaca'}`,
  backgroundColor: variant === 'success' ? '#f0fdf4' : '#fef2f2',
  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
});

const statusTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 600,
};

const statusBodyStyle: CSSProperties = {
  marginTop: '8px',
  fontSize: '14px',
  lineHeight: 1.5,
};

const previewContainerStyle: CSSProperties = {
  marginTop: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const previewLabelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const previewValueStyle: CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '12px 16px',
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', monospace",
  fontSize: '13px',
  color: '#111827',
  overflowX: 'auto',
  whiteSpace: 'nowrap',
};

const prefixBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: '#eef2ff',
  border: '1px solid #c7d2fe',
  borderRadius: '8px',
  padding: '6px 10px',
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', monospace",
  fontSize: '12px',
  color: '#1e3a8a',
};

// PRESERVED: Helper functions for existing compatibility
const AN_FORM_PREFIX = 'https://actionnetwork.org/api/v2/forms/';
const AN_LIST_PREFIX = 'https://actionnetwork.org/api/v2/lists/';
const AN_TAG_PREFIX = 'https://actionnetwork.org/api/v2/tags/';
const AN_GROUP_PREFIX = 'https://actionnetwork.org/api/v2/groups/';

function extractIdFromHref(href: string | undefined, prefix: string) {
  if (!href) return '';
  if (href.startsWith(prefix)) return href.slice(prefix.length);
  const parts = href.split('/');
  return parts[parts.length - 1] || '';
}

function getSelectableValue(item: ActionNetworkItem, prefix: string) {
  const primary = item.id ?? '';
  if (primary) return primary;
  return extractIdFromHref(item.href, prefix);
}

export default function CreateProject() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // PRESERVED: All existing state - exact same initial state
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    slug: '',
    description: '',
    council_email: '',
    council_name: '',
    google_doc_template_id: '',
    cover_template_id: '',
    grounds_template_id: '',
    council_subject_template: 'Development application submission opposing application number {{application_number}}',
    council_email_body_template: 'Dear {{council_name}},\n\nPlease find attached the development application submission for {{site_address}}.\n\nApplicant: {{applicant_full_name}}\nEmail: {{applicant_email}}\n{{application_number_line}}\n\nKind regards,\n{{sender_name}}',
    from_email: '',
    from_name: '',
    default_application_number: '',
    subject_template: 'Development Application Submission - {{site_address}}',
    default_pathway: 'review',
    enable_ai_generation: true,
    test_submission_email: '',
    action_network_api_key: '',
    action_network_config: {
      action_url: '',
      form_url: '',
      list_hrefs: [],
      tag_hrefs: [],
      group_hrefs: [],
      custom_fields: {},
    },
    is_dual_track: false,
    dual_track_config: getDefaultDualTrackConfig(),
  });

  // NEW: Wizard state management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [templateSetupMethod, setTemplateSetupMethod] = useState<TemplateSetupMethod>('upload');
  const [actionNetworkEnabled, setActionNetworkEnabled] = useState(false);
  
  // NEW: Draft project state for template uploads
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [isDraftMode, setIsDraftMode] = useState(false);

  // NEW: Draft project creation mutation for template uploads
  const createDraftProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectData) => {
      console.log('Creating/updating draft project with data:', data);

      // Check if we already have a draft project for this slug
      try {
        const response = await api.projects.list({ include_inactive: true });
        const existingDraft = response.data.projects?.find((p: any) =>
          p.slug.startsWith(`${data.slug}-draft-`) && !p.is_active
        );

        if (existingDraft) {
          console.log('Reusing existing draft project:', existingDraft.id);
          // Update the existing draft instead of creating a new one
          return api.projects.update(existingDraft.id, {
            ...data,
            name: data.name || 'Draft Project',
            slug: existingDraft.slug, // Keep the same slug
            council_email: data.council_email || 'draft@example.com',
            council_name: data.council_name || 'Draft Council',
            is_active: false,
          });
        }
      } catch (error) {
        console.warn('Failed to check for existing draft, creating new one:', error);
      }

      // No existing draft found, create a new one
      const draftSlug = `${data.slug}-draft-${Date.now()}`;
      return api.projects.create({
        ...data,
        name: data.name || 'Draft Project',
        slug: draftSlug,
        council_email: data.council_email || 'draft@example.com',
        council_name: data.council_name || 'Draft Council',
        is_active: false, // Mark as inactive draft
      });
    },
    onSuccess: (response) => {
      console.log('Draft project response:', response.data);
      const projectId = response.data?.project?.id || response.data?.data?.id || response.data?.id;
      if (projectId) {
        setDraftProjectId(projectId);
        setIsDraftMode(true);
        console.log('Draft project created:', projectId);

        // Advance to step 3 only after draft project is created
        setCompletedSteps(prev => [...prev.filter(s => s !== 2), 2]);
        setCurrentStep(3);
      } else {
        console.error('Failed to extract project ID from response:', response.data);
        alert('Project was created but failed to extract ID. Please refresh the page.');
      }
    },
    onError: (error: any) => {
      console.error('Draft project creation failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      // Show user-friendly error message
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create draft project';
      alert(`Error creating project: ${errorMessage}\n\nPlease check the console for details.`);
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProjectData) => {
      if (isDraftMode && draftProjectId) {
        // Update existing draft project
        return api.projects.update(draftProjectId, {
          ...data,
          is_active: true, // Activate on final submission
        });
      }
      // Create new project
      return api.projects.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    },
  });

  const {
    data: formsResponse,
    isLoading: loadingForms,
    isError: formsError,
    refetch: refetchForms,
  } = useQuery({
    queryKey: ['action-network', 'forms'],
    queryFn: async () => {
      const { data } = await api.actionNetwork.listForms();
      return data.forms ?? [];
    },
    enabled: false, // Don't auto-fetch, only fetch when user clicks refresh
  });

  const {
    data: listsResponse,
    isLoading: loadingLists,
    isError: listsError,
    refetch: refetchLists,
  } = useQuery({
    queryKey: ['action-network', 'lists'],
    queryFn: async () => {
      const { data } = await api.actionNetwork.listLists();
      return data.lists ?? [];
    },
    enabled: false, // Don't auto-fetch, only fetch when user clicks refresh
  });

  const {
    data: tagsResponse,
    isLoading: loadingTags,
    isError: tagsError,
    refetch: refetchTags,
  } = useQuery({
    queryKey: ['action-network', 'tags'],
    queryFn: async () => {
      const { data } = await api.actionNetwork.listTags();
      return data.tags ?? [];
    },
    enabled: false, // Don't auto-fetch, only fetch when user clicks refresh
  });

  const {
    data: groupsResponse,
    isLoading: loadingGroups,
    isError: groupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ['action-network', 'groups'],
    queryFn: async () => {
      const { data } = await api.actionNetwork.listGroups();
      return data.groups ?? [];
    },
    enabled: false, // Don't auto-fetch, only fetch when user clicks refresh
  });

  const forms = formsResponse ?? [];
  const lists = listsResponse ?? [];
  const tags = tagsResponse ?? [];
  const groups = groupsResponse ?? [];


  // NEW: Wizard validation functions
  const stepValidation = {
    1: () => Boolean(formData.name && formData.slug),
    2: () => Boolean(formData.council_email && formData.council_name && formData.default_application_number),
    3: () => {
      // Step 3 requires at least email body template
      // Grounds templates are optional - can be added later
      const hasEmailBody = Boolean(formData.council_email_body_template);
      return hasEmailBody;
    },
    4: () => true, // Optional step
    5: () => true, // Review step
  };

  const isStepValid = (step: number) => stepValidation[step as keyof typeof stepValidation]?.() || false;

  // NEW: Wizard navigation handlers
  const handleNextStep = () => {
    if (isStepValid(currentStep)) {
      // Special handling for step 2 → 3: Create draft project first (if not already created)
      if (currentStep === 2 && !draftProjectId && !createDraftProjectMutation.isPending) {
        // Draft creation will advance to step 3 in its onSuccess callback
        createDraftProjectMutation.mutate(formData);
        return; // Don't advance yet, wait for draft creation
      }
      
      // For all other steps (including step 2→3 when draft already exists), advance normally
      setCompletedSteps(prev => [...prev.filter(s => s !== currentStep), currentStep]);
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handleBackStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };


  // NEW: Helper to update formData with partial updates and sync to draft project
  const updateFormData = (updates: Partial<CreateProjectData>) => {
    setFormData(prev => ({ ...prev, ...updates }));

    // Auto-save template changes to draft project if it exists
    if (draftProjectId && (
      updates.council_email_body_template !== undefined ||
      updates.cover_template_id !== undefined ||
      updates.grounds_template_id !== undefined ||
      updates.dual_track_config !== undefined ||
      updates.action_network_api_key !== undefined ||
      updates.action_network_config !== undefined
    )) {
      // Save changes immediately (component handles debouncing via React state)
      api.projects.update(draftProjectId, updates).catch(err => {
        console.error('Failed to auto-save changes to draft project:', err);
      });
    }
  };


  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const checked = 'checked' in event.target ? event.target.checked : false;
    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    setFormData((previous) => ({
      ...previous,
      name,
      slug,
    }));
  };

  const handleTemplateSelected = (templateType: TemplateSelectorValue['templateType']) =>
    (value?: string) => {
      setFormData((previous) => ({
        ...previous,
        [`${templateType}_template_id`]: value || '',
      }));
    };

  // PRESERVED: Original submit logic, now callable from wizard
  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    if (createProjectMutation.isPending) {
      return;
    }

    if (formData.is_dual_track && formData.dual_track_config) {
      const errors = validateDualTrackConfig(formData.dual_track_config);
      if (errors.length > 0) {
        alert(`Dual track configuration errors:\n${errors.join('\n')}`);
        return;
      }
    }

    const confirmed = window.confirm('Create a new project with these details?');
    if (!confirmed) {
      return;
    }

    createProjectMutation.mutate({
      ...formData,
      is_dual_track: formData.is_dual_track || false,
      dual_track_config: formData.is_dual_track ? formData.dual_track_config : undefined,
    });
  };

  // NEW: Create project handler for wizard
  const handleCreateProject = () => {
    handleSubmit();
  };

  return (
    <div style={pageStyle}>
      <div style={contentStyle}>
        <header style={headerStyle}>
          <h1 style={titleStyle}>Create New Project</h1>
          <p style={subtitleStyle}>Set up a new DA submission project through our guided 5-step wizard.</p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {currentStep === 1 && (
            <WizardStep
              stepNumber={1}
              totalSteps={5}
              title="Project Setup"
              description="Define your project type and basic information"
              completedSteps={completedSteps}
            >
              <Step1ProjectType
                formData={formData}
                onInputChange={handleInputChange}
                onNameChange={handleNameChange}
                onNext={handleNextStep}
                isValid={isStepValid(1)}
              />
            </WizardStep>
          )}

          {currentStep === 2 && (
            <WizardStep
              stepNumber={2}
              totalSteps={5}
              title="Council Configuration"
              description="Set up council contact details and testing options"
              completedSteps={completedSteps}
            >
              <Step2CouncilConfig
                formData={formData}
                onInputChange={handleInputChange}
                onBack={handleBackStep}
                onNext={handleNextStep}
                isValid={isStepValid(2)}
              />
              
              {createDraftProjectMutation.isPending && (
                <div style={{
                  padding: '20px',
                  backgroundColor: '#f0f9ff',
                  border: '2px solid #bae6fd',
                  borderRadius: '12px',
                  marginTop: '24px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#0c4a6e', marginBottom: '8px' }}>
                    🔄 Preparing template upload system...
                  </div>
                  <p style={{ fontSize: '14px', color: '#075985', margin: 0 }}>
                    Creating draft project for template management. This will only take a moment.
                  </p>
                </div>
              )}
            </WizardStep>
          )}

          {currentStep === 3 && (
            <WizardStep
              stepNumber={3}
              totalSteps={5}
              title="Template Setup"
              description="Configure submission templates through guided workflow"
              completedSteps={completedSteps}
            >
              {draftProjectId && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #bbf7d0',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  fontSize: '14px',
                  color: '#166534'
                }}>
                  ✅ Template upload system ready (Draft Project ID: {draftProjectId.slice(0, 8)}...)
                </div>
              )}
              <Step3TemplateSetup
                formData={formData}
                projectId={draftProjectId}
                templateSetupMethod={templateSetupMethod}
                onTemplateSetupMethodChange={setTemplateSetupMethod}
                onTemplateSelected={handleTemplateSelected}
                onFormDataChange={updateFormData}
                onBack={handleBackStep}
                onNext={handleNextStep}
                isValid={isStepValid(3)}
              />
            </WizardStep>
          )}

          {currentStep === 4 && (
            <WizardStep
              stepNumber={4}
              totalSteps={5}
              title="Action Network Integration"
              description="Optional: Connect to Action Network for supporter management"
              completedSteps={completedSteps}
            >
              <Step4ActionNetwork
                formData={formData}
                actionNetworkEnabled={actionNetworkEnabled}
                onActionNetworkEnabledChange={setActionNetworkEnabled}
                onInputChange={handleInputChange}
                onFormDataChange={updateFormData}
                forms={forms}
                lists={lists}
                tags={tags}
                groups={groups}
                onRefreshForms={refetchForms}
                onRefreshLists={refetchLists}
                onRefreshTags={refetchTags}
                onRefreshGroups={refetchGroups}
                loadingForms={loadingForms}
                loadingLists={loadingLists}
                loadingTags={loadingTags}
                loadingGroups={loadingGroups}
                formsError={formsError}
                listsError={listsError}
                tagsError={tagsError}
                groupsError={groupsError}
                onBack={handleBackStep}
                onNext={handleNextStep}
              />
            </WizardStep>
          )}

          {currentStep === 5 && (
            <WizardStep
              stepNumber={5}
              totalSteps={5}
              title="Review & Launch"
              description="Review configuration and create your project"
              completedSteps={completedSteps}
            >
              <Step5ReviewLaunch
                formData={formData}
                onBack={handleBackStep}
                onCreateProject={handleCreateProject}
                isCreating={createProjectMutation.isPending}
              />
            </WizardStep>
          )}


          {/* PRESERVED: Success/Error status messages - displayed across all wizard steps */}

          {createProjectMutation.isSuccess ? (
            <div style={statusContainerStyle('success')}>
              <h3 style={{ ...statusTitleStyle, color: '#166534' }}>Project created successfully</h3>
              <p style={{ ...statusBodyStyle, color: '#166534' }}>
                You can now view and manage the project from the projects list.
              </p>
            </div>
          ) : null}

          {createProjectMutation.isError ? (
            <div style={statusContainerStyle('error')}>
              <h3 style={{ ...statusTitleStyle, color: '#991b1b' }}>Unable to create project</h3>
              <p style={{ ...statusBodyStyle, color: '#991b1b' }}>
                {createProjectMutation.error instanceof Error
                  ? createProjectMutation.error.message
                  : 'Something went wrong while creating the project. Please try again.'}
              </p>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}


