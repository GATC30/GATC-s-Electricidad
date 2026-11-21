/**
 * GATC Engine - Unified Input Handler & Tool State Machine (input-handler.ts)
 * Handles mouse, wheel, touch gestures (pinch-to-zoom, 2-finger pan, tap vs drag)
 * and tool actions.
 */

import {
  Wall,
  Box,
  Tube,
  ToolType,
  Phase,
  Point
} from './types';
import { SCALE, BOX_TYPE_DIMENSIONS } from './constants';
import {
  getWorldCoords,
  snapToWall,
  getClosestWall,
  getRoomCenter,
  getTubeAtCurve
} from './geometry';
import { generateId } from '@/utils/math';

export interface InputContextState {
  walls: Wall[];
  boxes: Box[];
  tubes: Tube[];
  currentLevel: number;
  phase: Phase;
  tool: ToolType;
  camera: { x: number; y: number };
  zoom: number;
  selectedId: string | null;
  selectedType: 'wall' | 'box' | 'tube' | null;
  drawTmp: any | null;
  wireRoute: string[];
  wireStartId: string | null;
}

export interface InputCallbacks {
  setCamera: (cam: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setSelected: (type: 'wall' | 'box' | 'tube' | null, id: string | null) => void;
  setCursorCoords: (coords: Point) => void;
  setDrawTmp: (drawTmp: any) => void;
  setWireRoute: (route: string[]) => void;
  addWireRouteTube: (tubeId: string) => void;
  setWireStartId: (id: string | null) => void;
  onAddWall?: (wall: Wall) => void;
  onUpdateWall?: (wall: Wall) => void;
  onAddBox?: (box: Box) => void;
  onUpdateBox?: (box: Box) => void;
  onAddTube?: (tube: Tube) => void;
  onOpenWireModal?: (routeId: string | null) => void;
  onSaveState?: () => void;
  onToast?: (message: string) => void;
}

export class InputHandler {
  private isPan = false;
  private panStart = { x: 0, y: 0 };
  private isDragging = false;
  private dragNode: string | null = null;
  private dragOffset: Point = { x: 0, y: 0 };

  // Touch gesture state (BUG-11 fix: tap vs drag distinction)
  private touchStart: {
    time: number;
    clientX: number;
    clientY: number;
    maxDist: number;
  } | null = null;
  private lastPinch: { dist: number; midX: number; midY: number } | null = null;

  private minDragDist = 5; // px
  private minDragTime = 200; // ms

  /**
   * Converts viewport client coordinates to CAD World coordinates.
   */
  public getWorld(
    clientX: number,
    clientY: number,
    canvasRect: { left: number; top: number },
    camX: number,
    camY: number,
    zoom: number
  ): Point {
    return getWorldCoords(clientX, clientY, canvasRect, camX, camY, zoom);
  }

  /**
   * Pointer Down Event
   */
  public handlePointerDown(
    clientX: number,
    clientY: number,
    canvasRect: { left: number; top: number },
    state: InputContextState,
    callbacks: InputCallbacks,
    isSecondary = false
  ): void {
    if (isSecondary || state.tool === 'pan') {
      this.isPan = true;
      this.panStart = {
        x: clientX - state.camera.x,
        y: clientY - state.camera.y
      };
      return;
    }

    const wp = this.getWorld(
      clientX,
      clientY,
      canvasRect,
      state.camera.x,
      state.camera.y,
      state.zoom
    );

    // 1. Tool: Wall
    if (state.tool === 'wall') {
      const snapped = snapToWall(wp, state.walls, state.currentLevel, state.zoom);
      callbacks.setDrawTmp({
        x1: snapped.x,
        y1: snapped.y,
        x2: snapped.x,
        y2: snapped.y
      });
      return;
    }

    // 2. Tool: Architectural elements or Boxes
    if (
      ['box_oct', 'box_rect', 'box_sq', 'door', 'window', 'stairs'].includes(
        state.tool
      )
    ) {
      const defaultDims = BOX_TYPE_DIMENSIONS[state.tool] || {
        w: 16,
        h: 12,
        z: 0.4
      };
      let newBoxX = wp.x;
      let newBoxY = wp.y;
      let rot = 0;

      if (state.tool === 'box_oct') {
        const rc = getRoomCenter(wp.x, wp.y, state.currentLevel, state.walls);
        newBoxX = rc.x;
        newBoxY = rc.y;
      } else {
        const closest = getClosestWall(wp, state.walls, state.currentLevel);
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
        lvl: state.currentLevel,
        type: state.tool as any,
        x: newBoxX,
        y: newBoxY,
        z: defaultDims.z,
        zH: defaultDims.zH || null,
        dim: { w: defaultDims.w, h: defaultDims.h },
        rot,
        device: null,
        locked: false
      };

      if (callbacks.onAddBox) callbacks.onAddBox(newBox);
      callbacks.setSelected('box', newBox.id);
      if (callbacks.onSaveState) callbacks.onSaveState();
      return;
    }

    // 3. Tool: Tube (Conduit)
    if (state.tool === 'tube') {
      const hitBox = state.boxes.find(
        (b) =>
          b.lvl === state.currentLevel &&
          !['door', 'window', 'stairs'].includes(b.type) &&
          Math.hypot(b.x - wp.x, b.y - wp.y) < 20 / state.zoom
      );

      if (!state.drawTmp || !state.drawTmp.sId) {
        if (hitBox) {
          callbacks.setDrawTmp({ sId: hitBox.id, pts: [], cx: wp.x, cy: wp.y });
          if (callbacks.onToast) callbacks.onToast('Toca curva o caja destino');
        }
      } else {
        if (hitBox && hitBox.id !== state.drawTmp.sId) {
          const newTube: Tube = {
            id: generateId('tube'),
            lvl: state.currentLevel,
            startId: state.drawTmp.sId,
            endId: hitBox.id,
            pts: state.drawTmp.pts || [],
            type: 'tub_pvc_3/4',
            place: 'techo'
          };
          if (callbacks.onAddTube) callbacks.onAddTube(newTube);
          callbacks.setDrawTmp(null);
          if (callbacks.onSaveState) callbacks.onSaveState();
        } else if (!hitBox) {
          const currentPts = state.drawTmp.pts || [];
          callbacks.setDrawTmp({
            ...state.drawTmp,
            pts: [...currentPts, { x: wp.x, y: wp.y }]
          });
        }
      }
      return;
    }

    // 4. Tool: Wire Route (Phase 2)
    if (state.tool === 'wire') {
      const hitBox = state.boxes.find(
        (b) =>
          b.lvl === state.currentLevel &&
          !['door', 'window', 'stairs'].includes(b.type) &&
          Math.hypot(b.x - wp.x, b.y - wp.y) < 20 / state.zoom
      );
      const hitTube = getTubeAtCurve(
        wp,
        state.tubes,
        state.boxes,
        state.currentLevel,
        state.zoom
      );

      if (!state.wireStartId) {
        if (hitBox) {
          callbacks.setWireStartId(hitBox.id);
          callbacks.setWireRoute([]);
          if (callbacks.onToast)
            callbacks.onToast('Toca tubos para enrutar y luego la caja destino');
        }
      } else {
        if (hitBox && hitBox.id !== state.wireStartId) {
          if (state.wireRoute.length > 0) {
            if (callbacks.onOpenWireModal) callbacks.onOpenWireModal(null);
          } else {
            if (callbacks.onToast)
              callbacks.onToast('Ruta vacía. Selecciona al menos un tubo.');
          }
          callbacks.setWireStartId(null);
        } else if (hitTube) {
          callbacks.addWireRouteTube(hitTube.id);
        }
      }
      return;
    }

    // 5. Tool: Select
    if (state.tool === 'select') {
      // Check boxes
      const hitBox = state.boxes.find(
        (b) =>
          b.lvl === state.currentLevel &&
          Math.hypot(b.x - wp.x, b.y - wp.y) <
            Math.max(18, b.dim.w / 2) / state.zoom
      );
      if (hitBox) {
        callbacks.setSelected('box', hitBox.id);
        this.isDragging = true;
        this.dragNode = 'box';
        this.dragOffset = { x: hitBox.x - wp.x, y: hitBox.y - wp.y };
        return;
      }

      // Check walls
      const hitWall = getClosestWall(wp, state.walls, state.currentLevel);
      if (hitWall && hitWall.dist < 18 / state.zoom) {
        callbacks.setSelected('wall', hitWall.w.id);
        return;
      }

      // Check tubes
      const hitTube = getTubeAtCurve(
        wp,
        state.tubes,
        state.boxes,
        state.currentLevel,
        state.zoom
      );
      if (hitTube) {
        callbacks.setSelected('tube', hitTube.id);
        return;
      }

      // Deselect if clicking on empty space
      callbacks.setSelected(null, null);
    }
  }

  /**
   * Pointer Move Event
   */
  public handlePointerMove(
    clientX: number,
    clientY: number,
    canvasRect: { left: number; top: number },
    state: InputContextState,
    callbacks: InputCallbacks
  ): void {
    if (this.isPan) {
      callbacks.setCamera({
        x: clientX - this.panStart.x,
        y: clientY - this.panStart.y
      });
      return;
    }

    const wp = this.getWorld(
      clientX,
      clientY,
      canvasRect,
      state.camera.x,
      state.camera.y,
      state.zoom
    );

    callbacks.setCursorCoords({
      x: +(wp.x / SCALE).toFixed(2),
      y: +(wp.y / SCALE).toFixed(2)
    });

    // Wall preview update
    if (state.drawTmp && state.tool === 'wall') {
      const snapped = snapToWall(wp, state.walls, state.currentLevel, state.zoom);
      callbacks.setDrawTmp({
        ...state.drawTmp,
        x2: snapped.x,
        y2: snapped.y
      });
      return;
    }

    // Tube preview pointer update
    if (state.drawTmp && state.tool === 'tube') {
      callbacks.setDrawTmp({
        ...state.drawTmp,
        cx: wp.x,
        cy: wp.y
      });
      return;
    }

    // Dragging selected box
    if (
      this.isDragging &&
      this.dragNode === 'box' &&
      state.selectedType === 'box' &&
      state.selectedId
    ) {
      const currentBox = state.boxes.find((b) => b.id === state.selectedId);
      if (currentBox && !currentBox.locked) {
        const updatedBox: Box = {
          ...currentBox,
          x: wp.x + this.dragOffset.x,
          y: wp.y + this.dragOffset.y
        };
        if (callbacks.onUpdateBox) callbacks.onUpdateBox(updatedBox);
      }
    }
  }

  /**
   * Pointer Up Event
   */
  public handlePointerUp(
    state: InputContextState,
    callbacks: InputCallbacks,
    wallHeight: number = 2.8,
    wallWidth: number = 0.2
  ): void {
    if (this.isPan) {
      this.isPan = false;
      return;
    }

    if (state.drawTmp && state.tool === 'wall') {
      const len = Math.hypot(
        state.drawTmp.x2 - state.drawTmp.x1,
        state.drawTmp.y2 - state.drawTmp.y1
      );
      if (len > 15) {
        const newWall: Wall = {
          id: generateId('wall'),
          lvl: state.currentLevel,
          x1: state.drawTmp.x1,
          y1: state.drawTmp.y1,
          x2: state.drawTmp.x2,
          y2: state.drawTmp.y2,
          lengthM: +(len / SCALE).toFixed(2),
          heightM: wallHeight,
          wW: wallWidth,
          locked: false
        };
        if (callbacks.onAddWall) callbacks.onAddWall(newWall);
        callbacks.setSelected('wall', newWall.id);
        if (callbacks.onSaveState) callbacks.onSaveState();
      }
      callbacks.setDrawTmp(null);
    }

    if (this.isDragging) {
      this.isDragging = false;
      this.dragNode = null;
      if (callbacks.onSaveState) callbacks.onSaveState();
    }
  }

  /**
   * Wheel Event (Zoom towards pointer)
   */
  public handleWheel(
    e: React.WheelEvent<HTMLCanvasElement>,
    canvasRect: { left: number; top: number },
    state: InputContextState,
    callbacks: InputCallbacks
  ): void {
    e.preventDefault();
    const mx = e.clientX - canvasRect.left;
    const my = e.clientY - canvasRect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = Math.max(0.1, Math.min(5, state.zoom * zoomFactor));

    callbacks.setZoom(nextZoom);
    callbacks.setCamera({
      x: mx - (mx - state.camera.x) * (nextZoom / state.zoom),
      y: my - (my - state.camera.y) * (nextZoom / state.zoom)
    });
  }

  /**
   * Touch Start Event
   */
  public handleTouchStart(
    e: React.TouchEvent<HTMLCanvasElement>,
    canvasRect: { left: number; top: number },
    state: InputContextState,
    callbacks: InputCallbacks
  ): void {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      this.lastPinch = { dist, midX, midY };
      this.touchStart = null;
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchStart = {
        time: Date.now(),
        clientX: touch.clientX,
        clientY: touch.clientY,
        maxDist: 0
      };
      this.handlePointerDown(
        touch.clientX,
        touch.clientY,
        canvasRect,
        state,
        callbacks,
        false
      );
    }
  }

  /**
   * Touch Move Event (Pinch-to-zoom + 2 finger pan + Tap/Drag threshold)
   */
  public handleTouchMove(
    e: React.TouchEvent<HTMLCanvasElement>,
    canvasRect: { left: number; top: number },
    state: InputContextState,
    callbacks: InputCallbacks
  ): void {
    if (e.touches.length === 2 && this.lastPinch) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY
      );
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      const deltaX = midX - this.lastPinch.midX;
      const deltaY = midY - this.lastPinch.midY;

      const zoomFactor = currentDist / (this.lastPinch.dist || currentDist);
      const nextZoom = Math.max(0.1, Math.min(5, state.zoom * zoomFactor));

      const mx = midX - canvasRect.left;
      const my = midY - canvasRect.top;

      callbacks.setZoom(nextZoom);
      callbacks.setCamera({
        x: mx - (mx - (state.camera.x + deltaX)) * (nextZoom / state.zoom),
        y: my - (my - (state.camera.y + deltaY)) * (nextZoom / state.zoom)
      });

      this.lastPinch = { dist: currentDist, midX, midY };
      return;
    }

    if (e.touches.length === 1 && this.touchStart) {
      const touch = e.touches[0];
      const dist = Math.hypot(
        touch.clientX - this.touchStart.clientX,
        touch.clientY - this.touchStart.clientY
      );

      if (dist > this.touchStart.maxDist) {
        this.touchStart.maxDist = dist;
      }

      const elapsed = Date.now() - this.touchStart.time;
      if (dist >= this.minDragDist || elapsed >= this.minDragTime) {
        this.handlePointerMove(
          touch.clientX,
          touch.clientY,
          canvasRect,
          state,
          callbacks
        );
      }
    }
  }

  /**
   * Touch End Event
   */
  public handleTouchEnd(
    state: InputContextState,
    callbacks: InputCallbacks,
    canvasRect: { left: number; top: number }
  ): void {
    if (this.lastPinch) {
      this.lastPinch = null;
    }

    if (this.touchStart) {
      const elapsed = Date.now() - this.touchStart.time;
      const isTap =
        this.touchStart.maxDist < this.minDragDist && elapsed < this.minDragTime;

      if (isTap && state.tool === 'select') {
        const wp = this.getWorld(
          this.touchStart.clientX,
          this.touchStart.clientY,
          canvasRect,
          state.camera.x,
          state.camera.y,
          state.zoom
        );

        const hitBox = state.boxes.find(
          (b) =>
            b.lvl === state.currentLevel &&
            Math.hypot(b.x - wp.x, b.y - wp.y) <
              Math.max(18, b.dim.w / 2) / state.zoom
        );
        if (hitBox) {
          callbacks.setSelected('box', hitBox.id);
        } else {
          const hitWall = getClosestWall(wp, state.walls, state.currentLevel);
          if (hitWall && hitWall.dist < 18 / state.zoom) {
            callbacks.setSelected('wall', hitWall.w.id);
          } else {
            const hitTube = getTubeAtCurve(
              wp,
              state.tubes,
              state.boxes,
              state.currentLevel,
              state.zoom
            );
            if (hitTube) {
              callbacks.setSelected('tube', hitTube.id);
            } else {
              callbacks.setSelected(null, null);
            }
          }
        }
      }

      this.handlePointerUp(state, callbacks);
      this.touchStart = null;
    }
  }
}
