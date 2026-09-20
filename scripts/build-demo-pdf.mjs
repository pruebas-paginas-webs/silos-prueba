/* Genera las dos muestras de PDF de la demo con los precios de ejemplo.
   Trabaja sobre una copia temporal de storage/: no toca la base real ni output/.
   Uso: node scripts/build-demo-pdf.mjs                                      */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP = path.join(ROOT, 'tmp', 'demo-storage');
const OUT = path.join(ROOT, 'demo', 'pdf');

// 1. Copia de trabajo de la base y las fotos.
if(!path.resolve(TMP).startsWith(path.join(ROOT,'tmp')+path.sep))throw new Error('Copia temporal fuera del proyecto.');
await fsp.rm(TMP, { recursive: true, force: true });
await fsp.mkdir(TMP, { recursive: true });
const sourceDb=new Database(path.join(ROOT,'storage','catalog.sqlite'),{readonly:true});
try{await sourceDb.backup(path.join(TMP,'catalog.sqlite'));}finally{sourceDb.close();}
await fsp.cp(path.join(ROOT, 'storage', 'media'), path.join(TMP, 'media'), { recursive: true });
await fsp.writeFile(path.join(TMP, '.session-secret'), 'demo'.repeat(16), 'utf8');

// 2. Precios de ejemplo, idénticos a los de demo-seed.json.
const seed = JSON.parse(await fsp.readFile(path.join(ROOT, 'demo', 'demo-seed.json'), 'utf8'));
const prices = new Map(seed.products.map(p => [p.id, p.precio]));
const db = new Database(path.join(TMP, 'catalog.sqlite'));
let changed = 0;
for (const row of db.prepare('SELECT id,data FROM products').all()) {
  const data = JSON.parse(row.data);
  if (!prices.has(row.id)) continue;
  data.precio = prices.get(row.id);
  db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(data), row.id);
  changed++;
}
db.close();
console.log(`precios de ejemplo aplicados a la copia: ${changed}`);

// 3. Generación con el mismo motor de la aplicación, apuntando a la copia.
process.env.DATA_DIR = TMP;
process.env.SESSION_SECRET = 'demo'.repeat(16);
const { config } = await import('../server/config.js');
const { createApp } = await import('../server/app.js');
const { generatePdf } = await import('../server/services/pdf.js');

const cfg = config();
cfg.origin='https://pruebas-paginas-webs.github.io/silos-prueba/demo';
const ctx = createApp(cfg);
try {
  const snapshot = {
    settings: ctx.catalog.settings(),
    items: ctx.catalog.ordered(ctx.catalog.all().filter(p => p.visible && !p.archived_at))
  };
  await fsp.mkdir(OUT, { recursive: true });
  for (const includePrices of [false, true]) {
    const bytes = await generatePdf(snapshot, { includePrices }, cfg, ctx.images);
    const name = `Silos-Paraguay-movil-${includePrices ? 'con' : 'sin'}-precios-DEMO.pdf`;
    await fsp.writeFile(path.join(OUT, name), bytes);
    console.log(`${name}: ${bytes.length} bytes`);
  }
} finally {
  ctx.close();
}

// 4. La copia temporal ya no hace falta.
await fsp.rm(TMP, { recursive: true, force: true });
console.log('copia temporal eliminada');
