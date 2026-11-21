'use client';

import React from 'react';
import { ProjectState, Box, Tube, Route, ProjectConfig } from '@/engine/types';
import { calculateTubeLengthMeters } from '@/engine/bom';
import { SCALE } from '@/engine/constants';

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
  let cOther = 0;
  let cvOct = 0;
  let cvRect = 0;
  let cvSq = 0;

  boxes.forEach((b) => {
    if (b.device) {
      if (b.type === 'box_oct') bOct++;
      if (b.device.includes('outlet')) {
        cToma++;
      } else if (b.device.includes('switch') || b.device.includes('mix')) {
        cApag++;
      } else if (b.type !== 'box_oct') {
        cOther++;
      }
    } else if (b.type?.startsWith('box_')) {
      if (b.type === 'box_oct') cvOct++;
      else if (b.type === 'box_rect') cvRect++;
      else if (b.type === 'box_sq') cvSq++;
    }
  });

  // Circuit routing per distribution panel
  const panels: Record<string, Set<string>> = {};
  const boxMap = new Map<string, Box>(boxes.map((b) => [b.id, b]));
  const tubeMap = new Map<string, Tube>(tubes.map((t) => [t.id, t]));

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

    if (!panels[panelName]) panels[panelName] = new Set();
    panels[panelName].add(r.name);
  });

  // Total tube run calculation
  let totalTubeMeters = 0;
  tubes.forEach((t) => {
    const s = boxMap.get(t.startId);
    const e = boxMap.get(t.endId);
    if (s && e) {
      totalTubeMeters += calculateTubeLengthMeters(t, s, e, pConf, SCALE);
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 mb-8 border-b border-indigo-500/30">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            Fase 4 — Documentación Técnica
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Memoria Descriptiva del Proyecto
          </h2>
        </div>
        <div className="mt-3 sm:mt-0 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
          Tubos Totales: {totalTubeMeters.toFixed(2)} m
        </div>
      </div>

      {/* Conditions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
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
              <span className="text-slate-400">Altura de Nivel (Piso a Techo):</span>
              <strong className="text-white font-mono">{pConf.wH.toFixed(2)} m</strong>
            </li>
            <li className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Altura de Dintel Puertas:</span>
              <strong className="text-white font-mono">2.10 m</strong>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Altura Estándar Ventanas:</span>
              <strong className="text-white font-mono">1.50 m a 2.10 m</strong>
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
            <li className="flex justify-between">
              <span className="text-slate-400">Altura de Tablero Distribución:</span>
              <strong className="text-white font-mono">1.75 m</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* Global Box Counts */}
      <div className="mb-10">
        <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>📦 Resumen Global de Cajas y Conexiones</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-gradient-to-br from-indigo-900/60 to-indigo-950/80 border border-indigo-700/40 p-5 rounded-2xl shadow-lg text-center">
            <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1 font-mono">
              {cToma}
            </div>
            <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Para Tomacorrientes
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/60 to-purple-950/80 border border-purple-700/40 p-5 rounded-2xl shadow-lg text-center">
            <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1 font-mono">
              {cApag}
            </div>
            <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
              Para Apagadores / Mixtos
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 border border-slate-700/40 p-5 rounded-2xl shadow-lg text-center">
            <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1 font-mono">
              {cOther + bOct}
            </div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Lámparas y Otros Accesorios
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
            <div className="text-[11px] text-slate-400 font-medium mt-1">Octagonales Vacías (Ciegas)</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl text-center">
            <div className="text-xl font-bold text-slate-100 font-mono">{cvRect}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Rectangulares Vacías</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl text-center">
            <div className="text-xl font-bold text-slate-100 font-mono">{cvSq}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Cuadradas Vacías</div>
          </div>
        </div>
      </div>

      {/* Circuits per Panel */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>⚡ Circuitos Enrutados por Tablero</span>
        </h3>

        {Object.keys(panels).length === 0 ? (
          <p className="text-sm text-slate-400 italic py-2">
            No se han configurado rutas de circuitos aún. Ve a la Fase 2 (Diseño Eléctrico) y usa la herramienta &quot;Enrutar&quot;.
          </p>
        ) : (
          <div className="space-y-6">
            {Object.keys(panels).map((panelName) => (
              <div key={panelName} className="border-b border-slate-800/80 pb-4 last:border-b-0 last:pb-0">
                <h4 className="font-bold text-indigo-300 text-sm mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  {panelName}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Array.from(panels[panelName]).map((circuitName) => (
                    <div
                      key={circuitName}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200"
                    >
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{circuitName}</span>
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
