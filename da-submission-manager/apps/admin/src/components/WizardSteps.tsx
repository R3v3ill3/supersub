import { type ReactNode, type ChangeEvent, type CSSProperties } from 'react';
import type { CreateProjectData, ActionNetworkItem } from '../lib/api';
import { ProjectTypeSelector } from './ProjectTypeSelector';
import { TemplateSetupGuide, type TemplateSetupMethod } from './TemplateSetupGuide';
import { TemplateUploadFlow } from './TemplateUploadFlow';
import { ActionNetworkTestFirst } from './ActionNetworkTestFirst';
import { TestingConfigurationPanel } from './TestingConfigurationPanel';
import { ProjectSummaryPanel, PreLaunchChecklist } from './ProjectSummaryPanel';
import { TemplateSelector } from './TemplateSelector';
import { FormSection, WizardNavigation } from './Wizard';

// Reuse existing styles from CreateProject
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

// Helper component for field labels
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label style={labelStyle}>
      {label}
      {required ? <span style={requiredBadgeStyle}>*</span> : null}
    </label>
  );
}

// Helper component for optional panel (currently unused but may be needed for future features)

// Action Network Optional Panel - Clear value proposition before complexity
interface ActionNetworkOptionalPanelProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

function ActionNetworkOptionalPanel({ enabled, onEnabledChange }: ActionNetworkOptionalPanelProps) {
  const choicesGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  };

  const choiceCardStyle = (selected: boolean): CSSProperties => ({
    border: `2px solid ${selected ? '#2563eb' : '#e5e7eb'}`,
    borderRadius: '16px',
    padding: '24px',
    backgroundColor: selected ? '#eff6ff' : '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    position: 'relative',
  });

  const iconStyle: CSSProperties = {
    width: '32px',
    height: '32px',
    color: '#2563eb',
    marginBottom: '8px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  };

  const descriptionStyle: CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  };

  const badgeStyle: CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '4px 8px',
    borderRadius: '6px',
  };

  return (
    <div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        color: '#111827',
        margin: '0 0 20px 0',
      }}>
        Do you want to connect to Action Network?
      </h3>
      
      <div style={choicesGridStyle}>
        <div 
          style={choiceCardStyle(!enabled)} 
          onClick={() => onEnabledChange(false)}
        >
          <div style={iconStyle}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <h3 style={titleStyle}>Skip Action Network</h3>
          <p style={descriptionStyle}>
            Set up project without Action Network integration. You can add this later if needed.
          </p>
          <span style={{ ...badgeStyle, backgroundColor: '#3b82f6' }}>Faster Setup</span>
        </div>
        
        <div 
          style={choiceCardStyle(enabled)} 
          onClick={() => onEnabledChange(true)}
        >
          <div style={iconStyle}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </div>
          <h3 style={titleStyle}>Connect Action Network</h3>
          <p style={descriptionStyle}>
            Sync supporters and track submissions automatically. Build your email list as submissions come in.
          </p>
          <span style={badgeStyle}>Recommended</span>
        </div>
      </div>
      
      {enabled && (
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#0c4a6e',
            margin: '0 0 8px 0',
          }}>
            📊 What you get with Action Network:
          </h4>
          <ul style={{
            fontSize: '13px',
            color: '#075985',
            margin: '8px 0 0 0',
            paddingLeft: '20px',
            lineHeight: 1.6,
          }}>
            <li>Automatic supporter list building</li>
            <li>Submission tracking and analytics</li>
            <li>Tag and list management</li>
            <li>Campaign coordination tools</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Step 1: Project Type & Basic Information
interface Step1Props {
  formData: CreateProjectData;
  onInputChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  isValid: boolean;
}

export function Step1ProjectType({ formData, onInputChange, onNameChange, onNext, isValid }: Step1Props) {
  const handleDualTrackChange = (isDualTrack: boolean) => {
    // Create a simple synthetic event compatible with the existing handler
    const mockElement = document.createElement('input');
    mockElement.name = 'is_dual_track';
    mockElement.type = 'checkbox';
    mockElement.checked = isDualTrack;
    
    const syntheticEvent = {
      target: mockElement,
      currentTarget: mockElement
    } as unknown as ChangeEvent<HTMLInputElement>;
    
    onInputChange(syntheticEvent);
  };

  return (
    <>
      <FormSection title="Project Type" description="Choose the type of submission project and configure dual track settings if needed.">
        <ProjectTypeSelector 
          isDualTrack={formData.is_dual_track || false}
          onChange={handleDualTrackChange}
        />
      </FormSection>

      <FormSection title="Basic Information" description="Project level details used throughout the submission experience.">
        <div style={twoColumnGridStyle}>
          <div style={fieldStyle}>
            <FieldLabel label="Project Name" required />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onNameChange}
              required
              placeholder="Southern Gold Coast development"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <FieldLabel label="URL Slug" required />
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={onInputChange}
              required
              placeholder="central-park-development"
              style={inputStyle}
            />
            <p style={helpTextStyle}>Used in URLs and Action Network links.</p>
          </div>
        </div>
        <div style={fieldStyle}>
          <FieldLabel label="Description" />
          <textarea
            name="description"
            value={formData.description}
            onChange={onInputChange}
            placeholder="Brief description of the project..."
            style={textareaStyle}
          />
        </div>
      </FormSection>

      <WizardNavigation 
        onNext={onNext}
        nextDisabled={!isValid}
        nextLabel="Continue to Council Setup"
      />
    </>
  );
}

// Step 2: Council Configuration
interface Step2Props {
  formData: CreateProjectData;
  onInputChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBack: () => void;
  onNext: () => void;
  isValid: boolean;
}

export function Step2CouncilConfig({ formData, onInputChange, onBack, onNext, isValid }: Step2Props) {
  return (
    <>
      <FormSection title="Council Details" description="Essential contact information for council correspondence.">
        <div style={twoColumnGridStyle}>
          <div style={fieldStyle}>
            <FieldLabel label="Council Name" required />
            <input
              type="text"
              name="council_name"
              value={formData.council_name}
              onChange={onInputChange}
              required
              placeholder="Gold Coast City Council"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <FieldLabel label="Council Email" required />
            <input
              type="email"
              name="council_email"
              value={formData.council_email}
              onChange={onInputChange}
              required
              placeholder="mail@goldcoast.qld.gov.au"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <FieldLabel label="Attention Of" />
            <input
              type="text"
              name="council_attention_of"
              value={formData.council_attention_of || ''}
              onChange={onInputChange}
              placeholder="Tim Baker, CEO"
              style={inputStyle}
            />
            <p style={helpTextStyle}>
              Optional: specify a contact person or title for council correspondence.
            </p>
          </div>
          <div style={fieldStyle}>
            <FieldLabel label="Default Application Number" required />
            <input
              type="text"
              name="default_application_number"
              value={formData.default_application_number || ''}
              onChange={onInputChange}
              placeholder="COM/2025/271"
              required
              style={inputStyle}
            />
            <p style={helpTextStyle}>
              Used as a fallback when a supporter does not provide an application number. Available in templates as {'{{application_number}}'}.
            </p>
          </div>
        </div>
      </FormSection>

      <FormSection 
        title="Testing Configuration" 
        description="Configure testing options to safely test submissions before going live."
      >
        <TestingConfigurationPanel
          testingEmail={formData.test_submission_email || ''}
          councilEmail={formData.council_email}
          onChange={(email) => {
            const syntheticEvent = {
              target: { name: 'test_submission_email', value: email, type: 'email' }
            } as ChangeEvent<HTMLInputElement>;
            onInputChange(syntheticEvent);
          }}
          prominent={true}
        />
      </FormSection>

      <WizardNavigation 
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!isValid}
        nextLabel="Continue to Templates"
      />
    </>
  );
}

// Step 3: Template Setup
interface Step3Props {
  formData: CreateProjectData;
  templateSetupMethod: TemplateSetupMethod;
  onTemplateSetupMethodChange: (method: TemplateSetupMethod) => void;
  onTemplateSelected: (templateType: 'cover' | 'grounds' | 'google_doc') => (value?: string) => void;
  onFormDataChange: (updates: Partial<CreateProjectData>) => void;
  onBack: () => void;
  onNext: () => void;
  isValid: boolean;
}

export function Step3TemplateSetup({ 
  formData, 
  templateSetupMethod, 
  onTemplateSetupMethodChange,
  onTemplateSelected,
  onFormDataChange,
  onBack, 
  onNext, 
  isValid 
}: Step3Props) {
  return (
    <>
      <FormSection title="Template Method" description="Choose how you want to set up your submission templates.">
        <TemplateSetupGuide 
          isDualTrack={formData.is_dual_track || false}
          currentMethod={templateSetupMethod}
          onMethodChange={onTemplateSetupMethodChange}
        />
      </FormSection>

      {/* Enhanced Template Configuration with Guided Upload Flow */}
      <FormSection title="Template Configuration" description="Configure your submission templates with guided workflow and progress tracking.">
        <TemplateUploadFlow
          isDualTrack={formData.is_dual_track || false}
          templateData={formData}
          templateSetupMethod={templateSetupMethod}
          onChange={onFormDataChange}
        />
        
        {/* Legacy Google Doc Template - Keep for backward compatibility */}
        <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <FieldLabel label="Legacy Google Doc Template (Optional)" />
          <TemplateSelector
            templateType="google_doc"
            selectedTemplateId={formData.google_doc_template_id || undefined}
            onTemplateSelected={onTemplateSelected('google_doc')}
            projectId={null}
            showAnalysis={false}
            allowUrlImport={templateSetupMethod === 'existing'}
            showUpload={templateSetupMethod === 'upload'}
            deprecated
          />
          <p style={helpTextStyle}>
            <strong>Deprecated:</strong> Legacy submission template. The new workflow above provides separate formal structure, email body, and grounds templates for better functionality.
          </p>
        </div>
      </FormSection>

      <WizardNavigation 
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!isValid}
        nextLabel="Continue to Action Network"
      />
    </>
  );
}

// Dual Track Template Configuration Sub-component
interface DualTrackTemplateConfigProps {
  formData: CreateProjectData;
  templateSetupMethod: TemplateSetupMethod;
  onTemplateSelected: (templateType: 'cover' | 'grounds' | 'google_doc') => (value?: string) => void;
  onFormDataChange: (updates: Partial<CreateProjectData>) => void;
}

function DualTrackTemplateConfiguration({ 
  formData, 
  templateSetupMethod, 
  onTemplateSelected,
  onFormDataChange 
}: DualTrackTemplateConfigProps) {
  return (
    <div style={{
      border: '2px solid #e0e7ff',
      borderRadius: '16px',
      padding: '24px',
      backgroundColor: '#f8faff',
    }}>
      <h4 style={{
        fontSize: '16px',
        fontWeight: 600,
        color: '#1e40af',
        margin: '0 0 16px 0',
      }}>
        Dual Track Template Configuration
      </h4>
      
      <div style={{ display: 'grid', gap: '20px' }}>
        <div style={fieldStyle}>
          <FieldLabel label="Comprehensive Track Template" />
          <p style={{...helpTextStyle, marginBottom: '8px'}}>
            Used for new supporters requiring the full submission flow.
          </p>
          {/* Use dual_track_config for comprehensive template */}
          <TemplateSelector
            templateType="grounds"
            selectedTemplateId={formData.dual_track_config?.original_grounds_template_id || undefined}
            onTemplateSelected={(templateId) => {
              onFormDataChange({
                dual_track_config: {
                  ...formData.dual_track_config!,
                  original_grounds_template_id: templateId || '',
                }
              });
            }}
            projectId={null}
            showAnalysis
            allowUrlImport={templateSetupMethod === 'existing'}
            showUpload={templateSetupMethod === 'upload'}
          />
        </div>

        <div style={fieldStyle}>
          <FieldLabel label="Follow-up Track Template" />
          <p style={{...helpTextStyle, marginBottom: '8px'}}>
            Used for returning supporters adding follow-up comments.
          </p>
          <TemplateSelector
            templateType="grounds"
            selectedTemplateId={formData.dual_track_config?.followup_grounds_template_id || undefined}
            onTemplateSelected={(templateId) => {
              onFormDataChange({
                dual_track_config: {
                  ...formData.dual_track_config!,
                  followup_grounds_template_id: templateId || '',
                }
              });
            }}
            projectId={null}
            showAnalysis
            allowUrlImport={templateSetupMethod === 'existing'}
            showUpload={templateSetupMethod === 'upload'}
          />
        </div>
      </div>
    </div>
  );
}

// Step 4: Action Network Integration (Optional)
interface Step4Props {
  formData: CreateProjectData;
  actionNetworkEnabled: boolean;
  onActionNetworkEnabledChange: (enabled: boolean) => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFormDataChange: (updates: Partial<CreateProjectData>) => void;
  // Action Network data and handlers
  forms: ActionNetworkItem[];
  lists: ActionNetworkItem[];
  tags: ActionNetworkItem[];
  groups: ActionNetworkItem[];
  onRefreshForms: () => void;
  onRefreshLists: () => void;
  onRefreshTags: () => void;
  onRefreshGroups: () => void;
  loadingForms: boolean;
  loadingLists: boolean;
  loadingTags: boolean;
  loadingGroups: boolean;
  formsError: boolean;
  listsError: boolean;
  tagsError: boolean;
  groupsError: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function Step4ActionNetwork({ 
  formData,
  actionNetworkEnabled,
  onActionNetworkEnabledChange,
  onInputChange,
  onFormDataChange,
  forms,
  lists,
  tags,
  groups,
  onRefreshForms,
  onRefreshLists,
  onRefreshTags,
  onRefreshGroups,
  loadingForms,
  loadingLists,
  loadingTags,
  loadingGroups,
  formsError,
  listsError,
  tagsError,
  groupsError,
  onBack,
  onNext
}: Step4Props) {
  // Action Network helper functions (copied from original)
  const AN_FORM_PREFIX = 'https://actionnetwork.org/api/v2/forms/';
  const AN_LIST_PREFIX = 'https://actionnetwork.org/api/v2/lists/';
  const AN_TAG_PREFIX = 'https://actionnetwork.org/api/v2/tags/';
  const AN_GROUP_PREFIX = 'https://actionnetwork.org/api/v2/groups/';

  const extractIdFromHref = (href: string | undefined, prefix: string) => {
    if (!href) return '';
    if (href.startsWith(prefix)) return href.slice(prefix.length);
    const parts = href.split('/');
    return parts[parts.length - 1] || '';
  };

  const getSelectableValue = (item: ActionNetworkItem, prefix: string) => {
    const primary = item.id ?? '';
    if (primary) return primary;
    return extractIdFromHref(item.href, prefix);
  };

  const selectedFormId = extractIdFromHref(formData.action_network_config?.action_url, AN_FORM_PREFIX);

  return (
    <>
      <FormSection 
        title="Action Network Integration"
        description="Connect with Action Network to automatically manage supporters and track submissions."
      >
        <ActionNetworkOptionalPanel 
          enabled={actionNetworkEnabled}
          onEnabledChange={onActionNetworkEnabledChange}
        />
        
        {actionNetworkEnabled && (
          <ActionNetworkTestFirst
            apiKey={formData.action_network_api_key}
            onApiKeyChange={(apiKey) => {
              const syntheticEvent = {
                target: { name: 'action_network_api_key', value: apiKey, type: 'password' }
              } as ChangeEvent<HTMLInputElement>;
              onInputChange(syntheticEvent);
            }}
            onTestSuccess={(resources) => {
              // Handle successful test - resources discovered
              console.log('Action Network resources discovered:', resources);
            }}
            selectedConfig={formData.action_network_config}
            onConfigChange={(config) => {
              onFormDataChange({
                action_network_config: config,
              });
            }}
          />
        )}
      </FormSection>

      <WizardNavigation 
        onBack={onBack}
        onNext={onNext}
        nextLabel="Continue to Review"
      />
    </>
  );
}

// Step 5: Review & Launch
interface Step5Props {
  formData: CreateProjectData;
  onBack: () => void;
  onCreateProject: () => void;
  isCreating: boolean;
}

export function Step5ReviewLaunch({ formData, onBack, onCreateProject, isCreating }: Step5Props) {
  const testingMode = Boolean(formData.test_submission_email);
  
  return (
    <>
      <FormSection title="Project Summary" description="Review your complete project configuration before creating.">
        <ProjectSummaryPanel 
          formData={formData} 
          testingMode={testingMode}
        />
      </FormSection>

      <FormSection title="Pre-Launch Checklist" description="Verify all requirements are met before creating your project.">
        <PreLaunchChecklist formData={formData} />
      </FormSection>

      <WizardNavigation 
        onBack={onBack}
        onCreateLive={onCreateProject}
        isLastStep={true}
        isCreating={isCreating}
      />
    </>
  );
}

