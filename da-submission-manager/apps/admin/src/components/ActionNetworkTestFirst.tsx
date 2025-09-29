import { useState, type CSSProperties } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ActionNetworkItem, CreateProjectData } from '../lib/api';

// Action Network Test-First Progressive Setup Component
// Provides test-first workflow with resource discovery and progressive disclosure

interface ActionNetworkTestFirstProps {
  apiKey?: string;
  onApiKeyChange: (apiKey: string) => void;
  onTestSuccess: (resources: any) => void;
  discoveredResources?: any;
  selectedConfig?: CreateProjectData['action_network_config'];
  onConfigChange: (config: CreateProjectData['action_network_config']) => void;
}

interface TestState {
  status: 'idle' | 'testing' | 'success' | 'error';
  resources?: {
    forms: ActionNetworkItem[];
    lists: ActionNetworkItem[];
    tags: ActionNetworkItem[];
    groups: ActionNetworkItem[];
  };
  error?: string;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const panelStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e5e7eb',
  padding: '24px',
};

const titleStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#111827',
  margin: '0 0 16px 0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const descriptionStyle: CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: 1.6,
  margin: '0 0 20px 0',
};

const apiKeyFormStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const inputRowStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-end',
};

const inputStyle: CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  fontSize: '14px',
  color: '#111827',
  outline: 'none',
  fontFamily: 'monospace',
};

const buttonStyle = (variant: 'primary' | 'secondary' = 'primary', disabled = false): CSSProperties => ({
  padding: '12px 20px',
  borderRadius: '12px',
  border: variant === 'secondary' ? '1px solid #d1d5db' : 'none',
  backgroundColor: disabled 
    ? '#9ca3af' 
    : variant === 'primary' 
      ? '#2563eb' 
      : '#ffffff',
  color: disabled 
    ? '#ffffff' 
    : variant === 'primary' 
      ? '#ffffff' 
      : '#374151',
  fontSize: '14px',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  whiteSpace: 'nowrap',
});

const helpPanelStyle: CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '16px',
  marginTop: '16px',
};

const helpTitleStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#334155',
  margin: '0 0 12px 0',
};

const helpTextStyle: CSSProperties = {
  fontSize: '13px',
  color: '#475569',
  lineHeight: 1.6,
  margin: '0 0 12px 0',
};

const linkStyle: CSSProperties = {
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 500,
};

const loadingPanelStyle: CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  backgroundColor: '#f9fafb',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
};

const loadingTextStyle: CSSProperties = {
  fontSize: '16px',
  color: '#6b7280',
  margin: '16px 0 0 0',
};

const errorPanelStyle: CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '2px solid #fecaca',
  borderRadius: '12px',
  padding: '20px',
};

const errorTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#b91c1c',
  margin: '0 0 8px 0',
};

const errorTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#b91c1c',
  margin: '0 0 16px 0',
  lineHeight: 1.5,
};

const successPanelStyle: CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #bbf7d0',
  borderRadius: '12px',
  padding: '20px',
};

const successTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#166534',
  margin: '0 0 8px 0',
};

const successTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#166534',
  margin: '0 0 16px 0',
};

const resourceGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '20px',
  marginTop: '24px',
};

const resourceCardStyle: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '20px',
  backgroundColor: '#fefefe',
};

const resourceTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#111827',
  margin: '0 0 12px 0',
};

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  fontSize: '14px',
  color: '#111827',
};

export function ActionNetworkTestFirst({ 
  apiKey, 
  onApiKeyChange, 
  onTestSuccess,
  discoveredResources,
  selectedConfig,
  onConfigChange 
}: ActionNetworkTestFirstProps) {
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const testConnectionMutation = useMutation({
    mutationFn: async (testApiKey: string) => {
      // Test connection and discover resources
      const response = await api.actionNetwork.testConnection(testApiKey);
      return response.data;
    },
    onSuccess: (data) => {
      setTestState({ 
        status: 'success', 
        resources: data 
      });
      onTestSuccess(data);
    },
    onError: (error: Error) => {
      setTestState({ 
        status: 'error', 
        error: error.message || 'Connection failed' 
      });
    },
  });

  const handleTestConnection = async () => {
    if (!apiKey?.trim()) {
      setTestState({ status: 'error', error: 'API key is required' });
      return;
    }

    setTestState({ status: 'testing' });
    testConnectionMutation.mutate(apiKey);
  };

  const handleRetry = () => {
    setTestState({ status: 'idle' });
  };

  const handleSkip = () => {
    setTestState({ status: 'idle' });
    onApiKeyChange('');
  };

  return (
    <div style={containerStyle}>
      {testState.status === 'idle' && (
        <ApiKeyInputPanel 
          apiKey={apiKey}
          onChange={onApiKeyChange}
          onTest={handleTestConnection}
          isLoading={testConnectionMutation.isPending}
        />
      )}
      
      {testState.status === 'testing' && (
        <LoadingPanel message="Testing connection and discovering resources..." />
      )}
      
      {testState.status === 'success' && testState.resources && (
        <ResourceConfigurationPanel 
          resources={testState.resources}
          selectedConfig={selectedConfig}
          onChange={onConfigChange}
          showAdvancedOptions={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
        />
      )}
      
      {testState.status === 'error' && (
        <ErrorRecoveryPanel 
          error={testState.error}
          onRetry={handleRetry}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}

// API Key Input Panel
interface ApiKeyInputPanelProps {
  apiKey?: string;
  onChange: (apiKey: string) => void;
  onTest: () => void;
  isLoading?: boolean;
}

function ApiKeyInputPanel({ apiKey, onChange, onTest, isLoading }: ApiKeyInputPanelProps) {
  return (
    <div style={panelStyle}>
      <h4 style={titleStyle}>
        🔑 Enter your Action Network API Key
      </h4>
      <p style={descriptionStyle}>
        We'll test your connection and discover available resources automatically.
        This ensures your integration is configured correctly before you continue.
      </p>
      
      <div style={apiKeyFormStyle}>
        <div style={inputRowStyle}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px', display: 'block' }}>
              API Key
            </label>
            <input
              type="password"
              value={apiKey || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your Action Network API key"
              style={inputStyle}
            />
          </div>
          
          <button
            type="button"
            onClick={onTest}
            disabled={!apiKey?.trim() || isLoading}
            style={buttonStyle('primary', !apiKey?.trim() || isLoading)}
          >
            {isLoading ? (
              <>
                ⏳ Testing...
              </>
            ) : (
              <>
                🧪 Test Connection
              </>
            )}
          </button>
        </div>
      </div>
      
      <HelpPanel />
    </div>
  );
}

// Loading Panel
interface LoadingPanelProps {
  message: string;
}

function LoadingPanel({ message }: LoadingPanelProps) {
  return (
    <div style={loadingPanelStyle}>
      <div style={{ fontSize: '32px', margin: '0 0 16px 0' }}>🔍</div>
      <div style={loadingTextStyle}>{message}</div>
    </div>
  );
}

// Resource Configuration Panel
interface ResourceConfigurationPanelProps {
  resources: {
    forms: ActionNetworkItem[];
    lists: ActionNetworkItem[];
    tags: ActionNetworkItem[];
    groups: ActionNetworkItem[];
  };
  selectedConfig?: CreateProjectData['action_network_config'];
  onChange: (config: CreateProjectData['action_network_config']) => void;
  showAdvancedOptions: boolean;
  onToggleAdvanced: () => void;
}

function ResourceConfigurationPanel({ 
  resources, 
  selectedConfig, 
  onChange,
  showAdvancedOptions,
  onToggleAdvanced 
}: ResourceConfigurationPanelProps) {
  const AN_FORM_PREFIX = 'https://actionnetwork.org/api/v2/forms/';
  
  const getSelectableValue = (item: ActionNetworkItem) => {
    return item.id || extractIdFromHref(item.href || '', AN_FORM_PREFIX);
  };

  const extractIdFromHref = (href: string, prefix: string) => {
    if (!href) return '';
    if (href.startsWith(prefix)) return href.slice(prefix.length);
    const parts = href.split('/');
    return parts[parts.length - 1] || '';
  };

  const selectedFormId = extractIdFromHref(selectedConfig?.action_url || '', AN_FORM_PREFIX);

  return (
    <div style={panelStyle}>
      <div style={successPanelStyle}>
        <h4 style={successTitleStyle}>
          ✅ Connection Successful!
        </h4>
        <p style={successTextStyle}>
          Found {resources.forms?.length || 0} forms, {resources.lists?.length || 0} lists, and {resources.tags?.length || 0} tags in your Action Network account.
        </p>
      </div>
      
      <div style={{ marginTop: '24px' }}>
        <h4 style={titleStyle}>Select Resources (Optional)</h4>
        <p style={descriptionStyle}>
          Choose which Action Network resources to connect with this project. You can always configure these later.
        </p>
        
        <ResourceSelector
          type="form"
          title="Primary Form"
          description="Main form for this campaign"
          options={resources.forms}
          selected={selectedFormId}
          onChange={(value) => {
            const selectedForm = resources.forms.find(form => getSelectableValue(form) === value);
            onChange({
              ...selectedConfig,
              action_url: value ? `${AN_FORM_PREFIX}${value}` : '',
              form_url: selectedForm?.browser_url || selectedConfig?.form_url || '',
            });
          }}
          limit={1}
        />
        
        <ResourceSelector
          type="lists"
          title="Email Lists"
          description="Supporters will be added to selected lists"
          options={resources.lists}
          selected={selectedConfig?.list_hrefs}
          onChange={(value) => onChange({
            ...selectedConfig,
            list_hrefs: Array.isArray(value) ? value : [],
          })}
          multiple={true}
        />
        
        {showAdvancedOptions && (
          <AdvancedResourceConfiguration 
            resources={resources}
            config={selectedConfig}
            onChange={onChange}
          />
        )}
        
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button 
            type="button"
            onClick={onToggleAdvanced}
            style={buttonStyle('secondary')}
          >
            {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
          </button>
        </div>
      </div>
    </div>
  );
}

// Resource Selector
interface ResourceSelectorProps {
  type: string;
  title: string;
  description: string;
  options: ActionNetworkItem[];
  selected?: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  limit?: number;
}

function ResourceSelector({ 
  type, 
  title, 
  description, 
  options, 
  selected, 
  onChange,
  multiple = false,
  limit 
}: ResourceSelectorProps) {
  const getSelectableValue = (item: ActionNetworkItem) => {
    return item.id || item.href?.split('/').pop() || '';
  };

  return (
    <div style={resourceCardStyle}>
      <h5 style={resourceTitleStyle}>{title}</h5>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px 0' }}>
        {description}
      </p>
      
      {multiple ? (
        <div>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>
            Hold Ctrl/Cmd to select multiple options
          </p>
          <select
            multiple
            value={Array.isArray(selected) ? selected : []}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              onChange(values);
            }}
            style={{ ...selectStyle, height: '120px' }}
          >
            {options.map((option, index) => (
              <option key={option.href || `${type}-${index}`} value={getSelectableValue(option)}>
                {option.name} ({getSelectableValue(option)})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <select
          value={typeof selected === 'string' ? selected : ''}
          onChange={(e) => onChange(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select a {type}...</option>
          {options.slice(0, limit || options.length).map((option, index) => (
            <option key={option.href || `${type}-${index}`} value={getSelectableValue(option)}>
              {option.name} ({getSelectableValue(option)})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// Advanced Resource Configuration
interface AdvancedResourceConfigurationProps {
  resources: {
    forms: ActionNetworkItem[];
    lists: ActionNetworkItem[];
    tags: ActionNetworkItem[];
    groups: ActionNetworkItem[];
  };
  config?: CreateProjectData['action_network_config'];
  onChange: (config: CreateProjectData['action_network_config']) => void;
}

function AdvancedResourceConfiguration({ resources, config, onChange }: AdvancedResourceConfigurationProps) {
  return (
    <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
      <h5 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 16px 0' }}>
        Advanced Configuration
      </h5>
      
      <div style={resourceGridStyle}>
        <ResourceSelector
          type="tags"
          title="Tags"
          description="Tags to apply to supporters"
          options={resources.tags}
          selected={config?.tag_hrefs}
          onChange={(value) => onChange({
            ...config,
            tag_hrefs: Array.isArray(value) ? value : [],
          })}
          multiple={true}
        />
        
        <ResourceSelector
          type="groups"
          title="Groups"
          description="Groups to add supporters to"
          options={resources.groups}
          selected={config?.group_hrefs}
          onChange={(value) => onChange({
            ...config,
            group_hrefs: Array.isArray(value) ? value : [],
          })}
          multiple={true}
        />
      </div>
    </div>
  );
}

// Error Recovery Panel
interface ErrorRecoveryPanelProps {
  error?: string;
  onRetry: () => void;
  onSkip: () => void;
}

function ErrorRecoveryPanel({ error, onRetry, onSkip }: ErrorRecoveryPanelProps) {
  return (
    <div style={errorPanelStyle}>
      <h4 style={errorTitleStyle}>
        ❌ Connection Failed
      </h4>
      <p style={errorTextStyle}>
        {error || 'Unable to connect to Action Network. Please check your API key and try again.'}
      </p>
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          onClick={onRetry}
          style={buttonStyle('primary')}
        >
          🔄 Try Again
        </button>
        <button
          type="button"
          onClick={onSkip}
          style={buttonStyle('secondary')}
        >
          ⏭️ Skip For Now
        </button>
      </div>
    </div>
  );
}

// Help Panel
function HelpPanel() {
  return (
    <div style={helpPanelStyle}>
      <h5 style={helpTitleStyle}>Where to find your API key:</h5>
      <ol style={{ ...helpTextStyle, paddingLeft: '20px' }}>
        <li>Log in to Action Network</li>
        <li>Go to Settings → API & Sync</li>
        <li>Copy your API key</li>
      </ol>
      
      <a 
        href="https://actionnetwork.org/docs" 
        target="_blank" 
        rel="noopener noreferrer"
        style={linkStyle}
      >
        View Action Network documentation →
      </a>
    </div>
  );
}
