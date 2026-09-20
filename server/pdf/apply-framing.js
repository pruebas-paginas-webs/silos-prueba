/* Coloca cada foto según su encuadre, ya paginado.

   Se hace acá y no al armar el HTML porque recién ahora se sabe el recuadro
   real de cada ficha: las fichas anchas usan uno más grande que las normales.
   Midiendo el recuadro, la parte útil entra entera en los dos casos.

   Corre dentro del navegador que imprime el PDF (page.evaluate).            */
export function applyFraming() {
  const F = window.FRAMING;
  if (!F) return { applied: 0, total: 0 };
  const fotos = document.querySelectorAll('img[data-frame]');
  let applied = 0;
  for (const img of fotos) {
    const caja = img.parentElement.getBoundingClientRect();
    const v = img.dataset.frame.split(' ').map(Number);
    if (!(caja.width > 0 && caja.height > 0) || v.length !== 5 || v.some(n => !isFinite(n))) continue;
    // Sin esto la foto queda centrada y entera por CSS, que es el resultado seguro.
    img.setAttribute('style', F.css({ x: v[0], y: v[1], w: v[2], h: v[3] }, v[4], caja.width / caja.height));
    applied++;
  }
  return { applied, total: fotos.length };
}
