'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectGrid } from '@/components/projects';
import { ProjectSummary } from '@/components/projects/ProjectCard';
import { ConfirmDialog } from '@/components/ui';

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: '50vw', y: '50vh' });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load projects from localStorage (and populate demo projects if empty)
  useEffect(() => {
    try {
      const storedIndex = localStorage.getItem('ecad_projects_index');
      if (storedIndex) {
        const parsed = JSON.parse(storedIndex);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list: ProjectSummary[] = parsed.map((item: any) => {
            const rawData = localStorage.getItem(`ecad_data_${item.id}`);
            let wallsCount = 0;
            let boxesCount = 0;
            let circuitsCount = 0;
            if (rawData) {
              try {
                const data = JSON.parse(rawData);
                wallsCount = data.walls?.length || 0;
                boxesCount = data.boxes?.length || 0;
                circuitsCount = data.routes?.length || 0;
              } catch (_) {}
            }
            return {
              id: item.id,
              name: item.name || 'Proyecto Sin Nombre',
              updated: item.updated || Date.now(),
              wallsCount,
              boxesCount,
              circuitsCount
            };
          });
          setProjects(list);
          return;
        }
      }

      // Default demo projects if first time
      const initialProjects: ProjectSummary[] = [
        {
          id: 'demo-residencial-1',
          name: 'Residencia Los Álamos - Nivel 1',
          updated: Date.now() - 3600000 * 4,
          wallsCount: 14,
          boxesCount: 22,
          circuitsCount: 6
        },
        {
          id: 'demo-local-comercial',
          name: 'Local Comercial 102 - Plaza Central',
          updated: Date.now() - 3600000 * 24,
          wallsCount: 8,
          boxesCount: 16,
          circuitsCount: 4
        }
      ];
      setProjects(initialProjects);
      localStorage.setItem('ecad_projects_index', JSON.stringify(initialProjects));
    } catch (e) {
      console.error('Error loading projects from storage:', e);
    }
  }, []);

  // Lantern flashlight effect tracking mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setMousePos({
      x: `${e.clientX}px`,
      y: `${e.clientY}px`
    });
  };

  const handleOpenProject = (id: string) => {
    router.push(`/editor/${id}`);
  };

  const handleNewProject = () => {
    const newId = `proj-${Date.now()}`;
    const newProj: ProjectSummary = {
      id: newId,
      name: `Nuevo Proyecto ${projects.length + 1}`,
      updated: Date.now(),
      wallsCount: 0,
      boxesCount: 0,
      circuitsCount: 0
    };

    const updated = [newProj, ...projects];
    setProjects(updated);
    try {
      localStorage.setItem('ecad_projects_index', JSON.stringify(updated));
    } catch (_) {}

    router.push(`/editor/${newId}`);
  };

  const handleRenameProject = (id: string, newName: string) => {
    const updated = projects.map((p) => (p.id === id ? { ...p, name: newName, updated: Date.now() } : p));
    setProjects(updated);
    try {
      localStorage.setItem('ecad_projects_index', JSON.stringify(updated));
    } catch (_) {}
  };

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    const updated = projects.filter((p) => p.id !== deleteId);
    setProjects(updated);
    try {
      localStorage.setItem('ecad_projects_index', JSON.stringify(updated));
      localStorage.removeItem(`ecad_data_${deleteId}`);
    } catch (_) {}
    setDeleteId(null);
  };

  const handleExportProject = (id: string) => {
    try {
      const rawData = localStorage.getItem(`ecad_data_${id}`);
      const projectMeta = projects.find((p) => p.id === id);
      const dataToExport = rawData
        ? JSON.parse(rawData)
        : {
            id,
            name: projectMeta?.name || 'Proyecto GATC',
            version: '2.0',
            exportedAt: new Date().toISOString(),
            walls: [],
            boxes: [],
            tubes: [],
            routes: []
          };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(projectMeta?.name || 'proyecto').replace(/\s+/g, '_')}.gatc`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting project:', err);
    }
  };

  const handleImportGatc = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const importedId = parsed.id || `proj-imp-${Date.now()}`;
      const importedName = parsed.name || file.name.replace(/\.[^/.]+$/, '');

      const newSummary: ProjectSummary = {
        id: importedId,
        name: importedName,
        updated: Date.now(),
        wallsCount: parsed.walls?.length || 0,
        boxesCount: parsed.boxes?.length || 0,
        circuitsCount: parsed.routes?.length || 0
      };

      const updated = [newSummary, ...projects.filter((p) => p.id !== importedId)];
      setProjects(updated);

      localStorage.setItem('ecad_projects_index', JSON.stringify(updated));
      localStorage.setItem(`ecad_data_${importedId}`, JSON.stringify(parsed));

      router.push(`/editor/${importedId}`);
    } catch (err) {
      alert('Error al importar el archivo .gatc. Verifique que sea un JSON válido.');
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={
        {
          '--mouseX': mousePos.x,
          '--mouseY': mousePos.y
        } as React.CSSProperties
      }
      className="relative min-h-screen bg-[#080b12] text-slate-100 overflow-x-hidden select-none"
    >
      {/* Background Architectural Blueprint Pattern */}
      <div className="fixed inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Dynamic Flashlight Glow */}
      <div
        className="fixed inset-0 pointer-events-none transition-[background] duration-75"
        style={{
          background: `radial-gradient(circle 650px at var(--mouseX) var(--mouseY), rgba(79, 70, 229, 0.12) 0%, rgba(15, 23, 42, 0.85) 60%, rgba(8, 11, 18, 0.98) 100%)`
        }}
      />

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Brand Header */}
        <header className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            GATC v2.0 Next-Gen CAD Engine
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-indigo-100 to-purple-300 bg-clip-text text-transparent drop-shadow-sm">
            GATC
          </h1>
          <p className="mt-3 text-base sm:text-lg text-indigo-200/80 font-medium tracking-wide">
            Gestor de Análisis para Tendidos y Costos
          </p>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Diseño arquitectónico, enrutamiento eléctrico automático, cálculo instantáneo de
            materiales y presupuesto para instalaciones eléctricas.
          </p>
        </header>

        {/* Projects Dashboard Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Tus Proyectos</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Selecciona un proyecto para abrir el lienzo de diseño o crea uno nuevo
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}
            </span>
          </div>

          <ProjectGrid
            projects={projects}
            onOpenProject={handleOpenProject}
            onNewProject={handleNewProject}
            onImportGatc={handleImportGatc}
            onRenameProject={handleRenameProject}
            onDeleteProject={(id) => setDeleteId(id)}
            onExportProject={handleExportProject}
          />
        </section>

        {/* Global Footer */}
        <footer className="mt-24 pt-8 border-t border-slate-800/60 text-center text-xs text-slate-500">
          <p>GATC — Gestor de Análisis para Tendidos y Costos &copy; 2026. Diseñado para ingeniería eléctrica.</p>
        </footer>
      </main>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="¿Eliminar proyecto?"
        description="Esta acción eliminará de forma permanente el proyecto seleccionado y todos sus planos, cajas y circuitos asociados. No se puede deshacer."
        confirmLabel="Eliminar Proyecto"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}
