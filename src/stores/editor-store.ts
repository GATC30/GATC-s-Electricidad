import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ToolType, Phase, Point } from '@/engine/types';

export interface EditorLayers {
  walls: boolean;
  openings: boolean; // doors, windows, stairs
  boxes: boolean;
  tubes: boolean;
  dimensions: boolean; // cotas
  labels: boolean;
  ghost: boolean;
}

export interface ClipboardItem {
  type: 'wall' | 'box';
  data: any;
}

export interface EditorState {
  tool: ToolType;
  phase: Phase;
  zoom: number;
  camera: { x: number; y: number };
  currentLevel: number;
  selectedId: string | null;
  selectedType: 'wall' | 'box' | 'tube' | null;
  isDragging: boolean;
  dragNode: string | null;
  dragOffset: Point;
  drawTmp: any | null;
  wireRoute: string[];
  wireStartId: string | null;
  showDims: boolean;
  showRulers: boolean;
  is3D: boolean;
  cursorCoords: Point;

  // UX Enhancements (Phase 8)
  theme: 'dark' | 'light';
  layers: EditorLayers;
  clipboard: ClipboardItem | null;
  isSpacePressed: boolean;
  isCommandPaletteOpen: boolean;
  isOnboardingOpen: boolean;

  // Actions
  setTool: (tool: ToolType) => void;
  setPhase: (phase: Phase) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setCamera: (
    camera: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })
  ) => void;
  setCurrentLevel: (level: number) => void;
  setSelected: (type: 'wall' | 'box' | 'tube' | null, id: string | null) => void;
  clearSelection: () => void;
  setIsDragging: (isDragging: boolean, dragNode?: string | null, offset?: Point) => void;
  setDrawTmp: (drawTmp: any) => void;
  setWireRoute: (route: string[]) => void;
  addWireRouteTube: (tubeId: string) => void;
  setWireStartId: (id: string | null) => void;
  toggleDims: () => void;
  toggleRulers: () => void;
  toggle3D: () => void;
  setIs3D: (is3D: boolean) => void;
  setCursorCoords: (coords: Point) => void;

  // UX Actions
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleLayer: (layer: keyof EditorLayers) => void;
  setLayer: (layer: keyof EditorLayers, visible: boolean) => void;
  setLayers: (layers: Partial<EditorLayers>) => void;
  setClipboard: (item: ClipboardItem | null) => void;
  setIsSpacePressed: (pressed: boolean) => void;
  setIsCommandPaletteOpen: (open: boolean) => void;
  setIsOnboardingOpen: (open: boolean) => void;
  zoomToFit: (bounds: { minX: number; maxX: number; minY: number; maxY: number }, viewportWidth: number, viewportHeight: number) => void;

  resetEditor: () => void;
}

const defaultLayers: EditorLayers = {
  walls: true,
  openings: true,
  boxes: true,
  tubes: true,
  dimensions: true,
  labels: true,
  ghost: true
};

const initialEditorState = {
  tool: 'select' as ToolType,
  phase: 1 as Phase,
  zoom: 1,
  camera: { x: 0, y: 0 },
  currentLevel: 1,
  selectedId: null,
  selectedType: null,
  isDragging: false,
  dragNode: null,
  dragOffset: { x: 0, y: 0 },
  drawTmp: null,
  wireRoute: [],
  wireStartId: null,
  showDims: true,
  showRulers: false,
  is3D: false,
  cursorCoords: { x: 0, y: 0 },

  // Phase 8 UX
  theme: 'dark' as 'dark' | 'light',
  layers: defaultLayers,
  clipboard: null,
  isSpacePressed: false,
  isCommandPaletteOpen: false,
  isOnboardingOpen: false
};

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    ...initialEditorState,

    setTool: (tool) =>
      set((state) => {
        state.tool = tool;
        state.drawTmp = null;
        state.wireRoute = [];
        state.wireStartId = null;
      }),

    setPhase: (phase) =>
      set((state) => {
        state.phase = phase;
        state.tool = 'select';
        state.selectedId = null;
        state.selectedType = null;
        state.drawTmp = null;
        state.wireRoute = [];
        state.wireStartId = null;
      }),

    setZoom: (zoomOrFn) =>
      set((state) => {
        const next = typeof zoomOrFn === 'function' ? zoomOrFn(state.zoom) : zoomOrFn;
        state.zoom = Math.max(0.1, Math.min(5, next));
      }),

    setCamera: (camOrFn) =>
      set((state) => {
        const next = typeof camOrFn === 'function' ? camOrFn(state.camera) : camOrFn;
        state.camera = next;
      }),

    setCurrentLevel: (level) =>
      set((state) => {
        state.currentLevel = level;
        state.selectedId = null;
        state.selectedType = null;
        state.drawTmp = null;
      }),

    setSelected: (type, id) =>
      set((state) => {
        state.selectedType = type;
        state.selectedId = id;
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedType = null;
        state.selectedId = null;
        state.dragNode = null;
      }),

    setIsDragging: (isDragging, dragNode = null, offset = { x: 0, y: 0 }) =>
      set((state) => {
        state.isDragging = isDragging;
        state.dragNode = dragNode;
        state.dragOffset = offset;
      }),

    setDrawTmp: (drawTmp) =>
      set((state) => {
        state.drawTmp = drawTmp;
      }),

    setWireRoute: (route) =>
      set((state) => {
        state.wireRoute = route;
      }),

    addWireRouteTube: (tubeId) =>
      set((state) => {
        if (!state.wireRoute.includes(tubeId)) {
          state.wireRoute.push(tubeId);
        }
      }),

    setWireStartId: (id) =>
      set((state) => {
        state.wireStartId = id;
      }),

    toggleDims: () =>
      set((state) => {
        state.showDims = !state.showDims;
        state.layers.dimensions = state.showDims;
      }),

    toggleRulers: () =>
      set((state) => {
        state.showRulers = !state.showRulers;
      }),

    toggle3D: () =>
      set((state) => {
        state.is3D = !state.is3D;
      }),

    setIs3D: (is3D) =>
      set((state) => {
        state.is3D = is3D;
      }),

    setCursorCoords: (coords) =>
      set((state) => {
        state.cursorCoords = coords;
      }),

    toggleTheme: () =>
      set((state) => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
        state.theme = nextTheme;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('gatc_theme', nextTheme);
          } catch {}
        }
      }),

    setTheme: (theme) =>
      set((state) => {
        state.theme = theme;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('gatc_theme', theme);
          } catch {}
        }
      }),

    toggleLayer: (layer) =>
      set((state) => {
        state.layers[layer] = !state.layers[layer];
        if (layer === 'dimensions') {
          state.showDims = state.layers[layer];
        }
      }),

    setLayer: (layer, visible) =>
      set((state) => {
        state.layers[layer] = visible;
        if (layer === 'dimensions') {
          state.showDims = visible;
        }
      }),

    setLayers: (newLayers) =>
      set((state) => {
        state.layers = { ...state.layers, ...newLayers };
        if (newLayers.dimensions !== undefined) {
          state.showDims = newLayers.dimensions;
        }
      }),

    setClipboard: (item) =>
      set((state) => {
        state.clipboard = item;
      }),

    setIsSpacePressed: (pressed) =>
      set((state) => {
        state.isSpacePressed = pressed;
      }),

    setIsCommandPaletteOpen: (open) =>
      set((state) => {
        state.isCommandPaletteOpen = open;
      }),

    setIsOnboardingOpen: (open) =>
      set((state) => {
        state.isOnboardingOpen = open;
      }),

    zoomToFit: (bounds, viewportWidth, viewportHeight) =>
      set((state) => {
        const { minX, maxX, minY, maxY } = bounds;
        const boxWidth = maxX - minX;
        const boxHeight = maxY - minY;

        if (boxWidth <= 0 || boxHeight <= 0 || !isFinite(boxWidth) || !isFinite(boxHeight)) {
          state.zoom = 1;
          state.camera = { x: Math.round(viewportWidth / 2), y: Math.round(viewportHeight / 2) };
          return;
        }

        const padding = 80; // px margin around content
        const availWidth = Math.max(100, viewportWidth - padding * 2);
        const availHeight = Math.max(100, viewportHeight - padding * 2);

        const zoomX = availWidth / boxWidth;
        const zoomY = availHeight / boxHeight;
        const targetZoom = Math.max(0.15, Math.min(3.0, Math.min(zoomX, zoomY)));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        state.zoom = targetZoom;
        state.camera = {
          x: Math.round(viewportWidth / 2 - centerX * targetZoom),
          y: Math.round(viewportHeight / 2 - centerY * targetZoom)
        };
      }),

    resetEditor: () =>
      set((state) => {
        Object.assign(state, initialEditorState);
      })
  }))
);
