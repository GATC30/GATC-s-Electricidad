'use client';

import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm hover:shadow focus:ring-indigo-500 border border-transparent',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-slate-600 focus:ring-slate-500 shadow-sm',
      danger:
        'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm hover:shadow focus:ring-red-500 border border-transparent',
      ghost:
        'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white focus:ring-slate-500',
      outline:
        'bg-transparent hover:bg-indigo-950/40 text-indigo-400 border border-indigo-500/40 hover:border-indigo-400 focus:ring-indigo-500',
      icon:
        'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 focus:ring-indigo-500 rounded-lg p-2'
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5',
      md: 'text-sm px-4 py-2 rounded-lg gap-2',
      lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5',
      icon: 'p-2 rounded-lg'
    };

    const resolvedSize = variant === 'icon' ? 'icon' : size;

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[resolvedSize]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
