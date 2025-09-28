import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  BeakerIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';
import { MergeFieldEditor } from '../components/MergeFieldEditor';
import { MergeFieldPalette } from '../components/MergeFieldPalette';
import type { TemplateType } from '../../api/src/types/templates';
import { useTemplateUploads } from '../hooks/useTemplateUploads';

const templateUploadPanels: Array<{ key: TemplateType; title: string; description: string }> = [
  { key: 'submission_format', title: 'Submission Format Template', description: 'Defines the overall council submission format. Optional; defaults to Gold Coast template if not provided.' },
  { key: 'grounds', title: 'Grounds for Submission Template', description: 'Core content analysed for concerns and AI-assisted drafting.' },
  { key: 'council_email', title: 'Council Email Template (DOCX/PDF)', description: 'Optional uploaded template for council cover email attachment. Use covering email editor for inline text.' },
  { key: 'supporter_email', title: 'Supporter Email Template', description: 'Optional template sent directly to supporters.' },
];

type AnalysisTemplateType = 'cover' | 'grounds';

interface TemplateAnalysisState {
  googleDocId: string;
  type: AnalysisTemplateType;
  validation?: TemplateValidation;
  analysis?: DocumentAnalysisResult;
  isAnalyzing: boolean;
  error?: string;
}

export default function Templates() {
  const queryClient = useQueryClient();
  
  // State management
  const [activeTab, setActiveTab] = useState<'upload' | 'concerns' | 'projects'>('upload');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [templateAnalysis, setTemplateAnalysis] = useState<{
    cover?: TemplateAnalysisState;
    grounds?: TemplateAnalysisState;
  }>({});
  
  // Form states
  const [coverDocId, setCoverDocId] = useState('');
  const [groundsDocId, setGroundsDocId] = useState('');
  const [surveyVersion, setSurveyVersion] = useState('v1');

  const templateUploads = useTemplateUploads(selectedProject);
  const templateFiles = templateUploads.versions || [];
  const refetchTemplateFiles = templateUploads.refetch;

  // Fetch projects for project selection
  const { data: projectsResponse } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.getAll(),
  });

  const projects: Project[] = projectsResponse?.data?.projects || [];

  // Fetch existing concerns
  const { data: concernsResponse, refetch: refetchConcerns } = useQuery({
    queryKey: ['concerns', surveyVersion],
    queryFn: () => api.templates.getConcerns(surveyVersion),
  });

  const existingConcerns: ConcernTemplate[] = concernsResponse?.data?.data?.concerns || [];

  // Template validation mutation
  const validateTemplateMutation = useMutation({
    mutationFn: (googleDocId: string) => api.templates.validate(googleDocId),
    onSuccess: (response, googleDocId) => {
      const templateType = googleDocId === coverDocId ? 'cover' : 'grounds';
      setTemplateAnalysis(prev => ({
        ...prev,
        [templateType]: {
          ...prev[templateType],
          googleDocId,
          type: templateType,
          validation: response.data.data,
          error: undefined
        }
      }));
    },
    onError: (error: any, googleDocId) => {
      const templateType = googleDocId === coverDocId ? 'cover' : 'grounds';
      setTemplateAnalysis(prev => ({
        ...prev,
        [templateType]: {
          ...prev[templateType],
          googleDocId,
          type: templateType,
          error: error.response?.data?.error || 'Validation failed'
        }
      }));
    }
  });

  // Template analysis mutation
  const analyzeTemplateMutation = useMutation({
    mutationFn: (data: { googleDocId: string; projectId?: string }) => 
      api.templates.analyze(data),
    onSuccess: (response, variables) => {
      const templateType = variables.googleDocId === coverDocId ? 'cover' : 'grounds';
      setTemplateAnalysis(prev => ({
        ...prev,
        [templateType]: {
          ...prev[templateType],
          analysis: response.data.data.analysis,
          isAnalyzing: false,
          error: undefined
        }
      }));
    },
    onError: (error: any, variables) => {
      const templateType = variables.googleDocId === coverDocId ? 'cover' : 'grounds';
      setTemplateAnalysis(prev => ({
        ...prev,
        [templateType]: {
          ...prev[templateType],
          isAnalyzing: false,
          error: error.response?.data?.error || 'Analysis failed'
        }
      }));
    }
  });

  // Survey generation mutation
  const generateSurveyMutation = useMutation({
    mutationFn: (data: { 
      googleDocId: string; 
      projectId: string; 
      version?: string;
      saveToDatabase?: boolean;
    }) => api.templates.generateSurvey(data),
    onSuccess: () => {
      refetchConcerns();
      alert('Survey generated and saved successfully!');
    },
    onError: (error: any) => {
      alert(`Survey generation failed: ${error.response?.data?.error || 'Unknown error'}`);
    }
  });

  // Concerns update mutation
  const updateConcernsMutation = useMutation({
    mutationFn: (data: { version?: string; concerns: any[] }) => 
      api.templates.updateConcerns(data),
    onSuccess: () => {
      refetchConcerns();
    }
  });

  // Concern deletion mutation
  const deleteConcernMutation = useMutation({
    mutationFn: ({ version, key }: { version: string; key: string }) => 
      api.templates.deleteConcern(version, key),
    onSuccess: () => {
      refetchConcerns();
    }
  });

  // Handle template validation
  const handleValidateTemplate = (googleDocId: string, templateType: AnalysisTemplateType) => {
    if (!googleDocId.trim()) return;
    
    setTemplateAnalysis(prev => ({
      ...prev,
      [templateType]: {
        googleDocId,
        type: templateType,
        isAnalyzing: false
      }
    }));

    validateTemplateMutation.mutate(googleDocId);
  };

  // Handle template analysis (grounds only)
  const handleAnalyzeTemplate = (googleDocId: string) => {
    if (!googleDocId.trim()) return;
    
    setTemplateAnalysis(prev => ({
      ...prev,
      grounds: {
        ...prev.grounds!,
        isAnalyzing: true,
        error: undefined
      }
    }));

    analyzeTemplateMutation.mutate({
      googleDocId,
      projectId: selectedProject || undefined
    });
  };

  // Handle survey generation
  const handleGenerateSurvey = () => {
    if (!groundsDocId || !selectedProject) {
      alert('Please select a project and provide a grounds template ID');
      return;
    }

    generateSurveyMutation.mutate({
      googleDocId: groundsDocId,
      projectId: selectedProject,
      version: surveyVersion,
      saveToDatabase: true
    });
  };

  // Handle concern deletion
  const handleDeleteConcern = (key: string) => {
    if (confirm(`Are you sure you want to delete the concern "${key}"?`)) {
      deleteConcernMutation.mutate({ version: surveyVersion, key });
    }
  };

  // Auto-validate when doc IDs are entered
  useEffect(() => {
    if (coverDocId && coverDocId !== templateAnalysis.cover?.googleDocId) {
      const timeoutId = setTimeout(() => {
        handleValidateTemplate(coverDocId, 'cover');
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [coverDocId]);

  useEffect(() => {
    if (groundsDocId && groundsDocId !== templateAnalysis.grounds?.googleDocId) {
      const timeoutId = setTimeout(() => {
        handleValidateTemplate(groundsDocId, 'grounds');
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [groundsDocId]);

  const renderValidationStatus = (validation?: TemplateValidation, error?: string) => {
    if (error) {
      return (
        <div className="flex items-center text-red-600 text-sm mt-1">
          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
          {error}
        </div>
      );
    }

    if (!validation) return null;

    if (validation.isValid) {
      return (
        <div className="flex items-center text-green-600 text-sm mt-1">
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          Valid • {validation.wordCount} words
          {validation.documentTitle && ` • "${validation.documentTitle.substring(0, 30)}..."`}
        </div>
      );
    } else {
      return (
        <div className="text-red-600 text-sm mt-1">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-4 w-4 mr-1" />
            Issues found:
          </div>
          <ul className="list-disc list-inside ml-4 mt-1">
            {validation.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      );
    }
  };

  const renderAnalysisResults = (analysis?: DocumentAnalysisResult) => {
    if (!analysis) return null;

    return (
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="font-medium text-blue-900 mb-2">Analysis Results</h4>
        <p className="text-sm text-blue-800 mb-3">{analysis.documentSummary}</p>
        
        <div className="space-y-2">
          <div className="text-xs text-blue-600">
            <strong>Survey Title:</strong> {analysis.suggestedSurveyTitle}
          </div>
          <div className="text-xs text-blue-600">
            <strong>Extracted Concerns:</strong> {analysis.analysisMetadata.totalConcerns}
          </div>
          {analysis.analysisMetadata.categories.length > 0 && (
            <div className="text-xs text-blue-600">
              <strong>Categories:</strong> {analysis.analysisMetadata.categories.join(', ')}
            </div>
          )}
        </div>

        <div className="mt-3 max-h-64 overflow-y-auto">
          <h5 className="text-sm font-medium text-blue-900 mb-2">Extracted Concerns:</h5>
          <div className="space-y-2">
            {analysis.extractedConcerns.map((concern, index) => (
              <div key={index} className="bg-white rounded border p-2">
                <div className="font-medium text-sm">{concern.label}</div>
                <div className="text-xs text-gray-600 mt-1">{concern.body}</div>
                {concern.category && (
                  <div className="text-xs text-blue-600 mt-1">Category: {concern.category}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">Priority: {concern.priority}/10</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Template Management</h1>
        <p className="text-gray-600">Manage Google Doc templates and generate surveys from analysis</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentTextIcon className="h-5 w-5 inline mr-2" />
            Template Analysis
          </button>
          <button
            onClick={() => setActiveTab('concerns')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'concerns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BeakerIcon className="h-5 w-5 inline mr-2" />
            Survey Concerns ({existingConcerns.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'projects'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <EyeIcon className="h-5 w-5 inline mr-2" />
            Project Templates
          </button>
        </nav>
      </div>

      {/* Template Analysis Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Project Selection */}
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

          {/* Template Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templateUploadPanels.map((panel) => (
              <TemplateUploadPanel
                key={panel.key}
                projectId={selectedProject}
                templateType={panel.key}
                title={panel.title}
                description={panel.description}
                templateFile={templateFiles.find((file: any) => file.template_type === panel.key)}
                isLoading={templateUploads.isFetching}
                onUploaded={() => refetchTemplateFiles?.()}
                onActivateVersion={async (fileId, versionId) => {
                  await templateUploads.activateVersion({ fileId, versionId });
                }}
                onDeleteVersion={async (fileId, versionId) => {
                  await templateUploads.deleteVersion({ fileId, versionId });
                }}
                activating={templateUploads.activatePending}
                deleting={templateUploads.deletingVersion}
              />
            ))}
          </div>
        </div>
      )}

      {/* Survey Concerns Tab */}
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
                <BeakerIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
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
                        onClick={() => handleDeleteConcern(concern.key)}
                        disabled={deleteConcernMutation.isPending}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete concern"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project Templates Tab */}
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