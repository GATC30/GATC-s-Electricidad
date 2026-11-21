import { DeviceKey, DeviceSpec } from './types';
import { STANDARD_POLE_COUNTS } from './constants';

/**
 * Complete Electrical Device Catalog with standard dimensions,
 * mounting heights (meters), default unit prices (Quetzales - Q),
 * and electrical symbols for architectural drawings.
 */
export const CATALOG: Record<DeviceKey, DeviceSpec> = {
  light: { label: 'Lámpara/Plafón', z: 2.80, p: 45, sym: 'L', pre: '', sub: '' },
  wall_lamp: { label: 'Lámpara de Pared', z: 2.00, p: 65, sym: 'W', pre: '', sub: '' },
  switch_1: { label: 'Apagador Sencillo', z: 1.20, p: 18, sym: 'S', pre: '', sub: '' },
  switch_2: { label: 'Apagador Doble', z: 1.20, p: 25, sym: 'S', pre: '2', sub: '' },
  switch_3: { label: 'Apagador Triple', z: 1.20, p: 35, sym: 'S', pre: '3', sub: '' },
  switch_3w: { label: 'Apagador 3-Way', z: 1.20, p: 22, sym: 'S', pre: '', sub: '3W' },
  switch_3w_dbl: { label: 'Apag. Doble 3-Way', z: 1.20, p: 45, sym: 'S', pre: '2', sub: '3W' },
  switch_3w_tpl: { label: 'Apag. Triple 3-Way', z: 1.20, p: 60, sym: 'S', pre: '3', sub: '3W' },
  mix_1: { label: 'Mixto (Apag + Toma)', z: 1.20, p: 35, sym: 'M', pre: '', sub: '' },
  mix_3w: { label: 'Mixto (3Way + Toma)', z: 1.20, p: 40, sym: 'M', pre: '', sub: '3W' },
  outlet_120: { label: 'Tomacorriente Doble 120V', z: 0.40, p: 20, sym: 'T', pre: '', sub: '' },
  outlet_240: { label: 'Tomacorriente 240V', z: 0.40, p: 45, sym: 'T', pre: '', sub: '240' },
  shower: { label: 'Ducha Eléctrica', z: 1.80, p: 250, sym: 'D', pre: '', sub: '' },
  heater: { label: 'Calentador de Paso', z: 1.50, p: 800, sym: 'C', pre: '', sub: '' },
  pump: { label: 'Bomba de Agua', z: 0.20, p: 600, sym: 'B', pre: '', sub: '' },
  doorbell: { label: 'Timbre (Campana)', z: 2.20, p: 80, sym: 'TIM', pre: '', sub: '' },
  push_btn: { label: 'Pulsador de Timbre', z: 1.20, p: 15, sym: 'P', pre: '', sub: '' },
  panel: { label: 'Tablero de Distribución', z: 1.75, p: 850, sym: 'TAB', pre: '', sub: '' },
  meter: { label: 'Contador Eléctrico', z: 1.70, p: 400, sym: 'KWH', pre: '', sub: '' },
  tv: { label: 'Toma de TV / Cable', z: 0.40, p: 25, sym: 'TV', pre: '', sub: '' },
  internet: { label: 'Toma de Internet', z: 0.40, p: 30, sym: 'RJ', pre: '', sub: '' }
};

/**
 * Standard conduit default prices.
 */
export const DEFAULT_CONDUIT_PRICES: Record<string, number> = {
  'tub_pvc_1/2': 15,
  'tub_pvc_3/4': 20,
  'tub_pvc_1': 28
};

/**
 * Standard junction box cover default prices.
 */
export const DEFAULT_COVER_PRICES: Record<string, number> = {
  tapa_oct: 8,
  tapa_rect: 8,
  tapa_sq: 10
};

/**
 * Generates the full set of default global prices including
 * catalog devices, distribution panels (1 to 16 poles),
 * PVC conduits, cables (AWG, SPT, TSJ, UTP), and box covers.
 */
export function getDefaultGlobalPrices(): Record<string, number> {
  const prices: Record<string, number> = {};

  // 1. Catalog devices
  for (const key of Object.keys(CATALOG) as DeviceKey[]) {
    prices[key] = CATALOG[key].p;
  }

  // 2. Conduits
  Object.assign(prices, DEFAULT_CONDUIT_PRICES);

  // 3. Covers
  Object.assign(prices, DEFAULT_COVER_PRICES);

  // 4. Distribution panels (formula: 600 + poles * 100)
  for (const poles of STANDARD_POLE_COUNTS) {
    prices[`panel_${poles}`] = 600 + poles * 100;
  }

  // 5. Conductors / Cables
  const awgGauges = ['14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0'];
  for (const g of awgGauges) {
    prices[`cable_AWG_${g}`] = 5;
  }

  const sptGauges = ['22', '20', '18', '16', '14', '12'];
  for (const g of sptGauges) {
    prices[`cable_SPT_${g}`] = 5;
  }

  for (let conductors = 2; conductors <= 4; conductors++) {
    for (let gauge = 8; gauge <= 18; gauge += 2) {
      prices[`cable_TSJ_${conductors}x${gauge}`] = 5;
    }
  }

  prices['cable_UTP_Cat5e'] = 5;
  prices['cable_UTP_Cat6'] = 5;

  return prices;
}

/**
 * Maps any item key (device, cable, panel, conduit, cover) to its human-readable Spanish label.
 */
export function getReadableItemLabel(key: string): string {
  if (key.startsWith('panel_')) {
    const poles = key.split('_')[1];
    return `Tablero Distribución ${poles} Polos`;
  }
  if (key in CATALOG) {
    return CATALOG[key as DeviceKey].label;
  }
  if (key.startsWith('cable_')) {
    const parts = key.split('_');
    const cableType = parts[1];
    const gauge = parts[2];
    return `Cable ${cableType} Calibre ${gauge}`;
  }
  if (key === 'tapa_oct') return 'Tapadera Octagonal (Ciega)';
  if (key === 'tapa_rect') return 'Tapadera Rectangular (Ciega)';
  if (key === 'tapa_sq') return 'Tapadera Cuadrada (Ciega)';
  if (key === 'tub_pvc_1/2') return 'Tubería PVC 1/2"';
  if (key === 'tub_pvc_3/4') return 'Tubería PVC 3/4"';
  if (key === 'tub_pvc_1') return 'Tubería PVC 1"';

  return key;
}
