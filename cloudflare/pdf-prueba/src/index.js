/* Prueba: el catálogo móvil de Silos impreso con Browser Rendering.

   Toma el catálogo de la demo publicada (mismos 39 productos, mismas fotos y
   encuadres), arma el mismo HTML que el servidor y lo imprime en el navegador
   de Cloudflare. Reutiliza tal cual la paginación y el encuadre del proyecto.

   Rutas:
     /pdf            PDF sin precios
     /pdf?precios=1  PDF con precios (de ejemplo: son los de la demo)
     /pdf?stats=1    sólo los tiempos y conteos, en JSON

   El navegador se cierra en el `finally`, siempre: ahí para el taxímetro.    */
import puppeteer from '@cloudflare/puppeteer';
import { template } from './template.js';
import { paginate } from '../../../server/pdf/paginate.js';
import { applyFraming } from '../../../server/pdf/apply-framing.js';

const DEMO = 'https://pruebas-paginas-webs.github.io/silos-prueba/demo/';

function ordered(products, categories) {
  return products
    .filter(p => p.visible && !p.archived_at)
    .sort((a, b) =>
      (categories.indexOf(a.categoria) - categories.indexOf(b.categoria)) ||
      ((a.orden || 0) - (b.orden || 0)) ||
      a.producto.localeCompare(b.producto, 'es') ||
      String(a.id).localeCompare(String(b.id)));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/pdf') {
      return new Response('Prueba del PDF de Silos con Browser Rendering.\n/pdf · /pdf?precios=1 · /pdf?stats=1\n',
        { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    const includePrices = url.searchParams.get('precios') === '1';
    const t0 = Date.now(), ms = {};

    const seed = await fetch(DEMO + 'demo-seed.json', { cf: { cacheTtl: 300 } }).then(r => r.json());
    ms.datos = Date.now() - t0;
    const html = template({
      items: ordered(seed.products, seed.settings.categories),
      settings: seed.settings, frames: seed.frames || {},
      base: DEMO, includePrices, origin: DEMO.replace(/\/$/, '')
    });
    ms.html = Date.now() - t0;

    let pdf, layout, framed;
    const browser = await puppeteer.launch(env.BROWSER);
    ms.navegador = Date.now() - t0;
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
      });
      ms.cargado = Date.now() - t0;
      layout = await page.evaluate(paginate);
      framed = await page.evaluate(applyFraming);
      ms.paginado = Date.now() - t0;
      pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
      ms.pdf = Date.now() - t0;
    } finally {
      await browser.close();
      ms.cerrado = Date.now() - t0;
    }

    const stats = { ms, paginas: layout.pages, productos: layout.products, desbordes: layout.overflow, encuadre: framed, bytes: pdf.byteLength, conPrecios: includePrices };
    if (url.searchParams.get('stats') === '1') return Response.json(stats);
    return new Response(pdf, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="Silos-Paraguay-celular-${includePrices ? 'con' : 'sin'}-precios-PRUEBA.pdf"`,
        'x-silos-stats': JSON.stringify(stats)
      }
    });
  }
};
