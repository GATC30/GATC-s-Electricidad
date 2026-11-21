import { DeviceKey } from './types';
import { CATALOG } from './catalog';

/**
 * Pure function to render standardized electrical symbols on a 2D HTML5 canvas.
 * Conforms to NOM / IEC architectural convention with high-visibility contrast outlines.
 */
export function drawSymbol(
  ctx: CanvasRenderingContext2D,
  devKey: DeviceKey,
  rot: number,
  scaleFact: number = 1,
  isWallMounted: boolean = false
): void {
  const dev = CATALOG[devKey];
  if (!dev) return;

  const s = dev.sym;

  ctx.save();

  if (isWallMounted) {
    let shiftY = 7.5;
    if (s === 'TAB' || s === 'W') {
      shiftY = 0;
    } else if (s === 'TV' || s === 'RJ') {
      shiftY = 6;
    } else if (s === 'TIM') {
      shiftY = 10;
    }
    ctx.translate(0, shiftY * scaleFact);
  }

  const outlineStroke = (customWidth: number = 0.8) => {
    ctx.lineJoin = 'round';
    ctx.lineWidth = customWidth * scaleFact;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.lineWidth = customWidth * 0.5 * scaleFact;
    ctx.strokeStyle = '#b91c1c';
    ctx.stroke();
  };

  const drawTextWOutline = (
    txt: string,
    x: number,
    y: number,
    fontSz: number,
    outlineW: number = 0.8
  ) => {
    ctx.font = `bold ${fontSz}px sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = outlineW * scaleFact;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(txt, x, y);
    ctx.fillText(txt, x, y);
  };

  ctx.fillStyle = '#ffffff';

  // 1. Base Geometry
  if (s.includes('T') && s !== 'TAB' && s !== 'TIM' && s !== 'TV' && s !== 'RJ') {
    // Tomacorrientes (T, T240)
    ctx.beginPath();
    ctx.arc(0, 0, 7.5 * scaleFact, 0, Math.PI * 2);
    ctx.fill();
    outlineStroke();

    ctx.beginPath();
    ctx.moveTo(-7.5 * scaleFact, -2.5 * scaleFact);
    ctx.lineTo(7.5 * scaleFact, -2.5 * scaleFact);
    ctx.moveTo(-7.5 * scaleFact, 2.5 * scaleFact);
    ctx.lineTo(7.5 * scaleFact, 2.5 * scaleFact);
    outlineStroke();
  } else if (s === 'L') {
    // Lámpara de plafón
    ctx.beginPath();
    ctx.arc(0, 0, 9 * scaleFact, 0, Math.PI * 2);
    ctx.fill();
    outlineStroke();

    ctx.beginPath();
    ctx.moveTo(-6 * scaleFact, -6 * scaleFact);
    ctx.lineTo(6 * scaleFact, 6 * scaleFact);
    ctx.moveTo(-6 * scaleFact, 6 * scaleFact);
    ctx.lineTo(6 * scaleFact, -6 * scaleFact);
    outlineStroke();
  } else if (s === 'W') {
    // Lámpara de pared (Braquete)
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 7.5 * scaleFact, 0, Math.PI, false);
    ctx.fill();
    outlineStroke(1.0);

    ctx.beginPath();
    ctx.moveTo(-10 * scaleFact, 0);
    ctx.lineTo(10 * scaleFact, 0);
    outlineStroke(1.0);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-5 * scaleFact, 5 * scaleFact);
    ctx.moveTo(0, 0);
    ctx.lineTo(5 * scaleFact, 5 * scaleFact);
    outlineStroke(1.0);
    ctx.restore();
  } else if (s === 'TAB') {
    // Tablero de Distribución
    ctx.beginPath();
    ctx.rect(-15 * scaleFact, 0, 30 * scaleFact, 15 * scaleFact);
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2 * scaleFact;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.lineWidth = 1 * scaleFact;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-15 * scaleFact, 0);
    ctx.lineTo(15 * scaleFact, 15 * scaleFact);
    ctx.lineTo(-15 * scaleFact, 15 * scaleFact);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
  } else if (s === 'TIM') {
    // Timbre campana
    ctx.beginPath();
    ctx.arc(0, -3 * scaleFact, 7 * scaleFact, 0, Math.PI, true);
    ctx.fill();
    outlineStroke();

    ctx.beginPath();
    ctx.moveTo(-9 * scaleFact, -3 * scaleFact);
    ctx.lineTo(9 * scaleFact, -3 * scaleFact);
    ctx.moveTo(0, -3 * scaleFact);
    ctx.lineTo(0, 5 * scaleFact);
    ctx.arc(0, 7 * scaleFact, 2 * scaleFact, 0, Math.PI * 2);
    outlineStroke();
  } else if (s === 'TV' || s === 'RJ') {
    // Telecomunicaciones (TV, RJ45)
    ctx.beginPath();
    ctx.rect(-6 * scaleFact, -6 * scaleFact, 12 * scaleFact, 12 * scaleFact);
    ctx.fill();
    outlineStroke();
  } else if (!s.includes('S') && !s.includes('M')) {
    // Círculo genérico para Ducha, Calentador, Contador, Bomba, etc.
    ctx.beginPath();
    ctx.arc(0, 0, 7.5 * scaleFact, 0, Math.PI * 2);
    ctx.fill();
    outlineStroke();
  }

  // 2. Text / Labels (un-rotated with respect to wall so text stays readable)
  ctx.save();
  ctx.rotate((-rot * Math.PI) / 180);
  ctx.fillStyle = '#b91c1c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (s === 'T') {
    if (dev.sub) {
      drawTextWOutline(dev.sub, 0, 12 * scaleFact, 8 * scaleFact, 0.8);
    }
  } else if (
    (s.includes('S') ||
      s.includes('M') ||
      s === 'D' ||
      s === 'C' ||
      s === 'B' ||
      s === 'P' ||
      s === 'KWH' ||
      s === 'TV' ||
      s === 'RJ') &&
    s !== 'TAB' &&
    s !== 'TIM'
  ) {
    let bx = 0;
    if (dev.pre) {
      drawTextWOutline(dev.pre, -5 * scaleFact, 0, 10 * scaleFact, 0.8);
      bx = 3.5 * scaleFact;
    }
    drawTextWOutline(s, bx, 0, 13 * scaleFact, 1.0);
    if (dev.sub) {
      drawTextWOutline(dev.sub, bx + 6.5 * scaleFact, 4 * scaleFact, 7 * scaleFact, 0.8);
    }
  }

  ctx.restore();
  ctx.restore();
}
