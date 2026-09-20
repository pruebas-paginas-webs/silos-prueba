# Fotos corregidas y demo lista para publicar

## Criterio acordado

Usar la mejor fotografía disponible del mismo producto, sabor y presentación comercial.
No exigir los mismos píxeles del PDF. No sustituir una variante por otra para conseguir
nitidez. La revisión del 19/09 había vuelto a imágenes pequeñas del PDF y se corrige aquí.

## Cambios aplicados localmente

- 13 reemplazos revisados visualmente: Danablu común, Brie, Camembert, Cheddar natural,
  queso griego, griego con aceitunas, Provolone, Manchego 150 g, Rabel al vino, tapas de
  quesos, Castagna, Ovalina y tapas de jamón. Fuentes en `Productos alta calidad/seleccionadas`.
- Originales sueltos incorporados como fichas: Basiron Pesto Verde, Basiron Olive Tomato,
  Montana Intenso. Total: **39 productos, 38 fotos, ocho destacados conservados**.
- Se mantiene Old Amsterdam, ya verificado contra su foto suelta.
- Basiron y Montana: precio y presentación vacíos; disponibilidad desconocida (`stock:null`),
  mostrada como **Consultar disponibilidad**, conservando las fotos a color. No se inventan
  gramajes, precios ni existencias. El botón de stock permite confirmar Sí/No; una edición
  de otros campos conserva el estado desconocido. No aparecen en el filtro de disponibles.
- Fotos procesadas por el servicio normal (maestra, web, miniatura, PDF), sin IA ni
  agrandamiento artificial. Ejemplo: Brie pasó de 209×182 a 1000×833 en la web.
- Demo exportada con precios ficticios; las muestras PDF tienen 39 productos, aviso de
  demostración y enlaces a GitHub Pages. Sin precios: 13 páginas; con precios: 16 páginas;
  ambas alrededor de 3,5 MB. La descarga real del backend usa los datos vigentes.

## Imágenes aún limitadas

No todas las fotos locales de mayor resolución son reemplazos válidos. Siguen las
referencias pequeñas en los casos sin alternativa validada. El manifiesto
`scripts/photo-quality-selection.json` contiene los 21 casos y el motivo individual:
envase diferente, gramaje sin verificar, sabor incorrecto, escasa mejora o reconstrucción
generativa. Incluye Optima con pistachos (la candidata era sin pistachos), Granello
(bolsa 125 g frente a los 160 g declarados), cuatro Zanetti con etiqueta/gramaje pendiente,
Emborg con otros diseños, Arroyo y El Conchel. No se presentan como fotografías mejoradas.
La tabla soporte sigue sin foto propia.

## Reproducibilidad y resguardos

`scripts/repair-photo-quality.mjs --apply` ejecuta los 13 reemplazos una sola vez;
`scripts/add-loose-products.mjs` agrega las tres fichas una sola vez. Ambos conservan
marcas de aplicación, fuentes, hashes y medios en SQLite. No reejecutar la restauración
general del PDF para corregir calidad. No usar el importador legado para reconstruir
la base actual: trasladar un respaldo.

Respaldo previo a la corrección: `storage/backups/2026-09-20T03-06-00-495Z-6ee3ffe0`.
Respaldo posterior: `storage/backups/2026-09-20T03-15-56-118Z-d7cbaf53`, revisión 89,
337 archivos. Se verificaron los 38 pares de derivados web/miniatura y los 39 productos
de la API local. Editar una ficha nueva en la demo conserva la disponibilidad desconocida.
Las fotos reemplazadas permanecen recuperables en el historial.

## Para Claude: publicar esta corrección

La carpeta **demo/** ya está regenerada. Publicar su contenido completo con el procedimiento
actual de GitHub Pages, incluyendo `demo-seed-update.js`, `demo-seed.json`, las fotos y
los dos PDF. No publicar storage ni originales privados. No cambiar las fotos por las
de assets/ o por las extraídas del PDF.

Si se necesita regenerar desde esta misma base corregida:

```sh
node scripts/build-demo.mjs
node scripts/build-demo-pdf.mjs
python scripts/stamp-demo-pdf.py
python tests/pdf/verify-demo-photos.py
```

El generador conserva medios exportados antes para no romper el historial de los
visitantes. La demo aplica una actualización dirigida: reemplaza una foto anterior
solo si el visitante no la cambió, agrega las tres fichas nuevas y conserva ediciones,
stock, precios de ejemplo, favoritos, archivos y fotos propias. No hace falta borrar
los datos del navegador ni indicar Restablecer demo como primer paso.

El snapshot para PDF se obtiene con la API de backup de SQLite, incluyendo WAL.
No copiar solo catalog.sqlite mientras el servidor esté activo.

## Verificación

- 20 pruebas de integración aprobadas: fotos, rollback, 100 reemplazos, categorías,
  precios web/PDF independientes, disponibilidad desconocida y actualización de la demo.
- Demo probada bajo `/silos-prueba/demo/`: 39 productos, búsqueda de los nuevos,
  imagen de Brie de 1000 px y ninguna imagen cargada rota; consola sin errores.
- Ambos PDF extraídos, renderizados completos y revisados: productos nuevos una vez
  cada uno, tamaño móvil, precios según variante, ninguna URL de localhost.
- Los cambios están locales. Este trabajo no ejecutó un push ni un deploy.

## Actualización posterior: restauraciones autorizadas con IA

El cliente autorizó recrear las fotos pequeñas conservando la presentación del catálogo,
los textos legibles y desenfoque suave en microtexto irrecuperable. Este criterio reemplaza
la restricción anterior de no usar restauraciones generativas. Se conservaron las fotos
buenas existentes y se restauraron las 23 imágenes que aún tenían menos de 900 píxeles.
No se cambiaron productos por variantes nuevas. Son recreaciones visuales, no recuperaciones
exactas de información que ya era ilegible en el original.

Fuentes maestras locales: `Fotos del cliente/Productos alta calidad/restauradas-2026-09-20/`.
El archivo `applied.json` registra producto, presentación, hash, dimensiones y medios
anterior/nuevo. Se corrigieron durante la revisión el peso del Gouda (150 g) y el año
de Arroyo (1947), contrastado con https://consorcioserrano.es/quienes-somos/nuestros-asociados/jamones-arroyo-s-l/.
Las imágenes originales del cliente y las versiones anteriores permanecen disponibles.

Aplicación idempotente: `node scripts/apply-photo-restoration.mjs --apply` (ya ejecutada).
Respaldo previo: `storage/backups/2026-09-20T04-04-03-415Z-a28010c1`, revisión 90.
Estado resultante: revisión 113, 39 productos, 38 imágenes web de al menos 1000 px en
su lado mayor. La tabla soporte continúa sin foto individual confirmada.

Old Amsterdam estaba clasificado como Especialidades; ahora figura en Quesos.
La migración de la demo corrige esa clasificación y ambas generaciones anteriores de
fotos, preservando categorías personalizadas y fotos subidas o retiradas por visitantes.
Basiron Pesto Verde, Basiron Olive Tomato, Montana Intenso y Old Amsterdam conservan
las fotos sueltas de buena resolución entregadas por el cliente.

Verificación final: 21 pruebas aprobadas; demo revisada visualmente en navegador;
Old Amsterdam visible dentro de Quesos; fotos Emborg cargadas con lado mayor de 1000 px.
PDF móvil regenerado y revisado completo: sin precios 14 páginas/4.823 MB,
con precios 16 páginas/4.829 MB. Compresión mozjpeg a calidad 80 manteniendo 1100 px;
39 productos en cada PDF, sin links de localhost. Informe y renders en
`tmp/photo-quality-review/pdf/`. La carpeta demo está lista para Claude; no se publicó.

Al desplegar, publicar la carpeta demo completa actualizada, incluidos ambos PDF y los
nuevos subdirectorios de media. No ejecutar `restore-original-photos.js` para reconstruir
la demo ni volver a las miniaturas extraídas del PDF. No subir storage ni las maestras.

## Encuadre uniforme

Se ajustó la presentación de las 38 fotos del catálogo y destacados con un área útil
del 84%, centrada sobre el producto. Las imágenes y su resolución permanecen intactas:
solo se modifica el encuadre CSS para compensar los márgenes blancos de cada fuente.
Los dos Danablu se revisaron juntos en navegador y PDF. Se quitó el zoom al pasar el
mouse para conservar ese encuadre. Los sobres largos mantienen su proporción real.

`scripts/build-photo-framing.mjs` mide los márgenes y genera
`public/assets/photo-framing.json` y `photo-framing.css`. El PDF usa las mismas medidas
adaptadas a sus tarjetas. Si se reemplazan imágenes, ejecutar este script antes de
regenerar la demo y los PDF; una foto nueva sin medidas usa un margen estándar sin recorte.
Las imágenes del editor de administración siguen mostrando el archivo completo.

Demo y PDF regenerados y revisados: 39 productos, 14/16 páginas sin/con precios,
menos de 5 MB cada uno. Para publicar con Claude incluir los dos archivos de encuadre
dentro de `demo/assets/`, los HTML y los PDF actualizados. Sigue sin ejecutarse deploy.

## Tabla soporte completada

Por pedido del usuario se quitó el jamón de la fotografía de la pata con soporte usando
image_gen integrado. Se conservaron base, madera curvada y herrajes; las partes antes
ocultas son reconstruidas. Maestra: `restauradas-2026-09-20/tabla-soporte-sin-jamon.png`,
con prompt y procedencia en `tabla-soporte-prompt.txt` de la misma carpeta.
Aplicación idempotente: `scripts/add-stand-photo.mjs`; respaldo previo revisión 113 en
`storage/backups/2026-09-20T17-15-56-659Z-e231afe5`. Revisión resultante 114.
Los 39 productos ahora tienen foto. Encuadres, demo y muestras PDF regenerados.
La migración de la demo completa la foto vacía de la tabla y conserva cargas propias.
