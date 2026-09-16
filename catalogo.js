/* =================================================================
   SILOS PARAGUAY — catálogo público (data/catalogo.json → HTML → PDF)
   ================================================================= */
(function () {
  "use strict";

  var CONFIG = {
    DATA_URL: "data/catalogo.json",
    IMAGE_BASE: "assets/img/catalogo/",
    CATEGORY_ORDER: ["Quesos", "Jamones y fiambres", "Embutidos y salames", "Especialidades"],
    CURRENCY: "G$"
  };

  var els = {
    status: document.querySelector("[data-status]"),
    catalog: document.querySelector("[data-catalog]"),
    filters: document.querySelector("[data-filters]"),
    printBtn: document.querySelector("[data-print]"),
    printHint: document.querySelector("[data-print-hint]"),
    printDate: document.querySelector("[data-print-date]"),
    priceNote: document.querySelector("[data-print-price-note]")
  };

  // El PDF es solo para el administrador: el visitante navega el catálogo en la web.
  // La sesión de admin la crea admin.html; los precios además exigen ?precios=1.
  var params = new URLSearchParams(location.search);
  var isAdmin = !!localStorage.getItem("silosAdmin");
  var showPrices = isAdmin && params.get("precios") === "1";
  var autoPrint = isAdmin && params.get("pdf") === "1";
  var state = { items: [], filter: "todas" };

  // Sin sesión de admin: se oculta la exportación y se limpia la URL (?pdf, ?precios, ?formato)
  // para que el visitante quede simplemente en la página del catálogo.
  if (!isAdmin) {
    if (els.printBtn) els.printBtn.hidden = true;
    if (els.printHint) els.printHint.hidden = true;
    if (params.has("pdf") || params.has("precios") || params.has("formato")) {
      history.replaceState(null, "", location.pathname);
    }
  }

  // Formato del PDF: "movil" (página vertical tipo celular, 2 columnas, ideal para WhatsApp)
  // o "a4" (3 columnas, para imprimir). ?formato=movil|a4; si no viene, según el dispositivo.
  var formato = params.get("formato");
  if (formato !== "movil" && formato !== "a4") formato = window.matchMedia("(max-width: 720px)").matches ? "movil" : "a4";
  document.body.classList.add("pdf-" + formato);
  var pageStyle = document.createElement("style");
  pageStyle.textContent = formato === "movil"
    ? "@media print { @page { size: 108mm 230mm; margin: 8mm; } }"
    : "@media print { @page { size: A4; margin: 12mm; } }";
  document.head.appendChild(pageStyle);

  document.body.classList.toggle("show-prices", showPrices);
  if (els.priceNote) els.priceNote.hidden = !showPrices;
  if (els.printDate) els.printDate.textContent = "Silos Paraguay · " + new Date().toLocaleDateString("es-PY", { year: "numeric", month: "long" });
  if (els.printBtn) els.printBtn.addEventListener("click", function () { window.print(); });

  function normalizeItem(o) {
    var raw = String(o.precio === undefined || o.precio === null ? "" : o.precio).replace(/[^\d,\.]/g, "");
    var price = null;
    if (raw) { raw = raw.replace(/\./g, "").replace(",", "."); price = Number(raw); if (isNaN(price)) price = null; }
    return {
      visible: !/^(no|n|0|false)$/i.test(String(o.visible || "SI").trim()),
      stock: !/^(no|n|0|false)$/i.test(String(o.stock || "SI").trim()),
      categoria: String(o.categoria || "Otros").trim(),
      producto: String(o.producto || "").trim(),
      marca: String(o.marca || "").trim(),
      origen: String(o.origen || "").trim(),
      presentacion: String(o.presentacion || "").trim(),
      precio: price,
      porKg: /^(si|sí|s|1|true)$/i.test(String(o.por_kg || "").trim()),
      imagen: String(o.imagen || "").trim(),
      notas: String(o.notas || "").trim()
    };
  }

  function setStatus(msg) { if (els.status) { els.status.textContent = msg; els.status.hidden = !msg; } }

  function formatPrice(it) {
    if (it.precio === null) return "Consultar";
    return CONFIG.CURRENCY + " " + new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(it.precio) + (it.porKg ? " / kg" : "");
  }

  function categoriesInOrder(items) {
    var present = [];
    items.forEach(function (it) { if (present.indexOf(it.categoria) === -1) present.push(it.categoria); });
    var ordered = CONFIG.CATEGORY_ORDER.filter(function (c) { return present.indexOf(c) !== -1; });
    present.forEach(function (c) { if (ordered.indexOf(c) === -1) ordered.push(c); });
    return ordered;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function imageUrl(it) {
    if (!it.imagen) return "";
    return /^https?:\/\//i.test(it.imagen) ? it.imagen : CONFIG.IMAGE_BASE + it.imagen;
  }

  function card(it) {
    var li = el("li", "product-card catalog-card" + (it.stock ? "" : " is-nostock"));
    var media = el("div", "product-media");
    if (!it.stock) media.appendChild(el("span", "badge-nostock", "Sin stock"));
    var url = imageUrl(it);
    if (url) {
      var img = document.createElement("img");
      img.src = url; img.alt = it.producto; img.width = 1200; img.height = 1200;
      img.loading = autoPrint ? "eager" : "lazy";
      img.addEventListener("error", function () { media.innerHTML = ""; media.appendChild(el("div", "catalog-placeholder", it.producto)); });
      media.appendChild(img);
    } else {
      media.appendChild(el("div", "catalog-placeholder", it.producto));
    }
    li.appendChild(media);
    li.appendChild(el("h3", "product-name", it.producto));
    var meta = [it.marca, it.origen].filter(Boolean).join(" · ");
    if (it.presentacion) meta = meta ? meta + " · " + it.presentacion : it.presentacion;
    if (meta) li.appendChild(el("p", "catalog-meta", meta));
    if (it.notas) li.appendChild(el("p", "product-note", it.notas));
    li.appendChild(el("p", "catalog-price", formatPrice(it)));
    return li;
  }

  function render() {
    if (!els.catalog) return;
    els.catalog.innerHTML = "";
    var items = state.items.filter(function (it) { return state.filter === "todas" || it.categoria === state.filter; });
    if (!items.length) { els.catalog.appendChild(el("p", "catalog-status", "No hay productos en esta categoría.")); return; }
    categoriesInOrder(items).forEach(function (cat) {
      var group = el("section", "catalog-group");
      group.appendChild(el("h2", null, cat));
      var inCat = items.filter(function (it) { return it.categoria === cat; });
      var origins = [];
      inCat.forEach(function (it) { if (it.origen && origins.indexOf(it.origen) === -1) origins.push(it.origen); });
      if (origins.length) group.appendChild(el("p", "catalog-group-sub", origins.join(" · ")));
      var ul = el("ul", "catalog-grid");
      inCat.forEach(function (it) { ul.appendChild(card(it)); });
      group.appendChild(ul);
      els.catalog.appendChild(group);
    });
  }

  function renderFilters() {
    if (!els.filters) return;
    els.filters.innerHTML = "";
    ["todas"].concat(categoriesInOrder(state.items)).forEach(function (c) {
      var b = el("button", "chip-btn", c === "todas" ? "Todas" : c);
      b.type = "button";
      b.setAttribute("aria-pressed", String(c === state.filter));
      b.addEventListener("click", function () {
        state.filter = c;
        Array.prototype.forEach.call(els.filters.children, function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        render();
      });
      els.filters.appendChild(b);
    });
  }

  // Al imprimir, siempre el catálogo completo (sin filtro)
  window.addEventListener("beforeprint", function () {
    if (state.filter !== "todas") { state._backup = state.filter; state.filter = "todas"; render(); }
  });
  window.addEventListener("afterprint", function () {
    if (state._backup) { state.filter = state._backup; state._backup = null; render(); }
  });

  function waitForImages() {
    var imgs = Array.prototype.slice.call(document.querySelectorAll(".catalog-grid img"));
    return Promise.all(imgs.map(function (img) {
      return img.complete ? Promise.resolve() : new Promise(function (res) { img.addEventListener("load", res); img.addEventListener("error", res); setTimeout(res, 4000); });
    }));
  }

  setStatus("Cargando catálogo…");
  fetch(CONFIG.DATA_URL, { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("catalogo.json " + r.status); return r.json(); })
    .then(function (arr) {
      state.items = arr.map(normalizeItem).filter(function (it) { return it.visible && it.producto; });
      setStatus("");
      renderFilters();
      render();
      if (autoPrint) waitForImages().then(function () { window.print(); });
    })
    .catch(function (e) {
      console.error(e);
      setStatus("No pudimos cargar el catálogo. Escribinos y te lo mandamos por email.");
    });
})();
