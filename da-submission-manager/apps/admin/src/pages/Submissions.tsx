import { useEffect, useState, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SearchIcon,
  FilterIcon,
  SuccessIcon,
  RefreshIcon,
  ViewIcon,
  EditIcon,
  PendingIcon,
  WarningIcon,
} from '@da/ui/icons';
import { Button } from '../components/ui/button';
import { StatusIndicator, AlertBanner } from '../components/dashboard';
import { apiClient } from '../lib/api';

// Inline styles to avoid Tailwind dependency
const pageStyle: CSSProperties = {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '16px',
};

const titleStyle: CSSProperties = {
  fontSize: '30px',
  fontWeight: 'bold',
  color: '#111827',
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: '#6b7280',
  marginTop: '4px',
};

const buttonGroupStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const iconStyle: CSSProperties = {
  width: '16px',
  height: '16px',
  marginRight: '8px',
};

const metricsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
};

const filtersCardStyle: CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  padding: '16px',
};

const filtersGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const labelStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '4px',
};

const inputStyle: CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  width: '100%',
};

const searchInputStyle: CSSProperties = {
  paddingLeft: '40px',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  width: '100%',
};

const searchIconContainerStyle: CSSProperties = {
  position: 'relative',
};

const searchIconStyle: CSSProperties = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '16px',
  height: '16px',
  color: '#9ca3af',
};

const bulkActionsStyle: CSSProperties = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  padding: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '8px',
};

const bulkTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#1e40af',
};

const bulkControlsStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
};

const tableCardStyle: CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  overflow: 'hidden',
};

const tableStyle: CSSProperties = {
  width: '100%',
  fontSize: '14px',
};

const tableHeaderStyle: CSSProperties = {
  backgroundColor: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
};

const tableHeaderCellStyle: CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: '500',
  color: '#6b7280',
  textTransform: 'uppercase',
};

const tableRowStyle: CSSProperties = {
  borderBottom: '1px solid #e5e7eb',
};

const tableCellStyle: CSSProperties = {
  padding: '12px 16px',
};

const paginationStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '16px',
};

const paginationTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#374151',
};

const paginationButtonsStyle: CSSProperties = {
  display: 'flex',
  gap: '4px',
};

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
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const queryClient = useQueryClient();

  const {
    data: submissionsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['submissions', filters, currentPage, limit],
    queryFn: async () => {
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

      const response = await apiClient.get(`/admin/submissions/recent?${params.toString()}`);
      const submissions = response.data.submissions ?? [];
      const total = response.data.total ?? submissions.length;
      return {
        submissions,
        total,
        page: currentPage,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      } as {
        submissions: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
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
        submissionIds.map((id) =>
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
    if (!submissionsData?.submissions?.length) {
      setSelectedSubmissions([]);
      return;
    }

    if (selectedSubmissions.length === submissionsData.submissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(submissionsData.submissions.map((s: any) => s.id));
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <div style={pageStyle}>
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
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Submissions</h1>
          <p style={subtitleStyle}>Monitor and manage all submissions across projects</p>
        </div>
        <div style={buttonGroupStyle}>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshIcon style={iconStyle} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <FilterIcon style={iconStyle} />
            Filters
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={metricsGridStyle}>
        <SimpleMetricCard
          title="Total"
          value={submissionsData?.total ?? 0}
          icon={PendingIcon}
          loading={isLoading}
        />
        <SimpleMetricCard
          title="Processing"
          value={submissionsData?.submissions.filter((s) => s.status === 'PROCESSING').length ?? 0}
          icon={PendingIcon}
          loading={isLoading}
        />
        <SimpleMetricCard
          title="Completed"
          value={submissionsData?.submissions.filter((s) => s.status === 'COMPLETED').length ?? 0}
          icon={SuccessIcon}
          loading={isLoading}
        />
        <SimpleMetricCard
          title="Failed"
          value={submissionsData?.submissions.filter((s) => s.status === 'FAILED').length ?? 0}
          icon={WarningIcon}
          loading={isLoading}
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={filtersCardStyle}>
          <div style={filtersGridStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Search</label>
              <div style={searchIconContainerStyle}>
                <SearchIcon style={searchIconStyle} />
                <input
                  type="text"
                  placeholder="Search by name, email, address..."
                  style={searchInputStyle}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Status</label>
              <select
                style={inputStyle}
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

            <div style={fieldStyle}>
              <label style={labelStyle}>Pathway</label>
              <select
                style={inputStyle}
                value={filters.pathway}
                onChange={(e) => handleFilterChange('pathway', e.target.value)}
              >
                <option value="">All Pathways</option>
                <option value="direct">Direct</option>
                <option value="review">Review</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Project</label>
              <select
                style={inputStyle}
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
        </div>
      )}

      {/* Bulk Actions */}
      {selectedSubmissions.length > 0 && (
        <div style={bulkActionsStyle}>
          <span style={bulkTextStyle}>
            {selectedSubmissions.length} submission{selectedSubmissions.length !== 1 ? 's' : ''} selected
          </span>
          <div style={bulkControlsStyle}>
            <select
              style={{ ...inputStyle, border: '1px solid #bfdbfe' }}
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
      <div style={tableCardStyle}>
        {isLoading ? (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: '64px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}></div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead style={tableHeaderStyle}>
                <tr>
                  <th style={tableHeaderCellStyle}>
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.length === submissionsData?.submissions.length}
                      onChange={toggleSelectAll}
                      style={{ borderRadius: '4px', border: '1px solid #d1d5db' }}
                    />
                  </th>
                  <th style={tableHeaderCellStyle}>Applicant</th>
                  <th style={tableHeaderCellStyle}>Project</th>
                  <th style={tableHeaderCellStyle}>Address</th>
                  <th style={tableHeaderCellStyle}>Status</th>
                  <th style={tableHeaderCellStyle}>Pathway</th>
                  <th style={tableHeaderCellStyle}>Created</th>
                  <th style={tableHeaderCellStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissionsData?.submissions.map((submission: any) => (
                  <tr key={submission.id} style={tableRowStyle}>
                    <td style={tableCellStyle}>
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
                        style={{ borderRadius: '4px', border: '1px solid #d1d5db' }}
                      />
                    </td>
                    <td style={tableCellStyle}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {submission.applicant_first_name} {submission.applicant_last_name}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>{submission.applicant_email}</div>
                      </div>
                    </td>
                    <td style={tableCellStyle}>
                      <div style={{ fontWeight: '500', color: '#111827' }}>{submission.project_name}</div>
                      {submission.application_number && (
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>#{submission.application_number}</div>
                      )}
                    </td>
                    <td style={{ ...tableCellStyle, fontSize: '14px', color: '#111827' }}>
                      {submission.site_address}
                    </td>
                    <td style={tableCellStyle}>
                      <StatusIndicator status={getStatusColor(submission.status)} label={submission.status} size="sm" />
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        borderRadius: '9999px',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        textTransform: 'capitalize'
                      }}>
                        {submission.pathway}
                      </span>
                    </td>
                    <td style={{ ...tableCellStyle, fontSize: '14px', color: '#6b7280' }}>
                      {formatDate(submission.created_at)}
                    </td>
                    <td style={tableCellStyle}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button variant="ghost" size="sm">
                          <ViewIcon style={{ width: '16px', height: '16px' }} />
                        </Button>
                        {submission.google_doc_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={submission.google_doc_url} target="_blank" rel="noopener noreferrer">
                              <EditIcon style={{ width: '16px', height: '16px' }} />
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
                            <RefreshIcon style={{ width: '16px', height: '16px' }} />
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
      </div>

      {/* Pagination */}
      {submissionsData && submissionsData.totalPages > 1 && (
        <div style={paginationStyle}>
          <div style={paginationTextStyle}>
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, submissionsData.total)} of {submissionsData.total} submissions
          </div>
          <div style={paginationButtonsStyle}>
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

// Simple MetricCard component with inline styles to avoid Tailwind dependency
interface SimpleMetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ComponentType<{ style?: CSSProperties }>;
  loading?: boolean;
}

const SimpleMetricCard: React.FC<SimpleMetricCardProps> = ({
  title,
  value,
  icon: Icon,
  loading = false
}) => {
  const cardStyle: CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    padding: '24px',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  };

  const iconStyle: CSSProperties = {
    width: '20px',
    height: '20px',
    color: '#6b7280',
  };

  const titleStyle: CSSProperties = {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
  };

  const valueStyle: CSSProperties = {
    fontSize: '30px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ height: '16px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '50%' }}></div>
          <div style={{ height: '32px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '33%' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        {Icon && <Icon style={iconStyle} />}
        <p style={titleStyle}>{title}</p>
      </div>
      <p style={valueStyle}>{value}</p>
    </div>
  );
};
