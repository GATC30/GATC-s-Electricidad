import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ToolType, Phase, Point } from '@/engine/types';

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
  resetEditor: () => void;
}

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
  cursorCoords: { x: 0, y: 0 }
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

    resetEditor: () =>
      set((state) => {
        Object.assign(state, initialEditorState);
      })
  }))
);
