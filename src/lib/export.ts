/**
 * GATC Project Export and File Serialization Utilities (export.ts)
 * Implements F7-05: Standardized project file export (.gatc JSON) and serialization.
 */

import { ProjectState } from '@/engine/types';
import { sanitizeProjectName } from '@/utils/sanitize';

export interface GatcFileFormat {
  version: string;
  name: string;
  exportedAt: string;
  state: ProjectState;
}

/**
 * Serializes and triggers a client-side download of a .gatc project file (F7-05).
 */
export function exportProject(projectName: string, state: ProjectState): void {
  try {
    const cleanName = sanitizeProjectName(projectName);
    const safeFilename = cleanName.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '_');

    const filePayload: GatcFileFormat = {
      version: '2.0',
      name: cleanName,
      exportedAt: new Date().toISOString(),
      state: {
        phase: state.phase || 1,
        lvlId: state.lvlId || 1,
        levels: state.levels || [1],
        is3D: false,
        tool: 'select',
        showDims: state.showDims !== false,
        showRulers: Boolean(state.showRulers),
        pConf: state.pConf || { wW: 0.2, wH: 2.8 },
        walls: state.walls || [],
        boxes: state.boxes || [],
        tubes: state.tubes || [],
        routes: state.routes || [],
        customMats: state.customMats || [],
        overrides: state.overrides || {},
        prices: state.prices || {},
        recentColors: state.recentColors || []
      }
    };

    const jsonString = JSON.stringify(filePayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeFilename}.gatc`;
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 200);
  } catch (error) {
    console.error('Error al exportar archivo .gatc:', error);
    throw error;
  }
}
