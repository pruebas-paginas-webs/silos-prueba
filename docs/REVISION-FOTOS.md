# Recuperación de fotografías — 19/09/2026

**Actualización 20/09:** se corrigió la interpretación de “misma foto”: se recuperaron
13 alternativas de mayor resolución de la misma presentación y se agregaron los dos
Basiron y Montana. Ver `CORRECCION-FOTOS-2026-09-20.md`. El detalle siguiente es histórico.

Fuente: `Fotos del cliente/CATALOGO SAY CHEESE  julio 25 2.pdf`.

Se extrajeron las imágenes incrustadas, se compararon con las páginas originales y
se asignaron por producto y presentación. Se restauraron **34 fotografías**, incluyendo
queso crema y las presentaciones cuyos envases habían cambiado. No se generaron imágenes
ni se sustituyeron por fotografías de internet. Se conservaron etiquetas, envases y los
fondos negros que ya estaban en el original; la optimización no inventa resolución.

El procesamiento habitual crea una maestra y derivados para listado, web y PDF. La
referencia publicada cambia solo al terminar la escritura; la foto anterior queda en
el historial. Hay 35 productos con imagen y uno sin foto propia.

## Referencias fuera del catálogo y pendiente

- **Tabla soporte para jamón:** en la página 21 aparece junto a la pata de jamón, con
  precio separado. Es el soporte para sostener el jamón al cortarlo. No hay una fotografía
  individual. El usuario pidió aclarar qué era; todavía no eligió usar la foto conjunta.
  Se mantiene sin imagen propia hasta resolverlo.
- **Old Amsterdam — resuelto:** el usuario confirmó que llegó como fotografía aparte.
  Se localizó `Fotos del cliente/dfe27a06-916e-4121-8042-8cf05bb55e3a.png` y se comparó
  visualmente con la imagen optimizada vigente. Coinciden envase, diseño y fotografía.
  Ya está incluido y visible en catálogo, destacados y PDF; se conserva esa misma foto.
  Medio vigente: `ca95099f-41e3-4b76-a8c2-4e7bd9fe3c54`. No fue necesario reemplazarlo.

## Trazabilidad y recuperación

- `scripts/audit-original-photos.py`: extracción y renders de comparación.
- `scripts/restore-original-photos.js`: correspondencias explícitas de los 34 productos,
  respaldo previo, carga por el servicio normal de fotos y actualización transaccional.
- `tmp/original-photo-audit/restored.json`: nombres, presentaciones, páginas, archivos,
  SHA-256, imagen anterior e imagen nueva. El mismo manifiesto queda en la base, clave
  `original-photos-2026-09-19` de `meta`; no depende de conservar archivos temporales.
- Respaldo cifrado previo: `storage/backups/2026-09-19T06-28-24-807Z-43995fc9`.
- Respaldo cifrado posterior verificado por el generador (273 archivos, revisión 73):
  `storage/backups/2026-09-19T06-39-23-625Z-d998581f`.

El reparador detecta su marca y no pisa cambios posteriores. Las imágenes vigentes están
en `storage/`; conservar esa carpeta y sus respaldos al actualizar. El importador legado
sirve para una primera base vacía: sus fotos son anteriores a esta reparación. Para mover
el proyecto usar un respaldo actual, no reconstruirlo con las fotos legadas. Si se necesita
una base nueva desde cero, extraer el PDF y ejecutar el reparador después de importar.
