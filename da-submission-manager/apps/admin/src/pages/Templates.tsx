import { useState, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DocumentIcon,
  LabIcon,
  DeleteIcon,
} from '@da/ui/icons';
import { api } from '../lib/api';

// Inline styles to avoid Tailwind dependency
const pageStyle: CSSProperties = {
  padding: '24px',
};

const headerStyle: CSSProperties = {
  marginBottom: '24px',
};

const titleStyle: CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#111827',
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: '#6b7280',
  marginTop: '4px',
};

const tabContainerStyle: CSSProperties = {
  borderBottom: '1px solid #e5e7eb',
  marginBottom: '24px',
};

const tabNavStyle: CSSProperties = {
  display: 'flex',
  gap: '32px',
  marginBottom: '-1px',
};

const tabButtonStyle = (isActive: boolean): CSSProperties => ({
  padding: '8px 4px',
  borderBottom: '2px solid',
  borderBottomColor: isActive ? '#3b82f6' : 'transparent',
  fontWeight: '500',
  fontSize: '14px',
  color: isActive ? '#2563eb' : '#6b7280',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
});

const iconStyle: CSSProperties = {
  width: '20px',
  height: '20px',
  marginRight: '8px',
};

interface Project {
  id: string;
  name: string;
  council_name: string;
  cover_template_id?: string | null;
  grounds_template_id?: string | null;
  enable_ai_generation?: boolean | null;
}

interface ConcernTemplate {
  key: string;
  label: string;
  body: string;
}

const templateUploadPanels: Array<{ key: 'submission_format' | 'grounds' | 'council_email' | 'supporter_email'; title: string; description: string }> = [
  { key: 'submission_format', title: 'Submission Format Template', description: 'Defines the overall council submission format. Optional; defaults to Gold Coast template if not provided.' },
  { key: 'grounds', title: 'Grounds for Submission Template', description: 'Core content analysed for concerns and AI-assisted drafting.' },
  { key: 'council_email', title: 'Council Email Template (DOCX/PDF)', description: 'Optional uploaded template for council cover email attachment. Use the council email editor for inline text.' },
  { key: 'supporter_email', title: 'Supporter Email Template', description: 'Optional template sent directly to supporters.' },
];

export default function Templates() {
  useQueryClient();

  const [activeTab, setActiveTab] = useState<'upload' | 'concerns' | 'projects'>('upload');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [surveyVersion, setSurveyVersion] = useState('v1');

  const { data: projectsResponse } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.getAll(),
  });
  const projects: Project[] = projectsResponse?.data?.projects || [];

  const { data: concernsResponse, refetch: refetchConcerns } = useQuery({
    queryKey: ['concerns', surveyVersion],
    queryFn: () => api.templates.getConcerns(surveyVersion),
  });
  const existingConcerns: ConcernTemplate[] = concernsResponse?.data?.data?.concerns || [];

  const deleteConcernMutation = useMutation({
    mutationFn: ({ version, key }: { version: string; key: string }) => 
      api.templates.deleteConcern(version, key),
    onSuccess: () => {
      refetchConcerns();
    }
  });

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Template Management</h1>
        <p style={subtitleStyle}>Manage Google Doc templates and generate surveys from analysis</p>
      </div>

      <div style={tabContainerStyle}>
        <nav style={tabNavStyle}>
          <button
            onClick={() => setActiveTab('upload')}
            style={tabButtonStyle(activeTab === 'upload')}
          >
            <DocumentIcon style={iconStyle} />
            Template Analysis
          </button>
          <button
            onClick={() => setActiveTab('concerns')}
            style={tabButtonStyle(activeTab === 'concerns')}
          >
            <LabIcon style={iconStyle} />
            Survey Concerns ({existingConcerns.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            style={tabButtonStyle(activeTab === 'projects')}
          >
            Project Templates
          </button>
        </nav>
      </div>

      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Project Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.council_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Survey Version
                </label>
                <input
                  type="text"
                  value={surveyVersion}
                  onChange={(e) => setSurveyVersion(e.target.value)}
                  placeholder="v1"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templateUploadPanels.map((panel) => (
              <div key={panel.key} className="bg-white shadow rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{panel.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{panel.description}</p>
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-md p-4">
                  <p className="mb-2">
                    Upload management is not yet implemented in the new UI. Use existing scripts or Supabase storage tools to manage templates.
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Project:</span>{' '}
                    {selectedProject ? selectedProject : 'Select a project to manage templates'}
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Template Type:</span>{' '}
                    {panel.key}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'concerns' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Survey Concerns (Version: {surveyVersion})</h2>
              <div className="flex items-center space-x-2">
                <select
                  value={surveyVersion}
                  onChange={(e) => setSurveyVersion(e.target.value)}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="v1">Version v1</option>
                  <option value="v2">Version v2</option>
                </select>
              </div>
            </div>

            {existingConcerns.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <LabIcon className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                <p>No concerns found for this version.</p>
                <p className="text-sm">Analyze a grounds template to generate concerns.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {existingConcerns.map((concern) => (
                  <div key={concern.key} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{concern.label}</h4>
                        <p className="text-sm text-gray-600 mt-1">{concern.body}</p>
                        <div className="text-xs text-gray-500 mt-2">
                          Key: <code className="bg-gray-200 px-1 rounded">{concern.key}</code>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteConcernMutation.mutate({ version: surveyVersion, key: concern.key })}
                        disabled={deleteConcernMutation.isPending}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete concern"
                      >
                        <DeleteIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Project Template Configuration</h2>
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-600">{project.council_name}</p>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Cover Template:</span>{' '}
                      <code className="text-xs bg-gray-100 px-1 rounded">
                        {project.cover_template_id || 'Not set'}
                      </code>
                    </div>
                    <div>
                      <span className="text-gray-500">Grounds Template:</span>{' '}
                      <code className="text-xs bg-gray-100 px-1 rounded">
                        {project.grounds_template_id || 'Not set'}
                      </code>
                    </div>
                    <div>
                      <span className="text-gray-500">AI Generation:</span>{' '}
                      <span className={project.enable_ai_generation ? 'text-green-600' : 'text-red-600'}>
                        {project.enable_ai_generation ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}