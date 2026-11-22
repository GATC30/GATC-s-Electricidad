'use client';

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header, PhaseTabs, Toolbar, PropertiesPanel, Canvas2D, Viewer3D } from '@/components/editor';
import { QuoteView, MemoryView } from '@/components/phases';
import { WireRouteModal, PricesModal, ExportModal } from '@/components/modals';
import {
  Phase,
  ToolType,
  Wall,
  Box,
  Tube,
  Route,
  Cable,
  ProjectConfig,
  ProjectState,
  CustomMaterial
} from '@/engine/types';
import { ToastProvider, useToast } from '@/components/ui';
import { sanitizeProjectName } from '@/utils/sanitize';
import { safeSetItem, safeGetItem, onStorageError } from '@/utils/storage';
import { validateGatcFile } from '@/lib/validators';
import { generateProjectPDF } from '@/lib/pdf-generator';
import { storageAdapter } from '@/lib/storage';
import { generateId } from '@/utils/math';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore, ProjectSnapshot } from '@/stores/project-store';
import { usePricesStore } from '@/stores/prices-store';
import { useHistory } from '@/hooks/useHistory';
import { useAutoSave } from '@/hooks/useAutoSave';

function EditorContent() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const projectId = (params?.projectId as string) || 'default-project';

  // Modal states for Phase 5 & 7
  const [isWireModalOpen, setIsWireModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [editingTubeId, setEditingTubeId] = useState<string | null>(null);

  // Prices Store
  const { isPricesModalOpen, openPricesModal, closePricesModal, globalPrices } = usePricesStore();

  // Editor Store
  const {
    tool: activeTool,
    phase: activePhase,
    currentLevel,
    showDims,
    showRulers,
    is3D,
    selectedId,
    selectedType,
    wireRoute,
    setTool: setActiveTool,
    setPhase: setActivePhase,
    setCurrentLevel,
    toggleDims,
    toggleRulers,
    toggle3D,
    setIs3D,
    setSelected,
    clearSelection,
    setWireRoute,
    setWireStartId
  } = useEditorStore();

  // Project Store
  const {
    projectName,
    levels,
    walls,
    boxes,
    tubes,
    routes,
    customMats,
    overrides,
    prices,
    config: projectConfig,
    isSaved,
    initProject,
    setProjectName,
    setConfig: setProjectConfig,
    addWall,
    updateWall,
    deleteWall,
    addBox,
    updateBox,
    deleteBox,
    addTube,
    updateTube,
    deleteTube,
    deleteElement,
    addRoute,
    updateRoute,
    deleteRoute,
    removeTubeFromRoute,
    addLevel,
    deleteLevel,
    setCustomMats,
    setOverrides,
    setPrices,
    setIsSaved,
    getSnapshot,
    loadSnapshot
  } = useProjectStore();

  // Undo / Redo History Hook (F4-06: max 50 states)
  const {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory
  } = useHistory<ProjectSnapshot>(undefined, {
    maxHistory: 50,
    onApplySnapshot: (snap) => {
      loadSnapshot(snap);
      clearSelection();
    }
  });

  // Construct full project state for auto-saving (F6-06)
  const currentStateToSave: ProjectState = useMemo(() => ({
    phase: activePhase,
    lvlId: currentLevel,
    levels,
    is3D,
    tool: activeTool,
    showDims,
    showRulers,
    pConf: projectConfig,
    walls,
    boxes,
    tubes,
    routes,
    customMats,
    overrides,
    prices,
    recentColors: []
  }), [
    activePhase,
    currentLevel,
    levels,
    is3D,
    activeTool,
    showDims,
    showRulers,
    projectConfig,
    walls,
    boxes,
    tubes,
    routes,
    customMats,
    overrides,
    prices
  ]);

  // Debounced auto-save hook with 2-second debounce and dual-storage sync (F6-06)
  const {
    status: autoSaveStatus,
    forceSave
  } = useAutoSave(projectId, projectName, currentStateToSave, {
    debounceMs: 2000,
    onSaved: () => setIsSaved(true),
    onError: () => setIsSaved(false)
  });

  // Record history snapshot on state changes
  const recordChange = useCallback(() => {
    const snap = getSnapshot();
    pushState(snap);
    setIsSaved(false);
  }, [getSnapshot, pushState, setIsSaved]);

  // Derive fresh selected object dynamically in every render (BUG-04 fix)
  const selectedElement = useMemo(() => {
    if (!selectedId || !selectedType) return { type: null, element: null };

    if (selectedType === 'wall') {
      const w = walls.find((item) => item.id === selectedId) || null;
      return { type: w ? ('wall' as const) : null, element: w };
    }
    if (selectedType === 'box') {
      const b = boxes.find((item) => item.id === selectedId) || null;
      return { type: b ? ('box' as const) : null, element: b };
    }
    if (selectedType === 'tube') {
      const t = tubes.find((item) => item.id === selectedId) || null;
      return { type: t ? ('tube' as const) : null, element: t };
    }

    return { type: null, element: null };
  }, [selectedId, selectedType, walls, boxes, tubes]);

  // Listen to storage errors (BUG-03: quota notification)
  useEffect(() => {
    const unsubscribe = onStorageError((message, isQuota) => {
      addToast({
        title: isQuota ? 'Almacenamiento Lleno' : 'Error de Guardado',
        message,
        type: isQuota ? 'warning' : 'error',
        duration: 8000
      });
    });
    return unsubscribe;
  }, [addToast]);

  // Load project from local storage / IndexedDB with fallback (F6-05)
  useEffect(() => {
    let isMounted = true;
    async function loadProjectData() {
      try {
        const stored = await storageAdapter.loadProject(projectId);
        if (!isMounted) return;

        if (stored && stored.state) {
          const validation = validateGatcFile(stored.state);
          if (validation.sanitizedState) {
            const s = validation.sanitizedState;
            initProject(projectId, stored.name, s);
            if (s.phase) setActivePhase(s.phase);
            if (s.lvlId) setCurrentLevel(s.lvlId);
            clearHistory({
              walls: s.walls || [],
              boxes: s.boxes || [],
              tubes: s.tubes || [],
              routes: s.routes || [],
              levels: s.levels || [1],
              config: s.pConf || { wW: 0.2, wH: 2.8 }
            });
            return;
          }
        }

        // Fallback default initialization
        initProject(projectId, 'Proyecto CAD');
        clearHistory(getSnapshot());
      } catch (e) {
        console.error('Error loading project:', e);
      }
    }

    loadProjectData();
    return () => {
      isMounted = false;
    };
  }, [projectId, initProject, setActivePhase, setCurrentLevel, clearHistory, getSnapshot]);

  // Keyboard shortcuts (Ctrl+Z for Undo, Ctrl+Y for Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) redo();
        } else {
          e.preventDefault();
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  // Handle Project Name Change (BUG-01 sanitization)
  const handleProjectNameChange = (newName: string) => {
    const cleanName = sanitizeProjectName(newName);
    setProjectName(cleanName);

    const indexList = safeGetItem<any[]>('ecad_projects_index', []);
    if (Array.isArray(indexList)) {
      const updated = indexList.map((p: any) =>
        p.id === projectId ? { ...p, name: cleanName, updated: Date.now() } : p
      );
      safeSetItem('ecad_projects_index', updated);
    }
  };

  // Level Management (F4-07)
  const handleAddLevel = () => {
    const newLvl = addLevel();
    setCurrentLevel(newLvl);
    recordChange();
    addToast({
      title: 'Nivel Añadido',
      message: `Se ha creado el Nivel ${newLvl}`,
      type: 'success'
    });
  };

  const handleDeleteLevel = (lvlToDelete: number) => {
    if (levels.length <= 1) {
      addToast({
        title: 'Operación no permitida',
        message: 'No puedes borrar el único nivel del proyecto.',
        type: 'warning'
      });
      return;
    }

    const result = deleteLevel(lvlToDelete);
    if (result.success && result.nextLevel) {
      setCurrentLevel(result.nextLevel);
      recordChange();
      addToast({
        title: 'Nivel Eliminado',
        message: `El Nivel ${lvlToDelete} ha sido eliminado.`,
        type: 'info'
      });
    }
  };

  // Toggle 3D with memory disposal (BUG-05 fix)
  const handleToggle3D = () => {
    const next3D = !is3D;
    if (!next3D) {
      if (typeof window !== 'undefined') {
        const d3Container = document.getElementById('d3-container');
        if (d3Container) {
          d3Container.innerHTML = '';
        }
      }
    }
    toggle3D();
  };

  // Export Project (.gatc JSON)
  const handleExport = () => {
    try {
      const fullProjectData: ProjectState = {
        phase: activePhase,
        lvlId: currentLevel,
        levels,
        is3D,
        tool: activeTool,
        showDims,
        showRulers,
        pConf: projectConfig,
        walls,
        boxes,
        tubes,
        routes,
        customMats,
        overrides,
        prices,
        recentColors: []
      };

      const blob = new Blob([JSON.stringify(fullProjectData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_')}.gatc`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      addToast({
        title: 'Error de Exportación',
        message: 'No se pudo generar el archivo .gatc',
        type: 'error'
      });
    }
  };

  // Export PDF with requestAnimationFrame and without dead selectors (BUG-06, BUG-07)
  const handleExportPDF = async () => {
    try {
      addToast({
        title: 'Generando PDF',
        message: 'Preparando planos y presupuesto...',
        type: 'info',
        duration: 3000
      });

      const fullProjectState: ProjectState = {
        phase: activePhase,
        lvlId: currentLevel,
        levels,
        is3D,
        tool: activeTool,
        showDims,
        showRulers,
        pConf: projectConfig,
        walls,
        boxes,
        tubes,
        routes,
        customMats,
        overrides,
        prices,
        recentColors: []
      };

      const pdf = await generateProjectPDF(projectName, fullProjectState, {
        includeCivil: true,
        includeElectrical: true,
        includeQuote: true,
        includeMemory: true,
        includeNomenclature: true
      });

      pdf.save(`${projectName.replace(/\s+/g, '_')}_documentacion.pdf`);

      addToast({
        title: 'PDF Generado',
        message: 'El documento se ha descargado correctamente.',
        type: 'success'
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      addToast({
        title: 'Error en PDF',
        message: 'Ocurrió un problema al renderizar el documento PDF.',
        type: 'error'
      });
    }
  };

  // Phase 5 Wire Route Handlers
  const handleOpenWireModal = (routeId: string | null = null, tubeId: string | null = null) => {
    setActiveRouteId(routeId);
    setEditingTubeId(tubeId);
    setIsWireModalOpen(true);
  };

  const handleSaveWireRoute = (
    name: string,
    cables: Cable[],
    onlyCurrentTube: boolean = false
  ) => {
    if (activeRouteId) {
      const existingRoute = routes.find((r) => r.id === activeRouteId);
      if (existingRoute) {
        if (onlyCurrentTube && editingTubeId) {
          // Derive circuit: remove editingTubeId from original and make a new derived route
          removeTubeFromRoute(activeRouteId, editingTubeId);
          const newRoute: Route = {
            id: generateId(),
            name: `${name} (Deriv.)`,
            tubes: [editingTubeId],
            cables: JSON.parse(JSON.stringify(cables))
          };
          addRoute(newRoute);
          addToast({
            title: 'Derivación Creada',
            message: `Derivación "${newRoute.name}" creada para el tramo`,
            type: 'success'
          });
        } else {
          updateRoute({
            ...existingRoute,
            name,
            cables: JSON.parse(JSON.stringify(cables))
          });
          addToast({
            title: 'Circuito Actualizado',
            message: `Circuito "${name}" actualizado exitosamente`,
            type: 'success'
          });
        }
      }
    } else {
      // New wire route finished on canvas
      if (wireRoute.length === 0) {
        addToast({
          title: 'Error de Enrutamiento',
          message: 'No se seleccionaron tuberías para la ruta.',
          type: 'warning'
        });
        return;
      }

      const newRoute: Route = {
        id: generateId(),
        name,
        tubes: [...wireRoute],
        cables: JSON.parse(JSON.stringify(cables))
      };
      addRoute(newRoute);
      setWireRoute([]);
      setWireStartId(null);
      addToast({
        title: 'Circuito Fijado',
        message: `Circuito "${name}" guardado con ${newRoute.tubes.length} tramos`,
        type: 'success'
      });
    }

    recordChange();
    setIsWireModalOpen(false);
    setActiveRouteId(null);
    setEditingTubeId(null);
  };

  const handleDeleteWireRoute = (routeId: string) => {
    deleteRoute(routeId);
    recordChange();
    addToast({
      title: 'Circuito Eliminado',
      message: 'La ruta de cableado ha sido eliminada del proyecto',
      type: 'info'
    });
    setIsWireModalOpen(false);
    setActiveRouteId(null);
    setEditingTubeId(null);
  };

  const handleRemoveTubeFromRoute = (routeId: string, tubeId: string) => {
    removeTubeFromRoute(routeId, tubeId);
    recordChange();
    addToast({
      title: 'Cable Retirado',
      message: 'Se retiró el circuito de este tramo de tubería',
      type: 'info'
    });
  };

  const selectedRoute = useMemo(() => {
    return activeRouteId ? routes.find((r) => r.id === activeRouteId) : null;
  }, [activeRouteId, routes]);

  const fullProjectState: ProjectState = {
    phase: activePhase,
    lvlId: currentLevel,
    levels,
    is3D,
    tool: activeTool,
    showDims,
    showRulers,
    pConf: projectConfig,
    walls,
    boxes,
    tubes,
    routes,
    customMats,
    overrides,
    prices,
    recentColors: []
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* 1. Header Navigation Bar */}
      <Header
        projectName={projectName}
        onProjectNameChange={handleProjectNameChange}
        currentLevel={currentLevel}
        levels={levels}
        onSelectLevel={(lvl) => setCurrentLevel(lvl)}
        onAddLevel={handleAddLevel}
        onDeleteLevel={handleDeleteLevel}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        showDims={showDims}
        onToggleDims={toggleDims}
        showRulers={showRulers}
        onToggleRulers={toggleRulers}
        is3D={is3D}
        onToggle3D={handleToggle3D}
        onExport={() => setIsExportModalOpen(true)}
        isSaved={isSaved}
        saveStatus={autoSaveStatus}
      />

      {/* 2. Phase Navigation Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between">
        <PhaseTabs
          activePhase={activePhase}
          onChangePhase={(ph) => {
            if (is3D && (ph === 3 || ph === 4)) {
              setIs3D(false);
            }
            setActivePhase(ph);
          }}
        />
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <button
            onClick={openPricesModal}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Configurar precios globales de materiales"
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Precios Globales
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Abrir menú de exportación (PDF / .gatc)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar
          </button>
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-[11px]">
            Escala: 40px = 1m
          </span>
        </div>
      </div>

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {is3D ? (
          /* 3D Visualizer (F7-01) */
          <div className="flex-1 relative h-full w-full">
            <Viewer3D
              walls={walls}
              boxes={boxes}
              tubes={tubes}
              routes={routes}
              config={projectConfig}
              levels={levels}
              currentLevel={currentLevel}
              onClose={() => setIs3D(false)}
            />
          </div>
        ) : activePhase === 1 || activePhase === 2 ? (
          <>
            {/* Left Toolbar */}
            <Toolbar
              activePhase={activePhase}
              activeTool={activeTool}
              onSelectTool={(t) => setActiveTool(t)}
              onActionClick={(actionId) => {
                if (actionId === 'action_global_prices') {
                  openPricesModal();
                } else if (actionId === 'action_refresh_bom') {
                  recordChange();
                  addToast({
                    title: 'Presupuesto Actualizado',
                    message: 'Se recalcularon todas las cantidades y longitudes métricas.',
                    type: 'success'
                  });
                }
              }}
            />

            {/* Center Interactive CAD Canvas */}
            <div className="flex-1 relative h-full overflow-hidden">
              <Canvas2D
                onSaveState={recordChange}
                onOpenWireModal={(routeId) => handleOpenWireModal(routeId, null)}
                onToast={(msg) => addToast({ title: 'Aviso CAD', message: msg, type: 'info' })}
              />
            </div>

            {/* Right Properties Panel */}
            <PropertiesPanel
              selectedElement={selectedElement}
              projectConfig={projectConfig}
              elementsCount={{
                walls: walls.length,
                boxes: boxes.length,
                tubes: tubes.length,
                routes: routes.length
              }}
              routes={routes}
              activePhase={activePhase}
              onUpdateWall={(id, updates) => {
                const wall = walls.find((w) => w.id === id);
                if (wall) {
                  updateWall({ ...wall, ...updates });
                  recordChange();
                }
              }}
              onUpdateBox={(id, updates) => {
                const box = boxes.find((b) => b.id === id);
                if (box) {
                  updateBox({ ...box, ...updates });
                  recordChange();
                }
              }}
              onUpdateTube={(id, updates) => {
                const tube = tubes.find((t) => t.id === id);
                if (tube) {
                  updateTube({ ...tube, ...updates });
                  recordChange();
                }
              }}
              onUpdateProjectConfig={(updates) => {
                setProjectConfig(updates);
                recordChange();
              }}
              onDeleteElement={(type, id) => {
                deleteElement(type, id, activePhase);
                clearSelection();
                recordChange();
              }}
              onEditRoute={(rId, tId) => handleOpenWireModal(rId, tId)}
              onRemoveTubeFromRoute={(rId, tId) => handleRemoveTubeFromRoute(rId, tId)}
              onStartWire={() => {
                setActiveTool('wire');
                addToast({
                  title: 'Modo Enrutar Cable',
                  message: 'Haz clic en la caja de inicio y selecciona tuberías para la ruta.',
                  type: 'info'
                });
              }}
            />
          </>
        ) : activePhase === 3 ? (
          /* Phase 3: Cotización / Presupuesto */
          <div className="flex-1 overflow-y-auto h-full bg-[#080b12]">
            <QuoteView
              state={fullProjectState}
              onUpdateOverrides={(key, val) => {
                setOverrides({ ...overrides, [key]: val });
                recordChange();
              }}
              onUpdatePrices={(key, val) => {
                setPrices({ ...prices, [key]: val });
                recordChange();
              }}
              onAddCustomMaterial={(mat) => {
                setCustomMats([...customMats, mat]);
                recordChange();
              }}
              onDeleteCustomMaterial={(idx) => {
                setCustomMats(customMats.filter((_, i) => i !== idx));
                recordChange();
              }}
              onOpenGlobalPrices={openPricesModal}
            />
          </div>
        ) : (
          /* Phase 4: Memoria Descriptiva */
          <div className="flex-1 overflow-y-auto h-full bg-[#080b12]">
            <MemoryView state={fullProjectState} />
          </div>
        )}
      </div>

      {/* Wire Route Modal (F5-02) */}
      <WireRouteModal
        isOpen={isWireModalOpen}
        onClose={() => {
          setIsWireModalOpen(false);
          setActiveRouteId(null);
          setEditingTubeId(null);
        }}
        routeId={activeRouteId}
        editingTubeId={editingTubeId}
        initialCircuitName={selectedRoute ? selectedRoute.name : `Cto. ${routes.length + 1}`}
        initialCables={selectedRoute ? selectedRoute.cables : undefined}
        onSaveRoute={handleSaveWireRoute}
        onDeleteRoute={handleDeleteWireRoute}
      />

      {/* Global Prices Modal (F5-05) */}
      <PricesModal
        isOpen={isPricesModalOpen}
        onClose={closePricesModal}
      />

      {/* Export Modal (F7-05) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectName={projectName}
        state={currentStateToSave}
        onToast={(msg, type) =>
          addToast({
            title: 'Exportación',
            message: msg,
            type: type || 'info'
          })
        }
      />
    </div>
  );
}

export default function EditorPage() {
  return (
    <ToastProvider>
      <EditorContent />
    </ToastProvider>
  );
}
