import React from 'react';
import { Card } from '../ui/card';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ActivityItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'pending';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  maxItems?: number;
  className?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  loading = false,
  maxItems = 10,
  className = ''
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success':
        return { icon: CheckCircleIcon, color: 'text-green-500' };
      case 'error':
        return { icon: XCircleIcon, color: 'text-red-500' };
      case 'warning':
        return { icon: ExclamationTriangleIcon, color: 'text-yellow-500' };
      case 'pending':
        return { icon: ClockIcon, color: 'text-blue-500' };
      default:
        return { icon: InformationCircleIcon, color: 'text-gray-500' };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="animate-pulse flex items-start space-x-3">
              <div className="w-5 h-5 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const displayItems = activities.slice(0, maxItems);

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      
      {displayItems.length === 0 ? (
        <div className="text-center py-8">
          <InformationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No recent activity to display</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayItems.map((activity) => {
            const { icon: Icon, color } = getActivityIcon(activity.type);
            
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <Icon className={`w-5 h-5 ${color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="mt-2">
                      <details className="text-xs text-gray-400">
                        <summary className="cursor-pointer hover:text-gray-600">
                          Details
                        </summary>
                        <pre className="mt-1 text-xs overflow-x-auto">
                          {JSON.stringify(activity.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default ActivityFeed;
