'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header, PhaseTabs, Toolbar, PropertiesPanel, Canvas2D } from '@/components/editor';
import { QuoteView, MemoryView } from '@/components/phases';
import { Phase, ToolType, Wall, Box, Tube, ProjectConfig, ProjectState, CustomMaterial } from '@/engine/types';
import { DEFAULT_WALL_WIDTH, DEFAULT_WALL_HEIGHT } from '@/engine/constants';
import { ToastProvider, useToast } from '@/components/ui';

function EditorContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.projectId as string) || 'default-project';

  // Editor UI State
  const [projectName, setProjectName] = useState<string>('Proyecto CAD');
  const [activePhase, setActivePhase] = useState<Phase>(1);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [levels, setLevels] = useState<number[]>([1]);
  const [showDims, setShowDims] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(false);
  const [is3D, setIs3D] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // CAD State Elements
  const [walls, setWalls] = useState<Wall[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [tubes, setTubes] = useState<Tube[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [customMats, setCustomMats] = useState<CustomMaterial[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    wW: DEFAULT_WALL_WIDTH,
    wH: DEFAULT_WALL_HEIGHT
  });

  // Selected Element
  const [selectedElement, setSelectedElement] = useState<{
    type: 'wall' | 'box' | 'tube' | null;
    element: Wall | Box | Tube | null;
  }>({
    type: null,
    element: null
  });

  // Save current project state to localStorage
  const saveToStorage = useCallback(
    (
      wList = walls,
      bList = boxes,
      tList = tubes,
      rList = routes,
      cList = customMats,
      oList = overrides,
      pList = prices,
      cfg = projectConfig,
      lvlList = levels
    ) => {
      try {
        setIsSaved(false);
        const stateToSave: ProjectState = {
          phase: activePhase,
          lvlId: currentLevel,
          levels: lvlList,
          is3D,
          tool: activeTool,
          showDims,
          showRulers,
          pConf: cfg,
          walls: wList,
          boxes: bList,
          tubes: tList,
          routes: rList,
          customMats: cList,
          overrides: oList,
          prices: pList,
          recentColors: []
        };
        localStorage.setItem(`ecad_data_${projectId}`, JSON.stringify(stateToSave));

        // Update timestamp in project index
        const storedIndex = localStorage.getItem('ecad_projects_index');
        if (storedIndex) {
          const indexList = JSON.parse(storedIndex);
          const updated = indexList.map((p: any) =>
            p.id === projectId ? { ...p, updated: Date.now() } : p
          );
          localStorage.setItem('ecad_projects_index', JSON.stringify(updated));
        }
        setIsSaved(true);
      } catch (e) {
        console.error('Error saving project:', e);
      }
    },
    [
      walls,
      boxes,
      tubes,
      routes,
      customMats,
      overrides,
      prices,
      projectConfig,
      levels,
      activePhase,
      currentLevel,
      is3D,
      activeTool,
      showDims,
      showRulers,
      projectId
    ]
  );

  // Load project from localStorage
  useEffect(() => {
    try {
      const storedIndex = localStorage.getItem('ecad_projects_index');
      if (storedIndex) {
        const indexList = JSON.parse(storedIndex);
        const meta = indexList.find((p: any) => p.id === projectId);
        if (meta) {
          setProjectName(meta.name);
        }
      }

      const storedData = localStorage.getItem(`ecad_data_${projectId}`);
      if (storedData) {
        const data = JSON.parse(storedData);
        if (data.walls) setWalls(data.walls);
        if (data.boxes) setBoxes(data.boxes);
        if (data.tubes) setTubes(data.tubes);
        if (data.routes) setRoutes(data.routes);
        if (data.levels) setLevels(data.levels);
        if (data.pConf) setProjectConfig(data.pConf);
        if (data.customMats) setCustomMats(data.customMats);
        if (data.overrides) setOverrides(data.overrides);
        if (data.prices) setPrices(data.prices);
      }
    } catch (e) {
      console.error('Error loading project:', e);
    }
  }, [projectId]);

  // Handle Project Name Change
  const handleProjectNameChange = (newName: string) => {
    setProjectName(newName);
    try {
      const storedIndex = localStorage.getItem('ecad_projects_index');
      if (storedIndex) {
        const indexList = JSON.parse(storedIndex);
        const updated = indexList.map((p: any) =>
          p.id === projectId ? { ...p, name: newName, updated: Date.now() } : p
        );
        localStorage.setItem('ecad_projects_index', JSON.stringify(updated));
      }
    } catch (_) {}
  };

  // Level Management
  const handleAddLevel = () => {
    const nextLevel = Math.max(...levels, 0) + 1;
    const newLevels = [...levels, nextLevel];
    setLevels(newLevels);
    setCurrentLevel(nextLevel);
    saveToStorage(walls, boxes, tubes, routes, customMats, overrides, prices, projectConfig, newLevels);
  };

  const handleDeleteLevel = (lvlToDelete: number) => {
    if (levels.length <= 1) return;
    const newLevels = levels.filter((l) => l !== lvlToDelete);
    const newWalls = walls.filter((w) => w.lvl !== lvlToDelete);
    const newBoxes = boxes.filter((b) => b.lvl !== lvlToDelete);
    const newTubes = tubes.filter((t) => t.lvl !== lvlToDelete);

    setLevels(newLevels);
    setWalls(newWalls);
    setBoxes(newBoxes);
    setTubes(newTubes);

    if (currentLevel === lvlToDelete) {
      setCurrentLevel(newLevels[0]);
    }
    saveToStorage(newWalls, newBoxes, newTubes, routes, customMats, overrides, prices, projectConfig, newLevels);
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
      alert('Error exportando archivo .gatc');
    }
  };

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
        canUndo={false}
        canRedo={false}
        showDims={showDims}
        onToggleDims={() => setShowDims(!showDims)}
        showRulers={showRulers}
        onToggleRulers={() => setShowRulers(!showRulers)}
        is3D={is3D}
        onToggle3D={() => setIs3D(!is3D)}
        onExport={handleExport}
        isSaved={isSaved}
      />

      {/* 2. Phase Navigation Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between">
        <PhaseTabs activePhase={activePhase} onChangePhase={(ph) => setActivePhase(ph)} />
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-[11px]">
            Escala: 40px = 1m
          </span>
        </div>
      </div>

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Render Active Phase Content */}
        {activePhase === 1 || activePhase === 2 ? (
          <>
            {/* Left Toolbar */}
            <Toolbar
              activePhase={activePhase}
              activeTool={activeTool}
              onSelectTool={(t) => setActiveTool(t)}
            />

            {/* Center Interactive CAD Canvas */}
            <div className="flex-1 relative h-full overflow-hidden">
              <Canvas2D
                phase={activePhase}
                tool={activeTool}
                currentLevel={currentLevel}
                walls={walls}
                boxes={boxes}
                tubes={tubes}
                routes={routes}
                projectConfig={projectConfig}
                selectedElement={selectedElement}
                onSelectElement={(type, element) => setSelectedElement({ type, element })}
                onAddWall={(newWall) => {
                  const updated = [...walls, newWall];
                  setWalls(updated);
                  saveToStorage(updated);
                }}
                onUpdateWall={(updatedWall) => {
                  const updated = walls.map((w) => (w.id === updatedWall.id ? updatedWall : w));
                  setWalls(updated);
                  saveToStorage(updated);
                }}
                onAddBox={(newBox) => {
                  const updated = [...boxes, newBox];
                  setBoxes(updated);
                  saveToStorage(walls, updated);
                }}
                onUpdateBox={(updatedBox) => {
                  const updated = boxes.map((b) => (b.id === updatedBox.id ? updatedBox : b));
                  setBoxes(updated);
                  saveToStorage(walls, updated);
                }}
                onAddTube={(newTube) => {
                  const updated = [...tubes, newTube];
                  setTubes(updated);
                  saveToStorage(walls, boxes, updated);
                }}
                onSaveState={() => saveToStorage()}
                showDims={showDims}
                showRulers={showRulers}
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
              onUpdateWall={(id, updates) => {
                const updated = walls.map((w) => (w.id === id ? { ...w, ...updates } : w));
                setWalls(updated);
                if (selectedElement.type === 'wall' && selectedElement.element?.id === id) {
                  setSelectedElement({ type: 'wall', element: { ...selectedElement.element, ...updates } as Wall });
                }
                saveToStorage(updated);
              }}
              onUpdateBox={(id, updates) => {
                const updated = boxes.map((b) => (b.id === id ? { ...b, ...updates } : b));
                setBoxes(updated);
                if (selectedElement.type === 'box' && selectedElement.element?.id === id) {
                  setSelectedElement({ type: 'box', element: { ...selectedElement.element, ...updates } as Box });
                }
                saveToStorage(walls, updated);
              }}
              onUpdateTube={(id, updates) => {
                const updated = tubes.map((t) => (t.id === id ? { ...t, ...updates } : t));
                setTubes(updated);
                if (selectedElement.type === 'tube' && selectedElement.element?.id === id) {
                  setSelectedElement({ type: 'tube', element: { ...selectedElement.element, ...updates } as Tube });
                }
                saveToStorage(walls, boxes, updated);
              }}
              onUpdateProjectConfig={(updates) => {
                const updated = { ...projectConfig, ...updates };
                setProjectConfig(updated);
                saveToStorage(walls, boxes, tubes, routes, customMats, overrides, prices, updated);
              }}
              onDeleteElement={(type, id) => {
                if (type === 'wall') {
                  const updated = walls.filter((w) => w.id !== id);
                  setWalls(updated);
                  saveToStorage(updated);
                }
                if (type === 'box') {
                  const updated = boxes.filter((b) => b.id !== id);
                  setBoxes(updated);
                  saveToStorage(walls, updated);
                }
                if (type === 'tube') {
                  const updated = tubes.filter((t) => t.id !== id);
                  setTubes(updated);
                  saveToStorage(walls, boxes, updated);
                }
                setSelectedElement({ type: null, element: null });
              }}
            />
          </>
        ) : activePhase === 3 ? (
          /* Phase 3: Cotización / Presupuesto */
          <div className="flex-1 overflow-y-auto h-full bg-[#080b12]">
            <QuoteView
              state={fullProjectState}
              onUpdateOverrides={(key, val) => {
                const updated = { ...overrides, [key]: val };
                setOverrides(updated);
                saveToStorage(walls, boxes, tubes, routes, customMats, updated);
              }}
              onUpdatePrices={(key, val) => {
                const updated = { ...prices, [key]: val };
                setPrices(updated);
                saveToStorage(walls, boxes, tubes, routes, customMats, overrides, updated);
              }}
              onAddCustomMaterial={(mat) => {
                const updated = [...customMats, mat];
                setCustomMats(updated);
                saveToStorage(walls, boxes, tubes, routes, updated);
              }}
              onDeleteCustomMaterial={(idx) => {
                const updated = customMats.filter((_, i) => i !== idx);
                setCustomMats(updated);
                saveToStorage(walls, boxes, tubes, routes, updated);
              }}
            />
          </div>
        ) : (
          /* Phase 4: Memoria Descriptiva */
          <div className="flex-1 overflow-y-auto h-full bg-[#080b12]">
            <MemoryView state={fullProjectState} />
          </div>
        )}
      </div>
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
