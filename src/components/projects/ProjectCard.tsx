'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui';

export interface ProjectSummary {
  id: string;
  name: string;
  updated: number;
  wallsCount?: number;
  boxesCount?: number;
  circuitsCount?: number;
}

export interface ProjectCardProps {
  project: ProjectSummary;
  onOpen: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
  onExport?: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpen,
  onRename,
  onDelete,
  onExport
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);

  const handleBlur = () => {
    setIsEditing(false);
    if (name.trim() && name !== project.name && onRename) {
      onRename(project.id, name.trim());
    } else {
      setName(project.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setName(project.name);
      setIsEditing(false);
    }
  };

  const formattedDate = new Date(project.updated).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/50 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:shadow-indigo-950/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      {/* Decorative gradient glow on hover */}
      <div className="absolute -inset-px bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Top Section */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Proyecto CAD
          </span>

          <div className="flex items-center gap-1">
            {onExport && (
              <button
                type="button"
                onClick={() => onExport(project.id)}
                className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Exportar archivo .gatc"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(project.id)}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Eliminar proyecto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Project Name */}
        {isEditing ? (
          <input
            type="text"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-950 border border-indigo-500 rounded-lg px-2.5 py-1.5 text-lg font-bold text-white outline-none"
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="group/title flex items-center justify-between cursor-pointer py-1"
            title="Click para editar nombre"
          >
            <h3 className="text-xl font-bold text-white tracking-tight group-hover/title:text-indigo-300 transition-colors line-clamp-1">
              {project.name}
            </h3>
            <svg
              className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover/title:opacity-100 transition-opacity ml-2 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-1">Actualizado: {formattedDate}</p>

        {/* Element Stats */}
        <div className="grid grid-cols-3 gap-2 mt-5 py-3 px-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl text-center">
          <div>
            <span className="block text-xs font-bold text-slate-200">
              {project.wallsCount ?? 0}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Paredes</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-200">
              {project.boxesCount ?? 0}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Cajas</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-200">
              {project.circuitsCount ?? 0}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Circuitos</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="relative z-10 mt-6 pt-2">
        <Button
          variant="primary"
          className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-600 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-900/30"
          onClick={() => onOpen(project.id)}
        >
          <span className="mr-1.5">Abrir Editor</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Button>
      </div>
    </div>
  );
};
