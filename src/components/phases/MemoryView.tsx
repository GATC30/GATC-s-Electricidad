'use client';

import React from 'react';
import { ProjectState, Box, Tube, Route, ProjectConfig } from '@/engine/types';
import { calculateTubeLengthMeters } from '@/engine/bom';
import { SCALE } from '@/engine/constants';
import { CATALOG } from '@/engine/catalog';

export interface MemoryViewProps {
  state: ProjectState;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ state }) => {
  const { pConf, boxes = [], walls = [], tubes = [], routes = [] } = state;

  // Box and device counters
  let bSq = 0;
  let bRect = 0;
  let bOct = 0;
  let cToma = 0;
  let cApag = 0;
  let cLighting = 0;
  let cSpecialLoads = 0;
  let cvOct = 0;
  let cvRect = 0;
  let cvSq = 0;

  boxes.forEach((b) => {
    if (b.device) {
      if (b.type === 'box_oct') bOct++;
      else if (b.type === 'box_rect') bRect++;
      else if (b.type === 'box_sq') bSq++;

      if (b.device === 'light' || b.device === 'wall_lamp') {
        cLighting++;
      } else if (b.device.includes('outlet')) {
        cToma++;
      } else if (b.device.includes('switch') || b.device.includes('mix')) {
        cApag++;
      } else if (['shower', 'heater', 'pump', 'outlet_240'].includes(b.device)) {
        cSpecialLoads++;
      }
    } else if (b.type?.startsWith('box_')) {
      if (b.type === 'box_oct') cvOct++;
      else if (b.type === 'box_rect') cvRect++;
      else if (b.type === 'box_sq') cvSq++;
    }
  });

  // Wall linear run calculation
  let totalWallMeters = 0;
  walls.forEach((w) => {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) / SCALE;
    totalWallMeters += len;
  });

  // Circuit routing per distribution panel
  const boxMap = new Map<string, Box>(boxes.map((b) => [b.id, b]));
  const tubeMap = new Map<string, Tube>(tubes.map((t) => [t.id, t]));

  interface PanelCircuitInfo {
    circuitName: string;
    routeId: string;
    cables: Route['cables'];
  }

  const panels: Record<string, PanelCircuitInfo[]> = {};
  const validRoutes = routes.filter((r) => r.tubes && r.tubes.length > 0);

  validRoutes.forEach((r) => {
    let panelName = 'Otros Circuitos (Sin Tablero)';
    r.tubes.forEach((tid) => {
      const t = tubeMap.get(tid);
      if (t) {
        const s = boxMap.get(t.startId);
        const e = boxMap.get(t.endId);
        if (s && s.device === 'panel') panelName = s.label || 'Tablero Principal';
        if (e && e.device === 'panel') panelName = e.label || 'Tablero Principal';
      }
    });

    if (!panels[panelName]) panels[panelName] = [];
    if (!panels[panelName].some((item) => item.routeId === r.id)) {
      panels[panelName].push({
        circuitName: r.name,
        routeId: r.id,
        cables: r.cables || []
      });
    }
  });

  // Tube length metrics by diameter and placement
  let totalTubeMeters = 0;
  const tubeByType: Record<string, number> = {
    'tub_pvc_1/2': 0,
    'tub_pvc_3/4': 0,
    'tub_pvc_1': 0
  };
  const tubeByPlace: Record<string, number> = {
    techo: 0,
    pared: 0,
    suelo: 0
  };

  tubes.forEach((t) => {
    const s = boxMap.get(t.startId);
    const e = boxMap.get(t.endId);
    if (s && e) {
      const len = calculateTubeLengthMeters(t, s, e, pConf, SCALE);
      totalTubeMeters += len;
      tubeByType[t.type] = (tubeByType[t.type] || 0) + len;
      tubeByPlace[t.place] = (tubeByPlace[t.place] || 0) + len;
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 mb-8 border-b border-indigo-500/30 gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            Fase 4 — Documentación Técnica
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Memoria Descriptiva del Proyecto
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Resumen de criterios arquitectónicos, de canalización y esquemas de circuitos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            Canalizaciones: <strong className="text-white font-mono">{totalTubeMeters.toFixed(2)} m</strong>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
            Paredes: <strong className="text-white font-mono">{totalWallMeters.toFixed(2)} m</strong>
          </div>
        </div>
      </div>

      {/* Conditions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Architectural Conditions */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              Condiciones Arquitectónicas
            </h3>
          </div>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Grosor Base de Paredes:</span>
              <strong className="text-white font-mono">{pConf.wW.toFixed(2)} m</strong>
            </li>
            <li className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Altura de Nivel (Paredes):</span>
              <strong className="text-white font-mono">{pConf.wH.toFixed(2)} m</strong>
            </li>
            <li className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Longitud Lineal de Paredes:</span>
              <strong className="text-white font-mono">{totalWallMeters.toFixed(2)} m</strong>
            </li>
            <li className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Total de Tramos de Pared:</span>
              <strong className="text-white font-mono">{walls.length} tramos</strong>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Escala de Plano:</span>
              <strong className="text-indigo-400 font-mono">40 px = 1.00 m</strong>
            </li>
          </ul>
        </div>

        {/* Electrical Conditions */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              Criterios de Tendido Eléctrico
            </h3>
          </div>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Margen por Terminal de Circuito:</span>
              <strong className="text-emerald-400 font-mono">+0.20 m / caja</strong>
            </li>
            <li className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Margen por Caja de Paso / Empalme:</span>
              <strong className="text-emerald-400 font-mono">+0.10 m / caja</strong>
            </li>
            <li className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Alturas de Montaje:</span>
              <span className="text-white text-xs font-semibold">Toma 0.40m · Apag 1.20m</span>
            </li>
            <li className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Altura de Tablero Distribución:</span>
              <strong className="text-white font-mono">1.75 m</strong>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Total Circuitos Activos:</span>
              <strong className="text-amber-400 font-mono">{routes.length}</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* Conduit Breakdown Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl mb-8">
        <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>⚡ Canalizaciones y Tuberías PVC ({totalTubeMeters.toFixed(2)} m)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Por Diámetro Nominal PVC
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-300">Tubería PVC 1/2&quot;:</span>
                <strong className="text-white font-mono">{tubeByType['tub_pvc_1/2'].toFixed(2)} m</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Tubería PVC 3/4&quot;:</span>
                <strong className="text-white font-mono">{tubeByType['tub_pvc_3/4'].toFixed(2)} m</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Tubería PVC 1&quot;:</span>
                <strong className="text-white font-mono">{tubeByType['tub_pvc_1'].toFixed(2)} m</strong>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Por Ubicación / Plano de Tendido
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-300">Tendido por Techo (Cielo):</span>
                <strong className="text-white font-mono">{tubeByPlace['techo'].toFixed(2)} m</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Tendido Directo en Pared:</span>
                <strong className="text-white font-mono">{tubeByPlace['pared'].toFixed(2)} m</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Tendido por Suelo / Piso (-0.20m):</span>
                <strong className="text-white font-mono">{tubeByPlace['suelo'].toFixed(2)} m</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Box Counts */}
      <div className="mb-8">
        <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>📦 Resumen Global de Cajas y Conexiones</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div className="bg-gradient-to-br from-indigo-900/60 to-indigo-950/80 border border-indigo-700/40 p-4 rounded-2xl shadow-lg text-center">
            <div className="text-3xl font-extrabold text-white mb-1 font-mono">
              {cToma}
            </div>
            <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
              Tomacorrientes 120V
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/60 to-purple-950/80 border border-purple-700/40 p-4 rounded-2xl shadow-lg text-center">
            <div className="text-3xl font-extrabold text-white mb-1 font-mono">
              {cApag}
            </div>
            <div className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
              Apagadores / Conmutadores
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-900/60 to-amber-950/80 border border-amber-700/40 p-4 rounded-2xl shadow-lg text-center">
            <div className="text-3xl font-extrabold text-white mb-1 font-mono">
              {cLighting}
            </div>
            <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
              Puntos de Iluminación
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/60 to-emerald-950/80 border border-emerald-700/40 p-4 rounded-2xl shadow-lg text-center">
            <div className="text-3xl font-extrabold text-white mb-1 font-mono">
              {cSpecialLoads}
            </div>
            <div className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
              Cargas Especiales (240V / Bombas)
            </div>
          </div>
        </div>

        {/* Detailed Box Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl text-center">
            <div className="text-xl font-bold text-slate-100 font-mono">{bOct}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Octagonales Usadas</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl text-center">
            <div className="text-xl font-bold text-slate-100 font-mono">{cvOct}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Octagonales Ciegas</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl text-center">
            <div className="text-xl font-bold text-slate-100 font-mono">{cvRect}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Rectangulares Ciegas</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl text-center">
            <div className="text-xl font-bold text-slate-100 font-mono">{cvSq}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Cuadradas Ciegas</div>
          </div>
        </div>
      </div>

      {/* Circuits per Panel */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>⚡ Mapa de Circuitos por Tablero de Distribución</span>
        </h3>

        {Object.keys(panels).length === 0 ? (
          <p className="text-sm text-slate-400 italic py-2">
            No se han configurado rutas de circuitos aún. Ve a la Fase 2 (Diseño Eléctrico) y usa la herramienta &quot;Enrutar Cable&quot;.
          </p>
        ) : (
          <div className="space-y-6">
            {Object.keys(panels).map((panelName) => (
              <div key={panelName} className="border-b border-slate-800/80 pb-5 last:border-b-0 last:pb-0">
                <h4 className="font-bold text-indigo-300 text-sm mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  {panelName}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {panels[panelName].map((circuit) => (
                    <div
                      key={circuit.routeId}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate" title={circuit.circuitName}>
                          {circuit.circuitName}
                        </span>
                        <span className="text-[10px] text-indigo-400 font-mono">
                          {circuit.cables.length} cbls
                        </span>
                      </div>

                      {/* Conductors list */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {circuit.cables.map((c, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0 border border-white/20"
                              style={{ backgroundColor: c.color }}
                            />
                            <span>{c.type} {c.gauge}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
