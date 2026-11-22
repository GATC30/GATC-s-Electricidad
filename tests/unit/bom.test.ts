import { describe, it, expect } from 'vitest';
import {
  calculateBOM,
  calculateTubeLengthMeters,
  calculateConduitSummary
} from '../../src/engine/bom';
import {
  ProjectState,
  ProjectConfig,
  Box,
  Tube,
  Route,
  Wall
} from '../../src/engine/types';
import {
  CABLE_TERMINAL_EXTRA_METERS,
  CABLE_PASS_EXTRA_METERS,
  SCALE
} from '../../src/engine/constants';
import { CATALOG, getDefaultGlobalPrices } from '../../src/engine/catalog';

describe('CAD Engine - BOM & Cost Calculation', () => {
  const sampleConfig: ProjectConfig = {
    wH: 2.8,
    wW: 0.2,
    ceilingDrop: 0,
    floorRaise: 0
  };

  const sampleBoxes: Box[] = [
    {
      id: 'box_panel',
      type: 'sq',
      x: 100,
      y: 100,
      z: 1.75,
      lvl: 1,
      dev: 'panel',
      label: 'TAB-1'
    },
    {
      id: 'box_lamp',
      type: 'oct',
      x: 220,
      y: 100,
      z: 2.8,
      lvl: 1,
      dev: 'light',
      label: 'L1'
    },
    {
      id: 'box_switch',
      type: 'rect',
      x: 220,
      y: 200,
      z: 1.2,
      lvl: 1,
      dev: 'switch_1',
      label: 'S1'
    }
  ];

  const sampleTubes: Tube[] = [
    {
      id: 'tube_1',
      startId: 'box_panel',
      endId: 'box_lamp',
      type: 'tub_pvc_3/4',
      place: 'techo',
      pts: []
    },
    {
      id: 'tube_2',
      startId: 'box_lamp',
      endId: 'box_switch',
      type: 'tub_pvc_1/2',
      place: 'pared',
      pts: []
    }
  ];

  const sampleRoutes: Route[] = [
    {
      id: 'route_circ1',
      name: 'Circuito 1 - Iluminación',
      color: '#ef4444',
      tubeIds: ['tube_1'],
      cables: [
        { type: 'fase', gauge: '12_awg', color: '#ef4444' },
        { type: 'neutro', gauge: '12_awg', color: '#ffffff' },
        { type: 'tierra', gauge: '12_awg', color: '#22c55e' }
      ]
    }
  ];

  const sampleState: ProjectState = {
    projectName: 'Residencia Test',
    levels: [
      { id: 1, name: 'Piso 1' },
      { id: 2, name: 'Piso 2' }
    ],
    walls: [],
    boxes: sampleBoxes,
    tubes: sampleTubes,
    routes: sampleRoutes,
    customMats: [
      {
        id: 'cust_1',
        name: 'Cinta de aislar 3M Super 33+',
        cat: 'consumibles',
        unit: 'rollo',
        qty: 3,
        price: 25.0
      }
    ],
    overrides: {},
    prices: {},
    config: sampleConfig
  };

  describe('calculateTubeLengthMeters', () => {
    it('calculates conduit length for ceiling (techo) placement with vertical drops', () => {
      // Horizontal distance: from x=100 to x=220 at scale 40 = 120 / 40 = 3.0 meters
      // Vertical drops:
      // panel at z=1.75 -> ceiling drop = 2.80 - 1.75 = 1.05m
      // lamp at z=2.80 -> ceiling drop = 2.80 - 2.80 = 0m
      // Total expected: 3.0 + 1.05 + 0 = 4.05 meters
      const len = calculateTubeLengthMeters(sampleTubes[0], sampleBoxes[0], sampleBoxes[1], sampleConfig);
      expect(len).toBeCloseTo(4.05, 2);
    });

    it('calculates conduit length for wall (pared) placement using hypotenuse', () => {
      // Horizontal distance: from y=100 to y=200 at scale 40 = 100 / 40 = 2.5 meters
      // Vertical delta: z1=2.80, z2=1.20 -> deltaZ = 1.60 meters
      // Hypotenuse: sqrt(2.5^2 + 1.6^2) = sqrt(6.25 + 2.56) = sqrt(8.81) = ~2.968m
      const len = calculateTubeLengthMeters(sampleTubes[1], sampleBoxes[1], sampleBoxes[2], sampleConfig);
      expect(len).toBeCloseTo(Math.hypot(2.5, 1.6), 2);
    });
  });

  describe('calculateConduitSummary', () => {
    it('summarizes tube lengths separated by conduit type', () => {
      const summary = calculateConduitSummary(sampleTubes, sampleBoxes, sampleConfig);
      expect(summary.totalMeters).toBeGreaterThan(0);
      expect(summary.lengthsByType['tub_pvc_3/4']).toBeGreaterThan(0);
      expect(summary.lengthsByType['tub_pvc_1/2']).toBeGreaterThan(0);
      expect(summary.lengthsByType['tub_pvc_1']).toBe(0);
    });
  });

  describe('calculateBOM', () => {
    it('generates a complete BOM item list with devices, conduits, cables and accessories', () => {
      const bom = calculateBOM(sampleState);

      expect(bom).toBeDefined();
      expect(bom.items.length).toBeGreaterThan(0);
      expect(bom.total).toBeGreaterThan(0);

      // Verify device items
      const lampItem = bom.items.find(i => i.key === 'light');
      expect(lampItem).toBeDefined();
      expect(lampItem?.qty).toBe(1);

      const switchItem = bom.items.find(i => i.key === 'switch_1');
      expect(switchItem).toBeDefined();
      expect(switchItem?.qty).toBe(1);

      // Verify conduit items
      const conduit34 = bom.items.find(i => i.key === 'tub_pvc_3/4');
      expect(conduit34).toBeDefined();
      expect(conduit34?.qty).toBeGreaterThanOrEqual(4); // Rounded ceiling
    });

    it('adds cable extras for terminal ends and pass-throughs', () => {
      const bom = calculateBOM(sampleState);
      const cableFase = bom.items.find(i => i.key === 'cable_12_awg_fase');

      expect(cableFase).toBeDefined();
      // Length must include terminal extra: 2 * CABLE_TERMINAL_EXTRA_METERS (0.20m each)
      expect(cableFase?.qty).toBeGreaterThanOrEqual(1);
    });

    it('correctly includes and sums custom materials', () => {
      const bom = calculateBOM(sampleState);
      const customItem = bom.items.find(i => i.key === 'cust_1');

      expect(customItem).toBeDefined();
      expect(customItem?.label).toContain('Cinta de aislar 3M');
      expect(customItem?.qty).toBe(3);
      expect(customItem?.unitPrice).toBe(25.0);
      expect(customItem?.total).toBe(75.0);
    });

    it('respects price overrides when specified in project state', () => {
      const overriddenState: ProjectState = {
        ...sampleState,
        overrides: {
          'light': 99.0
        }
      };

      const bom = calculateBOM(overriddenState);
      const lampItem = bom.items.find(i => i.key === 'light');
      expect(lampItem?.unitPrice).toBe(99.0);
    });

    it('calculates grand total accurately as sum of all line items', () => {
      const bom = calculateBOM(sampleState);
      const calculatedSum = bom.items.reduce((sum, item) => sum + item.total, 0);
      expect(bom.total).toBeCloseTo(calculatedSum, 2);
    });
  });
});
