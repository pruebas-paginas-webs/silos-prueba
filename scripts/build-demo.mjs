/* Construye la demo estática en demo/ a partir de la aplicación real.
   No modifica public/, server/, storage/ ni output/.
   Uso: node scripts/build-demo.mjs                                        */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'demo');
const PUBLIC = path.join(ROOT, 'public');
const STORAGE = path.join(ROOT, 'storage');
const ASSETS = path.join(ROOT, 'scripts', 'demo-assets');

/* ---------- precios de ejemplo (nunca los reales) ---------- */
// Todos múltiplos de 5.000, variados y deterministas. Los reales terminan en 500.
function demoPrice(p, i) {
  if (p.precio === null || p.precio === undefined) return null;
  const [lo, hi] = p.por_kg ? [150000, 600000] : [15000, 120000];
  const steps = (hi - lo) / 5000;
  const n = (i * 37 + p.producto.length * 11 + p.categoria.length * 5) % (steps + 1);
  return lo + n * 5000;
}

async function main() {
  // Retener medios anteriores: navegadores existentes pueden referenciarlos en su historial.
  for (const e of await fsp.readdir(OUT).catch(() => [])) {
    const target=path.resolve(OUT,e);
    if(!target.startsWith(path.resolve(ROOT,'demo')+path.sep))throw new Error('Limpieza fuera de demo.');
    if (e !== 'pdf' && e !== 'media') await fsp.rm(target, { recursive: true, force: true });
  }
  await fsp.mkdir(OUT, { recursive: true });

  /* ---------- 1. datos ---------- */
  const db = new Database(path.join(STORAGE, 'catalog.sqlite'), { readonly: true });
  const rows = db.prepare('SELECT * FROM products ORDER BY created_at,id').all();
  const settingsRow = db.prepare('SELECT * FROM settings WHERE id=1').get();
  const quality=db.prepare('SELECT value FROM meta WHERE key=?').get('photo-quality-2026-09-20');
  const additions=db.prepare('SELECT value FROM meta WHERE key=?').get('loose-products-2026-09-20');
  const restored=db.prepare('SELECT value FROM meta WHERE key=?').get('photo-restoration-2026-09-20');
  const stand=db.prepare('SELECT value FROM meta WHERE key=?').get('stand-photo-2026-09-20');
  const photos=[...(quality?JSON.parse(quality.value):[]),...(restored?JSON.parse(restored.value):[]),...(stand?JSON.parse(stand.value):[])];
  const mediaMeta=new Map(db.prepare("SELECT id,metadata FROM media WHERE status='ready'").all()
    .map(r=>[r.id,JSON.parse(r.metadata||'{}')]));
  const oldAmsterdam=rows.find(r=>/old amsterdam/i.test(JSON.parse(r.data).producto));
  const updates={version:'accesorios-encuadre-2026-09-20b',photos:photos.map(p=>({id:p.id,previousMedia:p.previousMedia})),addedProductIds:additions?JSON.parse(additions.value).map(p=>p.id):[],categories:oldAmsterdam?[{id:oldAmsterdam.id,previous:'Especialidades',next:'Quesos'},{id:oldAmsterdam.id,previous:'Accesorios',next:'Quesos'}]:[],renameCategories:[{previous:'Especialidades',next:'Accesorios'}]};
  db.close();

  const products = rows.map((r, i) => {
    const d = JSON.parse(r.data);
    return {
      ...d,
      precio: demoPrice(d, i),
      id: r.id, version: r.version,
      created_at: r.created_at, updated_at: r.updated_at, archived_at: r.archived_at
    };
  });
  // Encuadre de cada foto del catálogo: viaja con el seed y se actualiza con él,
  // sin pisar lo que el visitante haya ajustado en su navegador.
  const frames = {};
  for (const id of [...new Set(rows.map(r => JSON.parse(r.data).imagen_id).filter(Boolean))]) {
    const meta = mediaMeta.get(id);
    if (!meta) continue;
    const f = meta.frameManual || meta.frame;
    const v = meta.files && (meta.files.web || meta.files.master);
    if (f && v && v.width && v.height) frames[id] = { x: f.x, y: f.y, w: f.w, h: f.h, r: v.width / v.height };
  }

  const s = JSON.parse(settingsRow.data);
  const settings = {
    mostrar_precios: false,
    mostrar_destacados: s.mostrar_destacados ?? true,
    featured: s.featured || [],
    categories: s.categories || [],
    revision: settingsRow.revision,
    updatedAt: settingsRow.updated_at,
    mediaHistory: {}
  };

  await fsp.writeFile(path.join(OUT, 'demo-seed.json'),
    JSON.stringify({ products, settings, updates, frames }, null, 1), 'utf8');
  console.log(`datos: ${products.length} productos · ${settings.categories.length} categorías · ${settings.featured.length} destacados · ${Object.keys(frames).length} encuadres`);

  /* ---------- 2. fotos (solo derivados necesarios) ---------- */
  const ids = [...new Set(products.map(p => p.imagen_id).filter(Boolean))];
  let copied = 0, bytes = 0;
  for (const id of ids) {
    const dest = path.join(OUT, 'media', id);
    await fsp.mkdir(dest, { recursive: true });
    for (const v of ['web', 'thumb']) {
      const src = path.join(STORAGE, 'media', id, `${v}.jpg`);
      if (!fs.existsSync(src)) { console.warn(`  falta ${v} de ${id}`); continue; }
      await fsp.copyFile(src, path.join(dest, `${v}.jpg`));
      bytes += fs.statSync(src).size;
    }
    copied++;
  }
  console.log(`fotos: ${copied} (${(bytes / 1048576).toFixed(2)} MB)`);

  /* ---------- 3. assets ---------- */
  await fsp.cp(path.join(PUBLIC, 'assets'), path.join(OUT, 'assets'), { recursive: true });

  /* ---------- 4. JS de la app, con las URLs de fotos adaptadas ---------- */
  const mediaRe = /`\/media\/\$\{([^}]+)\}\/(\w+)`/g;
  for (const file of ['main.js', 'catalogo.js', 'admin.js']) {
    let code = await fsp.readFile(path.join(PUBLIC, file), 'utf8');
    const before = (code.match(mediaRe) || []).length;
    code = code.replace(mediaRe, (_, expr, variant) => `DEMO.media(${expr},'${variant}')`);
    await fsp.writeFile(path.join(OUT, file), code, 'utf8');
    if (before) console.log(`${file}: ${before} URL(s) de foto adaptadas`);
  }
  for (const file of ['styles.css', 'admin.css']) {
    await fsp.copyFile(path.join(PUBLIC, file), path.join(OUT, file));
  }
  await fsp.copyFile(path.join(PUBLIC, 'framing.js'), path.join(OUT, 'framing.js'));
  await fsp.copyFile(path.join(ASSETS, 'demo.js'), path.join(OUT, 'demo.js'));
  await fsp.copyFile(path.join(ASSETS, 'demo-seed-update.js'), path.join(OUT, 'demo-seed-update.js'));
  await fsp.copyFile(path.join(ASSETS, 'demo.css'), path.join(OUT, 'demo.css'));

  /* ---------- 5. HTML ---------- */
  // Los comentarios internos (rutas de trabajo, planes) no van a una web publica.
  const INTERNO = /Fotos del cliente|PLAN[-.]|storage\//;
  const limpiar = html => html.replace(/<!--[\s\S]*?-->/g, c => (INTERNO.test(c) ? '' : c));

  const inject = html => limpiar(html)
    .replace('</head>', '  <link rel="stylesheet" href="demo.css">\n  <script src="demo.js"></script>\n</head>');

  for (const file of ['index.html', 'catalogo.html']) {
    let html = await fsp.readFile(path.join(PUBLIC, file), 'utf8');
    await fsp.writeFile(path.join(OUT, file), inject(html), 'utf8');
  }

  let admin = await fsp.readFile(path.join(PUBLIC, 'admin.html'), 'utf8');

  // Ingreso: sin credenciales reales ni simulación de autenticación.
  const loginFrom = admin.indexOf('<form id="login-form">');
  const loginTo = admin.indexOf('</form>', loginFrom) + '</form>'.length;
  if (loginFrom === -1 || loginTo < loginFrom) throw new Error('No se encontró el formulario de ingreso.');
  admin = admin.slice(0, loginFrom) +
    '<form id="login-form"><input type="hidden" name="usuario" value="demo">' +
    '<input type="hidden" name="password" value="demo">' +
    '<button class="action" type="submit">Probar panel</button>' +
    '<p class="demo-note">Es una demostración: no hay cuentas ni contraseñas. ' +
    'Entrá y probá el panel; lo que cambies se guarda solo en este navegador.</p>' +
    '<p id="login-message" role="alert"></p></form>' +
    admin.slice(loginTo);

  // Texto de bienvenida del ingreso.
  admin = admin.replace(
    '<p>Ingresá para actualizar tus productos y descargar el catálogo.</p>',
    '<p>Probá el panel con el que se actualizan los productos y se descarga el catálogo.</p>'
  );

  // PDF: en la demo son muestras fijas; el filtro de stock no las afecta.
  admin = admin.replace(
    '<p>Un PDF con tus productos publicados, preparado para leer desde el teléfono.</p>',
    '<p>Un PDF con tus productos publicados, preparado para leer desde el teléfono.</p>' +
    '<p class="demo-note">En la demo se descarga una <strong>muestra fija</strong> del catálogo, ' +
    'con importes de ejemplo. No refleja los cambios que hagas acá.</p>'
  );
  // El filtro "solo en stock" no puede afectar una muestra fija: se desactiva.
  admin = admin.replace('<input id="pdf-stock" t', '<input id="pdf-stock" disabled t');

  await fsp.writeFile(path.join(OUT, 'admin.html'), inject(admin), 'utf8');

  /* ---------- 6. aviso para el repositorio ---------- */
  await fsp.writeFile(path.join(OUT, 'LEEME.md'),
    ['# Demo pública — Silos Paraguay',
      '',
      'Versión de demostración generada con `node scripts/build-demo.mjs`.',
      'No editar a mano: se regenera desde `public/` y la base local.',
      '',
      '- Los datos viven en el navegador de cada visitante (IndexedDB). Nada se envía a un servidor.',
      '- **Los importes son de ejemplo**, no son la lista de precios real.',
      '- Los PDF son muestras fijas: no reflejan las ediciones hechas en la demo.',
      '- El ingreso al panel no tiene cuentas ni contraseñas reales.',
      ''].join('\n'), 'utf8');

  console.log(`\nlisto: ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
