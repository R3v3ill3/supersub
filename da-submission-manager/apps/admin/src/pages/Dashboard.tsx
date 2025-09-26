import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FolderPlusIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';

interface DashboardStats {
  projects: {
    total: number;
    active: number;
  };
  submissions: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.dashboard.getStats();
      return response.data as DashboardStats;
    },
  });

  const statsCards = useMemo(() => {
    const safeStats = stats ?? {
      projects: { total: 0, active: 0 },
      submissions: { total: 0, pending: 0, completed: 0, failed: 0 },
    };

    return [
      {
        title: 'Total Projects',
        value: safeStats.projects.total,
        icon: FolderPlusIcon,
        iconColor: '#2563eb',
      },
      {
        title: 'Active Projects',
        value: safeStats.projects.active,
        icon: FolderPlusIcon,
        iconColor: '#10b981',
      },
      {
        title: 'Pending Submissions',
        value: safeStats.submissions.pending,
        icon: ClockIcon,
        iconColor: '#f97316',
      },
      {
        title: 'Completed Submissions',
        value: safeStats.submissions.completed,
        icon: CheckCircleIcon,
        iconColor: '#14b8a6',
      },
    ];
  }, [stats]);

  const quickActions = [
    {
      title: 'Create New Project',
      description: 'Set up a new DA submission project',
      href: '/projects/new',
      icon: FolderPlusIcon,
      color: '#3b82f6',
    },
    {
      title: 'View Submissions',
      description: 'Monitor and manage submissions',
      href: '/submissions',
      icon: ClipboardDocumentListIcon,
      color: '#059669',
    },
    {
      title: 'Manage Templates',
      description: 'Update document templates and surveys',
      href: '/templates',
      icon: DocumentTextIcon,
      color: '#7c3aed',
    },
  ];

  const containerStyle: React.CSSProperties = {
    padding: '24px',
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '24px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 8px 0',
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#6b7280',
    margin: 0,
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  };

  const statCardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 600,
    margin: '12px 0 0 0',
    color: '#111827',
  };

  const quickActionsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  };

  const quickActionCardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    padding: '24px',
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    transition: 'box-shadow 0.2s ease-in-out',
  };

  const iconWrapperStyle = (color: string): React.CSSProperties => ({
    borderRadius: '10px',
    padding: '12px',
    backgroundColor: color,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
  });

  const iconStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    color: '#ffffff',
  };

  const recentActivityStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ backgroundColor: '#f3f4f6', height: '32px', borderRadius: '4px', width: '256px', marginBottom: '24px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: '128px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', maxWidth: '640px' }}>
        <div
          style={{
            borderRadius: '12px',
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
            padding: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          <ExclamationTriangleIcon style={{ width: '24px', height: '24px', color: '#ef4444', flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#b91c1c', margin: '0 0 8px 0' }}>
              Unable to load dashboard
            </h2>
            <p style={{ fontSize: '14px', color: '#991b1b', margin: 0 }}>
              {error instanceof Error ? error.message : 'Dashboard stats are currently unavailable.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Dashboard</h1>
        <p style={subtitleStyle}>Overview of your DA submission system</p>
      </div>

      {/* Stats Cards */}
      <div style={statsGridStyle}>
        {statsCards.map((stat) => (
          <div key={stat.title} style={statCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={statLabelStyle}>{stat.title}</p>
              <stat.icon style={{ width: '24px', height: '24px', color: stat.iconColor }} />
            </div>
            <p style={statValueStyle}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>Quick Actions</h2>
        <div style={quickActionsGridStyle}>
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.href}
              style={quickActionCardStyle}
              onMouseEnter={(event) => {
                (event.currentTarget as HTMLElement).style.boxShadow =
                  '0 8px 16px rgba(15, 23, 42, 0.12)';
              }}
              onMouseLeave={(event) => {
                (event.currentTarget as HTMLElement).style.boxShadow =
                  '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={iconWrapperStyle(action.color)}>
                  <action.icon style={iconStyle} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
                    {action.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
          Recent Activity
        </h2>
        <div style={recentActivityStyle}>
          <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            <p style={{ margin: 0 }}>No recent activity to display.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
