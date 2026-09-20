# Estado de implementación — Silos Paraguay

Actualizado: 20 de septiembre de 2026 (tarde). Aplicación local E0–E7. La demo anterior fue
publicada por separado; esta corrección todavía requiere un nuevo deploy.
Rama: `codex/catalogo-admin-pdf`. Los archivos anteriores se conservaron.

## Revisión del 20/09 (tarde): encuadre de fotos y categoría «Accesorios»

«Especialidades» pasó a llamarse **Accesorios** con el mismo servicio que usa el panel:
su único producto (Tabla soporte para jamón) se reasignó y la revisión pasó de 114 a 115.
El cambio viaja al panel, la web y el PDF porque los tres leen la misma lista, y la demo
lo propaga a quien ya la tenía abierta sin pisarle sus propias categorías.

El encuadre de cada foto dejó de ser una CSS generada y pasó a ser un dato guardado
junto a la foto. Se mide solo al subir: detecta el vacío alrededor del producto y lo
centra con un margen parejo. Ante cualquier duda —fondo de color, foto ya recortada,
medición rara— muestra la foto entera y centrada, que es el resultado seguro. El archivo
original nunca se modifica, así que siempre se puede volver a ajustar.

Se agregó **Ajustar foto** en el editor: vista previa cuadrada igual que la tarjeta de la
web, barra para acercar o alejar, arrastre con mouse y con el dedo, y los botones Guardar,
Cancelar y Restablecer encuadre. Cancelar deja todo como estaba; Restablecer vuelve al
encuadre automático, que se conserva aparte. Si no se mueve nada, Guardar no pisa el
encuadre existente. Subir una foto y guardar sigue siendo el camino principal: el ajuste
es opcional y no agrega ningún paso obligatorio.

La misma matemática (`public/framing.js`) la usan la web, el panel, el PDF y la demo. En
el PDF el encuadre se aplica después de paginar, midiendo el recuadro real de cada ficha,
porque las fichas anchas usan uno más grande que las normales.

### Verificaciones

- Los **39 encuadres ya revisados** se ven exactamente igual que antes: coinciden al
  detalle con las fórmulas históricas de la web y del PDF. En pantalla la diferencia
  máxima es de 0,15 puntos porcentuales (0,45 px en una tarjeta de 300 px), porque ahora
  se usa la proporción real de la foto en vez de la redondeada de la muestra de 500 px.
- **432 archivos de foto verificados contra su hash original: ninguno fue modificado.**
  El catálogo siguió con sus 39 productos.
- Fondo blanco, fondo transparente y fondo de color: los dos primeros se miden bien; con
  fondo de color se muestra la foto completa en vez de adivinar.
- Productos altos y anchos, en los tres recuadros (web 1:1, ficha normal 45:40, ficha
  ancha 94:50): 117 comprobaciones sin recortes, sin descentrados y sin deformación.
- Guardar, Cancelar y Restablecer, con mouse y con gesto táctil; persistencia tras
  recargar, en la aplicación real y en la demo.
- La demo mide igual que el servidor: para la misma foto devolvió el mismo encuadre.
- Actualizar la demo conserva lo que el visitante editó: su producto renombrado, su
  ajuste manual y sus altas, y a la vez le renombra la categoría.
- Ambos PDFs regenerados, con y sin precios, con encuadre por foto y sin importes reales.
- 32 pruebas automáticas aprobadas.

Al volver a medir las 39 fotos de hoy, 36 dan el mismo encuadre que el revisado y 3
dan «foto completa»: su producto ocupa más del 97 % del lienzo y la salvaguarda prefiere
no recortar nada. No se aplicaron: lo que está guardado y se ve son los encuadres
revisados. La medición nueva se puede regenerar con `node scripts/build-photo-framing.mjs`,
que por omisión escribe un archivo aparte y no pisa el registro.

### Pendiente

El PDF de fichas anchas sólo aparece cuando una ficha no entra en media página; en el
catálogo actual no se dio el caso, así que ese recorrido quedó verificado por cálculo y
no sobre un PDF real.

## Revisión del 20/09: calidad y productos nuevos

13 fotos de alta resolución recuperadas por comparación de producto/presentación;
Basiron Pesto Verde, Basiron Olive Tomato y Montana Intenso agregados desde originales
del cliente. 39 productos, 38 fotos, ocho destacados. Datos comerciales nuevos pendientes,
sin inventar stock, precio o gramaje. Demo regenerada con migración que conserva las
ediciones del navegador. 20 pruebas aprobadas y ambos PDFs de demo revisados con 39
productos. Ver `CORRECCION-FOTOS-2026-09-20.md` para limitaciones y próximo deploy.

## Revisión del 19/09: panel sencillo y fotos originales

**Ajuste posterior del mismo día:** por pedido del usuario, los precios ahora se eligen
por separado. `mostrar_precios` controla solamente la web. Cada descarga de PDF exige
elegir explícitamente Sí/No (`includePrices` booleano); no altera los ajustes guardados
ni permite elegir productos individuales. El selector vuelve vacío al abrir la descarga.
Las 18 pruebas pasaron nuevamente, incluyendo las cuatro combinaciones web/PDF,
validación de elección obligatoria, nombre del archivo y ausencia de cambios persistidos.
En navegador se descargó un PDF con precios manteniendo la web sin precios; se confirmó
que al reabrir vuelve a preguntar y que sin elegir no inicia la descarga. Modal revisado
a 390 px, sin recortes ni errores de consola. Servidor local reiniciado con estos cambios.
Esta decisión reemplaza el criterio de precios compartidos descrito abajo.

Esta revisión reemplaza las decisiones de paginación y precios de la implementación
inicial documentada más abajo.

- **E1/E3:** migración única de ajustes y versiones; categorías editables con
  reasignación transaccional; una sola opción de precios para web y PDF.
- **E4:** los 36 productos en una lista; botones Visible y En stock con guardado inmediato
  y Deshacer; alta con campos esenciales; categorías desde el listado o la ficha.
  Destacados mediante tarjetas con fotos, máximo ocho y opción de ocultar la sección
  sin perder selecciones. El noveno queda deshabilitado hasta desmarcar otro.
- **E5:** portada y catálogo comparten categorías, precios y fotos de la misma base.
  La portada respeta la opción de mostrar destacados.
- **E3/E6:** 34 fotos recuperadas directamente del PDF original; queso crema resuelto.
  Old Amsterdam se validó contra la foto suelta enviada por el cliente
  (`dfe27a06-916e-4121-8042-8cf05bb55e3a.png`); la versión optimizada vigente coincide.
  La tabla soporte
  sigue sin imagen propia, pendiente de resolver la referencia conjunta con el jamón.
  Ver `REVISION-FOTOS.md`.
- **E6/E7:** 18/18 pruebas de integración aprobadas el 19/09, incluyendo reglas nuevas,
  rollback, conflictos de versiones, autenticación, 100 reemplazos de foto y backup.
  Prueba de navegador en base aislada: crear/renombrar categoría, cambio rápido y Deshacer,
  ocho destacados con bloqueo del noveno, ocultar sección y precios globales.
  Panel principal: 36 filas y 35 fotos cargadas, sin imágenes publicadas rotas ni errores
  de consola. Descarga real autenticada confirmada. Vista móvil de 390 px sin desborde.
- Ambos PDF de 36 productos regenerados, verificados y renderizados página por página.
  Sin precios: **13 páginas, 2.148.768 bytes**. Con precios: **15 páginas, 2.164.525 bytes**.
  Revisión de datos 73. Los tamaños históricos que aparecen abajo ya no corresponden
  a los archivos actuales.

El acceso con Google limitado a dos cuentas se consultó como mejora posterior. No está
implementado; faltan los correos permitidos y la configuración OAuth de Google.

## Registro inicial del 17/09 (histórico)

| Etapa | Estado local | Implementación y evidencia |
|---|---|---|
| E0 · Preparación | Completa local; contenedor pendiente | Node 24.19, pnpm 11.19, lockfile, Dockerfile, configuración y arranque reproducible. Chromium genera documentos con su sandbox normal. Docker no está instalado; no se afirma haber probado la imagen. |
| E1 · Persistencia | Completa | SQLite, migración e importador idempotente: 36 productos, 34 fotos, dos faltantes intencionales y ocho destacados. Segunda importación devuelve `alreadyImported`; reinicio conserva datos. Queso crema y tabla soporte siguen sin foto. |
| E2 · Acceso privado | Completa | Argon2, sesiones SQLite, CSRF/origen, límites de login, cookies y cabeceras. Pruebas de denegación sin sesión/CSRF, logout, rutas estáticas privadas y omisión real de precios. Solo `public/` es estático. HTTPS y cookie Secure quedan sujetos al despliegue. |
| E3 · Productos y fotos | Completa | CRUD con versión y transacciones, archivo/restauración, precios, destacados, imágenes normalizadas, historial, idempotencia y limpieza protegida. Pruebas con fallos de escritura/commit y terminación abrupta en cinco fases; 100 reemplazos y reapertura sin referencias rotas. |
| E4 · Panel | Completa | Seis fichas por página, alta, filtros/búsqueda global, edición individual, foto con progreso/reintento/recuperación, archivo reversible y ocho lugares destacados. Alta con foto efectuada desde navegador en base aislada; producto e imagen comprobados después de reiniciar. Ficha revisada a 390 px con Guardar siempre visible. |
| E5 · Web | Completa | Home y catálogo usan la misma API. Ocho selecciones iniciales conservadas con sus textos. Búsqueda `danes` encuentra los dos daneses. Catálogo/portada a 375 px sin desborde horizontal; sin precios ocultos en DOM. No quedan exportadores públicos. |
| E6 · PDF móvil | Completa | Plantilla nueva 108 × 192 mm, portada editorial, fotos uniformes, paginación medida, fuentes locales, contactos y enlaces. Descarga autenticada desde el panel comprobada hasta mensaje de éxito. Ambas variantes de 36 productos renderizadas e inspeccionadas completas. |
| E7 · Verificación y operación | Completa local; aceptación externa pendiente | 15 pruebas de integración aprobadas. Casos PDF 0/1/7/36. Respaldo diario cifrado ejecutado y restaurado a `tmp/restored-full`: 137 archivos, revisión 38, 36 productos y 34 fotos; comparación de productos, medios, historial, administradores y configuración idéntica, integrity_check=ok. Manual del dueño y operación documentados. |

## Verificaciones realizadas

- `node --test --test-concurrency=1 tests/integration/catalog.test.js`: **15/15**, última ejecución 17/09/2026, cero fallos.
- Autenticación, cierre de sesión, CSRF, privacidad de medios y omisión de precios; reglas independientes de visibilidad, stock y precio.
- Paginación de seis, búsqueda global sin acentos, máximo ocho destacados por API, conflicto 409 y rollback de commit.
- Fotos: contenido inválido/excesivo, EXIF, transparencia, dimensiones, metadatos, multipart sin extensión, duplicación de clave, recuperación de foto previa, regeneración de derivado y error de maestra faltante.
- Fallos inyectados de disco y salida abrupta de procesos hijos en las fases de staging, maestra, derivados, rename y commit. La referencia publicada permanece intacta.
- Cien reemplazos con reapertura de base y limpieza; protección de archivados, historial, backup y PDF activo.
- PDF: sesión/revisión obligatorias, cero productos rechazado, límite de concurrencia y snapshot consistente. Los ejemplos de 1 y 7 productos incluyen nombres/descripciones largos, importes vacíos y sin stock.
- `tests/pdf/verify_pdfs.py`: extracción de textos, recuento de productos, importes, fuentes incrustadas, enlaces, tamaño de papel y peso. Render de cada página mediante pypdfium2 e inspección visual de los dos mosaicos completos y páginas ampliadas. No se detectaron recortes, solapamientos ni productos duplicados/omitidos.
- Navegador: alta real con foto en entorno aislado, confirmación «Foto lista», guardado y persistencia tras reinicio; seis registros por página sobre ocho; panel principal con 36. Descarga de PDF real desde el panel. Portada/catalogo móvil y búsqueda revisados; consola pública sin errores en esa revisión.

## PDFs entregados

| Archivo en `output/pdf/` | Páginas | Bytes |
|---|---:|---:|
| `Silos-Paraguay-movil-sin-precios.pdf` | 13 | 4.521.547 |
| `Silos-Paraguay-movil-con-precios.pdf` | 15 | 4.537.327 |

Ambos contienen los 36 productos. El número de páginas cambia por la altura adicional
que ocupan los precios. Se conservan márgenes y tamaño de letra. Los enlaces del PDF
apuntan al prototipo local hasta definir `APP_ORIGIN` definitivo. Los precios importados
no fueron validados comercialmente ni actualizados como parte de esta implementación.

## Operación y archivos

- `public/`: sitio y panel; `server/`: API, SQLite, imágenes, PDF y backup.
- `scripts/`: importación, cuentas y respaldos; `tests/`: integración y PDF.
- `docs/MANUAL-DEL-PANEL.md`: guía breve para el dueño.
- `docs/OPERACION.md`: arranque, claves, almacenamiento, restauración y despliegue futuro.
- `Iniciar-Silos.ps1`: inicio local; acceso de prueba en `storage/ACCESO-LOCAL.txt`.
- `storage/`, `tmp/`, `output/`, secretos y dependencias excluidos de Git y del servidor estático.
- Respaldos locales en `storage/backups`, cifrados; conservar aparte `storage/.backup-key`.

## Alcance de la verificación y pendientes antes de lanzar

1. **Hosting/Docker/HTTPS:** no hay proveedor definido ni Docker instalado. Se probó el servidor Windows local y Chromium con sandbox, no un redeploy real ni la imagen Docker.
2. **Backup externo:** funciona la copia diaria cifrada y su restauración. Falta elegir/configurar almacenamiento fuera del servidor; el respaldo local no cubre pérdida del disco.
3. **Teléfonos reales:** viewport 375/390 px comprobado; falta prueba táctil y de fotos desde los celulares concretos del dueño, además de leer el PDF en sus lectores habituales. HEIC se rechaza con indicación de exportar JPG.
4. **Aceptación del dueño:** comprobar vocabulario y dinámica con él; revisar precios vigentes, cuenta definitiva y dominio. No se envió ni publicó material.
5. **Pruebas manuales de red:** la protección ante respuestas tardías A/B y conservación de formulario ante fallo de red están implementadas; no se reprodujo todavía una red móvil real lenta/intermitente. Las pruebas de fallos e idempotencia del servidor sí fueron ejecutadas.

No se promete almacenamiento ilimitado ni funcionamiento eterno sin mantenimiento.
El flujo cotidiano sigue siendo elegir foto, completar ficha y guardar; la protección
se ejecuta detrás del panel.
