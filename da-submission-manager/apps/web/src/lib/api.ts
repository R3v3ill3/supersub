import axios from 'axios';

// API client configured to connect to the backend API
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3500',
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions for public interface
export const api = {
  projects: {
    getConfig: (slug: string) => apiClient.get(`/api/projects/${slug}/public-config`),
  },

  survey: {
    getTemplates: (params: { version?: string; track?: string }) => 
      apiClient.get('/api/survey/templates', { params }),
    saveResponse: (submissionId: string, data: any) => 
      apiClient.post(`/api/survey/${submissionId}`, data),
  },

  generation: {
    generate: (submissionId: string, params?: any) => 
      apiClient.post(`/api/generate/${submissionId}`, {}, { params }),
  },

  projects: {
    get: (slug: string) => apiClient.get(`/api/projects/${slug}`),
  },

  submissions: {
    create: (data: {
      project_identifier: string;
      applicant_first_name: string;
      applicant_last_name: string;
      applicant_email: string;
      applicant_postal_address?: string;
      applicant_postal_city?: string;
      applicant_postal_region?: string;
      applicant_postal_postcode?: string;
      applicant_postal_country?: string;
      applicant_postal_city?: string;
      applicant_postal_region?: string;
      applicant_postal_postcode?: string;
      applicant_postal_country?: string;
      site_address: string;
      application_number?: string;
      submission_pathway: 'direct' | 'review' | 'draft';
      submission_track?: 'followup' | 'comprehensive';
      is_returning_submitter?: boolean;
    }) => apiClient.post('/api/submissions', data),
  },

  documents: {
    getStatus: (submissionId: string) => 
      apiClient.get(`/api/documents/${submissionId}/status`),
    getPreview: (submissionId: string) =>
      apiClient.get(`/api/documents/${submissionId}/preview`),
    updateStatus: (submissionId: string, data: {
      status: 'created' | 'user_editing' | 'finalized' | 'submitted' | 'approved';
      reviewStatus?: 'not_started' | 'in_progress' | 'changes_requested' | 'ready_for_submission' | 'submitted';
      reviewStartedAt?: string;
      reviewCompletedAt?: string;
      lastModifiedAt?: string;
    }) => apiClient.put(`/api/documents/${submissionId}/status`, data),
    finalize: (submissionId: string, data: {
      confirm: true;
      notifyApplicant?: boolean;
    }) => apiClient.post(`/api/documents/${submissionId}/finalize`, data),
  },
};
