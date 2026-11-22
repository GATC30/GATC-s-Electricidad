/**
 * GATC Legacy Data Migration Engine (v1.5 -> v2.0) - F9-01
 * 
 * Inspects localStorage for legacy GATC v1.5 data:
 * - ecad_projects_index
 * - ecad_data_*
 * - ecad_global_prices
 * - ecad_p1, ecad_p2, ecad_p3 (legacy slots)
 * - ecad_global_names
 * 
 * Transforms data through schema-version.ts and safely imports it into IndexedDB / storageAdapter.
 */

import { storageAdapter } from './storage';
import { migrateProjectState } from './schema-version';
import { sanitizeProjectName } from '../utils/sanitize';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';
import { ProjectState } from '../engine/types';

export const MIGRATION_FLAG_KEY = 'gatc_legacy_migrated';
export const DISMISS_FLAG_KEY = 'gatc_legacy_dismissed';

export interface LegacyProjectSummary {
  id: string;
  name: string;
  updated: number;
  sourceKey: string;
  wallsCount: number;
  boxesCount: number;
  circuitsCount: number;
}

export interface LegacyDetectionResult {
  hasLegacyData: boolean;
  isMigrated: boolean;
  isDismissed: boolean;
  projectCount: number;
  projects: LegacyProjectSummary[];
  hasGlobalPrices: boolean;
  globalPricesCount: number;
}

export interface MigrationResult {
  success: boolean;
  migratedProjects: number;
  migratedPrices: number;
  errors: string[];
  warnings: string[];
}

/**
 * Inspects localStorage to detect whether legacy v1.5 data exists.
 */
export function detectLegacyData(): LegacyDetectionResult {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      hasLegacyData: false,
      isMigrated: false,
      isDismissed: false,
      projectCount: 0,
      projects: [],
      hasGlobalPrices: false,
      globalPricesCount: 0
    };
  }

  const isMigrated = localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
  const isDismissed = localStorage.getItem(DISMISS_FLAG_KEY) === 'true';

  const projects: LegacyProjectSummary[] = [];
  const processedIds = new Set<string>();

  // 1. Check ecad_projects_index
  const rawIndex = safeGetItem<any[]>('ecad_projects_index', []);
  if (Array.isArray(rawIndex)) {
    rawIndex.forEach((item) => {
      if (!item || !item.id || processedIds.has(item.id)) return;
      const dataKey = `ecad_data_${item.id}`;
      const rawData = safeGetItem<any>(dataKey);

      processedIds.add(item.id);
      projects.push({
        id: item.id,
        name: sanitizeProjectName(item.name || 'Proyecto Antiguo'),
        updated: typeof item.updated === 'number' ? item.updated : Date.now(),
        sourceKey: dataKey,
        wallsCount: Array.isArray(rawData?.walls) ? rawData.walls.length : 0,
        boxesCount: Array.isArray(rawData?.boxes) ? rawData.boxes.length : 0,
        circuitsCount: Array.isArray(rawData?.routes) ? rawData.routes.length : 0
      });
    });
  }

  // 2. Check legacy slot keys (ecad_p1, ecad_p2, ecad_p3)
  const legacyNames = safeGetItem<Record<string, string>>('ecad_global_names', {});
  [1, 2, 3].forEach((slot) => {
    const slotKey = `ecad_p${slot}`;
    const slotData = safeGetItem<any>(slotKey);
    if (slotData) {
      const slotId = `legacy_slot_${slot}`;
      if (!processedIds.has(slotId)) {
        processedIds.add(slotId);
        projects.push({
          id: slotId,
          name: sanitizeProjectName(legacyNames[String(slot)] || `Proyecto ${slot} (Slot Antiguo)`),
          updated: Date.now(),
          sourceKey: slotKey,
          wallsCount: Array.isArray(slotData.walls) ? slotData.walls.length : 0,
          boxesCount: Array.isArray(slotData.boxes) ? slotData.boxes.length : 0,
          circuitsCount: Array.isArray(slotData.routes) ? slotData.routes.length : 0
        });
      }
    }
  });

  // 3. Scan for any unindexed ecad_data_* keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ecad_data_')) {
        const id = key.replace('ecad_data_', '');
        if (!processedIds.has(id)) {
          processedIds.add(id);
          const rawData = safeGetItem<any>(key);
          projects.push({
            id,
            name: sanitizeProjectName(`Proyecto Recuperado (${id.slice(0, 8)})`),
            updated: Date.now(),
            sourceKey: key,
            wallsCount: Array.isArray(rawData?.walls) ? rawData.walls.length : 0,
            boxesCount: Array.isArray(rawData?.boxes) ? rawData.boxes.length : 0,
            circuitsCount: Array.isArray(rawData?.routes) ? rawData.routes.length : 0
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Migration] Error scanning localStorage keys:', err);
  }

  // 4. Check global prices
  const rawGlobalPrices = safeGetItem<Record<string, number>>('ecad_global_prices', null);
  const hasGlobalPrices = Boolean(rawGlobalPrices && Object.keys(rawGlobalPrices).length > 0);
  const globalPricesCount = hasGlobalPrices ? Object.keys(rawGlobalPrices!).length : 0;

  const hasLegacyData = projects.length > 0 || hasGlobalPrices;

  return {
    hasLegacyData,
    isMigrated,
    isDismissed,
    projectCount: projects.length,
    projects,
    hasGlobalPrices,
    globalPricesCount
  };
}

/**
 * Executes full migration from legacy v1.5 storage into GATC v2.0 storage.
 */
export async function migrateLegacyData(): Promise<MigrationResult> {
  const detection = detectLegacyData();
  const errors: string[] = [];
  const warnings: string[] = [];
  let migratedProjects = 0;
  let migratedPrices = 0;

  if (!detection.hasLegacyData) {
    return {
      success: true,
      migratedProjects: 0,
      migratedPrices: 0,
      errors,
      warnings: ['No se encontraron datos legacy para migrar.']
    };
  }

  // 1. Migrate each detected project
  for (const projMeta of detection.projects) {
    try {
      const rawData = safeGetItem<any>(projMeta.sourceKey);
      if (!rawData) {
        warnings.push(`Datos vacíos para proyecto ${projMeta.name} (${projMeta.id})`);
        continue;
      }

      // Upgrade project through schema version migration
      const { state: migratedState, report } = migrateProjectState(rawData);

      if (report.warnings.length > 0) {
        warnings.push(...report.warnings.map((w) => `[${projMeta.name}]: ${w}`));
      }

      // Save into dual storage (IndexedDB + API sync queue)
      await storageAdapter.saveProject(projMeta.id, projMeta.name, migratedState);
      migratedProjects++;
    } catch (err: any) {
      const msg = `Error migrando proyecto "${projMeta.name}": ${err?.message || err}`;
      console.error(msg, err);
      errors.push(msg);
    }
  }

  // 2. Migrate global prices
  if (detection.hasGlobalPrices) {
    try {
      const rawPrices = safeGetItem<Record<string, number>>('ecad_global_prices', {});
      if (rawPrices && typeof rawPrices === 'object') {
        // Save to v2 global prices storage
        safeSetItem('gatc_global_prices', rawPrices);
        migratedPrices = Object.keys(rawPrices).length;
      }
    } catch (err: any) {
      errors.push(`Error migrando precios globales: ${err?.message || err}`);
    }
  }

  // 3. Mark as successfully migrated
  safeSetItem(MIGRATION_FLAG_KEY, 'true');
  safeRemoveItem(DISMISS_FLAG_KEY);

  return {
    success: errors.length === 0,
    migratedProjects,
    migratedPrices,
    errors,
    warnings
  };
}

/**
 * Dismisses the migration prompt so the user isn't prompted again unless requested.
 */
export function dismissLegacyMigration(): void {
  safeSetItem(DISMISS_FLAG_KEY, 'true');
}

/**
 * Resets the migration flags (useful for re-running migration or QA testing).
 */
export function resetMigrationStatus(): void {
  safeRemoveItem(MIGRATION_FLAG_KEY);
  safeRemoveItem(DISMISS_FLAG_KEY);
}
