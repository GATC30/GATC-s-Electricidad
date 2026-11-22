'use client';

import React from 'react';
import { ToolType, Phase } from '@/engine/types';
import { Tooltip } from '@/components/ui';
import { useEditorStore } from '@/stores/editor-store';

export interface ToolbarProps {
  activePhase: Phase;
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onActionClick?: (actionId: string) => void;
}

interface ToolItemDef {
  id: ToolType | string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  isAction?: boolean;
}

// Strategy Pattern for Phase Tools
export class ToolbarStrategy {
  static getToolsForPhase(phase: Phase): ToolItemDef[] {
    switch (phase) {
      case 1:
        return this.getPhase1Tools();
      case 2:
        return this.getPhase2Tools();
      case 3:
        return this.getPhase3Tools();
      case 4:
        return this.getPhase4Tools();
      default:
        return this.getPhase1Tools();
    }
  }

  private static getPhase1Tools(): ToolItemDef[] {
    return [
      {
        id: 'select',
        label: 'Seleccionar',
        shortcut: 'V',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        )
      },
      {
        id: 'pan',
        label: 'Mover Lienzo',
        shortcut: 'P',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
        )
      },
      {
        id: 'wall',
        label: 'Pared',
        shortcut: 'W',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )
      },
      {
        id: 'door',
        label: 'Puerta',
        shortcut: 'D',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 3v18m0-18h8a2 2 0 012 2v16H8m0 0H5m6-10h.01" />
          </svg>
        )
      },
      {
        id: 'window',
        label: 'Ventana',
        shortcut: 'N',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm8-1v16M4 12h16" />
          </svg>
        )
      },
      {
        id: 'stairs',
        label: 'Escalera',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21h4v-4h4v-4h4v-4h4V5" />
          </svg>
        )
      },
      {
        id: 'box_oct',
        label: 'Caja Octag.',
        shortcut: 'O',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5z" />
          </svg>
        )
      },
      {
        id: 'box_rect',
        label: 'Caja Rect.',
        shortcut: 'R',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="5" y="7" width="14" height="10" rx="1.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      },
      {
        id: 'box_sq',
        label: 'Caja Cuadr.',
        shortcut: 'Q',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="5" y="5" width="14" height="14" rx="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      },
      {
        id: 'tube',
        label: 'Tubería',
        shortcut: 'T',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        )
      },
      {
        id: 'move_env',
        label: 'Mover Amb.',
        shortcut: 'M',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )
      }
    ];
  }

  private static getPhase2Tools(): ToolItemDef[] {
    return [
      {
        id: 'select',
        label: 'Seleccionar',
        shortcut: 'V',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
          </svg>
        )
      },
      {
        id: 'pan',
        label: 'Mover Lienzo',
        shortcut: 'P',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11" />
          </svg>
        )
      },
      {
        id: 'wire',
        label: 'Enrutar Cable',
        shortcut: 'E',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      },
      {
        id: 'tube',
        label: 'Nueva Tubería',
        shortcut: 'T',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        )
      }
    ];
  }

  private static getPhase3Tools(): ToolItemDef[] {
    return [
      {
        id: 'action_refresh_bom',
        label: 'Actualizar',
        isAction: true,
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      },
      {
        id: 'action_global_prices',
        label: 'Precios',
        isAction: true,
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      {
        id: 'action_add_custom_mat',
        label: 'Añadir Extra',
        isAction: true,
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )
      }
    ];
  }

  private static getPhase4Tools(): ToolItemDef[] {
    return [
      {
        id: 'action_refresh_specs',
        label: 'Actualizar',
        isAction: true,
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      },
      {
        id: 'action_copy_summary',
        label: 'Copiar Texto',
        isAction: true,
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )
      }
    ];
  }
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activePhase,
  activeTool,
  onSelectTool,
  onActionClick
}) => {
  const { theme } = useEditorStore();
  const tools = ToolbarStrategy.getToolsForPhase(activePhase);

  return (
    <aside
      aria-label="Barra de herramientas"
      className={`border-t md:border-t-0 md:border-r z-20 flex md:flex-col items-center justify-start py-1.5 md:py-3 px-2 md:px-1.5 gap-1.5 overflow-x-auto md:overflow-y-auto w-full md:w-20 shrink-0 transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'
      }`}
    >
      {tools.map((item) => {
        const isActive = !item.isAction && activeTool === item.id;

        return (
          <Tooltip key={item.id} content={item.label} shortcut={item.shortcut} position="right">
            <button
              type="button"
              role="button"
              tabIndex={0}
              aria-label={item.shortcut ? `${item.label} (Tecla ${item.shortcut})` : item.label}
              aria-pressed={isActive}
              onClick={() => {
                if (item.isAction) {
                  onActionClick?.(item.id);
                } else {
                  onSelectTool(item.id as ToolType);
                }
              }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all duration-200 min-w-[3.5rem] md:min-w-0 md:w-16 h-14 select-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 shadow-inner'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <div className={`${isActive ? 'text-indigo-400' : 'text-slate-400'} mb-1`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-semibold tracking-tight leading-none truncate max-w-[56px]">
                {item.label}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </aside>
  );
};
