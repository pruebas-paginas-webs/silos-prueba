# Silos Paraguay

Sitio institucional de **Silos Paraguay SRL**: importación y distribución de alimentos premium
(quesos, fiambres y productos gourmet) desde Europa, operando en Paraguay desde 2021.

Prototipo local con **HTML/CSS/JavaScript + Node.js 24, Express y SQLite**.
Panel privado, catálogo compartido con la portada, fotografías persistentes y PDF móvil.
Esta implementación todavía no fue publicada.

## Ver el sitio

- Instalá Node.js 24 y pnpm 11.19.0.
- Ejecutá `pnpm install --frozen-lockfile`, `pnpm setup` y `pnpm start`.
- Web: <http://127.0.0.1:5174/>. Panel: <http://127.0.0.1:5174/admin.html>.
- En esta computadora también podés ejecutar `./Iniciar-Silos.ps1`.
- La primera preparación crea el usuario local `silos` con una contraseña aleatoria en
  `storage/ACCESO-LOCAL.txt`. No es una cuenta pública ni una clave de producción.
- No servir la raíz con `python -m http.server`: contiene datos privados de trabajo.
- La versión estática anterior sigue en GitHub Pages; no incluye este backend.

## Estructura

- `public/` — único directorio servido; web y panel nuevos.
- `server/` — API, sesiones, catálogo, imágenes, PDF y respaldos.
- `storage/` — SQLite, fotos y claves locales; ignorado por Git, conservar al actualizar.
- `scripts/` — importación, cuentas, backup/restauración.
- `tests/` — pruebas aisladas de API, fotos, categorías y PDF.
- `docs/ESTADO-IMPLEMENTACION.md` — etapas, evidencia y límites verificados.
- `docs/OPERACION.md` — instalación, recuperación y pendientes de publicación.
- `docs/MANUAL-DEL-PANEL.md` — instrucciones sencillas para el dueño.
- `docs/REVISION-FOTOS.md` — recuperación de fotos originales, foto suelta de Old Amsterdam y referencia pendiente de la tabla soporte.
- `docs/CORRECCION-FOTOS-2026-09-20.md` — calidad recuperada, Basiron/Montana y demo lista para el próximo deploy.
- HTML/JS/CSS, `assets/` y `data/` en la raíz: versión anterior preservada y fuente de
  migración. No son la aplicación nueva y no se sirven por Express.

## Verificar

`pnpm test` ejecuta pruebas de integración aisladas. `pnpm test:pdf` genera dos muestras
en `output/pdf/`. `node tests/pdf/edge-cases.js` prueba nombres/descripciones largos.
`python tests/pdf/verify_pdfs.py` verifica texto, tamaño y renderiza todas las páginas
(requiere pypdf, pypdfium2 y Pillow). El renderer usa Chromium con sandbox activo.

## Notas

- Todo el contenido corresponde a **Silos Paraguay SRL**, empresa independiente fundada en 2021
  (no confundir con otras empresas del mismo rubro que operan en otros países).
- Pendientes de contenido (fotos de producto, dirección física, etc.) están documentados en
  `PLAN.md` (no publicado — uso interno).
