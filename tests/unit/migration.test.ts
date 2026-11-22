import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  detectLegacyData,
  MIGRATION_FLAG_KEY,
  DISMISS_FLAG_KEY,
  LegacyProjectSummary
} from '../../src/lib/migration';
import {
  detectSchemaVersion,
  migrateProjectState,
  CURRENT_SCHEMA_VERSION
} from '../../src/lib/schema-version';
import { validateGatcFile, validateProjectState } from '../../src/lib/validators';
import { calculateBOM } from '../../src/engine/bom';

describe('Data Migration System (GATC v1.5 -> v2.0)', () => {
  // Mock localStorage for node/jsdom environment
  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    if (typeof window !== 'undefined') {
      vi.spyOn(window.localStorage, 'getItem').mockImplementation((key: string) => storage[key] || null);
      vi.spyOn(window.localStorage, 'setItem').mockImplementation((key: string, val: string) => {
        storage[key] = val;
      });
      vi.spyOn(window.localStorage, 'removeItem').mockImplementation((key: string) => {
        delete storage[key];
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const legacyProjectFixture = {
    name: 'Casa Residencial Modelo A',
    config: { wH: 2.8, wW: 0.2 },
    walls: [
      { id: '1', x1: 0, y1: 0, x2: 200, y2: 0, lvl: 1, openings: [] },
      { id: '2', x1: 200, y1: 0, x2: 200, y2: 200, lvl: 1, openings: [{ type: 'door', offset: 50, width: 90 }] },
      { id: '3', x1: 200, y1: 200, x2: 0, y2: 200, lvl: 1, openings: [] },
      { id: '4', x1: 0, y1: 200, x2: 0, y2: 0, lvl: 1, openings: [] }
    ],
    boxes: [
      { id: 'b1', type: 'oct', x: 100, y: 100, z: 2.8, lvl: 1, dev: 'light', label: 'Luz Sala' },
      { id: 'b2', type: 'rect', x: 200, y: 100, z: 1.2, lvl: 1, dev: 'switch_1', label: 'Apagador' },
      { id: 'b3', type: 'sq', x: 50, y: 50, z: 1.75, lvl: 1, dev: 'panel', label: 'Tablero Principal' }
    ],
    tubes: [
      { id: 't1', startId: 'b3', endId: 'b1', type: 'tub_pvc_3/4', place: 'techo', pts: [] },
      { id: 't2', startId: 'b1', endId: 'b2', type: 'tub_pvc_1/2', place: 'pared', pts: [] }
    ],
    routes: [
      {
        id: 'r1',
        name: 'C-1 Alumbrado',
        color: '#3b82f6',
        tubeIds: ['t1', 't2'],
        cables: [
          { type: 'fase', gauge: '12_awg', color: '#ef4444' },
          { type: 'neutro', gauge: '12_awg', color: '#ffffff' },
          { type: 'tierra', gauge: '12_awg', color: '#22c55e' }
        ]
      }
    ],
    prices: {
      'light': 50.0
    }
  };

  describe('detectSchemaVersion', () => {
    it('detects unversioned legacy v1.5 payload as version 1', () => {
      const version = detectSchemaVersion(legacyProjectFixture);
      expect(version).toBe(1);
    });

    it('detects explicit v2.0 schemaVersion as version 2', () => {
      const v2Payload = {
        schemaVersion: 2,
        state: legacyProjectFixture
      };
      expect(detectSchemaVersion(v2Payload)).toBe(2);
    });

    it('returns 0 for invalid non-project objects', () => {
      expect(detectSchemaVersion(null)).toBe(0);
      expect(detectSchemaVersion('random string')).toBe(0);
      expect(detectSchemaVersion({})).toBe(0);
    });
  });

  describe('migrateProjectState', () => {
    it('migrates legacy v1.5 state to fully valid v2.0 state', () => {
      const { state: migratedState, report } = migrateProjectState(legacyProjectFixture);

      expect(report.originalVersion).toBe(1);
      expect(report.finalVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(report.migrated).toBe(true);

      // Validate project structure
      expect(migratedState.projectName).toBe('Casa Residencial Modelo A');
      expect(migratedState.levels).toBeDefined();
      expect(migratedState.levels.length).toBeGreaterThanOrEqual(1);
      expect(migratedState.walls.length).toBe(4);
      expect(migratedState.boxes.length).toBe(3);
      expect(migratedState.tubes.length).toBe(2);
      expect(migratedState.routes.length).toBe(1);

      // Validate that all walls have thickness, height, and valid openings
      migratedState.walls.forEach(w => {
        expect(w.thickness).toBeGreaterThan(0);
        expect(w.height).toBeGreaterThan(0);
        expect(Array.isArray(w.openings)).toBe(true);
      });

      // Validate that the migrated state passes the strict schema validator
      const validation = validateProjectState(migratedState);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('calculates BOM seamlessly from migrated legacy project', () => {
      const { state: migratedState } = migrateProjectState(legacyProjectFixture);
      const bom = calculateBOM(migratedState);

      expect(bom).toBeDefined();
      expect(bom.items.length).toBeGreaterThan(0);
      expect(bom.total).toBeGreaterThan(0);

      const lampItem = bom.items.find(i => i.key === 'light');
      expect(lampItem).toBeDefined();
      expect(lampItem?.qty).toBe(1);
      // Verify price override was preserved
      expect(lampItem?.unitPrice).toBe(50.0);
    });

    it('safely handles missing or corrupted arrays in legacy state', () => {
      const corruptLegacy = {
        name: '<script>alert("xss")</script>Corrupt Project',
        walls: null,
        boxes: undefined,
        tubes: 'not an array'
      };

      const { state: recoveredState, report } = migrateProjectState(corruptLegacy);

      expect(recoveredState).toBeDefined();
      expect(recoveredState.walls).toEqual([]);
      expect(recoveredState.boxes).toEqual([]);
      expect(recoveredState.tubes).toEqual([]);
      expect(recoveredState.routes).toEqual([]);
      // XSS sanitized
      expect(recoveredState.projectName).not.toContain('<script>');
      expect(report.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('detectLegacyData', () => {
    it('detects legacy projects saved under ecad_projects_index in localStorage', () => {
      storage['ecad_projects_index'] = JSON.stringify([
        { id: 'proj_legacy_1', name: 'Legacy Project 1', updated: 1700000000000 }
      ]);
      storage['ecad_data_proj_legacy_1'] = JSON.stringify(legacyProjectFixture);
      storage['ecad_global_prices'] = JSON.stringify({ light: 45, switch_1: 18 });

      const detection = detectLegacyData();
      expect(detection.hasLegacyData).toBe(true);
      expect(detection.isMigrated).toBe(false);
      expect(detection.projectCount).toBe(1);
      expect(detection.hasGlobalPrices).toBe(true);
      expect(detection.projects[0].name).toBe('Casa Residencial Modelo A');
    });

    it('returns hasLegacyData=false when no ecad_* keys exist', () => {
      const detection = detectLegacyData();
      expect(detection.hasLegacyData).toBe(false);
      expect(detection.projectCount).toBe(0);
    });
  });
});
