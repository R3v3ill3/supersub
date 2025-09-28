import { useMemo, useState } from 'react';
import {
  FolderPlusIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  ChartBarIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { 
  MetricCard, 
  StatusIndicator, 
  ActivityFeed, 
  QuickActions, 
  AlertBanner 
} from '../components/dashboard';
import { 
  useSubmissionStats, 
  useRecentSubmissions, 
  useFailedSubmissions, 
  useSystemHealth,
  useDashboardAnalytics 
} from '../hooks/useMonitoringData';
import { Button } from '../components/ui/button';

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Data hooks
  const { data: submissionStats, isLoading: statsLoading, error: statsError } = useSubmissionStats();
  const { data: recentSubmissions, isLoading: recentLoading } = useRecentSubmissions(8);
  const { data: failedSubmissions } = useFailedSubmissions(3);
  const { data: systemHealth } = useSystemHealth();
  const { data: dashboardStats, isLoading: dashboardLoading } = useDashboardAnalytics();

  // Refresh handler
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Alert handler
  const dismissAlert = (id: string) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  // Metrics data
  const metricsData = useMemo(() => {
    if (!submissionStats || !dashboardStats) return [];

    const stats = submissionStats.stats;
    const dash = dashboardStats;

    return [
      {
        title: 'Total Submissions',
        value: stats?.total || dash.submissions?.total || 0,
        change: {
          value: 12,
          trend: 'up' as const,
          period: 'last week'
        },
        icon: ClipboardDocumentListIcon
      },
      {
        title: 'Success Rate',
        value: `${Math.round((stats?.successRate || 85))}%`,
        change: {
          value: 3,
          trend: 'up' as const,
          period: 'last month'
        },
        icon: CheckCircleIcon
      },
      {
        title: 'Active Projects',
        value: dash.projects?.active || 0,
        icon: FolderPlusIcon
      },
      {
        title: 'Failed Today',
        value: Object.entries(stats?.byStatus || {}).find(([status]) => status === 'FAILED')?.[1] || 0,
        change: failedSubmissions && failedSubmissions.length > 0 ? {
          value: 15,
          trend: 'down' as const,
          period: 'yesterday'
        } : undefined,
        icon: ExclamationCircleIcon
      }
    ];
  }, [submissionStats, dashboardStats, failedSubmissions]);

  // Quick actions
  const quickActionsData = [
    {
      id: 'create-project',
      title: 'Create New Project',
      description: 'Set up a new DA submission project',
      href: '/projects/new',
      icon: FolderPlusIcon,
    },
    {
      id: 'view-submissions',
      title: 'Monitor Submissions',
      description: 'View and manage all submissions',
      href: '/submissions',
      icon: ClipboardDocumentListIcon,
      badge: failedSubmissions?.length ? {
        text: `${failedSubmissions.length} failed`,
        variant: 'error' as const
      } : undefined
    },
    {
      id: 'system-health',
      title: 'System Health',
      description: 'Check system status and performance',
      href: '/system-health',
      icon: HeartIcon,
      badge: systemHealth?.status !== 'healthy' ? {
        text: systemHealth?.status || 'unknown',
        variant: systemHealth?.status === 'unhealthy' ? 'error' as const : 'warning' as const
      } : undefined
    },
    {
      id: 'templates',
      title: 'Manage Templates',
      description: 'Update document templates and surveys',
      href: '/templates',
      icon: DocumentTextIcon,
    },
    {
      id: 'analytics',
      title: 'View Analytics',
      description: 'Detailed reports and trends',
      href: '/analytics',
      icon: ChartBarIcon,
    }
  ];

  // Activity feed data
  const activityData = useMemo(() => {
    if (!recentSubmissions) return [];
    
    return recentSubmissions.slice(0, 6).map(submission => ({
      id: submission.id,
      type: submission.status === 'FAILED' ? 'error' as const : 
            submission.status === 'COMPLETED' ? 'success' as const : 
            'info' as const,
      title: `New submission: ${submission.applicant_name}`,
      description: `${submission.project_name} - ${submission.site_address}`,
      timestamp: submission.created_at,
      metadata: {
        pathway: submission.pathway,
        status: submission.status
      }
    }));
  }, [recentSubmissions]);

  // Loading state
  if (statsLoading || dashboardLoading) {
    return (
      <div className="p-6 space-y-6">
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <MetricCard key={i} title="" value={0} loading={true} />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickActions actions={[]} title="Loading..." />
          <ActivityFeed activities={[]} loading={true} />
        </div>
      </div>
    );
  }

  // Error state
  if (statsError) {
    return (
      <div className="p-6">
        <AlertBanner
          type="error"
          title="Unable to load dashboard"
          message={statsError instanceof Error ? statsError.message : 'Dashboard data is currently unavailable'}
          actions={[
            {
              label: 'Retry',
              onClick: handleRefresh,
              variant: 'outline'
            }
          ]}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring of your DA submission system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {systemHealth && (
            <StatusIndicator 
              status={systemHealth.status} 
              label={`System ${systemHealth.status}`}
            />
          )}
        </div>
      </div>

      {/* System alerts */}
      {systemHealth?.status === 'unhealthy' && !dismissedAlerts.includes('system-unhealthy') && (
        <AlertBanner
          type="error"
          title="System Health Critical"
          message="One or more system components are experiencing issues. Check system health page for details."
          onDismiss={() => dismissAlert('system-unhealthy')}
          actions={[
            {
              label: 'View Details',
              onClick: () => window.location.href = '/system-health',
              variant: 'primary'
            }
          ]}
        />
      )}

      {failedSubmissions && failedSubmissions.length > 0 && !dismissedAlerts.includes('failed-submissions') && (
        <AlertBanner
          type="warning"
          title={`${failedSubmissions.length} Failed Submissions`}
          message="Some submissions have failed processing and may need attention."
          onDismiss={() => dismissAlert('failed-submissions')}
          actions={[
            {
              label: 'Review Failed',
              onClick: () => window.location.href = '/submissions?status=FAILED',
              variant: 'outline'
            }
          ]}
        />
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsData.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <QuickActions 
          actions={quickActionsData} 
          title="Quick Actions"
          columns={2}
        />

        {/* Recent Activity */}
        <ActivityFeed 
          activities={activityData}
          maxItems={6}
          loading={recentLoading}
        />
      </div>

      {/* Additional Info Row */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-600">Response Time</div>
            <div className="text-2xl font-bold text-gray-900">
              {systemHealth.responseTime < 1000 
                ? `${systemHealth.responseTime}ms` 
                : `${(systemHealth.responseTime / 1000).toFixed(2)}s`
              }
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-600">Queue Depth</div>
            <div className="text-2xl font-bold text-gray-900">{systemHealth.metrics.queueDepth}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-600">Error Rate</div>
            <div className="text-2xl font-bold text-gray-900">{systemHealth.metrics.errorRate}/hour</div>
          </div>
        </div>
      )}
    </div>
  );
}
