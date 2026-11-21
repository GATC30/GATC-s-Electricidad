/**
 * PDF Export Generator for GATC.
 * Resolves DOM race conditions using requestAnimationFrame + Promise (BUG-06)
 * and fixes dead CSS selectors (BUG-07).
 */

import { jsPDF } from 'jspdf';
import { ProjectState } from '../engine/types';
import { calculateBOM } from '../engine/bom';
import { CATALOG } from '../engine/catalog';
import { escapeHtml } from '../utils/sanitize';

export interface PDFExportOptions {
  includeCivil: boolean;
  includeElectrical: boolean;
  includeQuote: boolean;
  includeMemory: boolean;
  includeNomenclature: boolean;
}

/**
 * Waits for the DOM to completely update and render before taking snapshots or reading elements.
 * Replaces unreliable setTimeout(300) timing (BUG-06 fix).
 */
export function waitForDOMRender(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

/**
 * Adds professional watermark and page numbering to a PDF document.
 */
function addWatermarkAndFooter(
  doc: jsPDF,
  pageWidth: number = 215.9,
  pageHeight: number = 279.4,
  pageNum: number = 1
): void {
  doc.saveGraphicsState();

  // Watermark text in background
  doc.setFontSize(45);
  doc.setTextColor(220, 225, 235);
  doc.setFont('helvetica', 'bold');
  doc.text('GATC CAD', pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 45
  });

  doc.restoreGraphicsState();

  // Footer bar
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);

  const now = new Date().toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  doc.text(`Generado con GATC v2.0 • ${now}`, 20, pageHeight - 10);
  doc.text(`Página ${pageNum}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
}

/**
 * Generates the complete PDF documentation for a GATC project.
 */
export async function generateProjectPDF(
  projectName: string,
  state: ProjectState,
  options: PDFExportOptions
): Promise<jsPDF> {
  // Ensure DOM is fully painted if reading any elements
  await waitForDOMRender();

  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pw = 215.9;
  const ph = 279.4;
  let pageCount = 0;

  const addNewPage = (title: string, subtitle?: string): number => {
    pageCount++;
    if (pageCount > 1) {
      doc.addPage('letter', 'p');
    }
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, 25);

    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, 20, 32);
    }

    return pageCount;
  };

  // 1. Presupuesto de Materiales (BOM)
  if (options.includeQuote) {
    const curPage = addNewPage(
      'Presupuesto de Materiales (BOM)',
      `Proyecto: ${projectName} — Costos estimados de materiales y mano de obra`
    );

    const bom = calculateBOM(state);
    let yPos = 45;

    // Header Table
    doc.setFillColor(241, 245, 249);
    doc.rect(20, yPos - 5, 175, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Material / Descripción', 22, yPos);
    doc.text('Cant', 120, yPos);
    doc.text('P.U (Q)', 145, yPos);
    doc.text('Subtotal (Q)', 170, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 8;

    // Render items
    for (const item of bom.items) {
      if (yPos > 240) {
        addWatermarkAndFooter(doc, pw, ph, curPage);
        addNewPage('Presupuesto de Materiales (cont.)');
        yPos = 40;
      }

      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const label = item.label.length > 48 ? item.label.slice(0, 48) + '...' : item.label;
      doc.text(label, 22, yPos);
      doc.text(`${item.finalQty} ${item.unit}`, 120, yPos);
      doc.text(item.unitPrice.toFixed(2), 145, yPos);
      doc.text(item.subtotal.toFixed(2), 170, yPos);

      doc.setDrawColor(241, 245, 249);
      doc.line(20, yPos + 3, 195, yPos + 3);
      yPos += 8;
    }

    // Render Custom Materials
    if (bom.customMaterials.length > 0) {
      for (const cm of bom.customMaterials) {
        if (yPos > 240) {
          addWatermarkAndFooter(doc, pw, ph, curPage);
          addNewPage('Presupuesto de Materiales (cont.)');
          yPos = 40;
        }

        doc.setFontSize(8.5);
        doc.setTextColor(67, 56, 202); // indigo-700
        const name = cm.name.length > 48 ? cm.name.slice(0, 48) + '...' : cm.name;
        doc.text(`[Extra] ${name}`, 22, yPos);
        doc.text(`${cm.qty} ud`, 120, yPos);
        doc.text(cm.price.toFixed(2), 145, yPos);
        doc.text((cm.qty * cm.price).toFixed(2), 170, yPos);

        doc.setDrawColor(241, 245, 249);
        doc.line(20, yPos + 3, 195, yPos + 3);
        yPos += 8;
      }
    }

    // Total: Calculate directly from bom.totalCost, with safe DOM query fallback (BUG-07 fix: no dead 'tfoot text' selector)
    let totalText = `Q ${bom.totalCost.toFixed(2)}`;
    if (typeof document !== 'undefined') {
      const footerCell = document.querySelector('tfoot td:last-child');
      if (footerCell && footerCell.textContent?.trim()) {
        totalText = footerCell.textContent.trim();
      }
    }

    yPos += 6;
    doc.setFillColor(238, 242, 255);
    doc.rect(115, yPos - 5, 80, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229);
    doc.text(`TOTAL: ${totalText}`, 120, yPos + 2);

    addWatermarkAndFooter(doc, pw, ph, curPage);
  }

  // 2. Memoria Descriptiva
  if (options.includeMemory) {
    const curPage = addNewPage(
      'Memoria Descriptiva',
      `Proyecto: ${projectName} — Especificaciones técnicas y resumen de obra`
    );

    let yPos = 45;
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Condiciones Arquitectónicas y Obra Civil', 20, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `• Ancho estándar de paredes: ${state.pConf.wW.toFixed(2)}m | Altura de nivel: ${state.pConf.wH.toFixed(2)}m`,
      25,
      yPos
    );
    yPos += 6;
    doc.text('• Niveles registrados: ' + state.levels.join(', '), 25, yPos);
    yPos += 6;
    doc.text('• Paredes totales en plano: ' + state.walls.length, 25, yPos);
    yPos += 12;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Condiciones Eléctricas e Instalaciones', 20, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('• Margen extra de cableado: +0.20m en terminales, +0.10m en cajas de paso.', 25, yPos);
    yPos += 6;
    doc.text('• Alturas estándar: Tomacorrientes 0.40m, Interruptores 1.20m, Tableros 1.75m.', 25, yPos);
    yPos += 6;
    doc.text(`• Total de cajas y accesorios: ${state.boxes.length}`, 25, yPos);
    yPos += 6;
    doc.text(`• Tramos de tubería PVC: ${state.tubes.length}`, 25, yPos);
    yPos += 6;
    doc.text(`• Circuitos y rutas cableadas: ${state.routes.length}`, 25, yPos);

    addWatermarkAndFooter(doc, pw, ph, curPage);
  }

  // 3. Nomenclatura y Simbología
  if (options.includeNomenclature) {
    const curPage = addNewPage(
      'Nomenclatura y Simbología Eléctrica',
      'Convenciones y especificaciones de dispositivos utilizados en el proyecto'
    );

    let yPos = 45;
    const usedDeviceKeys = Array.from(
      new Set(state.boxes.map((b) => b.device).filter((d): d is string => Boolean(d)))
    );

    if (usedDeviceKeys.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('No hay dispositivos eléctricos colocados en el plano actual.', 20, yPos);
    } else {
      for (const key of usedDeviceKeys) {
        const spec = (CATALOG as Record<string, any>)[key];
        if (!spec) continue;

        if (yPos > 250) {
          addWatermarkAndFooter(doc, pw, ph, curPage);
          addNewPage('Nomenclatura y Simbología (cont.)');
          yPos = 40;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(79, 70, 229);
        doc.text(`[${spec.sym}] ${spec.label}`, 22, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Altura: ${spec.z.toFixed(2)}m | Precio ref: Q${spec.p.toFixed(2)}`, 22, yPos + 5);

        yPos += 12;
      }
    }

    addWatermarkAndFooter(doc, pw, ph, curPage);
  }

  // If no pages were selected, create default overview page
  if (pageCount === 0) {
    addNewPage(`Proyecto ${projectName}`, 'Resumen de exportación');
    addWatermarkAndFooter(doc, pw, ph, 1);
  }

  return doc;
}
