'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';

export interface MinimapProps {
  canvasWidth?: number;
  canvasHeight?: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  canvasWidth = 1200,
  canvasHeight = 800
}) => {
  const { camera, zoom, currentLevel, theme, setCamera } = useEditorStore();
  const { walls, boxes, tubes } = useProjectStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);

  const mapWidth = 190;
  const mapHeight = 130;

  // Compute bounding box of current level elements
  const getBounds = useCallback(() => {
    const lvlWalls = walls.filter((w) => w.lvl === currentLevel);
    const lvlBoxes = boxes.filter((b) => b.lvl === currentLevel);

    let minX = -200;
    let maxX = 800;
    let minY = -200;
    let maxY = 600;

    if (lvlWalls.length > 0 || lvlBoxes.length > 0) {
      minX = Infinity;
      maxX = -Infinity;
      minY = Infinity;
      maxY = -Infinity;

      lvlWalls.forEach((w) => {
        minX = Math.min(minX, w.x1, w.x2);
        maxX = Math.max(maxX, w.x1, w.x2);
        minY = Math.min(minY, w.y1, w.y2);
        maxY = Math.max(maxY, w.y1, w.y2);
      });

      lvlBoxes.forEach((b) => {
        minX = Math.min(minX, b.x - 20);
        maxX = Math.max(maxX, b.x + 20);
        minY = Math.min(minY, b.y - 20);
        maxY = Math.max(maxY, b.y + 20);
      });

      // Add 15% margin
      const padX = Math.max(100, (maxX - minX) * 0.15);
      const padY = Math.max(100, (maxY - minY) * 0.15);
      minX -= padX;
      maxX += padX;
      minY -= padY;
      maxY += padY;
    }

    return { minX, maxX, minY, maxY };
  }, [walls, boxes, currentLevel]);

  // Render minimap content
  const renderMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isCollapsed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bounds = getBounds();
    const boxW = bounds.maxX - bounds.minX;
    const boxH = bounds.maxY - bounds.minY;

    ctx.clearRect(0, 0, mapWidth, mapHeight);

    // Background
    ctx.fillStyle = theme === 'dark' ? '#0b0f19' : '#f1f5f9';
    ctx.fillRect(0, 0, mapWidth, mapHeight);

    // Scale factors to map world coordinates to minimap canvas
    const scaleX = mapWidth / boxW;
    const scaleY = mapHeight / boxH;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (mapWidth - boxW * scale) / 2;
    const offsetY = (mapHeight - boxH * scale) / 2;

    const toMapX = (worldX: number) => offsetX + (worldX - bounds.minX) * scale;
    const toMapY = (worldY: number) => offsetY + (worldY - bounds.minY) * scale;

    // 1. Draw Tubes / Conduits
    const lvlTubes = tubes.filter((t) => t.lvl === currentLevel);
    const boxMap = new Map(boxes.map((b) => [b.id, b]));

    ctx.strokeStyle = theme === 'dark' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.6)';
    ctx.lineWidth = 1;
    lvlTubes.forEach((t) => {
      const s = boxMap.get(t.startId);
      const e = boxMap.get(t.endId);
      if (s && e) {
        ctx.beginPath();
        ctx.moveTo(toMapX(s.x), toMapY(s.y));
        ctx.lineTo(toMapX(e.x), toMapY(e.y));
        ctx.stroke();
      }
    });

    // 2. Draw Walls
    const lvlWalls = walls.filter((w) => w.lvl === currentLevel);
    ctx.strokeStyle = theme === 'dark' ? '#64748b' : '#334155';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    lvlWalls.forEach((w) => {
      ctx.beginPath();
      ctx.moveTo(toMapX(w.x1), toMapY(w.y1));
      ctx.lineTo(toMapX(w.x2), toMapY(w.y2));
      ctx.stroke();
    });

    // 3. Draw Boxes / Openings
    const lvlBoxes = boxes.filter((b) => b.lvl === currentLevel);
    lvlBoxes.forEach((b) => {
      const mx = toMapX(b.x);
      const my = toMapY(b.y);

      if (['door', 'window', 'stairs'].includes(b.type)) {
        ctx.fillStyle = b.type === 'door' ? '#c084fc' : b.type === 'window' ? '#38bdf8' : '#94a3b8';
        ctx.fillRect(mx - 2, my - 2, 4, 4);
      } else {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(mx, my, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 4. Draw Viewport Rectangle
    // Visible world area:
    const vWorldLeft = -camera.x / zoom;
    const vWorldTop = -camera.y / zoom;
    const vWorldRight = vWorldLeft + canvasWidth / zoom;
    const vWorldBottom = vWorldTop + canvasHeight / zoom;

    const vpX = toMapX(vWorldLeft);
    const vpY = toMapY(vWorldTop);
    const vpW = (vWorldRight - vWorldLeft) * scale;
    const vpH = (vWorldBottom - vWorldTop) * scale;

    ctx.save();
    // Fill translucent overlay
    ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.fillRect(vpX, vpY, vpW, vpH);

    // Border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
    ctx.restore();
  }, [
    isCollapsed,
    getBounds,
    theme,
    tubes,
    walls,
    boxes,
    currentLevel,
    camera,
    zoom,
    canvasWidth,
    canvasHeight
  ]);

  useEffect(() => {
    renderMinimap();
  }, [renderMinimap]);

  // Navigate to clicked coordinate on the minimap
  const navigateMinimap = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const bounds = getBounds();
    const boxW = bounds.maxX - bounds.minX;
    const boxH = bounds.maxY - bounds.minY;

    const scaleX = mapWidth / boxW;
    const scaleY = mapHeight / boxH;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (mapWidth - boxW * scale) / 2;
    const offsetY = (mapHeight - boxH * scale) / 2;

    const worldX = bounds.minX + (clickX - offsetX) / scale;
    const worldY = bounds.minY + (clickY - offsetY) / scale;

    // Center camera on this world point
    setCamera({
      x: Math.round(canvasWidth / 2 - worldX * zoom),
      y: Math.round(canvasHeight / 2 - worldY * zoom)
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    navigateMinimap(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      navigateMinimap(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      className={`absolute bottom-3 right-3 z-20 rounded-xl overflow-hidden shadow-2xl border transition-all duration-200 select-none ${
        theme === 'dark'
          ? 'bg-slate-900/95 border-slate-800 text-slate-300'
          : 'bg-white/95 border-slate-300 text-slate-700'
      } backdrop-blur-md`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold border-b border-slate-700/40">
        <span className="flex items-center gap-1.5 opacity-80">
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Minimapa
        </span>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-0.5 rounded hover:bg-slate-700/40 text-slate-400 hover:text-slate-200"
          title={isCollapsed ? 'Expandir Minimapa' : 'Minimizar Minimapa'}
        >
          <svg
            className={`w-3.5 h-3.5 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Canvas View */}
      {!isCollapsed && (
        <canvas
          ref={canvasRef}
          width={mapWidth}
          height={mapHeight}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="block cursor-crosshair touch-none"
          title="Haz clic o arrastra para navegar en el plano"
        />
      )}
    </div>
  );
};
