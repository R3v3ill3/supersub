import { useState, type CSSProperties, type ChangeEvent } from 'react';

// Testing Configuration Panel Component
// Makes testing setup very prominent with clear warnings about live vs test mode

interface TestingConfigurationPanelProps {
  testingEmail?: string;
  councilEmail?: string;
  onChange: (email: string) => void;
  prominent?: boolean;
}

const containerStyle = (prominent: boolean): CSSProperties => ({
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: prominent ? '3px solid #fcd34d' : '1px solid #e5e7eb',
  padding: '24px',
  position: 'relative',
  ...(prominent && {
    boxShadow: '0 20px 45px rgba(252, 211, 77, 0.15)',
  }),
});

const warningPanelStyle: CSSProperties = {
  backgroundColor: '#fef3c7',
  border: '2px solid #fcd34d',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
};

const warningTitleStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#92400e',
  margin: '0 0 12px 0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const warningTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#92400e',
  margin: 0,
  lineHeight: 1.6,
};

const toggleContainerStyle: CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '20px',
};

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const checkboxLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: '16px',
  color: '#111827',
  fontWeight: 600,
  cursor: 'pointer',
};

const checkboxStyle: CSSProperties = {
  width: '20px',
  height: '20px',
  accentColor: '#f59e0b',
};

const emailInputContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '12px',
  border: '2px solid #fcd34d',
  backgroundColor: '#ffffff',
  fontSize: '16px',
  color: '#111827',
  outline: 'none',
  fontWeight: 500,
};

const inputLabelStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#92400e',
  marginBottom: '8px',
};

const infoPanelStyle: CSSProperties = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fcd34d',
  borderRadius: '12px',
  padding: '16px',
  marginTop: '12px',
};

const infoTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#92400e',
  margin: '0 0 8px 0',
};

const infoTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#92400e',
  margin: 0,
  lineHeight: 1.6,
};

const livePanelStyle: CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '2px solid #fecaca',
  borderRadius: '12px',
  padding: '20px',
  marginTop: '16px',
};

const liveTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#b91c1c',
  margin: '0 0 8px 0',
};

const liveTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#b91c1c',
  margin: 0,
  lineHeight: 1.6,
};

const councilEmailStyle: CSSProperties = {
  fontFamily: 'monospace',
  backgroundColor: '#ffffff',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  padding: '4px 8px',
  fontWeight: 600,
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: '#f59e0b',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '6px 12px',
  borderRadius: '20px',
  position: 'absolute',
  top: '-12px',
  right: '20px',
};

export function TestingConfigurationPanel({ 
  testingEmail = '', 
  councilEmail,
  onChange, 
  prominent = false 
}: TestingConfigurationPanelProps) {
  const [testingEnabled, setTestingEnabled] = useState(Boolean(testingEmail));

  const handleToggleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setTestingEnabled(enabled);
    if (!enabled) {
      onChange(''); // Clear testing email when disabled
    }
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div style={containerStyle(prominent)}>
      {prominent && (
        <>
          <div style={badgeStyle}>
            ⚠️ Testing Setup
          </div>
          
          <div style={warningPanelStyle}>
            <h4 style={warningTitleStyle}>
              ⚠️ IMPORTANT: Testing Configuration
            </h4>
            <p style={warningTextStyle}>
              <strong>Configure testing to avoid sending submissions to live council email during setup and testing.</strong>
              {' '}This is especially important for new projects that haven't been fully tested yet.
            </p>
          </div>
        </>
      )}
      
      <div style={toggleContainerStyle}>
        <div style={toggleRowStyle}>
          <label htmlFor="testing_toggle" style={checkboxLabelStyle}>
            <input
              id="testing_toggle"
              type="checkbox"
              checked={testingEnabled}
              onChange={handleToggleChange}
              style={checkboxStyle}
            />
            Override council email for testing purposes
          </label>
        </div>
        
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: '12px 0 0 0',
          lineHeight: 1.5,
        }}>
          When enabled, all "Direct" submissions will go to your testing inbox instead of the council.
          "Review" and "Draft" pathways are unaffected and never email the council directly.
        </p>
      </div>
      
      {testingEnabled && (
        <div style={emailInputContainerStyle}>
          <div>
            <label style={inputLabelStyle}>
              Testing Email Address
            </label>
            <input
              type="email"
              value={testingEmail}
              onChange={handleEmailChange}
              placeholder="your-testing@email.com"
              required
              style={inputStyle}
            />
          </div>
          
          <div style={infoPanelStyle}>
            <h5 style={infoTitleStyle}>
              🚨 Testing Mode Active
            </h5>
            <p style={infoTextStyle}>
              ALL project emails for "Direct" submissions will go to <strong>{testingEmail || 'this address'}</strong> instead of council.
              {' '}Remember to disable this before going live with your project.
            </p>
            <p style={{ ...infoTextStyle, marginTop: '12px' }}>
              <strong>Safe to test:</strong> Create test submissions to verify everything works correctly 
              without bothering the council with test emails.
            </p>
          </div>
        </div>
      )}
      
      {!testingEnabled && prominent && (
        <div style={livePanelStyle}>
          <h5 style={liveTitleStyle}>
            ⚠️ No Testing Override Configured
          </h5>
          <p style={liveTextStyle}>
            "Direct" submissions will go directly to the council email address:{' '}
            <span style={councilEmailStyle}>
              {councilEmail || 'not configured'}
            </span>
          </p>
          <p style={{ ...liveTextStyle, marginTop: '12px' }}>
            <strong>Recommendation:</strong> Enable testing mode until you're ready to launch your project live.
            This prevents accidental emails to the council during development and testing.
          </p>
        </div>
      )}
      
      {!testingEnabled && !prominent && councilEmail && (
        <div style={{
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '12px',
        }}>
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            margin: 0,
          }}>
            Direct submissions will go to: <strong>{councilEmail}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

// Enhanced Testing Configuration with Guided Setup
interface GuidedTestingSetupProps {
  testingEmail?: string;
  councilEmail?: string;
  onChange: (email: string) => void;
  projectName?: string;
  showGuidance?: boolean;
}

export function GuidedTestingSetup({ 
  testingEmail = '', 
  councilEmail,
  projectName,
  onChange, 
  showGuidance = true 
}: GuidedTestingSetupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [testingEnabled, setTestingEnabled] = useState(Boolean(testingEmail));

  const stepStyle: CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    marginBottom: '16px',
  };

  const stepNumberStyle = (isActive: boolean, isCompleted: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    fontSize: '14px',
    fontWeight: 700,
    backgroundColor: isCompleted ? '#10b981' : isActive ? '#2563eb' : '#e5e7eb',
    color: isCompleted || isActive ? '#ffffff' : '#6b7280',
    marginRight: '12px',
  });

  const stepTitleStyle: CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
  };

  const stepDescriptionStyle: CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    margin: 0,
  };

  const nextButtonStyle: CSSProperties = {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '16px',
  };

  if (!showGuidance) {
    return (
      <TestingConfigurationPanel
        testingEmail={testingEmail}
        councilEmail={councilEmail}
        onChange={onChange}
        prominent={true}
      />
    );
  }

  return (
    <div>
      <div style={stepStyle}>
        <h4 style={stepTitleStyle}>
          <span style={stepNumberStyle(currentStep === 1, false)}>1</span>
          Understanding Testing vs Live Mode
        </h4>
        <p style={stepDescriptionStyle}>
          For "{projectName}" you can choose between testing mode (safe for development) 
          or live mode (sends directly to council). Testing mode is recommended until you're ready to launch.
        </p>
        {currentStep === 1 && (
          <button style={nextButtonStyle} onClick={() => setCurrentStep(2)}>
            Continue to Configuration →
          </button>
        )}
      </div>

      {currentStep >= 2 && (
        <div style={stepStyle}>
          <h4 style={stepTitleStyle}>
            <span style={stepNumberStyle(currentStep === 2, currentStep > 2)}>2</span>
            Configure Testing Settings
          </h4>
          <TestingConfigurationPanel
            testingEmail={testingEmail}
            councilEmail={councilEmail}
            onChange={onChange}
            prominent={false}
          />
          {currentStep === 2 && testingEnabled && testingEmail && (
            <button style={nextButtonStyle} onClick={() => setCurrentStep(3)}>
              Continue to Summary →
            </button>
          )}
        </div>
      )}

      {currentStep >= 3 && (
        <div style={stepStyle}>
          <h4 style={stepTitleStyle}>
            <span style={stepNumberStyle(false, true)}>✓</span>
            Testing Configuration Complete
          </h4>
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <p style={{
              fontSize: '14px',
              color: '#166534',
              margin: '0 0 8px 0',
              fontWeight: 600,
            }}>
              ✅ Testing mode configured successfully!
            </p>
            <p style={{
              fontSize: '13px',
              color: '#166534',
              margin: 0,
              lineHeight: 1.5,
            }}>
              Test submissions will go to <strong>{testingEmail}</strong> instead of the council.
              You can now safely test your project without sending emails to {councilEmail}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
