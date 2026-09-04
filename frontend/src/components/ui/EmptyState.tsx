import React from 'react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing saved yet',
  description = 'Send a Reel to @save.this.for.me on Instagram and it will be safely kept here for you.',
  action,
}) => {
  return (
    <div className="rounded-md border border-border-subtle bg-surface-panel/40 px-8 py-16 text-center">
      <h3 className="font-serif text-lg font-normal text-text-main tracking-tight">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-xs text-text-muted leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
};
