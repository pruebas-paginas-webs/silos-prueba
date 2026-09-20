/* Encuadre de fotos: una sola matemática para la web, el panel, el PDF y la demo.

   Un encuadre es la parte útil de la foto, en fracciones del original:
     {x, y, w, h}  con  0 ≤ x, y  y  x+w ≤ 1,  y+h ≤ 1
   El recuadro de la tarjeta muestra esa parte centrada, ocupando un margen
   uniforme (84% por omisión). El archivo de la foto nunca se modifica: sólo
   cambia cómo se la posiciona.

   Se usa como <script src="framing.js"> en el navegador (window.FRAMING) y
   como require() desde el servidor, para que el PDF y la web no se separen. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else root.FRAMING = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MARGEN = 0.84;          // la parte útil ocupa el 84% del recuadro
  var COMPLETA = { x: 0, y: 0, w: 1, h: 1, source: 'full' };

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }

  /* Un encuadre utilizable siempre: ante cualquier duda, la foto entera. */
  function normalize(frame) {
    if (!frame) return COMPLETA;
    var x = num(frame.x), y = num(frame.y), w = num(frame.w), h = num(frame.h);
    if (x === null || y === null || w === null || h === null) return COMPLETA;
    if (!(w > 0) || !(h > 0)) return COMPLETA;
    // Se admite un encuadre más chico que la foto o más grande (manual, alejado).
    if (w > 8 || h > 8 || x < -4 || y < -4 || x > 5 || y > 5) return COMPLETA;
    return { x: x, y: y, w: w, h: h, source: frame.source || 'auto' };
  }

  function isFull(frame) {
    var f = normalize(frame);
    return f.x <= 0.001 && f.y <= 0.001 && f.w >= 0.998 && f.h >= 0.998;
  }

  /* Posición de la foto dentro del recuadro, en porcentajes del recuadro.
       r = ancho/alto de la foto      a = ancho/alto del recuadro
     Elige el lado que limita, así la parte útil entra entera en cualquier
     proporción de recuadro: nunca recorta el producto. */
  function layout(frame, r, a, margin) {
    var f = normalize(frame);
    var m = num(margin) || MARGEN;
    if (!(r > 0)) r = 1;
    if (!(a > 0)) a = 1;
    var width = Math.min(m / f.w, (m * r) / (a * f.h));   // fracción del ancho del recuadro
    var height = (width * a) / r;                         // fracción del alto del recuadro
    return {
      width: width * 100,
      height: height * 100,
      left: (0.5 - width * (f.x + f.w / 2)) * 100,
      top: (0.5 - height * (f.y + f.h / 2)) * 100
    };
  }

  function css(frame, r, a, margin) {
    var l = layout(frame, r, a, margin);
    return 'position:absolute;max-width:none;max-height:none;' +
      'width:' + l.width.toFixed(4) + '%;height:' + l.height.toFixed(4) + '%;' +
      'left:' + l.left.toFixed(4) + '%;top:' + l.top.toFixed(4) + '%;';
  }

  /* --- Ajuste manual: el editor trabaja con un recuadro cuadrado ---------
     toView:   encuadre  → cómo se ve (ancho de la foto y punto centrado)
     fromView: cómo se ve → encuadre para guardar                          */
  function toView(frame, r, margin) {
    var f = normalize(frame), m = num(margin) || MARGEN;
    var l = layout(f, r, 1, m);
    var width = l.width / 100, height = l.height / 100;
    return {
      width: width,
      cx: width > 0 ? (0.5 - l.left / 100) / width : 0.5,
      cy: height > 0 ? (0.5 - l.top / 100) / height : 0.5
    };
  }

  function fromView(view, r, margin) {
    var m = num(margin) || MARGEN;
    if (!(r > 0)) r = 1;
    var width = Math.max(0.05, num(view.width) || MARGEN);
    var cx = Math.min(1, Math.max(0, num(view.cx) === null ? 0.5 : view.cx));
    var cy = Math.min(1, Math.max(0, num(view.cy) === null ? 0.5 : view.cy));
    var w = m / width, h = (m * r) / width;
    return { x: cx - w / 2, y: cy - h / 2, w: w, h: h, source: 'manual' };
  }

  /* Ancho con el que se ve la foto entera: el punto de partida del zoom. */
  function fitWidth(r, margin) {
    var m = num(margin) || MARGEN;
    if (!(r > 0)) r = 1;
    return Math.min(m, m * r);
  }

  return {
    MARGEN: MARGEN, COMPLETA: COMPLETA,
    normalize: normalize, isFull: isFull,
    layout: layout, css: css,
    toView: toView, fromView: fromView, fitWidth: fitWidth,
    ZOOM_MAX: 4
  };
});
