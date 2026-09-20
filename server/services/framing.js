/* Encuadre automático de fotos.

   Mide el espacio vacío alrededor del producto y devuelve la parte útil en
   fracciones del original. No toca el archivo: el master se conserva intacto
   y el encuadre es sólo una forma de posicionar la foto.

   Ante cualquier duda (fondo de color, foto sin margen, medición rara) se
   devuelve la foto completa, que es el resultado seguro. */
import fs from 'node:fs';
import sharp from 'sharp';
import { invalid } from '../errors.js';

// La matemática vive en public/framing.js, así la web, el panel y el PDF no se
// separan nunca. Ese archivo es un script clásico para el navegador (define
// window.FRAMING), de modo que acá se lo evalúa con un objeto global propio.
export const fuente = fs.readFileSync(new URL('../../public/framing.js', import.meta.url), 'utf8');
export const { normalize, isFull, layout, css, toView, fromView, fitWidth, MARGEN, COMPLETA } =
  new Function('self', fuente + '\n;return self.FRAMING;')({});

const MUESTRA = 500;    // se mide sobre una copia chica: alcanza y es rápido
const UMBRAL = 225;     // por debajo de esto un píxel cuenta como producto
const BORDE = 4;        // holgura en píxeles de la muestra

/** Mide la parte útil de una foto. Devuelve {x,y,w,h,source:'auto'|'full'}. */
export async function detect(input) {
  let data, info;
  try {
    ({ data, info } = await sharp(input, { limitInputPixels: 40000000 })
      .flatten({ background: '#fff' })      // la transparencia cuenta como fondo vacío
      .resize({ width: MUESTRA, height: MUESTRA, fit: 'inside' })
      .removeAlpha().raw().toBuffer({ resolveWithObject: true }));
  } catch {
    return { ...COMPLETA };                 // si no se puede medir, foto entera
  }

  const { width, height, channels } = info;
  const cols = new Uint32Array(width), rows = new Uint32Array(height);
  let tinta = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (Math.min(data[i], data[i + 1], data[i + 2]) < UMBRAL) { cols[x]++; rows[y]++; tinta++; }
    }
  }

  // Una fila o columna cuenta si tiene algo más que unos pocos píxeles sueltos.
  const minCol = Math.max(2, height * 0.008), minRow = Math.max(2, width * 0.008);
  let left = -1, right = -1, top = -1, bottom = -1;
  for (let x = 0; x < width; x++) if (cols[x] > minCol) { if (left < 0) left = x; right = x; }
  for (let y = 0; y < height; y++) if (rows[y] > minRow) { if (top < 0) top = y; bottom = y; }
  if (left < 0 || top < 0) return { ...COMPLETA };                 // todo vacío

  left = Math.max(0, left - BORDE); top = Math.max(0, top - BORDE);
  right = Math.min(width, right + BORDE + 1); bottom = Math.min(height, bottom + BORDE + 1);

  const frame = { x: left / width, y: top / height, w: (right - left) / width, h: (bottom - top) / height, source: 'auto' };

  // Medición poco confiable: fondo de color, foto ya recortada, o producto diminuto.
  const cubreTodo = frame.w > 0.97 && frame.h > 0.97;
  const fondoLleno = tinta / (width * height) > 0.9;
  const minusculo = frame.w < 0.05 || frame.h < 0.05;
  if (cubreTodo || fondoLleno || minusculo) return { ...COMPLETA };
  return frame;
}

/** El encuadre que se aplica: el manual manda; si no, el automático. */
export function effective(metadata) {
  const m = metadata && (typeof metadata === 'string' ? JSON.parse(metadata) : metadata);
  if (!m) return null;
  return normalize(m.frameManual || m.frame || null);
}

/** Valida lo que manda el panel al guardar un ajuste manual. */
export function parseManual(frame) {
  if (frame === null || frame === undefined) return null;         // restablecer
  const n = ['x', 'y', 'w', 'h'];
  if (typeof frame !== 'object' || Object.keys(frame).some(k => !n.includes(k) && k !== 'source'))
    throw invalid('No pudimos guardar el encuadre. Volvé a intentarlo.');
  for (const k of n) if (typeof frame[k] !== 'number' || !isFinite(frame[k]))
    throw invalid('No pudimos guardar el encuadre. Volvé a intentarlo.');
  if (!(frame.w > 0) || !(frame.h > 0) || frame.w > 8 || frame.h > 8)
    throw invalid('Ese encuadre queda fuera de la foto. Probá de nuevo.');
  const round = v => Math.round(v * 1e6) / 1e6;
  return { x: round(frame.x), y: round(frame.y), w: round(frame.w), h: round(frame.h), source: 'manual' };
}

/** Proporción ancho/alto de una variante, según los metadatos guardados. */
export function ratio(metadata, variant = 'web') {
  const m = metadata && (typeof metadata === 'string' ? JSON.parse(metadata) : metadata);
  const f = m && m.files && (m.files[variant] || m.files.master);
  return f && f.width && f.height ? f.width / f.height : 1;
}
