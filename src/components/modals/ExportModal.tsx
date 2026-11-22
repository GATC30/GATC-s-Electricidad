'use client';

import React, { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { ProjectState } from '@/engine/types';
import { generateProjectPDF, PDFExportOptions } from '@/lib/pdf-generator';
import { exportProject } from '@/lib/export';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  state: ProjectState;
  onToast?: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  state,
  onToast
}) => {
  const [options, setOptions] = useState<PDFExportOptions>({
    includeCivil: true,
    includeElectrical: true,
    includeQuote: true,
    includeMemory: true,
    includeNomenclature: true,
    selectedLevels: state.levels || [1]
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingCloud, setIsExportingCloud] = useState(false);

  const toggleOption = (key: keyof Omit<PDFExportOptions, 'selectedLevels'>) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleLevel = (lvl: number) => {
    setOptions((prev) => {
      const current = prev.selectedLevels || state.levels;
      if (current.includes(lvl)) {
        if (current.length === 1) return prev; // Keep at least one
        return { ...prev, selectedLevels: current.filter((l) => l !== lvl) };
      } else {
        return { ...prev, selectedLevels: [...current, lvl].sort((a, b) => a - b) };
      }
    });
  };

  // Client-side PDF generation
  const handleExportClientPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      onToast?.('Generando documento PDF en alta resolución (4×)...', 'info');
      const doc = await generateProjectPDF(projectName, state, options);
      const safeName = projectName.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '_');
      doc.save(`${safeName}_documentacion.pdf`);
      onToast?.('Documento PDF descargado exitosamente.', 'success');
      onClose();
    } catch (err: any) {
      console.error('Error generando PDF cliente:', err);
      onToast?.('Ocurrió un error al generar el PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Server-side cloud export
  const handleExportCloudPDF = async () => {
    setIsExportingCloud(true);
    try {
      onToast?.('Enviando a compilar en la nube...', 'info');
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          state,
          saveToBlob: true
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.blobUrl || data.downloadUrl) {
          window.open(data.downloadUrl || data.blobUrl, '_blank');
          onToast?.('PDF generado en la nube y almacenado en Vercel Blob.', 'success');
        } else {
          onToast?.('PDF generado en la nube.', 'success');
        }
      } else {
        // Direct stream download
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, '_')}_server.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        onToast?.('PDF descargado desde el servidor.', 'success');
      }
      onClose();
    } catch (err: any) {
      console.error('Error generando PDF server:', err);
      onToast?.('Error al conectar con la API de exportación.', 'error');
    } finally {
      setIsExportingCloud(false);
    }
  };

  // GATC Project File Export (.gatc)
  const handleExportGatcFile = () => {
    try {
      exportProject(projectName, state);
      onToast?.('Archivo .gatc descargado correctamente.', 'success');
      onClose();
    } catch (err: any) {
      onToast?.('No se pudo exportar el archivo .gatc.', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Proyecto CAD & Documentación"
      size="lg"
    >
      <div className="space-y-6 select-none">
        {/* Section 1: PDF Configuration */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold uppercase tracking-wider text-indigo-400">
              1. Documentación Técnica en PDF
            </span>
            <span className="h-px flex-1 bg-slate-800" />
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Selecciona las secciones técnicas y planos que deseas incluir en el documento PDF
            generado:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {/* Include Civil */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={options.includeCivil}
                onChange={() => toggleOption('includeCivil')}
                className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-bold text-slate-200 block">
                  🏛️ Planos Arquitectónicos
                </span>
                <span className="text-xs text-slate-400">
                  Paredes, aberturas y cotas métricas (Fase 1)
                </span>
              </div>
            </label>

            {/* Include Electrical */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={options.includeElectrical}
                onChange={() => toggleOption('includeElectrical')}
                className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-bold text-slate-200 block">
                  ⚡ Planos Eléctricos y Tendidos
                </span>
                <span className="text-xs text-slate-400">
                  Dispositivos, tuberías conduit y circuitos (Fase 2)
                </span>
              </div>
            </label>

            {/* Include BOM / Quote */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={options.includeQuote}
                onChange={() => toggleOption('includeQuote')}
                className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-bold text-slate-200 block">
                  📊 Presupuesto de Materiales (BOM)
                </span>
                <span className="text-xs text-slate-400">
                  Costos calculados, metrajes de cable y tubería
                </span>
              </div>
            </label>

            {/* Include Memory */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={options.includeMemory}
                onChange={() => toggleOption('includeMemory')}
                className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-bold text-slate-200 block">
                  📝 Memoria Técnica Descriptiva
                </span>
                <span className="text-xs text-slate-400">
                  Criterios de diseño, cuadro de circuitos y cargas
                </span>
              </div>
            </label>

            {/* Include Nomenclature */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-colors sm:col-span-2">
              <input
                type="checkbox"
                checked={options.includeNomenclature}
                onChange={() => toggleOption('includeNomenclature')}
                className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-bold text-slate-200 block">
                  🏷️ Nomenclatura y Simbología Visual
                </span>
                <span className="text-xs text-slate-400">
                  Tabla con los símbolos exactos y alturas de instalación de los dispositivos del proyecto
                </span>
              </div>
            </label>
          </div>

          {/* Level Filter for PDF */}
          {(options.includeCivil || options.includeElectrical) && state.levels.length > 1 && (
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300 block mb-2">
                Niveles a exportar en los planos:
              </span>
              <div className="flex flex-wrap gap-2">
                {state.levels.map((lvl) => {
                  const isSel = options.selectedLevels?.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => toggleLevel(lvl)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                        isSel
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      Nivel {lvl}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: PDF Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            variant="primary"
            className="w-full sm:flex-1 py-2.5 font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-950/40"
            isLoading={isGeneratingPdf}
            onClick={handleExportClientPDF}
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            Descargar PDF en Alta Resolución
          </Button>

          <Button
            variant="outline"
            className="w-full sm:w-auto py-2.5 text-xs font-semibold border-slate-700 hover:bg-slate-800"
            isLoading={isExportingCloud}
            onClick={handleExportCloudPDF}
            title="Genera el documento en la nube y lo almacena en Vercel Blob"
          >
            ☁️ Compilar en Servidor
          </Button>
        </div>

        {/* Section 3: Backup Project File (.gatc) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold uppercase tracking-wider text-purple-400">
              2. Archivo de Respaldo (.gatc)
            </span>
            <span className="h-px flex-1 bg-slate-800" />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <div>
              <span className="text-sm font-bold text-slate-200 block">
                Exportar Plano Completo (.gatc)
              </span>
              <span className="text-xs text-slate-400">
                Guarda toda la geometría, circuitos y configuración en formato estándar para transferir o restaurar
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportGatcFile}
              className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border-purple-500/30 text-xs font-bold shrink-0"
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              }
            >
              Descargar .gatc
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
