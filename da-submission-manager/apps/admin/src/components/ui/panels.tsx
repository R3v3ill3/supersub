import { type ReactNode, type CSSProperties } from 'react';

// Supporting UI Components for the Wizard-based Project Creation
// Provides consistent styling and behavior across all wizard steps

// Base Panel Styles
const basePanelStyle: CSSProperties = {
  borderRadius: '12px',
  padding: '20px',
  margin: '16px 0',
};

// Info Panel - General information display
interface InfoPanelProps {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  icon?: string;
}

export function InfoPanel({ 
  children, 
  variant = 'info', 
  title,
  icon 
}: InfoPanelProps) {
  const variantStyles = {
    info: {
      backgroundColor: '#f0f9ff',
      border: '1px solid #bae6fd',
      color: '#0c4a6e',
    },
    success: {
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      color: '#166534',
    },
    warning: {
      backgroundColor: '#fef3c7',
      border: '1px solid #fcd34d',
      color: '#92400e',
    },
    error: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#991b1b',
    },
  };

  const style: CSSProperties = {
    ...basePanelStyle,
    ...variantStyles[variant],
  };

  const titleStyle: CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    margin: '0 0 12px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const contentStyle: CSSProperties = {
    fontSize: '14px',
    lineHeight: 1.6,
    margin: 0,
  };

  return (
    <div style={style}>
      {title && (
        <div style={titleStyle}>
          {icon && <span>{icon}</span>}
          {title}
        </div>
      )}
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}

// Warning Panel - Prominent warnings
interface WarningPanelProps {
  children: ReactNode;
  variant?: 'warning' | 'error';
  title?: string;
  prominent?: boolean;
}

export function WarningPanel({ 
  children, 
  variant = 'warning',
  title,
  prominent = false 
}: WarningPanelProps) {
  const style: CSSProperties = {
    ...basePanelStyle,
    backgroundColor: variant === 'error' ? '#fef2f2' : '#fef3c7',
    border: `${prominent ? '3px' : '2px'} solid ${variant === 'error' ? '#fecaca' : '#fcd34d'}`,
    ...(prominent && {
      boxShadow: `0 20px 45px ${variant === 'error' ? 'rgba(254, 202, 202, 0.15)' : 'rgba(252, 211, 77, 0.15)'}`,
    }),
  };

  const titleStyle: CSSProperties = {
    fontSize: prominent ? '18px' : '16px',
    fontWeight: 700,
    color: variant === 'error' ? '#991b1b' : '#92400e',
    margin: '0 0 12px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const contentStyle: CSSProperties = {
    fontSize: '14px',
    color: variant === 'error' ? '#991b1b' : '#92400e',
    lineHeight: 1.6,
    margin: 0,
  };

  return (
    <div style={style}>
      {title && (
        <div style={titleStyle}>
          {variant === 'error' ? '❌' : '⚠️'} {title}
        </div>
      )}
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}

// Success Panel - Success messages and completion states
interface SuccessPanelProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

export function SuccessPanel({ children, title, actions }: SuccessPanelProps) {
  const style: CSSProperties = {
    ...basePanelStyle,
    backgroundColor: '#f0fdf4',
    border: '2px solid #bbf7d0',
    textAlign: 'center',
  };

  const titleStyle: CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: '#166534',
    margin: '0 0 12px 0',
  };

  const contentStyle: CSSProperties = {
    fontSize: '14px',
    color: '#166534',
    lineHeight: 1.6,
    margin: '0 0 16px 0',
  };

  const actionsStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  };

  return (
    <div style={style}>
      {title && <div style={titleStyle}>✅ {title}</div>}
      <div style={contentStyle}>{children}</div>
      {actions && <div style={actionsStyle}>{actions}</div>}
    </div>
  );
}

// Loading Panel - For async operations
interface LoadingPanelProps {
  message: string;
  submessage?: string;
}

export function LoadingPanel({ message, submessage }: LoadingPanelProps) {
  const style: CSSProperties = {
    ...basePanelStyle,
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    padding: '40px 20px',
  };

  const iconStyle: CSSProperties = {
    fontSize: '48px',
    marginBottom: '16px',
    animation: 'spin 2s linear infinite',
  };

  const messageStyle: CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0',
  };

  const submessageStyle: CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  };

  return (
    <div style={style}>
      <div style={iconStyle}>⏳</div>
      <div style={messageStyle}>{message}</div>
      {submessage && <div style={submessageStyle}>{submessage}</div>}
      
      {/* Add CSS animation for spinning */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

// Method Card - Enhanced choice card with complexity and time estimates
interface MethodCardProps {
  method: string;
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: ReactNode;
  recommended?: boolean;
  complexity?: string;
  timeEstimate?: string;
  badge?: string;
}

export function MethodCard({
  selected,
  onClick,
  title,
  description,
  icon,
  recommended = false,
  complexity,
  timeEstimate,
  badge,
}: MethodCardProps) {
  const cardStyle: CSSProperties = {
    border: `2px solid ${selected ? '#2563eb' : '#e5e7eb'}`,
    borderRadius: '16px',
    padding: '24px',
    backgroundColor: selected ? '#eff6ff' : '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'relative',
    minHeight: '200px',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  };

  const iconStyle: CSSProperties = {
    width: '40px',
    height: '40px',
    color: selected ? '#2563eb' : '#6b7280',
    flexShrink: 0,
  };

  const contentStyle: CSSProperties = {
    flex: 1,
  };

  const titleStyle: CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  };

  const descriptionStyle: CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
  };

  const metadataStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: 'auto',
  };

  const metadataItemStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '6px',
  };

  const badgeStyle: CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: recommended ? '#10b981' : '#3b82f6',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '4px 8px',
    borderRadius: '6px',
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      {(recommended || badge) && (
        <div style={badgeStyle}>
          {recommended ? 'Recommended' : badge}
        </div>
      )}
      
      <div style={headerStyle}>
        <div style={iconStyle}>{icon}</div>
        <div style={contentStyle}>
          <h3 style={titleStyle}>{title}</h3>
          <p style={descriptionStyle}>{description}</p>
        </div>
      </div>
      
      <div style={metadataStyle}>
        {complexity && (
          <span style={metadataItemStyle}>
            Complexity: {complexity}
          </span>
        )}
        {timeEstimate && (
          <span style={metadataItemStyle}>
            Time: {timeEstimate}
          </span>
        )}
      </div>
    </div>
  );
}

// Explanation Panel - For detailed explanations
interface ExplanationPanelProps {
  children: ReactNode;
  title?: string;
}

export function ExplanationPanel({ children, title }: ExplanationPanelProps) {
  const style: CSSProperties = {
    ...basePanelStyle,
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
  };

  const titleStyle: CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 16px 0',
  };

  const contentStyle: CSSProperties = {
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.6,
  };

  return (
    <div style={style}>
      {title && <h4 style={titleStyle}>{title}</h4>}
      <div style={contentStyle}>{children}</div>
    </div>
  );
}

// Benefits Explainer - For showing benefits of features
interface BenefitsExplainerProps {
  children: ReactNode;
  title?: string;
}

export function BenefitsExplainer({ children, title }: BenefitsExplainerProps) {
  const style: CSSProperties = {
    ...basePanelStyle,
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
  };

  const titleStyle: CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0c4a6e',
    margin: '0 0 16px 0',
  };

  const contentStyle: CSSProperties = {
    fontSize: '14px',
    color: '#075985',
    lineHeight: 1.6,
  };

  return (
    <div style={style}>
      {title && <h4 style={titleStyle}>{title}</h4>}
      <div style={contentStyle}>{children}</div>
    </div>
  );
}

// Help Panel - For help text and guidance
interface HelpPanelProps {
  children: ReactNode;
  title?: string;
}

export function HelpPanel({ children, title = 'Help' }: HelpPanelProps) {
  const style: CSSProperties = {
    ...basePanelStyle,
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
  };

  const titleStyle: CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 12px 0',
  };

  const contentStyle: CSSProperties = {
    fontSize: '13px',
    color: '#475569',
    lineHeight: 1.6,
  };

  return (
    <div style={style}>
      <h5 style={titleStyle}>{title}</h5>
      <div style={contentStyle}>{children}</div>
    </div>
  );
}

// Progress Bar Component
interface ProgressBarProps {
  value: number; // 0-100
  showPercentage?: boolean;
  color?: string;
  height?: string;
}

export function ProgressBar({ 
  value, 
  showPercentage = false, 
  color = '#10b981',
  height = '8px' 
}: ProgressBarProps) {
  const containerStyle: CSSProperties = {
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    height,
    marginBottom: showPercentage ? '8px' : '0',
  };

  const fillStyle: CSSProperties = {
    height: '100%',
    width: `${Math.min(100, Math.max(0, value))}%`,
    backgroundColor: color,
    transition: 'width 0.3s ease',
  };

  const percentageStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    textAlign: 'center',
  };

  return (
    <div>
      <div style={containerStyle}>
        <div style={fillStyle} />
      </div>
      {showPercentage && (
        <div style={percentageStyle}>
          {Math.round(value)}%
        </div>
      )}
    </div>
  );
}

// Summary Item Component - For displaying key-value pairs
interface SummaryItemProps {
  label: string;
  value: string;
  highlight?: 'warning' | 'error' | 'success';
}

export function SummaryItem({ label, value, highlight }: SummaryItemProps) {
  const rowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  };

  const labelStyle: CSSProperties = {
    color: '#6b7280',
    fontWeight: 500,
  };

  const valueStyle: CSSProperties = {
    color: highlight === 'warning' 
      ? '#f59e0b' 
      : highlight === 'error' 
        ? '#ef4444' 
        : highlight === 'success' 
          ? '#10b981' 
          : '#111827',
    fontWeight: 600,
    textAlign: 'right',
  };

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}:</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}

// Section Component - For grouping related content
interface SectionProps {
  title: string;
  children: ReactNode;
  icon?: string;
}

export function Section({ title, children, icon }: SectionProps) {
  const containerStyle: CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '20px',
  };

  const titleStyle: CSSProperties = {
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

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}
