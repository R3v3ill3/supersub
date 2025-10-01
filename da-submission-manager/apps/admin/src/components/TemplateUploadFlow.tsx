import React, { useState, useEffect, type CSSProperties } from 'react';
import { CheckCircle2, XCircle, Clock, Circle, CircleDashed, FileText, Rocket, CheckCircle } from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';
import { EmailBodyEditor } from './EmailBodyEditor';
import { GoldCoastDefaultSelector } from './GoldCoastDefaultSelector';
import { api, type CreateProjectData } from '../lib/api';
import type { TemplateSetupMethod } from './TemplateSetupGuide';

// Enhanced Template Upload Flow Component
// Provides guided workflow with clear explanations and progress tracking

interface TemplateUploadFlowProps {
  isDualTrack: boolean;
  templateData: CreateProjectData;
  projectId: string | null;
  templateSetupMethod: TemplateSetupMethod;
  onChange: (updates: Partial<CreateProjectData>) => void;
}

interface UploadProgress {
  cover: 'pending' | 'uploading' | 'success' | 'error';
  grounds: 'pending' | 'uploading' | 'success' | 'error';
  originalGrounds?: 'pending' | 'uploading' | 'success' | 'error';
  followupGrounds?: 'pending' | 'uploading' | 'success' | 'error';
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '32px',
};

const explainerStyle: CSSProperties = {
  backgroundColor: '#f0f9ff',
  border: '2px solid #bae6fd',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '24px',
};

const explainerTitleStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#0c4a6e',
  margin: '0 0 16px 0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const explainerTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#075985',
  lineHeight: 1.6,
  margin: '0 0 16px 0',
};

const stepContainerStyle: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  overflow: 'hidden',
};

const stepHeaderStyle: CSSProperties = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderBottom: '1px solid #e5e7eb',
};

const stepTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#111827',
  margin: '0 0 8px 0',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const stepDescriptionStyle: CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: 0,
  lineHeight: 1.5,
};

const stepContentStyle: CSSProperties = {
  padding: '24px',
};

const progressBarContainerStyle: CSSProperties = {
  backgroundColor: '#f3f4f6',
  borderRadius: '12px',
  padding: '20px',
  marginTop: '24px',
};

const progressBarStyle: CSSProperties = {
  width: '100%',
  height: '8px',
  backgroundColor: '#e5e7eb',
  borderRadius: '4px',
  overflow: 'hidden',
  marginBottom: '12px',
};

const progressFillStyle = (progress: number): CSSProperties => ({
  height: '100%',
  width: `${progress}%`,
  backgroundColor: '#10b981',
  transition: 'width 0.3s ease',
});

const progressTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  fontWeight: 500,
  textAlign: 'center',
};

const successPanelStyle: CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #bbf7d0',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center',
  marginTop: '16px',
};

const successButtonStyle: CSSProperties = {
  padding: '12px 24px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#10b981',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '12px',
};

const infoBoxStyle: CSSProperties = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fcd34d',
  borderRadius: '12px',
  padding: '16px',
  marginTop: '16px',
};

const infoBoxTitleStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#92400e',
  margin: '0 0 8px 0',
};

const infoBoxTextStyle: CSSProperties = {
  fontSize: '13px',
  color: '#92400e',
  margin: 0,
  lineHeight: 1.5,
};

export function TemplateUploadFlow({ 
  isDualTrack, 
  templateData,
  projectId,
  templateSetupMethod,
  onChange 
}: TemplateUploadFlowProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    cover: 'pending',
    grounds: 'pending',
    ...(isDualTrack && {
      originalGrounds: 'pending',
      followupGrounds: 'pending'
    })
  });
  
  const [selectedDefaultType, setSelectedDefaultType] = useState<'none' | 'gold_coast' | 'custom'>(
    templateData.council_name === 'Gold Coast City Council' ? 'gold_coast' : 'none'
  );

  const handleDualTrackTemplateChange = (field: 'original_grounds_template_id' | 'followup_grounds_template_id') => 
    (templateId?: string) => {
      onChange({
        dual_track_config: {
          ...templateData.dual_track_config!,
          [field]: templateId || '',
        }
      });
    };

  const getUploadedTemplates = (data: CreateProjectData) => {
    const templates: Record<string, string> = {};
    // Track formal structure selection
    if (selectedDefaultType !== 'none') templates.formalStructure = selectedDefaultType;
    if (data.council_email_body_template) templates.emailBody = data.council_email_body_template;
    if (data.grounds_template_id) templates.grounds = data.grounds_template_id;
    if (data.dual_track_config?.original_grounds_template_id) 
      templates.originalGrounds = data.dual_track_config.original_grounds_template_id;
    if (data.dual_track_config?.followup_grounds_template_id) 
      templates.followupGrounds = data.dual_track_config.followup_grounds_template_id;
    return templates;
  };

  const handleAnalysisComplete = (results: any) => {
    // Handle AI analysis completion
    console.log('Analysis completed:', results);
  };

  return (
    <div style={containerStyle}>
      <TemplateUploadExplainer isDualTrack={isDualTrack} method={templateSetupMethod} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Step 1: Formal Submission Structure */}
        <TemplateUploadStep
          title="Formal Submission Structure"
          description="Choose the overall format and structure for generated submission documents"
          status={selectedDefaultType !== 'none' ? 'success' : 'pending'}
          required={false}
          stepNumber={1}
        >
          <GoldCoastDefaultSelector
            selectedDefault={selectedDefaultType}
            onDefaultSelected={setSelectedDefaultType}
            onFormDataChange={onChange}
          />
        </TemplateUploadStep>

        {/* Step 2: Email Body Template */}
        <TemplateUploadStep
          title="Email Body Template"
          description="Content of the email sent to council when submitting documents"
          status={templateData.council_email_body_template ? 'success' : 'pending'}
          required={true}
          stepNumber={2}
        >
          <EmailBodyEditor
            value={templateData.council_email_body_template || ''}
            onChange={(content) => onChange({ council_email_body_template: content })}
            title="Council Email Body"
            description="This content will be sent as the email body when submitting to council"
            showMergeFields={true}
          />
        </TemplateUploadStep>
        
        {/* Step 3: Grounds Templates */}
        {isDualTrack ? (
          <DualTrackGroundsUpload 
            originalTemplate={templateData.dual_track_config?.original_grounds_template_id}
            followupTemplate={templateData.dual_track_config?.followup_grounds_template_id}
            projectId={projectId}
            templateSetupMethod={templateSetupMethod}
            onChange={handleDualTrackTemplateChange}
            progress={uploadProgress}
          />
        ) : (
          <SingleTrackGroundsUpload 
            groundsTemplate={templateData.grounds_template_id}
            projectId={projectId}
            templateSetupMethod={templateSetupMethod}
            onChange={(id) => onChange({ grounds_template_id: id })}
            progress={uploadProgress.grounds}
          />
        )}
      </div>
      
      {/* Progress Tracking */}
      <TemplateUploadProgress 
        templates={getUploadedTemplates(templateData)}
        isDualTrack={isDualTrack}
        onAllComplete={() => console.log('All templates completed')}
      />
      
      {/* AI Analysis Option */}
      <TemplateAnalysisOption
        templates={getUploadedTemplates(templateData)}
        uploadProgress={uploadProgress}
        projectId={projectId}
        onAnalysisComplete={handleAnalysisComplete}
      />
    </div>
  );
}

// Template Upload Explainer Component
interface TemplateUploadExplainerProps {
  isDualTrack: boolean;
  method: TemplateSetupMethod;
}

function TemplateUploadExplainer({ isDualTrack, method }: TemplateUploadExplainerProps) {
  const getMethodTitle = () => {
    switch (method) {
      case 'upload': return 'Upload Template Files';
      case 'existing': return 'Link Existing Google Docs';
      case 'defaults': return 'Configure Default Templates';
    }
  };

  const getMethodDescription = () => {
    switch (method) {
      case 'upload': 
        return 'Upload your Word documents or other template files. We\'ll process them and make them available for submission generation.';
      case 'existing':
        return 'Provide Google Doc URLs or IDs for your existing templates. Make sure they\'re publicly accessible.';
      case 'defaults':
        return 'We\'ll set up proven Gold Coast Council templates that you can customize later.';
    }
  };

  return (
    <div style={explainerStyle}>
      <h3 style={explainerTitleStyle}>
        <FileText size={20} style={{ marginRight: '8px', flexShrink: 0 }} />
        {getMethodTitle()}
      </h3>
      <p style={explainerTextStyle}>
        {getMethodDescription()}
      </p>
      
      {isDualTrack && (
        <>
          <h4 style={infoBoxTitleStyle}>Dual Track Templates Required:</h4>
          <ul style={{ ...explainerTextStyle, paddingLeft: '20px', margin: '8px 0 0 0' }}>
            <li><strong>Email Body:</strong> Content of email sent to council with attachments</li>
            <li><strong>Comprehensive Track:</strong> Template from first submission period</li>
            <li><strong>Follow-up Track:</strong> Template for new concerns/changes</li>
          </ul>
          
          <div style={infoBoxStyle}>
            <div style={infoBoxTitleStyle}>How it works:</div>
            <ul style={{ ...infoBoxTextStyle, paddingLeft: '16px', margin: '8px 0 0 0' }}>
              <li>Returning users get follow-up template only</li>
              <li>New users get combined comprehensive + follow-up template</li>
              <li>AI automatically combines templates for new users</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// Template Upload Step Component
interface TemplateUploadStepProps {
  title: string;
  description: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  required?: boolean;
  stepNumber?: number;
  children: React.ReactNode;
}

function TemplateUploadStep({
  title,
  description,
  status,
  required = false,
  stepNumber,
  children
}: TemplateUploadStepProps) {
  const getStatusIcon = () => {
    const iconSize = 20;
    switch (status) {
      case 'success': return <CheckCircle2 size={iconSize} />;
      case 'error': return <XCircle size={iconSize} />;
      case 'uploading': return <Clock size={iconSize} />;
      default: return required ? <Circle size={iconSize} /> : <CircleDashed size={iconSize} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'uploading': return '#f59e0b';
      default: return required ? '#ef4444' : '#6b7280';
    }
  };

  return (
    <div style={stepContainerStyle}>
      <div style={stepHeaderStyle}>
        <h4 style={stepTitleStyle}>
          <span style={{
            color: getStatusColor(),
            marginRight: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}>
            {stepNumber && <span>{stepNumber}.</span>}
            {getStatusIcon()}
          </span>
          {title}
          {required && <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '8px' }}>(Required)</span>}
        </h4>
        <p style={stepDescriptionStyle}>{description}</p>
      </div>
      <div style={stepContentStyle}>
        {children}
      </div>
    </div>
  );
}

// Dual Track Grounds Upload Component
interface DualTrackGroundsUploadProps {
  originalTemplate?: string;
  followupTemplate?: string;
  projectId: string | null;
  templateSetupMethod: TemplateSetupMethod;
  onChange: (field: 'original_grounds_template_id' | 'followup_grounds_template_id') => (templateId?: string) => void;
  progress: UploadProgress;
}

function DualTrackGroundsUpload({ 
  originalTemplate, 
  followupTemplate,
  projectId,
  templateSetupMethod,
  onChange, 
  progress 
}: DualTrackGroundsUploadProps) {
  return (
    <>
        <TemplateUploadStep
          title="Comprehensive Track Template"
          description="Used for new supporters requiring the full submission flow"
          status={progress.originalGrounds || 'pending'}
          required={true}
          stepNumber={3}
      >
        <TemplateSelector
          templateType="grounds"
          selectedTemplateId={originalTemplate}
          onTemplateSelected={onChange('original_grounds_template_id')}
          projectId={projectId}
          showUpload={templateSetupMethod === 'upload'}
          showPreview={true}
          showAnalysis={true}
          allowUrlImport={templateSetupMethod === 'existing'}
        />
      </TemplateUploadStep>

        <TemplateUploadStep
          title="Follow-up Track Template"
          description="Used for returning supporters adding follow-up comments"
          status={progress.followupGrounds || 'pending'}
          required={true}
          stepNumber={4}
      >
        <TemplateSelector
          templateType="grounds"
          selectedTemplateId={followupTemplate}
          onTemplateSelected={onChange('followup_grounds_template_id')}
          projectId={projectId}
          showUpload={templateSetupMethod === 'upload'}
          showPreview={true}
          showAnalysis={true}
          allowUrlImport={templateSetupMethod === 'existing'}
        />
      </TemplateUploadStep>
    </>
  );
}

// Single Track Grounds Upload Component
interface SingleTrackGroundsUploadProps {
  groundsTemplate?: string;
  projectId: string | null;
  templateSetupMethod: TemplateSetupMethod;
  onChange: (templateId?: string) => void;
  progress: 'pending' | 'uploading' | 'success' | 'error';
}

function SingleTrackGroundsUpload({ 
  groundsTemplate,
  projectId,
  templateSetupMethod,
  onChange, 
  progress 
}: SingleTrackGroundsUploadProps) {
  return (
      <TemplateUploadStep
        title="Grounds for Submission Template"
        description="Main submission content template for supporters"
        status={progress}
        required={true}
        stepNumber={3}
    >
      <TemplateSelector
        templateType="grounds"
        selectedTemplateId={groundsTemplate}
        onTemplateSelected={onChange}
        projectId={projectId}
        showUpload={templateSetupMethod === 'upload'}
        showPreview={true}
        showAnalysis={true}
        allowUrlImport={templateSetupMethod === 'existing'}
      />
    </TemplateUploadStep>
  );
}

// Template Upload Progress Component
interface TemplateUploadProgressProps {
  templates: Record<string, string>;
  isDualTrack: boolean;
  onAllComplete: () => void;
}

function TemplateUploadProgress({ 
  templates, 
  isDualTrack, 
  onAllComplete 
}: TemplateUploadProgressProps) {
  const requiredTemplates = isDualTrack 
    ? ['formalStructure', 'emailBody', 'originalGrounds', 'followupGrounds']
    : ['formalStructure', 'emailBody', 'grounds'];
    
  const completedTemplates = requiredTemplates.filter(
    template => Boolean(templates[template])
  );
  
  const progress = (completedTemplates.length / requiredTemplates.length) * 100;
  
  return (
    <div style={progressBarContainerStyle}>
      <div style={progressBarStyle}>
        <div style={progressFillStyle(progress)} />
      </div>
      <div style={progressTextStyle}>
        {completedTemplates.length} of {requiredTemplates.length} templates configured
      </div>
      
      {progress === 100 && (
        <div style={successPanelStyle}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#166534', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={20} />
            All templates configured!
          </div>
          <p style={{ fontSize: '14px', color: '#166534', margin: '0 0 12px 0' }}>
            Your templates are ready. You can continue to the next step or run AI analysis.
          </p>
          <button style={successButtonStyle} onClick={onAllComplete}>
            Continue to Next Step
          </button>
        </div>
      )}
    </div>
  );
}

// Template Analysis Option Component
interface TemplateAnalysisOptionProps {
  templates: Record<string, string>;
  uploadProgress: UploadProgress;
  projectId: string | null;
  onAnalysisComplete: (results: any) => void;
}

function TemplateAnalysisOption({ templates, uploadProgress, projectId, onAnalysisComplete }: TemplateAnalysisOptionProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [hasFiles, setHasFiles] = useState(false);

  // Check if any template files exist for this project
  useEffect(() => {
    if (!projectId) return;

    api.templates.listFiles(projectId)
      .then(response => {
        const files = response.data?.files || [];
        setHasFiles(files.length > 0);
      })
      .catch(error => {
        console.error('Failed to check for template files:', error);
      });
  }, [projectId, uploadProgress]); // Re-check when uploadProgress changes

  if (!hasFiles || !projectId) {
    return null;
  }

  const handleRunAnalysis = async () => {
    if (!projectId) {
      alert('Project ID is required for analysis');
      return;
    }

    setAnalyzing(true);
    try {
      // Call the new analyze-file endpoint
      const response = await api.templates.analyzeFile({
        projectId,
        templateType: 'grounds',
        version: 'v1'
      });

      const analysisData = response.data?.data;

      if (analysisData?.analysis) {
        const concernCount = analysisData.analysis.extractedConcerns?.length || 0;
        const savedCount = analysisData.savedConcerns?.length || 0;

        alert(
          `✅ Analysis Complete!\n\n` +
          `Extracted ${concernCount} concerns from your grounds template.\n` +
          `${savedCount > 0 ? `Saved ${savedCount} concerns to survey database.` : 'Concerns available for review.'}\n\n` +
          `These will be used to generate the survey for community members.`
        );

        onAnalysisComplete({
          success: true,
          concernsExtracted: concernCount,
          concernsSaved: savedCount,
          analysis: analysisData.analysis
        });
      } else {
        alert('Analysis completed but no data returned');
        onAnalysisComplete({ success: true });
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`❌ Analysis Failed\n\n${errorMessage}\n\nMake sure you've uploaded a grounds template first.`);
      onAnalysisComplete({ success: false, error: errorMessage });
    } finally {
      setAnalyzing(false);
    }
  };

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
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        🤖 AI Template Analysis
      </h4>
      
      <p style={{
        fontSize: '14px',
        color: '#1e40af',
        margin: '0 0 16px 0',
        lineHeight: 1.5,
      }}>
        Analyze your grounds templates to extract concerns and generate survey suggestions automatically.
        This helps create a more comprehensive submission form.
      </p>
      
      <button 
        style={{
          padding: '12px 20px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: analyzing ? '#9ca3af' : '#1e40af',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: analyzing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        onClick={handleRunAnalysis}
        disabled={analyzing}
      >
        {analyzing ? (
          <>
            <Clock size={16} />
            Analyzing Templates...
          </>
        ) : (
          <>
            <Rocket size={16} />
            Run AI Analysis
          </>
        )}
      </button>
    </div>
  );
}
