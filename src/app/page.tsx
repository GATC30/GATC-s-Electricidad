'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectGrid } from '@/components/projects';
import { ProjectSummary } from '@/components/projects/ProjectCard';
import { ConfirmDialog } from '@/components/ui';
import { sanitizeProjectName } from '@/utils/sanitize';
import { safeSetItem, safeGetItem, safeRemoveItem } from '@/utils/storage';
import { validateGatcFile } from '@/lib/validators';

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: '50vw', y: '50vh' });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load projects from localStorage (and populate demo projects if empty)
  useEffect(() => {
    try {
      const storedIndex = safeGetItem<any[]>('ecad_projects_index', []);
      if (Array.isArray(storedIndex) && storedIndex.length > 0) {
        const list: ProjectSummary[] = storedIndex.map((item: any) => {
          const rawData = safeGetItem<any>(`ecad_data_${item.id}`);
          let wallsCount = 0;
          let boxesCount = 0;
          let circuitsCount = 0;
          if (rawData) {
            wallsCount = rawData.walls?.length || 0;
            boxesCount = rawData.boxes?.length || 0;
            circuitsCount = rawData.routes?.length || 0;
          }
          return {
            id: item.id,
            name: sanitizeProjectName(item.name || 'Proyecto Sin Nombre'),
            updated: item.updated || Date.now(),
            wallsCount,
            boxesCount,
            circuitsCount
          };
        });
        setProjects(list);
        return;
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
      safeSetItem('ecad_projects_index', initialProjects);
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
      name: sanitizeProjectName(`Nuevo Proyecto ${projects.length + 1}`),
      updated: Date.now(),
      wallsCount: 0,
      boxesCount: 0,
      circuitsCount: 0
    };

    const updated = [newProj, ...projects];
    setProjects(updated);
    safeSetItem('ecad_projects_index', updated);

    router.push(`/editor/${newId}`);
  };

  const handleRenameProject = (id: string, newName: string) => {
    const cleanName = sanitizeProjectName(newName);
    const updated = projects.map((p) =>
      p.id === id ? { ...p, name: cleanName, updated: Date.now() } : p
    );
    setProjects(updated);
    safeSetItem('ecad_projects_index', updated);
  };

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    const updated = projects.filter((p) => p.id !== deleteId);
    setProjects(updated);
    safeSetItem('ecad_projects_index', updated);
    safeRemoveItem(`ecad_data_${deleteId}`);
    setDeleteId(null);
  };

  const handleExportProject = (id: string) => {
    try {
      const rawData = safeGetItem<any>(`ecad_data_${id}`);
      const projectMeta = projects.find((p) => p.id === id);
      const dataToExport = rawData || {
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
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        alert('Error al leer el archivo: El contenido no es un JSON válido.');
        return;
      }

      // Schema validation and sanitization (BUG-10 & BUG-01)
      const validation = validateGatcFile(parsed);
      if (!validation.isValid && validation.errors.length > 0) {
        alert(`Error validando archivo .gatc:\n${validation.errors.slice(0, 3).join('\n')}`);
        return;
      }

      const importedId = validation.projectId || `proj-imp-${Date.now()}`;
      const importedName = validation.projectName || file.name.replace(/\.[^/.]+$/, '');

      const newSummary: ProjectSummary = {
        id: importedId,
        name: importedName,
        updated: Date.now(),
        wallsCount: validation.sanitizedState?.walls?.length || 0,
        boxesCount: validation.sanitizedState?.boxes?.length || 0,
        circuitsCount: validation.sanitizedState?.routes?.length || 0
      };

      const updated = [newSummary, ...projects.filter((p) => p.id !== importedId)];
      setProjects(updated);

      safeSetItem('ecad_projects_index', updated);
      if (validation.sanitizedState) {
        safeSetItem(`ecad_data_${importedId}`, validation.sanitizedState);
      }

      router.push(`/editor/${importedId}`);
    } catch (err) {
      alert('Error inesperado al importar el archivo .gatc.');
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

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <span>⚡ CAD Eléctrico & Obra Civil</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400" />
            <span className="text-indigo-300">Versión 2.0</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-4">
            Gestor de Análisis para{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Tendidos y Costos
            </span>
          </h1>

          <p className="max-w-2xl text-slate-400 text-sm sm:text-base leading-relaxed">
            Plataforma profesional para diseño de instalaciones eléctricas residenciales, cálculo de
            BOM en tiempo real y generación automática de presupuestos y memorias descriptivas.
          </p>
        </div>

        {/* Project Grid with Import, Rename, Delete */}
        <ProjectGrid
          projects={projects}
          onOpenProject={handleOpenProject}
          onNewProject={handleNewProject}
          onRenameProject={handleRenameProject}
          onDeleteProject={(id) => setDeleteId(id)}
          onExportProject={handleExportProject}
          onImportFile={handleImportGatc}
        />
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="¿Eliminar Proyecto Definitivamente?"
        message="Esta acción no se puede deshacer. Se eliminarán todas las paredes, cajas eléctricas, circuitos y presupuestos asociados a este proyecto."
        confirmText="Sí, Eliminar Proyecto"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
