import { type CSSProperties } from 'react';
import type { CreateProjectData } from '../lib/api';

// Enhanced Project Summary Panel Component
// Provides comprehensive overview before project creation with clear status indicators

interface ProjectSummaryPanelProps {
  formData: CreateProjectData;
  testingMode?: boolean;
}

const containerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '24px',
};

const sectionStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e5e7eb',
  padding: '24px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
};

const sectionTitleStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#111827',
  margin: '0 0 20px 0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  paddingBottom: '12px',
  borderBottom: '2px solid #f3f4f6',
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '14px',
  marginBottom: '12px',
  paddingBottom: '12px',
  borderBottom: '1px solid #f3f4f6',
};

const labelStyle: CSSProperties = {
  color: '#6b7280',
  fontWeight: 500,
};

const valueStyle = (type: 'success' | 'error' | 'warning' | 'info' = 'info'): CSSProperties => {
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#111827',
  };
  
  return {
    color: colors[type],
    fontWeight: 600,
    textAlign: 'right',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };
};

const statusBadgeStyle = (type: 'success' | 'error' | 'warning' | 'info'): CSSProperties => {
  const styles = {
    success: { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' },
    error: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' },
    warning: { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
    info: { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
  };
  
  return {
    ...styles[type],
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '4px 8px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  };
};

const urlPreviewStyle: CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '12px',
  marginTop: '8px',
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#475569',
  wordBreak: 'break-all',
};

const highlightStyle: CSSProperties = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fcd34d',
  borderRadius: '8px',
  padding: '12px',
  marginTop: '12px',
};

const highlightTitleStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#92400e',
  margin: '0 0 4px 0',
};

const highlightTextStyle: CSSProperties = {
  fontSize: '13px',
  color: '#92400e',
  margin: 0,
  lineHeight: 1.5,
};

export function ProjectSummaryPanel({ formData, testingMode = false }: ProjectSummaryPanelProps) {
  const getTemplateStatus = () => {
    if (formData.is_dual_track) {
      const coverOk = Boolean(formData.cover_template_id);
      const originalOk = Boolean(formData.dual_track_config?.original_grounds_template_id);
      const followupOk = Boolean(formData.dual_track_config?.followup_grounds_template_id);
      
      if (coverOk && originalOk && followupOk) return { type: 'success' as const, text: 'All Templates Configured' };
      if (coverOk || originalOk || followupOk) return { type: 'warning' as const, text: 'Partially Configured' };
      return { type: 'error' as const, text: 'Templates Missing' };
    } else {
      const coverOk = Boolean(formData.cover_template_id);
      const groundsOk = Boolean(formData.grounds_template_id);
      
      if (coverOk && groundsOk) return { type: 'success' as const, text: 'All Templates Configured' };
      if (coverOk || groundsOk) return { type: 'warning' as const, text: 'Partially Configured' };
      return { type: 'error' as const, text: 'Templates Missing' };
    }
  };

  const getActionNetworkStatus = () => {
    if (formData.action_network_api_key) {
      const hasForm = Boolean(formData.action_network_config?.action_url);
      if (hasForm) return { type: 'success' as const, text: 'Configured & Connected' };
      return { type: 'warning' as const, text: 'API Key Only' };
    }
    return { type: 'info' as const, text: 'Not Configured' };
  };

  const templateStatus = getTemplateStatus();
  const actionNetworkStatus = getActionNetworkStatus();

  return (
    <div style={containerStyle}>
      {/* Basic Information Section */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>
          📋 Project Overview
        </h4>
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>Project Name:</span>
          <span style={valueStyle()}>{formData.name || 'Not specified'}</span>
        </div>
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>URL Slug:</span>
          <span style={valueStyle()}>{formData.slug || 'Not specified'}</span>
        </div>
        
        {formData.slug && (
          <div style={urlPreviewStyle}>
            🌐 https://yoursite.com/submissions/{formData.slug}
          </div>
        )}
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>Project Type:</span>
          <span style={valueStyle()}>
            {formData.is_dual_track ? 'Follow-up Submission Period' : 'Single Submission Period'}
          </span>
        </div>
        
        {formData.description && (
          <div style={{ marginTop: '16px' }}>
            <span style={{ ...labelStyle, display: 'block', marginBottom: '8px' }}>Description:</span>
            <p style={{ 
              fontSize: '14px', 
              color: '#374151', 
              margin: 0, 
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}>
              "{formData.description}"
            </p>
          </div>
        )}
      </div>

      {/* Council Configuration Section */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>
          🏛️ Council Configuration
        </h4>
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>Council:</span>
          <span style={valueStyle()}>{formData.council_name || 'Not specified'}</span>
        </div>
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>Email:</span>
          <span style={valueStyle()}>{formData.council_email || 'Not specified'}</span>
        </div>
        
        {formData.council_attention_of && (
          <div style={summaryRowStyle}>
            <span style={labelStyle}>Attention Of:</span>
            <span style={valueStyle()}>{formData.council_attention_of}</span>
          </div>
        )}
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>Default App. Number:</span>
          <span style={valueStyle()}>{formData.default_application_number || 'Not specified'}</span>
        </div>
        
        {testingMode && formData.test_submission_email && (
          <div style={highlightStyle}>
            <div style={highlightTitleStyle}>
              ⚠️ Testing Mode Active
            </div>
            <p style={highlightTextStyle}>
              Direct submissions will go to <strong>{formData.test_submission_email}</strong> instead of council
            </p>
          </div>
        )}
      </div>

      {/* Templates Section */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>
          📄 Templates
        </h4>
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>Overall Status:</span>
          <span style={statusBadgeStyle(templateStatus.type)}>
            {templateStatus.type === 'success' && '✅'}
            {templateStatus.type === 'warning' && '⚠️'}
            {templateStatus.type === 'error' && '❌'}
            {templateStatus.text}
          </span>
        </div>
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>Cover Template:</span>
          <span style={valueStyle(formData.cover_template_id ? 'success' : 'error')}>
            {formData.cover_template_id ? '✅ Configured' : '❌ Missing'}
          </span>
        </div>
        
        {formData.is_dual_track ? (
          <>
            <div style={summaryRowStyle}>
              <span style={labelStyle}>Comprehensive Template:</span>
              <span style={valueStyle(formData.dual_track_config?.original_grounds_template_id ? 'success' : 'error')}>
                {formData.dual_track_config?.original_grounds_template_id ? '✅ Configured' : '❌ Missing'}
              </span>
            </div>
            <div style={summaryRowStyle}>
              <span style={labelStyle}>Follow-up Template:</span>
              <span style={valueStyle(formData.dual_track_config?.followup_grounds_template_id ? 'success' : 'error')}>
                {formData.dual_track_config?.followup_grounds_template_id ? '✅ Configured' : '❌ Missing'}
              </span>
            </div>
          </>
        ) : (
          <div style={summaryRowStyle}>
            <span style={labelStyle}>Grounds Template:</span>
            <span style={valueStyle(formData.grounds_template_id ? 'success' : 'error')}>
              {formData.grounds_template_id ? '✅ Configured' : '❌ Missing'}
            </span>
          </div>
        )}
        
        {formData.google_doc_template_id && (
          <div style={summaryRowStyle}>
            <span style={labelStyle}>Legacy Google Doc:</span>
            <span style={valueStyle('warning')}>
              ⚠️ Configured (Deprecated)
            </span>
          </div>
        )}
      </div>

      {/* Action Network Section */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>
          🔗 Action Network
        </h4>
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>Integration Status:</span>
          <span style={statusBadgeStyle(actionNetworkStatus.type)}>
            {actionNetworkStatus.type === 'success' && '✅'}
            {actionNetworkStatus.type === 'warning' && '⚠️'}
            {actionNetworkStatus.type === 'info' && 'ℹ️'}
            {actionNetworkStatus.text}
          </span>
        </div>
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>API Key:</span>
          <span style={valueStyle(formData.action_network_api_key ? 'success' : 'info')}>
            {formData.action_network_api_key ? '✅ Configured' : '❌ Not set'}
          </span>
        </div>
        
        {formData.action_network_config?.action_url && (
          <div style={summaryRowStyle}>
            <span style={labelStyle}>Primary Form:</span>
            <span style={valueStyle('success')}>✅ Connected</span>
          </div>
        )}
        
        {formData.action_network_config?.form_url && (
          <div style={summaryRowStyle}>
            <span style={labelStyle}>Public Form URL:</span>
            <span style={valueStyle('success')}>✅ Configured</span>
          </div>
        )}
        
        {formData.action_network_config?.list_hrefs && formData.action_network_config.list_hrefs.length > 0 && (
          <div style={summaryRowStyle}>
            <span style={labelStyle}>Email Lists:</span>
            <span style={valueStyle('success')}>
              ✅ {formData.action_network_config.list_hrefs.length} connected
            </span>
          </div>
        )}
        
        {!formData.action_network_api_key && (
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            margin: '12px 0 0 0',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}>
            Action Network integration is optional. You can configure it after project creation.
          </p>
        )}
      </div>

      {/* Configuration Summary Section */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>
          ⚙️ Additional Settings
        </h4>
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>AI Generation:</span>
          <span style={valueStyle(formData.enable_ai_generation ? 'success' : 'warning')}>
            {formData.enable_ai_generation ? '✅ Enabled' : '⚠️ Disabled'}
          </span>
        </div>
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>Testing Email:</span>
          <span style={valueStyle(formData.test_submission_email ? 'success' : 'warning')}>
            {formData.test_submission_email ? '✅ Configured' : '⚠️ Not set'}
          </span>
        </div>
        
        <div style={summaryRowStyle}>
          <span style={labelStyle}>Default Pathway:</span>
          <span style={valueStyle()}>
            {formData.default_pathway === 'direct' ? 'Direct' : 
             formData.default_pathway === 'review' ? 'Review' : 'Draft'}
          </span>
        </div>
        
        {!formData.test_submission_email && (
          <div style={highlightStyle}>
            <div style={highlightTitleStyle}>
              💡 Recommendation
            </div>
            <p style={highlightTextStyle}>
              Consider setting a testing email to safely test submissions before going live with your project.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Pre-Launch Checklist Component
interface PreLaunchChecklistProps {
  formData: CreateProjectData;
}

export function PreLaunchChecklist({ formData }: PreLaunchChecklistProps) {
  const checklistItems = [
    {
      label: 'Project name and slug configured',
      checked: Boolean(formData.name && formData.slug),
      critical: true,
      description: 'These are required for project creation',
    },
    {
      label: 'Council information provided',
      checked: Boolean(formData.council_name && formData.council_email),
      critical: true,
      description: 'Required for sending submissions to council',
    },
    {
      label: 'Cover template configured',
      checked: Boolean(formData.cover_template_id),
      critical: true,
      description: 'Needed for email attachments to council',
    },
    {
      label: formData.is_dual_track ? 'Both dual track templates configured' : 'Grounds template configured',
      checked: formData.is_dual_track 
        ? Boolean(formData.dual_track_config?.original_grounds_template_id && formData.dual_track_config?.followup_grounds_template_id)
        : Boolean(formData.grounds_template_id),
      critical: true,
      description: 'Required for generating submission content',
    },
    {
      label: 'Default application number provided',
      checked: Boolean(formData.default_application_number),
      critical: true,
      description: 'Used as fallback when supporters don\'t provide application number',
    },
    {
      label: 'Testing email configured (recommended)',
      checked: Boolean(formData.test_submission_email),
      critical: false,
      description: 'Recommended for safe testing before going live',
    },
    {
      label: 'Action Network integration configured',
      checked: Boolean(formData.action_network_api_key),
      critical: false,
      description: 'Optional - helps with supporter list building',
    },
    {
      label: 'AI generation enabled',
      checked: Boolean(formData.enable_ai_generation),
      critical: false,
      description: 'Recommended for generating submission content',
    },
  ];

  const checklistStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const checklistItemStyle = (checked: boolean, critical: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '20px',
    borderRadius: '12px',
    border: `2px solid ${
      checked 
        ? '#bbf7d0' 
        : critical 
          ? '#fecaca' 
          : '#e5e7eb'
    }`,
    backgroundColor: checked 
      ? '#f0fdf4' 
      : critical && !checked 
        ? '#fef2f2' 
        : '#ffffff',
  });

  const checkboxIndicatorStyle = (checked: boolean, critical: boolean): CSSProperties => ({
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: checked 
      ? '#10b981' 
      : critical 
        ? '#ef4444' 
        : '#e5e7eb',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
    flexShrink: 0,
  });

  const criticalItems = checklistItems.filter(item => item.critical);
  const optionalItems = checklistItems.filter(item => !item.critical);
  const criticalComplete = criticalItems.every(item => item.checked);
  const allComplete = checklistItems.every(item => item.checked);

  return (
    <div>
      {/* Overall Status */}
      <div style={{
        backgroundColor: criticalComplete ? '#f0fdf4' : '#fef2f2',
        border: `2px solid ${criticalComplete ? '#bbf7d0' : '#fecaca'}`,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: 700,
          color: criticalComplete ? '#166534' : '#991b1b',
          marginBottom: '8px',
        }}>
          {criticalComplete ? '✅ Ready to Create Project!' : '⚠️ Requirements Missing'}
        </div>
        <p style={{
          fontSize: '14px',
          color: criticalComplete ? '#166534' : '#991b1b',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {criticalComplete 
            ? `All critical requirements met. ${allComplete ? 'All optional items complete too!' : 'Some optional items still pending.'}`
            : 'Please complete the required items below before creating your project.'
          }
        </p>
      </div>

      {/* Critical Items */}
      <div style={{ marginBottom: '32px' }}>
        <h5 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#991b1b',
          margin: '0 0 16px 0',
        }}>
          🔴 Required Items
        </h5>
        
        <div style={checklistStyle}>
          {criticalItems.map((item, index) => (
            <div key={index} style={checklistItemStyle(item.checked, item.critical)}>
              <div style={checkboxIndicatorStyle(item.checked, item.critical)}>
                {item.checked ? '✓' : '!'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: item.checked ? '#166534' : '#991b1b',
                  marginBottom: '4px',
                }}>
                  {item.label}
                </div>
                <p style={{
                  fontSize: '13px',
                  color: item.checked ? '#166534' : '#991b1b',
                  margin: 0,
                  lineHeight: 1.4,
                }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Items */}
      <div>
        <h5 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#374151',
          margin: '0 0 16px 0',
        }}>
          🟡 Recommended Items
        </h5>
        
        <div style={checklistStyle}>
          {optionalItems.map((item, index) => (
            <div key={index} style={checklistItemStyle(item.checked, item.critical)}>
              <div style={checkboxIndicatorStyle(item.checked, item.critical)}>
                {item.checked ? '✓' : '○'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: item.checked ? '#166534' : '#6b7280',
                  marginBottom: '4px',
                }}>
                  {item.label}
                </div>
                <p style={{
                  fontSize: '13px',
                  color: item.checked ? '#166534' : '#6b7280',
                  margin: 0,
                  lineHeight: 1.4,
                }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
