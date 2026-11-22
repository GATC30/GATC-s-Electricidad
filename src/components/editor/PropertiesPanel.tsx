'use client';

import React, { useState } from 'react';
import { Wall, Box, Tube, Route, ProjectConfig, DeviceKey, Phase } from '@/engine/types';
import { CATALOG } from '@/engine/catalog';
import { Button } from '@/components/ui';
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
  routes?: Route[];
  activePhase?: Phase;
  onUpdateWall?: (id: string, updates: Partial<Wall>) => void;
  onUpdateBox?: (id: string, updates: Partial<Box>) => void;
  onUpdateTube?: (id: string, updates: Partial<Tube>) => void;
  onUpdateProjectConfig?: (updates: Partial<ProjectConfig>) => void;
  onDeleteElement?: (type: 'wall' | 'box' | 'tube', id: string) => void;
  onEditRoute?: (routeId: string, tubeId: string) => void;
  onRemoveTubeFromRoute?: (routeId: string, tubeId: string) => void;
  onStartWire?: (tubeId?: string) => void;
  onZoomToFit?: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  projectConfig,
  elementsCount,
  routes = [],
  activePhase = 1,
  onUpdateWall,
  onUpdateBox,
  onUpdateTube,
  onUpdateProjectConfig,
  onDeleteElement,
  onEditRoute,
  onRemoveTubeFromRoute,
  onStartWire,
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
            {type ? `Propiedades: ${type.toUpperCase()}` : 'Configuración del Proyecto'}
          </h3>
        </div>

        <button
          type="button"
          className="md:hidden text-slate-400 p-1"
          aria-label={isMobileExpanded ? 'Colapsar panel' : 'Expandir panel'}
        >
          <svg
            className={`w-4 h-4 transform transition-transform ${isMobileExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
        {/* CASE 1: WALL SELECTED */}
        {type === 'wall' && element && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">ID de Pared:</span>
              <span className="font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                {(element as Wall).id.slice(0, 8)}
              </span>
            </div>

            {/* Lock Wall */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <label className="text-slate-300 font-medium">Bloquear Pared</label>
              <input
                type="checkbox"
                checked={(element as Wall).locked || false}
                onChange={(e) =>
                  onUpdateWall?.((element as Wall).id, { locked: e.target.checked })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
              />
            </div>

            {/* Node 1 & 2 Pinning */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 rounded bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(element as Wall).n1F || false}
                  onChange={(e) =>
                    onUpdateWall?.((element as Wall).id, { n1F: e.target.checked })
                  }
                  className="rounded text-indigo-600"
                />
                <span className="text-[11px] text-slate-300">Fijar Nodo 1</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(element as Wall).n2F || false}
                  onChange={(e) =>
                    onUpdateWall?.((element as Wall).id, { n2F: e.target.checked })
                  }
                  className="rounded text-indigo-600"
                />
                <span className="text-[11px] text-slate-300">Fijar Nodo 2</span>
              </label>
            </div>

            {/* Wall Height */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Altura de Pared (metros)
              </label>
              <input
                type="number"
                step="0.1"
                value={(element as Wall).heightM}
                onChange={(e) =>
                  onUpdateWall?.((element as Wall).id, {
                    heightM: parseFloat(e.target.value) || 2.8
                  })
                }
                disabled={(element as Wall).locked}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            {/* Wall Thickness */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Grosor / Ancho (metros)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.05"
                  value={(element as Wall).wW || projectConfig.wW}
                  onChange={(e) =>
                    onUpdateWall?.((element as Wall).id, {
                      wW: parseFloat(e.target.value) || 0.2
                    })
                  }
                  disabled={(element as Wall).locked}
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50"
                />
                <select
                  value={(element as Wall).grow || 'center'}
                  onChange={(e) =>
                    onUpdateWall?.((element as Wall).id, {
                      grow: e.target.value as any
                    })
                  }
                  disabled={(element as Wall).locked}
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  <option value="center">Centro</option>
                  <option value="l1">Hacia Lado 1</option>
                  <option value="l2">Hacia Lado 2</option>
                </select>
              </div>
            </div>

            {!(element as Wall).locked && (
              <Button
                variant="danger"
                size="sm"
                className="w-full mt-4"
                onClick={() => onDeleteElement?.('wall', (element as Wall).id)}
              >
                Eliminar Pared
              </Button>
            )}
          </div>
        )}

        {/* CASE 2: BOX / ACCESSORY SELECTED */}
        {type === 'box' && element && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tipo de Caja:</span>
              <span className="font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded uppercase">
                {(element as Box).type}
              </span>
            </div>

            {/* Invert Side / Flip 180 */}
            <button
              type="button"
              onClick={() =>
                onUpdateBox?.((element as Box).id, {
                  rot: (((element as Box).rot || 0) + 180) % 360
                })
              }
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Invertir Lado (180°)
            </button>

            {/* Device catalog selection */}
            <div>
              <label className="block text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                Dispositivo Eléctrico Asignado
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
                className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-400 cursor-pointer font-medium"
              >
                <option value="">(Caja Vacía / Con tapadera ciega)</option>
                {Object.entries(CATALOG).map(([key, spec]) => (
                  <option key={key} value={key}>
                    {spec.label} (Z: {spec.z.toFixed(2)}m - Q{spec.p})
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
                    rot: parseInt(e.target.value) || 0
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Circuits if Panel */}
            {(element as Box).device === 'panel' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Polos / Circuitos del Tablero
                </label>
                <select
                  value={(element as Box).circs || 2}
                  onChange={(e) =>
                    onUpdateBox?.((element as Box).id, {
                      circs: parseInt(e.target.value) || 2
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 outline-none"
                >
                  {[1, 2, 4, 6, 8, 10, 12, 14, 16].map((p) => (
                    <option key={p} value={p}>
                      {p} Polo{p === 1 ? '' : 's'}
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

            {/* Circuits / Routes inside this tube */}
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs uppercase text-indigo-400 tracking-wider">
                  Rutas de Cableado en este Tubo
                </span>
              </div>

              {(() => {
                const tubeRoutes = routes.filter(
                  (r) => r.tubes && r.tubes.includes((element as Tube).id)
                );

                if (tubeRoutes.length === 0) {
                  return (
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-500 text-center italic text-[11px]">
                      No hay cables enrutados por esta tubería.
                      {onStartWire && (
                        <button
                          type="button"
                          onClick={() => onStartWire((element as Tube).id)}
                          className="mt-2 block w-full py-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline"
                        >
                          + Enrutar cable por aquí
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {tubeRoutes.map((r) => (
                      <div
                        key={r.id}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 truncate" title={r.name}>
                            {r.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {r.cables.length} {r.cables.length === 1 ? 'cable' : 'cables'}
                          </span>
                        </div>

                        {/* Color swatches of conductors */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {r.cables.map((c, cIdx) => (
                            <span
                              key={cIdx}
                              className="w-3.5 h-3.5 rounded-full border border-white/20 inline-block shadow-sm"
                              style={{ backgroundColor: c.color }}
                              title={`${c.type} ${c.gauge} (${c.color})`}
                            />
                          ))}
                        </div>

                        {/* Route Actions for this tube */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80 justify-end">
                          {onEditRoute && (
                            <button
                              type="button"
                              onClick={() => onEditRoute(r.id, (element as Tube).id)}
                              className="px-2 py-1 rounded-md bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold border border-indigo-500/30 transition-colors"
                            >
                              Editar
                            </button>
                          )}
                          {onRemoveTubeFromRoute && (
                            <button
                              type="button"
                              onClick={() => onRemoveTubeFromRoute(r.id, (element as Tube).id)}
                              className="px-2 py-1 rounded-md bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 text-[11px] font-semibold border border-red-800/30 transition-colors"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
