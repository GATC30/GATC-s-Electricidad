'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LevelSelector } from './LevelSelector';
import { Button, Tooltip } from '@/components/ui';

export interface HeaderProps {
  projectName: string;
  onProjectNameChange: (newName: string) => void;
  currentLevel: number;
  levels: number[];
  onSelectLevel: (lvl: number) => void;
  onAddLevel?: () => void;
  onDeleteLevel?: (lvl: number) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  showDims: boolean;
  onToggleDims: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  is3D: boolean;
  onToggle3D: () => void;
  onExport: () => void;
  isSaved?: boolean;
  saveStatus?: 'saved' | 'saving' | 'error' | 'offline';
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  onProjectNameChange,
  currentLevel,
  levels,
  onSelectLevel,
  onAddLevel,
  onDeleteLevel,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  showDims,
  onToggleDims,
  showRulers,
  onToggleRulers,
  is3D,
  onToggle3D,
  onExport,
  isSaved = true,
  saveStatus
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(projectName);

  // Derive resolved save status
  const currentStatus: 'saved' | 'saving' | 'error' | 'offline' =
    saveStatus || (isSaved ? 'saved' : 'saving');

  const statusConfig = {
    saved: {
      label: 'Guardado',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      dotClass: 'bg-emerald-400'
    },
    saving: {
      label: 'Guardando...',
      badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      dotClass: 'bg-amber-400 animate-pulse'
    },
    error: {
      label: 'Error guardando',
      badgeClass: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      dotClass: 'bg-rose-400'
    },
    offline: {
      label: 'Offline (Local)',
      badgeClass: 'bg-slate-700/60 text-slate-300 border border-slate-600',
      dotClass: 'bg-slate-400'
    }
  }[currentStatus];

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== projectName) {
      onProjectNameChange(title.trim());
    } else {
      setTitle(projectName);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setTitle(projectName);
      setIsEditingTitle(false);
    }
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 sm:px-4 z-30 select-none">
      {/* Left: Back button & Editable Project Name */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          title="Regresar a Proyectos"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>

        <div className="h-4 w-px bg-slate-800 shrink-0" />

        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="bg-slate-950 border border-indigo-500 rounded px-2 py-0.5 text-sm font-bold text-white outline-none w-48 sm:w-64"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1.5 text-sm font-bold text-slate-100 hover:text-indigo-300 transition-colors truncate text-left max-w-[140px] sm:max-w-xs"
              title="Click para renombrar"
            >
              <span className="truncate">{projectName}</span>
              <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}

          {/* Save status pill (F6-06) */}
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${statusConfig.badgeClass}`}
            title={`Estado de persistencia: ${statusConfig.label}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Center: Level Selector & History Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <LevelSelector
          currentLevel={currentLevel}
          levels={levels}
          onSelectLevel={onSelectLevel}
          onAddLevel={onAddLevel}
          onDeleteLevel={onDeleteLevel}
        />

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Undo / Redo */}
        <div className="hidden sm:flex items-center gap-1">
          <Tooltip content="Deshacer" shortcut="Ctrl+Z">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:text-slate-600 hover:bg-slate-800 disabled:hover:bg-transparent transition-colors"
              aria-label="Deshacer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4" />
              </svg>
            </button>
          </Tooltip>

          <Tooltip content="Rehacer" shortcut="Ctrl+Y">
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:text-slate-600 hover:bg-slate-800 disabled:hover:bg-transparent transition-colors"
              aria-label="Rehacer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right: View Toggles & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Toggle Dimensions */}
        <Tooltip content={showDims ? 'Ocultar Cotas' : 'Mostrar Cotas'}>
          <button
            type="button"
            onClick={onToggleDims}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showDims
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            <span className="hidden sm:inline">Cotas</span>
            <span className="sm:hidden">📏</span>
          </button>
        </Tooltip>

        {/* Toggle Rulers */}
        <Tooltip content={showRulers ? 'Ocultar Reglas' : 'Mostrar Reglas'}>
          <button
            type="button"
            onClick={onToggleRulers}
            className={`hidden md:inline-flex px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showRulers
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            Reglas
          </button>
        </Tooltip>

        {/* Toggle 3D Mode */}
        <button
          type="button"
          onClick={onToggle3D}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            is3D
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-md shadow-purple-900/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span>{is3D ? 'Ver 2D' : 'Ver 3D'}</span>
        </button>

        {/* Export Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onExport}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-sm"
          leftIcon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          }
        >
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </div>
    </header>
  );
};
