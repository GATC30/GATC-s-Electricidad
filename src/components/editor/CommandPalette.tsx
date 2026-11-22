'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import { ToolType, Phase } from '@/engine/types';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Herramientas' | 'Fases' | 'Vista' | 'Edición' | 'Niveles' | 'Proyecto';
  shortcut?: string;
  icon: string;
  action: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  onZoomToFit?: () => void;
  onExport?: () => void;
  onOpenGlobalPrices?: () => void;
  onOpenTour?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDeleteSelected?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddLevel?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSave,
  onZoomToFit,
  onExport,
  onOpenGlobalPrices,
  onOpenTour,
  onCopy,
  onPaste,
  onDeleteSelected,
  onUndo,
  onRedo,
  onAddLevel
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const {
    phase,
    theme,
    setTool,
    setPhase,
    setZoom,
    toggleTheme,
    toggleDims,
    toggleRulers,
    toggle3D,
    setCurrentLevel,
    clearSelection
  } = useEditorStore();

  const { levels } = useProjectStore();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build commands list
  const commands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // Herramientas
      {
        id: 'tool_select',
        title: 'Seleccionar',
        subtitle: 'Herramienta de selección y manipulación',
        category: 'Herramientas',
        shortcut: 'V',
        icon: '👆',
        action: () => {
          setTool('select');
          onClose();
        }
      },
      {
        id: 'tool_pan',
        title: 'Mover Lienzo (Pan)',
        subtitle: 'Arrastrar vista con el ratón',
        category: 'Herramientas',
        shortcut: 'H',
        icon: '✋',
        action: () => {
          setTool('pan');
          onClose();
        }
      },
      {
        id: 'tool_wall',
        title: 'Dibujar Pared',
        subtitle: 'Crear muro con grosor y longitud',
        category: 'Herramientas',
        shortcut: 'W',
        icon: '🧱',
        action: () => {
          setPhase(1);
          setTool('wall');
          onClose();
        }
      },
      {
        id: 'tool_door',
        title: 'Insertar Puerta',
        subtitle: 'Añadir abertura con radio de abatimiento',
        category: 'Herramientas',
        shortcut: 'D',
        icon: '🚪',
        action: () => {
          setPhase(1);
          setTool('door');
          onClose();
        }
      },
      {
        id: 'tool_window',
        title: 'Insertar Ventana',
        subtitle: 'Añadir abertura arquitectónica de vidrio',
        category: 'Herramientas',
        shortcut: 'N',
        icon: '🪟',
        action: () => {
          setPhase(1);
          setTool('window');
          onClose();
        }
      },
      {
        id: 'tool_stairs',
        title: 'Insertar Escalera',
        subtitle: 'Elemento de circulación vertical',
        category: 'Herramientas',
        icon: '🪜',
        action: () => {
          setPhase(1);
          setTool('stairs');
          onClose();
        }
      },
      {
        id: 'tool_box_oct',
        title: 'Caja Octagonal',
        subtitle: 'Centro para luminaria o ventilador',
        category: 'Herramientas',
        shortcut: 'O',
        icon: '💡',
        action: () => {
          setTool('box_oct');
          onClose();
        }
      },
      {
        id: 'tool_box_rect',
        title: 'Caja Rectangular (Chalupa)',
        subtitle: 'Para apagador, tomacorriente o interruptor',
        category: 'Herramientas',
        shortcut: 'R',
        icon: '🔌',
        action: () => {
          setTool('box_rect');
          onClose();
        }
      },
      {
        id: 'tool_box_sq',
        title: 'Caja Cuadrada',
        subtitle: 'Caja de paso 4x4 o registro',
        category: 'Herramientas',
        shortcut: 'Q',
        icon: '📦',
        action: () => {
          setTool('box_sq');
          onClose();
        }
      },
      {
        id: 'tool_tube',
        title: 'Conectar Tubería',
        subtitle: 'Trazar canalización entre cajas',
        category: 'Herramientas',
        shortcut: 'T',
        icon: '⚡',
        action: () => {
          setTool('tube');
          onClose();
        }
      },
      {
        id: 'tool_wire',
        title: 'Enrutar Conductores / Cable',
        subtitle: 'Definir circuitos por canalizaciones',
        category: 'Herramientas',
        shortcut: 'E',
        icon: '〰️',
        action: () => {
          setPhase(2);
          setTool('wire');
          onClose();
        }
      },

      // Fases
      {
        id: 'phase_1',
        title: 'Fase 1: Obra Civil y Arquitectura',
        subtitle: 'Diseño de muros, puertas y cajas',
        category: 'Fases',
        shortcut: '1',
        icon: '📐',
        action: () => {
          setPhase(1);
          onClose();
        }
      },
      {
        id: 'phase_2',
        title: 'Fase 2: Instalación Eléctrica',
        subtitle: 'Asignación de dispositivos y cableado',
        category: 'Fases',
        shortcut: '2',
        icon: '💡',
        action: () => {
          setPhase(2);
          onClose();
        }
      },
      {
        id: 'phase_3',
        title: 'Fase 3: Presupuesto y Cotización (BOM)',
        subtitle: 'Cómputo métrico y cálculo de materiales',
        category: 'Fases',
        shortcut: '3',
        icon: '💰',
        action: () => {
          setPhase(3);
          onClose();
        }
      },
      {
        id: 'phase_4',
        title: 'Fase 4: Memoria Descriptiva',
        subtitle: 'Especificaciones técnicas y normativas',
        category: 'Fases',
        shortcut: '4',
        icon: '📑',
        action: () => {
          setPhase(4);
          onClose();
        }
      },

      // Vista y Zoom
      {
        id: 'view_fit',
        title: 'Ajustar Vista al Plano (Zoom to Fit)',
        subtitle: 'Centrar todos los elementos en pantalla',
        category: 'Vista',
        shortcut: 'Ctrl+0',
        icon: '🔍',
        action: () => {
          onZoomToFit?.();
          onClose();
        }
      },
      {
        id: 'view_reset_zoom',
        title: 'Restablecer Zoom al 100%',
        subtitle: 'Escala 1:1 estándar',
        category: 'Vista',
        icon: '🎯',
        action: () => {
          setZoom(1);
          onClose();
        }
      },
      {
        id: 'view_zoom_in',
        title: 'Acercar Lienzo',
        subtitle: 'Aumentar escala de visualización',
        category: 'Vista',
        shortcut: '+',
        icon: '➕',
        action: () => {
          setZoom((z) => Math.min(5, Number((z * 1.2).toFixed(2))));
          onClose();
        }
      },
      {
        id: 'view_zoom_out',
        title: 'Alejar Lienzo',
        subtitle: 'Disminuir escala de visualización',
        category: 'Vista',
        shortcut: '-',
        icon: '➖',
        action: () => {
          setZoom((z) => Math.max(0.1, Number((z / 1.2).toFixed(2))));
          onClose();
        }
      },
      {
        id: 'view_3d',
        title: 'Alternar Visor 3D',
        subtitle: 'Render tridimensional en tiempo real',
        category: 'Vista',
        icon: '🧊',
        action: () => {
          toggle3D();
          onClose();
        }
      },
      {
        id: 'view_dims',
        title: 'Mostrar / Ocultar Cotas',
        subtitle: 'Medidas acotadas de muros y distancias',
        category: 'Vista',
        icon: '📏',
        action: () => {
          toggleDims();
          onClose();
        }
      },
      {
        id: 'view_rulers',
        title: 'Mostrar / Ocultar Reglas',
        subtitle: 'Escalímetro métrico en los bordes',
        category: 'Vista',
        icon: '📐',
        action: () => {
          toggleRulers();
          onClose();
        }
      },
      {
        id: 'view_theme',
        title: theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro',
        subtitle: 'Alternar tema visual de la aplicación',
        category: 'Vista',
        icon: theme === 'dark' ? '☀️' : '🌙',
        action: () => {
          toggleTheme();
          onClose();
        }
      },

      // Edición
      {
        id: 'edit_undo',
        title: 'Deshacer Acción',
        subtitle: 'Revertir el último cambio',
        category: 'Edición',
        shortcut: 'Ctrl+Z',
        icon: '↩️',
        action: () => {
          onUndo?.();
          onClose();
        }
      },
      {
        id: 'edit_redo',
        title: 'Rehacer Acción',
        subtitle: 'Reaplicar el cambio deshecho',
        category: 'Edición',
        shortcut: 'Ctrl+Y',
        icon: '↪️',
        action: () => {
          onRedo?.();
          onClose();
        }
      },
      {
        id: 'edit_copy',
        title: 'Copiar Selección',
        subtitle: 'Duplicar elemento al portapapeles',
        category: 'Edición',
        shortcut: 'Ctrl+C',
        icon: '📋',
        action: () => {
          onCopy?.();
          onClose();
        }
      },
      {
        id: 'edit_paste',
        title: 'Pegar Elemento',
        subtitle: 'Insertar elemento del portapapeles con offset',
        category: 'Edición',
        shortcut: 'Ctrl+V',
        icon: '📌',
        action: () => {
          onPaste?.();
          onClose();
        }
      },
      {
        id: 'edit_delete',
        title: 'Eliminar Seleccionado',
        subtitle: 'Quitar elemento actual del plano',
        category: 'Edición',
        shortcut: 'Del',
        icon: '🗑️',
        action: () => {
          onDeleteSelected?.();
          onClose();
        }
      },
      {
        id: 'edit_clear',
        title: 'Deseleccionar Todo',
        subtitle: 'Limpiar selección activa',
        category: 'Edición',
        shortcut: 'Esc',
        icon: '✖️',
        action: () => {
          clearSelection();
          onClose();
        }
      },

      // Niveles
      ...levels.map((lvl) => ({
        id: `lvl_${lvl}`,
        title: `Ir a Nivel ${lvl}`,
        subtitle: `Ver planta del Nivel ${lvl}`,
        category: 'Niveles' as const,
        icon: '🏢',
        action: () => {
          setCurrentLevel(lvl);
          onClose();
        }
      })),
      {
        id: 'lvl_add',
        title: 'Añadir Nuevo Nivel',
        subtitle: 'Crear siguiente planta del edificio',
        category: 'Niveles',
        icon: '➕',
        action: () => {
          onAddLevel?.();
          onClose();
        }
      },

      // Proyecto
      {
        id: 'proj_save',
        title: 'Guardar Proyecto Ahora',
        subtitle: 'Forzar sincronización local y en la nube',
        category: 'Proyecto',
        shortcut: 'Ctrl+S',
        icon: '💾',
        action: () => {
          onSave?.();
          onClose();
        }
      },
      {
        id: 'proj_export',
        title: 'Exportar Reporte (PDF / Archivo .gatc)',
        subtitle: 'Generar documentación profesional',
        category: 'Proyecto',
        icon: '📑',
        action: () => {
          onExport?.();
          onClose();
        }
      },
      {
        id: 'proj_prices',
        title: 'Lista de Precios Globales',
        subtitle: 'Editar tarifas por metro y accesorio',
        category: 'Proyecto',
        icon: '💲',
        action: () => {
          onOpenGlobalPrices?.();
          onClose();
        }
      },
      {
        id: 'proj_tour',
        title: 'Ver Tutorial / Tour de Bienvenida',
        subtitle: 'Guía paso a paso sobre el uso de GATC',
        category: 'Proyecto',
        icon: '🎓',
        action: () => {
          onOpenTour?.();
          onClose();
        }
      }
    ];

    return list;
  }, [
    setTool,
    setPhase,
    setZoom,
    toggleTheme,
    toggleDims,
    toggleRulers,
    toggle3D,
    setCurrentLevel,
    clearSelection,
    theme,
    levels,
    onZoomToFit,
    onUndo,
    onRedo,
    onCopy,
    onPaste,
    onDeleteSelected,
    onAddLevel,
    onSave,
    onExport,
    onOpenGlobalPrices,
    onOpenTour,
    onClose
  ]);

  // Filter commands by search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    const query = search.toLowerCase().trim();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(query)) ||
        c.category.toLowerCase().includes(query) ||
        (c.shortcut && c.shortcut.toLowerCase().includes(query))
    );
  }, [commands, search]);

  // Keyboard navigation within palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  // Keep selected element in view
  useEffect(() => {
    if (listRef.current) {
      const selectedItem = listRef.current.querySelector('[data-selected="true"]');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150 ${
          theme === 'dark'
            ? 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-black/80'
            : 'bg-white border-slate-300 text-slate-800 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-700/50 gap-3">
          <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Escribe una acción, herramienta o comando... (ej. pared, cable, zoom, pdf)"
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-slate-500 font-medium"
          />
          <kbd className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 flex-1">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No se encontraron comandos que coincidan con &quot;{search}&quot;
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  data-selected={isSelected}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md'
                      : theme === 'dark'
                        ? 'hover:bg-slate-800/80 text-slate-200'
                        : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">{cmd.icon}</span>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{cmd.title}</div>
                      {cmd.subtitle && (
                        <div
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          {cmd.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold tracking-wider ${
                        isSelected
                          ? 'bg-indigo-700/60 text-indigo-100'
                          : 'bg-slate-800/50 text-slate-400'
                      }`}
                    >
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                          isSelected
                            ? 'bg-indigo-800 text-indigo-100'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div
          className={`px-4 py-2 text-[11px] border-t flex items-center justify-between opacity-70 ${
            theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>↑↓ Navegar</span>
            <span>↵ Ejecutar</span>
            <span>ESC Cerrar</span>
          </div>
          <div>{filteredCommands.length} comandos disponibles</div>
        </div>
      </div>
    </div>
  );
};
