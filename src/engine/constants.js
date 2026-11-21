export const SCALE = 40;
export const SNAP_DISTANCE = 15;
export const GRID_SIZE = 20;
export const SNAP_GRID_STEP = 10;
export const MAX_HISTORY = 50;

export const DEFAULT_WALL_WIDTH = 0.20;
export const DEFAULT_WALL_HEIGHT = 2.80;

export const CABLE_TERMINAL_EXTRA_METERS = 0.20;
export const CABLE_PASS_EXTRA_METERS = 0.10;

export const DEFAULT_RECENT_COLORS = [
  '#000000',
  '#ff0000',
  '#0000ff',
  '#ffffff',
  '#00ff00',
  '#ffff00',
  '#00ffff',
  '#ff00ff'
];

export const COLOR_CODE_MAP = {
  '#000000': 'N',
  '#ff0000': 'R',
  '#0000ff': 'A',
  '#ffffff': 'B',
  '#00ff00': 'V',
  '#ffff00': 'AM',
  '#00ffff': 'C',
  '#ff00ff': 'M'
};

export const BOX_TYPE_DIMENSIONS = {
  box_oct: { w: 10.16, h: 10.16, z: 2.80 },
  box_rect: { w: 16, h: 12, z: 0.40 },
  box_sq: { w: 16, h: 16, z: 1.75 },
  door: { w: 40, h: 10, z: 0.00 },
  window: { w: 40, h: 10, z: 1.50 },
  stairs: { w: 60, h: 100, z: 0.00, zH: 2.80 }
};

export const STANDARD_POLE_COUNTS = [1, 2, 4, 6, 8, 10, 12, 14, 16];
