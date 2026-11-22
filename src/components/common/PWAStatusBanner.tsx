'use client';

import React, { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';

export function PWAStatusBanner() {
  const { isInstallable, isOffline, isUpdateAvailable, installApp, reloadAndUpdate } = usePWA();
  const [dismissedInstall, setDismissedInstall] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {/* Offline Alert Badge */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs shadow-lg backdrop-blur-md animate-fade-in"
        >
          <svg
            className="w-4 h-4 text-amber-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.828-15.364a9 9 0 0112.728 0"
            />
          </svg>
          <div className="flex-1">
            <span className="font-semibold">Modo Offline</span>
            <p className="text-[11px] text-amber-400/80">Guardando cambios localmente en IndexedDB.</p>
          </div>
        </div>
      )}

      {/* PWA Update Ready */}
      {isUpdateAvailable && (
        <div
          role="alert"
          className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-950/90 border border-indigo-500/40 text-slate-100 text-xs shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="font-medium">Nueva versión lista</span>
          </div>
          <button
            onClick={reloadAndUpdate}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition-colors focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            aria-label="Actualizar aplicación a la última versión"
          >
            Actualizar
          </button>
        </div>
      )}

      {/* Install PWA Prompt Banner */}
      {isInstallable && !dismissedInstall && (
        <div
          role="dialog"
          aria-label="Instalar GATC"
          className="pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/95 border border-slate-700/60 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Instalar GATC</p>
              <p className="text-[11px] text-slate-400">Acceso rápido y offline en tu escritorio</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => installApp()}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition-colors focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              aria-label="Instalar aplicación en este dispositivo"
            >
              Instalar
            </button>
            <button
              onClick={() => setDismissedInstall(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors focus:outline-none"
              aria-label="Cerrar sugerencia de instalación"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
