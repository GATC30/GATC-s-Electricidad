'use client';

import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { usePricesStore } from '@/stores/prices-store';
import { CATALOG, getReadableItemLabel } from '@/engine/catalog';
import { STANDARD_POLE_COUNTS } from '@/engine/constants';

export interface PricesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (prices: Record<string, number>) => void;
}

type PriceCategory = 'all' | 'conductors' | 'accessories' | 'panels' | 'conduits' | 'covers';

export const PricesModal: React.FC<PricesModalProps> = ({ isOpen, onClose, onSave }) => {
  const { globalPrices, setPrices, resetDefaults } = usePricesStore();
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PriceCategory>('all');

  // Initialize local prices copy when opened
  React.useEffect(() => {
    if (isOpen) {
      setLocalPrices({ ...globalPrices });
      setSearchTerm('');
    }
  }, [isOpen, globalPrices]);

  const handlePriceChange = (key: string, value: number) => {
    setLocalPrices((prev) => ({
      ...prev,
      [key]: Math.max(0, value)
    }));
  };

  const handleSave = () => {
    setPrices(localPrices);
    if (onSave) onSave(localPrices);
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('¿Deseas restablecer todos los precios globales a los valores por defecto del sistema?')) {
      resetDefaults();
      onClose();
    }
  };

  // Organize items by category
  const categorizedItems = useMemo(() => {
    const conductorKeys = Object.keys(localPrices)
      .filter((k) => k.startsWith('cable_'))
      .sort((a, b) => getReadableItemLabel(a).localeCompare(getReadableItemLabel(b), 'es'));

    const accessoryKeys = Object.keys(CATALOG)
      .filter((k) => k !== 'panel')
      .sort((a, b) => getReadableItemLabel(a).localeCompare(getReadableItemLabel(b), 'es'));

    const panelKeys = STANDARD_POLE_COUNTS.map((p) => `panel_${p}`);

    const conduitKeys = ['tub_pvc_1/2', 'tub_pvc_3/4', 'tub_pvc_1'];

    const coverKeys = ['tapa_oct', 'tapa_rect', 'tapa_sq'];

    return {
      conductors: conductorKeys,
      accessories: accessoryKeys,
      panels: panelKeys,
      conduits: conduitKeys,
      covers: coverKeys
    };
  }, [localPrices]);

  // Filter items according to search and category
  const filteredCategories = useMemo(() => {
    const filterList = (keys: string[]) => {
      return keys.filter((key) => {
        const label = getReadableItemLabel(key);
        return (
          label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          key.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    };

    return [
      {
        id: 'conductors',
        title: 'Conductores Eléctricos (Precio por metro)',
        items: filterList(categorizedItems.conductors)
      },
      {
        id: 'accessories',
        title: 'Accesorios y Dispositivos (Precio por unidad)',
        items: filterList(categorizedItems.accessories)
      },
      {
        id: 'panels',
        title: 'Tableros de Distribución (Precio por unidad)',
        items: filterList(categorizedItems.panels)
      },
      {
        id: 'conduits',
        title: 'Tuberías PVC y Canalizaciones (Precio por metro)',
        items: filterList(categorizedItems.conduits)
      },
      {
        id: 'covers',
        title: 'Tapaderas Ciegas de Cajas (Precio por unidad)',
        items: filterList(categorizedItems.covers)
      }
    ].filter(
      (cat) =>
        (selectedCategory === 'all' || selectedCategory === cat.id) &&
        cat.items.length > 0
    );
  }, [categorizedItems, searchTerm, selectedCategory]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </span>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Precios Globales de Materiales
            </h3>
            <p className="text-xs text-slate-400">
              Valores base en Quetzales (Q) para cómputos de presupuesto automático
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Restablecer Valores Base
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              Guardar Precios
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search and Category Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar material o conductor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 pl-9 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
            />
            <svg
              className="w-4 h-4 text-slate-500 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as PriceCategory)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Todas las Categorías</option>
            <option value="conductors">Conductores</option>
            <option value="accessories">Accesorios</option>
            <option value="panels">Tableros</option>
            <option value="conduits">Tuberías PVC</option>
            <option value="covers">Tapaderas</option>
          </select>
        </div>

        {/* Scrollable Price Grid */}
        <div className="max-h-[58vh] overflow-y-auto space-y-6 pr-1">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs italic">
              No se encontraron materiales que coincidan con la búsqueda.
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-indigo-500/20">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    {cat.title}
                  </h4>
                  <span className="ml-auto text-[10px] text-slate-500 font-mono">
                    {cat.items.length} {cat.items.length === 1 ? 'ítem' : 'ítems'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.items.map((key) => {
                    const label = getReadableItemLabel(key);
                    const currentVal = localPrices[key] ?? 0;

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/40 transition-colors"
                      >
                        <span
                          className="text-xs text-slate-300 font-medium truncate mr-2"
                          title={label}
                        >
                          {label}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-slate-500 font-mono text-xs font-bold">
                            Q
                          </span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={currentVal}
                            onChange={(e) =>
                              handlePriceChange(key, parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-mono font-bold text-xs text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
