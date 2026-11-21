import {
  ProjectState,
  ProjectConfig,
  Box,
  Tube,
  BOMItem,
  BOMSummary,
  ConduitType
} from './types';
import {
  SCALE,
  CABLE_TERMINAL_EXTRA_METERS,
  CABLE_PASS_EXTRA_METERS,
  COLOR_CODE_MAP
} from './constants';
import { CATALOG, getDefaultGlobalPrices, getReadableItemLabel } from './catalog';

/**
 * Calculates the exact 3D travel length of a conduit segment in meters,
 * including horizontal distance and vertical drops/rises depending on placement.
 */
export function calculateTubeLengthMeters(
  tube: Tube,
  startBox: Box,
  endBox: Box,
  pConf: ProjectConfig,
  scale: number = SCALE
): number {
  const pts = [
    { x: startBox.x, y: startBox.y },
    ...(tube.pts || []),
    { x: endBox.x, y: endBox.y }
  ];

  let horizontalDistance = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    horizontalDistance += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) / scale;
  }

  const sZ = startBox.z;
  const eZ = endBox.z;

  if (tube.place === 'pared') {
    return Math.hypot(horizontalDistance, sZ - eZ);
  }
  if (tube.place === 'techo') {
    return (pConf.wH - sZ) + horizontalDistance + (pConf.wH - eZ);
  }
  if (tube.place === 'suelo') {
    return (sZ + 0.20) + horizontalDistance + (eZ + 0.20);
  }

  return horizontalDistance;
}

/**
 * Totals all conduit lengths by type in meters across all levels.
 */
export function calculateConduitSummary(
  tubes: Tube[],
  boxes: Box[],
  pConf: ProjectConfig,
  scale: number = SCALE
): { totalMeters: number; lengthsByType: Record<ConduitType, number> } {
  const boxMap = new Map<string, Box>(boxes.map(b => [b.id, b]));
  const lengthsByType: Record<string, number> = {
    'tub_pvc_1/2': 0,
    'tub_pvc_3/4': 0,
    'tub_pvc_1': 0
  };
  let totalMeters = 0;

  for (const tube of tubes) {
    const s = boxMap.get(tube.startId);
    const e = boxMap.get(tube.endId);
    if (!s || !e) continue;

    const len = calculateTubeLengthMeters(tube, s, e, pConf, scale);
    totalMeters += len;
    lengthsByType[tube.type] = (lengthsByType[tube.type] || 0) + len;
  }

  return { totalMeters, lengthsByType };
}

/**
 * Computes the complete Bill of Materials (BOM) and quote estimate
 * based on current project elements, circuits, overrides, and unit prices.
 */
export function calculateBOM(
  state: ProjectState,
  globalPrices?: Record<string, number>
): BOMSummary {
  const effectiveGlobalPrices = globalPrices || getDefaultGlobalPrices();
  const boxMap = new Map<string, Box>(state.boxes.map(b => [b.id, b]));
  const tubeMap = new Map<string, Tube>(state.tubes.map(t => [t.id, t]));

  const rawQuantities: Record<string, number> = {};

  // 1. Accesorios y Tableros Eléctricos
  for (const box of state.boxes) {
    if (box.device) {
      const itemKey = box.device === 'panel' ? `panel_${box.circs || 2}` : box.device;
      rawQuantities[itemKey] = (rawQuantities[itemKey] || 0) + 1;
    } else if (box.type.startsWith('box_')) {
      // Tapaderas ciegas para cajas vacías
      const coverMap: Record<string, string> = {
        box_oct: 'tapa_oct',
        box_rect: 'tapa_rect',
        box_sq: 'tapa_sq'
      };
      const coverKey = coverMap[box.type];
      if (coverKey) {
        rawQuantities[coverKey] = (rawQuantities[coverKey] || 0) + 1;
      }
    }
  }

  // 2. Cables por Circuito con adiciones de ingeniería precisas (+0.20m terminal, +0.10m paso)
  const cableLengthsMap: Record<string, number> = {};

  for (const route of state.routes) {
    let routeDistanceMeters = 0;
    const boxConnectionCount: Record<string, number> = {};

    for (const tubeId of route.tubes) {
      const tube = tubeMap.get(tubeId);
      if (!tube) continue;

      const sBox = boxMap.get(tube.startId);
      const eBox = boxMap.get(tube.endId);
      if (!sBox || !eBox) continue;

      boxConnectionCount[sBox.id] = (boxConnectionCount[sBox.id] || 0) + 1;
      boxConnectionCount[eBox.id] = (boxConnectionCount[eBox.id] || 0) + 1;

      routeDistanceMeters += calculateTubeLengthMeters(tube, sBox, eBox, state.pConf, SCALE);
    }

    // Calcular extras por cajas
    let engineeringExtra = 0;
    for (const count of Object.values(boxConnectionCount)) {
      engineeringExtra += count === 1 ? CABLE_TERMINAL_EXTRA_METERS : CABLE_PASS_EXTRA_METERS;
    }

    const totalRouteRun = routeDistanceMeters + engineeringExtra;

    for (const cable of route.cables) {
      const key = `cable_${cable.type}_${cable.gauge}_${cable.color}`;
      cableLengthsMap[key] = (cableLengthsMap[key] || 0) + totalRouteRun;
    }
  }

  // Redondeo estricto de cables al entero superior (ceiling)
  for (const key of Object.keys(cableLengthsMap)) {
    rawQuantities[key] = Math.ceil(cableLengthsMap[key]);
  }

  // 3. Generar lista de items con overrides y subtotales
  const items: BOMItem[] = [];
  let totalCost = 0;

  const allKeys = Array.from(new Set([...Object.keys(rawQuantities), ...Object.keys(state.overrides)]));

  for (const key of allKeys.sort()) {
    const calculatedQty = Math.ceil(rawQuantities[key] || 0);
    const finalQty = state.overrides[key] !== undefined ? state.overrides[key] : calculatedQty;

    // Solo incluir si la cantidad final es mayor a 0
    if (finalQty <= 0 && calculatedQty <= 0) continue;

    // Obtener clave de precio base (los cables tienen precio por tipo y calibre, independiente del color)
    let priceKey = key;
    let colorHex: string | undefined;
    let colorCode: string | undefined;

    if (key.startsWith('cable_')) {
      const parts = key.split('_');
      priceKey = `cable_${parts[1]}_${parts[2]}`;
      colorHex = parts[3];
      colorCode = colorHex ? COLOR_CODE_MAP[colorHex] || '-' : undefined;
    }

    const unitPrice = state.prices[priceKey] !== undefined
      ? state.prices[priceKey]
      : (effectiveGlobalPrices[priceKey] || 0);

    const subtotal = finalQty * unitPrice;
    totalCost += subtotal;

    items.push({
      key,
      label: getReadableItemLabel(key),
      calculatedQty,
      finalQty,
      unitPrice,
      subtotal,
      unit: key.startsWith('cable_') ? 'm' : 'ud',
      colorHex,
      colorCode
    });
  }

  // 4. Materiales personalizados (Extras / Mano de obra)
  const customMaterials = state.customMats || [];
  for (const cm of customMaterials) {
    totalCost += cm.qty * cm.price;
  }

  return {
    items,
    customMaterials,
    totalCost
  };
}
