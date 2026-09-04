import React from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Couldn't load your saves",
  description = 'Something went wrong while retrieving your items. Please try again in a moment.',
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="rounded-md border border-status-danger/20 bg-status-danger-bg p-6 text-center space-y-3"
    >
      <h4 className="text-sm font-medium text-status-danger">{title}</h4>
      <p className="text-xs text-text-muted max-w-md mx-auto">{description}</p>
      {onRetry && (
        <div className="pt-1">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
};
