'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore, EditorLayers } from '@/stores/editor-store';
import { ToolType } from '@/engine/types';
import { SCALE } from '@/engine/constants';

export interface StatusBarProps {
  saveStatus?: 'saved' | 'saving' | 'error' | 'offline';
  onZoomToFit?: () => void;
  onOpenTour?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  saveStatus,
  onZoomToFit,
  onOpenTour
}) => {
  const {
    zoom,
    setZoom,
    cursorCoords,
    tool,
    currentLevel,
    theme,
    toggleTheme,
    layers,
    toggleLayer,
    setIsCommandPaletteOpen
  } = useEditorStore();

  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const layersRef = useRef<HTMLDivElement>(null);

  // Close layers popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (layersRef.current && !layersRef.current.contains(e.target as Node)) {
        setIsLayersOpen(false);
      }
    }
    if (isLayersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLayersOpen]);

  // Derived Tool Name + Shortcut
  const toolNameMap: Record<string, string> = {
    select: 'Seleccionar (V)',
    pan: 'Mover Lienzo (H)',
    wall: 'Pared (W)',
    door: 'Puerta (D)',
    window: 'Ventana (N)',
    stairs: 'Escalera',
    box_oct: 'Caja Octag. (O)',
    box_rect: 'Caja Rect. (R)',
    box_sq: 'Caja Cuadr. (Q)',
    tube: 'Tubería (T)',
    wire: 'Enrutar Cable (E)'
  };

  const statusConfig = {
    saved: {
      label: 'Guardado',
      dotClass: 'bg-emerald-400',
      textClass: 'text-emerald-400'
    },
    saving: {
      label: 'Guardando...',
      dotClass: 'bg-amber-400 animate-pulse',
      textClass: 'text-amber-400'
    },
    error: {
      label: 'Error de guardado',
      dotClass: 'bg-rose-400',
      textClass: 'text-rose-400'
    },
    offline: {
      label: 'Offline (Local)',
      dotClass: 'bg-slate-400',
      textClass: 'text-slate-400'
    }
  }[saveStatus || 'saved'];

  const layerLabels: { key: keyof EditorLayers; label: string; icon: string }[] = [
    { key: 'walls', label: 'Paredes', icon: '🧱' },
    { key: 'openings', label: 'Puertas / Ventanas', icon: '🚪' },
    { key: 'boxes', label: 'Cajas Eléctricas', icon: '🔌' },
    { key: 'tubes', label: 'Tuberías y Enrutados', icon: '⚡' },
    { key: 'dimensions', label: 'Cotas y Medidas', icon: '📏' },
    { key: 'labels', label: 'Etiquetas de Dispositivos', icon: '🏷️' },
    { key: 'ghost', label: 'Nivel Inferior (Ghost)', icon: '👻' }
  ];

  return (
    <footer
      aria-label="Barra de estado"
      className={`h-8 border-t px-3 select-none text-xs flex items-center justify-between z-30 transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-slate-900 border-slate-800 text-slate-400'
          : 'bg-slate-100 border-slate-300 text-slate-600'
      }`}
    >
      {/* Left: Save Status & Coordinates & Tool */}
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Save Status */}
        <div className="flex items-center gap-1.5 shrink-0" title="Estado de sincronización">
          <span className={`w-2 h-2 rounded-full ${statusConfig.dotClass}`} />
          <span className={`font-medium text-[11px] hidden sm:inline ${statusConfig.textClass}`}>
            {statusConfig.label}
          </span>
        </div>

        <div className="h-3 w-px bg-slate-700/60 shrink-0" />

        {/* Cursor Coordinates */}
        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
          <span>
            <strong className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>X:</strong>{' '}
            <span className="text-indigo-400">{cursorCoords.x.toFixed(2)}m</span>
          </span>
          <span>
            <strong className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>Y:</strong>{' '}
            <span className="text-indigo-400">{cursorCoords.y.toFixed(2)}m</span>
          </span>
        </div>

        <div className="h-3 w-px bg-slate-700/60 shrink-0 hidden md:block" />

        {/* Active Tool */}
        <div className="hidden md:flex items-center gap-1 text-[11px] truncate">
          <span className="opacity-70">Herramienta:</span>
          <span className={`font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
            {toolNameMap[tool] || tool}
          </span>
        </div>

        <div className="h-3 w-px bg-slate-700/60 shrink-0 hidden lg:block" />

        {/* Active Level */}
        <div className="hidden lg:flex items-center gap-1 text-[11px]">
          <span className="opacity-70">Nivel:</span>
          <span className={`font-semibold ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>
            {currentLevel}
          </span>
        </div>
      </div>

      {/* Right: Scale & Layers & Theme & Zoom Controls & Command Palette */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Scale (F8-02) */}
        <div
          className="hidden sm:flex items-center gap-1 font-mono text-[11px] opacity-80"
          title={`Escala activa: ${SCALE}px = 1m`}
        >
          <span>Escala 1:50</span>
        </div>

        <div className="h-3 w-px bg-slate-700/60 hidden sm:block" />

        {/* Layers Popover Trigger (F8-09) */}
        <div className="relative" ref={layersRef}>
          <button
            type="button"
            onClick={() => setIsLayersOpen(!isLayersOpen)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors text-[11px] font-medium ${
              isLayersOpen
                ? 'bg-indigo-600 text-white'
                : theme === 'dark'
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Capas del Plano (Mostrar / Ocultar)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="hidden sm:inline">Capas</span>
          </button>

          {/* Layers Popover Menu */}
          {isLayersOpen && (
            <div
              className={`absolute bottom-full right-0 mb-2 w-64 rounded-xl border shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/40">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Visibilidad de Capas
                </span>
                <span className="text-[10px] opacity-60">2D Canvas</span>
              </div>

              <div className="space-y-1.5">
                {layerLabels.map(({ key, label, icon }) => (
                  <label
                    key={key}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-xs ${
                      theme === 'dark' ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{icon}</span>
                      <span>{label}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layers[key]}
                      onChange={() => toggleLayer(key)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle (F8-08) */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-1 rounded transition-colors text-xs ${
            theme === 'dark'
              ? 'hover:bg-slate-800 text-amber-300'
              : 'hover:bg-slate-200 text-slate-700'
          }`}
          title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {theme === 'dark' ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <div className="h-3 w-px bg-slate-700/60" />

        {/* Zoom Controls: [-] 100% [+] [Fit] (F8-02, F8-07) */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.1, Number((z / 1.15).toFixed(2))))}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors font-bold ${
              theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Alejar (-)"
          >
            -
          </button>

          <span
            className="w-11 text-center font-semibold cursor-pointer hover:underline"
            onClick={() => setZoom(1)}
            title="Restablecer zoom a 100%"
          >
            {(zoom * 100).toFixed(0)}%
          </span>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(5, Number((z * 1.15).toFixed(2))))}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors font-bold ${
              theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Acercar (+)"
          >
            +
          </button>

          {/* Zoom to fit button */}
          <button
            type="button"
            onClick={onZoomToFit}
            className="px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 text-[10px] font-semibold transition-colors ml-0.5"
            title="Ajustar Plano a la Pantalla (Ctrl+0)"
          >
            Fit
          </button>
        </div>

        <div className="h-3 w-px bg-slate-700/60" />

        {/* Command Palette Button (F8-04) */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors text-[10px] font-mono border ${
            theme === 'dark'
              ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
              : 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-700'
          }`}
          title="Abrir Paleta de Comandos (Ctrl+K)"
        >
          <span>Comandos</span>
          <kbd className="text-[9px] bg-slate-700 text-slate-200 px-1 py-0.2 rounded font-sans">
            Ctrl+K
          </kbd>
        </button>

        {/* Onboarding Tour / Help Button (F8-05) */}
        {onOpenTour && (
          <button
            type="button"
            onClick={onOpenTour}
            className={`w-5 h-5 flex items-center justify-center rounded-full font-bold transition-colors ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
            title="Ver Tutorial / Tour Guiado"
          >
            ?
          </button>
        )}
      </div>
    </footer>
  );
};
