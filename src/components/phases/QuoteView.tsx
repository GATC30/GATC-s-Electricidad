'use client';

import React, { useState, useMemo } from 'react';
import { ProjectState, CustomMaterial } from '@/engine/types';
import { calculateBOM } from '@/engine/bom';
import { usePricesStore } from '@/stores/prices-store';

export interface QuoteViewProps {
  state: ProjectState;
  onUpdateOverrides?: (key: string, value: number) => void;
  onUpdatePrices?: (key: string, value: number) => void;
  onAddCustomMaterial?: (material: CustomMaterial) => void;
  onDeleteCustomMaterial?: (index: number) => void;
  onOpenGlobalPrices?: () => void;
}

export const QuoteView: React.FC<QuoteViewProps> = ({
  state,
  onUpdateOverrides,
  onUpdatePrices,
  onAddCustomMaterial,
  onDeleteCustomMaterial,
  onOpenGlobalPrices
}) => {
  const { globalPrices, openPricesModal } = usePricesStore();
  const bomSummary = useMemo(() => calculateBOM(state, globalPrices), [state, globalPrices]);

  const [newMatName, setNewMatName] = useState('');
  const [newMatPrice, setNewMatPrice] = useState('1500');
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'devices' | 'cables' | 'conduits' | 'extras'>('all');

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

  const handleOpenPrices = () => {
    if (onOpenGlobalPrices) {
      onOpenGlobalPrices();
    } else {
      openPricesModal();
    }
  };

  // Filter BOM items
  const filteredItems = useMemo(() => {
    return bomSummary.items.filter((item) => {
      const matchesSearch =
        item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.key.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCategory === 'all') return true;
      if (activeCategory === 'cables') return item.key.startsWith('cable_');
      if (activeCategory === 'conduits') return item.key.startsWith('tub_');
      if (activeCategory === 'devices')
        return !item.key.startsWith('cable_') && !item.key.startsWith('tub_');
      return true;
    });
  }, [bomSummary.items, searchTerm, activeCategory]);

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
          <p className="text-xs text-slate-400 mt-1">
            Cómputo métrico y estimación de costos en Quetzales (Q)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenPrices}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Precios Globales</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm">+</span>
            <span>Añadir Extra / Mano de Obra</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Materiales Computados
          </span>
          <div className="text-2xl font-black text-indigo-400 font-mono mt-1">
            {bomSummary.items.length} líneas
          </div>
          <span className="text-[11px] text-slate-500">
            {state.boxes.length} accesorios · {state.tubes.length} canalizaciones
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Circuitos Enrutados
          </span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            {state.routes.length} circuitos
          </div>
          <span className="text-[11px] text-slate-500">
            Conductor adicional: +0.20m terminal, +0.10m paso
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 shadow-xl backdrop-blur-md">
          <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
            Costo Total Estimado
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            Q {bomSummary.totalCost.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400">
            Incluye materiales estándar y extras
          </span>
        </div>
      </div>

      {/* Add Custom Material Modal / Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="mb-8 p-5 bg-slate-900/90 border border-indigo-500/40 rounded-2xl flex flex-wrap gap-4 items-end backdrop-blur-xl shadow-xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Descripción del Extra / Servicio
            </label>
            <input
              type="text"
              placeholder="Ej. Mano de obra tendido eléctrico, acometida trifásica"
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg cursor-pointer"
            >
              Guardar Extra
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'devices', label: 'Accesorios' },
            { id: 'cables', label: 'Conductores' },
            { id: 'conduits', label: 'Tuberías PVC' },
            { id: 'extras', label: 'Extras' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 pl-8 text-xs text-white outline-none focus:border-indigo-500"
          />
          <svg
            className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

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
              {activeCategory !== 'extras' &&
                filteredItems.map((item) => (
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

              {/* Custom Materials / Extras */}
              {(activeCategory === 'all' || activeCategory === 'extras') &&
                bomSummary.customMaterials.map((cm, i) => (
                  <tr key={i} className="bg-indigo-950/20 hover:bg-indigo-950/30 transition-colors">
                    <td className="py-3 px-4 sm:px-6 text-indigo-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-bold uppercase">
                          Extra
                        </span>
                        <span className="font-semibold">{cm.name}</span>
                      </div>
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
                            type="button"
                            onClick={() => onDeleteCustomMaterial(i)}
                            className="text-red-400 hover:text-red-300 p-1 rounded font-bold cursor-pointer"
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
