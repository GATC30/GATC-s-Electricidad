import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  Wall,
  Box,
  Tube,
  Route,
  CustomMaterial,
  ProjectConfig,
  ProjectState,
  Point
} from '@/engine/types';
import { DEFAULT_WALL_WIDTH, DEFAULT_WALL_HEIGHT } from '@/engine/constants';

export interface ProjectSnapshot {
  walls: Wall[];
  boxes: Box[];
  tubes: Tube[];
  routes: Route[];
  levels: number[];
  config: ProjectConfig;
}

export interface ProjectStoreState {
  projectId: string;
  projectName: string;
  levels: number[];
  walls: Wall[];
  boxes: Box[];
  tubes: Tube[];
  routes: Route[];
  customMats: CustomMaterial[];
  overrides: Record<string, number>;
  prices: Record<string, number>;
  config: ProjectConfig;
  isSaved: boolean;

  // Actions
  initProject: (
    id: string,
    name?: string,
    initialData?: Partial<ProjectState>
  ) => void;
  setProjectName: (name: string) => void;
  setConfig: (config: Partial<ProjectConfig>) => void;

  // Element CRUD
  addWall: (wall: Wall) => void;
  updateWall: (wall: Wall) => void;
  deleteWall: (id: string) => void;

  addBox: (box: Box) => void;
  updateBox: (box: Box) => void;
  deleteBox: (id: string) => void;

  addTube: (tube: Tube) => void;
  updateTube: (tube: Tube) => void;
  deleteTube: (id: string) => void;

  addRoute: (route: Route) => void;
  updateRoute: (route: Route) => void;
  deleteRoute: (id: string) => void;
  removeTubeFromRoute: (routeId: string, tubeId: string) => void;

  moveElement: (type: 'wall' | 'box', id: string, delta: Point) => void;
  deleteElement: (
    type: 'wall' | 'box' | 'tube',
    id: string,
    phase?: number
  ) => void;

  // Levels Management (F4-07)
  addLevel: () => number;
  deleteLevel: (levelId: number) => {
    success: boolean;
    message?: string;
    nextLevel?: number;
  };

  // Materials & Pricing
  setCustomMats: (mats: CustomMaterial[]) => void;
  setOverrides: (overrides: Record<string, number>) => void;
  setPrices: (prices: Record<string, number>) => void;
  setIsSaved: (saved: boolean) => void;

  // Snapshot for history / save
  getSnapshot: () => ProjectSnapshot;
  loadSnapshot: (snapshot: Partial<ProjectSnapshot>) => void;
  resetProject: () => void;
}

const initialConfig: ProjectConfig = {
  wW: DEFAULT_WALL_WIDTH,
  wH: DEFAULT_WALL_HEIGHT
};

export const useProjectStore = create<ProjectStoreState>()(
  immer((set, get) => ({
    projectId: 'default',
    projectName: 'Proyecto CAD',
    levels: [1],
    walls: [],
    boxes: [],
    tubes: [],
    routes: [],
    customMats: [],
    overrides: {},
    prices: {},
    config: initialConfig,
    isSaved: true,

    initProject: (id, name = 'Proyecto CAD', initialData = {}) =>
      set((state) => {
        state.projectId = id;
        state.projectName = name;
        state.levels = initialData.levels && initialData.levels.length > 0 ? initialData.levels : [1];
        state.walls = initialData.walls || [];
        state.boxes = initialData.boxes || [];
        state.tubes = initialData.tubes || [];
        state.routes = initialData.routes || [];
        state.customMats = initialData.customMats || [];
        state.overrides = initialData.overrides || {};
        state.prices = initialData.prices || {};
        state.config = initialData.pConf || initialConfig;
        state.isSaved = true;
      }),

    setProjectName: (name) =>
      set((state) => {
        state.projectName = name;
        state.isSaved = false;
      }),

    setConfig: (configUpdate) =>
      set((state) => {
        state.config = { ...state.config, ...configUpdate };
        state.isSaved = false;
      }),

    addWall: (wall) =>
      set((state) => {
        state.walls.push(wall);
        state.isSaved = false;
      }),

    updateWall: (wall) =>
      set((state) => {
        const index = state.walls.findIndex((w) => w.id === wall.id);
        if (index !== -1) {
          state.walls[index] = wall;
          state.isSaved = false;
        }
      }),

    deleteWall: (id) =>
      set((state) => {
        state.walls = state.walls.filter((w) => w.id !== id);
        state.isSaved = false;
      }),

    addBox: (box) =>
      set((state) => {
        state.boxes.push(box);
        state.isSaved = false;
      }),

    updateBox: (box) =>
      set((state) => {
        const index = state.boxes.findIndex((b) => b.id === box.id);
        if (index !== -1) {
          state.boxes[index] = box;
          state.isSaved = false;
        }
      }),

    deleteBox: (id) =>
      set((state) => {
        state.boxes = state.boxes.filter((b) => b.id !== id);
        // Clean up connected tubes and routes referencing them
        state.tubes = state.tubes.filter((t) => t.startId !== id && t.endId !== id);
        const validTubeIds = new Set(state.tubes.map((t) => t.id));
        state.routes = state.routes
          .map((r) => ({
            ...r,
            tubes: r.tubes.filter((tid) => validTubeIds.has(tid))
          }))
          .filter((r) => r.tubes.length > 0);
        state.isSaved = false;
      }),

    addTube: (tube) =>
      set((state) => {
        state.tubes.push(tube);
        state.isSaved = false;
      }),

    updateTube: (tube) =>
      set((state) => {
        const index = state.tubes.findIndex((t) => t.id === tube.id);
        if (index !== -1) {
          state.tubes[index] = tube;
          state.isSaved = false;
        }
      }),

    deleteTube: (id) =>
      set((state) => {
        state.tubes = state.tubes.filter((t) => t.id !== id);
        state.routes = state.routes
          .map((r) => ({
            ...r,
            tubes: r.tubes.filter((tid) => tid !== id)
          }))
          .filter((r) => r.tubes.length > 0);
        state.isSaved = false;
      }),

    addRoute: (route) =>
      set((state) => {
        const existingIndex = state.routes.findIndex((r) => r.id === route.id);
        if (existingIndex !== -1) {
          state.routes[existingIndex] = route;
        } else {
          state.routes.push(route);
        }
        state.isSaved = false;
      }),

    updateRoute: (route) =>
      set((state) => {
        const index = state.routes.findIndex((r) => r.id === route.id);
        if (index !== -1) {
          state.routes[index] = route;
          state.isSaved = false;
        }
      }),

    deleteRoute: (id) =>
      set((state) => {
        state.routes = state.routes.filter((r) => r.id !== id);
        state.isSaved = false;
      }),

    removeTubeFromRoute: (routeId, tubeId) =>
      set((state) => {
        const route = state.routes.find((r) => r.id === routeId);
        if (route) {
          route.tubes = route.tubes.filter((tid) => tid !== tubeId);
          state.routes = state.routes.filter((r) => r.tubes.length > 0);
          state.isSaved = false;
        }
      }),

    moveElement: (type, id, delta) =>
      set((state) => {
        if (type === 'box') {
          const b = state.boxes.find((box) => box.id === id);
          if (b && !b.locked) {
            b.x += delta.x;
            b.y += delta.y;
            state.isSaved = false;
          }
        } else if (type === 'wall') {
          const w = state.walls.find((wall) => wall.id === id);
          if (w && !w.locked) {
            w.x1 += delta.x;
            w.y1 += delta.y;
            w.x2 += delta.x;
            w.y2 += delta.y;
            state.isSaved = false;
          }
        }
      }),

    deleteElement: (type, id, phase = 1) =>
      set((state) => {
        if (type === 'wall' && phase === 1) {
          state.walls = state.walls.filter((w) => w.id !== id);
          state.isSaved = false;
        } else if (type === 'tube' && phase === 1) {
          state.tubes = state.tubes.filter((t) => t.id !== id);
          state.routes = state.routes
            .map((r) => ({
              ...r,
              tubes: r.tubes.filter((tid) => tid !== id)
            }))
            .filter((r) => r.tubes.length > 0);
          state.isSaved = false;
        } else if (type === 'box') {
          const box = state.boxes.find((b) => b.id === id);
          if (!box) return;

          if (phase === 2 && box.device) {
            // In phase 2, deleting box clears its assigned device
            box.device = null;
            state.isSaved = false;
          } else if (phase === 1) {
            state.boxes = state.boxes.filter((b) => b.id !== id);
            state.tubes = state.tubes.filter((t) => t.startId !== id && t.endId !== id);
            const validTubeIds = new Set(state.tubes.map((t) => t.id));
            state.routes = state.routes
              .map((r) => ({
                ...r,
                tubes: r.tubes.filter((tid) => validTubeIds.has(tid))
              }))
              .filter((r) => r.tubes.length > 0);
            state.isSaved = false;
          }
        }
      }),

    // F4-07: Gestión de niveles completa
    addLevel: () => {
      let newLevel = 1;
      set((state) => {
        const maxLevel = state.levels.length > 0 ? Math.max(...state.levels) : 0;
        newLevel = maxLevel + 1;
        state.levels.push(newLevel);
        state.levels.sort((a, b) => a - b);
        state.isSaved = false;
      });
      return newLevel;
    },

    deleteLevel: (levelId) => {
      const currentLevels = get().levels;
      if (currentLevels.length <= 1) {
        return {
          success: false,
          message: 'No puedes borrar el único nivel'
        };
      }

      let nextLevel = currentLevels[0];
      set((state) => {
        state.levels = state.levels.filter((l) => l !== levelId);
        state.walls = state.walls.filter((w) => w.lvl !== levelId);
        state.boxes = state.boxes.filter((b) => b.lvl !== levelId);
        state.tubes = state.tubes.filter((t) => t.lvl !== levelId);

        // Clean up routes that no longer have valid tubes
        const validTubeIds = new Set(state.tubes.map((t) => t.id));
        state.routes = state.routes
          .map((r) => ({
            ...r,
            tubes: r.tubes.filter((tid) => validTubeIds.has(tid))
          }))
          .filter((r) => r.tubes.length > 0);

        nextLevel = state.levels[0] || 1;
        state.isSaved = false;
      });

      return {
        success: true,
        nextLevel
      };
    },

    setCustomMats: (customMats) =>
      set((state) => {
        state.customMats = customMats;
        state.isSaved = false;
      }),

    setOverrides: (overrides) =>
      set((state) => {
        state.overrides = overrides;
        state.isSaved = false;
      }),

    setPrices: (prices) =>
      set((state) => {
        state.prices = prices;
        state.isSaved = false;
      }),

    setIsSaved: (saved) =>
      set((state) => {
        state.isSaved = saved;
      }),

    getSnapshot: () => {
      const state = get();
      return {
        walls: JSON.parse(JSON.stringify(state.walls)),
        boxes: JSON.parse(JSON.stringify(state.boxes)),
        tubes: JSON.parse(JSON.stringify(state.tubes)),
        routes: JSON.parse(JSON.stringify(state.routes)),
        levels: [...state.levels],
        config: { ...state.config }
      };
    },

    loadSnapshot: (snapshot) =>
      set((state) => {
        if (snapshot.walls) state.walls = snapshot.walls;
        if (snapshot.boxes) state.boxes = snapshot.boxes;
        if (snapshot.tubes) state.tubes = snapshot.tubes;
        if (snapshot.routes) state.routes = snapshot.routes;
        if (snapshot.levels) state.levels = snapshot.levels;
        if (snapshot.config) state.config = snapshot.config;
        state.isSaved = false;
      }),

    resetProject: () =>
      set((state) => {
        state.projectId = 'default';
        state.projectName = 'Proyecto CAD';
        state.levels = [1];
        state.walls = [];
        state.boxes = [];
        state.tubes = [];
        state.routes = [];
        state.customMats = [];
        state.overrides = {};
        state.prices = {};
        state.config = initialConfig;
        state.isSaved = true;
      })
  }))
);
