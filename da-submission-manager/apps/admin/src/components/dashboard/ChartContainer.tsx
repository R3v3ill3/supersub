import React from 'react';
import { Card } from '../ui/card';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string;
  className?: string;
  height?: string | number;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  children,
  actions,
  loading = false,
  error,
  className = '',
  height = 'auto'
}) => {
  const containerHeight = typeof height === 'number' ? `${height}px` : height;

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
            {subtitle && <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>}
          </div>
        </div>
        <div 
          className="bg-gray-100 rounded animate-pulse"
          style={{ height: containerHeight === 'auto' ? '200px' : containerHeight }}
        ></div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <div 
          className="flex items-center justify-center bg-red-50 border border-red-200 rounded"
          style={{ height: containerHeight === 'auto' ? '200px' : containerHeight }}
        >
          <div className="text-center">
            <p className="text-red-600 font-medium">Error loading chart</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div style={{ height: containerHeight }}>
        {children}
      </div>
    </Card>
  );
};

export default ChartContainer;
