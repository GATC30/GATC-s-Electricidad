'use client';

import React, { useState } from 'react';
import { Wall, Box, Tube, ProjectConfig, DeviceKey } from '@/engine/types';
import { CATALOG } from '@/engine/catalog';
import { Button, Input, Select } from '@/components/ui';
import { sanitizeLabel } from '@/utils/sanitize';

export interface PropertiesPanelProps {
  selectedElement: {
    type: 'wall' | 'box' | 'tube' | null;
    element: Wall | Box | Tube | null;
  };
  projectConfig: ProjectConfig;
  elementsCount: {
    walls: number;
    boxes: number;
    tubes: number;
    routes: number;
  };
  onUpdateWall?: (id: string, updates: Partial<Wall>) => void;
  onUpdateBox?: (id: string, updates: Partial<Box>) => void;
  onUpdateTube?: (id: string, updates: Partial<Tube>) => void;
  onUpdateProjectConfig?: (updates: Partial<ProjectConfig>) => void;
  onDeleteElement?: (type: 'wall' | 'box' | 'tube', id: string) => void;
  onZoomToFit?: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  projectConfig,
  elementsCount,
  onUpdateWall,
  onUpdateBox,
  onUpdateTube,
  onUpdateProjectConfig,
  onDeleteElement,
  onZoomToFit
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const { type, element } = selectedElement;

  return (
    <aside
      aria-label="Panel de propiedades"
      className={`bg-slate-900 border-l border-slate-800 z-20 flex flex-col transition-all duration-300 md:w-80 shrink-0 ${
        isMobileExpanded
          ? 'fixed inset-x-0 bottom-0 top-1/3 md:static md:inset-auto md:top-auto shadow-2xl md:shadow-none'
          : 'fixed inset-x-0 bottom-0 h-12 md:static md:inset-auto md:h-auto'
      }`}
    >
      {/* Mobile Handle & Toggle Header */}
      <div
        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        className="flex items-center justify-between p-3 border-b border-slate-800/80 bg-slate-950/40 cursor-pointer md:cursor-default"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {type === 'wall' && 'Pared Seleccionada'}
            {type === 'box' && 'Caja / Dispositivo'}
            {type === 'tube' && 'Tubería PVC'}
            {!type && 'Propiedades del Plano'}
          </h3>
        </div>

        <button
          type="button"
          className="md:hidden text-slate-400 p-1"
          aria-label={isMobileExpanded ? 'Colapsar panel' : 'Expandir panel'}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isMobileExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-200 text-xs">
        {/* CASE 1: WALL SELECTED */}
        {type === 'wall' && element && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">ID de Elemento:</span>
              <span className="font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                {(element as Wall).id.slice(0, 8)}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Longitud (metros)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={(element as Wall).lengthM?.toFixed(2) || '0.00'}
                  onChange={(e) =>
                    onUpdateWall?.((element as Wall).id, {
                      lengthM: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Grosor / Ancho (m)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={(element as Wall).wW ?? projectConfig.wW}
                  onChange={(e) =>
                    onUpdateWall?.((element as Wall).id, {
                      wW: parseFloat(e.target.value) || 0.2
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(element as Wall).n1F || false}
                  onChange={(e) =>
                    onUpdateWall?.((element as Wall).id, { n1F: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300">Fijar Nodo 1 (N1)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(element as Wall).n2F || false}
                  onChange={(e) =>
                    onUpdateWall?.((element as Wall).id, { n2F: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300">Fijar Nodo 2 (N2)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(element as Wall).locked || false}
                  onChange={(e) =>
                    onUpdateWall?.((element as Wall).id, { locked: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300">Bloquear Edición</span>
              </label>
            </div>

            <Button
              variant="danger"
              size="sm"
              className="w-full mt-4"
              onClick={() => onDeleteElement?.('wall', (element as Wall).id)}
            >
              Eliminar Pared
            </Button>
          </div>
        )}

        {/* CASE 2: BOX SELECTED */}
        {type === 'box' && element && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tipo:</span>
              <span className="font-semibold text-slate-200 capitalize">
                {(element as Box).type.replace('_', ' ')}
              </span>
            </div>

            {/* Device catalog selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Dispositivo Eléctrico
              </label>
              <select
                value={(element as Box).device || ''}
                onChange={(e) => {
                  const devKey = (e.target.value || null) as DeviceKey | null;
                  const newZ = devKey && CATALOG[devKey] ? CATALOG[devKey].z : (element as Box).z;
                  onUpdateBox?.((element as Box).id, {
                    device: devKey,
                    z: newZ
                  });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">(Caja Vacía / Sin accesorio)</option>
                {Object.entries(CATALOG).map(([key, spec]) => (
                  <option key={key} value={key}>
                    {spec.label} ({spec.z.toFixed(2)}m - Q{spec.p})
                  </option>
                ))}
              </select>
            </div>

            {/* Height Z */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Altura de Montaje Z (metros)
              </label>
              <input
                type="number"
                step="0.05"
                value={(element as Box).z}
                onChange={(e) =>
                  onUpdateBox?.((element as Box).id, {
                    z: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Rotación: {(element as Box).rot}°
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBox?.((element as Box).id, {
                      rot: (((element as Box).rot || 0) + 90) % 360
                    })
                  }
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  +90°
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={(element as Box).rot || 0}
                onChange={(e) =>
                  onUpdateBox?.((element as Box).id, {
                    rot: parseInt(e.target.value, 10)
                  })
                }
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Circuits if Panel */}
            {(element as Box).device === 'panel' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Polos / Circuitos del Tablero
                </label>
                <select
                  value={(element as Box).circs || 8}
                  onChange={(e) =>
                    onUpdateBox?.((element as Box).id, {
                      circs: parseInt(e.target.value, 10)
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none"
                >
                  {[1, 2, 4, 6, 8, 10, 12, 14, 16].map((p) => (
                    <option key={p} value={p}>
                      {p} Polos
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Label */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Etiqueta / Nombre
              </label>
              <input
                type="text"
                value={(element as Box).label || ''}
                placeholder="Ej. Lámpara Sala, Tablero P1"
                onChange={(e) =>
                  onUpdateBox?.((element as Box).id, {
                    label: sanitizeLabel(e.target.value)
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>

            <Button
              variant="danger"
              size="sm"
              className="w-full mt-4"
              onClick={() => onDeleteElement?.('box', (element as Box).id)}
            >
              Eliminar Elemento
            </Button>
          </div>
        )}

        {/* CASE 3: TUBE SELECTED */}
        {type === 'tube' && element && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">ID Tubería:</span>
              <span className="font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                {(element as Tube).id.slice(0, 8)}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Diámetro PVC
              </label>
              <select
                value={(element as Tube).type}
                onChange={(e) =>
                  onUpdateTube?.((element as Tube).id, {
                    type: e.target.value
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none focus:border-indigo-500"
              >
                <option value="tub_pvc_1/2">Tubería PVC 1/2"</option>
                <option value="tub_pvc_3/4">Tubería PVC 3/4"</option>
                <option value="tub_pvc_1">Tubería PVC 1"</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Ubicación / Tendido
              </label>
              <select
                value={(element as Tube).place}
                onChange={(e) =>
                  onUpdateTube?.((element as Tube).id, {
                    place: e.target.value as any
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none focus:border-indigo-500"
              >
                <option value="techo">Por Techo (Curva Superior)</option>
                <option value="pared">Por Pared (Directo)</option>
                <option value="suelo">Por Suelo / Piso (-0.20m)</option>
              </select>
            </div>

            <Button
              variant="danger"
              size="sm"
              className="w-full mt-4"
              onClick={() => onDeleteElement?.('tube', (element as Tube).id)}
            >
              Eliminar Tubería
            </Button>
          </div>
        )}

        {/* CASE 4: NO SELECTION (CANVAS & PROJECT STATS) */}
        {!type && (
          <div className="space-y-5">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Configuración de Parámetros
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Ancho Base de Pared (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={projectConfig.wW}
                    onChange={(e) =>
                      onUpdateProjectConfig?.({
                        wW: parseFloat(e.target.value) || 0.2
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Altura de Nivel / Pared (m)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={projectConfig.wH}
                    onChange={(e) =>
                      onUpdateProjectConfig?.({
                        wH: parseFloat(e.target.value) || 2.8
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Resumen de Elementos
              </h4>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="block text-sm font-bold text-slate-100">
                    {elementsCount.walls}
                  </span>
                  <span className="text-[10px] text-slate-500">Paredes</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="block text-sm font-bold text-slate-100">
                    {elementsCount.boxes}
                  </span>
                  <span className="text-[10px] text-slate-500">Cajas</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="block text-sm font-bold text-slate-100">
                    {elementsCount.tubes}
                  </span>
                  <span className="text-[10px] text-slate-500">Tuberías</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="block text-sm font-bold text-slate-100">
                    {elementsCount.routes}
                  </span>
                  <span className="text-[10px] text-slate-500">Circuitos</span>
                </div>
              </div>
            </div>

            {onZoomToFit && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-2"
                onClick={onZoomToFit}
              >
                Centrar Vista (Zoom to Fit)
              </Button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
