import type { CSSProperties, ChangeEvent } from 'react';
import { TemplateSelector } from './TemplateSelector';
import type { DualTrackConfig } from '../lib/api';

interface DualTrackConfigurationProps {
  enabled: boolean;
  config: DualTrackConfig;
  onEnabledChange: (enabled: boolean) => void;
  onConfigChange: (config: DualTrackConfig) => void;
  availableTemplates?: Array<{ id: string; name: string }>;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const toggleCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#f9fafb',
};

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
};

const toggleLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: '15px',
  color: '#111827',
  fontWeight: 600,
};

const checkboxStyle: CSSProperties = {
  width: '18px',
  height: '18px',
  accentColor: '#2563eb',
};

const helperTextStyle: CSSProperties = {
  fontSize: '13px',
  lineHeight: 1.6,
  color: '#4b5563',
  margin: 0,
};

const cardsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '20px',
};

const cardStyle: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '14px',
  padding: '20px',
  backgroundColor: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const cardTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#111827',
  margin: 0,
};

const fieldLabelStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#1f2937',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  fontSize: '14px',
  color: '#111827',
  outline: 'none',
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: '120px',
  resize: 'vertical',
  lineHeight: 1.5,
};

const previewContainerStyle: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '24px',
  backgroundColor: '#f9fafb',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const previewHeadingStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#111827',
  margin: 0,
};

const previewGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
};

const previewCardStyle: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '18px',
  backgroundColor: '#ffffff',
};

const previewCardTitleStyle: CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#1f2937',
  margin: 0,
};

const previewCardBodyStyle: CSSProperties = {
  marginTop: '10px',
  fontSize: '13px',
  lineHeight: 1.6,
  color: '#4b5563',
};

export function DualTrackConfiguration({
  enabled,
  config,
  onEnabledChange,
  onConfigChange,
  availableTemplates = [],
}: DualTrackConfigurationProps) {
  const handlePromptChange = (event: ChangeEvent<HTMLInputElement>) => {
    onConfigChange({
      ...config,
      track_selection_prompt: event.target.value,
    });
  };

  const handleDescriptionChange = (track: 'followup' | 'comprehensive') =>
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onConfigChange({
        ...config,
        track_descriptions: {
          ...config.track_descriptions,
          [track]: event.target.value,
        },
      });
    };

  const renderTemplateSelector = (
    value: string,
    onChange: (next: string) => void
  ) => {
    if (availableTemplates.length > 0) {
      return (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={inputStyle}
        >
          <option value="">Select template…</option>
          {availableTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      );
    }

    return (
      <TemplateSelector
        templateType="grounds"
        selectedTemplateId={value || undefined}
        onTemplateSelected={(templateId) => onChange(templateId || '')}
        projectId={null}
        showUpload
        showPreview
      />
    );
  };

  return (
    <div style={containerStyle}>
      <div style={toggleCardStyle}>
        <div style={toggleRowStyle}>
          <div>
            <p style={{ ...cardTitleStyle, fontSize: '17px' }}>Dual track submissions</p>
            <p style={helperTextStyle}>
              When enabled, supporters can choose between a concise follow-up option and the comprehensive submission pathway.
            </p>
          </div>
          <label htmlFor="dual_track_toggle" style={toggleLabelStyle}>
            <input
              id="dual_track_toggle"
              type="checkbox"
              checked={enabled}
              onChange={(event) => onEnabledChange(event.target.checked)}
              style={checkboxStyle}
            />
            Enable dual track
          </label>
        </div>
        <p style={helperTextStyle}>
          Follow-up submissions are ideal for returning supporters who only need to provide updates, while comprehensive submissions guide brand new supporters.
        </p>
      </div>

      {enabled ? (
        <>
          <div style={cardsGridStyle}>
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Template Configuration</h3>
              <div>
                <p style={fieldLabelStyle}>Comprehensive Track Template</p>
                <p style={helperTextStyle}>Used for new supporters requiring the full submission flow.</p>
                {renderTemplateSelector(config.original_grounds_template_id, (id) =>
                  onConfigChange({
                    ...config,
                    original_grounds_template_id: id,
                  })
                )}
              </div>
              <div>
                <p style={fieldLabelStyle}>Follow-up Track Template</p>
                <p style={helperTextStyle}>Used for returning supporters adding follow-up comments.</p>
                {renderTemplateSelector(config.followup_grounds_template_id, (id) =>
                  onConfigChange({
                    ...config,
                    followup_grounds_template_id: id,
                  })
                )}
              </div>
            </div>

            <div style={{ ...cardStyle, gap: '12px' }}>
              <h3 style={cardTitleStyle}>User Experience Configuration</h3>
              <div>
                <p style={fieldLabelStyle}>Track Selection Question</p>
                <input
                  type="text"
                  value={config.track_selection_prompt}
                  onChange={handlePromptChange}
                  style={inputStyle}
                  placeholder="Have you previously submitted on this development?"
                />
              </div>
              <div>
                <p style={fieldLabelStyle}>Follow-up Track Description</p>
                <textarea
                  value={config.track_descriptions.followup}
                  onChange={handleDescriptionChange('followup')}
                  style={textareaStyle}
                  placeholder="I submitted in the previous round and want to add follow-up comments"
                />
              </div>
              <div>
                <p style={fieldLabelStyle}>Comprehensive Track Description</p>
                <textarea
                  value={config.track_descriptions.comprehensive}
                  onChange={handleDescriptionChange('comprehensive')}
                  style={textareaStyle}
                  placeholder="This is my first submission on this development"
                />
              </div>
            </div>
          </div>

          <DualTrackPreview config={config} />
        </>
      ) : null}
    </div>
  );
}

export function getDefaultDualTrackConfig(): DualTrackConfig {
  return {
    original_grounds_template_id: '',
    followup_grounds_template_id: '',
    track_selection_prompt: 'Have you previously submitted on this development?',
    track_descriptions: {
      followup: 'I submitted in the previous round and want to add follow-up comments',
      comprehensive: 'This is my first submission on this development',
    },
  };
}

export function validateDualTrackConfig(config: DualTrackConfig): string[] {
  const errors: string[] = [];

  if (!config.original_grounds_template_id) {
    errors.push('Comprehensive track template is required');
  }
  if (!config.followup_grounds_template_id) {
    errors.push('Follow-up track template is required');
  }
  if (!config.track_selection_prompt.trim()) {
    errors.push('Track selection prompt is required');
  }
  if (!config.track_descriptions.followup.trim()) {
    errors.push('Follow-up track description is required');
  }
  if (!config.track_descriptions.comprehensive.trim()) {
    errors.push('Comprehensive track description is required');
  }

  return errors;
}

function DualTrackPreview({ config }: { config: DualTrackConfig }) {
  return (
    <div style={previewContainerStyle}>
      <h3 style={previewHeadingStyle}>Preview</h3>
      <div>
        <p style={fieldLabelStyle}>Track Selection Question</p>
        <p style={{ ...helperTextStyle, marginTop: '4px' }}>{config.track_selection_prompt}</p>
      </div>
      <div style={previewGridStyle}>
        <div style={previewCardStyle}>
          <h4 style={previewCardTitleStyle}>Follow-up Track</h4>
          <p style={previewCardBodyStyle}>{config.track_descriptions.followup}</p>
        </div>
        <div style={previewCardStyle}>
          <h4 style={previewCardTitleStyle}>Comprehensive Track</h4>
          <p style={previewCardBodyStyle}>{config.track_descriptions.comprehensive}</p>
        </div>
      </div>
    </div>
  );
}


