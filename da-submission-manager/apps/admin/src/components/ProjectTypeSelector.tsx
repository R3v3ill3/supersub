import { type CSSProperties } from 'react';
import { ChoiceCard } from './Wizard';

// Icons - using simple SVG components for dual track selection
const DocumentIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
);

interface ProjectTypeSelectorProps {
  isDualTrack: boolean;
  onChange: (isDualTrack: boolean) => void;
}

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
  marginBottom: '16px',
};

const choicesGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px',
};

export function ProjectTypeSelector({ isDualTrack, onChange }: ProjectTypeSelectorProps) {
  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>What type of submission project is this?</h3>
      
      <div style={choicesGridStyle}>
        <ChoiceCard
          selected={!isDualTrack}
          onClick={() => onChange(false)}
          title="Single Submission Period"
          description="Standard DA submission project where all supporters follow the same submission path. Suitable for most development applications."
          icon={<DocumentIcon />}
        />
        
        <ChoiceCard
          selected={isDualTrack}
          onClick={() => onChange(true)}
          title="Follow-up Submission Period"
          description="Users can choose between returning vs. new submitter paths. Perfect for consultation periods where some supporters are making follow-up submissions."
          icon={<RefreshIcon />}
          recommended={false}
        />
      </div>
      
      {isDualTrack && (
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '12px',
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#0c4a6e',
            margin: '0 0 8px 0',
          }}>
            Dual Track Configuration
          </h4>
          <p style={{
            fontSize: '13px',
            color: '#075985',
            margin: 0,
            lineHeight: 1.5,
          }}>
            With dual track enabled, supporters will be asked if they've previously submitted on this development. 
            This allows you to provide different templates and workflows for returning vs. first-time submitters.
          </p>
        </div>
      )}
    </div>
  );
}
