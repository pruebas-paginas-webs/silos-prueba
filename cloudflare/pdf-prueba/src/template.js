/* HTML del catálogo móvil para el navegador de Cloudflare.

   Mismo styles.css, misma paginación y mismo encuadre que server/pdf. Una sola
   diferencia: fotos, fuentes y logos van por URL en vez de incrustados en
   base64, porque el Worker gratuito tiene 10 ms de CPU por pedido y no puede
   armar 4 MB de base64. El navegador los descarga él solo. */
import css from './vendor/styles.css';
import framing from './vendor/framing.js.txt';

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const price = p => p.precio === null || p.precio === undefined
  ? 'Consultar'
  : `G$ ${new Intl.NumberFormat('es-PY').format(p.precio)}${p.por_kg ? ' / kg' : ''}`;

export function template({ items, settings, frames, base, includePrices, origin }) {
  const font = n => `${base}assets/fonts/${n}`;
  const logo = `${base}assets/logo/silos-paraguay-claro.png`;
  const date = new Intl.DateTimeFormat('es-PY', { month: 'long', year: 'numeric', timeZone: 'America/Asuncion' }).format(new Date());
  const frame = id => { const f = frames[id]; return f ? ` data-frame="${[f.x, f.y, f.w, f.h, f.r || 1].map(n => Number(n).toFixed(6)).join(' ')}"` : ''; };

  const cards = items.map(p =>
    `<article class="card" data-category="${esc(p.categoria)}" data-product-id="${esc(p.id)}">` +
    `<div class="photo">${p.imagen_id
      ? `<img${frame(p.imagen_id)} src="${base}media/${esc(p.imagen_id)}/web.jpg" alt="${esc(p.producto)}">`
      : '<span class="no-photo">Imagen próximamente</span>'}` +
    `${!p.stock ? `<span class="stock">${p.stock === null ? 'Consultar disponibilidad' : 'Sin stock'}</span>` : ''}</div>` +
    `<p class="brand">${esc(p.marca || p.origen)}</p><h2>${esc(p.producto)}</h2><p class="presentation">${esc(p.presentacion)}</p>` +
    `${p.marca && p.origen ? `<p class="origin">${esc(p.origen)}</p>` : ''}${p.notas ? `<p class="note">${esc(p.notas)}</p>` : ''}` +
    `${includePrices ? `<p class="price">${price(p)}</p>` : ''}</article>`
  ).join('');

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">` +
    `<title>Silos Paraguay · Catálogo móvil · r${settings.revision}</title>` +
    `<style>@font-face{font-family:Spectral;src:url('${font('spectral-latin-400-normal.woff2')}')}` +
    `@font-face{font-family:Hanken;src:url('${font('hanken-grotesk-latin-400-normal.woff2')}')}` +
    `@font-face{font-family:Hanken;src:url('${font('hanken-grotesk-latin-600-normal.woff2')}');font-weight:600}${css}</style>` +
    `<script>${framing}</script></head><body>` +
    `<section class="pdf-page cover"><div class="cover-image" style="background-image:url('${base}assets/img/hero.webp')"></div>` +
    `<div class="cover-content"><img class="logo" src="${logo}" alt="Silos Paraguay"><p class="eyebrow">CATÁLOGO · ${esc(date)}</p>` +
    `<h1>Selección<br>de Europa</h1><p class="cover-sub">Quesos, jamones y fiambres.</p><p class="cover-foot">Respeto. Calidad. Sabor.</p></div></section>` +
    `<div id="pages"></div>` +
    `<section class="pdf-page closing"><img class="logo" src="${logo}" alt="Silos Paraguay"><p class="eyebrow">DE EUROPA A TU NEGOCIO</p>` +
    `<h1>Hablemos<br>de cosas ricas.</h1><p>Una selección de quesos, jamones y fiambres para tu góndola y tu cocina.</p>` +
    `<div class="contacts"><a href="mailto:jvanden@silospy.com">jvanden@silospy.com</a><a href="tel:+595981630931">+595 981 630 931</a>` +
    `<a href="mailto:cecierbin@silospy.com">cecierbin@silospy.com</a><a href="tel:+595994703334">+595 994 703 334</a></div>` +
    `<a class="catalog-link" href="${esc(origin)}/catalogo.html">Ver catálogo online ↗</a>` +
    `${includePrices ? '<p class="legal">Precios de referencia en guaraníes, sujetos a cambio sin previo aviso.</p>' : ''}` +
    `<p class="edition">${esc(date)} · Edición ${settings.revision}</p></section>` +
    `<div id="source">${cards}</div></body></html>`;
}
