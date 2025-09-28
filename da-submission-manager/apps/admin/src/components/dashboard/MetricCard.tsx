import React from 'react';
import { Card } from '../ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
    period?: string;
  };
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  loading?: boolean;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  className = '',
  loading = false,
  subtitle
}) => {
  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          {change && <div className="h-3 bg-gray-200 rounded w-1/4"></div>}
        </div>
      </Card>
    );
  }

  const getChangeColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getChangeIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-gray-500" />}
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
            {change && (
              <div className="flex items-center gap-1 mt-2">
                <span className={`text-sm ${getChangeColor(change.trend)}`}>
                  {getChangeIcon(change.trend)} {Math.abs(change.value)}%
                </span>
                {change.period && (
                  <span className="text-sm text-gray-500">vs {change.period}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MetricCard;
