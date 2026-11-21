/**
 * GATC Engine Constants
 */

export const SCALE = 40; // 40 pixels = 1.0 meter in 2D canvas
export const SNAP_DISTANCE = 15; // Node/wall snapping radius in pixels
export const GRID_SIZE = 20; // Visual background grid spacing in pixels
export const SNAP_GRID_STEP = 10; // Drawing grid snap step in pixels
export const MAX_HISTORY = 50; // Maximum states stored in history buffer

export const DEFAULT_WALL_WIDTH = 0.20; // Default wall thickness in meters
export const DEFAULT_WALL_HEIGHT = 2.80; // Default level height in meters

export const CABLE_TERMINAL_EXTRA_METERS = 0.20; // Additional wire per circuit terminal box
export const CABLE_PASS_EXTRA_METERS = 0.10; // Additional wire per pass/junction box

export const DEFAULT_RECENT_COLORS: string[] = [
  '#000000', // Black
  '#ff0000', // Red
  '#0000ff', // Blue
  '#ffffff', // White
  '#00ff00', // Green
  '#ffff00', // Yellow
  '#00ffff', // Cyan
  '#ff00ff'  // Magenta
];

export const COLOR_CODE_MAP: Record<string, string> = {
  '#000000': 'N',
  '#ff0000': 'R',
  '#0000ff': 'A',
  '#ffffff': 'B',
  '#00ff00': 'V',
  '#ffff00': 'AM',
  '#00ffff': 'C',
  '#ff00ff': 'M'
};

export const BOX_TYPE_DIMENSIONS: Record<string, { w: number; h: number; z: number; zH?: number }> = {
  box_oct: { w: 10.16, h: 10.16, z: 2.80 },
  box_rect: { w: 16, h: 12, z: 0.40 },
  box_sq: { w: 16, h: 16, z: 1.75 },
  door: { w: 40, h: 10, z: 0.00 },
  window: { w: 40, h: 10, z: 1.50 },
  stairs: { w: 60, h: 100, z: 0.00, zH: 2.80 }
};

export const STANDARD_POLE_COUNTS = [1, 2, 4, 6, 8, 10, 12, 14, 16] as const;
