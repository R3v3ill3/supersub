import axios from 'axios';

const DEFAULT_BASE_URL = 'http://localhost:3500/api';

// Normalise the base URL so we always end up with a single trailing /api
function resolveBaseUrl() {
  const configured = (import.meta.env.VITE_API_URL as string | undefined) || DEFAULT_BASE_URL;
  const trimmed = configured.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

// API client configured to connect to the backend API
export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions for public interface
export const api = {
  projects: {
    getConfig: (slug: string) => apiClient.get(`/projects/${slug}/public-config`),
    get: (slug: string) => apiClient.get(`/projects/${slug}`),
  },

  survey: {
    getTemplates: (params: { version?: string; track?: string; project_id?: string }) =>
      apiClient.get('/survey/templates', { params }),
    saveResponse: (submissionId: string, data: any) =>
      apiClient.post(`/survey/${submissionId}`, data),
  },

  generation: {
    generate: (submissionId: string, params?: any) =>
      apiClient.post(`/generate/${submissionId}`, {}, { params }),
  },

  submissions: {
    create: (data: {
      project_identifier: string;
      applicant_first_name: string;
      applicant_last_name: string;
      applicant_email: string;
      applicant_residential_address: string;
      applicant_suburb: string;
      applicant_state: string;
      applicant_postcode: string;
      applicant_postal_address?: string;
      applicant_postal_city?: string;
      applicant_postal_region?: string;
      applicant_postal_postcode?: string;
      applicant_postal_country?: string;
      postal_email?: string;
      lot_number?: string;
      plan_number?: string;
      site_address: string;
      application_number?: string;
      submission_pathway: 'direct' | 'review' | 'draft';
      submission_track?: 'followup' | 'comprehensive';
      is_returning_submitter?: boolean;
    }) => apiClient.post('/submissions', data),
    submit: (submissionId: string, data: { finalText: string; emailBody?: string }) =>
      apiClient.post(`/submissions/${submissionId}/submit`, data),
    previewEmailBody: (submissionId: string, data: { finalText: string }) =>
      apiClient.post(`/submissions/${submissionId}/preview-email-body`, data),
    downloadPdf: (submissionId: string, fileType: 'cover' | 'grounds') => 
      apiClient.get(`/submissions/${submissionId}/download/${fileType}`, {
        responseType: 'blob',
      }),
  },

  documents: {
    getStatus: (submissionId: string) =>
      apiClient.get(`/documents/${submissionId}/status`),
    getPreview: (submissionId: string) =>
      apiClient.get(`/documents/${submissionId}/preview`),
    updateStatus: (submissionId: string, data: {
      status: 'created' | 'user_editing' | 'finalized' | 'submitted' | 'approved';
      reviewStatus?: 'not_started' | 'in_progress' | 'changes_requested' | 'ready_for_submission' | 'submitted';
      reviewStartedAt?: string;
      reviewCompletedAt?: string;
      lastModifiedAt?: string;
    }) => apiClient.put(`/documents/${submissionId}/status`, data),
    finalize: (submissionId: string, data: {
      confirm: true;
      notifyApplicant?: boolean;
    }) => apiClient.post(`/documents/${submissionId}/finalize`, data),
  },
};
