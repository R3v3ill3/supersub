import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarIcon,
  ChartBarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { MetricCard, ChartContainer, AlertBanner } from '../components/dashboard';
import { apiClient } from '../lib/api';

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

  // Fetch analytics data
  const { 
    data: analyticsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['analytics', dateRange, selectedProject],
    queryFn: async () => {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end
      });
      if (selectedProject) params.set('project_id', selectedProject);
      
      const response = await apiClient.get(`/admin/analytics?${params}`);
      return response.data as AnalyticsData;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Fetch projects for filter
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const response = await apiClient.get('/projects');
      return response.data;
    }
  });

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    if (!analyticsData) return [];

    const totalSubmissions = analyticsData.submissionTrends.reduce((sum, day) => sum + day.count, 0);
    const totalCompletions = analyticsData.submissionTrends.reduce((sum, day) => sum + day.completions, 0);
    const totalFailures = analyticsData.submissionTrends.reduce((sum, day) => sum + day.failures, 0);
    
    const successRate = totalSubmissions > 0 ? (totalCompletions / totalSubmissions) * 100 : 0;
    const failureRate = totalSubmissions > 0 ? (totalFailures / totalSubmissions) * 100 : 0;

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
        icon: ArrowTrendingUpIcon
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
        icon: UserGroupIcon
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
      <div className="p-6">
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Detailed insights and trends for your submission system</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">All Projects</option>
            {projects?.map((project: any) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} loading={isLoading} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Trends */}
        <ChartContainer
          title="Submission Trends"
          subtitle={`${dateRange.start} to ${dateRange.end}`}
          loading={isLoading}
          height={300}
        >
          <div className="w-full h-full flex items-center justify-center">
            {submissionChartData.length > 0 ? (
              <div className="w-full">
                <svg viewBox="0 0 400 200" className="w-full h-full">
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
                  <text x="200" y="100" textAnchor="middle" className="text-sm fill-gray-500">
                    Chart visualization coming soon
                  </text>
                </svg>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <ChartBarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
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
          <div className="w-full h-full">
            {pathwayChartData.length > 0 ? (
              <div className="space-y-4 p-4">
                {pathwayChartData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: `hsl(${index * 120}, 70%, 60%)` }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{item.value}</div>
                      <div className="text-sm text-gray-500">{item.successRate.toFixed(1)}% success</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <FunnelIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No pathway data available</p>
                </div>
              </div>
            )}
          </div>
        </ChartContainer>
      </div>

      {/* Project Performance Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Performance</h3>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : analyticsData?.projectStats.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-semibold">Project</th>
                    <th className="pb-3 font-semibold text-right">Submissions</th>
                    <th className="pb-3 font-semibold text-right">Success Rate</th>
                    <th className="pb-3 font-semibold text-right">Avg Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analyticsData.projectStats.map((project, index) => (
                    <tr key={index}>
                      <td className="py-3 font-medium">{project.project_name}</td>
                      <td className="py-3 text-right">{project.submissions}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {project.success_rate > 90 ? (
                            <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                          ) : project.success_rate < 70 ? (
                            <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                          ) : null}
                          {project.success_rate.toFixed(1)}%
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        {(project.avg_processing_time / 60).toFixed(1)}min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ChartBarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No project data available for the selected period</p>
            </div>
          )}
        </div>
      </Card>

      {/* Conversion Funnel */}
      {analyticsData?.conversionFunnel && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <div className="space-y-3">
              {analyticsData.conversionFunnel.map((stage, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-right">{stage.stage}</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${stage.conversionRate}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {stage.count} ({stage.conversionRate.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
