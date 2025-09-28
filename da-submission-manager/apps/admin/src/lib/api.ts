import axios from 'axios';

// API client configured to connect to the backend API
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3500/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only clear localStorage on 401, but don't redirect automatically
    // Let the AuthContext handle authentication state management
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

// API functions
export const api = {
  // Projects
  projects: {
    getAll: () => apiClient.get('/projects'),
    getById: (id: string) => apiClient.get(`/projects/${id}`),
    create: (data: any) => apiClient.post('/projects', data),
    update: (id: string, data: any) => apiClient.patch(`/projects/${id}`, data),
    delete: (id: string) => apiClient.delete(`/projects/${id}`),
    getSubmissions: (id: string, params?: any) => 
      apiClient.get(`/projects/${id}/submissions`, { params }),
    updateActionNetworkConfig: (id: string, data: any) => apiClient.post(`/projects/${id}/action-network`, data),
    testActionNetworkSync: (id: string) => apiClient.post(`/projects/${id}/action-network/test`),
    updateDualTrack: (id: string, data: { is_dual_track: boolean; dual_track_config?: any }) =>
      apiClient.put(`/projects/${id}/dual-track`, data),
    validateDualTrack: (id: string, config: any) =>
      apiClient.post(`/projects/${id}/dual-track/validate`, { dual_track_config: config }),
    previewTrackTemplate: (id: string, track: 'followup' | 'comprehensive') =>
      apiClient.get(`/projects/${id}/template-preview/${track}`),
  },

  // Submissions
  submissions: {
    getAll: (params?: any) => apiClient.get('/submissions', { params }),
    getById: (id: string) => apiClient.get(`/submissions/${id}`),
    create: (data: any) => apiClient.post('/submissions', data),
    update: (id: string, data: any) => apiClient.patch(`/submissions/${id}`, data),
  },

  // Documents
  documents: {
    getBySubmission: (submissionId: string) => 
      apiClient.get(`/documents/${submissionId}`),
    process: (submissionId: string, data: any) => 
      apiClient.post(`/documents/process/${submissionId}`, data),
    finalize: (submissionId: string) => 
      apiClient.post(`/documents/finalize/${submissionId}`),
  },

  // Survey
  survey: {
    getTemplates: (version = 'v1') => 
      apiClient.get('/survey/templates', { params: { version } }),
    saveResponse: (submissionId: string, data: any) => 
      apiClient.post(`/survey/${submissionId}`, data),
  },

  // Generation
  generation: {
    generate: (submissionId: string, params?: any) => 
      apiClient.post(`/generate/${submissionId}`, {}, { params }),
  },

  // Templates
  templates: {
    validate: (googleDocId: string) => 
      apiClient.get('/templates/validate', { params: { googleDocId } }),
    preview: (googleDocId: string) => 
      apiClient.get('/templates/preview', { params: { googleDocId } }),
    analyze: (data: { googleDocId: string; projectId?: string; version?: string }) => 
      apiClient.post('/templates/analyze', data),
    generateSurvey: (data: { 
      googleDocId: string; 
      projectId: string; 
      version?: string; 
      saveToDatabase?: boolean 
    }) => 
      apiClient.post('/templates/generate-survey', data),
    getConcerns: (version = 'v1') => 
      apiClient.get('/templates/concerns', { params: { version } }),
    listFiles: (projectId: string) => apiClient.get(`/templates/files/${projectId}`),
    activateVersion: (fileId: string, versionId: string) =>
      apiClient.post(`/templates/files/${fileId}/activate`, { versionId }),
    deleteVersion: (fileId: string, versionId: string) =>
      apiClient.delete(`/templates/files/${fileId}/version/${versionId}`),
    updateConcerns: (data: { version?: string; concerns: any[] }) => 
      apiClient.put('/templates/concerns', data),
    deleteConcern: (version: string, key: string) => 
      apiClient.delete(`/templates/concerns/${version}/${key}`),
    upload: (data: FormData) => apiClient.post('/templates/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  },

  // Dev endpoints
  dev: {
    createSubmission: () => apiClient.post('/dev/submissions'),
    createProject: () => apiClient.post('/dev/project'),
    extractGrounds: (projectId: string) => apiClient.post(`/dev/projects/${projectId}/extract-grounds`),
  },

  // Dashboard
  dashboard: {
    getStats: () => apiClient.get('/stats'),
  },

  // Admin Monitoring APIs
  admin: {
    getSubmissionOverview: (params?: { project_id?: string; start?: string; end?: string }) => 
      apiClient.get('/admin/submissions/overview', { params }),
    getRecentSubmissions: (params?: { limit?: number; offset?: number; status?: string; project_id?: string }) =>
      apiClient.get('/admin/submissions/recent', { params }),
    getFailedSubmissions: (params?: { limit?: number; offset?: number; project_id?: string }) =>
      apiClient.get('/admin/submissions/failed', { params }),
    getDetailedHealth: () => apiClient.get('/admin/health/detailed'),
    retrySubmission: (submissionId: string) => apiClient.post(`/admin/submissions/${submissionId}/retry`),
    getAnalytics: (params?: { start?: string; end?: string; project_id?: string }) =>
      apiClient.get('/admin/analytics', { params }),
  },

  // Health endpoints
  health: {
    getSystemHealth: () => apiClient.get('/health/system'),
    getIntegrationHealth: () => apiClient.get('/health/integrations'),
    getAIProviders: () => apiClient.get('/health/ai-providers'),
  },

  actionNetwork: {
    listForms: () => apiClient.get('/integrations/action-network/forms'),
    listLists: () => apiClient.get('/integrations/action-network/lists'),
    listTags: () => apiClient.get('/integrations/action-network/tags'),
    listGroups: () => apiClient.get('/integrations/action-network/groups'),
    createTag: (data: { name: string; description?: string }) => apiClient.post('/integrations/action-network/tags', data),
  },

  // Authentication
  auth: {
    login: (email: string, password: string) => apiClient.post('/auth/login', { email, password }),
    logout: () => apiClient.post('/auth/logout'),
    me: () => apiClient.get('/auth/me'),
    createUser: (data: { email: string; name: string; password: string; role?: 'admin' | 'super_admin' }) => 
      apiClient.post('/auth/users', data),
    listUsers: () => apiClient.get('/auth/users'),
    updateUserStatus: (userId: string, isActive: boolean) => 
      apiClient.put(`/auth/users/${userId}/status`, { is_active: isActive }),
    changePassword: (currentPassword: string, newPassword: string) => 
      apiClient.put('/auth/password', { currentPassword, newPassword }),
  },
};

// Types
export type Project = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  council_email: string;
  council_name: string;
  council_attention_of?: string | null;
  google_doc_template_id?: string;
  from_email?: string;
  from_name?: string;
  subject_template: string;
  default_pathway: 'direct' | 'review' | 'draft';
  enable_ai_generation: boolean;
  is_active: boolean;
  test_submission_email?: string | null;
  action_network_config?: {
    action_url?: string;
    form_url?: string;
    group_hrefs?: string[];
    list_hrefs?: string[];
    tag_hrefs?: string[];
    custom_fields?: Record<string, string>;
  };
  created_at: string;
  updated_at: string;
  submission_counts?: {
    total: number;
    active: number;
  };
}

export type Submission = {
  id: string;
  project_id: string;
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_email: string;
  site_address: string;
  application_number?: string;
  submission_pathway: 'direct' | 'review' | 'draft';
  status: string;
  google_doc_id?: string;
  google_doc_url?: string;
  pdf_url?: string;
  submitted_to_council_at?: string;
  council_confirmation_id?: string;
  created_at: string;
  updated_at: string;
}

export type SurveyTemplate = {
  key: string;
  label: string;
  body: string;
}

export type ActionNetworkItem = {
  id: string | null;
  name: string;
  href?: string;
  browser_url?: string;
  description?: string;
};

export type CreateProjectData = {
  name: string;
  slug: string;
  description?: string;
  council_email: string;
  council_name: string;
  council_attention_of?: string | null;
  cover_template_id?: string;
  grounds_template_id?: string;
  council_subject_template?: string;
  council_email_body_template?: string;
  google_doc_template_id?: string;
  from_email?: string;
  from_name?: string;
  default_application_number?: string;
  subject_template?: string;
  default_pathway?: 'direct' | 'review' | 'draft';
  enable_ai_generation?: boolean;
  test_submission_email?: string | null;
  action_network_api_key?: string;
  action_network_config?: {
    action_url?: string;
    form_url?: string;
    group_hrefs?: string[];
    list_hrefs?: string[];
    tag_hrefs?: string[];
    custom_fields?: Record<string, string>;
  };
};

export type ExtractedConcern = {
  key: string;
  label: string;
  body: string;
  priority: number;
  category?: string;
};

export type ConcernTemplate = {
  version: string;
  key: string;
  label: string;
  body: string;
  is_active: boolean;
};

export type DocumentAnalysisResult = {
  extractedConcerns: ExtractedConcern[];
  documentSummary: string;
  suggestedSurveyTitle: string;
  analysisMetadata: {
    totalConcerns: number;
    categories: string[];
    documentLength: number;
    analysisModel: string;
    analysisTimestamp: string;
  };
};

export type TemplateValidation = {
  isValid: boolean;
  documentTitle?: string;
  wordCount: number;
  issues: string[];
};

export type TemplateAnalysisPreview = {
  preview: DocumentAnalysisResult;
  validation: TemplateValidation;
};

export type DocumentReviewSummary = {
  submission_id: string;
  status: string;
  last_updated: string;
  review_pathway: 'followup' | 'comprehensive' | 'direct_review';
  document_url?: string | null;
  pdf_url?: string | null;
  reviewer_name?: string | null;
  reviewer_email?: string | null;
  submitted_at?: string | null;
  council_response_received_at?: string | null;
  issues_found?: number;
  priority_concerns?: Array<{
    key: string;
    label: string;
    category?: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
  next_steps?: string | null;
  summary?: string | null;
};

// Types are already exported inline above, no need for duplicate exports
