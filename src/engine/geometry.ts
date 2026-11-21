import { Point, Wall, Box, Tube, WallPolygon } from './types';
import { SCALE, DEFAULT_WALL_WIDTH } from './constants';

/**
 * Transforms screen coordinates (from mouse/touch event) into world CAD coordinates
 * taking into account camera panning and zoom factor.
 */
export function getWorldCoords(
  clientX: number,
  clientY: number,
  canvasRect: { left: number; top: number },
  camX: number,
  camY: number,
  zoom: number
): Point {
  return {
    x: (clientX - canvasRect.left - camX) / zoom,
    y: (clientY - canvasRect.top - camY) / zoom
  };
}

/**
 * Snaps a candidate point to the nearest existing wall node if within tolerance radius.
 */
export function snapToWall(
  p: Point,
  walls: Wall[],
  currentLevel: number,
  zoom: number = 1,
  excludeId?: string
): Point {
  const snapRadius = 20 / zoom;

  for (const w of walls) {
    if (w.lvl !== currentLevel || w.id === excludeId || w.detached) continue;

    if (Math.hypot(p.x - w.x1, p.y - w.y1) < snapRadius) {
      return { x: w.x1, y: w.y1 };
    }
    if (Math.hypot(p.x - w.x2, p.y - w.y2) < snapRadius) {
      return { x: w.x2, y: w.y2 };
    }
  }

  return { x: p.x, y: p.y };
}

/**
 * Finds the closest wall to a given point and returns the projected point on the segment
 * along with the perpendicular distance.
 */
export function getClosestWall(
  point: Point,
  walls: Wall[],
  currentLevel: number
): { w: Wall; px: number; py: number; dist: number } | null {
  let minDistance = Infinity;
  let best: { w: Wall; px: number; py: number; dist: number } | null = null;

  for (const w of walls) {
    if (w.lvl !== currentLevel) continue;

    const dx = w.x2 - w.x1;
    const dy = w.y2 - w.y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) continue;

    let t = ((point.x - w.x1) * dx + (point.y - w.y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const px = w.x1 + t * dx;
    const py = w.y1 + t * dy;
    const dist = Math.hypot(point.x - px, point.y - py);

    if (dist < minDistance) {
      minDistance = dist;
      best = { w, px, py, dist };
    }
  }

  return best;
}

/**
 * Checks if a point is within a given tolerance distance from a line segment.
 */
export function pointNearSegment(
  p: Point,
  p1: Point,
  p2: Point,
  maxDist: number
): boolean {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const l2 = dx * dx + dy * dy;

  if (l2 === 0) {
    return Math.hypot(p.x - p1.x, p.y - p1.y) < maxDist;
  }

  let t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;

  return Math.hypot(p.x - projX, p.y - projY) < maxDist;
}

/**
 * Detects whether a point is hovering/clicking over a conduit curve or segment.
 */
export function getTubeAtCurve(
  worldPoint: Point,
  tubes: Tube[],
  boxes: Box[],
  currentLevel: number,
  zoom: number = 1
): Tube | undefined {
  const tolerance = 20 / zoom;
  const boxMap = new Map<string, Box>(boxes.map(b => [b.id, b]));

  return tubes.find(t => {
    if (t.lvl !== currentLevel) return false;
    const startBox = boxMap.get(t.startId);
    const endBox = boxMap.get(t.endId);
    if (!startBox || !endBox) return false;

    const pts: Point[] = [
      { x: startBox.x, y: startBox.y },
      ...(t.pts || []),
      { x: endBox.x, y: endBox.y }
    ];

    if (t.place === 'pared') {
      for (let i = 0; i < pts.length - 1; i++) {
        if (pointNearSegment(worldPoint, pts[i], pts[i + 1], tolerance)) {
          return true;
        }
      }
    } else {
      // Quadratic Bezier curves for ceiling or floor
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p2 = pts[i + 1];
        const mx = (p0.x + p2.x) / 2;
        const my = (p0.y + p2.y) / 2;
        const dst = Math.hypot(p2.x - p0.x, p2.y - p0.y);
        const mult = t.place === 'suelo' ? 0.15 : -0.15;
        const cp = { x: mx, y: my + dst * mult };

        let lastPt = p0;
        for (let j = 1; j <= 10; j++) {
          const tr = j / 10;
          const nx = Math.pow(1 - tr, 2) * p0.x + 2 * (1 - tr) * tr * cp.x + Math.pow(tr, 2) * p2.x;
          const ny = Math.pow(1 - tr, 2) * p0.y + 2 * (1 - tr) * tr * cp.y + Math.pow(tr, 2) * p2.y;
          if (pointNearSegment(worldPoint, lastPt, { x: nx, y: ny }, tolerance)) {
            return true;
          }
          lastPt = { x: nx, y: ny };
        }
      }
    }

    return false;
  });
}

/**
 * Calculates the bounding room center around a target coordinate (x, y) by casting
 * orthogonal rays in 4 directions to find enclosing walls.
 * Fixed for BUG-08 (division by zero on horizontal/vertical walls).
 */
export function getRoomCenter(
  x: number,
  y: number,
  lvl: number,
  walls: Wall[]
): Point {
  let leftX = -10000;
  let rightX = 10000;
  let topY = -10000;
  let bottomY = 10000;

  const levelWalls = walls.filter(w => w.lvl === lvl);

  for (const w of levelWalls) {
    const minY = Math.min(w.y1, w.y2) - 10;
    const maxY = Math.max(w.y1, w.y2) + 10;
    const minX = Math.min(w.x1, w.x2) - 10;
    const maxX = Math.max(w.x1, w.x2) + 10;

    // Horizontal ray cast at y
    if (minY <= y && maxY >= y) {
      const dy = w.y2 - w.y1;
      if (Math.abs(dy) > 1e-4) {
        const ix = w.x1 + ((y - w.y1) * (w.x2 - w.x1)) / dy;
        if (ix < x && ix > leftX) leftX = ix;
        if (ix > x && ix < rightX) rightX = ix;
      }
    }

    // Vertical ray cast at x
    if (minX <= x && maxX >= x) {
      const dx = w.x2 - w.x1;
      if (Math.abs(dx) > 1e-4) {
        const iy = w.y1 + ((x - w.x1) * (w.y2 - w.y1)) / dx;
        if (iy < y && iy > topY) topY = iy;
        if (iy > y && iy < bottomY) bottomY = iy;
      }
    }
  }

  let finalX = x;
  let finalY = y;

  if (leftX !== -10000 && rightX !== 10000) {
    finalX = (leftX + rightX) / 2;
  }
  if (topY !== -10000 && bottomY !== 10000) {
    finalY = (topY + bottomY) / 2;
  }

  return {
    x: isNaN(finalX) ? x : finalX,
    y: isNaN(finalY) ? y : finalY
  };
}

/**
 * Computes wall boundary polygon with accurate miter joint intersection for connected walls.
 */
export function getWallPolygon(
  w: Wall,
  walls: Wall[],
  scale: number = SCALE,
  baseWallWidth: number = DEFAULT_WALL_WIDTH
): WallPolygon {
  const hw = ((w.wW || baseWallWidth) * scale) / 2;
  const dir = { x: w.x2 - w.x1, y: w.y2 - w.y1 };
  const len = Math.hypot(dir.x, dir.y) || 0.001;
  const d1 = { x: dir.x / len, y: dir.y / len };
  const n = { x: -d1.y, y: d1.x };

  const poly: WallPolygon = {
    p1L: { x: w.x1 + n.x * hw, y: w.y1 + n.y * hw },
    p1R: { x: w.x1 - n.x * hw, y: w.y1 - n.y * hw },
    p2L: { x: w.x2 + n.x * hw, y: w.y2 + n.y * hw },
    p2R: { x: w.x2 - n.x * hw, y: w.y2 - n.y * hw }
  };

  if (w.detached) return poly;

  const calcNode = (nodePos: Point) => {
    const connected = walls.filter(
      ow =>
        ow.lvl === w.lvl &&
        !ow.detached &&
        (Math.hypot(ow.x1 - nodePos.x, ow.y1 - nodePos.y) < 15 ||
          Math.hypot(ow.x2 - nodePos.x, ow.y2 - nodePos.y) < 15)
    );

    if (connected.length <= 1) return null;

    const rays = connected.map(ow => {
      const isOwP1 = Math.hypot(ow.x1 - nodePos.x, ow.y1 - nodePos.y) < 15;
      const outPt = isOwP1 ? { x: ow.x2, y: ow.y2 } : { x: ow.x1, y: ow.y1 };
      const ang = Math.atan2(outPt.y - nodePos.y, outPt.x - nodePos.x);
      return { id: ow.id, ang, hw: ((ow.wW || baseWallWidth) * scale) / 2 };
    });

    rays.sort((A, B) => A.ang - B.ang);

    const myIdx = rays.findIndex(r => r.id === w.id);
    if (myIdx === -1) return null;

    const N = rays.length;
    const leftNeighbor = rays[(myIdx + 1) % N];
    const rightNeighbor = rays[(myIdx - 1 + N) % N];

    const getIntersection = (
      r1: { ang: number; hw: number },
      r2: { ang: number; hw: number },
      side1: 'L' | 'R',
      side2: 'L' | 'R'
    ): Point => {
      const n1 = { x: -Math.sin(r1.ang), y: Math.cos(r1.ang) };
      const n2 = { x: -Math.sin(r2.ang), y: Math.cos(r2.ang) };

      const p1 = {
        x: nodePos.x + n1.x * r1.hw * (side1 === 'L' ? 1 : -1),
        y: nodePos.y + n1.y * r1.hw * (side1 === 'L' ? 1 : -1)
      };
      const p2 = {
        x: nodePos.x + n2.x * r2.hw * (side2 === 'L' ? 1 : -1),
        y: nodePos.y + n2.y * r2.hw * (side2 === 'L' ? 1 : -1)
      };

      const v1 = { x: Math.cos(r1.ang), y: Math.sin(r1.ang) };
      const v2 = { x: Math.cos(r2.ang), y: Math.sin(r2.ang) };

      const det = v1.x * v2.y - v1.y * v2.x;
      if (Math.abs(det) < 0.001) return p1;

      const t1 = ((p2.x - p1.x) * v2.y - (p2.y - p1.y) * v2.x) / det;
      const maxMiter = Math.max(r1.hw, r2.hw) * 5;
      let tLim = t1;
      if (Math.abs(t1) > maxMiter) {
        tLim = Math.sign(t1) * maxMiter;
      }

      return { x: p1.x + v1.x * tLim, y: p1.y + v1.y * tLim };
    };

    return {
      left: getIntersection(rays[myIdx], leftNeighbor, 'L', 'R'),
      right: getIntersection(rays[myIdx], rightNeighbor, 'R', 'L')
    };
  };

  const c1 = calcNode({ x: w.x1, y: w.y1 });
  if (c1) {
    poly.p1L = c1.left;
    poly.p1R = c1.right;
  }

  const c2 = calcNode({ x: w.x2, y: w.y2 });
  if (c2) {
    poly.p2L = c2.right;
    poly.p2R = c2.left;
  }

  return poly;
}
