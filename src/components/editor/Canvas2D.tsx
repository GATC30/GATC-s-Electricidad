'use client';

import React from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { useEditorStore } from '@/stores/editor-store';
import { Phase, ToolType, Wall, Box, Tube, ProjectConfig } from '@/engine/types';

export interface Canvas2DProps {
  phase?: Phase;
  tool?: ToolType;
  currentLevel?: number;
  walls?: Wall[];
  boxes?: Box[];
  tubes?: Tube[];
  routes?: any[];
  projectConfig?: ProjectConfig;
  selectedId?: string | null;
  selectedType?: 'wall' | 'box' | 'tube' | null;
  selectedElement?: {
    type: 'wall' | 'box' | 'tube' | null;
    element: Wall | Box | Tube | null;
  };
  onSelectById?: (type: 'wall' | 'box' | 'tube' | null, id: string | null) => void;
  onSelectElement?: (
    type: 'wall' | 'box' | 'tube' | null,
    element: Wall | Box | Tube | null
  ) => void;
  onAddWall?: (wall: Wall) => void;
  onUpdateWall?: (wall: Wall) => void;
  onAddBox?: (box: Box) => void;
  onUpdateBox?: (box: Box) => void;
  onAddTube?: (tube: Tube) => void;
  onSaveState?: () => void;
  showDims?: boolean;
  showRulers?: boolean;
}

export const Canvas2D: React.FC<Canvas2DProps> = ({
  onSaveState
}) => {
  const { containerRef, canvasRef, events } = useCanvas({
    theme: 'dark',
    onSaveState
  });

  const { tool, zoom, cursorCoords } = useEditorStore();

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full bg-[#080b12] overflow-hidden select-none outline-none touch-none"
    >
      {/* CAD Canvas Engine */}
      <canvas
        ref={canvasRef}
        {...events}
        className={`absolute inset-0 w-full h-full block z-0 touch-none ${
          tool === 'pan'
            ? 'cursor-grab'
            : tool === 'select'
              ? 'cursor-default'
              : 'cursor-crosshair'
        }`}
      />

      {/* Canvas Status HUD (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 bg-slate-900/90 border border-slate-800/90 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow-xl pointer-events-none">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-slate-500">X:</span>
          <span className="text-indigo-400 font-semibold">
            {cursorCoords.x.toFixed(2)}m
          </span>
          <span className="text-slate-500 ml-1">Y:</span>
          <span className="text-indigo-400 font-semibold">
            {cursorCoords.y.toFixed(2)}m
          </span>
        </div>

        <div className="h-3 w-px bg-slate-700" />

        <div className="flex items-center gap-1">
          <span className="text-slate-500">Herramienta:</span>
          <span className="font-semibold text-slate-200 uppercase">{tool}</span>
        </div>

        <div className="h-3 w-px bg-slate-700" />

        <div className="flex items-center gap-1">
          <span className="text-slate-500">Zoom:</span>
          <span className="font-semibold text-slate-200">
            {(zoom * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};
