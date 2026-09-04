import React from 'react';

export interface BadgeProps {
  variant?: 'default' | 'active' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-surface-subtle text-text-muted border border-border-subtle',
    active:
      'bg-status-active-bg text-status-active border border-status-active/25',
    danger:
      'bg-status-danger-bg text-status-danger border border-status-danger/25',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-xs tracking-tight ${variantStyles[variant]} ${className}`}
    >
      {variant === 'active' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-status-active" />
      )}
      {children}
    </span>
  );
};
