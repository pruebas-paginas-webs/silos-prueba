/* =================================================================
   SILOS PARAGUAY — interacciones
   ================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: estado al scrollear ---------- */
  var header = document.querySelector("[data-header]");
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 8) header.setAttribute("data-scrolled", "");
      else header.removeAttribute("data-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Menú móvil ---------- */
  var toggle = document.querySelector("[data-menu-toggle]");
  var menu = document.querySelector("[data-mobile-menu]");

  // Con el menú abierto, el contenido tapado no debe recibir foco.
  // El header queda activo: ahí vive el botón que cierra el menú.
  var inertTargets = [document.querySelector("#main"), document.querySelector(".site-footer")];
  function setPageInert(value) {
    inertTargets.forEach(function (el) { if (el) el.inert = value; });
  }

  function openMenu() {
    if (!menu || !toggle) return;
    menu.hidden = false;
    // forzar reflow para que la transición de opacidad corra
    void menu.offsetWidth;
    menu.setAttribute("data-open", "");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Cerrar menú");
    document.body.style.overflow = "hidden";
    setPageInert(true);
    var firstLink = menu.querySelector("a");
    if (firstLink) firstLink.focus();
  }

  function closeMenu() {
    if (!menu || !toggle) return;
    menu.removeAttribute("data-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
    document.body.style.overflow = "";
    setPageInert(false);
    var hide = function () { menu.hidden = true; menu.removeEventListener("transitionend", hide); };
    if (prefersReduced) hide();
    else menu.addEventListener("transitionend", hide);
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      if (toggle.getAttribute("aria-expanded") === "true") closeMenu();
      else openMenu();
    });
    menu.querySelectorAll("[data-mm-link]").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        closeMenu();
        toggle.focus();
      }
    });
  }

  /* ---------- Reveals al entrar al viewport ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (revealEls.length) {
    if (prefersReduced || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            // stagger leve entre hermanos para que las grillas entren con ritmo
            var siblings = Array.prototype.slice.call(el.parentElement ? el.parentElement.children : []);
            var idx = siblings.indexOf(el);
            var delay = Math.min(idx >= 0 ? idx * 70 : 0, 350);
            el.style.transitionDelay = delay + "ms";
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        });
      }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- Degradado elegante de imágenes que fallan ----------
     Si una imagen no carga (red, URL caída), la ocultamos manteniendo
     su caja: queda el fondo de color del contenedor, nunca el ícono roto. */
  function hideBrokenImage(img) { img.style.visibility = "hidden"; }
  Array.prototype.slice.call(document.images).forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) hideBrokenImage(img);
    img.addEventListener("error", function () { hideBrokenImage(img); });
  });

  /* ---------- Año dinámico en el footer ---------- */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
