'use client';

import React, { useState } from 'react';
import { ProjectState, CustomMaterial } from '@/engine/types';
import { calculateBOM } from '@/engine/bom';

export interface QuoteViewProps {
  state: ProjectState;
  onUpdateOverrides?: (key: string, value: number) => void;
  onUpdatePrices?: (key: string, value: number) => void;
  onAddCustomMaterial?: (material: CustomMaterial) => void;
  onDeleteCustomMaterial?: (index: number) => void;
}

export const QuoteView: React.FC<QuoteViewProps> = ({
  state,
  onUpdateOverrides,
  onUpdatePrices,
  onAddCustomMaterial,
  onDeleteCustomMaterial
}) => {
  const bomSummary = calculateBOM(state);

  const [newMatName, setNewMatName] = useState('');
  const [newMatPrice, setNewMatPrice] = useState('1500');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim()) return;
    if (onAddCustomMaterial) {
      onAddCustomMaterial({
        name: newMatName.trim(),
        qty: 1,
        price: parseFloat(newMatPrice) || 0
      });
    }
    setNewMatName('');
    setShowAddForm(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 mb-8 border-b border-indigo-500/30 gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            Fase 3 — Presupuesto y Costos
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Presupuesto de Materiales (BOM)
          </h2>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
        >
          <span>+</span>
          <span>Añadir Extra / Mano de Obra</span>
        </button>
      </div>

      {/* Add Custom Material Modal / Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="mb-8 p-5 bg-slate-900/90 border border-indigo-500/40 rounded-2xl flex flex-wrap gap-4 items-end backdrop-blur-xl shadow-xl"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Descripción del Extra / Servicio
            </label>
            <input
              type="text"
              placeholder="Ej. Mano de obra tendido eléctrico"
              value={newMatName}
              onChange={(e) => setNewMatName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>

          <div className="w-36">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Precio Unitario (Q)
            </label>
            <input
              type="number"
              step="50"
              value={newMatPrice}
              onChange={(e) => setNewMatPrice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono text-right outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* BOM Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-4 px-4 sm:px-6">Material / Conductor</th>
                <th className="py-4 px-3 sm:px-4 text-center">Cant. Calc</th>
                <th className="py-4 px-3 sm:px-4 text-center">Cant. Final</th>
                <th className="py-4 px-3 sm:px-4 text-right">P.U (Q)</th>
                <th className="py-4 px-4 sm:px-6 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {bomSummary.items.map((item) => (
                <tr key={item.key} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 sm:px-6 text-slate-200">
                    <div className="flex items-center gap-2">
                      {item.colorHex && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 inline-block shadow-sm"
                          style={{ backgroundColor: item.colorHex }}
                          title={`Color: ${item.colorHex}`}
                        />
                      )}
                      <span className="font-semibold">{item.label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-center text-slate-400 font-mono">
                    {item.calculatedQty} {item.unit}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item.finalQty}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (onUpdateOverrides) onUpdateOverrides(item.key, val);
                      }}
                      className="w-16 sm:w-20 px-2 py-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg text-center font-bold font-mono text-white outline-none"
                    />
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <span className="text-slate-500 font-mono text-xs">Q</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          let priceKey = item.key;
                          if (item.key.startsWith('cable_')) {
                            const p = item.key.split('_');
                            priceKey = `cable_${p[1]}_${p[2]}`;
                          }
                          if (onUpdatePrices) onUpdatePrices(priceKey, val);
                        }}
                        className="w-16 sm:w-20 px-2 py-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg text-right font-mono text-white outline-none"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 sm:px-6 text-right font-mono font-bold text-indigo-300">
                    Q {item.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* Custom Materials */}
              {bomSummary.customMaterials.map((cm, i) => (
                <tr key={i} className="bg-indigo-950/20 hover:bg-indigo-950/30 transition-colors">
                  <td className="py-3 px-4 sm:px-6 text-indigo-200">
                    <span className="font-semibold">{cm.name}</span>
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-3 sm:px-4 text-center font-mono font-bold text-white">
                    {cm.qty}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right font-mono text-slate-300">
                    Q {cm.price.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 sm:px-6 text-right font-mono font-bold text-indigo-300">
                    <div className="flex items-center justify-end gap-3">
                      <span>Q {(cm.qty * cm.price).toFixed(2)}</span>
                      {onDeleteCustomMaterial && (
                        <button
                          onClick={() => onDeleteCustomMaterial(i)}
                          className="text-red-400 hover:text-red-300 p-1 rounded font-bold"
                          title="Eliminar extra"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950 border-t-2 border-indigo-500 text-white font-bold text-sm sm:text-base">
              <tr>
                <td colSpan={4} className="py-5 px-4 sm:px-6 text-right tracking-wide uppercase text-slate-300 text-xs sm:text-sm">
                  Total Presupuesto Estimado:
                </td>
                <td className="py-5 px-4 sm:px-6 text-right text-lg sm:text-xl text-emerald-400 font-mono font-extrabold whitespace-nowrap">
                  Q {bomSummary.totalCost.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
