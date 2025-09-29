import { useState, useEffect, type CSSProperties } from 'react';
import { InfoPanel } from './ui/panels';

interface EmailBodyEditorProps {
  value?: string;
  onChange: (content: string) => void;
  title?: string;
  description?: string;
  placeholder?: string;
  showMergeFields?: boolean;
  disabled?: boolean;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const editorContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: '200px',
  padding: '16px',
  borderRadius: '12px',
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  fontSize: '14px',
  color: '#111827',
  lineHeight: 1.6,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  resize: 'vertical',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
};

const textareaFocusStyle: CSSProperties = {
  ...textareaStyle,
  borderColor: '#3b82f6',
  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
};

const mergeFieldsStyle: CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '12px',
  fontSize: '12px',
};

const mergeFieldsTitleStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '8px',
};

const mergeFieldsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '8px',
};

const mergeFieldButtonStyle: CSSProperties = {
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#475569',
  fontSize: '11px',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const mergeFieldButtonHoverStyle: CSSProperties = {
  ...mergeFieldButtonStyle,
  backgroundColor: '#f1f5f9',
  borderColor: '#94a3b8',
};

const characterCountStyle: CSSProperties = {
  fontSize: '11px',
  color: '#6b7280',
  textAlign: 'right',
  marginTop: '4px',
};

const defaultEmailTemplate = `Dear {{council_name}},

Please find attached the development application submission for {{site_address}}.

Applicant: {{applicant_full_name}}
Email: {{applicant_email}}
{{application_number_line}}

Kind regards,
{{sender_name}}`;

const MERGE_FIELDS = [
  { field: '{{council_name}}', description: 'Council name from project config' },
  { field: '{{applicant_full_name}}', description: 'Full name of applicant' },
  { field: '{{applicant_first_name}}', description: 'First name only' },
  { field: '{{applicant_last_name}}', description: 'Last name only' },
  { field: '{{applicant_email}}', description: 'Applicant email address' },
  { field: '{{site_address}}', description: 'Property/site address' },
  { field: '{{application_number}}', description: 'DA application number' },
  { field: '{{application_number_line}}', description: 'Application number with label' },
  { field: '{{submission_date}}', description: 'Date of submission' },
  { field: '{{sender_name}}', description: 'Organization/sender name' },
  { field: '{{project_name}}', description: 'Project name' },
];

export function EmailBodyEditor({
  value = '',
  onChange,
  title = 'Email Body Template',
  description = 'The content of the email sent to council when submitting documents',
  placeholder,
  showMergeFields = true,
  disabled = false,
}: EmailBodyEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleUseDefault = () => {
    handleChange(defaultEmailTemplate);
  };

  const insertMergeField = (field: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = localValue.substring(0, start) + field + localValue.substring(end);
      handleChange(newValue);
      
      // Restore cursor position after the inserted field
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + field.length, start + field.length);
      }, 10);
    } else {
      // Fallback: append to end
      handleChange(localValue + field);
    }
  };

  return (
    <div style={containerStyle}>
      <div>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#111827',
          margin: '0 0 8px 0',
        }}>
          {title}
        </h4>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: '0 0 16px 0',
          lineHeight: 1.5,
        }}>
          {description}
        </p>
      </div>

      <div style={editorContainerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
          }}>
            Email Content
          </label>
          <button
            type="button"
            onClick={handleUseDefault}
            disabled={disabled}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              fontSize: '12px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
            }}
          >
            Use Default Template
          </button>
        </div>

        <textarea
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || 'Enter email body content with merge fields...'}
          disabled={disabled}
          style={isFocused ? textareaFocusStyle : textareaStyle}
        />

        <div style={characterCountStyle}>
          {localValue.length} characters
        </div>
      </div>

      {showMergeFields && (
        <div style={mergeFieldsStyle}>
          <div style={mergeFieldsTitleStyle}>
            Available Merge Fields (click to insert)
          </div>
          <div style={mergeFieldsGridStyle}>
            {MERGE_FIELDS.map((item) => (
              <button
                key={item.field}
                type="button"
                onClick={() => insertMergeField(item.field)}
                disabled={disabled}
                style={mergeFieldButtonStyle}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    Object.assign(e.currentTarget.style, mergeFieldButtonHoverStyle);
                  }
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, mergeFieldButtonStyle);
                }}
                title={item.description}
              >
                {item.field}
              </button>
            ))}
          </div>
        </div>
      )}

      <InfoPanel 
        title="Email Template Usage"
        variant="info"
      >
        <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: 1.5 }}>
          This template becomes the body of emails sent to council when submissions are processed.
          Merge fields will be automatically replaced with actual values from each submission.
        </p>
        <ul style={{ 
          margin: '0', 
          paddingLeft: '16px', 
          fontSize: '12px', 
          lineHeight: 1.4,
          color: '#6b7280' 
        }}>
          <li>Use merge fields like <code>{'{{applicant_full_name}}'}</code> for dynamic content</li>
          <li>Keep formatting simple - this becomes plain text email content</li>
          <li>Test with a sample submission to verify merge field replacement</li>
        </ul>
      </InfoPanel>
    </div>
  );
}
