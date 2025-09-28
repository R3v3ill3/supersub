import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

interface SubmissionStats {
  total: number;
  byStatus: Record<string, number>;
  byPathway: Record<string, number>;
  todayCount: number;
  weekCount: number;
  monthCount: number;
  successRate: number;
  errorRate: number;
  avgProcessingTime: number;
}

interface RecentSubmission {
  id: string;
  applicant_name: string;
  project_name: string;
  status: string;
  pathway: string;
  created_at: string;
  site_address: string;
}

interface SystemHealth {
  ok: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  timestamp: string;
  responseTime: number;
  components: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    responseTime?: number;
    message?: string;
  }>;
  metrics: {
    responseTime: number;
    errorRate: number;
    queueDepth: number;
    activeConnections: number;
  };
}

interface MonitoringOverview {
  stats: SubmissionStats;
  stale: any[];
}

// Hook for submission statistics
export const useSubmissionStats = (projectId?: string, timeRange?: { start?: string; end?: string }) => {
  return useQuery({
    queryKey: ['submission-stats', projectId, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set('project_id', projectId);
      if (timeRange?.start) params.set('start', timeRange.start);
      if (timeRange?.end) params.set('end', timeRange.end);
      
      const response = await apiClient.get(`/admin/submissions/overview?${params}`);
      return response.data as MonitoringOverview;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Hook for recent submissions
export const useRecentSubmissions = (limit: number = 10) => {
  return useQuery({
    queryKey: ['recent-submissions', limit],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/submissions/recent?limit=${limit}`);
      return response.data.submissions as RecentSubmission[];
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

// Hook for failed submissions
export const useFailedSubmissions = (limit: number = 5) => {
  return useQuery({
    queryKey: ['failed-submissions', limit],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/submissions/failed?limit=${limit}`);
      return response.data.submissions as RecentSubmission[];
    },
    refetchInterval: 30000,
  });
};

// Hook for system health
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await apiClient.get('/health/system');
      return response.data as SystemHealth;
    },
    refetchInterval: 20000, // Refetch every 20 seconds
  });
};

// Hook for integration health
export const useIntegrationHealth = () => {
  return useQuery({
    queryKey: ['integration-health'],
    queryFn: async () => {
      const response = await apiClient.get('/health/integrations');
      return response.data;
    },
    refetchInterval: 30000,
  });
};

// Hook for dashboard analytics
export const useDashboardAnalytics = () => {
  return useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      const response = await apiClient.get('/stats');
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });
};
