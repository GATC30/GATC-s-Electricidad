'use client';

import React, { useState } from 'react';

export interface LevelSelectorProps {
  currentLevel: number;
  levels: number[];
  onSelectLevel: (lvl: number) => void;
  onAddLevel?: () => void;
  onDeleteLevel?: (lvl: number) => void;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  currentLevel,
  levels,
  onSelectLevel,
  onAddLevel,
  onDeleteLevel
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className="w-2 h-2 rounded-full bg-indigo-400" />
        <span>Nivel {currentLevel}</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute left-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-xl shadow-black/50 py-1.5 z-50 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
              Niveles del Edificio
            </div>

            <div className="max-h-48 overflow-y-auto py-1">
              {levels.map((lvl) => (
                <div
                  key={lvl}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                    lvl === currentLevel
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                  onClick={() => {
                    onSelectLevel(lvl);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        lvl === currentLevel ? 'bg-indigo-400' : 'bg-slate-600'
                      }`}
                    />
                    <span>Nivel {lvl}</span>
                  </div>

                  {levels.length > 1 && onDeleteLevel && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLevel(lvl);
                        if (lvl === currentLevel && levels.length > 1) {
                          const nextLvl = levels.find((l) => l !== lvl) || 1;
                          onSelectLevel(nextLvl);
                        }
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                      title={`Eliminar Nivel ${lvl}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {onAddLevel && (
              <div className="pt-1 border-t border-slate-800/80 px-2">
                <button
                  type="button"
                  onClick={() => {
                    onAddLevel();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Agregar Nivel</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
