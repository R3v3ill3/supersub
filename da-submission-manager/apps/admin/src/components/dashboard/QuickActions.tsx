import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'error' | 'info';
  };
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  title = 'Quick Actions',
  className = '',
  columns = 3
}) => {
  const getGridColumns = (cols: number) => {
    switch (cols) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 4: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      default: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  const getBadgeColor = (variant: string) => {
    switch (variant) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const renderAction = (action: QuickAction) => {
    const Icon = action.icon;
    const content = (
      <div className={`relative group block p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}>
        {action.badge && (
          <span className={`absolute top-4 right-4 px-2 py-1 text-xs font-medium rounded-full ${getBadgeColor(action.badge.variant)}`}>
            {action.badge.text}
          </span>
        )}
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            <Icon className="w-6 h-6 text-gray-600" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {action.title}
          </h3>
          <p className="text-sm text-gray-600">
            {action.description}
          </p>
        </div>
      </div>
    );

    if (action.disabled) {
      return <div key={action.id}>{content}</div>;
    }

    if (action.href) {
      return (
        <Link key={action.id} to={action.href}>
          {content}
        </Link>
      );
    }

    return (
      <button 
        key={action.id}
        onClick={action.onClick}
        className="text-left w-full"
        disabled={action.disabled}
      >
        {content}
      </button>
    );
  };

  return (
    <Card className={`p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      <div className={`grid ${getGridColumns(columns)} gap-4`}>
        {actions.map(renderAction)}
      </div>
    </Card>
  );
};

export default QuickActions;
