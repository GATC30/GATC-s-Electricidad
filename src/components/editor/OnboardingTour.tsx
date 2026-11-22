'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/stores/editor-store';

export interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { theme } = useEditorStore();

  if (!isOpen) return null;

  const steps = [
    {
      title: '¡Bienvenido a GATC!',
      subtitle: 'Gestor de Análisis para Tendidos y Costos',
      badge: 'Paso 1 de 5',
      icon: '⚡',
      content: (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            GATC es tu herramienta integral de CAD arquitectónico y diseño eléctrico.
            Te permite pasar rápidamente de un boceto a un plano con cotas exactas, simbología
            normalizada, cómputo métrico de materiales y presupuesto automático.
          </p>
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
            💡 <strong>Consejo rápido:</strong> En cualquier momento puedes pulsar{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">
              Ctrl+K
            </kbd>{' '}
            para abrir la paleta de comandos y buscar cualquier función.
          </div>
        </div>
      )
    },
    {
      title: 'Herramientas de Dibujo CAD',
      subtitle: 'Levantamiento rápido de muros y aberturas',
      badge: 'Paso 2 de 5',
      icon: '📐',
      content: (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            En la barra lateral izquierda encontrarás las herramientas principales para diseñar:
          </p>
          <ul className="grid grid-cols-2 gap-2 text-xs">
            <li className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center gap-2">
              <span className="font-mono text-indigo-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">W</span>
              <span>Dibujar Muros</span>
            </li>
            <li className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center gap-2">
              <span className="font-mono text-indigo-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">D</span>
              <span>Insertar Puertas</span>
            </li>
            <li className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center gap-2">
              <span className="font-mono text-indigo-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">N</span>
              <span>Insertar Ventanas</span>
            </li>
            <li className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center gap-2">
              <span className="font-mono text-indigo-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">V</span>
              <span>Seleccionar / Mover</span>
            </li>
          </ul>
          <p className="text-xs text-slate-400">
            Los muros calculan automáticamente esquinas con inglete (miter joins) y cotas interiores y exteriores.
          </p>
        </div>
      )
    },
    {
      title: 'Flujo en 4 Fases de Trabajo',
      subtitle: 'Desde el plano arquitectónico hasta la cotización',
      badge: 'Paso 3 de 5',
      icon: '📑',
      content: (
        <div className="space-y-2.5 text-xs leading-relaxed">
          <div className="p-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/5">
            <strong className="text-indigo-400 text-sm">Fase 1: Obra Civil</strong>
            <p className="text-slate-300 mt-0.5">Levanta la arquitectura, define ambientes, puertas, ventanas y cajas de registro.</p>
          </div>
          <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5">
            <strong className="text-purple-400 text-sm">Fase 2: Instalación Eléctrica</strong>
            <p className="text-slate-300 mt-0.5">Asigna luminarias, contactos y apagadores a las cajas, traza tuberías y enruta circuitos con conductores.</p>
          </div>
          <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
            <strong className="text-emerald-400 text-sm">Fase 3: Presupuesto (BOM)</strong>
            <p className="text-slate-300 mt-0.5">Cálculo métrico exacto de cables, tubería PVC, cajas y mano de obra con costos editables.</p>
          </div>
          <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <strong className="text-amber-400 text-sm">Fase 4: Memoria Descriptiva</strong>
            <p className="text-slate-300 mt-0.5">Genera automáticamente el pliego de especificaciones técnicas y condiciones arquitectónicas.</p>
          </div>
        </div>
      )
    },
    {
      title: 'Visor 3D y Navegación Precisa',
      subtitle: 'Inspecciona tu modelo en perspectiva real',
      badge: 'Paso 4 de 5',
      icon: '🧊',
      content: (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            Alterna en cualquier instante al <strong>Visor 3D</strong> en la barra superior para explorar
            los muros extruidos en altura, aberturas, tuberías curvas y distribución espacial de cajas.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <strong className="text-indigo-300 block mb-1">🗺️ Minimapa</strong>
              <span className="text-slate-400">Navega planos grandes con vista miniatura interactiva.</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <strong className="text-indigo-300 block mb-1">🔍 Zoom to Fit</strong>
              <span className="text-slate-400">Pulsa <kbd className="font-mono">Ctrl+0</kbd> para centrar todo el plano.</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Exportación y Respaldo Profesional',
      subtitle: 'Comparte con clientes o colaboradores',
      badge: 'Paso 5 de 5',
      icon: '🚀',
      content: (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            Genera documentos PDF de calidad ejecutiva que incluyen carátula, plano arquitectónico,
            diagrama unifilar eléctrico, tabla de presupuesto y memoria descriptiva.
          </p>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            💾 <strong>Auto-guardado continuo:</strong> Tus proyectos se sincronizan de forma segura
            en tu dispositivo y en la nube. Puedes exportar e importar en formato abierto <code>.gatc</code> en cualquier momento.
          </div>
          <p className="text-center font-medium text-slate-300 text-xs mt-2">
            ¡Estás listo para comenzar tu primer proyecto en GATC!
          </p>
        </div>
      )
    }
  ];

  const handleFinish = () => {
    try {
      localStorage.setItem('gatc_onboarding_completed', 'true');
    } catch {}
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleFinish}
    >
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${
          theme === 'dark'
            ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/80'
            : 'bg-white border-slate-300 text-slate-800 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-3 border-b border-slate-700/40 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30">
              {step.icon}
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                {step.badge}
              </span>
              <h2 className="text-lg font-bold mt-1 text-slate-100">{step.title}</h2>
              <p className="text-xs text-slate-400">{step.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Omitir tour"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">{step.content}</div>

        {/* Footer controls */}
        <div className="p-4 px-5 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === currentStep ? 'w-6 bg-indigo-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Ir a paso ${i + 1}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Anterior
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all"
              >
                ¡Comenzar!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
