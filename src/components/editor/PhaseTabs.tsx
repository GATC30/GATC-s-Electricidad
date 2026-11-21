'use client';

import React from 'react';
import { Phase } from '@/engine/types';

export interface PhaseTabsProps {
  activePhase: Phase;
  onChangePhase: (phase: Phase) => void;
  className?: string;
}

export const PhaseTabs: React.FC<PhaseTabsProps> = ({
  activePhase,
  onChangePhase,
  className = ''
}) => {
  const phases: { id: Phase; label: string; badge: string; icon: React.ReactNode }[] = [
    {
      id: 1,
      label: 'Obra Civil',
      badge: 'Fase 1',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 2,
      label: 'Diseño Eléctrico',
      badge: 'Fase 2',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 3,
      label: 'Cotización BOM',
      badge: 'Fase 3',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 4,
      label: 'Memoria Descriptiva',
      badge: 'Fase 4',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ];

  return (
    <nav
      aria-label="Fases del Proyecto"
      className={`flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar ${className}`}
    >
      {phases.map((ph) => {
        const isActive = activePhase === ph.id;
        return (
          <button
            key={ph.id}
            type="button"
            onClick={() => onChangePhase(ph.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 select-none ${
              isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span className={isActive ? 'text-white' : 'text-slate-400'}>{ph.icon}</span>
            <span>{ph.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
