/**
 * GATC (Gestor de Análisis para Tendidos y Costos)
 * CAD Engine - Pure Domain Types
 */

export interface Point {
  x: number;
  y: number;
}

export interface Dimensions {
  w: number;
  h: number;
}

export type Phase = 1 | 2 | 3 | 4;

export type ToolType =
  | 'select'
  | 'pan'
  | 'wall'
  | 'door'
  | 'window'
  | 'stairs'
  | 'box_oct'
  | 'box_rect'
  | 'box_sq'
  | 'tube'
  | 'wire'
  | 'move_env';

export type BoxType =
  | 'box_oct'
  | 'box_rect'
  | 'box_sq'
  | 'door'
  | 'window'
  | 'stairs';

export type DeviceKey =
  | 'light'
  | 'wall_lamp'
  | 'switch_1'
  | 'switch_2'
  | 'switch_3'
  | 'switch_3w'
  | 'switch_3w_dbl'
  | 'switch_3w_tpl'
  | 'mix_1'
  | 'mix_3w'
  | 'outlet_120'
  | 'outlet_240'
  | 'shower'
  | 'heater'
  | 'pump'
  | 'doorbell'
  | 'push_btn'
  | 'panel'
  | 'meter'
  | 'tv'
  | 'internet';

export interface DeviceSpec {
  label: string;
  z: number;
  p: number;
  sym: string;
  pre: string;
  sub: string;
}

export interface Wall {
  id: string;
  lvl: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lengthM: number;
  heightM?: number;
  wW?: number; // Wall width/thickness in meters
  locked?: boolean;
  detached?: boolean;
  n1F?: boolean; // Node 1 fixed
  n2F?: boolean; // Node 2 fixed
  _ox1?: number;
  _oy1?: number;
  _ox2?: number;
  _oy2?: number;
}

export interface Box {
  id: string;
  lvl: number;
  type: BoxType;
  x: number;
  y: number;
  z: number; // Height in meters above floor
  zH?: number | null; // Total vertical height for stairs / special 3D elements
  dim: Dimensions;
  rot: number; // Rotation in degrees (0 - 360)
  device: DeviceKey | null;
  mirrorX?: boolean;
  mirrorY?: boolean;
  label?: string;
  locked?: boolean;
  circs?: number; // Number of circuits/poles (for panel: 1-16)
  _ox?: number;
  _oy?: number;
}

export type ConduitPlacement = 'techo' | 'pared' | 'suelo';

export type ConduitType = 'tub_pvc_1/2' | 'tub_pvc_3/4' | 'tub_pvc_1' | string;

export interface Tube {
  id: string;
  lvl: number;
  startId: string;
  endId: string;
  pts: Point[];
  type: ConduitType;
  place: ConduitPlacement;
}

export type CableType = 'AWG' | 'SPT' | 'TSJ' | 'UTP' | 'Custom';

export interface Cable {
  type: CableType;
  gauge: string;
  color: string;
}

export interface Route {
  id: string;
  name: string;
  tubes: string[]; // List of tube IDs in the route
  cables: Cable[];
}

export interface CustomMaterial {
  name: string;
  qty: number;
  price: number;
}

export interface ProjectConfig {
  wW: number; // Default wall width in meters (e.g. 0.20)
  wH: number; // Default wall height in meters (e.g. 2.80)
}

export interface ProjectState {
  phase: Phase;
  lvlId: number;
  levels: number[];
  is3D?: boolean;
  tool: ToolType;
  showDims: boolean;
  showRulers: boolean;
  pConf: ProjectConfig;
  walls: Wall[];
  boxes: Box[];
  tubes: Tube[];
  routes: Route[];
  customMats: CustomMaterial[];
  overrides: Record<string, number>;
  prices: Record<string, number>;
  recentColors: string[];
}

export interface ProjectMetadata {
  id: string;
  name: string;
  updated: number;
}

export interface WallPolygon {
  p1L: Point;
  p1R: Point;
  p2L: Point;
  p2R: Point;
}

export interface BOMItem {
  key: string;
  label: string;
  calculatedQty: number;
  finalQty: number;
  unitPrice: number;
  subtotal: number;
  unit: 'm' | 'ud';
  colorHex?: string;
  colorCode?: string;
}

export interface BOMSummary {
  items: BOMItem[];
  customMaterials: CustomMaterial[];
  totalCost: number;
}
