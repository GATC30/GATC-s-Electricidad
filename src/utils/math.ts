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
 * Replaces legacy insecure random ID generation (BUG-09 fix).
 */
export function generateId(prefix: string = ''): string {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  return prefix ? `${prefix}_${uuid}` : uuid;
}
