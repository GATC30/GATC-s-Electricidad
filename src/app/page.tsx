'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectGrid } from '@/components/projects';
import { ProjectSummary } from '@/components/projects/ProjectCard';
import { ConfirmDialog, SkeletonCard } from '@/components/ui';
import { MigrationModal } from '@/components/modals';
import { sanitizeProjectName } from '@/utils/sanitize';
import { safeSetItem, safeGetItem, safeRemoveItem } from '@/utils/storage';
import { validateGatcFile } from '@/lib/validators';
import { exportProject } from '@/lib/export';
import { storageAdapter, SyncStatus } from '@/lib/storage';
import { detectLegacyData, LegacyDetectionResult, MigrationResult } from '@/lib/migration';

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: '50vw', y: '50vh' });
  const [legacyDetection, setLegacyDetection] = useState<LegacyDetectionResult | null>(null);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load projects from storage (IndexedDB / localStorage)
  const refreshProjects = useCallback(async () => {
    try {
      // First try to load from storage adapter
      const adapterList = await storageAdapter.listProjects();
      if (adapterList && adapterList.length > 0) {
        const summaries: ProjectSummary[] = adapterList.map((p) => ({
          id: p.id,
          name: sanitizeProjectName(p.name || 'Proyecto GATC'),
          updated: p.updated || Date.now(),
          wallsCount: p.wallsCount || 0,
          boxesCount: p.boxesCount || 0,
          circuitsCount: p.circuitsCount || 0
        }));
        setProjects(summaries);
        return;
      }

      // Fallback to ecad_projects_index
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check legacy v1.5 data on initial mount (F9-02)
  useEffect(() => {
    refreshProjects();

    const detection = detectLegacyData();
    setLegacyDetection(detection);

    // Auto-prompt modal if legacy data exists and has not been migrated or dismissed
    if (detection.hasLegacyData && !detection.isMigrated && !detection.isDismissed) {
      setIsMigrationModalOpen(true);
    }
  }, [refreshProjects]);

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
    const targetId = deleteId;
    const updated = projects.filter((p) => p.id !== targetId);
    setProjects(updated);
    storageAdapter.deleteProject(targetId);
    setDeleteId(null);
  };

  const handleExportProject = (id: string) => {
    try {
      const rawData = safeGetItem<any>(`ecad_data_${id}`);
      const projectMeta = projects.find((p) => p.id === id);
      const projName = projectMeta?.name || 'Proyecto GATC';
      exportProject(
        projName,
        rawData || {
          phase: 1,
          lvlId: 1,
          levels: [1],
          is3D: false,
          tool: 'select',
          showDims: true,
          showRulers: false,
          pConf: { wW: 0.2, wH: 2.8 },
          walls: [],
          boxes: [],
          tubes: [],
          routes: [],
          customMats: [],
          overrides: {},
          prices: {},
          recentColors: []
        }
      );
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

      // Schema validation and sanitization (BUG-10, BUG-01, F9-04)
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
        storageAdapter.saveProject(importedId, importedName, validation.sanitizedState);
      }

      if (validation.wasMigrated) {
        console.info(`[Import] Archivo migrado automáticamente desde v${validation.detectedVersion || '1.5'} a v2.0`);
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
        <div className="flex flex-col items-center text-center mb-10 md:mb-12">
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

          <p className="max-w-2xl text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
            Plataforma profesional para diseño de instalaciones eléctricas residenciales, cálculo de
            BOM en tiempo real y generación automática de presupuestos y memorias descriptivas.
          </p>

          {/* Legacy Migration Banner (F9-02) */}
          {legacyDetection?.hasLegacyData && !legacyDetection?.isMigrated && (
            <div className="flex items-center justify-between gap-4 p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm max-w-xl w-full backdrop-blur-sm shadow-lg text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-white text-xs sm:text-sm">
                    {legacyDetection.projectCount} {legacyDetection.projectCount === 1 ? 'proyecto' : 'proyectos'} de GATC v1.5 detectados
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Puedes importarlos al nuevo formato v2 sin perder datos ni configuraciones.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMigrationModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap transition-colors shadow"
              >
                Migrar
              </button>
            </div>
          )}
        </div>

        {/* Project Grid with Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <ProjectGrid
            projects={projects}
            onOpenProject={handleOpenProject}
            onNewProject={handleNewProject}
            onRenameProject={handleRenameProject}
            onDeleteProject={(id) => setDeleteId(id)}
            onExportProject={handleExportProject}
            onImportGatc={handleImportGatc}
          />
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="¿Eliminar Proyecto Definitivamente?"
        description="Esta acción no se puede deshacer. Se eliminarán todas las paredes, cajas eléctricas, circuitos y presupuestos asociados a este proyecto."
        confirmLabel="Sí, Eliminar Proyecto"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />

      {/* Legacy Migration Modal (F9-02) */}
      <MigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        detection={legacyDetection}
        onMigrated={(res) => {
          if (res.success) {
            refreshProjects();
            setLegacyDetection(detectLegacyData());
          }
        }}
      />
    </div>
  );
}
