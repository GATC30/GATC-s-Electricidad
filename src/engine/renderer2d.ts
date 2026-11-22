/**
 * GATC Engine - 2D CAD Renderer (renderer2d.ts)
 * Handles high-fidelity blueprint rendering, miter wall joins, dimensions (cotas),
 * architectural openings, conduits, electrical symbols, ghost layers, and dynamic rulers.
 */

import {
  Wall,
  Box,
  Tube,
  Route,
  ProjectConfig,
  Phase,
  ToolType,
  Point
} from './types';
import { SCALE, DEFAULT_WALL_WIDTH } from './constants';
import { getWallPolygon, getClosestWall } from './geometry';
import { drawSymbol } from './symbols';

export interface RenderProjectState {
  walls: Wall[];
  boxes: Box[];
  tubes: Tube[];
  routes: Route[];
  config: ProjectConfig;
  levels?: number[];
}

export interface RenderEditorState {
  camera: { x: number; y: number };
  zoom: number;
  currentLevel: number;
  phase: Phase;
  tool: ToolType;
  selectedId: string | null;
  selectedType: 'wall' | 'box' | 'tube' | null;
  drawTmp?: any;
  wireRoute?: string[];
  wireStartId?: string | null;
  showDims?: boolean;
  showRulers?: boolean;
  layers?: {
    walls?: boolean;
    openings?: boolean;
    boxes?: boolean;
    tubes?: boolean;
    dimensions?: boolean;
    labels?: boolean;
    ghost?: boolean;
  };
}

export interface RenderOptions {
  width: number;
  height: number;
  isExport?: boolean;
  theme?: 'dark' | 'light';
}

/**
 * Main 2D Canvas Render function.
 */
export function render2D(
  ctx: CanvasRenderingContext2D,
  projectState: RenderProjectState,
  editorState: RenderEditorState,
  options: RenderOptions
): void {
  const { width, height, isExport = false, theme = 'dark' } = options;
  const { walls, boxes, tubes, routes, config } = projectState;
  const {
    camera,
    zoom,
    currentLevel,
    phase,
    tool,
    selectedId,
    selectedType,
    drawTmp,
    wireRoute = [],
    wireStartId = null,
    showDims = true,
    showRulers = false,
    layers = {}
  } = editorState;

  const showGhost = (layers.ghost !== false) && currentLevel > 1 && !isExport;
  const showWalls = layers.walls !== false;
  const showOpenings = layers.openings !== false;
  const showTubes = layers.tubes !== false;
  const showBoxes = layers.boxes !== false;
  const showDimsEffective = showDims && (layers.dimensions !== false);
  const showLabels = layers.labels !== false;

  const baseWW = config?.wW || DEFAULT_WALL_WIDTH;

  // Clear canvas
  if (!isExport) {
    ctx.fillStyle = theme === 'dark' ? '#080b12' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.save();

  if (!isExport) {
    ctx.translate(camera.x, camera.y);
    ctx.scale(zoom, zoom);
  }

  // 1. Grid Pattern (only in non-export view)
  if (!isExport) {
    const startX = -camera.x / zoom;
    const startY = -camera.y / zoom;
    const endX = startX + width / zoom;
    const endY = startY + height / zoom;
    const gridSpacing = 20;

    ctx.strokeStyle =
      theme === 'dark'
        ? 'rgba(148, 163, 184, 0.12)'
        : 'rgba(203, 213, 225, 0.45)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (
      let x = Math.floor(startX / gridSpacing) * gridSpacing;
      x < endX;
      x += gridSpacing
    ) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (
      let y = Math.floor(startY / gridSpacing) * gridSpacing;
      y < endY;
      y += gridSpacing
    ) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  // 2. Ghost Render of Lower Level (F4-09)
  if (showGhost) {
    ctx.save();
    ctx.globalAlpha = 0.15;

    const lowerLevel = currentLevel - 1;
    const lowerWalls = walls.filter((w) => w.lvl === lowerLevel);

    lowerWalls.forEach((w) => {
      const poly = getWallPolygon(w, lowerWalls, SCALE, baseWW);
      if (poly) {
        ctx.beginPath();
        ctx.moveTo(poly.p1L.x, poly.p1L.y);
        ctx.lineTo(poly.p2L.x, poly.p2L.y);
        ctx.lineTo(poly.p2R.x, poly.p2R.y);
        ctx.lineTo(poly.p1R.x, poly.p1R.y);
        ctx.closePath();
        ctx.fillStyle = theme === 'dark' ? '#94a3b8' : '#000000';
        ctx.fill();
      }
    });

    const lowerArch = boxes.filter(
      (b) =>
        b.lvl === lowerLevel && ['door', 'window', 'stairs'].includes(b.type)
    );

    lowerArch.forEach((b) => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate((b.rot * Math.PI) / 180);
      if (b.mirrorX) ctx.scale(-1, 1);
      if (b.mirrorY) ctx.scale(1, -1);
      ctx.strokeStyle = theme === 'dark' ? '#94a3b8' : '#000000';
      ctx.lineWidth = 2;

      if (b.type === 'window') {
        ctx.strokeRect(-b.dim.w / 2, -4, b.dim.w, 8);
      } else if (b.type === 'door') {
        const w = b.dim.w;
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(-w / 2, w);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w / 2, w);
        ctx.arc(-w / 2, 0, w, Math.PI / 2, 0, true);
        ctx.stroke();
      } else if (b.type === 'stairs') {
        ctx.strokeRect(-b.dim.w / 2, -b.dim.h / 2, b.dim.w, b.dim.h);
      }
      ctx.restore();
    });

    ctx.restore();
  }

  const civilAlpha = phase === 2 ? 0.85 : 1.0;

  // 3. Render Current Level Walls (with Miter Join & Cotas)
  const currentLevelWalls = walls.filter((w) => w.lvl === currentLevel);
  if (showWalls) {
    ctx.fillStyle = theme === 'dark' ? '#334155' : '#475569';

    currentLevelWalls.forEach((w) => {
      const poly = getWallPolygon(w, currentLevelWalls, SCALE, baseWW);
      if (poly) {
        ctx.beginPath();
        ctx.moveTo(poly.p1L.x, poly.p1L.y);
        ctx.lineTo(poly.p2L.x, poly.p2L.y);
        ctx.lineTo(poly.p2R.x, poly.p2R.y);
        ctx.lineTo(poly.p1R.x, poly.p1R.y);
        ctx.closePath();
        ctx.fill();

        // Cotas (Dimensions) in Phase 1
        if (showDimsEffective && phase === 1) {
          const a = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
          let da = a;
          if (da > Math.PI / 2 || da < -Math.PI / 2) da += Math.PI;
          const n = { x: -Math.sin(a), y: Math.cos(a) };

          const dInt =
            Math.hypot(poly.p2L.x - poly.p1L.x, poly.p2L.y - poly.p1L.y) / SCALE;
          const dExt =
            Math.hypot(poly.p2R.x - poly.p1R.x, poly.p2R.y - poly.p1R.y) / SCALE;

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
      if (selectedType === 'wall' && selectedId === w.id && !isExport) {
        ctx.strokeStyle = w.locked ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          Math.min(w.x1, w.x2) - 6,
          Math.min(w.y1, w.y2) - 6,
          Math.abs(w.x1 - w.x2) + 12,
          Math.abs(w.y1 - w.y2) + 12
        );

        if (!w.locked) {
          // Node 1 handle
          ctx.fillStyle = w.n1F ? '#ef4444' : '#fef08a';
          ctx.beginPath();
          ctx.arc(w.x1, w.y1, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Node 2 handle
          ctx.fillStyle = w.n2F ? '#ef4444' : '#fef08a';
          ctx.beginPath();
          ctx.arc(w.x2, w.y2, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('N1', w.x1, w.y1 - 8);
          ctx.fillText('N2', w.x2, w.y2 - 8);
        }
      }
    });
  }

  // 4. Drawing Temp Wall Preview
  if (drawTmp && tool === 'wall' && !isExport) {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = baseWW * SCALE;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(drawTmp.x1, drawTmp.y1);
    ctx.lineTo(drawTmp.x2, drawTmp.y2);
    ctx.stroke();
  }

  // 5. Render Architectural Elements (Doors, Windows, Stairs)
  if (showOpenings) {
    ctx.globalAlpha = civilAlpha;
    const currentArchBoxes = boxes.filter(
      (b) =>
        b.lvl === currentLevel && ['door', 'window', 'stairs'].includes(b.type)
    );

    currentArchBoxes.forEach((b) => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate((b.rot * Math.PI) / 180);
      if (b.mirrorX) ctx.scale(-1, 1);
      if (b.mirrorY) ctx.scale(1, -1);

      const cWW = baseWW * SCALE;
      ctx.fillStyle = theme === 'dark' ? '#080b12' : '#f8fafc';
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

      if (selectedType === 'box' && selectedId === b.id && !isExport && phase === 1) {
        ctx.strokeStyle = b.locked ? '#ef4444' : '#38bdf8';
        ctx.strokeRect(
          -b.dim.w / 2 - 4,
          -b.dim.h / 2 - 4,
          b.dim.w + 8,
          b.dim.h + 8
        );

        if (!b.locked) {
          ctx.beginPath();
          ctx.arc(0, -20, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#10b981';
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();
    });
    ctx.globalAlpha = 1.0;
  }

  // 6. Selected Box Dimensions to Walls (Cotas automáticas de ubicación)
  if (selectedType === 'box' && selectedId && phase === 1 && !isExport) {
    const selBox = boxes.find((b) => b.id === selectedId);
    if (selBox && selBox.lvl === currentLevel) {
      if (selBox.type !== 'box_oct') {
        const hw = getClosestWall(selBox, walls, currentLevel);
        if (hw && hw.dist < 25 * SCALE) {
          ctx.strokeStyle = '#f59e0b';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1;

          // Line to closest wall point
          ctx.beginPath();
          ctx.moveTo(selBox.x, selBox.y);
          ctx.lineTo(hw.px, hw.py);
          ctx.stroke();

          const d1 = Math.hypot(selBox.x - hw.px, selBox.y - hw.py) / SCALE;
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            d1.toFixed(2) + 'm',
            (selBox.x + hw.px) / 2,
            (selBox.y + hw.py) / 2
          );

          // Lines along wall to vertices
          ctx.beginPath();
          ctx.moveTo(hw.px, hw.py);
          ctx.lineTo(hw.w.x1, hw.w.y1);
          ctx.stroke();
          const d2 = Math.hypot(hw.px - hw.w.x1, hw.py - hw.w.y1) / SCALE;
          ctx.fillText(
            d2.toFixed(2) + 'm',
            (hw.px + hw.w.x1) / 2,
            (hw.py + hw.w.y1) / 2
          );

          ctx.beginPath();
          ctx.moveTo(hw.px, hw.py);
          ctx.lineTo(hw.w.x2, hw.w.y2);
          ctx.stroke();
          const d3 = Math.hypot(hw.px - hw.w.x2, hw.py - hw.w.y2) / SCALE;
          ctx.fillText(
            d3.toFixed(2) + 'm',
            (hw.px + hw.w.x2) / 2,
            (hw.py + hw.w.y2) / 2
          );

          ctx.setLineDash([]);
        }
      }
    }
  }

  // 7. Render Conduits / Tubes
  const boxMap = new Map<string, Box>(boxes.map((b) => [b.id, b]));
  const currentTubes = tubes.filter((t) => t.lvl === currentLevel);

  if (showTubes) {
    currentTubes.forEach((t) => {
      const s = boxMap.get(t.startId);
      const e = boxMap.get(t.endId);
      if (!s || !e) return;

      let strokeColor = phase === 2 ? '#6366f1' : '#94a3b8';
      let lineWidth = phase === 2 ? 3 : 2;
      let routeColors: string[] = [];

      if (phase === 2) {
        const activeRoutes = routes.filter((r) => r.tubes.includes(t.id));
        if (activeRoutes.length > 0) {
          strokeColor = '#4f46e5';
          routeColors = activeRoutes
            .map((r) => r.cables[0]?.color || '#000000')
            .filter(Boolean);
        }
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;

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
          const dist = Math.hypot(
            pts[i - 1].x - pts[i].x,
            pts[i - 1].y - pts[i].y
          );
          const mult = t.place === 'suelo' ? 0.15 : -0.15;
          ctx.quadraticCurveTo(mx, my + dist * mult, pts[i].x, pts[i].y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight selected tube
      if (selectedType === 'tube' && selectedId === t.id && !isExport) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Phase 2 Circuit Indicator Dots on Tube
      if (routeColors.length > 0 && pts.length > 1) {
        const mx = (pts[0].x + pts[1].x) / 2;
        const my = (pts[0].y + pts[1].y) / 2;
        routeColors.forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(
            mx + i * 8 - (routeColors.length * 4) / 2,
            my,
            3.5,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }
    });

    // 8. Active Tube Drawing Preview
    if (drawTmp && tool === 'tube' && !isExport) {
      const s = boxMap.get(drawTmp.sId);
      if (s) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        (drawTmp.pts || []).forEach((p: Point) => ctx.lineTo(p.x, p.y));
        if (drawTmp.cx !== undefined && drawTmp.cy !== undefined) {
          ctx.lineTo(drawTmp.cx, drawTmp.cy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 9. Active Wire Route Highlighting
    if (tool === 'wire' && wireRoute.length > 0 && !isExport) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      wireRoute.forEach((tid) => {
        const t = tubes.find((tube) => tube.id === tid);
        if (t) {
          const s = boxMap.get(t.startId);
          const e = boxMap.get(t.endId);
          if (s && e) {
            const pts = [{ x: s.x, y: s.y }, ...(t.pts || []), { x: e.x, y: e.y }];
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();
          }
        }
      });
    }
  }

  // 10. Render Electrical Boxes
  if (showBoxes) {
    const elecBoxes = boxes.filter(
      (b) =>
        b.lvl === currentLevel && !['door', 'window', 'stairs'].includes(b.type)
    );

    elecBoxes.forEach((b) => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate((b.rot * Math.PI) / 180);

      const isSelected = selectedType === 'box' && selectedId === b.id && !isExport;
      const isWireStart = wireStartId === b.id && !isExport;

      if (isSelected || isWireStart) {
        ctx.shadowColor = b.locked ? '#ef4444' : '#818cf8';
        ctx.shadowBlur = 10;
      }

      if (phase === 2 && b.device) {
        // Draw electrical symbol
        let yOff = 0;
        if (b.type !== 'box_oct') {
          const cWW = baseWW * SCALE;
          yOff = cWW / 2;
        }
        ctx.translate(0, yOff);

        drawSymbol(ctx, b.device, b.rot, 1, b.type !== 'box_oct');

        if (showLabels && b.label) {
          ctx.save();
          ctx.rotate((-b.rot * Math.PI) / 180);
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = theme === 'dark' ? '#080b12' : '#ffffff';
          ctx.strokeText(b.label, 0, 20);
          ctx.fillStyle = theme === 'dark' ? '#f8fafc' : '#0f172a';
          ctx.fillText(b.label, 0, 20);
          ctx.restore();
        }
      } else {
        // Draw architectural box footprint
        ctx.strokeStyle = isSelected
          ? '#38bdf8'
          : phase === 1
            ? theme === 'dark'
              ? '#e2e8f0'
              : '#1e293b'
            : 'rgba(100, 116, 139, 0.7)';
        ctx.fillStyle = isSelected
          ? 'rgba(56, 189, 248, 0.2)'
          : phase === 1
            ? theme === 'dark'
              ? '#1e293b'
              : '#ffffff'
            : 'rgba(241, 245, 249, 0.6)';
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

      if (isSelected && phase === 1 && b.type !== 'box_oct' && !b.locked) {
        ctx.beginPath();
        ctx.arc(0, -20, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  ctx.restore();

  // 11. Dynamic Rulers (F4-08)
  if (showRulers && !isExport) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const rulerBg =
      theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const rulerBorder =
      theme === 'dark' ? '#334155' : '#cbd5e1';
    const rulerText =
      theme === 'dark' ? '#94a3b8' : '#475569';

    // Top ruler bar
    ctx.fillStyle = rulerBg;
    ctx.fillRect(0, 0, width, 22);
    ctx.fillRect(0, 0, 22, height);

    ctx.strokeStyle = rulerBorder;
    ctx.lineWidth = 1;

    // Border lines
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(width, 22);
    ctx.moveTo(22, 0);
    ctx.lineTo(22, height);
    ctx.stroke();

    ctx.fillStyle = rulerText;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const stX = -camera.x / zoom;
    const enX = stX + width / zoom;
    const step = SCALE; // 1 meter = 40px

    for (let x = Math.ceil(stX / step) * step; x < enX; x += step) {
      const sx = x * zoom + camera.x;
      if (sx >= 22 && sx <= width) {
        ctx.beginPath();
        ctx.moveTo(sx, 14);
        ctx.lineTo(sx, 22);
        ctx.stroke();
        ctx.fillText(`${Math.round(x / SCALE)}m`, sx, 2);
      }
    }

    // Left ruler ticks
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const stY = -camera.y / zoom;
    const enY = stY + height / zoom;

    for (let y = Math.ceil(stY / step) * step; y < enY; y += step) {
      const sy = y * zoom + camera.y;
      if (sy >= 22 && sy <= height) {
        ctx.beginPath();
        ctx.moveTo(14, sy);
        ctx.lineTo(22, sy);
        ctx.stroke();
        ctx.fillText(`${Math.round(y / SCALE)}m`, 2, sy);
      }
    }

    ctx.restore();
  }
}
