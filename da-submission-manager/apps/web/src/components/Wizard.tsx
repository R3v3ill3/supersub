import React, { type ReactNode, type CSSProperties } from 'react';

// Wizard styling matching the admin app

const wizardHeaderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  marginBottom: '32px',
};

const progressBarContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '16px',
};

const progressStepStyle = (isActive: boolean, isCompleted: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  fontSize: '14px',
  fontWeight: 600,
  backgroundColor: isCompleted ? '#10b981' : isActive ? '#2563eb' : '#e5e7eb',
  color: isCompleted || isActive ? '#ffffff' : '#6b7280',
  border: isActive && !isCompleted ? '2px solid #2563eb' : 'none',
});

const progressLineStyle = (isCompleted: boolean): CSSProperties => ({
  height: '2px',
  flex: 1,
  backgroundColor: isCompleted ? '#10b981' : '#e5e7eb',
});

const stepTitlesContainerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 500,
};

const stepTitleStyle = (isActive: boolean): CSSProperties => ({
  color: isActive ? '#111827' : '#6b7280',
  fontWeight: isActive ? 600 : 500,
});

const wizardNavigationStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  marginTop: '32px',
  paddingTop: '24px',
  borderTop: '1px solid #e5e7eb',
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
  transition: 'all 0.2s ease',
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
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
  transition: 'all 0.2s ease',
};

const primaryButtonDisabledStyle: CSSProperties = {
  ...primaryButtonStyle,
  opacity: 0.7,
  cursor: 'not-allowed',
  boxShadow: 'none',
};

const sectionStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
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

const choiceTitleStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#111827',
  margin: 0,
};

const choiceDescriptionStyle: CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: 0,
  lineHeight: 1.5,
};

// Components

interface WizardHeaderProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  completedSteps?: number[];
}

export function WizardHeader({
  currentStep,
  totalSteps,
  stepTitles,
  completedSteps = []
}: WizardHeaderProps) {
  return (
    <div style={wizardHeaderStyle}>
      <div style={progressBarContainerStyle}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = completedSteps.includes(stepNumber);

          return (
            <React.Fragment key={stepNumber}>
              <div style={progressStepStyle(isActive, isCompleted)}>
                {isCompleted ? '✓' : stepNumber}
              </div>
              {stepNumber < totalSteps && (
                <div style={progressLineStyle(isCompleted)} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={stepTitlesContainerStyle}>
        {stepTitles.map((title, index) => (
          <div
            key={title}
            style={stepTitleStyle(index + 1 === currentStep)}
          >
            {title}
          </div>
        ))}
      </div>
    </div>
  );
}

interface WizardNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  isLastStep?: boolean;
  isSubmitting?: boolean;
}

export function WizardNavigation({
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel = 'Continue',
  isSubmitting = false,
}: WizardNavigationProps) {
  return (
    <div style={wizardNavigationStyle}>
      <div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={secondaryButtonStyle}
          >
            ← Back
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || isSubmitting}
            style={nextDisabled || isSubmitting ? primaryButtonDisabledStyle : primaryButtonStyle}
          >
            {isSubmitting ? 'Submitting...' : `${nextLabel} →`}
          </button>
        )}
      </div>
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <h3 style={sectionTitleStyle}>{title}</h3>
        {description && <p style={sectionDescriptionStyle}>{description}</p>}
      </div>
      {children}
    </section>
  );
}

interface ChoiceCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon?: ReactNode;
}

export function ChoiceCard({
  selected,
  onClick,
  title,
  description,
  icon
}: ChoiceCardProps) {
  return (
    <div
      style={choiceCardStyle(selected)}
      onClick={onClick}
    >
      {icon && <div style={{ width: '32px', height: '32px', color: '#2563eb' }}>{icon}</div>}
      <h3 style={choiceTitleStyle}>{title}</h3>
      <p style={choiceDescriptionStyle}>{description}</p>
    </div>
  );
}
