import { describe, it, expect } from 'vitest';
import {
  CATALOG,
  DEFAULT_CONDUIT_PRICES,
  DEFAULT_COVER_PRICES,
  getDefaultGlobalPrices,
  getReadableItemLabel
} from '../../src/engine/catalog';
import { DeviceKey } from '../../src/engine/types';

describe('CAD Engine - Catalog & Device Specifications', () => {
  const catalogKeys = Object.keys(CATALOG) as DeviceKey[];

  it('contains all required electrical devices in CATALOG', () => {
    const requiredKeys: DeviceKey[] = [
      'light',
      'wall_lamp',
      'switch_1',
      'switch_2',
      'switch_3',
      'switch_3w',
      'outlet_120',
      'outlet_240',
      'shower',
      'panel',
      'meter'
    ];

    requiredKeys.forEach(k => {
      expect(catalogKeys).toContain(k);
    });
  });

  it('validates that every catalog device conforms to strict DeviceSpec schema', () => {
    catalogKeys.forEach(key => {
      const dev = CATALOG[key];
      expect(dev, `Device ${key} must exist`).toBeDefined();
      expect(typeof dev.label, `${key} label must be a string`).toBe('string');
      expect(dev.label.trim().length, `${key} label cannot be empty`).toBeGreaterThan(0);

      expect(typeof dev.z, `${key} mounting height z must be a number`).toBe('number');
      expect(dev.z, `${key} mounting height z must be >= 0`).toBeGreaterThanOrEqual(0);

      expect(typeof dev.p, `${key} default price must be a number`).toBe('number');
      expect(dev.p, `${key} default price must be > 0`).toBeGreaterThan(0);

      expect(typeof dev.sym, `${key} symbol must be a string`).toBe('string');
      expect(dev.sym.trim().length, `${key} symbol cannot be empty`).toBeGreaterThan(0);
    });
  });

  describe('getDefaultGlobalPrices', () => {
    it('produces a full pricing dictionary with strictly positive prices', () => {
      const prices = getDefaultGlobalPrices();
      expect(Object.keys(prices).length).toBeGreaterThan(30);

      // Verify all prices are valid positive numbers
      for (const [itemKey, price] of Object.entries(prices)) {
        expect(typeof price, `Price for ${itemKey} must be a number`).toBe('number');
        expect(price, `Price for ${itemKey} must be > 0`).toBeGreaterThan(0);
        expect(Number.isNaN(price), `Price for ${itemKey} cannot be NaN`).toBe(false);
      }
    });

    it('includes distribution panels across all standard pole counts', () => {
      const prices = getDefaultGlobalPrices();
      const standardPoles = [2, 4, 6, 8, 12, 16, 24];

      standardPoles.forEach(poles => {
        expect(prices[`panel_${poles}p`]).toBeDefined();
        expect(prices[`panel_${poles}p`]).toBeGreaterThan(0);
      });
    });

    it('includes all standard conduit sizes', () => {
      const prices = getDefaultGlobalPrices();
      expect(prices['tub_pvc_1/2']).toBe(DEFAULT_CONDUIT_PRICES['tub_pvc_1/2']);
      expect(prices['tub_pvc_3/4']).toBe(DEFAULT_CONDUIT_PRICES['tub_pvc_3/4']);
      expect(prices['tub_pvc_1']).toBe(DEFAULT_CONDUIT_PRICES['tub_pvc_1']);
    });

    it('includes junction box cover prices', () => {
      const prices = getDefaultGlobalPrices();
      expect(prices['tapa_oct']).toBe(DEFAULT_COVER_PRICES['tapa_oct']);
      expect(prices['tapa_rect']).toBe(DEFAULT_COVER_PRICES['tapa_rect']);
      expect(prices['tapa_sq']).toBe(DEFAULT_COVER_PRICES['tapa_sq']);
    });
  });

  describe('getReadableItemLabel', () => {
    it('returns human-readable labels for devices and materials', () => {
      expect(getReadableItemLabel('light')).toBe(CATALOG.light.label);
      expect(getReadableItemLabel('switch_1')).toBe(CATALOG.switch_1.label);
      expect(getReadableItemLabel('tub_pvc_1/2')).toContain('1/2');
      expect(getReadableItemLabel('tapa_oct')).toContain('Tapa');
    });

    it('falls back to key when label is unknown', () => {
      const unknownKey = 'unknown_special_sensor';
      expect(getReadableItemLabel(unknownKey)).toBe(unknownKey);
    });
  });
});
