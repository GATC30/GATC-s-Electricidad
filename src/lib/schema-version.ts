/**
 * GATC Schema Versioning and Incremental Migration System (F9-03)
 * 
 * Provides robust version tracking and forward migrations for project states.
 * - Version 1: Legacy GATC v1.5 flat JSON structure (unversioned).
 * - Version 2: GATC v2.0 strict TypeScript structure (multi-level, sanitized, UUIDs).
 */

import {
  ProjectState,
  Wall,
  Box,
  BoxType,
  DeviceKey,
  Tube,
  Route,
  ProjectConfig,
  CustomMaterial
} from '../engine/types';
import {
  DEFAULT_WALL_WIDTH,
  DEFAULT_WALL_HEIGHT
} from '../engine/constants';
import { sanitizeProjectName, sanitizeLabel, sanitizeText } from '../utils/sanitize';
import { generateId } from '../utils/math';

export const CURRENT_SCHEMA_VERSION = 2;

export interface MigrationReport {
  originalVersion: number;
  finalVersion: number;
  migrated: boolean;
  warnings: string[];
}

export interface VersionedProjectPayload {
  schemaVersion?: number;
  version?: string;
  name?: string;
  exportedAt?: string;
  state?: any;
  [key: string]: any;
}

/**
 * Detects the schema version of a project state or file payload.
 * - Returns 2 for GATC v2.0 payloads.
 * - Returns 1 for legacy GATC v1.5 payloads.
 * - Returns 0 for unrecognized or invalid payloads.
 */
export function detectSchemaVersion(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;

  const obj = raw as Record<string, any>;

  // Explicit schemaVersion tag
  if (typeof obj.schemaVersion === 'number') {
    return obj.schemaVersion;
  }

  // Version 2.0 wrapper ({ version: '2.0', state: { ... } })
  if (obj.version === '2.0' || (obj.state && typeof obj.state === 'object')) {
    return 2;
  }

  // Legacy v1.5 format: flat object with walls/boxes or ecad fields
  if (Array.isArray(obj.walls) || Array.isArray(obj.boxes) || obj.lvlId !== undefined) {
    return 1;
  }

  return 0;
}

/**
 * Migrates a legacy GATC v1.5 project state into GATC v2.0 format.
 */
export function migrateV1toV2(rawV1: Record<string, any>, warnings: string[] = []): ProjectState {
  const data = rawV1.state && typeof rawV1.state === 'object' ? rawV1.state : rawV1;

  // 1. Levels normalization
  let levels: number[] = [1];
  if (Array.isArray(data.levels) && data.levels.length > 0) {
    const parsedLevels: number[] = Array.from(
      new Set(
        data.levels
          .filter((l: any) => typeof l === 'number' && !isNaN(l) && l >= 1)
          .map((l: number) => Math.floor(l))
      )
    );
    parsedLevels.sort((a, b) => a - b);

    if (parsedLevels.length > 0) {
      levels = parsedLevels;
    }
  }

  const lvlId = typeof data.lvlId === 'number' && levels.includes(data.lvlId)
    ? data.lvlId
    : levels[0];

  // 2. Project Config
  const rawPConf = data.pConf || {};
  const pConf: ProjectConfig = {
    wW: typeof rawPConf.wW === 'number' && rawPConf.wW > 0 ? rawPConf.wW : DEFAULT_WALL_WIDTH,
    wH: typeof rawPConf.wH === 'number' && rawPConf.wH > 0 ? rawPConf.wH : DEFAULT_WALL_HEIGHT
  };

  // 3. Walls migration
  const walls: Wall[] = [];
  if (Array.isArray(data.walls)) {
    data.walls.forEach((w: any, idx: number) => {
      if (!w || typeof w !== 'object') return;
      const x1 = typeof w.x1 === 'number' ? w.x1 : 0;
      const y1 = typeof w.y1 === 'number' ? w.y1 : 0;
      const x2 = typeof w.x2 === 'number' ? w.x2 : 0;
      const y2 = typeof w.y2 === 'number' ? w.y2 : 0;
      const lengthM = typeof w.lengthM === 'number' && w.lengthM > 0
        ? w.lengthM
        : +(Math.hypot(x2 - x1, y2 - y1) / 40).toFixed(2);

      walls.push({
        id: typeof w.id === 'string' && w.id.trim() ? w.id : generateId('wall'),
        lvl: typeof w.lvl === 'number' ? Math.max(1, Math.floor(w.lvl)) : 1,
        x1,
        y1,
        x2,
        y2,
        lengthM,
        heightM: typeof w.heightM === 'number' && w.heightM > 0 ? w.heightM : DEFAULT_WALL_HEIGHT,
        wW: typeof w.wW === 'number' && w.wW > 0 ? w.wW : DEFAULT_WALL_WIDTH,
        locked: Boolean(w.locked)
      });
    });
  } else {
    warnings.push('v1.5: No se encontraron paredes o estructura inválida.');
  }

  // 4. Boxes migration
  const boxes: Box[] = [];
  if (Array.isArray(data.boxes)) {
    data.boxes.forEach((b: any) => {
      if (!b || typeof b !== 'object') return;
      const x = typeof b.x === 'number' ? b.x : 0;
      const y = typeof b.y === 'number' ? b.y : 0;

      // Handle legacy device array format (strings or objects)
      const devices: string[] = [];
      if (Array.isArray(b.devices)) {
        b.devices.forEach((d: any) => {
          if (typeof d === 'string' && d.trim()) {
            devices.push(d.trim());
          } else if (d && typeof d === 'object' && typeof d.type === 'string') {
            devices.push(d.type);
          }
        });
      }

      const primaryDevice = devices[0] as DeviceKey | undefined;

      boxes.push({
        id: typeof b.id === 'string' && b.id.trim() ? b.id : generateId('box'),
        lvl: typeof b.lvl === 'number' ? Math.max(1, Math.floor(b.lvl)) : 1,
        x,
        y,
        z: typeof b.h === 'number' ? b.h : (typeof b.z === 'number' ? b.z : 0.40),
        type: typeof b.type === 'string' ? (b.type as BoxType) : 'box_oct',
        dim: b.dim || { w: 0.1, h: 0.1 },
        rot: typeof b.rot === 'number' ? b.rot : 0,
        device: primaryDevice || null,
        label: typeof b.label === 'string' ? sanitizeLabel(b.label, 50) : ''
      });
    });
  }

  // 5. Tubes migration
  const tubes: Tube[] = [];
  if (Array.isArray(data.tubes)) {
    data.tubes.forEach((t: any) => {
      if (!t || typeof t !== 'object') return;
      tubes.push({
        id: typeof t.id === 'string' && t.id.trim() ? t.id : generateId('tube'),
        lvl: typeof t.lvl === 'number' ? Math.max(1, Math.floor(t.lvl)) : 1,
        startId: typeof t.startId === 'string' ? t.startId : (typeof t.box1Id === 'string' ? t.box1Id : ''),
        endId: typeof t.endId === 'string' ? t.endId : (typeof t.box2Id === 'string' ? t.box2Id : ''),
        type: typeof t.type === 'string' ? t.type : 'tub_pvc_3/4',
        place: (t.place === 'techo' || t.place === 'pared' || t.place === 'suelo') ? t.place : 'techo',
        pts: Array.isArray(t.pts)
          ? t.pts.filter((p: any) => p && typeof p.x === 'number' && typeof p.y === 'number')
          : []
      });
    });
  }

  // 6. Routes / Circuits migration
  const routes: Route[] = [];
  if (Array.isArray(data.routes)) {
    data.routes.forEach((r: any, idx: number) => {
      if (!r || typeof r !== 'object') return;
      const rTubes = Array.isArray(r.tubes)
        ? r.tubes.filter((tid: any) => typeof tid === 'string')
        : [];
      const cables = Array.isArray(r.cables)
        ? r.cables.map((c: any) => ({
            type: typeof c.type === 'string' ? c.type : 'AWG',
            gauge: typeof c.gauge === 'string' ? c.gauge : '12',
            color: typeof c.color === 'string' ? c.color : '#ef4444'
          }))
        : [];

      routes.push({
        id: typeof r.id === 'string' && r.id.trim() ? r.id : generateId('route'),
        name: typeof r.name === 'string' ? sanitizeLabel(r.name, 50) : `Circuito ${idx + 1}`,
        tubes: rTubes,
        cables
      });
    });
  }

  // 7. Custom Materials
  const customMats: CustomMaterial[] = [];
  if (Array.isArray(data.customMats)) {
    data.customMats.forEach((m: any) => {
      if (!m || typeof m !== 'object') return;
      customMats.push({
        name: typeof m.name === 'string' ? sanitizeText(m.name, 100) : 'Material adicional',
        qty: typeof m.qty === 'number' && m.qty > 0 ? m.qty : 1,
        price: typeof m.price === 'number' && m.price >= 0 ? m.price : 0
      });
    });
  }

  // 8. Overrides & Prices
  const overrides: Record<string, number> = {};
  if (data.overrides && typeof data.overrides === 'object') {
    Object.entries(data.overrides).forEach(([k, v]) => {
      if (typeof v === 'number') overrides[k] = v;
    });
  }

  const prices: Record<string, number> = {};
  if (data.prices && typeof data.prices === 'object') {
    Object.entries(data.prices).forEach(([k, v]) => {
      if (typeof v === 'number') prices[k] = v;
    });
  }

  const recentColors = Array.isArray(data.recentColors)
    ? data.recentColors.filter((c: any) => typeof c === 'string')
    : [];

  return {
    phase: typeof data.phase === 'number' && data.phase >= 1 && data.phase <= 4 ? data.phase : 1,
    lvlId,
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
    recentColors
  };
}

/**
 * Pipeline of incremental migrations between versions.
 */
const MIGRATION_PIPELINE: Record<number, (data: any, warnings: string[]) => any> = {
  1: migrateV1toV2
};

/**
 * Automatically applies incremental forward migrations to bring any legacy or current project payload
 * to the latest schema version (CURRENT_SCHEMA_VERSION).
 */
export function migrateProjectState(raw: unknown): {
  state: ProjectState;
  report: MigrationReport;
} {
  const warnings: string[] = [];
  let detected = detectSchemaVersion(raw);

  if (detected === 0) {
    warnings.push('Formato no reconocido formalmente, intentando adaptación genérica v1.');
    detected = 1;
  }

  const originalVersion = detected;
  let currentData = raw;
  let currentVer = detected;

  // Run pipeline step-by-step
  while (currentVer < CURRENT_SCHEMA_VERSION) {
    const migrator = MIGRATION_PIPELINE[currentVer];
    if (!migrator) {
      warnings.push(`No hay migrador registrado para avanzar desde la versión ${currentVer}`);
      break;
    }
    currentData = migrator(currentData, warnings);
    currentVer++;
  }

  // If already at or migrated to version 2, extract sanitized state if wrapped
  let finalState: ProjectState;
  if (currentVer >= 2 && currentData && typeof currentData === 'object' && (currentData as any).state) {
    finalState = (currentData as any).state as ProjectState;
  } else {
    finalState = currentData as ProjectState;
  }

  return {
    state: finalState,
    report: {
      originalVersion,
      finalVersion: currentVer,
      migrated: originalVersion < currentVer,
      warnings
    }
  };
}
