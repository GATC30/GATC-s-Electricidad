import { describe, it, expect } from 'vitest';
import {
  snapToWall,
  getClosestWall,
  pointNearSegment,
  getTubeAtCurve,
  getRoomCenter,
  getWallPolygon,
  getWorldCoords
} from '../../src/engine/geometry';
import { distance, clamp, snapToGrid, degreesToRadians } from '../../src/utils/math';
import { Wall, Point } from '../../src/engine/types';

describe('CAD Engine - Geometry Utilities', () => {
  const sampleWalls: Wall[] = [
    {
      id: 'w1',
      x1: 0,
      y1: 0,
      x2: 200,
      y2: 0,
      thickness: 0.2,
      height: 2.8,
      lvl: 1,
      openings: []
    },
    {
      id: 'w2',
      x1: 200,
      y1: 0,
      x2: 200,
      y2: 200,
      thickness: 0.2,
      height: 2.8,
      lvl: 1,
      openings: []
    },
    {
      id: 'w3_lvl2',
      x1: 0,
      y1: 100,
      x2: 200,
      y2: 100,
      thickness: 0.2,
      height: 2.8,
      lvl: 2,
      openings: []
    }
  ];

  describe('snapToWall', () => {
    it('snaps point near (x1, y1) to the wall start node', () => {
      const nearStart: Point = { x: 5, y: 5 };
      const snapped = snapToWall(nearStart, sampleWalls, 1, 1);
      expect(snapped.x).toBe(0);
      expect(snapped.y).toBe(0);
    });

    it('snaps point near (x2, y2) to the wall end node', () => {
      const nearEnd: Point = { x: 195, y: 3 };
      const snapped = snapToWall(nearEnd, sampleWalls, 1, 1);
      expect(snapped.x).toBe(200);
      expect(snapped.y).toBe(0);
    });

    it('does not snap if point is outside tolerance radius', () => {
      const farPoint: Point = { x: 100, y: 50 };
      const snapped = snapToWall(farPoint, sampleWalls, 1, 1);
      expect(snapped.x).toBe(100);
      expect(snapped.y).toBe(50);
    });

    it('ignores walls on different levels', () => {
      const nearLvl2Wall: Point = { x: 2, y: 102 };
      const snapped = snapToWall(nearLvl2Wall, sampleWalls, 1, 1);
      expect(snapped.x).toBe(2);
      expect(snapped.y).toBe(102);

      const snappedLvl2 = snapToWall(nearLvl2Wall, sampleWalls, 2, 1);
      expect(snappedLvl2.x).toBe(0);
      expect(snappedLvl2.y).toBe(100);
    });

    it('ignores excluded wall ID', () => {
      const nearStart: Point = { x: 5, y: 5 };
      const snapped = snapToWall(nearStart, sampleWalls, 1, 1, 'w1');
      // Should not snap to w1
      expect(snapped.x).toBe(5);
      expect(snapped.y).toBe(5);
    });

    it('adjusts snap radius inversely with zoom factor', () => {
      const point: Point = { x: 25, y: 0 };
      // At zoom 1, snapRadius = 20 -> dist 25 is too far
      const atZoom1 = snapToWall(point, sampleWalls, 1, 1);
      expect(atZoom1.x).toBe(25);

      // At zoom 0.5, snapRadius = 40 -> dist 25 should snap to 0,0
      const atZoom05 = snapToWall(point, sampleWalls, 1, 0.5);
      expect(atZoom05.x).toBe(0);
      expect(atZoom05.y).toBe(0);
    });
  });

  describe('getClosestWall', () => {
    it('finds closest wall and projected perpendicular point', () => {
      const testPoint: Point = { x: 100, y: 30 };
      const result = getClosestWall(testPoint, sampleWalls, 1);

      expect(result).not.toBeNull();
      expect(result?.w.id).toBe('w1');
      expect(result?.px).toBe(100);
      expect(result?.py).toBe(0);
      expect(result?.dist).toBe(30);
    });

    it('clamps projected point to wall segment endpoints', () => {
      const pastEnd: Point = { x: 250, y: 50 };
      const result = getClosestWall(pastEnd, sampleWalls, 1);

      expect(result).not.toBeNull();
      expect(result?.w.id).toBe('w2');
      // w2 goes from (200, 0) to (200, 200). Projection of (250, 50) is (200, 50)
      expect(result?.px).toBe(200);
      expect(result?.py).toBe(50);
      expect(result?.dist).toBe(50);
    });

    it('filters by level', () => {
      const point: Point = { x: 50, y: 95 };
      const resultLvl1 = getClosestWall(point, sampleWalls, 1);
      expect(resultLvl1?.w.id).toBe('w1');

      const resultLvl2 = getClosestWall(point, sampleWalls, 2);
      expect(resultLvl2?.w.id).toBe('w3_lvl2');
      expect(resultLvl2?.dist).toBe(5);
    });
  });

  describe('pointNearSegment', () => {
    it('returns true for point within threshold', () => {
      const p: Point = { x: 50, y: 2 };
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 100, y: 0 };
      expect(pointNearSegment(p, p1, p2, 5)).toBe(true);
    });

    it('returns false for point outside threshold', () => {
      const p: Point = { x: 50, y: 15 };
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 100, y: 0 };
      expect(pointNearSegment(p, p1, p2, 5)).toBe(false);
    });
  });

  describe('getTubeAtCurve', () => {
    it('calculates curved control point between two boxes', () => {
      const b1 = { x: 100, y: 100 };
      const b2 = { x: 200, y: 100 };
      const curve = getTubeAtCurve(b1, b2, 20);

      // Midpoint is (150, 100). Perpendicular to horizontal is vertical.
      expect(curve.x).toBeCloseTo(150, 1);
      expect(Math.abs(curve.y - 100)).toBeGreaterThan(0);
    });
  });

  describe('getRoomCenter', () => {
    it('computes room centroid without division by zero', () => {
      const roomWalls: Wall[] = [
        { id: '1', x1: 0, y1: 0, x2: 100, y2: 0, thickness: 0.2, height: 2.8, lvl: 1, openings: [] },
        { id: '2', x1: 100, y1: 0, x2: 100, y2: 100, thickness: 0.2, height: 2.8, lvl: 1, openings: [] },
        { id: '3', x1: 100, y1: 100, x2: 0, y2: 100, thickness: 0.2, height: 2.8, lvl: 1, openings: [] },
        { id: '4', x1: 0, y1: 100, x2: 0, y2: 0, thickness: 0.2, height: 2.8, lvl: 1, openings: [] }
      ];

      const center = getRoomCenter(roomWalls);
      expect(center.x).toBeCloseTo(50, 0);
      expect(center.y).toBeCloseTo(50, 0);
    });

    it('returns default fallback for empty or degenerate walls', () => {
      const emptyCenter = getRoomCenter([]);
      expect(emptyCenter).toBeDefined();
      expect(typeof emptyCenter.x).toBe('number');
      expect(typeof emptyCenter.y).toBe('number');
    });
  });

  describe('getWallPolygon', () => {
    it('generates 4 corner vertices for a wall segment with thickness', () => {
      const wall: Wall = {
        id: 'w1',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 0,
        thickness: 0.2,
        height: 2.8,
        lvl: 1,
        openings: []
      };

      const poly = getWallPolygon(wall, [wall]);
      expect(poly.pts.length).toBe(4);
      // For horizontal wall along x-axis, corners should have y offset equal to half-thickness * SCALE
      poly.pts.forEach(pt => {
        expect(typeof pt.x).toBe('number');
        expect(typeof pt.y).toBe('number');
        expect(Number.isNaN(pt.x)).toBe(false);
        expect(Number.isNaN(pt.y)).toBe(false);
      });
    });
  });

  describe('getWorldCoords', () => {
    it('accurately transforms screen coordinates to world coordinates', () => {
      const canvasRect = { left: 50, top: 100 };
      const camX = 200;
      const camY = 150;
      const zoom = 2;

      // clientX = 450, clientY = 450
      // x = (450 - 50 - 200) / 2 = 200 / 2 = 100
      // y = (450 - 100 - 150) / 2 = 200 / 2 = 100
      const world = getWorldCoords(450, 450, canvasRect, camX, camY, zoom);
      expect(world.x).toBe(100);
      expect(world.y).toBe(100);
    });
  });

  describe('Math utility functions', () => {
    it('distance() computes Euclidean distance', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
      expect(distance({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
    });

    it('clamp() keeps value within range [min, max]', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('snapToGrid() snaps values to nearest grid interval', () => {
      expect(snapToGrid(23, 20)).toBe(20);
      expect(snapToGrid(31, 20)).toBe(40);
      expect(snapToGrid(0, 20)).toBe(0);
    });

    it('degreesToRadians() converts correctly', () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
    });
  });
});
