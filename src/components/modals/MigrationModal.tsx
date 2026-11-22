'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  LegacyDetectionResult,
  MigrationResult,
  migrateLegacyData,
  dismissLegacyMigration
} from '@/lib/migration';

export interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  detection: LegacyDetectionResult | null;
  onMigrated: (result: MigrationResult) => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  isOpen,
  onClose,
  detection,
  onMigrated
}) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  if (!detection || !detection.hasLegacyData) return null;

  const handleStartMigration = async () => {
    setIsMigrating(true);
    try {
      const res = await migrateLegacyData();
      setMigrationResult(res);
      onMigrated(res);
    } catch (err: any) {
      setMigrationResult({
        success: false,
        migratedProjects: 0,
        migratedPrices: 0,
        errors: [err?.message || 'Error inesperado durante la migración'],
        warnings: []
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismissPermanently = () => {
    dismissLegacyMigration();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Migración de Datos v1.5 → v2.0</h2>
            <p className="text-xs text-slate-400">GATC — Compatibilidad con proyectos anteriores</p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          {!migrationResult ? (
            <>
              <button
                type="button"
                onClick={handleDismissPermanently}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                disabled={isMigrating}
              >
                No volver a mostrar
              </button>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={isMigrating}
                >
                  Más tarde
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartMigration}
                  isLoading={isMigrating}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  }
                >
                  {isMigrating ? 'Migrando...' : 'Migrar Proyectos Ahora'}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <Button
                variant="primary"
                size="sm"
                onClick={onClose}
              >
                Finalizar y Continuar
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4 py-1 text-slate-300 text-sm">
        {!migrationResult ? (
          <>
            <p className="leading-relaxed">
              Hemos detectado <strong className="text-amber-400">{detection.projectCount} proyectos</strong> y configuraciones guardadas en tu navegador desde <strong className="text-white">GATC v1.5</strong>.
            </p>
            <p className="text-xs text-slate-400">
              Al migrarlos, se actualizarán a la estructura de datos v2.0 para soportar todas las nuevas funciones (niveles ilimitados, visualizador 3D, cálculos avanzados de BOM y exportación en alta resolución), conservando todas tus paredes, cajas, tuberías y circuitos intactos.
            </p>

            {/* Project List Preview */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              {detection.projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-200">{p.name}</span>
                    <span className="text-slate-400 text-[11px]">
                      {p.wallsCount} paredes · {p.boxesCount} cajas · {p.circuitsCount} circuitos
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    Legacy v1.5
                  </span>
                </div>
              ))}

              {detection.hasGlobalPrices && (
                <div className="flex items-center justify-between p-2.5 rounded-md bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Precios Globales Personalizados</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {detection.globalPricesCount} items
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3 py-2">
            {migrationResult.success ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3">
                <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="text-xs space-y-1">
                  <h4 className="text-sm font-bold text-white">¡Migración completada con éxito!</h4>
                  <p>
                    Se migraron <strong>{migrationResult.migratedProjects} proyectos</strong> al almacenamiento local de alta capacidad (IndexedDB).
                  </p>
                  {migrationResult.migratedPrices > 0 && (
                    <p>
                      Se importaron <strong>{migrationResult.migratedPrices} precios</strong> a tu catálogo global.
                    </p>
                  )}
                  {migrationResult.warnings.length > 0 && (
                    <details className="mt-2 text-[11px] text-slate-400 cursor-pointer">
                      <summary>Ver advertencias menores ({migrationResult.warnings.length})</summary>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {migrationResult.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-3">
                <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div className="text-xs space-y-1">
                  <h4 className="text-sm font-bold text-white">Hubo problemas en la migración</h4>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {migrationResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
