import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { StatusIndicator, MetricCard, AlertBanner } from '../components/dashboard';
import { apiClient } from '../lib/api';
import { cn } from '../lib/utils';

interface SubmissionItem {
  id: string;
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_email: string;
  site_address: string;
  application_number?: string;
  project_name: string;
  pathway: 'direct' | 'review' | 'draft';
  status: string;
  created_at: string;
  updated_at: string;
  google_doc_url?: string;
  council_confirmation_id?: string;
}

interface SubmissionFilters {
  search: string;
  status: string;
  pathway: string;
  projectId: string;
  dateRange: {
    start: string;
    end: string;
  };
}

interface SubmissionTimelineEvent {
  stage: string;
  status: string;
  metadata: Record<string, any> | null;
  occurredAt: string;
}

interface SubmissionDetails {
  submissionId: string;
  projectName: string;
  projectSlug: string;
  applicantName: string;
  applicantEmail: string;
  siteAddress: string;
  applicationNumber?: string | null;
  submissionPathway: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedToCouncilAt?: string | null;
  actionRequired: boolean;
  actionNetworkSyncStatus?: string | null;
  actionNetworkSyncError?: string | null;
  documents: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: string;
    downloadUrl?: string | null;
  }>;
  emails: Array<{
    id: string;
    type: string;
    status: string;
    subject: string;
    recipient: string;
    sentAt?: string | null;
    error?: string | null;
  }>;
  timeline: SubmissionTimelineEvent[];
  errors: Array<{
    stage: string;
    status: string;
    message?: string;
    occurredAt: string;
  }>;
}

interface BulkOperationState {
  isLoading: boolean;
  completed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'New', value: 'NEW' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Awaiting Review', value: 'AWAITING_REVIEW' },
  { label: 'Draft Sent', value: 'DRAFT_SENT' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Error', value: 'ERROR' },
];

const PATHWAY_OPTIONS = [
  { label: 'All Pathways', value: '' },
  { label: 'Direct', value: 'direct' },
  { label: 'Review', value: 'review' },
  { label: 'Draft', value: 'draft' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const STATUS_COLOR_MAP: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-amber-100 text-amber-800',
  AWAITING_REVIEW: 'bg-purple-100 text-purple-800',
  DRAFT_SENT: 'bg-cyan-100 text-cyan-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  SUBMITTED: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  ERROR: 'bg-red-100 text-red-800',
};

const PATHWAY_COLOR_MAP: Record<string, string> = {
  direct: 'bg-blue-50 text-blue-700',
  review: 'bg-violet-50 text-violet-700',
  draft: 'bg-slate-100 text-slate-700',
};

const DEFAULT_BULK_STATE: BulkOperationState = {
  isLoading: false,
  completed: 0,
  failed: 0,
  errors: [],
};

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function formatRelativeTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function buildQueryParams(params: Record<string, string | number | undefined | null>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

async function fetchSubmissions(params: SubmissionFilters & { limit: number; offset: number }) {
  const query = buildQueryParams({
    limit: params.limit,
    offset: params.offset,
    search: params.search,
    status: params.status,
    pathway: params.pathway,
    project_id: params.projectId,
    start: params.dateRange.start,
    end: params.dateRange.end,
  });
  const { data } = await apiClient.get(`/admin/submissions/recent?${query}`);
  return data;
}

async function fetchFailedSubmissions(limit = 20) {
  const { data } = await apiClient.get(`/admin/submissions/failed?limit=${limit}`);
  return data.submissions || [];
}

async function fetchOverview(params: { projectId?: string; start?: string; end?: string }) {
  const query = buildQueryParams({
    project_id: params.projectId,
    start: params.start,
    end: params.end,
  });
  const { data } = await apiClient.get(`/admin/submissions/overview?${query}`);
  return data;
}

async function fetchSubmissionTimeline(submissionId: string) {
  const { data } = await apiClient.get(`/admin/submissions/${submissionId}/timeline`);
  return data;
}

async function fetchSubmissionEmails(submissionId: string) {
  const { data } = await apiClient.get(`/admin/submissions/${submissionId}/emails`);
  return data.emails ?? [];
}

async function fetchSubmissionDocuments(submissionId: string) {
  const { data } = await apiClient.get(`/documents/${submissionId}/status`);
  return data.documents ?? [];
}

async function fetchSubmissionDetails(submissionId: string): Promise<SubmissionDetails> {
  const [timeline, emails, documents] = await Promise.all([
    fetchSubmissionTimeline(submissionId),
    fetchSubmissionEmails(submissionId),
    fetchSubmissionDocuments(submissionId),
  ]);

  return {
    submissionId,
    projectName: timeline.project?.name ?? 'Unknown project',
    projectSlug: timeline.project?.slug ?? 'unknown',
    applicantName: timeline.applicant?.name ?? 'Unknown applicant',
    applicantEmail: timeline.applicant?.email ?? '—',
    siteAddress: timeline.submission?.site_address ?? '—',
    applicationNumber: timeline.submission?.application_number ?? null,
    submissionPathway: timeline.submission?.submission_pathway ?? '—',
    status: timeline.submission?.status ?? '—',
    createdAt: timeline.submission?.created_at ?? '',
    updatedAt: timeline.submission?.updated_at ?? '',
    submittedToCouncilAt: timeline.submission?.submitted_to_council_at ?? null,
    actionRequired: Boolean(timeline.submission?.action_required),
    actionNetworkSyncStatus: timeline.submission?.action_network_sync_status ?? null,
    actionNetworkSyncError: timeline.submission?.action_network_sync_error ?? null,
    documents,
    emails,
    timeline: timeline.timeline ?? [],
    errors:
      timeline.timeline?.filter((event: SubmissionTimelineEvent) => event.status === 'failed').map((event) => ({
        stage: event.stage,
        status: event.status,
        message: event.metadata?.error_message,
        occurredAt: event.occurredAt,
      })) ?? [],
  };
}

async function retrySubmission(id: string) {
  return apiClient.post(`/admin/submissions/${id}/retry`);
}

async function retrySubmissionsBulk(ids: string[]) {
  const results = await Promise.allSettled(ids.map((id) => retrySubmission(id)));
  const summary = results.reduce(
    (acc, result, index) => {
      if (result.status === 'fulfilled') {
        acc.completed += 1;
      } else {
        acc.failed += 1;
        acc.errors.push({ id: ids[index], error: result.reason?.message ?? 'Unknown error' });
      }
      return acc;
    },
    { completed: 0, failed: 0, errors: [] as Array<{ id: string; error: string }>, isLoading: false }
  );
  return summary;
}

async function updateSubmissionStatus(id: string, status: string) {
  return apiClient.patch(`/admin/submissions/${id}/status`, { status });
}

async function exportSubmissions(params: SubmissionFilters & { selectedIds?: string[] }) {
  const query = buildQueryParams({
    search: params.search,
    status: params.status,
    pathway: params.pathway,
    project_id: params.projectId,
    start: params.dateRange.start,
    end: params.dateRange.end,
    ids: params.selectedIds?.join(','),
  });
  const response = await apiClient.get(`/admin/submissions/export?${query}`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}

export default function Submissions() {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState<SubmissionFilters>({
    search: '',
    status: '',
    pathway: '',
    projectId: '',
    dateRange: { start: '', end: '' }
  });
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  const queryClient = useQueryClient();

  // Build API parameters
  const apiParams = useMemo(() => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: ((currentPage - 1) * limit).toString(),
    });
    
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.pathway) params.set('pathway', filters.pathway);
    if (filters.projectId) params.set('project_id', filters.projectId);
    if (filters.dateRange.start) params.set('start_date', filters.dateRange.start);
    if (filters.dateRange.end) params.set('end_date', filters.dateRange.end);
    
    return params.toString();
  }, [filters, currentPage, limit]);

  // Fetch submissions
  const { 
    data: submissionsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['submissions', apiParams],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/submissions/recent?${apiParams}`);
      return {
        submissions: response.data.submissions,
        total: response.data.total || response.data.submissions.length,
        page: currentPage,
        limit,
        totalPages: Math.ceil((response.data.total || response.data.submissions.length) / limit)
      } as SubmissionsResponse;
    },
    refetchInterval: 30000,
  });

  // Fetch projects for filter dropdown
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiClient.get('/projects');
      return response.data;
    }
  });

  // Bulk retry mutation
  const retryMutation = useMutation({
    mutationFn: async (submissionIds: string[]) => {
      const results = await Promise.allSettled(
        submissionIds.map(id => 
          apiClient.post(`/admin/submissions/${id}/retry`)
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setSelectedSubmissions([]);
      setBulkAction('');
    },
  });

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [filters.search]);

  const handleFilterChange = (key: keyof SubmissionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleBulkAction = () => {
    if (bulkAction === 'retry' && selectedSubmissions.length > 0) {
      retryMutation.mutate(selectedSubmissions);
    }
    if (bulkAction === 'export' && selectedSubmissions.length > 0) {
      // Export functionality would go here
      console.log('Exporting:', selectedSubmissions);
    }
  };

  const getStatusColor = (status: string): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'pending' => {
    switch (status.toLowerCase()) {
      case 'completed': case 'submitted': return 'healthy';
      case 'processing': case 'generating': return 'pending';
      case 'failed': case 'error': return 'unhealthy';
      case 'review': case 'draft': return 'degraded';
      default: return 'unknown';
    }
  };

  const toggleSelectAll = () => {
    if (selectedSubmissions.length === submissionsData?.submissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(submissionsData?.submissions.map(s => s.id) || []);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <div className="p-6">
        <AlertBanner
          type="error"
          title="Unable to load submissions"
          message={error instanceof Error ? error.message : 'Failed to fetch submissions data'}
          actions={[{ label: 'Retry', onClick: () => refetch(), variant: 'outline' }]}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Submissions</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all submissions across projects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <FunnelIcon className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total"
          value={submissionsData?.total || 0}
          icon={ClockIcon}
          loading={isLoading}
        />
        <MetricCard
          title="Processing"
          value={submissionsData?.submissions.filter(s => s.status === 'PROCESSING').length || 0}
          icon={ClockIcon}
          loading={isLoading}
        />
        <MetricCard
          title="Completed"
          value={submissionsData?.submissions.filter(s => s.status === 'COMPLETED').length || 0}
          icon={CheckCircleIcon}
          loading={isLoading}
        />
        <MetricCard
          title="Failed"
          value={submissionsData?.submissions.filter(s => s.status === 'FAILED').length || 0}
          icon={ExclamationTriangleIcon}
          loading={isLoading}
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, address..."
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full text-sm"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="NEW">New</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pathway</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={filters.pathway}
                onChange={(e) => handleFilterChange('pathway', e.target.value)}
              >
                <option value="">All Pathways</option>
                <option value="direct">Direct</option>
                <option value="review">Review</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={filters.projectId}
                onChange={(e) => handleFilterChange('projectId', e.target.value)}
              >
                <option value="">All Projects</option>
                {projects?.map((project: any) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedSubmissions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-blue-800">
            {selectedSubmissions.length} submission{selectedSubmissions.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <select
              className="px-3 py-1 border border-blue-300 rounded text-sm"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">Choose action...</option>
              <option value="retry">Retry Failed</option>
              <option value="export">Export Data</option>
            </select>
            <Button 
              size="sm" 
              onClick={handleBulkAction}
              disabled={!bulkAction || retryMutation.isPending}
            >
              {retryMutation.isPending ? 'Processing...' : 'Apply'}
            </Button>
          </div>
        </div>
      )}

      {/* Submissions Table */}
      <Card>
        {isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.length === submissionsData?.submissions.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Applicant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pathway
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submissionsData?.submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSubmissions.includes(submission.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSubmissions(prev => [...prev, submission.id]);
                          } else {
                            setSelectedSubmissions(prev => prev.filter(id => id !== submission.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {submission.applicant_first_name} {submission.applicant_last_name}
                        </div>
                        <div className="text-sm text-gray-500">{submission.applicant_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{submission.project_name}</div>
                      {submission.application_number && (
                        <div className="text-sm text-gray-500">#{submission.application_number}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {submission.site_address}
                    </td>
                    <td className="px-4 py-3">
                      <StatusIndicator status={getStatusColor(submission.status)} label={submission.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                        {submission.pathway}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(submission.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        {submission.google_doc_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={submission.google_doc_url} target="_blank" rel="noopener noreferrer">
                              <PencilIcon className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        {submission.status === 'FAILED' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => retryMutation.mutate([submission.id])}
                            disabled={retryMutation.isPending}
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {submissionsData && submissionsData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, submissionsData.total)} of {submissionsData.total} submissions
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Previous
            </Button>
            {[...Array(submissionsData.totalPages)].map((_, i) => (
              <Button
                key={i}
                variant={currentPage === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === submissionsData.totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
