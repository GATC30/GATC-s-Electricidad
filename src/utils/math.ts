import { Point } from '../engine/types';

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Calculates hypotenuse (magnitude) of a vector.
 */
export function hypot(dx: number, dy: number): number {
  return Math.hypot(dx, dy);
}

/**
 * Clamps a number between min and max bounds.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Snaps a 1D value to the nearest step grid.
 */
export function snapToGrid(val: number, step: number = 10): number {
  return Math.round(val / step) * step;
}

/**
 * Snaps a 2D point to the nearest grid coordinates.
 */
export function snapPointToGrid(p: Point, step: number = 10): Point {
  return {
    x: snapToGrid(p.x, step),
    y: snapToGrid(p.y, step)
  };
}

/**
 * Converts degrees to radians.
 */
export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 */
export function radiansToDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Generates a unique identifier using standard Web Crypto API.
 * Uses crypto.randomUUID() or a cryptographic getRandomValues RFC4122 fallback (BUG-09 fix).
 */
export function generateId(prefix: string = ''): string {
  let uuid: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uuid = crypto.randomUUID();
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    uuid = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
  } else {
    // Ultimate fallback using high-resolution timestamp
    const ts = Date.now().toString(16);
    const perf = typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000).toString(16) : '0';
    uuid = `uuid-${ts}-${perf}`;
  }
  return prefix ? `${prefix}_${uuid}` : uuid;
}
