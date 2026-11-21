'use client';

import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={`w-full appearance-none bg-slate-900 border ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
                : 'border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
            } text-slate-100 text-sm rounded-xl px-3.5 py-2.5 pr-10 transition-all duration-200 outline-none focus:ring-2 cursor-pointer ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-slate-900 text-slate-100">
                {opt.label}
              </option>
            ))}
          </select>

          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {error && <p className="text-xs text-rose-400 mt-1 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-slate-400 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
