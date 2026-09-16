/* =================================================================
   SILOS PARAGUAY — mini panel de administración del catálogo
   Guarda vía api/guardar.php; sin servidor, descarga los archivos.
   ================================================================= */
(function () {
  "use strict";

  var CONFIG = {
    DATA_URL: "data/catalogo.json",
    SAVE_URL: "api/guardar.php",
    IMAGE_BASE: "assets/img/catalogo/",
    CATEGORIES: ["Quesos", "Jamones y fiambres", "Embutidos y salames", "Especialidades"]
  };

  var els = {
    login: document.querySelector("[data-login]"),
    loginForm: document.querySelector("[data-login-form]"),
    panel: document.querySelector("[data-panel]"),
    list: document.querySelector("[data-list]"),
    status: document.querySelector("[data-status]"),
    save: document.querySelector("[data-save]"),
    add: document.querySelector("[data-add]"),
    pdf: document.querySelector("[data-pdf]"),
    pdfPrices: document.querySelector("[data-pdf-prices]"),
    logout: document.querySelector("[data-logout]"),
    template: document.querySelector("[data-row-template]")
  };

  var state = { items: [], photos: {}, dirty: false };   // photos: { nombreArchivo: Blob }

  /* ---------- Sesión ---------- */
  function key() { return localStorage.getItem("silosAdmin") || ""; }
  function showPanel() { els.login.hidden = true; els.panel.hidden = false; load(); }
  if (key()) showPanel();
  els.loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = els.loginForm.elements.clave.value.trim();
    if (!v) return;
    localStorage.setItem("silosAdmin", v);   // el servidor la valida al guardar
    showPanel();
  });
  els.logout.addEventListener("click", function () {
    if (state.dirty && !confirm("Hay cambios sin guardar. ¿Salir igual?")) return;
    localStorage.removeItem("silosAdmin"); location.reload();
  });
  window.addEventListener("beforeunload", function (e) { if (state.dirty) { e.preventDefault(); e.returnValue = ""; } });

  function setStatus(msg, kind) { els.status.textContent = msg || ""; els.status.className = "admin-status" + (kind ? " is-" + kind : ""); }
  function markDirty() { state.dirty = true; setStatus("Cambios sin guardar.", "warn"); }

  /* ---------- Datos ---------- */
  function blank() { return { visible: "SI", stock: "SI", categoria: CONFIG.CATEGORIES[0], producto: "", marca: "", origen: "", presentacion: "", precio: "", por_kg: "NO", imagen: "", notas: "" }; }

  function load() {
    setStatus("Cargando…");
    fetch(CONFIG.DATA_URL, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (arr) {
        state.items = arr.map(function (o) { var b = blank(); Object.keys(b).forEach(function (k) { if (o[k] !== undefined && o[k] !== null) b[k] = String(o[k]); }); return b; });
        renderList(); setStatus("");
      })
      .catch(function (e) { console.error(e); setStatus("No se pudo cargar data/catalogo.json", "error"); });
  }

  /* ---------- Fotos: se normalizan en el navegador a 1200x1200 sobre blanco ---------- */
  function slug(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "producto";
  }
  function processImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(); var url = URL.createObjectURL(file);
      img.onload = function () {
        var S = 1200, BOX = 960, c = document.createElement("canvas"); c.width = S; c.height = S;
        var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, S, S);
        var r = Math.min(BOX / img.width, BOX / img.height);
        var w = Math.round(img.width * r), h = Math.round(img.height * r);
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (b && b.type === "image/webp") resolve({ blob: b, ext: "webp" });
          else c.toBlob(function (j) { resolve({ blob: j, ext: "jpg" }); }, "image/jpeg", 0.86);
        }, "image/webp", 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("imagen inválida")); };
      img.src = url;
    });
  }

  /* ---------- Render ---------- */
  function renderList() {
    els.list.innerHTML = "";
    state.items.forEach(function (it, i) {
      var node = els.template.content.firstElementChild.cloneNode(true);
      var thumb = node.querySelector(".admin-thumb"), empty = node.querySelector(".admin-thumb-empty");
      function showThumb(src) { if (src) { thumb.src = src; thumb.hidden = false; empty.hidden = true; } else { thumb.hidden = true; empty.hidden = false; } }
      if (state.photos[it.imagen]) showThumb(URL.createObjectURL(state.photos[it.imagen]));
      else showThumb(it.imagen ? (/^https?:\/\//i.test(it.imagen) ? it.imagen : CONFIG.IMAGE_BASE + it.imagen) : "");
      thumb.addEventListener("error", function () { showThumb(""); });

      node.querySelectorAll("[data-field]").forEach(function (input) {
        var f = input.getAttribute("data-field");
        if (f === "foto") {
          input.addEventListener("change", function () {
            var file = input.files && input.files[0]; if (!file) return;
            setStatus("Procesando foto…");
            processImage(file).then(function (res) {
              var name = "prod-" + slug(it.producto || "producto") + "-" + Date.now().toString(36) + "." + res.ext;
              state.photos[name] = res.blob; it.imagen = name;
              showThumb(URL.createObjectURL(res.blob)); markDirty();
            }).catch(function () { setStatus("No se pudo leer la imagen.", "error"); });
          });
          return;
        }
        if (input.type === "checkbox") {
          input.checked = /^(si|sí|s|1|true)$/i.test(it[f] || "");
          input.addEventListener("change", function () { it[f] = input.checked ? "SI" : "NO"; markDirty(); });
        } else {
          input.value = it[f] || "";
          input.addEventListener("input", function () { it[f] = input.value; markDirty(); });
        }
      });
      node.querySelector("[data-delete]").addEventListener("click", function () {
        if (!confirm("¿Eliminar \"" + (it.producto || "este producto") + "\"?")) return;
        state.items.splice(i, 1); renderList(); markDirty();
      });
      els.list.appendChild(node);
    });
  }

  els.add.addEventListener("click", function () {
    state.items.unshift(blank()); renderList(); markDirty();
    var first = els.list.querySelector('[data-field="producto"]'); if (first) first.focus();
  });

  /* ---------- Guardar ---------- */
  function download(name, blob) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function downloadEverything() {
    download("catalogo.json", new Blob([JSON.stringify(state.items, null, 2)], { type: "application/json" }));
    Object.keys(state.photos).forEach(function (name) { download(name, state.photos[name]); });
  }

  els.save.addEventListener("click", function () {
    els.save.disabled = true; setStatus("Guardando…");
    var fd = new FormData();
    fd.append("clave", key());
    fd.append("catalogo", JSON.stringify(state.items));
    Object.keys(state.photos).forEach(function (name) { fd.append("fotos[]", state.photos[name], name); });
    fetch(CONFIG.SAVE_URL, { method: "POST", body: fd })
      .then(function (r) {
        if (r.status === 401) { throw new Error("CLAVE"); }
        if (!r.ok) { throw new Error("NOSERVER"); }
        return r.json();
      })
      .then(function (res) {
        if (!res.ok) throw new Error("NOSERVER");
        state.photos = {}; state.dirty = false;
        setStatus("Guardado. Los cambios ya están en la web.", "ok");
      })
      .catch(function (e) {
        if (e.message === "CLAVE") { setStatus("Clave incorrecta. Salí y volvé a entrar.", "error"); return; }
        // Sin servidor (GitHub Pages) o error: descargar los archivos
        downloadEverything();
        state.dirty = false;
        setStatus("Este sitio no tiene servidor: se descargaron catalogo.json y las fotos nuevas. Mandáselos a Agustín para que los suba.", "warn");
      })
      .finally(function () { els.save.disabled = false; });
  });

  /* ---------- PDF ---------- */
  els.pdf.addEventListener("click", function () {
    if (state.dirty) { alert("Guardá los cambios antes de generar el PDF, así salen en el catálogo."); return; }
    var f = document.querySelector("[data-pdf-format]:checked");
    var formato = f ? f.value : "movil";
    window.open("catalogo.html?pdf=1&formato=" + formato + "&precios=" + (els.pdfPrices.checked ? "1" : "0"), "_blank");
  });
})();
