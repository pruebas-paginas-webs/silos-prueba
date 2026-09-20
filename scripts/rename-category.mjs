/* Renombra una categoría con el mismo servicio que usa el panel, para que
   productos, ajustes y revisión queden consistentes. Deja constancia en meta
   para que la demo pueda propagar el cambio a quienes ya la abrieron.

   Uso: node scripts/rename-category.mjs "Especialidades" "Accesorios"        */
import path from 'node:path';
import { openDb } from '../server/db.js';
import { catalogService } from '../server/services/catalog.js';

const [from, to] = process.argv.slice(2);
if (!from || !to) { console.error('Uso: node scripts/rename-category.mjs "<actual>" "<nueva>"'); process.exit(1); }

const dataDir = process.env.DATA_DIR || path.resolve(import.meta.dirname, '..', 'storage');
const db = openDb(dataDir);
const catalog = catalogService(db);

const before = catalog.settings();
if (!before.categories.includes(from)) {
  console.log(`«${from}» no está en la lista. Categorías actuales: ${before.categories.join(' · ')}`);
  db.close(); process.exit(0);
}

const afectados = catalog.all().filter(p => p.categoria === from).map(p => ({ id: p.id, producto: p.producto }));
const after = catalog.categories({ action: 'rename', name: from, newName: to }, before.revision);

// Constancia para la demo: los visitantes que ya la abrieron tienen su propia copia.
const key = `category-rename-${to.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
  .run(key, JSON.stringify({ previous: from, next: to, productIds: afectados.map(p => p.id) }));

console.log(`«${from}» → «${to}»`);
console.log(`productos reasignados: ${afectados.length}${afectados.length ? ' (' + afectados.map(p => p.producto).join(', ') + ')' : ''}`);
console.log(`categorías ahora: ${after.categories.join(' · ')}`);
console.log(`revisión: ${before.revision} → ${after.revision}`);
db.close();
