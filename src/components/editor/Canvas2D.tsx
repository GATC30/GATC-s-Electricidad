'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Phase, ToolType, Wall, Box, Tube, ProjectConfig, Point } from '@/engine/types';
import {
  SCALE,
  DEFAULT_WALL_WIDTH,
  BOX_TYPE_DIMENSIONS
} from '@/engine/constants';
import {
  getWorldCoords,
  snapToWall,
  getClosestWall,
  getRoomCenter,
  getWallPolygon,
  getTubeAtCurve
} from '@/engine/geometry';
import { drawSymbol } from '@/engine/symbols';
import { generateId } from '@/utils/math';

export interface Canvas2DProps {
  phase: Phase;
  tool: ToolType;
  currentLevel: number;
  walls: Wall[];
  boxes: Box[];
  tubes: Tube[];
  routes?: any[];
  projectConfig: ProjectConfig;
  selectedElement?: { type: 'wall' | 'box' | 'tube' | null; element: Wall | Box | Tube | null };
  onSelectElement?: (type: 'wall' | 'box' | 'tube' | null, element: Wall | Box | Tube | null) => void;
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
  phase,
  tool,
  currentLevel,
  walls = [],
  boxes = [],
  tubes = [],
  routes = [],
  projectConfig,
  selectedElement,
  onSelectElement,
  onAddWall,
  onUpdateWall,
  onAddBox,
  onUpdateBox,
  onAddTube,
  onSaveState,
  showDims = true,
  showRulers = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Camera & Navigation
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPan, setIsPan] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });

  // Drawing state
  const [drawTmp, setDrawTmp] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [tubeStartBoxId, setTubeStartBoxId] = useState<string | null>(null);
  const [tubePts, setTubePts] = useState<Point[]>([]);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Helper: Convert client coordinates to World CAD coordinates
  const getWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return getWorldCoords(clientX, clientY, rect, cam.x, cam.y, cam.zoom);
    },
    [cam]
  );

  // Resize canvas when container changes
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main 2D Render Loop
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.zoom, cam.zoom);

    const baseWW = projectConfig?.wW || DEFAULT_WALL_WIDTH;

    // 1. Blueprint Grid Background
    const startX = -cam.x / cam.zoom;
    const startY = -cam.y / cam.zoom;
    const endX = startX + cv.width / cam.zoom;
    const endY = startY + cv.height / cam.zoom;
    const gridSpacing = 20;

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor(startX / gridSpacing) * gridSpacing; x < endX; x += gridSpacing) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = Math.floor(startY / gridSpacing) * gridSpacing; y < endY; y += gridSpacing) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // 2. Render Walls with Miter Join
    const levelWalls = walls.filter((w) => w.lvl === currentLevel);
    ctx.fillStyle = '#334155';

    levelWalls.forEach((w) => {
      const poly = getWallPolygon(w, levelWalls, SCALE, baseWW);
      if (poly) {
        ctx.beginPath();
        ctx.moveTo(poly.p1L.x, poly.p1L.y);
        ctx.lineTo(poly.p2L.x, poly.p2L.y);
        ctx.lineTo(poly.p2R.x, poly.p2R.y);
        ctx.lineTo(poly.p1R.x, poly.p1R.y);
        ctx.closePath();
        ctx.fill();

        // Dimensions (Cotas) in Phase 1
        if (showDims && phase === 1) {
          const a = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
          let da = a;
          if (da > Math.PI / 2 || da < -Math.PI / 2) da += Math.PI;
          const n = { x: -Math.sin(a), y: Math.cos(a) };

          const dInt = Math.hypot(poly.p2L.x - poly.p1L.x, poly.p2L.y - poly.p1L.y) / SCALE;
          const dExt = Math.hypot(poly.p2R.x - poly.p1R.x, poly.p2R.y - poly.p1R.y) / SCALE;

          const wThick = (w.wW || baseWW) * SCALE;
          const textOff = wThick / 2 + 6;

          const midL = {
            x: (poly.p1L.x + poly.p2L.x) / 2 + n.x * textOff,
            y: (poly.p1L.y + poly.p2L.y) / 2 + n.y * textOff
          };
          const midR = {
            x: (poly.p1R.x + poly.p2R.x) / 2 - n.x * textOff,
            y: (poly.p1R.y + poly.p2R.y) / 2 - n.y * textOff
          };

          // Lado 1 (Interior - Azul)
          ctx.save();
          ctx.translate(midL.x, midL.y);
          ctx.rotate(da);
          ctx.fillStyle = '#818cf8';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dInt.toFixed(2) + 'm', 0, 0);
          ctx.restore();

          // Lado 2 (Exterior - Verde)
          ctx.save();
          ctx.translate(midR.x, midR.y);
          ctx.rotate(da);
          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dExt.toFixed(2) + 'm', 0, 0);
          ctx.restore();
        }
      }

      // Selected Wall Highlight
      if (selectedElement?.type === 'wall' && selectedElement.element?.id === w.id) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          Math.min(w.x1, w.x2) - 6,
          Math.min(w.y1, w.y2) - 6,
          Math.abs(w.x1 - w.x2) + 12,
          Math.abs(w.y1 - w.y2) + 12
        );
      }
    });

    // Drawing Temp Wall Preview
    if (drawTmp) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = baseWW * SCALE;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(drawTmp.x1, drawTmp.y1);
      ctx.lineTo(drawTmp.x2, drawTmp.y2);
      ctx.stroke();
    }

    // 3. Render Architectural Elements (Doors, Windows, Stairs)
    const archElements = boxes.filter(
      (b) => b.lvl === currentLevel && ['door', 'window', 'stairs'].includes(b.type)
    );

    archElements.forEach((b) => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate((b.rot * Math.PI) / 180);
      if (b.mirrorX) ctx.scale(-1, 1);
      if (b.mirrorY) ctx.scale(1, -1);

      const cWW = baseWW * SCALE;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-b.dim.w / 2, -cWW, b.dim.w, cWW * 2);

      ctx.lineWidth = 2;

      if (b.type === 'door') {
        ctx.strokeStyle = '#a855f7';
        const w = b.dim.w;
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(-w / 2, w);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w / 2, w);
        ctx.arc(-w / 2, 0, w, Math.PI / 2, 0, true);
        ctx.stroke();
      } else if (b.type === 'window') {
        ctx.strokeStyle = '#06b6d4';
        ctx.strokeRect(-b.dim.w / 2, -4, b.dim.w, 8);
        ctx.beginPath();
        ctx.moveTo(-b.dim.w / 2, 0);
        ctx.lineTo(b.dim.w / 2, 0);
        ctx.stroke();
      } else if (b.type === 'stairs') {
        ctx.strokeStyle = '#64748b';
        ctx.strokeRect(-b.dim.w / 2, -b.dim.h / 2, b.dim.w, b.dim.h);
        for (let i = 1; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(-b.dim.w / 2, -b.dim.h / 2 + (i * b.dim.h) / 5);
          ctx.lineTo(b.dim.w / 2, -b.dim.h / 2 + (i * b.dim.h) / 5);
          ctx.stroke();
        }
      }

      if (selectedElement?.type === 'box' && selectedElement.element?.id === b.id) {
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(-b.dim.w / 2 - 4, -b.dim.h / 2 - 4, b.dim.w + 8, b.dim.h + 8);
      }

      ctx.restore();
    });

    // 4. Render Conduits / Tubes
    const boxMap = new Map<string, Box>(boxes.map((b) => [b.id, b]));
    const levelTubes = tubes.filter((t) => t.lvl === currentLevel);

    levelTubes.forEach((t) => {
      const s = boxMap.get(t.startId);
      const e = boxMap.get(t.endId);
      if (!s || !e) return;

      ctx.strokeStyle = phase === 2 ? '#6366f1' : '#94a3b8';
      ctx.lineWidth = phase === 2 ? 3 : 2;

      if (t.place === 'pared') ctx.setLineDash([10, 5]);
      else if (t.place === 'suelo') ctx.setLineDash([3, 3]);
      else ctx.setLineDash([]);

      const pts = [{ x: s.x, y: s.y }, ...(t.pts || []), { x: e.x, y: e.y }];
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);

      if (t.place === 'pared') {
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      } else {
        for (let i = 1; i < pts.length; i++) {
          const mx = (pts[i - 1].x + pts[i].x) / 2;
          const my = (pts[i - 1].y + pts[i].y) / 2;
          const dist = Math.hypot(pts[i - 1].x - pts[i].x, pts[i - 1].y - pts[i].y);
          const mult = t.place === 'suelo' ? 0.15 : -0.15;
          ctx.quadraticCurveTo(mx, my + dist * mult, pts[i].x, pts[i].y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight selected tube
      if (selectedElement?.type === 'tube' && selectedElement.element?.id === t.id) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    });

    // Active Tube Drawing Preview
    if (tubeStartBoxId) {
      const sBox = boxMap.get(tubeStartBoxId);
      if (sBox) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sBox.x, sBox.y);
        tubePts.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 5. Render Electrical Boxes
    const elecBoxes = boxes.filter(
      (b) => b.lvl === currentLevel && !['door', 'window', 'stairs'].includes(b.type)
    );

    elecBoxes.forEach((b) => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate((b.rot * Math.PI) / 180);

      const isSelected = selectedElement?.type === 'box' && selectedElement.element?.id === b.id;

      if (phase === 2 && b.device) {
        // Draw standard electrical symbol
        drawSymbol(ctx, b.device, b.rot, 1, b.type !== 'box_oct');

        if (b.label) {
          ctx.save();
          ctx.rotate((-b.rot * Math.PI) / 180);
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#080b12';
          ctx.strokeText(b.label, 0, 20);
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(b.label, 0, 20);
          ctx.restore();
        }
      } else {
        // Draw architectural box footprint
        ctx.strokeStyle = isSelected ? '#38bdf8' : '#e2e8f0';
        ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.2)' : '#1e293b';
        ctx.lineWidth = 2;

        let yOff = 0;
        if (b.type !== 'box_oct') {
          if (b.type === 'box_rect') yOff = 4.5;
          else if (b.type === 'box_sq') yOff = 7;
        }
        ctx.translate(0, yOff);

        if (b.type === 'box_oct') {
          ctx.beginPath();
          ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (b.type === 'box_rect') {
          ctx.fillRect(-7, -4.5, 14, 9);
          ctx.strokeRect(-7, -4.5, 14, 9);
        } else if (b.type === 'box_sq') {
          ctx.fillRect(-7, -7, 14, 14);
          ctx.strokeRect(-7, -7, 14, 14);
        }
      }

      ctx.restore();
    });

    ctx.restore();
  }, [
    cam,
    walls,
    boxes,
    tubes,
    currentLevel,
    phase,
    tool,
    drawTmp,
    tubeStartBoxId,
    tubePts,
    selectedElement,
    showDims,
    projectConfig
  ]);

  // Handle Mouse Down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.button === 2 || tool === 'pan') {
      setIsPan(true);
      setPanStart({ x: e.clientX - cam.x, y: e.clientY - cam.y });
      return;
    }

    const wp = getWorld(e.clientX, e.clientY);

    // Tool: Wall
    if (tool === 'wall') {
      const snapped = snapToWall(wp, walls, currentLevel, cam.zoom);
      setDrawTmp({ x1: snapped.x, y1: snapped.y, x2: snapped.x, y2: snapped.y });
      return;
    }

    // Tool: Box or Architectural Element placement
    if (['box_oct', 'box_rect', 'box_sq', 'door', 'window', 'stairs'].includes(tool)) {
      const defaultDims = BOX_TYPE_DIMENSIONS[tool] || { w: 16, h: 12, z: 0.4 };
      let newBoxX = wp.x;
      let newBoxY = wp.y;
      let rot = 0;

      if (tool === 'box_oct') {
        // Auto-center in room
        const roomCenter = getRoomCenter(wp.x, wp.y, currentLevel, walls);
        newBoxX = roomCenter.x;
        newBoxY = roomCenter.y;
      } else {
        // Snap to closest wall and align rotation
        const closest = getClosestWall(wp, walls, currentLevel);
        if (closest && closest.dist < 25) {
          newBoxX = closest.px;
          newBoxY = closest.py;
          const dx = closest.w.x2 - closest.w.x1;
          const dy = closest.w.y2 - closest.w.y1;
          rot = (Math.atan2(dy, dx) * 180) / Math.PI;
        }
      }

      const newBox: Box = {
        id: generateId('box'),
        lvl: currentLevel,
        type: tool as any,
        x: newBoxX,
        y: newBoxY,
        z: defaultDims.z,
        zH: defaultDims.zH || null,
        dim: { w: defaultDims.w, h: defaultDims.h },
        rot,
        device: null
      };

      if (onAddBox) onAddBox(newBox);
      if (onSelectElement) onSelectElement('box', newBox);
      if (onSaveState) onSaveState();
      return;
    }

    // Tool: Tube
    if (tool === 'tube') {
      const hitBox = boxes.find(
        (b) =>
          b.lvl === currentLevel &&
          !['door', 'window', 'stairs'].includes(b.type) &&
          Math.hypot(b.x - wp.x, b.y - wp.y) < 20 / cam.zoom
      );

      if (!tubeStartBoxId) {
        if (hitBox) {
          setTubeStartBoxId(hitBox.id);
          setTubePts([]);
        }
      } else {
        if (hitBox && hitBox.id !== tubeStartBoxId) {
          // Finish tube
          const newTube: Tube = {
            id: generateId('tube'),
            lvl: currentLevel,
            startId: tubeStartBoxId,
            endId: hitBox.id,
            pts: tubePts,
            type: 'tub_pvc_3/4',
            place: 'techo'
          };
          if (onAddTube) onAddTube(newTube);
          setTubeStartBoxId(null);
          setTubePts([]);
          if (onSaveState) onSaveState();
        } else if (!hitBox) {
          // Add curve control point
          setTubePts((prev) => [...prev, { x: wp.x, y: wp.y }]);
        }
      }
      return;
    }

    // Tool: Select
    if (tool === 'select') {
      // 1. Check boxes
      const hitBox = boxes.find(
        (b) =>
          b.lvl === currentLevel &&
          Math.hypot(b.x - wp.x, b.y - wp.y) < Math.max(16, b.dim.w / 2) / cam.zoom
      );
      if (hitBox) {
        if (onSelectElement) onSelectElement('box', hitBox);
        setIsDraggingNode('box');
        setDragOffset({ x: hitBox.x - wp.x, y: hitBox.y - wp.y });
        return;
      }

      // 2. Check walls
      const hitWall = getClosestWall(wp, walls, currentLevel);
      if (hitWall && hitWall.dist < 15 / cam.zoom) {
        if (onSelectElement) onSelectElement('wall', hitWall.w);
        return;
      }

      // 3. Check tubes
      const hitTube = getTubeAtCurve(wp, tubes, boxes, currentLevel, cam.zoom);
      if (hitTube) {
        if (onSelectElement) onSelectElement('tube', hitTube);
        return;
      }

      // Deselect if clicking on empty canvas
      if (onSelectElement) onSelectElement(null, null);
    }
  };

  // Handle Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPan) {
      setCam((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
      return;
    }

    const wp = getWorld(e.clientX, e.clientY);
    setCursorCoords({
      x: +(wp.x / SCALE).toFixed(2),
      y: +(wp.y / SCALE).toFixed(2)
    });

    if (drawTmp) {
      const snapped = snapToWall(wp, walls, currentLevel, cam.zoom);
      setDrawTmp((prev) => (prev ? { ...prev, x2: snapped.x, y2: snapped.y } : null));
      return;
    }

    if (isDraggingNode === 'box' && selectedElement?.element) {
      const currentBox = selectedElement.element as Box;
      const updatedBox: Box = {
        ...currentBox,
        x: wp.x + dragOffset.x,
        y: wp.y + dragOffset.y
      };
      if (onUpdateBox) onUpdateBox(updatedBox);
      if (onSelectElement) onSelectElement('box', updatedBox);
    }
  };

  // Handle Mouse Up
  const handleMouseUp = () => {
    if (isPan) {
      setIsPan(false);
      return;
    }

    if (drawTmp) {
      const len = Math.hypot(drawTmp.x2 - drawTmp.x1, drawTmp.y2 - drawTmp.y1);
      if (len > 15) {
        const newWall: Wall = {
          id: generateId('wall'),
          lvl: currentLevel,
          x1: drawTmp.x1,
          y1: drawTmp.y1,
          x2: drawTmp.x2,
          y2: drawTmp.y2,
          lengthM: +(len / SCALE).toFixed(2),
          heightM: projectConfig?.wH || 2.8,
          wW: projectConfig?.wW || 0.2
        };
        if (onAddWall) onAddWall(newWall);
        if (onSelectElement) onSelectElement('wall', newWall);
        if (onSaveState) onSaveState();
      }
      setDrawTmp(null);
    }

    if (isDraggingNode) {
      setIsDraggingNode(null);
      if (onSaveState) onSaveState();
    }
  };

  // Handle Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = Math.max(0.2, Math.min(4, cam.zoom * zoomFactor));

    setCam((prev) => ({
      zoom: nextZoom,
      x: mx - (mx - prev.x) * (nextZoom / prev.zoom),
      y: my - (my - prev.y) * (nextZoom / prev.zoom)
    }));
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full bg-[#080b12] overflow-hidden select-none outline-none"
    >
      {/* Rulers (Top & Left) */}
      {showRulers && (
        <>
          <div className="absolute top-0 left-6 right-0 h-6 bg-slate-900/90 border-b border-slate-800 z-10 flex items-center px-2 text-[9px] text-slate-400 font-mono pointer-events-none">
            {Array.from({ length: 25 }).map((_, i) => (
              <span key={i} className="inline-block w-20 text-left border-l border-slate-700 pl-1">
                {i * 2}m
              </span>
            ))}
          </div>
          <div className="absolute top-6 bottom-0 left-0 w-6 bg-slate-900/90 border-r border-slate-800 z-10 flex flex-col py-2 text-[9px] text-slate-400 font-mono pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className="h-20 text-center border-t border-slate-700 pt-0.5">
                {i * 2}m
              </span>
            ))}
          </div>
        </>
      )}

      {/* Main CAD Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className={`absolute inset-0 w-full h-full block z-0 ${
          tool === 'pan' ? 'cursor-grab' : tool === 'select' ? 'cursor-default' : 'cursor-crosshair'
        }`}
      />

      {/* Canvas Status HUD (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 bg-slate-900/90 border border-slate-800/90 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow-xl">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-slate-500">X:</span>
          <span className="text-indigo-400 font-semibold">{cursorCoords.x}m</span>
          <span className="text-slate-500 ml-1">Y:</span>
          <span className="text-indigo-400 font-semibold">{cursorCoords.y}m</span>
        </div>

        <div className="h-3 w-px bg-slate-700" />

        <div className="flex items-center gap-1">
          <span className="text-slate-500">Herramienta:</span>
          <span className="font-semibold text-slate-200 uppercase">{tool}</span>
        </div>

        <div className="h-3 w-px bg-slate-700" />

        <div className="flex items-center gap-1">
          <span className="text-slate-500">Zoom:</span>
          <span className="font-semibold text-slate-200">{(cam.zoom * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};
