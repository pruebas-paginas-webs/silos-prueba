/* =================================================================
   SILOS PARAGUAY — capa de demostración
   Reemplaza el backend (Node + SQLite) por IndexedDB en el navegador.
   El HTML/CSS/JS de la aplicación queda igual: acá se intercepta fetch()
   y se responde con la misma forma que devuelve la API real.
   Los datos son de ejemplo y viven solo en este navegador.
   ================================================================= */
(function () {
  'use strict';

  var DB_NAME = 'silos-demo';
  var DB_VERSION = 1;
  var SEED_URL = 'demo-seed.json';
  var PDF = { yes: 'pdf/Silos-Paraguay-movil-con-precios-DEMO.pdf', no: 'pdf/Silos-Paraguay-movil-sin-precios-DEMO.pdf' };

  var DEMO = (window.DEMO = {});
  var state = null;          // {products:[...], settings:{...}}
  var mediaUrls = {};        // id -> blob URL de fotos subidas en la demo
  var seedFrames = {};       // id -> encuadre de las fotos del catálogo inicial
  var authed = false;

  /* ---------------- IndexedDB ---------------- */
  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'k' });
        if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function tx(db, store, mode, fn) {
    return new Promise(function (resolve, reject) {
      var t = db.transaction(store, mode), s = t.objectStore(store), out;
      out = fn(s);
      t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
      t.onerror = function () { reject(t.error); };
      t.onabort = function () { reject(t.error); };
    });
  }

  var dbPromise = null;
  function db() { if (!dbPromise) dbPromise = openDb(); return dbPromise; }

  function kvGet(key) { return db().then(function (d) { return tx(d, 'kv', 'readonly', function (s) { return s.get(key); }); }); }
  function kvPut(key, value) { return db().then(function (d) { return tx(d, 'kv', 'readwrite', function (s) { s.put({ k: key, v: value }); }); }); }
  function mediaAll() { return db().then(function (d) { return tx(d, 'media', 'readonly', function (s) { return s.getAll(); }); }); }
  function mediaPut(rec) { return db().then(function (d) { return tx(d, 'media', 'readwrite', function (s) { s.put(rec); }); }); }

  /* ---------------- Estado ---------------- */
  function persist() { return kvPut('state', { products: state.products, settings: state.settings }); }

  function loadSeed() {
    return fetch(SEED_URL, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (seed) {
      return { products: seed.products.map(function (p) { return Object.assign({}, p); }), settings: Object.assign({}, seed.settings), updates: seed.updates, frames: seed.frames };
    });
  }

  var readyPromise = null;
  function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = Promise.all([kvGet('state'), loadSeed(), import('./demo-seed-update.js')]).then(function (values) {
      var row=values[0],fresh=values[1],merge=values[2].mergeSeedUpdate;
      seedFrames = (fresh && fresh.frames) || {};
      if (row && row.v && Array.isArray(row.v.products) && row.v.products.length) state=merge(row.v,fresh);
      else {state=fresh;state.settings.demoContentVersion=fresh.updates && fresh.updates.version;}
      return persist();
    }).then(function () {
      return mediaAll();
    }).then(function (items) {
      (items || []).forEach(function (rec) {
        if (rec.web instanceof Blob) mediaUrls[rec.id] = URL.createObjectURL(rec.web);
      });
      authed = sessionStorage.getItem('silosDemoAuth') === '1';
    });
    return readyPromise;
  }

  DEMO.reset = function () {
    return db().then(function (d) {
      return Promise.all([
        tx(d, 'kv', 'readwrite', function (s) { s.clear(); }),
        tx(d, 'media', 'readwrite', function (s) { s.clear(); })
      ]);
    }).then(function () {
      sessionStorage.removeItem('silosDemoAuth');
      location.reload();
    });
  };

  /* ---------------- Fotos ---------------- */
  // Devuelve la URL de una foto. Sincrónica: la usa el front directamente en img.src.
  /* ---------------- Encuadre de fotos ----------------
     Los del catálogo inicial llegan con el seed y se actualizan con él. Los que
     el visitante sube o ajusta viven en su copia y siempre tienen prioridad. */
  function frames() { state.settings.frames = state.settings.frames || {}; return state.settings.frames; }
  function frameFor(id) {
    if (!id) return null;
    var propio = frames()[id];
    var f = propio && (propio.manual || propio.auto);
    if (f) return { x: f.x, y: f.y, w: f.w, h: f.h, r: propio.r || 1 };
    var s = seedFrames[id];
    return s ? { x: s.x, y: s.y, w: s.w, h: s.h, r: s.r || 1 } : null;
  }
  function frameIsManual(id) { var p = frames()[id]; return !!(p && p.manual); }

  /* Mide el vacío igual que el servidor: misma muestra, mismo umbral, mismas
     salvaguardas. Ante la duda, la foto entera. */
  function detectFrame(img) {
    var COMPLETA = { x: 0, y: 0, w: 1, h: 1, source: 'full' };
    try {
      var k = Math.min(500 / img.width, 500 / img.height, 1);
      var W = Math.max(1, Math.round(img.width * k)), H = Math.max(1, Math.round(img.height * k));
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);      // la transparencia es fondo vacío
      ctx.drawImage(img, 0, 0, W, H);
      var d = ctx.getImageData(0, 0, W, H).data;
      var cols = new Uint32Array(W), rows = new Uint32Array(H), tinta = 0;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var i = (y * W + x) * 4;
        if (Math.min(d[i], d[i + 1], d[i + 2]) < 225) { cols[x]++; rows[y]++; tinta++; }
      }
      var minCol = Math.max(2, H * 0.008), minRow = Math.max(2, W * 0.008);
      var left = -1, right = -1, top = -1, bottom = -1;
      for (var x2 = 0; x2 < W; x2++) if (cols[x2] > minCol) { if (left < 0) left = x2; right = x2; }
      for (var y2 = 0; y2 < H; y2++) if (rows[y2] > minRow) { if (top < 0) top = y2; bottom = y2; }
      if (left < 0 || top < 0) return COMPLETA;
      left = Math.max(0, left - 4); top = Math.max(0, top - 4);
      right = Math.min(W, right + 4 + 1); bottom = Math.min(H, bottom + 4 + 1);
      var f = { x: left / W, y: top / H, w: (right - left) / W, h: (bottom - top) / H, source: 'auto' };
      if ((f.w > 0.97 && f.h > 0.97) || tinta / (W * H) > 0.9 || f.w < 0.05 || f.h < 0.05) return COMPLETA;
      return f;
    } catch (e) { return COMPLETA; }
  }

  DEMO.media = function (id, variant) {
    if (!id) return '';
    if (mediaUrls[id]) return mediaUrls[id];              // foto subida en la demo
    return 'media/' + id + '/' + (variant || 'web') + '.jpg';  // foto del catálogo inicial
  };

  /* ---------------- Lógica equivalente al servidor ---------------- */
  var FIELDS = ['producto', 'categoria', 'marca', 'origen', 'presentacion', 'notas', 'resumen',
    'precio', 'por_kg', 'visible', 'stock', 'destacado', 'orden', 'imagen_id'];
  var DEFAULTS = { producto: '', categoria: 'Quesos', marca: '', origen: '', presentacion: '', notas: '', resumen: '',
    precio: null, por_kg: false, visible: false, stock: false, destacado: false, orden: 0, imagen_id: null };

  function normalize(t) { return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function nowIso() { return new Date().toISOString(); }
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function err(status, code, message) { var e = new Error(message); e.status = status; e.code = code; return e; }
  function invalid(m) { return err(422, 'VALIDACION', m); }
  function conflict() { return err(409, 'CONFLICTO', 'Este producto cambió en otra ventana. Actualizá la vista antes de guardar.'); }

  function settings() { return Object.assign({}, state.settings); }
  function bump() { state.settings.revision = (state.settings.revision || 0) + 1; state.settings.updatedAt = nowIso(); }
  function active() { return state.products.filter(function (p) { return !p.archived_at; }); }
  function byId(id) {
    var p = state.products.find(function (x) { return x.id === id; });
    if (!p) throw err(404, 'NO_EXISTE', 'No encontramos ese producto.');
    return p;
  }
  function ordered(items) {
    var cats = state.settings.categories;
    return items.slice().sort(function (a, b) {
      return cats.indexOf(a.categoria) - cats.indexOf(b.categoria)
        || a.orden - b.orden
        || a.producto.localeCompare(b.producto, 'es')
        || a.id.localeCompare(b.id);
    });
  }
  function syncFeatures(id, enabled) {
    var f = state.settings.featured.filter(function (x) { return x !== id; });
    if (enabled) f.push(id);
    state.settings.featured = f;
  }

  function save(id, changes, version) {
    var old = id ? byId(id) : null;
    if (old && (old.archived_at || version !== old.version)) throw conflict();
    var source = {};
    FIELDS.forEach(function (k) { source[k] = old ? old[k] : DEFAULTS[k]; });
    if (!old) source.categoria = state.settings.categories[0];
    var data = Object.assign({}, source, changes || {});
    if (!String(data.producto || '').trim()) throw invalid('Revisá los datos: producto: escribí el nombre.');
    if (state.settings.categories.indexOf(data.categoria) === -1) throw invalid('Esa categoría cambió. Actualizá la lista y elegí una categoría existente.');
    if (data.precio !== null && data.precio !== undefined && (typeof data.precio !== 'number' || data.precio < 0)) throw invalid('Revisá los datos: precio: usá un número.');
    if (data.destacado && active().filter(function (p) { return p.id !== id && p.destacado; }).length >= 8) throw invalid('Ya hay ocho destacados. Desmarcá uno para elegir otro.');

    if (old) {
      if (old.imagen_id && old.imagen_id !== data.imagen_id) {
        state.settings.mediaHistory = state.settings.mediaHistory || {};
        var h = state.settings.mediaHistory[old.id] || [];
        h.unshift({ id: old.imagen_id, created_at: Date.now() });
        state.settings.mediaHistory[old.id] = h.slice(0, 10);
      }
      FIELDS.forEach(function (k) { old[k] = data[k]; });
      old.version += 1; old.updated_at = nowIso();
      if (changes && 'destacado' in changes) syncFeatures(old.id, data.destacado);
      bump();
      return old;
    }
    var fresh = Object.assign({}, data, { id: uuid(), version: 1, created_at: nowIso(), updated_at: nowIso(), archived_at: null });
    state.products.push(fresh);
    if (data.destacado) syncFeatures(fresh.id, true);
    bump();
    return fresh;
  }

  function archive(id, version, restore) {
    var p = byId(id);
    if (version !== p.version) throw conflict();
    p.destacado = false;
    if (restore) { p.visible = false; p.archived_at = null; } else { p.archived_at = nowIso(); }
    p.version += 1; p.updated_at = nowIso();
    syncFeatures(id, false);
    bump();
    return p;
  }

  function setFeatured(ids, revision, show) {
    if (state.settings.revision !== revision) throw conflict();
    if (!Array.isArray(ids) || ids.length > 8 || new Set(ids).size !== ids.length) throw invalid('Elegí hasta ocho productos diferentes.');
    ids.forEach(function (id) { if (byId(id).archived_at) throw invalid('Un producto archivado no puede ser destacado.'); });
    state.products.forEach(function (p) {
      var selected = ids.indexOf(p.id) !== -1;
      if (p.destacado !== selected) { p.destacado = selected; p.version += 1; p.updated_at = nowIso(); }
    });
    state.settings.featured = ids;
    if (show !== undefined) {
      if (typeof show !== 'boolean') throw invalid('Elegí si querés mostrar los destacados.');
      state.settings.mostrar_destacados = show;
    }
    bump();
    return settings();
  }

  function updateSettings(changes, revision) {
    if (state.settings.revision !== revision) throw conflict();
    var keys = Object.keys(changes || {});
    if (!keys.length || keys.some(function (k) { return ['mostrar_precios', 'mostrar_destacados'].indexOf(k) === -1; })) throw invalid('Elegí qué opción querés cambiar.');
    keys.forEach(function (k) {
      if (typeof changes[k] !== 'boolean') throw invalid('Elegí qué opción querés cambiar.');
      state.settings[k] = changes[k];
    });
    bump();
    return settings();
  }

  function categories(change, revision) {
    if (state.settings.revision !== revision) throw conflict();
    var c = change || {}, cats = state.settings.categories, index = cats.indexOf(c.name);
    if (['create', 'rename', 'remove', 'move'].indexOf(c.action) === -1) throw invalid('Usá un nombre de categoría de entre 1 y 60 caracteres.');
    if (!c.name || !String(c.name).trim() || String(c.name).length > 60) throw invalid('Usá un nombre de categoría de entre 1 y 60 caracteres.');
    if (c.action !== 'create' && index < 0) throw invalid('La categoría ya no existe. Actualizá la lista.');

    function moveProducts(from, to) {
      state.products.forEach(function (p) {
        if (p.categoria === from) { p.categoria = to; p.version += 1; p.updated_at = nowIso(); }
      });
    }

    if (c.action === 'create' || c.action === 'rename') {
      var name = c.action === 'create' ? c.name : c.newName;
      if (!name || !String(name).trim()) throw invalid('Ingresá el nombre de la categoría.');
      if (String(name).length > 60) throw invalid('Usá un nombre de categoría de entre 1 y 60 caracteres.');
      var clash = cats.some(function (n, i) { return i !== (c.action === 'rename' ? index : -1) && normalize(n) === normalize(name); });
      if (clash) throw invalid('Ya existe una categoría con ese nombre.');
      if (c.action === 'create') cats.push(name);
      else { cats[index] = name; moveProducts(c.name, name); }
    } else if (c.action === 'remove') {
      if (cats.length === 1) throw invalid('Conservá al menos una categoría.');
      if (state.products.some(function (p) { return p.categoria === c.name; })) {
        if (c.target === c.name || cats.indexOf(c.target) === -1) throw invalid('Elegí a qué categoría mover sus productos, incluidos los archivados.');
        moveProducts(c.name, c.target);
      }
      cats.splice(index, 1);
    } else {
      if (!c.direction) throw invalid('Elegí hacia dónde mover la categoría.');
      var next = index + (c.direction === 'up' ? -1 : 1);
      if (next < 0 || next >= cats.length) throw invalid('La categoría ya está en ese extremo.');
      var tmp = cats[index]; cats[index] = cats[next]; cats[next] = tmp;
    }
    bump();
    return settings();
  }

  function publicCatalog() {
    var s = state.settings;
    return {
      revision: s.revision, updatedAt: s.updatedAt, mostrar_destacados: s.mostrar_destacados,
      items: ordered(active().filter(function (p) { return p.visible; })).map(function (p) {
        var out = {
          id: p.id, producto: p.producto, categoria: p.categoria, marca: p.marca, origen: p.origen,
          presentacion: p.presentacion, notas: p.notas, resumen: p.resumen, stock: p.stock, por_kg: p.por_kg,
          imagen: p.imagen_id ? DEMO.media(p.imagen_id, 'web') : null,
          encuadre: frameFor(p.imagen_id),
          destacado: p.destacado, featuredOrder: s.featured.indexOf(p.id)
        };
        if (s.mostrar_precios) out.precio = p.precio;
        return out;
      })
    };
  }

  function list(query) {
    query = query || {};
    var items = state.products.slice();
    var counts = {
      total: active().length,
      visible: active().filter(function (p) { return p.visible; }).length,
      noStock: active().filter(function (p) { return p.stock===false; }).length,
      noPhoto: active().filter(function (p) { return !p.imagen_id; }).length
    };
    items = items.filter(function (p) { return query.status === 'archived' ? !!p.archived_at : !p.archived_at; })
      .filter(function (p) { return !query.q || normalize(p.producto + ' ' + p.marca).indexOf(normalize(query.q)) !== -1; })
      .filter(function (p) { return !query.category || p.categoria === query.category; })
      .filter(function (p) {
        return query.status === 'hidden' ? !p.visible
          : query.status === 'nostock' ? p.stock===false
            : query.status === 'nophoto' ? !p.imagen_id : true;
      });
    return { items: ordered(items).map(function (p) { return Object.assign({}, p, { encuadre: frameFor(p.imagen_id) }); }),
             total: items.length, counts: counts, settings: settings() };
  }

  /* ---------------- Subida de fotos (canvas → blob → IndexedDB) ---------------- */
  function processPhoto(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        function draw(size) {
          var c = document.createElement('canvas');
          var r = Math.min(size / img.width, size / img.height, 1);
          c.width = Math.max(1, Math.round(img.width * r));
          c.height = Math.max(1, Math.round(img.height * r));
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          return new Promise(function (res) { c.toBlob(res, 'image/jpeg', 0.85); });
        }
        var frame = detectFrame(img);
        Promise.all([draw(1000), draw(320)]).then(function (out) {
          URL.revokeObjectURL(url);
          resolve({ web: out[0], thumb: out[1], width: img.width, height: img.height, frame: frame });
        });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(invalid('No pudimos leer esta foto. Elegí un JPG, PNG o WebP.')); };
      img.src = url;
    });
  }

  function uploadPhoto(file) {
    if (file.size > 10 * 1024 * 1024) throw err(413, 'TAMANO', 'La foto pesa más de 10 MB. Elegí una versión más liviana.');
    return processPhoto(file).then(function (out) {
      var id = uuid();
      return mediaPut({ id: id, web: out.web, thumb: out.thumb }).then(function () {
        mediaUrls[id] = URL.createObjectURL(out.web);
        frames()[id] = { auto: out.frame, manual: null, r: out.width / out.height };
        return {
          mediaId: id, status: 'ready', frame: out.frame,
          files: { web: { size: out.web.size, width: out.width, height: out.height }, thumb: { size: out.thumb.size, width: 320, height: 320 } },
          warning: Math.max(out.width, out.height) < 600 ? 'La foto es pequeña; puede verse poco nítida.' : null
        };
      });
    });
  }

  /* ---------------- Interceptor de fetch ---------------- */
  var realFetch = window.fetch.bind(window);

  function json(body, status) {
    return new Response(JSON.stringify(body), {
      status: status || 200, headers: { 'Content-Type': 'application/json' }
    });
  }
  function fail(e) {
    return json({ error: { code: e.code || 'INTERNO', message: e.message || 'No se pudo completar. Reintentá.', operation: uuid() } }, e.status || 500);
  }

  window.fetch = function (input, init) {
    var url;
    try { url = new URL(typeof input === 'string' ? input : input.url, location.href); }
    catch (e) { return realFetch(input, init); }
    var i = url.pathname.indexOf('/api/');
    if (i === -1 || url.origin !== location.origin) return realFetch(input, init);
    var route = url.pathname.slice(i + 5);
    var method = ((init && init.method) || 'GET').toUpperCase();
    var body = init && init.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

    return ready().then(function () { return handle(route, method, body, url, init); })
      .then(function (res) { return res instanceof Response ? res : persist().then(function () { return json(res); }); })
      .catch(fail);
  };

  /* ---------------- Interceptor de XMLHttpRequest ----------------
     El panel sube la foto con XHR para poder mostrar el progreso, así que
     fetch no alcanza: se resuelve con el mismo manejador. */
  var RealXHR = window.XMLHttpRequest;

  function DemoXHR() {
    var self = this;
    this.upload = {
      onprogress: null, onload: null, onerror: null,
      addEventListener: function (t, f) { self.upload['on' + t] = f; },
      removeEventListener: function (t) { self.upload['on' + t] = null; }
    };
    this.readyState = 0; this.status = 0; this.statusText = '';
    this.responseText = ''; this.response = ''; this.responseType = '';
    this.onload = null; this.onerror = null; this.onabort = null;
    this.onreadystatechange = null; this.ontimeout = null; this.onprogress = null;
    this._demo = false; this._aborted = false; this._real = null; this._listeners = {};
  }
  DemoXHR.prototype.addEventListener = function (type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  };
  DemoXHR.prototype.removeEventListener = function (type, fn) {
    var l = this._listeners[type] || [], i = l.indexOf(fn);
    if (i > -1) l.splice(i, 1);
  };
  DemoXHR.prototype._emit = function (type, ev) {
    ev = ev || { type: type };
    if (typeof this['on' + type] === 'function') this['on' + type].call(this, ev);
    var self = this;
    (this._listeners[type] || []).slice().forEach(function (f) { f.call(self, ev); });
  };
  DemoXHR.prototype.open = function (method, url) {
    this._method = (method || 'GET').toUpperCase();
    var u = null;
    try { u = new URL(url, location.href); } catch (e) { u = null; }
    this._url = u;
    this._demo = !!u && u.origin === location.origin && u.pathname.indexOf('/api/') !== -1;
    this.readyState = 1;
    if (this._demo) return;
    var self = this, real = new RealXHR();
    this._real = real;
    ['load', 'error', 'abort', 'timeout', 'progress', 'readystatechange'].forEach(function (type) {
      real.addEventListener(type, function (ev) {
        self.readyState = real.readyState; self.status = real.status;
        self.statusText = real.statusText; self.response = real.response;
        try { self.responseText = real.responseText; } catch (e) { self.responseText = ''; }
        self._emit(type, ev);
      });
    });
    real.open(method, url);
  };
  DemoXHR.prototype.setRequestHeader = function (k, v) {
    if (this._real) this._real.setRequestHeader(k, v);
  };
  DemoXHR.prototype.getResponseHeader = function (k) {
    if (this._real) return this._real.getResponseHeader(k);
    return /content-type/i.test(k) ? 'application/json' : null;
  };
  DemoXHR.prototype.getAllResponseHeaders = function () {
    return this._real ? this._real.getAllResponseHeaders() : 'content-type: application/json\r\n';
  };
  DemoXHR.prototype.abort = function () {
    if (this._real) return this._real.abort();
    this._aborted = true; this.readyState = 4;
    this._emit('abort');
  };
  DemoXHR.prototype.send = function (body) {
    if (this._real) return this._real.send(body);
    var self = this;
    var path = this._url.pathname;
    var route = path.slice(path.indexOf('/api/') + 5);
    var foto = body && body.get ? body.get('foto') : null;
    var total = (foto && foto.size) || 0;
    var datos = body;
    if (typeof datos === 'string') { try { datos = JSON.parse(datos); } catch (e) { datos = {}; } }

    function avance(loaded) {
      if (self._aborted || !self.upload.onprogress) return;
      self.upload.onprogress({ lengthComputable: total > 0, loaded: loaded, total: total });
    }
    function responder(res) {
      if (self._aborted) return;
      return res.text().then(function (texto) {
        if (self._aborted) return;
        self.status = res.status; self.readyState = 4;
        self.responseText = texto; self.response = texto;
        self._emit('readystatechange');
        self._emit('load');
      });
    }

    setTimeout(function () {
      if (self._aborted) return;
      avance(Math.round(total * 0.45));
      setTimeout(function () {
        if (self._aborted) return;
        avance(total);
        if (self.upload.onload) self.upload.onload({});
        ready()
          .then(function () { return handle(route, self._method, datos, self._url, { body: body }); })
          .then(function (res) { return res instanceof Response ? res : persist().then(function () { return json(res); }); })
          .catch(fail)
          .then(responder);
      }, 70);
    }, 40);
  };

  window.XMLHttpRequest = DemoXHR;

  function handle(route, method, body, url, init) {
    /* --- sesión --- */
    if (route === 'auth/session') return { authenticated: authed, csrf: 'demo' };
    if (route === 'auth/login') {
      authed = true; sessionStorage.setItem('silosDemoAuth', '1');
      return { authenticated: true, csrf: 'demo' };
    }
    if (route === 'auth/logout') {
      authed = false; sessionStorage.removeItem('silosDemoAuth');
      return { ok: true };
    }

    /* --- catálogo público --- */
    if (route === 'catalogo') return publicCatalog();

    /* --- panel --- */
    if (route.indexOf('admin/') !== 0) throw err(404, 'NO_EXISTE', 'Ruta no disponible en la demo.');
    if (!authed) throw err(401, 'SIN_SESION', 'Tu sesión terminó. Ingresá de nuevo.');
    var rest = route.slice(6);

    if (rest === 'products' && method === 'GET') {
      var q = {};
      url.searchParams.forEach(function (v, k) { q[k] = v; });
      var out = list(q);
      out.storage = { bytes: 0, quota: 2147483648, free: 2147483648, level: 'ok' };
      return out;
    }
    if (rest === 'products' && method === 'POST') {
      var created = save(null, body, undefined);
      return persist().then(function () { return json(created, 201); });
    }
    var mProduct = rest.match(/^products\/([^/]+)$/);
    if (mProduct && method === 'PATCH') return save(mProduct[1], body.changes, body.version);
    var mAction = rest.match(/^products\/([^/]+)\/(archive|restore)$/);
    if (mAction && method === 'POST') return archive(mAction[1], body.version, mAction[2] === 'restore');
    var mHistory = rest.match(/^products\/([^/]+)\/media-history$/);
    if (mHistory && method === 'GET') {
      byId(mHistory[1]);
      var hist = (state.settings.mediaHistory || {})[mHistory[1]] || [];
      return { items: hist };
    }
    var mRestore = rest.match(/^products\/([^/]+)\/media-restore$/);
    if (mRestore && method === 'POST') {
      var histIds = ((state.settings.mediaHistory || {})[mRestore[1]] || []).map(function (h) { return h.id; });
      if (histIds.indexOf(body.mediaId) === -1) throw invalid('Esa foto ya no está disponible para recuperar.');
      return save(mRestore[1], { imagen_id: body.mediaId }, body.version);
    }

    if (rest === 'settings' && method === 'GET') return settings();
    if (rest === 'settings' && method === 'PATCH') {
      var changes = Object.assign({}, body); delete changes.revision;
      return updateSettings(changes, body.revision);
    }
    if (rest === 'categories' && method === 'PUT') {
      var change = Object.assign({}, body); delete change.revision;
      return categories(change, body.revision);
    }
    if (rest === 'featured' && method === 'GET') {
      return {
        settings: settings(),
        items: ordered(active()).map(function (p) {
          return { id: p.id, producto: p.producto, presentacion: p.presentacion, visible: p.visible, imagen_id: p.imagen_id, categoria: p.categoria };
        })
      };
    }
    if (rest === 'featured' && method === 'PUT') return setFeatured(body.ids, body.revision, body.mostrar_destacados);

    var mFrame = rest.match(/^media\/([^/]+)\/frame$/);
    if (mFrame) {
      var fid = mFrame[1];
      if (!frameFor(fid)) throw err(404, 'NO_EXISTE', 'Esa foto ya no está disponible.');
      if (method === 'GET') return { mediaId: fid, frame: frameFor(fid), manual: frameIsManual(fid), r: frameFor(fid).r };
      if (method === 'PUT') {
        var nuevo = body && body.frame;
        var actual = frames()[fid] || { auto: null, manual: null, r: (frameFor(fid) || {}).r || 1 };
        if (nuevo === null || nuevo === undefined) actual.manual = null;     // volver al automático
        else {
          for (var k of ['x', 'y', 'w', 'h']) if (typeof nuevo[k] !== 'number' || !isFinite(nuevo[k]))
            throw invalid('No pudimos guardar el encuadre. Volvé a intentarlo.');
          if (!(nuevo.w > 0) || !(nuevo.h > 0) || nuevo.w > 8 || nuevo.h > 8)
            throw invalid('Ese encuadre queda fuera de la foto. Probá de nuevo.');
          actual.manual = { x: nuevo.x, y: nuevo.y, w: nuevo.w, h: nuevo.h, source: 'manual' };
        }
        // Si es una foto del catálogo inicial, su encuadre de origen queda como respaldo.
        if (!actual.auto && seedFrames[fid]) actual.auto = { x: seedFrames[fid].x, y: seedFrames[fid].y, w: seedFrames[fid].w, h: seedFrames[fid].h, source: 'auto' };
        actual.r = actual.r || (seedFrames[fid] && seedFrames[fid].r) || 1;
        frames()[fid] = actual;
        if (!actual.manual && !actual.auto) delete frames()[fid];
        bump();
        return { mediaId: fid, frame: frameFor(fid), manual: frameIsManual(fid), settings: settings() };
      }
    }
    if (rest === 'media' && method === 'POST') {
      var fd = init && init.body;
      var file = fd && fd.get ? fd.get('foto') : null;
      if (!file) throw invalid('Elegí una foto.');
      return uploadPhoto(file).then(function (r) { return persist().then(function () { return json(r); }); });
    }
    if (rest.indexOf('media/uploads/') === 0) throw err(404, 'NO_EXISTE', 'La subida no se encontró. Podés reintentar.');

    if (rest === 'pdf' && method === 'POST') {
      var b = body || {};
      if (typeof b.includePrices !== 'boolean' || typeof b.onlyInStock !== 'boolean') throw invalid('Elegí si querés incluir precios en este PDF.');
      var file2 = b.includePrices ? PDF.yes : PDF.no;
      return realFetch(file2, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw err(503, 'PDF', 'No pudimos preparar la muestra del catálogo.');
        return r.blob();
      }).then(function (blob) {
        return new Response(blob, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="' + (b.includePrices
              ? 'Silos-Paraguay-movil-con-precios-DEMO.pdf' : 'Silos-Paraguay-movil-sin-precios-DEMO.pdf') + '"'
          }
        });
      });
    }

    throw err(404, 'NO_EXISTE', 'Ruta no disponible en la demo.');
  }

  /* ---------------- Fotos subidas en la demo ----------------
     El navegador no dispara la carga diferida sobre URLs blob:, así que esas
     imágenes quedarían en blanco. Las del catálogo inicial son archivos
     normales y conservan loading="lazy". */
  function ansiosa(img) {
    if (img.tagName === 'IMG' && img.loading === 'lazy' &&
        String(img.getAttribute('src') || '').indexOf('blob:') === 0) img.loading = 'eager';
  }
  function revisar(raiz) {
    if (!raiz || raiz.nodeType !== 1) return;
    ansiosa(raiz);
    if (raiz.querySelectorAll) Array.prototype.forEach.call(raiz.querySelectorAll('img'), ansiosa);
  }
  new MutationObserver(function (cambios) {
    for (var i = 0; i < cambios.length; i++) {
      var c = cambios[i];
      if (c.type === 'attributes') { ansiosa(c.target); continue; }
      for (var j = 0; j < c.addedNodes.length; j++) revisar(c.addedNodes[j]);
    }
  }).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['src']
  });

  /* ---------------- Aviso de demo ---------------- */
  function banner() {
    if (document.getElementById('demo-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'demo-banner';
    bar.innerHTML = '<span><strong>Demo:</strong> los cambios se guardan solo en este navegador.</span>';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'demo-reset';
    btn.textContent = 'Restablecer demo';
    btn.addEventListener('click', function () {
      if (confirm('¿Restablecer la demo? Se borran los cambios que hiciste en este navegador y vuelven los datos iniciales.')) DEMO.reset();
    });
    bar.appendChild(btn);
    document.body.appendChild(bar);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', banner);
  else banner();

  ready();
})();
