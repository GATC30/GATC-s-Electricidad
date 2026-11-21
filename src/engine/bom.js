import {
  SCALE,
  CABLE_TERMINAL_EXTRA_METERS,
  CABLE_PASS_EXTRA_METERS,
  COLOR_CODE_MAP
} from './constants.js';
import { getDefaultGlobalPrices, getReadableItemLabel } from './catalog.js';

export function calculateTubeLengthMeters(tube, startBox, endBox, pConf, scale = SCALE) {
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

export function calculateConduitSummary(tubes, boxes, pConf, scale = SCALE) {
  const boxMap = new Map(boxes.map(b => [b.id, b]));
  const lengthsByType = {
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

export function calculateBOM(state, globalPrices = null) {
  const effectiveGlobalPrices = globalPrices || getDefaultGlobalPrices();
  const boxMap = new Map(state.boxes.map(b => [b.id, b]));
  const tubeMap = new Map(state.tubes.map(t => [t.id, t]));

  const rawQuantities = {};

  // 1. Dispositivos y Tapaderas
  for (const box of state.boxes) {
    if (box.device) {
      const itemKey = box.device === 'panel' ? `panel_${box.circs || 2}` : box.device;
      rawQuantities[itemKey] = (rawQuantities[itemKey] || 0) + 1;
    } else if (box.type && box.type.startsWith('box_')) {
      const coverMap = {
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

  // 2. Cables
  const cableLengthsMap = {};

  for (const route of state.routes) {
    let routeDistanceMeters = 0;
    const boxConnectionCount = {};

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

  for (const key of Object.keys(cableLengthsMap)) {
    rawQuantities[key] = Math.ceil(cableLengthsMap[key]);
  }

  // 3. Totales y Precios
  const items = [];
  let totalCost = 0;

  const overrides = state.overrides || {};
  const prices = state.prices || {};
  const allKeys = Array.from(new Set([...Object.keys(rawQuantities), ...Object.keys(overrides)]));

  for (const key of allKeys.sort()) {
    const calculatedQty = Math.ceil(rawQuantities[key] || 0);
    const finalQty = overrides[key] !== undefined ? overrides[key] : calculatedQty;

    if (finalQty <= 0 && calculatedQty <= 0) continue;

    let priceKey = key;
    let colorHex = undefined;
    let colorCode = undefined;

    if (key.startsWith('cable_')) {
      const parts = key.split('_');
      priceKey = `cable_${parts[1]}_${parts[2]}`;
      colorHex = parts[3];
      colorCode = colorHex ? COLOR_CODE_MAP[colorHex] || '-' : undefined;
    }

    const unitPrice = prices[priceKey] !== undefined
      ? prices[priceKey]
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
