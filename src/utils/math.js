/**
 * Math utilities for CAD engine (ES Module)
 */

export function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function hypot(dx, dy) {
  return Math.hypot(dx, dy);
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function snapToGrid(val, step = 10) {
  return Math.round(val / step) * step;
}

export function snapPointToGrid(p, step = 10) {
  return {
    x: snapToGrid(p.x, step),
    y: snapToGrid(p.y, step)
  };
}

export function degreesToRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function radiansToDegrees(rad) {
  return (rad * 180) / Math.PI;
}

export function generateId(prefix = '') {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  return prefix ? `${prefix}_${uuid}` : uuid;
}
