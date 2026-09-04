import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelRight?: React.ReactNode;
  error?: string | null;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  labelRight,
  error,
  helperText,
  id,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full">
      {(label || labelRight) && (
        <div className="flex items-center justify-between">
          {label ? (
            <label
              htmlFor={id}
              className="block text-xs font-medium text-text-muted"
            >
              {label}
            </label>
          ) : (
            <span />
          )}
          {labelRight}
        </div>
      )}
      <input
        id={id}
        className={`block w-full rounded-sm border bg-surface-panel px-3 py-2 text-sm text-text-main placeholder-text-subtle transition focus:outline-none focus:ring-1 focus:ring-border-focus focus:border-border-focus disabled:opacity-50 ${
          error ? 'border-status-danger' : 'border-border-base'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p role="alert" className="text-xs text-status-danger">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-text-subtle">{helperText}</p>
      ) : null}
    </div>
  );
};
