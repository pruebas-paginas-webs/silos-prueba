/* Deja constancia del encuadre medido de cada foto publicada.

   El encuadre que se aplica vive en la base, junto a cada foto: lo mide
   server/services/framing.js al subir y lo guarda `photo-framing-backfill.mjs`
   para las que ya estaban. Este script sólo escribe el registro legible en
   public/assets/photo-framing.json, útil para revisar o comparar.

   Los archivos de foto nunca se modifican.

   Por omisión escribe photo-framing.medido.json y deja intacto el registro de
   los encuadres ya revisados. Para reemplazarlo hace falta --sobrescribir.

   Uso: node scripts/build-photo-framing.mjs [--sobrescribir]                */
import fs from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import { detect } from '../server/services/framing.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'storage');

const db = new Database(path.join(DATA, 'catalog.sqlite'), { readonly: true });
const products = db.prepare('SELECT data FROM products WHERE archived_at IS NULL').all().map(r => JSON.parse(r.data));
db.close();

const frames = {};
let completas = 0;
for (const p of products.filter(p => p.imagen_id)) {
  const archivo = path.join(DATA, 'media', p.imagen_id, 'web.jpg');
  const f = await detect(archivo);
  if (f.source === 'full') completas++;
  // Se guarda en píxeles de la muestra para poder comparar con revisiones anteriores.
  const M = 500;
  frames[p.imagen_id] = {
    width: M, height: M,
    left: +(f.x * M).toFixed(2), top: +(f.y * M).toFixed(2),
    right: +((f.x + f.w) * M).toFixed(2), bottom: +((f.y + f.h) * M).toFixed(2),
    name: p.producto, source: f.source
  };
}
const destino = process.argv.includes('--sobrescribir') ? 'photo-framing.json' : 'photo-framing.medido.json';
await fs.writeFile(path.join(ROOT, 'public/assets', destino), JSON.stringify(frames, null, 2));
console.log(`Encuadres medidos: ${Object.keys(frames).length}${completas ? ` (${completas} quedaron como foto completa)` : ''}`);
console.log(`Registro escrito en public/assets/${destino}. Para aplicarlos: node scripts/photo-framing-backfill.mjs`);
