import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { jsPDF } from 'jspdf';
import { prisma } from '@/lib/db';
import { calculateBOM } from '@/engine/bom';
import { CATALOG } from '@/engine/catalog';
import { ProjectState } from '@/engine/types';
import { DEFAULT_WALL_HEIGHT, DEFAULT_WALL_WIDTH } from '@/engine/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExportPdfRequestBody {
  projectId?: string;
  projectName?: string;
  state: ProjectState;
  saveToBlob?: boolean;
}

/**
 * Server-side PDF compilation route for GATC (F7-04).
 * Generates vector/table engineering reports and stores them in Vercel Blob.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExportPdfRequestBody;
    const { projectId, projectName = 'Proyecto_GATC', state, saveToBlob = true } = body;

    if (!state || !Array.isArray(state.walls) || !Array.isArray(state.boxes)) {
      return NextResponse.json(
        { error: 'Estado de proyecto inválido o incompleto.' },
        { status: 400 }
      );
    }

    const safeName = projectName.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '_');
    const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'p' });
    const pw = 215.9;
    const ph = 279.4;
    let pageCount = 0;

    const addWatermarkAndFooter = (curPage: number) => {
      try {
        doc.saveGraphicsState();
        doc.setFontSize(55);
        doc.setTextColor(230, 235, 245);
        doc.setFont('helvetica', 'bold');
        doc.text('GATC CAD', pw / 2, ph / 2, { align: 'center', angle: 45 });
        doc.restoreGraphicsState();
      } catch (_) {}

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(20, ph - 14, pw - 20, ph - 14);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      const dateStr = new Date().toLocaleDateString('es-GT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      doc.text(`Generado en la Nube con GATC v2.0 • ${dateStr} • Proyecto: ${projectName}`, 20, ph - 9);
      doc.text(`Página ${curPage}`, pw - 20, ph - 9, { align: 'right' });
    };

    const addNewPage = (title: string, subtitle?: string) => {
      pageCount++;
      if (pageCount > 1) {
        doc.addPage('letter', 'p');
      }
      doc.setFontSize(16);
      doc.setTextColor(67, 56, 202);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, 22);

      if (subtitle) {
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(subtitle, 20, 28);
      }
      return pageCount;
    };

    // 1. Presupuesto de Materiales (BOM)
    const p1 = addNewPage(
      'Presupuesto de Materiales (BOM Server)',
      `Proyecto: ${projectName} • Reporte compilado en Vercel Serverless`
    );

    const bom = calculateBOM(state);
    let yPos = 42;

    doc.setFillColor(241, 245, 249);
    doc.rect(20, yPos - 5, 175, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Material / Descripción Técnica', 22, yPos);
    doc.text('Cant', 118, yPos);
    doc.text('P.U (Q)', 142, yPos);
    doc.text('Subtotal (Q)', 168, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 8;

    for (const item of bom.items) {
      if (yPos > 245) {
        addWatermarkAndFooter(p1);
        addNewPage('Presupuesto de Materiales (Cont.)', `Proyecto: ${projectName}`);
        yPos = 38;
      }

      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const label = item.label.length > 50 ? item.label.slice(0, 50) + '...' : item.label;
      doc.text(label, 22, yPos);
      doc.text(`${item.finalQty} ${item.unit}`, 118, yPos);
      doc.text(item.unitPrice.toFixed(2), 142, yPos);
      doc.text(item.subtotal.toFixed(2), 168, yPos);

      doc.setDrawColor(241, 245, 249);
      doc.line(20, yPos + 3, 195, yPos + 3);
      yPos += 8;
    }

    // Custom Materials
    if (bom.customMaterials && bom.customMaterials.length > 0) {
      for (const cm of bom.customMaterials) {
        if (yPos > 245) {
          addWatermarkAndFooter(p1);
          addNewPage('Presupuesto de Materiales (Cont.)', `Proyecto: ${projectName}`);
          yPos = 38;
        }

        doc.setFontSize(8.5);
        doc.setTextColor(67, 56, 202);
        const name = cm.name.length > 50 ? cm.name.slice(0, 50) + '...' : cm.name;
        doc.text(`[Extra] ${name}`, 22, yPos);
        doc.text(`${cm.qty} ud`, 118, yPos);
        doc.text(cm.price.toFixed(2), 142, yPos);
        doc.text((cm.qty * cm.price).toFixed(2), 168, yPos);

        doc.setDrawColor(241, 245, 249);
        doc.line(20, yPos + 3, 195, yPos + 3);
        yPos += 8;
      }
    }

    // Total Cost
    yPos += 6;
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(110, yPos - 5, 85, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(67, 56, 202);
    doc.text(`TOTAL ESTIMADO: Q ${bom.totalCost.toFixed(2)}`, 114, yPos + 3);
    addWatermarkAndFooter(p1);

    // 2. Memoria Descriptiva
    const p2 = addNewPage(
      'Memoria Técnica Descriptiva',
      `Proyecto: ${projectName} • Criterios de diseño y resumen de componentes`
    );

    let mY = 44;
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Parámetros de Obra Civil', 20, mY);
    mY += 7;

    const wW = state.pConf?.wW ?? DEFAULT_WALL_WIDTH;
    const wH = state.pConf?.wH ?? DEFAULT_WALL_HEIGHT;

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Espesor estándar de paredes: ${wW.toFixed(2)}m`, 25, mY);
    mY += 6;
    doc.text(`• Altura libre de nivel: ${wH.toFixed(2)}m`, 25, mY);
    mY += 6;
    doc.text(`• Niveles configurados: ${state.levels?.join(', ') || '1'}`, 25, mY);
    mY += 6;
    doc.text(`• Cantidad de tramos de pared: ${state.walls.length}`, 25, mY);
    mY += 12;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Parámetros Eléctricos y Tuberías', 20, mY);
    mY += 7;

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('• Sobrelongitud en terminales: +0.20m por conductor.', 25, mY);
    mY += 6;
    doc.text('• Sobrelongitud en cajas de paso: +0.10m por conductor.', 25, mY);
    mY += 6;
    doc.text(`• Total de cajas y accesorios en plano: ${state.boxes.length}`, 25, mY);
    mY += 6;
    doc.text(`• Total de tramos de tubería PVC: ${state.tubes.length}`, 25, mY);
    mY += 6;
    doc.text(`• Total de circuitos enrutados: ${state.routes.length}`, 25, mY);

    addWatermarkAndFooter(p2);

    // 3. Nomenclatura y Catálogo de Dispositivos Usados
    const p3 = addNewPage(
      'Nomenclatura y Dispositivos Eléctricos',
      'Especificaciones y convenciones utilizadas en este proyecto'
    );

    let nY = 42;
    const usedDeviceKeys = Array.from(
      new Set(
        state.boxes
          .map((b) => b.device)
          .filter((d): d is string => Boolean(d))
      )
    );

    if (usedDeviceKeys.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text('No hay dispositivos eléctricos registrados en el proyecto.', 20, nY);
    } else {
      doc.setFillColor(241, 245, 249);
      doc.rect(20, nY - 5, 175, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Código / Símbolo', 24, nY);
      doc.text('Descripción del Dispositivo', 65, nY);
      doc.text('Altura Ref.', 140, nY);
      doc.text('P.U Ref.(Q)', 170, nY);
      nY += 9;

      for (const devKey of usedDeviceKeys) {
        const spec = (CATALOG as Record<string, any>)[devKey];
        if (!spec) continue;

        if (nY > 245) {
          addWatermarkAndFooter(p3);
          addNewPage('Nomenclatura y Dispositivos (Cont.)');
          nY = 38;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(67, 56, 202);
        doc.text(`[${spec.sym}]`, 24, nY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(spec.label.substring(0, 42), 65, nY);
        doc.text(`${(spec.z ?? 0.4).toFixed(2)}m`, 140, nY);
        doc.text((spec.p ?? 0).toFixed(2), 170, nY);

        doc.setDrawColor(241, 245, 249);
        doc.line(20, nY + 3, 195, nY + 3);
        nY += 8;
      }
    }
    addWatermarkAndFooter(p3);

    // Compile binary buffer
    const arrayBuffer = doc.output('arraybuffer');
    const pdfBuffer = Buffer.from(arrayBuffer);

    // If Vercel Blob token is available and requested, upload to Vercel Blob
    const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

    if (saveToBlob && hasBlobToken) {
      const fileName = `exports/${safeName}_${Date.now()}.pdf`;
      const blob = await put(fileName, pdfBuffer, {
        access: 'public',
        contentType: 'application/pdf'
      });

      // Register export in database if projectId is provided and prisma is available
      if (projectId) {
        try {
          await prisma.export.create({
            data: {
              projectId,
              blobUrl: blob.url,
              format: 'pdf'
            }
          });
        } catch (dbErr) {
          console.warn('Could not record export in database:', dbErr);
        }
      }

      return NextResponse.json({
        success: true,
        blobUrl: blob.url,
        downloadUrl: blob.downloadUrl || blob.url,
        fileName: `${safeName}.pdf`,
        sizeBytes: pdfBuffer.length
      });
    }

    // Direct binary PDF response fallback
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error: any) {
    console.error('Error generating PDF server-side:', error);
    return NextResponse.json(
      { error: 'Error interno al generar el documento PDF.', details: error.message },
      { status: 500 }
    );
  }
}
