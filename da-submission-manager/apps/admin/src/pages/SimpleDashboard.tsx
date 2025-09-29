import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import {
  FolderAddIcon,
  FormIcon,
  DocumentIcon,
  SuccessIcon,
} from '@da/ui/icons';
import { 
  useSubmissionStats, 
  useRecentSubmissions, 
  useDashboardAnalytics 
} from '../hooks/useMonitoringData';

export default function SimpleDashboard() {
  // Data hooks
  const { data: submissionStats, isLoading: statsLoading } = useSubmissionStats();
  const { data: recentSubmissions, isLoading: recentLoading } = useRecentSubmissions(6);
  const { data: dashboardStats, isLoading: dashboardLoading } = useDashboardAnalytics();
  const containerStyle: React.CSSProperties = {
    padding: '24px'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '32px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0'
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#6b7280',
    margin: 0,
    fontSize: '16px'
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    padding: '24px'
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '8px 0 0 0'
  };

  const quickActionsStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  };

  const actionCardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    padding: '24px',
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    transition: 'box-shadow 0.2s'
  };

  const iconStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    color: '#3b82f6'
  };

  // Compute stats from live data
  const stats = useMemo(() => {
    if (statsLoading || dashboardLoading) {
      return [
        { label: 'Total Projects', value: '...' },
        { label: 'Active Projects', value: '...' },
        { label: 'Pending Submissions', value: '...' },
        { label: 'Completed', value: '...' }
      ];
    }

    const submissionData = submissionStats?.stats;
    const dashData = dashboardStats;

    return [
      { 
        label: 'Total Projects', 
        value: dashData?.projects?.total || 0 
      },
      { 
        label: 'Active Projects', 
        value: dashData?.projects?.active || 0 
      },
      { 
        label: 'Pending Submissions', 
        value: Object.entries(submissionData?.byStatus || {}).find(([status]) => status === 'PENDING')?.[1] || 0
      },
      { 
        label: 'Completed', 
        value: Object.entries(submissionData?.byStatus || {}).find(([status]) => status === 'COMPLETED')?.[1] || 0
      }
    ];
  }, [submissionStats, dashboardStats, statsLoading, dashboardLoading]);

  const quickActions = [
    {
      title: 'Create New Project',
      description: 'Set up a new DA submission project',
      href: '/projects/new',
        icon: FolderAddIcon,
    },
    {
      title: 'View Submissions',
      description: 'Monitor and manage submissions',
      href: '/submissions',
        icon: FormIcon,
    },
    {
      title: 'Manage Templates',
      description: 'Update document templates and surveys',
      href: '/templates',
        icon: DocumentIcon,
    },
  ];

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Dashboard</h1>
        <p style={subtitleStyle}>Overview of your DA submission system</p>
      </div>

      {/* Stats Cards */}
      <div style={gridStyle}>
        {stats.map((stat, index) => (
          <div key={index} style={cardStyle}>
            <p style={statValueStyle}>{stat.value}</p>
            <p style={statLabelStyle}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
          Quick Actions
        </h2>
      </div>
      
      <div style={quickActionsStyle}>
        {quickActions.map((action, index) => (
          <Link
            key={index}
            to={action.href}
            style={actionCardStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ marginRight: '16px', padding: '8px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
                <action.icon style={iconStyle} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>
                  {action.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  {action.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Activity Feed */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
          Recent Activity
        </h2>
        <div style={cardStyle}>
          {recentLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              Loading recent activity...
            </div>
          ) : recentSubmissions && recentSubmissions.length > 0 ? (
            recentSubmissions.slice(0, 3).map((submission, index) => (
              <div key={submission.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: index < 2 ? '16px' : '0' 
              }}>
                <SuccessIcon style={{ 
                  width: '20px', 
                  height: '20px', 
                color: submission.status === 'COMPLETED' ? '#10b981' : 
                       submission.status === 'FAILED' ? '#ef4444' : '#3b82f6', 
                  marginRight: '12px' 
                }} />
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#111827' }}>
                    New submission: <strong>{submission.applicant_name}</strong>
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                    {submission.project_name} - {new Date(submission.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
