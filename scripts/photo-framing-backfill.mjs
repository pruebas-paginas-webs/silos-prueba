/* Deja el encuadre de cada foto guardado junto a la foto, en la base.

   - Los encuadres ya revisados (public/assets/photo-framing.json) se importan
     tal cual: la web y el PDF siguen viéndose exactamente igual.
   - El resto se mide automáticamente.
   - Nunca pisa un ajuste manual ni un encuadre ya guardado: se puede volver a
     correr sin efecto.

   Uso: node scripts/photo-framing-backfill.mjs [--remedir]                  */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { detect, normalize } from '../server/services/framing.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'storage');
const REMEDIR = process.argv.includes('--remedir');

const revisados = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/photo-framing.json'), 'utf8'));
const desdeRevisado = b => normalize({
  x: b.left / b.width, y: b.top / b.height,
  w: (b.right - b.left) / b.width, h: (b.bottom - b.top) / b.height,
  source: 'auto'
});

const db = new Database(path.join(DATA, 'catalog.sqlite'));
const filas = db.prepare("SELECT id,metadata FROM media WHERE status='ready'").all();
const usadas = new Set(db.prepare("SELECT json_extract(data,'$.imagen_id') AS id FROM products").all().map(r => r.id));

let importados = 0, medidos = 0, completas = 0, omitidos = 0, fallos = 0;
for (const fila of filas) {
  const meta = JSON.parse(fila.metadata || '{}');
  if (meta.frame && !REMEDIR) { omitidos++; continue; }

  let frame = null;
  if (revisados[fila.id]) { frame = desdeRevisado(revisados[fila.id]); importados++; }
  else {
    const archivo = ['web', 'master', 'pdf'].map(v => path.join(DATA, 'media', fila.id, v + '.jpg')).find(fs.existsSync);
    if (!archivo) { fallos++; continue; }
    try { frame = await detect(archivo); medidos++; if (frame.source === 'full') completas++; }
    catch { fallos++; continue; }
  }

  meta.frame = frame;                       // el ajuste manual, si existe, no se toca
  db.prepare('UPDATE media SET metadata=? WHERE id=?').run(JSON.stringify(meta), fila.id);
}

const enUso = filas.filter(f => usadas.has(f.id)).length;
console.log(`fotos con estado listo: ${filas.length} (en uso en el catálogo: ${enUso})`);
console.log(`encuadres revisados importados: ${importados}`);
console.log(`medidos automáticamente: ${medidos}${completas ? ` (${completas} quedaron como foto completa)` : ''}`);
console.log(`ya tenían encuadre: ${omitidos}${fallos ? ` · sin archivo o ilegibles: ${fallos}` : ''}`);
db.close();
