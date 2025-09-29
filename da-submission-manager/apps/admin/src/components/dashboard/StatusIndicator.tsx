import React from 'react';
import {
  SuccessIcon,
  WarningIcon,
  ErrorIcon,
  PendingIcon,
} from '@da/ui/icons';

interface StatusIndicatorProps {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'pending';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: SuccessIcon,
          text: 'Healthy'
        };
      case 'degraded':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: WarningIcon,
          text: 'Degraded'
        };
      case 'unhealthy':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: ErrorIcon,
          text: 'Unhealthy'
        };
      case 'pending':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: PendingIcon,
          text: 'Pending'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: PendingIcon,
          text: 'Unknown'
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;
  const displayText = label || config.text;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.color} ${getSizeClasses(size)} ${className}`}>
      {showIcon && <IconComponent className="w-4 h-4" />}
      <span>{displayText}</span>
    </div>
  );
};

export default StatusIndicator;
