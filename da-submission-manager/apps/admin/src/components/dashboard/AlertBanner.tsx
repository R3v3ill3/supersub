import React from 'react';
import { 
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/button';

interface AlertBannerProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  }>;
  className?: string;
}

const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  title,
  message,
  dismissible = true,
  onDismiss,
  actions,
  className = ''
}) => {
  const getAlertConfig = (alertType: string) => {
    switch (alertType) {
      case 'success':
        return {
          containerClass: 'bg-green-50 border-green-200',
          iconClass: 'text-green-400',
          titleClass: 'text-green-800',
          messageClass: 'text-green-700',
          icon: CheckCircleIcon
        };
      case 'warning':
        return {
          containerClass: 'bg-yellow-50 border-yellow-200',
          iconClass: 'text-yellow-400',
          titleClass: 'text-yellow-800',
          messageClass: 'text-yellow-700',
          icon: ExclamationTriangleIcon
        };
      case 'error':
        return {
          containerClass: 'bg-red-50 border-red-200',
          iconClass: 'text-red-400',
          titleClass: 'text-red-800',
          messageClass: 'text-red-700',
          icon: XCircleIcon
        };
      default: // info
        return {
          containerClass: 'bg-blue-50 border-blue-200',
          iconClass: 'text-blue-400',
          titleClass: 'text-blue-800',
          messageClass: 'text-blue-700',
          icon: InformationCircleIcon
        };
    }
  };

  const config = getAlertConfig(type);
  const Icon = config.icon;

  return (
    <div className={`rounded-md border p-4 ${config.containerClass} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconClass}`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${config.titleClass}`}>
            {title}
          </h3>
          {message && (
            <div className={`mt-2 text-sm ${config.messageClass}`}>
              <p>{message}</p>
            </div>
          )}
          {actions && actions.length > 0 && (
            <div className="mt-4 flex space-x-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.iconClass}`}
              >
                <span className="sr-only">Dismiss</span>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertBanner;
