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
  let uuid;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uuid = crypto.randomUUID();
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    uuid = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
  } else {
    const ts = Date.now().toString(16);
    const perf = typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000).toString(16) : '0';
    uuid = `uuid-${ts}-${perf}`;
  }
  return prefix ? `${prefix}_${uuid}` : uuid;
}
