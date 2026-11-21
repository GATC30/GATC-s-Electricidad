'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header, PhaseTabs, Toolbar, PropertiesPanel, Canvas2D } from '@/components/editor';
import { Phase, ToolType, Wall, Box, Tube, ProjectConfig, ProjectState } from '@/engine/types';
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

  // Load project from localStorage
  useEffect(() => {
    try {
      // 1. Get project metadata
      const storedIndex = localStorage.getItem('ecad_projects_index');
      if (storedIndex) {
        const indexList = JSON.parse(storedIndex);
        const meta = indexList.find((p: any) => p.id === projectId);
        if (meta) {
          setProjectName(meta.name);
        }
      }

      // 2. Get project full data
      const storedData = localStorage.getItem(`ecad_data_${projectId}`);
      if (storedData) {
        const data = JSON.parse(storedData);
        if (data.walls) setWalls(data.walls);
        if (data.boxes) setBoxes(data.boxes);
        if (data.tubes) setTubes(data.tubes);
        if (data.routes) setRoutes(data.routes);
        if (data.levels) setLevels(data.levels);
        if (data.pConf) setProjectConfig(data.pConf);
      }
    } catch (e) {
      console.error('Error loading project:', e);
    }
  }, [projectId]);

  // Handle Project Name Change
  const handleProjectNameChange = (newName: string) => {
    setProjectName(newName);
    setIsSaved(false);
    try {
      const storedIndex = localStorage.getItem('ecad_projects_index');
      if (storedIndex) {
        const indexList = JSON.parse(storedIndex);
        const updated = indexList.map((p: any) =>
          p.id === projectId ? { ...p, name: newName, updated: Date.now() } : p
        );
        localStorage.setItem('ecad_projects_index', JSON.stringify(updated));
      }
      setIsSaved(true);
    } catch (_) {}
  };

  // Level Management
  const handleAddLevel = () => {
    const nextLevel = Math.max(...levels, 0) + 1;
    const newLevels = [...levels, nextLevel];
    setLevels(newLevels);
    setCurrentLevel(nextLevel);
  };

  const handleDeleteLevel = (lvlToDelete: number) => {
    if (levels.length <= 1) return;
    const newLevels = levels.filter((l) => l !== lvlToDelete);
    setLevels(newLevels);
    if (currentLevel === lvlToDelete) {
      setCurrentLevel(newLevels[0]);
    }
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
        customMats: [],
        overrides: {},
        prices: {},
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
        {/* Left Toolbar (desktop) / Bottom Toolbar (mobile) */}
        <Toolbar
          activePhase={activePhase}
          activeTool={activeTool}
          onSelectTool={(t) => setActiveTool(t)}
          onActionClick={(actionId) => {
            console.log('Action triggered:', actionId);
          }}
        />

        {/* Center Canvas Area */}
        <div className="flex-1 relative h-full overflow-hidden">
          <Canvas2D
            phase={activePhase}
            tool={activeTool}
            zoom={1}
            showDims={showDims}
            showRulers={showRulers}
          />
        </div>

        {/* Right Properties Panel (desktop) / Bottom sheet (mobile) */}
        <PropertiesPanel
          selectedElement={selectedElement}
          projectConfig={projectConfig}
          elementsCount={{
            walls: walls.length,
            boxes: boxes.length,
            tubes: tubes.length,
            routes: routes.length
          }}
          onUpdateProjectConfig={(updates) =>
            setProjectConfig((prev) => ({ ...prev, ...updates }))
          }
          onDeleteElement={(type, id) => {
            if (type === 'wall') setWalls((prev) => prev.filter((w) => w.id !== id));
            if (type === 'box') setBoxes((prev) => prev.filter((b) => b.id !== id));
            if (type === 'tube') setTubes((prev) => prev.filter((t) => t.id !== id));
            setSelectedElement({ type: null, element: null });
          }}
          onZoomToFit={() => {
            console.log('Zoom to fit requested');
          }}
        />
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
