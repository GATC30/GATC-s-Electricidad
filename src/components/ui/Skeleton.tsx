'use client';

import React from 'react';

export interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-slate-800/60 rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between min-h-[260px] animate-pulse">
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <Skeleton className="h-5 w-3/4 rounded-md" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <div className="space-y-2 mb-6">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-5/6 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-lg" />
          <Skeleton className="h-6 w-20 rounded-lg" />
          <Skeleton className="h-6 w-14 rounded-lg" />
        </div>
      </div>
      <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
        <Skeleton className="h-3 w-28 rounded" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
    </div>
  );
};

export const SkeletonEditor: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden select-none">
      {/* Header Skeleton */}
      <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-48 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      {/* Phase Tabs Skeleton */}
      <div className="h-11 border-b border-slate-800 px-4 flex items-center gap-4 shrink-0">
        <Skeleton className="h-7 w-28 rounded-lg" />
        <Skeleton className="h-7 w-28 rounded-lg" />
        <Skeleton className="h-7 w-28 rounded-lg" />
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>

      {/* Body Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-16 border-r border-slate-800 p-2 flex flex-col gap-3 shrink-0">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* Canvas placeholder */}
        <div className="flex-1 relative flex items-center justify-center bg-slate-900/20 bg-grid-pattern-dark">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-xs font-medium tracking-wide">Cargando proyecto y motor CAD...</span>
          </div>
        </div>

        {/* Right Properties Panel */}
        <div className="hidden lg:block w-72 border-l border-slate-800 p-4 space-y-4 shrink-0">
          <Skeleton className="h-6 w-32 rounded" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-7 border-t border-slate-800 px-4 flex items-center justify-between shrink-0">
        <Skeleton className="h-3.5 w-36 rounded" />
        <Skeleton className="h-3.5 w-48 rounded" />
      </div>
    </div>
  );
};

export interface LoadingOverlayProps {
  isVisible: boolean;
  title?: string;
  message?: string;
  progress?: number;
  onCancel?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  title = 'Procesando...',
  message = 'Por favor espera un momento.',
  progress,
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="loading-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center">
        <div className="relative w-14 h-14 mx-auto mb-4 flex items-center justify-center">
          <div className="w-14 h-14 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="absolute w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h3 id="loading-title" className="text-base font-bold text-slate-100 mb-1">
          {title}
        </h3>
        <p className="text-xs text-slate-400 mb-4">{message}</p>

        {typeof progress === 'number' && (
          <div className="w-full bg-slate-800 rounded-full h-2 mb-4 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
            aria-label="Cancelar operación"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
};
