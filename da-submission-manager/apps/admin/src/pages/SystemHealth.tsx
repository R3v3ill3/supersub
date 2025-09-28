import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

interface SystemHealth {
  ok: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  timestamp: string;
  responseTime: number;
  components: HealthCheck[];
  metrics: {
    responseTime: number;
    errorRate: number;
    queueDepth: number;
    activeConnections: number;
  };
}

interface RetryOperation {
  id: string;
  submission_id: string;
  operation_type: string;
  status: 'pending' | 'retrying' | 'completed' | 'failed' | 'cancelled';
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  created_at: string;
  applicant_name?: string;
  project_name?: string;
}

interface RetryStatistics {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  operationStats: Record<string, { attempts: number; successes: number; failures: number }>;
}

export default function SystemHealth() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [retryOperations, setRetryOperations] = useState<RetryOperation[]>([]);
  const [retryStats, setRetryStats] = useState<RetryStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/health/system', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }
      
      const data = await response.json();
      setSystemHealth(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchRetryOperations = async () => {
    try {
      const response = await fetch('/api/admin/health/detailed', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch retry operations');
      }
      
      const data = await response.json();
      if (data.current && data.current.checks) {
        setSystemHealth(data.current);
      }
      if (data.retryStatistics) {
        setRetryStats(data.retryStatistics);
      }
      // We would need to add recovery operations to the API response
      // setRetryOperations(data.retryOperations || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchRetryStatistics = async () => {
    try {
      const response = await fetch('/api/admin/retry/statistics', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch retry statistics');
      }
      
      const data = await response.json();
      setRetryStats(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const retryOperation = async (operationId: string) => {
    try {
      const response = await fetch(`/api/admin/retry/${operationId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to retry operation');
      }
      
      const result = await response.json();
      if (result.success) {
        // Refresh the operations list
        await fetchRetryOperations();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchSystemHealth(),
          fetchRetryOperations(),
          fetchRetryStatistics()
        ]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatUptime = (responseTime: number) => {
    if (responseTime < 1000) return `${responseTime}ms`;
    return `${(responseTime / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">System Health</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">Error loading system health: {error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-2"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
        <div className="flex gap-2">
          <Button onClick={fetchSystemHealth} variant="outline">
            Refresh
          </Button>
          {systemHealth && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemHealth.status)}`}>
              System {systemHealth.status.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Overall Health Summary */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-600">Response Time</div>
            <div className="text-2xl font-bold">{formatUptime(systemHealth.responseTime)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Error Rate</div>
            <div className="text-2xl font-bold">{systemHealth.metrics.errorRate}/hour</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Queue Depth</div>
            <div className="text-2xl font-bold">{systemHealth.metrics.queueDepth}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Last Check</div>
            <div className="text-sm font-medium">
              {new Date(systemHealth.timestamp).toLocaleTimeString()}
            </div>
          </Card>
        </div>
      )}

      {/* Component Health */}
      {systemHealth && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Component Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemHealth.components.map((component) => (
              <div key={component.name} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium capitalize">{component.name.replace('_', ' ')}</div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(component.status)}`}>
                    {component.status.toUpperCase()}
                  </span>
                </div>
                {component.responseTime && (
                  <div className="text-sm text-gray-600 mb-1">
                    Response: {formatUptime(component.responseTime)}
                  </div>
                )}
                {component.message && (
                  <div className="text-sm text-gray-700">{component.message}</div>
                )}
                {component.details && Object.keys(component.details).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-blue-600 cursor-pointer">Details</summary>
                    <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
                      {JSON.stringify(component.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Retry Statistics */}
      {retryStats && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Retry Statistics (Last 24 Hours)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{retryStats.totalRetries}</div>
              <div className="text-sm text-gray-600">Total Retries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{retryStats.successfulRetries}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{retryStats.failedRetries}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
          
          {Object.keys(retryStats.operationStats).length > 0 && (
            <div>
              <h3 className="font-medium mb-3">By Operation Type</h3>
              <div className="space-y-2">
                {Object.entries(retryStats.operationStats).map(([operation, stats]) => (
                  <div key={operation} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div className="font-medium capitalize">{operation.replace('_', ' ')}</div>
                    <div className="flex gap-4 text-sm">
                      <span>Attempts: {stats.attempts}</span>
                      <span className="text-green-600">Success: {stats.successes}</span>
                      <span className="text-red-600">Failed: {stats.failures}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Active Recovery Operations */}
      {retryOperations.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Active Recovery Operations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Operation</th>
                  <th className="text-left p-2">Submission</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Retries</th>
                  <th className="text-left p-2">Next Retry</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {retryOperations.map((operation) => (
                  <tr key={operation.id} className="border-b">
                    <td className="p-2 capitalize">{operation.operation_type.replace('_', ' ')}</td>
                    <td className="p-2">
                      {operation.applicant_name && (
                        <div className="font-medium">{operation.applicant_name}</div>
                      )}
                      <div className="text-gray-600">{operation.project_name}</div>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        operation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        operation.status === 'retrying' ? 'bg-blue-100 text-blue-800' :
                        operation.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {operation.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2">{operation.retry_count} / {operation.max_retries}</td>
                    <td className="p-2">
                      {operation.next_retry_at ? (
                        new Date(operation.next_retry_at).toLocaleString()
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-2">
                      {(operation.status === 'failed' || operation.status === 'pending') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              Retry Now
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Manual Retry</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to manually retry this operation? 
                                This will attempt to process the {operation.operation_type} operation again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => retryOperation(operation.id)}>
                                Retry Operation
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
