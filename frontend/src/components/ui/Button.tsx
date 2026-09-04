import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'danger' | 'outline';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1 focus:ring-offset-surface-bg disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const sizeStyles = {
      sm: 'px-2.5 py-1 text-xs rounded-sm',
      md: 'px-3.5 py-1.5 text-xs rounded-sm',
    };

    const variantStyles = {
      primary:
        'bg-action-primary-bg text-action-primary-text hover:bg-action-primary-hover shadow-sm',
      secondary:
        'bg-action-secondary-bg text-action-secondary-text hover:bg-action-secondary-hover border border-border-subtle',
      subtle:
        'bg-transparent text-text-muted hover:text-text-main hover:bg-surface-subtle',
      danger:
        'bg-status-danger-bg text-status-danger hover:bg-status-danger/20 border border-status-danger/30',
      outline:
        'bg-transparent border border-border-base text-text-main hover:bg-surface-subtle',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
