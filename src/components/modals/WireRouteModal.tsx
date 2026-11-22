'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Cable, CableType } from '@/engine/types';

export interface WireRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeId?: string | null;
  editingTubeId?: string | null;
  initialCircuitName?: string;
  initialCables?: Cable[];
  recentColors?: string[];
  onSaveRoute: (
    circuitName: string,
    cables: Cable[],
    onlyCurrentTube: boolean
  ) => void;
  onDeleteRoute?: (routeId: string) => void;
}

const DEFAULT_RECENT_COLORS = [
  '#000000', // Fase negra
  '#dc2626', // Fase roja
  '#2563eb', // Fase azul
  '#ffffff', // Neutro blanco
  '#16a34a', // Tierra verde
  '#ca8a04', // Retorno amarillo
  '#9333ea', // Retorno morado
  '#ea580c'  // Viajero naranja
];

const AWG_GAUGES = ['14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0'];
const SPT_GAUGES = ['22', '20', '18', '16', '14', '12'];
const UTP_GAUGES = ['Cat5e', 'Cat6'];

function generateTsjOptions(): string[] {
  const options: string[] = [];
  for (let conductors = 2; conductors <= 4; conductors++) {
    for (let gauge = 8; gauge <= 18; gauge += 2) {
      options.push(`${conductors}x${gauge}`);
    }
  }
  return options;
}

const TSJ_GAUGES = generateTsjOptions();

export const WireRouteModal: React.FC<WireRouteModalProps> = ({
  isOpen,
  onClose,
  routeId,
  editingTubeId,
  initialCircuitName = 'Circuito',
  initialCables,
  recentColors = DEFAULT_RECENT_COLORS,
  onSaveRoute,
  onDeleteRoute
}) => {
  const [circuitName, setCircuitName] = useState(initialCircuitName);
  const [cables, setCables] = useState<Cable[]>([]);
  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);
  const [paletteColors, setPaletteColors] = useState<string[]>(recentColors);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCircuitName(initialCircuitName || 'Circuito');
      if (initialCables && initialCables.length > 0) {
        setCables(JSON.parse(JSON.stringify(initialCables)));
        setActiveRowIndex(initialCables.length - 1);
      } else {
        const defaultColor = paletteColors[0] || '#000000';
        setCables([{ type: 'AWG', gauge: '12', color: defaultColor }]);
        setActiveRowIndex(0);
      }
    }
  }, [isOpen, initialCircuitName, initialCables]);

  const handleAddCableRow = () => {
    const nextColor =
      paletteColors[(cables.length) % paletteColors.length] || '#dc2626';
    const newCable: Cable = {
      type: 'AWG',
      gauge: '14',
      color: nextColor
    };
    setCables((prev) => [...prev, newCable]);
    setActiveRowIndex(cables.length);
  };

  const handleRemoveCableRow = (index: number) => {
    setCables((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated;
    });
    setActiveRowIndex((prev) => Math.max(0, prev - 1));
  };

  const handleUpdateCable = (
    index: number,
    field: keyof Cable,
    value: string
  ) => {
    setCables((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };

      if (field === 'type') {
        current.type = value as CableType;
        const defaultGaugeMap: Record<string, string> = {
          AWG: '12',
          SPT: '14',
          TSJ: '3x12',
          UTP: 'Cat5e',
          Custom: ''
        };
        current.gauge = defaultGaugeMap[value] || '12';
      } else if (field === 'gauge') {
        current.gauge = value;
      } else if (field === 'color') {
        current.color = value;
        applyRecentColor(value);
      }

      updated[index] = current;
      return updated;
    });
  };

  const applyRecentColor = (colorHex: string) => {
    setPaletteColors((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== colorHex.toLowerCase());
      const updated = [colorHex, ...filtered].slice(0, 8);
      return updated;
    });
  };

  const handlePickPaletteColor = (colorHex: string) => {
    if (cables.length === 0) return;
    const targetIdx =
      activeRowIndex >= 0 && activeRowIndex < cables.length
        ? activeRowIndex
        : cables.length - 1;

    handleUpdateCable(targetIdx, 'color', colorHex);
  };

  const handleSave = (onlyCurrentTube: boolean = false) => {
    if (!circuitName.trim()) {
      alert('Por favor ingresa un nombre para el circuito');
      return;
    }
    if (cables.length === 0) {
      alert('Por favor añade al menos un conductor al circuito');
      return;
    }

    onSaveRoute(circuitName.trim(), cables, onlyCurrentTube);
    onClose();
  };

  const handleDelete = () => {
    if (!routeId) return;
    if (
      window.confirm(
        '¿Estás seguro de que deseas eliminar este circuito por completo?'
      )
    ) {
      if (onDeleteRoute) onDeleteRoute(routeId);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </span>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {routeId ? 'Editar Circuito Eléctrico' : 'Enrutar Conductores'}
            </h3>
            <p className="text-xs text-slate-400">
              {editingTubeId
                ? 'Modificando tendido para el tramo seleccionado'
                : 'Configura calibres, conductores y código de colores'}
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {routeId && onDeleteRoute && (
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Eliminar Ruta
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancelar
            </Button>

            {editingTubeId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-400 border border-amber-500/40 hover:bg-amber-500/10"
                onClick={() => handleSave(true)}
                title="Derivar sólo en este tramo específico de tubería"
              >
                SÓLO Tubo (Derivar)
              </Button>
            )}

            <Button variant="primary" size="sm" onClick={() => handleSave(false)}>
              Guardar Circuito
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Circuit Name Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Nombre / Identificación del Circuito
          </label>
          <input
            type="text"
            placeholder="Ej. Cto. 1 (Fuerza Sala), Iluminación Nivel 1"
            value={circuitName}
            onChange={(e) => setCircuitName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-indigo-500 transition-colors shadow-inner"
            autoFocus
          />
        </div>

        {/* Quick Palette Colors Swatches */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Paleta de Colores Recientes
            </label>
            <span className="text-[11px] text-slate-500">
              Clic para colorear el conductor activo
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
            {paletteColors.map((color, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePickPaletteColor(color)}
                className="w-7 h-7 rounded-lg border-2 border-slate-700 hover:border-white transition-all transform hover:scale-110 shadow-sm shrink-0 cursor-pointer"
                style={{ backgroundColor: color }}
                title={`Aplicar color ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Conductors List Header */}
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Conductores en el Tramo ({cables.length})
            </span>
            <button
              type="button"
              onClick={handleAddCableRow}
              className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>+ Añadir Conductor</span>
            </button>
          </div>

          {/* Conductors Rows */}
          <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
            {cables.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                No hay conductores en la ruta. Haz clic en "+ Añadir Conductor" para comenzar.
              </div>
            ) : (
              cables.map((cable, idx) => {
                const isActive = idx === activeRowIndex;

                return (
                  <div
                    key={idx}
                    onClick={() => setActiveRowIndex(idx)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Conductor Index Badge */}
                    <span className="w-5 text-center font-mono text-xs text-slate-400 font-bold shrink-0">
                      #{idx + 1}
                    </span>

                    {/* Cable Type Select */}
                    <select
                      value={cable.type}
                      onChange={(e) =>
                        handleUpdateCable(idx, 'type', e.target.value)
                      }
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 cursor-pointer shrink-0"
                    >
                      <option value="AWG">AWG</option>
                      <option value="SPT">SPT</option>
                      <option value="TSJ">TSJ</option>
                      <option value="UTP">UTP</option>
                      <option value="Custom">Otro</option>
                    </select>

                    {/* Gauge Select or Input */}
                    <div className="flex-1 min-w-[100px]">
                      {cable.type === 'AWG' ? (
                        <select
                          value={cable.gauge}
                          onChange={(e) =>
                            handleUpdateCable(idx, 'gauge', e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {AWG_GAUGES.map((g) => (
                            <option key={g} value={g}>
                              Calibre {g}
                            </option>
                          ))}
                        </select>
                      ) : cable.type === 'SPT' ? (
                        <select
                          value={cable.gauge}
                          onChange={(e) =>
                            handleUpdateCable(idx, 'gauge', e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {SPT_GAUGES.map((g) => (
                            <option key={g} value={g}>
                              Calibre {g}
                            </option>
                          ))}
                        </select>
                      ) : cable.type === 'TSJ' ? (
                        <select
                          value={cable.gauge}
                          onChange={(e) =>
                            handleUpdateCable(idx, 'gauge', e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {TSJ_GAUGES.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      ) : cable.type === 'UTP' ? (
                        <select
                          value={cable.gauge}
                          onChange={(e) =>
                            handleUpdateCable(idx, 'gauge', e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {UTP_GAUGES.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Especificar calibre..."
                          value={cable.gauge}
                          onChange={(e) =>
                            handleUpdateCable(idx, 'gauge', e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                        />
                      )}
                    </div>

                    {/* Color Picker Swatch */}
                    <div className="relative shrink-0 flex items-center">
                      <input
                        type="color"
                        value={cable.color}
                        onChange={(e) =>
                          handleUpdateCable(idx, 'color', e.target.value)
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-700 bg-transparent"
                        title="Seleccionar color"
                      />
                    </div>

                    {/* Delete Row Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCableRow(idx);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors shrink-0 cursor-pointer"
                      title="Eliminar conductor"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
