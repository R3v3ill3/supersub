import { useState, type CSSProperties } from 'react';
import type { CreateProjectData } from '../lib/api';

interface GoldCoastDefaultSelectorProps {
  selectedDefault: 'none' | 'gold_coast' | 'custom';
  onDefaultSelected: (defaultType: 'none' | 'gold_coast' | 'custom') => void;
  onFormDataChange: (updates: Partial<CreateProjectData>) => void;
  disabled?: boolean;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const optionCardStyle = (selected: boolean): CSSProperties => ({
  border: `2px solid ${selected ? '#3b82f6' : '#e5e7eb'}`,
  borderRadius: '12px',
  padding: '20px',
  backgroundColor: selected ? '#eff6ff' : '#ffffff',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
});

const optionTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#111827',
  margin: '0 0 8px 0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const optionDescriptionStyle: CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: 0,
  lineHeight: 1.5,
};

const badgeStyle: CSSProperties = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '4px 8px',
  borderRadius: '6px',
  marginLeft: 'auto',
};

const warningBadgeStyle: CSSProperties = {
  ...badgeStyle,
  backgroundColor: '#f59e0b',
};

const previewStyle: CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px',
  marginTop: '12px',
  fontSize: '12px',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  color: '#475569',
  lineHeight: 1.6,
  maxHeight: '200px',
  overflowY: 'auto',
};

const goldCoastSubmissionTemplate = `# Gold Coast Council - Development Application Submission Template

## Property Details
**Lot Number:** {{lot_number}}  
**Plan Number:** {{plan_number}}  
**Property Address:** {{site_address}}  
**Application Number:** {{application_number}}

## Submitter Details  
**First Name:** {{applicant_first_name}}  
**Surname:** {{applicant_last_name}}  

**Residential Address:**  
{{applicant_residential_address}}  
{{applicant_suburb}} {{applicant_state}} {{applicant_postcode}}  
**Email Address:** {{applicant_email}}

## Postal Address
{{#if postal_address_same}}
**Postal Address:** Same as residential address above
{{else}}
**Postal Address:**  
{{applicant_postal_address}}  
{{postal_suburb}} {{postal_state}} {{postal_postcode}}  
**Email Address:** {{postal_email}}
{{/if}}

## Submission Details
**Position on Development Application:** **OBJECTING**

### Grounds of Submission
{{grounds_content}}

The above grounds focus on planning issues and demonstrate how the proposed development is inconsistent with the Gold Coast City Plan.

## Declaration
I understand and acknowledge that:
✓ The information provided in this submission is true and correct  
✓ This submission is NOT confidential and will be displayed through PD Online  
✓ I acknowledge Queensland State Laws will accept this communication as containing my signature

**Electronic Signature:** {{applicant_first_name}} {{applicant_last_name}}  
**Date:** {{submission_date}}`;

const goldCoastEmailTemplate = `Dear {{council_name}},

Please find attached our development application submission in response to Application {{application_number}}.

Property: {{site_address}}
Applicant: {{applicant_full_name}}
Email: {{applicant_email}}
Position: OBJECTING

This submission outlines community concerns regarding the proposed development and its compliance with the Gold Coast City Plan.

Kind regards,
{{sender_name}}`;

export function GoldCoastDefaultSelector({
  selectedDefault,
  onDefaultSelected,
  onFormDataChange,
  disabled = false
}: GoldCoastDefaultSelectorProps) {
  const [showPreview, setShowPreview] = useState<'submission' | 'email' | null>(null);

  const handleGoldCoastSelect = () => {
    onDefaultSelected('gold_coast');
    
    // Apply Gold Coast defaults
    onFormDataChange({
      council_name: 'Gold Coast City Council',
      council_email: 'mail@goldcoast.qld.gov.au',
      council_subject_template: 'Development application submission opposing application number {{application_number}}',
      council_email_body_template: goldCoastEmailTemplate,
      default_application_number: 'COM/2025/271',
      // Note: We'll handle the submission template separately as it needs to be stored as a Google Doc
    });
  };

  return (
    <div style={containerStyle}>
      <h4 style={{
        fontSize: '16px',
        fontWeight: 600,
        color: '#111827',
        margin: '0 0 16px 0',
      }}>
        Formal Submission Structure Template
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Gold Coast Default Option */}
        <div 
          style={optionCardStyle(selectedDefault === 'gold_coast')}
          onClick={() => !disabled && handleGoldCoastSelect()}
        >
          <div style={optionTitleStyle}>
            📋 Gold Coast Council Default
            <span style={badgeStyle}>Recommended</span>
          </div>
          <p style={optionDescriptionStyle}>
            Pre-configured template that matches Gold Coast City Council submission requirements. 
            Includes proper formatting, required fields, and declaration text. Automatically sets 
            council email and subject templates.
          </p>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPreview(showPreview === 'submission' ? null : 'submission');
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {showPreview === 'submission' ? 'Hide' : 'Preview'} Submission Template
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPreview(showPreview === 'email' ? null : 'email');
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {showPreview === 'email' ? 'Hide' : 'Preview'} Email Template
            </button>
          </div>
          
          {showPreview === 'submission' && (
            <div style={previewStyle}>
              {goldCoastSubmissionTemplate}
            </div>
          )}
          
          {showPreview === 'email' && (
            <div style={previewStyle}>
              {goldCoastEmailTemplate}
            </div>
          )}
        </div>

        {/* Custom Upload Option */}
        <div 
          style={optionCardStyle(selectedDefault === 'custom')}
          onClick={() => !disabled && onDefaultSelected('custom')}
        >
          <div style={optionTitleStyle}>
            📄 Custom Template Upload
            <span style={warningBadgeStyle}>Advanced</span>
          </div>
          <p style={optionDescriptionStyle}>
            Upload your own Google Doc template with custom formatting and structure. 
            You'll need to manually configure council details and ensure proper merge field usage.
          </p>
        </div>

        {/* No Template Option */}
        <div 
          style={optionCardStyle(selectedDefault === 'none')}
          onClick={() => !disabled && onDefaultSelected('none')}
        >
          <div style={optionTitleStyle}>
            ✖️ Skip Formal Structure
          </div>
          <p style={optionDescriptionStyle}>
            Use only email body and grounds templates without a formal submission document structure. 
            Submissions will be sent as PDF attachments generated from grounds content only.
          </p>
        </div>
      </div>

      {selectedDefault === 'gold_coast' && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '13px',
          color: '#166534',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>✅ Gold Coast Defaults Applied</div>
          <div>Council email set to: mail@goldcoast.qld.gov.au</div>
          <div>Default application number: COM/2025/271</div>
          <div>Email template configured for Gold Coast format</div>
        </div>
      )}

      {selectedDefault === 'custom' && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '13px',
          color: '#92400e',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>⚠️ Custom Template Requirements</div>
          <div>• Create a Google Doc with your submission template</div>
          <div>• Include merge fields like {'{{applicant_full_name}}'}, {'{{site_address}}'}</div>
          <div>• Share the document with your Google service account</div>
          <div>• You'll provide the Google Doc ID in the next step</div>
        </div>
      )}
    </div>
  );
}
