import { type CSSProperties } from 'react';
import { ChoiceCard } from './Wizard';

// Template setup method types
export type TemplateSetupMethod = 'upload' | 'existing' | 'defaults';

interface TemplateSetupGuideProps {
  isDualTrack: boolean;
  currentMethod: TemplateSetupMethod;
  onMethodChange: (method: TemplateSetupMethod) => void;
}

// Icons for template setup methods
const UploadIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const LinkIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

const DefaultIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <circle cx="12" cy="15" r="3"/>
    <path d="M12 12v3"/>
  </svg>
);

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const titleStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#111827',
  margin: 0,
};

const methodGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '20px',
};

const explainerStyle: CSSProperties = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fcd34d',
  borderRadius: '12px',
  padding: '20px',
  marginTop: '20px',
};

const explainerTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#92400e',
  margin: '0 0 12px 0',
};

const explainerTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#92400e',
  margin: 0,
  lineHeight: 1.5,
};

const templateRequirementStyle: CSSProperties = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: '12px',
  padding: '16px',
  marginTop: '16px',
};

const requirementTitleStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#0c4a6e',
  margin: '0 0 8px 0',
};

const requirementListStyle: CSSProperties = {
  margin: '8px 0 0 0',
  paddingLeft: '16px',
  color: '#075985',
  fontSize: '13px',
  lineHeight: 1.5,
};

export function TemplateSetupGuide({ 
  isDualTrack, 
  currentMethod, 
  onMethodChange 
}: TemplateSetupGuideProps) {
  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>How do you want to set up submission templates?</h3>
      
      <div style={methodGridStyle}>
        <ChoiceCard
          selected={currentMethod === 'upload'}
          onClick={() => onMethodChange('upload')}
          title="Upload New Templates"
          description="I have Word docs to upload or will create new Google Docs. This is the most flexible approach for custom templates."
          icon={<UploadIcon />}
          recommended={true}
        />
        
        <ChoiceCard
          selected={currentMethod === 'existing'}
          onClick={() => onMethodChange('existing')}
          title="Use Existing Google Docs"
          description="I already have Google Doc templates ready and know their IDs. Perfect if templates are already created and tested."
          icon={<LinkIcon />}
        />
        
        <ChoiceCard
          selected={currentMethod === 'defaults'}
          onClick={() => onMethodChange('defaults')}
          title="Use Default Templates"
          description="Start with Gold Coast Council templates as a foundation. You can customize them later as needed."
          icon={<DefaultIcon />}
        />
      </div>
      
      {isDualTrack && (
        <DualTrackTemplateExplainer method={currentMethod} />
      )}
      
      <TemplateRequirementPanel method={currentMethod} isDualTrack={isDualTrack} />
    </div>
  );
}

interface DualTrackTemplateExplainerProps {
  method: TemplateSetupMethod;
}

function DualTrackTemplateExplainer({ method }: DualTrackTemplateExplainerProps) {
  const getExplainerContent = () => {
    switch (method) {
      case 'upload':
        return {
          title: 'Dual Track Template Upload Requirements',
          content: 'You will need to upload TWO different grounds templates: one comprehensive template for new submitters, and one concise template for follow-up submissions.'
        };
      case 'existing':
        return {
          title: 'Dual Track Google Doc Requirements',
          content: 'You will need TWO Google Doc IDs: one for the comprehensive submission template and one for the follow-up template. Make sure both documents are accessible.'
        };
      case 'defaults':
        return {
          title: 'Dual Track Default Templates',
          content: 'We will set up both comprehensive and follow-up templates using Gold Coast Council defaults. You can customize these later to match your specific needs.'
        };
    }
  };

  const { title, content } = getExplainerContent();

  return (
    <div style={explainerStyle}>
      <h4 style={explainerTitleStyle}>{title}</h4>
      <p style={explainerTextStyle}>{content}</p>
    </div>
  );
}

interface TemplateRequirementPanelProps {
  method: TemplateSetupMethod;
  isDualTrack: boolean;
}

function TemplateRequirementPanel({ method, isDualTrack }: TemplateRequirementPanelProps) {
  const getRequirements = () => {
    const baseRequirements = [
      'Cover letter template (for email attachments)',
    ];
    
    if (isDualTrack) {
      baseRequirements.push(
        'Comprehensive grounds template (for new submitters)',
        'Follow-up grounds template (for returning submitters)'
      );
    } else {
      baseRequirements.push('Grounds submission template');
    }

    return baseRequirements;
  };

  const getMethodSpecificInfo = () => {
    switch (method) {
      case 'upload':
        return 'You can upload Word documents (.doc, .docx) or PDF files. We will process them and make them available for template generation.';
      case 'existing':
        return 'Ensure your Google Docs are publicly accessible or shared with the service account. You will need the document ID from each Google Doc URL.';
      case 'defaults':
        return 'We will automatically configure templates based on Gold Coast Council formats. These can be customized later through the template management system.';
    }
  };

  return (
    <div style={templateRequirementStyle}>
      <h4 style={requirementTitleStyle}>Template Requirements</h4>
      <p style={{ fontSize: '13px', color: '#075985', margin: '0 0 8px 0' }}>
        {getMethodSpecificInfo()}
      </p>
      
      <p style={requirementTitleStyle}>You will need:</p>
      <ul style={requirementListStyle}>
        {getRequirements().map((requirement, index) => (
          <li key={index}>{requirement}</li>
        ))}
      </ul>
    </div>
  );
}
