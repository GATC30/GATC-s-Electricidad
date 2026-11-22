/**
 * Schema and integrity validation for .gatc project files and payloads (BUG-10).
 * Prevents app crashes from malformed, tampered, or partial JSON imports.
 */

import {
  ProjectState,
  Phase,
  Wall,
  Box,
  Tube,
  Route,
  ProjectConfig,
  BoxType,
  DeviceKey,
  CustomMaterial,
  Point
} from '../engine/types';
import { DEFAULT_WALL_WIDTH, DEFAULT_WALL_HEIGHT } from '../engine/constants';
import { sanitizeProjectName, sanitizeLabel, sanitizeText } from '../utils/sanitize';
import { generateId } from '../utils/math';
import { detectSchemaVersion, migrateProjectState } from './schema-version';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedState?: ProjectState;
  projectId?: string;
  projectName?: string;
  detectedVersion?: '1.5' | '2.0';
  wasMigrated?: boolean;
}

const VALID_BOX_TYPES: Set<string> = new Set([
  'box_oct',
  'box_rect',
  'box_sq',
  'door',
  'window',
  'stairs'
]);

function isNumber(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val) && isFinite(val);
}

function isString(val: unknown): val is string {
  return typeof val === 'string';
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Validates a Wall element.
 */
function validateWall(w: unknown, idx: number, errors: string[]): Wall | null {
  if (!isObject(w)) {
    errors.push(`Pared en índice ${idx} no es un objeto válido`);
    return null;
  }

  if (!isNumber(w.x1) || !isNumber(w.y1) || !isNumber(w.x2) || !isNumber(w.y2)) {
    errors.push(`Pared "${w.id || idx}" tiene coordenadas inválidas`);
    return null;
  }

  const lengthM = isNumber(w.lengthM) && w.lengthM > 0
    ? w.lengthM
    : +(Math.hypot(w.x2 - w.x1, w.y2 - w.y1) / 40).toFixed(2);

  return {
    id: isString(w.id) && w.id.trim() ? w.id : generateId('wall'),
    lvl: isNumber(w.lvl) ? Math.max(1, Math.floor(w.lvl)) : 1,
    x1: w.x1,
    y1: w.y1,
    x2: w.x2,
    y2: w.y2,
    lengthM,
    heightM: isNumber(w.heightM) && w.heightM > 0 ? w.heightM : DEFAULT_WALL_HEIGHT,
    wW: isNumber(w.wW) && w.wW > 0 ? w.wW : DEFAULT_WALL_WIDTH,
    locked: Boolean(w.locked),
    detached: Boolean(w.detached),
    n1F: Boolean(w.n1F),
    n2F: Boolean(w.n2F)
  };
}

/**
 * Validates a Box / architectural element.
 */
function validateBox(b: unknown, idx: number, errors: string[]): Box | null {
  if (!isObject(b)) {
    errors.push(`Caja/Elemento en índice ${idx} no es un objeto válido`);
    return null;
  }

  if (!isNumber(b.x) || !isNumber(b.y)) {
    errors.push(`Caja "${b.id || idx}" tiene coordenadas (x,y) inválidas`);
    return null;
  }

  const type = isString(b.type) && VALID_BOX_TYPES.has(b.type)
    ? (b.type as BoxType)
    : 'box_oct';

  const dimObj = isObject(b.dim) ? b.dim : {};
  const dim = {
    w: isNumber(dimObj.w) && dimObj.w > 0 ? dimObj.w : 16,
    h: isNumber(dimObj.h) && dimObj.h > 0 ? dimObj.h : 12
  };

  return {
    id: isString(b.id) && b.id.trim() ? b.id : generateId('box'),
    lvl: isNumber(b.lvl) ? Math.max(1, Math.floor(b.lvl)) : 1,
    type,
    x: b.x,
    y: b.y,
    z: isNumber(b.z) ? b.z : 0.4,
    zH: isNumber(b.zH) ? b.zH : null,
    dim,
    rot: isNumber(b.rot) ? (b.rot % 360 + 360) % 360 : 0,
    device: isString(b.device) && b.device ? (b.device as DeviceKey) : null,
    label: isString(b.label) ? sanitizeLabel(b.label) : undefined,
    locked: Boolean(b.locked),
    circs: isNumber(b.circs) ? Math.max(1, Math.min(64, Math.floor(b.circs))) : undefined
  };
}

/**
 * Validates a Tube element.
 */
function validateTube(t: unknown, idx: number, errors: string[]): Tube | null {
  if (!isObject(t)) {
    errors.push(`Tubería en índice ${idx} no es un objeto válido`);
    return null;
  }

  if (!isString(t.startId) || !isString(t.endId)) {
    errors.push(`Tubería "${t.id || idx}" carece de startId o endId`);
    return null;
  }

  const rawPts = Array.isArray(t.pts) ? t.pts : [];
  const validPts: Point[] = [];
  rawPts.forEach((pt: unknown) => {
    if (isObject(pt) && isNumber(pt.x) && isNumber(pt.y)) {
      validPts.push({ x: pt.x, y: pt.y });
    }
  });

  const validPlacements = ['techo', 'pared', 'suelo'];
  const place = isString(t.place) && validPlacements.includes(t.place)
    ? (t.place as 'techo' | 'pared' | 'suelo')
    : 'techo';

  return {
    id: isString(t.id) && t.id.trim() ? t.id : generateId('tube'),
    lvl: isNumber(t.lvl) ? Math.max(1, Math.floor(t.lvl)) : 1,
    startId: t.startId,
    endId: t.endId,
    pts: validPts,
    type: isString(t.type) && t.type ? t.type : 'tub_pvc_3/4',
    place
  };
}

/**
 * Validates a Cable Route element.
 */
function validateRoute(r: unknown, idx: number): Route | null {
  if (!isObject(r)) return null;

  const tubes = Array.isArray(r.tubes)
    ? r.tubes.filter((id: unknown): id is string => isString(id) && Boolean(id.trim()))
    : [];

  const rawCables = Array.isArray(r.cables) ? r.cables : [];
  const cables = rawCables
    .filter((c: unknown): c is Record<string, unknown> => isObject(c))
    .map((c) => ({
      type: (isString(c.type) ? c.type : 'AWG') as any,
      gauge: isString(c.gauge) ? c.gauge : '12',
      color: isString(c.color) ? c.color : '#ef4444'
    }));

  return {
    id: isString(r.id) && r.id.trim() ? r.id : generateId('route'),
    name: isString(r.name) ? sanitizeLabel(r.name, 50) : `Circuito ${idx + 1}`,
    tubes,
    cables
  };
}

/**
 * Validates a Custom Material element.
 */
function validateCustomMaterial(m: unknown): CustomMaterial | null {
  if (!isObject(m)) return null;
  return {
    name: isString(m.name) ? sanitizeText(m.name, 100) : 'Material adicional',
    qty: isNumber(m.qty) && m.qty > 0 ? m.qty : 1,
    price: isNumber(m.price) && m.price >= 0 ? m.price : 0
  };
}

/**
 * Full schema validation for .gatc files and project payloads.
 * Validates walls, boxes, tubes, routes, levels, and config (BUG-10).
 */
export function validateGatcFile(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      errors: ['El archivo no contiene un objeto JSON válido'],
      warnings
    };
  }

  // Detect schema version and run migrations (F9-03, F9-04)
  const schemaVer = detectSchemaVersion(raw);
  const detectedVersion: '1.5' | '2.0' = schemaVer === 1 ? '1.5' : '2.0';
  const { state: migratedState, report } = migrateProjectState(raw);

  if (report.warnings.length > 0) {
    warnings.push(...report.warnings);
  }

  const rawObj = raw as Record<string, unknown>;

  // 1. Project ID & Name
  const projectId = isString(rawObj.id) && rawObj.id.trim()
    ? rawObj.id.trim()
    : generateId('proj');

  const rawName = rawObj.name || (rawObj as any).projectName || (rawObj.state as any)?.name || 'Proyecto Importado';
  const projectName = sanitizeProjectName(rawName);

  const data = migratedState as unknown as Record<string, unknown>;

  // 2. Levels
  let levels: number[] = [1];
  if (Array.isArray(data.levels) && data.levels.length > 0) {
    const validLevels = Array.from(
      new Set(
        data.levels
          .filter((l: unknown): l is number => isNumber(l) && l >= 1)
          .map((l) => Math.floor(l))
      )
    ).sort((a, b) => a - b);

    if (validLevels.length > 0) {
      levels = validLevels;
    } else {
      warnings.push('Lista de niveles inválida, se inicializó con nivel 1');
    }
  }

  const currentLevel = isNumber(data.lvlId) && levels.includes(data.lvlId)
    ? data.lvlId
    : levels[0];

  // 3. Project Config
  const rawPConf = isObject(data.pConf) ? data.pConf : {};
  const pConf: ProjectConfig = {
    wW: isNumber(rawPConf.wW) && rawPConf.wW > 0 ? rawPConf.wW : DEFAULT_WALL_WIDTH,
    wH: isNumber(rawPConf.wH) && rawPConf.wH > 0 ? rawPConf.wH : DEFAULT_WALL_HEIGHT
  };

  // 4. Walls
  const walls: Wall[] = [];
  if (Array.isArray(data.walls)) {
    data.walls.forEach((w: unknown, idx: number) => {
      const validated = validateWall(w, idx, errors);
      if (validated) walls.push(validated);
    });
  } else if (data.walls !== undefined) {
    warnings.push('La propiedad "walls" no es un array, se inicializó vacía');
  }

  // 5. Boxes
  const boxes: Box[] = [];
  if (Array.isArray(data.boxes)) {
    data.boxes.forEach((b: unknown, idx: number) => {
      const validated = validateBox(b, idx, errors);
      if (validated) boxes.push(validated);
    });
  } else if (data.boxes !== undefined) {
    warnings.push('La propiedad "boxes" no es un array, se inicializó vacía');
  }

  // 6. Tubes
  const tubes: Tube[] = [];
  if (Array.isArray(data.tubes)) {
    data.tubes.forEach((t: unknown, idx: number) => {
      const validated = validateTube(t, idx, errors);
      if (validated) tubes.push(validated);
    });
  } else if (data.tubes !== undefined) {
    warnings.push('La propiedad "tubes" no es un array, se inicializó vacía');
  }

  // 7. Routes
  const routes: Route[] = [];
  if (Array.isArray(data.routes)) {
    data.routes.forEach((r: unknown, idx: number) => {
      const validated = validateRoute(r, idx);
      if (validated) routes.push(validated);
    });
  }

  // 8. Custom Materials
  const customMats: CustomMaterial[] = [];
  if (Array.isArray(data.customMats)) {
    data.customMats.forEach((m: unknown) => {
      const validated = validateCustomMaterial(m);
      if (validated) customMats.push(validated);
    });
  }

  // 9. Overrides & Prices
  const overrides: Record<string, number> = {};
  if (isObject(data.overrides)) {
    Object.entries(data.overrides).forEach(([k, v]) => {
      if (isNumber(v)) overrides[k] = v;
    });
  }

  const prices: Record<string, number> = {};
  if (isObject(data.prices)) {
    Object.entries(data.prices).forEach(([k, v]) => {
      if (isNumber(v)) prices[k] = v;
    });
  }

  const sanitizedState: ProjectState = {
    phase: (isNumber(data.phase) && data.phase >= 1 && data.phase <= 4 ? data.phase : 1) as Phase,
    lvlId: currentLevel,
    levels,
    is3D: false,
    tool: 'select',
    showDims: data.showDims !== false,
    showRulers: Boolean(data.showRulers),
    pConf,
    walls,
    boxes,
    tubes,
    routes,
    customMats,
    overrides,
    prices,
    recentColors: Array.isArray(data.recentColors)
      ? data.recentColors.filter((c: unknown): c is string => isString(c))
      : []
  };

  // Determine if valid: file must be structurally recognizable
  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    sanitizedState,
    projectId,
    projectName,
    detectedVersion,
    wasMigrated: report.migrated
  };
}
