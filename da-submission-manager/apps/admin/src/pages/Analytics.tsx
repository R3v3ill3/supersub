import { useState, useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarIcon,
  ChartBarIcon,
  FunnelIcon,
  DownloadIcon,
  TrendUpIcon,
  UsersIcon,
  ClockIcon,
} from '@da/ui/icons';
import { ChartContainer, AlertBanner } from '../components/dashboard';
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
  flexDirection: 'column',
  gap: '16px',
};

const headerContentStyle: CSSProperties = {
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

const filtersStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const filterRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
};

const iconStyle: CSSProperties = {
  width: '16px',
  height: '16px',
  color: '#9ca3af',
};

const inputStyle: CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '14px',
};

const selectStyle: CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '14px',
};

const buttonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 12px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#374151',
  backgroundColor: 'white',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  cursor: 'pointer',
  textDecoration: 'none',
};

const buttonIconStyle: CSSProperties = {
  width: '16px',
  height: '16px',
  marginRight: '8px',
};

const metricsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '24px',
};

const chartsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
  gap: '24px',
};

const cardStyle: CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  padding: '24px',
};

const chartContainerStyle: CSSProperties = {
  width: '100%',
  height: '300px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const emptyStateStyle: CSSProperties = {
  textAlign: 'center',
  color: '#6b7280',
};


const tableStyle: CSSProperties = {
  width: '100%',
  fontSize: '14px',
};

const tableHeaderStyle: CSSProperties = {
  borderBottom: '1px solid #e5e7eb',
  textAlign: 'left',
};

const tableHeaderCellStyle: CSSProperties = {
  paddingBottom: '12px',
  fontWeight: '600',
};

const tableBodyStyle: CSSProperties = {
  borderTop: '1px solid #f3f4f6',
};

const tableCellStyle: CSSProperties = {
  padding: '12px 0',
  borderBottom: '1px solid #f3f4f6',
};

const pathwayItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '16px',
};

const pathwayLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const pathwayColorStyle: CSSProperties = {
  width: '16px',
  height: '16px',
  borderRadius: '4px',
};

const pathwayStatsStyle: CSSProperties = {
  textAlign: 'right',
};

const funnelItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  marginBottom: '12px',
};

const funnelLabelStyle: CSSProperties = {
  width: '96px',
  fontSize: '14px',
  fontWeight: '500',
  textAlign: 'right',
};

const funnelBarContainerStyle: CSSProperties = {
  flex: 1,
  backgroundColor: '#e5e7eb',
  borderRadius: '9999px',
  height: '24px',
  position: 'relative',
  overflow: 'hidden',
};

const funnelBarStyle = (width: number): CSSProperties => ({
  backgroundColor: '#3b82f6',
  height: '100%',
  borderRadius: '9999px',
  width: `${width}%`,
  transition: 'width 0.5s ease',
});

const funnelTextStyle: CSSProperties = {
  position: 'absolute',
  inset: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  fontWeight: '500',
  color: 'white',
};

interface AnalyticsData {
  submissionTrends: Array<{
    date: string;
    count: number;
    completions: number;
    failures: number;
  }>;
  pathwayBreakdown: Array<{
    pathway: string;
    count: number;
    successRate: number;
  }>;
  projectStats: Array<{
    project_name: string;
    submissions: number;
    success_rate: number;
    avg_processing_time: number;
  }>;
  timeMetrics: {
    avgProcessingTime: number;
    avgResponseTime: number;
    peakHours: Array<{ hour: number; count: number }>;
  };
  conversionFunnel: Array<{
    stage: string;
    count: number;
    conversionRate: number;
  }>;
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedProject, setSelectedProject] = useState<string>('');

  // Fetch analytics data - using mock data since endpoint doesn't exist yet
  const { 
    data: analyticsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['analytics', dateRange, selectedProject],
    queryFn: async () => {
      // Mock data until analytics endpoint is implemented
      return {
        submissionTrends: [
          { date: '2025-09-01', count: 5, completions: 4, failures: 1 },
          { date: '2025-09-15', count: 8, completions: 7, failures: 1 },
          { date: '2025-09-28', count: 3, completions: 3, failures: 0 },
        ],
        pathwayBreakdown: [
          { pathway: 'direct', count: 8, successRate: 87.5 },
          { pathway: 'review', count: 6, successRate: 83.3 },
          { pathway: 'draft', count: 2, successRate: 100 },
        ],
        projectStats: [
          { project_name: 'Gold Coast Development', submissions: 8, success_rate: 87.5, avg_processing_time: 1200 },
          { project_name: 'High Trees Project', submissions: 6, success_rate: 83.3, avg_processing_time: 1800 },
          { project_name: 'Central Park', submissions: 2, success_rate: 100, avg_processing_time: 900 },
        ],
        timeMetrics: {
          avgProcessingTime: 1300,
          avgResponseTime: 450,
          peakHours: [
            { hour: 9, count: 3 },
            { hour: 14, count: 5 },
            { hour: 16, count: 4 },
          ]
        },
        conversionFunnel: [
          { stage: 'Started', count: 20, conversionRate: 100 },
          { stage: 'Form Completed', count: 16, conversionRate: 80 },
          { stage: 'Documents Generated', count: 14, conversionRate: 70 },
          { stage: 'Submitted', count: 12, conversionRate: 60 },
        ]
      } as AnalyticsData;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Fetch projects for filter
  const { data: projectsResponse } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const response = await apiClient.get('/projects');
      return response.data;
    }
  });
  
  const projects = projectsResponse?.projects || [];

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    if (!analyticsData) return [];

    const totalSubmissions = analyticsData.submissionTrends.reduce((sum, day) => sum + day.count, 0);
    const totalCompletions = analyticsData.submissionTrends.reduce((sum, day) => sum + day.completions, 0);
    const successRate = totalSubmissions > 0 ? (totalCompletions / totalSubmissions) * 100 : 0;

    return [
      {
        title: 'Total Submissions',
        value: totalSubmissions,
        change: {
          value: 12,
          trend: 'up' as const,
          period: 'vs last period'
        },
        icon: ChartBarIcon
      },
      {
        title: 'Success Rate',
        value: `${successRate.toFixed(1)}%`,
        change: {
          value: 3.2,
          trend: successRate > 80 ? 'up' as const : 'down' as const,
          period: 'vs last period'
        },
        icon: TrendUpIcon
      },
      {
        title: 'Avg Processing Time',
        value: `${(analyticsData.timeMetrics.avgProcessingTime / 60).toFixed(1)}min`,
        change: {
          value: 5,
          trend: 'down' as const,
          period: 'vs last period'
        },
        icon: ClockIcon
      },
      {
        title: 'Active Projects',
        value: analyticsData.projectStats.length,
        icon: UsersIcon
      }
    ];
  }, [analyticsData]);

  // Prepare chart data
  const submissionChartData = useMemo(() => {
    if (!analyticsData?.submissionTrends) return [];
    
    return analyticsData.submissionTrends.map(trend => ({
      date: new Date(trend.date).toLocaleDateString('en-AU', { 
        month: 'short', 
        day: 'numeric' 
      }),
      submissions: trend.count,
      completions: trend.completions,
      failures: trend.failures
    }));
  }, [analyticsData]);

  const pathwayChartData = useMemo(() => {
    if (!analyticsData?.pathwayBreakdown) return [];
    
    return analyticsData.pathwayBreakdown.map(pathway => ({
      name: pathway.pathway.charAt(0).toUpperCase() + pathway.pathway.slice(1),
      value: pathway.count,
      successRate: pathway.successRate
    }));
  }, [analyticsData]);

  const handleExport = () => {
    // Export functionality would go here
    console.log('Exporting analytics data...');
  };

  if (error) {
    return (
      <div style={pageStyle}>
        <AlertBanner
          type="error"
          title="Unable to load analytics"
          message={error instanceof Error ? error.message : 'Analytics data is currently unavailable'}
          actions={[{ label: 'Retry', onClick: () => refetch(), variant: 'outline' }]}
        />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={headerContentStyle}>
          <div>
            <h1 style={titleStyle}>Analytics</h1>
            <p style={subtitleStyle}>Detailed insights and trends for your submission system</p>
          </div>
          
          <div style={filtersStyle}>
            {/* Date Range Filter */}
            <div style={filterRowStyle}>
              <CalendarIcon style={iconStyle} />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                style={inputStyle}
              />
              <span style={{ fontSize: '14px', color: '#6b7280' }}>to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div style={filterRowStyle}>
              {/* Project Filter */}
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                style={selectStyle}
              >
                <option value="">All Projects</option>
                {projects?.map((project: any) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>

              <button style={buttonStyle} onClick={handleExport}>
              <DownloadIcon style={buttonIconStyle} />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div style={metricsGridStyle}>
        {keyMetrics.map((metric, index) => (
          <SimpleMetricCard key={index} {...metric} loading={isLoading} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={chartsGridStyle}>
        {/* Submission Trends */}
        <ChartContainer
          title="Submission Trends"
          subtitle={`${dateRange.start} to ${dateRange.end}`}
          loading={isLoading}
          height={300}
        >
          <div style={chartContainerStyle}>
            {submissionChartData.length > 0 ? (
              <div style={{ width: '100%' }}>
                <svg viewBox="0 0 400 200" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="submissionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  
                  {/* Grid lines */}
                  <g stroke="#e5e7eb" strokeWidth="1">
                    {[0, 50, 100, 150, 200].map(y => (
                      <line key={y} x1="40" y1={y} x2="380" y2={y} />
                    ))}
                  </g>
                  
                  {/* Data visualization would go here */}
                  <text x="200" y="100" textAnchor="middle" style={{ fontSize: '14px', fill: '#6b7280' }}>
                    Chart visualization coming soon
                  </text>
                </svg>
              </div>
            ) : (
              <div style={emptyStateStyle}>
                <ChartBarIcon className="h-8 w-8 text-gray-400" />
                <p>No data available for selected period</p>
              </div>
            )}
          </div>
        </ChartContainer>

        {/* Pathway Breakdown */}
        <ChartContainer
          title="Pathway Distribution"
          subtitle="Breakdown by submission pathway"
          loading={isLoading}
          height={300}
        >
          <div style={{ width: '100%', height: '100%' }}>
            {pathwayChartData.length > 0 ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pathwayChartData.map((item, index) => (
                  <div key={index} style={pathwayItemStyle}>
                    <div style={pathwayLabelStyle}>
                      <div 
                        style={{ 
                          ...pathwayColorStyle,
                          backgroundColor: `hsl(${index * 120}, 70%, 60%)` 
                        }}
                      />
                      <span style={{ fontWeight: '500' }}>{item.name}</span>
                    </div>
                    <div style={pathwayStatsStyle}>
                      <div style={{ fontWeight: '600' }}>{item.value}</div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>{item.successRate.toFixed(1)}% success</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
                <div style={emptyStateStyle}>
                  <FunnelIcon className="h-8 w-8 text-gray-400" />
                  <p>No pathway data available</p>
                </div>
              </div>
            )}
          </div>
        </ChartContainer>
      </div>

      {/* Project Performance Table */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          Project Performance
        </h3>
        
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ height: '16px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '25%' }}></div>
                <div style={{ height: '16px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '64px' }}></div>
                <div style={{ height: '16px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '64px' }}></div>
                <div style={{ height: '16px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '80px' }}></div>
              </div>
            ))}
          </div>
        ) : analyticsData?.projectStats.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead style={tableHeaderStyle}>
                <tr>
                  <th style={tableHeaderCellStyle}>Project</th>
                  <th style={{ ...tableHeaderCellStyle, textAlign: 'right' }}>Submissions</th>
                  <th style={{ ...tableHeaderCellStyle, textAlign: 'right' }}>Success Rate</th>
                  <th style={{ ...tableHeaderCellStyle, textAlign: 'right' }}>Avg Time</th>
                </tr>
              </thead>
              <tbody style={tableBodyStyle}>
                {analyticsData.projectStats.map((project, index) => (
                  <tr key={index}>
                    <td style={{ ...tableCellStyle, fontWeight: '500' }}>{project.project_name}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>{project.submissions}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        {project.success_rate > 90 ? (
                          <TrendUpIcon style={{ width: '16px', height: '16px', color: '#10b981' }} />
                        ) : project.success_rate < 70 ? (
                          <TrendUpIcon style={{ width: '16px', height: '16px', color: '#ef4444', transform: 'rotate(180deg)' }} />
                        ) : null}
                        {project.success_rate.toFixed(1)}%
                      </div>
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                      {(project.avg_processing_time / 60).toFixed(1)}min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>
            <ChartBarIcon className="h-8 w-8 text-gray-400" />
            <p>No project data available for the selected period</p>
          </div>
        )}
      </div>

      {/* Conversion Funnel */}
      {analyticsData?.conversionFunnel && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            Conversion Funnel
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {analyticsData.conversionFunnel.map((stage, index) => (
              <div key={index} style={funnelItemStyle}>
                <div style={funnelLabelStyle}>{stage.stage}</div>
                <div style={funnelBarContainerStyle}>
                  <div style={funnelBarStyle(stage.conversionRate)} />
                  <div style={funnelTextStyle}>
                    {stage.count} ({stage.conversionRate.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
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
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
    period?: string;
  };
  icon?: React.ComponentType<{ style?: CSSProperties }>;
  loading?: boolean;
}

const SimpleMetricCard: React.FC<SimpleMetricCardProps> = ({
  title,
  value,
  change,
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
    margin: '8px 0',
  };

  const changeStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '8px',
  };

  const getChangeColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getChangeIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
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
      {change && (
        <div style={changeStyle}>
          <span style={{ fontSize: '14px', color: getChangeColor(change.trend) }}>
            {getChangeIcon(change.trend)} {Math.abs(change.value)}%
          </span>
          {change.period && (
            <span style={{ fontSize: '14px', color: '#6b7280' }}>vs {change.period}</span>
          )}
        </div>
      )}
    </div>
  );
};
