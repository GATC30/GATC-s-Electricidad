'use client';

import React from 'react';
import { ProjectCard, ProjectSummary } from './ProjectCard';

export interface ProjectGridProps {
  projects: ProjectSummary[];
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  onImportGatc: (file: File) => void;
  onRenameProject?: (id: string, newName: string) => void;
  onDeleteProject?: (id: string) => void;
  onExportProject?: (id: string) => void;
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({
  projects,
  onOpenProject,
  onNewProject,
  onImportGatc,
  onRenameProject,
  onDeleteProject,
  onExportProject
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportGatc(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gatc,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Slot: Crear Nuevo Proyecto */}
        <div
          onClick={onNewProject}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNewProject()}
          className="group cursor-pointer flex flex-col items-center justify-center p-8 min-h-[260px] rounded-2xl border-2 border-dashed border-indigo-500/30 hover:border-indigo-500 bg-slate-900/40 hover:bg-slate-900/80 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-lg shadow-indigo-950/30 mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
            Crear Nuevo Proyecto
          </h4>
          <p className="text-xs text-slate-400 mt-1.5 max-w-[200px]">
            Inicia un plano CAD en blanco con obra civil y tendidos eléctricos
          </p>
        </div>

        {/* Existing Projects */}
        {projects.map((proj) => (
          <ProjectCard
            key={proj.id}
            project={proj}
            onOpen={onOpenProject}
            onRename={onRenameProject}
            onDelete={onDeleteProject}
            onExport={onExportProject}
          />
        ))}

        {/* Slot: Importar Archivo .gatc */}
        <div
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
          className="group cursor-pointer flex flex-col items-center justify-center p-8 min-h-[260px] rounded-2xl border-2 border-dashed border-slate-700/60 hover:border-purple-500 bg-slate-900/20 hover:bg-slate-900/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-lg shadow-purple-950/30 mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
            Importar Archivo .gatc
          </h4>
          <p className="text-xs text-slate-400 mt-1.5 max-w-[200px]">
            Carga un proyecto guardado o transferido desde otro dispositivo
          </p>
        </div>
      </div>
    </div>
  );
};
