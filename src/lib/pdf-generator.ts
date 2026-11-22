/**
 * GATC Professional PDF Documentation Generator (pdf-generator.ts)
 * Implements F7-03: PDFGenerator class with dedicated methods for architecture,
 * electrical routing, quotation (BOM), descriptive memory, and visual nomenclature.
 * Renders offscreen blueprints at 4× high resolution and prevents DOM race conditions (BUG-06, BUG-07).
 */

import { jsPDF } from 'jspdf';
import { ProjectState, Box, Wall } from '../engine/types';
import { calculateBOM, BOMCalculationResult } from '../engine/bom';
import { CATALOG } from '../engine/catalog';
import { render2D } from '../engine/renderer2d';
import { drawSymbol } from '../engine/symbols';
import { DEFAULT_WALL_HEIGHT, DEFAULT_WALL_WIDTH, SCALE } from '../engine/constants';

export interface PDFExportOptions {
  includeCivil: boolean;
  includeElectrical: boolean;
  includeQuote: boolean;
  includeMemory: boolean;
  includeNomenclature: boolean;
  selectedLevels?: number[];
}

export const DEFAULT_PDF_OPTIONS: PDFExportOptions = {
  includeCivil: true,
  includeElectrical: true,
  includeQuote: true,
  includeMemory: true,
  includeNomenclature: true
};

/**
 * Ensures the DOM is idle before capturing offscreen canvases (BUG-06 fix).
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
 * Core PDFGenerator class for compiling multi-page professional engineering dossiers.
 */
export class PDFGenerator {
  public doc: jsPDF;
  public projectName: string;
  public state: ProjectState;
  public pageCount: number = 0;

  private readonly pwP = 215.9; // Letter width portrait (mm)
  private readonly phP = 279.4; // Letter height portrait (mm)
  private readonly pwL = 279.4; // Letter width landscape (mm)
  private readonly phL = 215.9; // Letter height landscape (mm)

  constructor(projectName: string, state: ProjectState) {
    this.projectName = projectName.trim() || 'Proyecto_GATC';
    this.state = state;
    this.doc = new jsPDF({
      unit: 'mm',
      format: 'letter',
      orientation: 'p'
    });
  }

  /**
   * Adds the official GATC CAD Pro watermark and standardized footer to the active page.
   */
  public addWatermarkAndFooter(
    pw: number = this.pwP,
    ph: number = this.phP,
    pageNum: number = this.pageCount
  ): void {
    try {
      this.doc.saveGraphicsState();
      this.doc.setFontSize(55);
      this.doc.setTextColor(226, 232, 240); // slate-200
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('GATC CAD', pw / 2, ph / 2, {
        align: 'center',
        angle: 45
      });
      this.doc.restoreGraphicsState();
    } catch (_) {}

    // Footer divider line
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.3);
    this.doc.line(20, ph - 14, pw - 20, ph - 14);

    // Footer text
    this.doc.setFontSize(8);
    this.doc.setTextColor(148, 163, 184); // slate-400
    this.doc.setFont('helvetica', 'normal');

    const dateStr = new Date().toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    this.doc.text(`Generado con GATC v2.0 • ${dateStr} • Proyecto: ${this.projectName}`, 20, ph - 9);
    this.doc.text(`Página ${pageNum}`, pw - 20, ph - 9, { align: 'right' });
  }

  /**
   * Appends a new blank page with standard title header.
   */
  public addNewPage(title: string, subtitle?: string, orientation: 'p' | 'l' = 'p'): number {
    this.pageCount++;
    if (this.pageCount > 1) {
      this.doc.addPage('letter', orientation);
    }

    const pw = orientation === 'l' ? this.pwL : this.pwP;

    this.doc.setFontSize(16);
    this.doc.setTextColor(67, 56, 202); // indigo-700
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, 20, 22);

    if (subtitle) {
      this.doc.setFontSize(9.5);
      this.doc.setTextColor(100, 116, 139); // slate-500
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, 20, 28);
    }

    return this.pageCount;
  }

  /**
   * Calculates bounding box for elements in a specific level.
   */
  private getLevelBounds(level: number): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    this.state.walls
      .filter((w) => w.lvl === level)
      .forEach((w) => {
        minX = Math.min(minX, w.x1, w.x2);
        maxX = Math.max(maxX, w.x1, w.x2);
        minY = Math.min(minY, w.y1, w.y2);
        maxY = Math.max(maxY, w.y1, w.y2);
      });

    this.state.boxes
      .filter((b) => b.lvl === level)
      .forEach((b) => {
        minX = Math.min(minX, b.x);
        maxX = Math.max(maxX, b.x);
        minY = Math.min(minY, b.y);
        maxY = Math.max(maxY, b.y);
      });

    if (minX === Infinity) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    }

    const pad = 35;
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad
    };
  }

  /**
   * Adds an Architectural Blueprint page rendered at 4× high-resolution (F7-03).
   */
  public async addArchitecturePage(level: number): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const bounds = this.getLevelBounds(level);
    const bW = Math.max(bounds.maxX - bounds.minX, 200);
    const bH = Math.max(bounds.maxY - bounds.minY, 200);

    const orientation: 'p' | 'l' = bW > bH ? 'l' : 'p';
    const pw = orientation === 'l' ? this.pwL : this.pwP;
    const ph = orientation === 'l' ? this.phL : this.phP;

    const curPage = this.addNewPage(
      `Plano Arquitectónico y Obra Civil — Nivel ${level}`,
      `Proyecto: ${this.projectName} • Escala 1:100 referencial • Cotas interiores y exteriores`,
      orientation
    );

    // High resolution offscreen canvas (4× scaling)
    const exportScale = 4;
    const offCv = document.createElement('canvas');
    offCv.width = Math.round(bW * exportScale);
    offCv.height = Math.round(bH * exportScale);

    const offCtx = offCv.getContext('2d');
    if (!offCtx) return;

    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, offCv.width, offCv.height);

    offCtx.save();
    offCtx.scale(exportScale, exportScale);
    offCtx.translate(-bounds.minX, -bounds.minY);

    // Call 2D CAD renderer for Phase 1 (Civil)
    render2D(
      offCtx,
      {
        walls: this.state.walls,
        boxes: this.state.boxes,
        tubes: this.state.tubes,
        routes: this.state.routes,
        config: this.state.pConf,
        levels: this.state.levels
      },
      {
        camera: { x: 0, y: 0 },
        zoom: 1,
        currentLevel: level,
        phase: 1,
        tool: 'select',
        selectedId: null,
        selectedType: null,
        showDims: true,
        showRulers: false
      },
      {
        width: bW,
        height: bH,
        isExport: true,
        theme: 'light'
      }
    );
    offCtx.restore();

    // Scale canvas snapshot into the printable PDF area
    const maxW = pw - 40;
    const maxH = ph - 48;
    const ratio = Math.min(maxW / bW, maxH / bH);
    const finalW = bW * ratio;
    const finalH = bH * ratio;
    const offX = 20 + (maxW - finalW) / 2;
    const offY = 32 + (maxH - finalH) / 2;

    const dataUrl = offCv.toDataURL('image/jpeg', 0.88);
    this.doc.addImage(dataUrl, 'JPEG', offX, offY, finalW, finalH, undefined, 'FAST');
    this.addWatermarkAndFooter(pw, ph, curPage);
  }

  /**
   * Adds an Electrical Blueprint and Conduit Routing page rendered at 4× high-resolution (F7-03).
   */
  public async addElectricalPage(level: number): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const bounds = this.getLevelBounds(level);
    const bW = Math.max(bounds.maxX - bounds.minX, 200);
    const bH = Math.max(bounds.maxY - bounds.minY, 200);

    const orientation: 'p' | 'l' = bW > bH ? 'l' : 'p';
    const pw = orientation === 'l' ? this.pwL : this.pwP;
    const ph = orientation === 'l' ? this.phL : this.phP;

    const curPage = this.addNewPage(
      `Plano de Instalaciones Eléctricas y Tendidos — Nivel ${level}`,
      `Proyecto: ${this.projectName} • Simbología unificada, tuberías y circuitos enrutados`,
      orientation
    );

    // High resolution offscreen canvas (4× scaling)
    const exportScale = 4;
    const offCv = document.createElement('canvas');
    offCv.width = Math.round(bW * exportScale);
    offCv.height = Math.round(bH * exportScale);

    const offCtx = offCv.getContext('2d');
    if (!offCtx) return;

    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, offCv.width, offCv.height);

    offCtx.save();
    offCtx.scale(exportScale, exportScale);
    offCtx.translate(-bounds.minX, -bounds.minY);

    // Call 2D CAD renderer for Phase 2 (Electrical)
    render2D(
      offCtx,
      {
        walls: this.state.walls,
        boxes: this.state.boxes,
        tubes: this.state.tubes,
        routes: this.state.routes,
        config: this.state.pConf,
        levels: this.state.levels
      },
      {
        camera: { x: 0, y: 0 },
        zoom: 1,
        currentLevel: level,
        phase: 2,
        tool: 'select',
        selectedId: null,
        selectedType: null,
        showDims: false,
        showRulers: false
      },
      {
        width: bW,
        height: bH,
        isExport: true,
        theme: 'light'
      }
    );
    offCtx.restore();

    const maxW = pw - 40;
    const maxH = ph - 48;
    const ratio = Math.min(maxW / bW, maxH / bH);
    const finalW = bW * ratio;
    const finalH = bH * ratio;
    const offX = 20 + (maxW - finalW) / 2;
    const offY = 32 + (maxH - finalH) / 2;

    const dataUrl = offCv.toDataURL('image/jpeg', 0.88);
    this.doc.addImage(dataUrl, 'JPEG', offX, offY, finalW, finalH, undefined, 'FAST');
    this.addWatermarkAndFooter(pw, ph, curPage);
  }

  /**
   * Adds the Bill of Materials (BOM) & Quotation Table page (F7-03).
   */
  public addQuotePage(customBom?: BOMCalculationResult): void {
    const bom = customBom || calculateBOM(this.state);
    let curPage = this.addNewPage(
      'Presupuesto de Materiales e Instalaciones (BOM)',
      `Proyecto: ${this.projectName} • Conteo exacto de accesorios, metraje de cable y tubería PVC`
    );

    let yPos = 42;

    // Table Header
    const renderTableHeader = () => {
      this.doc.setFillColor(241, 245, 249);
      this.doc.rect(20, yPos - 5, 175, 8, 'F');
      this.doc.setFontSize(9);
      this.doc.setTextColor(15, 23, 42);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Material / Descripción Técnica', 22, yPos);
      this.doc.text('Cant', 118, yPos);
      this.doc.text('P.U (Q)', 142, yPos);
      this.doc.text('Subtotal (Q)', 168, yPos);
      this.doc.setFont('helvetica', 'normal');
      yPos += 8;
    };

    renderTableHeader();

    // Standard Catalog Items
    for (const item of bom.items) {
      if (yPos > 245) {
        this.addWatermarkAndFooter(this.pwP, this.phP, curPage);
        curPage = this.addNewPage(
          'Presupuesto de Materiales (Continuación)',
          `Proyecto: ${this.projectName}`
        );
        yPos = 38;
        renderTableHeader();
      }

      this.doc.setFontSize(8.5);
      this.doc.setTextColor(30, 41, 59);
      const label = item.label.length > 50 ? item.label.slice(0, 50) + '...' : item.label;
      this.doc.text(label, 22, yPos);
      this.doc.text(`${item.finalQty} ${item.unit}`, 118, yPos);
      this.doc.text(item.unitPrice.toFixed(2), 142, yPos);
      this.doc.text(item.subtotal.toFixed(2), 168, yPos);

      this.doc.setDrawColor(241, 245, 249);
      this.doc.line(20, yPos + 3, 195, yPos + 3);
      yPos += 8;
    }

    // Custom Extra Materials
    if (bom.customMaterials && bom.customMaterials.length > 0) {
      for (const cm of bom.customMaterials) {
        if (yPos > 245) {
          this.addWatermarkAndFooter(this.pwP, this.phP, curPage);
          curPage = this.addNewPage(
            'Presupuesto de Materiales (Continuación)',
            `Proyecto: ${this.projectName}`
          );
          yPos = 38;
          renderTableHeader();
        }

        this.doc.setFontSize(8.5);
        this.doc.setTextColor(67, 56, 202);
        const name = cm.name.length > 50 ? cm.name.slice(0, 50) + '...' : cm.name;
        this.doc.text(`[Personalizado] ${name}`, 22, yPos);
        this.doc.text(`${cm.qty} ud`, 118, yPos);
        this.doc.text(cm.price.toFixed(2), 142, yPos);
        this.doc.text((cm.qty * cm.price).toFixed(2), 168, yPos);

        this.doc.setDrawColor(241, 245, 249);
        this.doc.line(20, yPos + 3, 195, yPos + 3);
        yPos += 8;
      }
    }

    // Grand Total Badge
    yPos += 6;
    if (yPos > 248) {
      this.addWatermarkAndFooter(this.pwP, this.phP, curPage);
      curPage = this.addNewPage('Presupuesto - Resumen Total');
      yPos = 40;
    }

    this.doc.setFillColor(238, 242, 255);
    this.doc.roundedRect(110, yPos - 5, 85, 12, 2, 2, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(67, 56, 202);
    this.doc.text(`TOTAL ESTIMADO: Q ${bom.totalCost.toFixed(2)}`, 114, yPos + 3);

    this.addWatermarkAndFooter(this.pwP, this.phP, curPage);
  }

  /**
   * Adds the Technical Descriptive Memory (Memoria Descriptiva) page (F7-03).
   */
  public addMemoryPage(): void {
    const curPage = this.addNewPage(
      'Memoria Técnica Descriptiva',
      `Proyecto: ${this.projectName} • Criterios de diseño, especificaciones de obra y resumen de circuitos`
    );

    let yPos = 44;

    // 1. Civil Conditions
    this.doc.setFontSize(11);
    this.doc.setTextColor(15, 23, 42);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('1. Condiciones Arquitectónicas y Obra Civil', 20, yPos);
    yPos += 7;

    const wW = this.state.pConf?.wW ?? DEFAULT_WALL_WIDTH;
    const wH = this.state.pConf?.wH ?? DEFAULT_WALL_HEIGHT;

    this.doc.setFontSize(9);
    this.doc.setTextColor(71, 85, 105);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`• Espesor nominal de paredes: ${wW.toFixed(2)}m`, 25, yPos);
    yPos += 6;
    this.doc.text(`• Altura libre entre pisos: ${wH.toFixed(2)}m`, 25, yPos);
    yPos += 6;
    this.doc.text(`• Niveles registrados en el proyecto: ${this.state.levels.join(', ')}`, 25, yPos);
    yPos += 6;
    this.doc.text(`• Paredes estructurales y divisiones trazadas: ${this.state.walls.length}`, 25, yPos);
    yPos += 11;

    // 2. Electrical Specifications
    this.doc.setFontSize(11);
    this.doc.setTextColor(15, 23, 42);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('2. Criterios de Tendido Eléctrico', 20, yPos);
    yPos += 7;

    this.doc.setFontSize(9);
    this.doc.setTextColor(71, 85, 105);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('• Sobrelongitud técnica en puntas terminales: +0.20m por conductor.', 25, yPos);
    yPos += 6;
    this.doc.text('• Sobrelongitud en cajas de paso / intermedias: +0.10m por conductor.', 25, yPos);
    yPos += 6;
    this.doc.text('• Alturas de montaje estándar: Tomacorrientes 0.40m, Apagadores 1.20m, Tableros 1.75m.', 25, yPos);
    yPos += 6;
    this.doc.text(`• Total de cajas y accesorios en plano: ${this.state.boxes.length}`, 25, yPos);
    yPos += 6;
    this.doc.text(`• Tramos de tubería conduit PVC: ${this.state.tubes.length}`, 25, yPos);
    yPos += 11;

    // 3. Civil & Conduit Totals
    let bOct = 0,
      bRect = 0,
      bSq = 0,
      totalTubeMeters = 0;

    this.state.boxes.forEach((b) => {
      if (b.type === 'box_oct') bOct++;
      else if (b.type === 'box_rect') bRect++;
      else if (b.type === 'box_sq') bSq++;
    });

    this.state.tubes.forEach((t) => {
      const s = this.state.boxes.find((x) => x.id === t.startId);
      const e = this.state.boxes.find((x) => x.id === t.endId);
      if (s && e) {
        const pts = [{ x: s.x, y: s.y }, ...(t.pts || []), { x: e.x, y: e.y }];
        let dist = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          dist += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) / SCALE;
        }
        if (t.place === 'pared') {
          totalTubeMeters += Math.hypot(dist, (s.z || 0) - (e.z || 0));
        } else if (t.place === 'techo') {
          totalTubeMeters += (wH - (s.z || 0)) + dist + (wH - (e.z || 0));
        } else if (t.place === 'suelo') {
          totalTubeMeters += ((s.z || 0) + 0.2) + dist + ((e.z || 0) + 0.2);
        }
      }
    });

    this.doc.setFontSize(11);
    this.doc.setTextColor(15, 23, 42);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('3. Resumen Global de Cajas y Canalizaciones', 20, yPos);
    yPos += 7;

    this.doc.setFontSize(9);
    this.doc.setTextColor(71, 85, 105);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`• Cajas Octagonales (Plafón / Iluminación): ${bOct} unidades`, 25, yPos);
    yPos += 6;
    this.doc.text(`• Cajas Rectangulares (Tomacorrientes / Apagadores): ${bRect} unidades`, 25, yPos);
    yPos += 6;
    this.doc.text(`• Cajas Cuadradas 4x4 (Paso y Especiales): ${bSq} unidades`, 25, yPos);
    yPos += 6;
    this.doc.text(`• Longitud lineal calculada de tubería conduit PVC: ${totalTubeMeters.toFixed(2)} m`, 25, yPos);
    yPos += 11;

    // 4. Distribution Circuits to Panel
    this.doc.setFontSize(11);
    this.doc.setTextColor(15, 23, 42);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('4. Distribución de Circuitos por Tablero', 20, yPos);
    yPos += 7;

    const panelCircuits: Record<string, string[]> = {};
    this.state.routes.forEach((r) => {
      let panelName = 'Circuitos Generales / Sin Tablero Asignado';
      r.tubes?.forEach((tid) => {
        const t = this.state.tubes.find((x) => x.id === tid);
        if (t) {
          const s = this.state.boxes.find((x) => x.id === t.startId);
          const e = this.state.boxes.find((x) => x.id === t.endId);
          if (s && s.device === 'panel') panelName = s.label || 'Tablero Principal';
          if (e && e.device === 'panel') panelName = e.label || 'Tablero Principal';
        }
      });
      if (!panelCircuits[panelName]) panelCircuits[panelName] = [];
      if (!panelCircuits[panelName].includes(r.name)) {
        panelCircuits[panelName].push(r.name);
      }
    });

    Object.keys(panelCircuits).forEach((panelKey) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9.5);
      this.doc.setTextColor(67, 56, 202);
      this.doc.text(`• ${panelKey}:`, 25, yPos);
      yPos += 5.5;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      this.doc.setTextColor(71, 85, 105);

      panelCircuits[panelKey].forEach((circuitName) => {
        if (yPos > 248) {
          this.addWatermarkAndFooter(this.pwP, this.phP, curPage);
          this.addNewPage('Memoria Técnica Descriptiva (Continuación)');
          yPos = 35;
        }
        this.doc.text(`  - ${circuitName}`, 30, yPos);
        yPos += 5;
      });
      yPos += 3;
    });

    this.addWatermarkAndFooter(this.pwP, this.phP, curPage);
  }

  /**
   * Adds the Visual Electrical Nomenclature & Symbol Legend page (F7-03).
   * Generates exact symbol previews via drawSymbol on an offscreen canvas.
   */
  public addNomenclaturePage(): void {
    let curPage = this.addNewPage(
      'Nomenclatura y Simbología Eléctrica',
      'Simbología normalizada de dispositivos utilizados en los planos del proyecto'
    );

    let yPos = 42;
    const usedDeviceKeys = Array.from(
      new Set(
        this.state.boxes
          .map((b) => b.device)
          .filter((d): d is string => Boolean(d))
      )
    );

    if (usedDeviceKeys.length === 0) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(148, 163, 184);
      this.doc.text('No hay dispositivos eléctricos registrados en el plano.', 20, yPos);
      this.addWatermarkAndFooter(this.pwP, this.phP, curPage);
      return;
    }

    // Header bar
    const renderNomHeader = () => {
      this.doc.setFillColor(241, 245, 249);
      this.doc.rect(20, yPos - 6, 175, 8, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.doc.setTextColor(15, 23, 42);
      this.doc.text('Símbolo', 25, yPos);
      this.doc.text('Descripción del Dispositivo', 48, yPos);
      this.doc.text('Símbolo', 115, yPos);
      this.doc.text('Descripción del Dispositivo', 138, yPos);
      yPos += 10;
    };

    renderNomHeader();

    // Canvas for rendering symbols offscreen
    let symCv: HTMLCanvasElement | null = null;
    let sCtx: CanvasRenderingContext2D | null = null;

    if (typeof document !== 'undefined') {
      symCv = document.createElement('canvas');
      symCv.width = 100;
      symCv.height = 100;
      sCtx = symCv.getContext('2d');
    }

    for (let i = 0; i < usedDeviceKeys.length; i++) {
      const col = i % 2;
      const devKey = usedDeviceKeys[i];
      const spec = (CATALOG as Record<string, any>)[devKey];
      if (!spec) continue;

      if (yPos > 248 && col === 0) {
        this.addWatermarkAndFooter(this.pwP, this.phP, curPage);
        curPage = this.addNewPage(
          'Nomenclatura y Simbología (Continuación)',
          'Simbología normalizada de dispositivos'
        );
        yPos = 40;
        renderNomHeader();
      }

      const curX = col === 0 ? 20 : 110;

      // Draw symbol on offscreen canvas
      if (symCv && sCtx) {
        sCtx.clearRect(0, 0, 100, 100);
        sCtx.save();
        sCtx.translate(50, 50);
        sCtx.scale(2.4, 2.4);

        const s = spec.sym;
        const yOff = s !== 'W' && s !== 'TAB' ? -5 : 0;
        sCtx.translate(0, yOff);

        let sf = 0.5;
        if (
          s.includes('S') ||
          s.includes('M') ||
          s === 'D' ||
          s === 'C' ||
          s === 'B' ||
          s === 'P' ||
          s === 'KWH' ||
          s === 'TV' ||
          s === 'RJ'
        ) {
          sf = 0.85;
        } else if (s === 'T') {
          sf = 0.65;
        }

        drawSymbol(sCtx, devKey, 0, sf);
        sCtx.restore();

        try {
          const symImgData = symCv.toDataURL('image/png');
          this.doc.addImage(symImgData, 'PNG', curX + 2, yPos - 6, 12, 12, undefined, 'FAST');
        } catch (_) {}
      }

      // Device Text & Height
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.doc.setTextColor(30, 41, 59);

      let lbl = spec.label;
      if (lbl.length > 28) lbl = lbl.substring(0, 28) + '...';
      this.doc.text(lbl, curX + 18, yPos);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(`[${spec.sym}] • Altura: ${(spec.z ?? 0.4).toFixed(2)}m`, curX + 18, yPos + 4.5);

      if (col === 1 || i === usedDeviceKeys.length - 1) {
        this.doc.setDrawColor(241, 245, 249);
        this.doc.line(20, yPos + 7, 195, yPos + 7);
        yPos += 13;
      }
    }

    this.addWatermarkAndFooter(this.pwP, this.phP, curPage);
  }

  /**
   * Builds the complete requested PDF dossier by sequentially compiling all selected sections.
   */
  public async build(options: PDFExportOptions = DEFAULT_PDF_OPTIONS): Promise<jsPDF> {
    await waitForDOMRender();

    const levelsToExport =
      options.selectedLevels && options.selectedLevels.length > 0
        ? options.selectedLevels
        : this.state.levels || [1];

    // 1. Architecture Pages per Level
    if (options.includeCivil) {
      for (const lvl of levelsToExport) {
        await this.addArchitecturePage(lvl);
      }
    }

    // 2. Electrical Pages per Level
    if (options.includeElectrical) {
      for (const lvl of levelsToExport) {
        await this.addElectricalPage(lvl);
      }
    }

    // 3. Bill of Materials / Quotation Page
    if (options.includeQuote) {
      this.addQuotePage();
    }

    // 4. Descriptive Technical Memory
    if (options.includeMemory) {
      this.addMemoryPage();
    }

    // 5. Visual Nomenclature Page
    if (options.includeNomenclature) {
      this.addNomenclaturePage();
    }

    // Fallback if no sections were selected
    if (this.pageCount === 0) {
      this.addNewPage(`Proyecto ${this.projectName}`, 'Resumen general de exportación');
      this.addWatermarkAndFooter(this.pwP, this.phP, 1);
    }

    return this.doc;
  }

  /**
   * Generates a binary Blob from the compiled PDF.
   */
  public outputBlob(): Blob {
    return this.doc.output('blob');
  }

  /**
   * Generates an ArrayBuffer from the compiled PDF.
   */
  public outputArrayBuffer(): ArrayBuffer {
    return this.doc.output('arraybuffer');
  }

  /**
   * Directly triggers download in the user's browser.
   */
  public save(fileName?: string): void {
    const safeName = (fileName || this.projectName).replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '_');
    this.doc.save(`${safeName}.pdf`);
  }
}

/**
 * High-level helper for generating a complete project PDF.
 */
export async function generateProjectPDF(
  projectName: string,
  state: ProjectState,
  options: PDFExportOptions = DEFAULT_PDF_OPTIONS
): Promise<jsPDF> {
  const generator = new PDFGenerator(projectName, state);
  await generator.build(options);
  return generator.doc;
}
