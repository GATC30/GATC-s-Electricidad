'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { reportError } from '@/lib/monitoring';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary:${this.props.name || 'Global'}] Error capturado:`, error, errorInfo);

    // Report to monitoring service (F11-05)
    reportError(error, {
      component: this.props.name || 'UnknownComponent',
      componentStack: errorInfo.componentStack || undefined
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    this.props.onReset?.();
  };

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleDownloadDiagnostics = (): void => {
    const diagnosticData = {
      timestamp: new Date().toISOString(),
      boundary: this.props.name || 'Global',
      errorMessage: this.state.error?.message,
      errorStack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown'
    };

    const blob = new Blob([JSON.stringify(diagnosticData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gatc_error_diagnostico_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const boundaryTitle = this.props.name
        ? `Error en ${this.props.name}`
        : 'Algo no salió como se esperaba';

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="w-full h-full min-h-[280px] p-6 rounded-2xl bg-slate-900/90 border border-red-500/30 backdrop-blur-md flex flex-col items-center justify-center text-center select-none"
        >
          {/* Warning Icon with Glow */}
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-950/40">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h3 className="text-base font-bold text-slate-100 mb-1">{boundaryTitle}</h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            El componente encontró un problema al procesar los datos. Tus datos del proyecto están
            guardados en el almacenamiento local.
          </p>

          {/* Collapsible Error Technical Detail */}
          {this.state.error && (
            <div className="w-full max-w-md mb-5 text-left bg-slate-950/80 border border-slate-800 rounded-xl p-3 overflow-hidden text-[11px] font-mono text-red-300/90">
              <span className="font-semibold block text-slate-400 mb-1">Detalle del error:</span>
              <p className="truncate">{this.state.error.message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={this.handleReset}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
              aria-label="Reintentar cargar este componente"
            >
              Reintentar
            </button>
            <button
              onClick={this.handleReload}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
              aria-label="Recargar aplicación completa"
            >
              Recargar Editor
            </button>
            <button
              onClick={this.handleDownloadDiagnostics}
              className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 text-xs transition-colors"
              aria-label="Descargar diagnóstico técnico de error"
            >
              Descargar Diagnóstico
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
