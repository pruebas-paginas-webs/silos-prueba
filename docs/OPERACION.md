# Operación técnica del prototipo

## Instalación y arranque

Node 24; pnpm 11.19.0. Desde la raíz:

```sh
pnpm install --frozen-lockfile
pnpm setup
pnpm start
```

El lockfile es `pnpm-lock.yaml` (se utilizó el gestor disponible en este entorno en
lugar de npm). `pnpm-workspace.yaml` autoriza únicamente los scripts nativos necesarios.
Chromium se descarga en `.cache/puppeteer`; no se desactiva su sandbox. Las fuentes se
sirven localmente con sus licencias. No se necesita conexión a Google Fonts.

El servidor escucha solo en 127.0.0.1 por defecto. Si cambiás puerto/dominio, actualizá
también `APP_ORIGIN`, usado para CSRF y enlaces del PDF. El dominio definitivo aún no
está configurado: los PDFs de prueba enlazan al catálogo local.

En el entorno restringido de Codex/Windows, Chromium necesita lanzarse bajo la cuenta
normal del usuario. Se verificó así, con sandbox de Chromium activo. Los archivos de
almacenamiento deben permitir escritura a la cuenta que ejecuta Node. No abrir una
misma base con cuentas sin los mismos permisos sobre DB, WAL y SHM.

`scripts/prepare-public-once.py` fue una migración única del HTML; no ejecutarlo como
build, porque volvería a transformar archivos ya editados. La aplicación vive en
`public/`. Los archivos de raíz se preservaron como legado y entrada de importación.

## Persistencia y cuentas

`DATA_DIR` debe estar fuera de `public/` y sobrevivir a redeploys. Guardar DB y fotos
en un disco local persistente de una única instancia; no compartir SQLite por red.
`pnpm setup` importa una sola vez. Reejecutarlo no duplica ni pisa fichas editadas.
La importación rechaza una base con productos que no tenga su marca de migración.

`pnpm admin` crea una cuenta desde una terminal interactiva, con entrada de contraseña
oculta. `pnpm reset-admin` cambia la contraseña y cierra todas las sesiones. No incluir
contraseñas en comandos, repositorio o logs. En producción no se genera un usuario
automático. `SESSION_SECRET` debe ser aleatorio, al menos 32 caracteres; HTTPS obligatorio.

El prototipo entrega acceso de prueba en `storage/ACCESO-LOCAL.txt`; retirarlo al configurar
la cuenta definitiva. Los datos de sesión se guardan en SQLite, expiran por inactividad
(8 h) y tienen duración máxima de 24 h. Se usa un adaptador pequeño de express-session
con contrato Store probado, evitando otra dependencia solo para la tabla de sesiones.

## Fotos

La maestra orientada conserva hasta 2400 px; derivados thumb 320, web 1000, PDF hasta
1600. El documento comprime su copia a 1100 px para mantenerse por debajo de 5 MB.
JPEG/PNG/WebP, sin animación, 10 MB y 40 megapíxeles. HEIC no se promete en esta versión;
el usuario recibe indicación de exportar JPG. No se sube a servicios externos.

ID inmutable; staging privado; validación y decodificación completa; referencia publicada
solo tras terminar todos los archivos. Retención de fotos anteriores 30 días. Limpieza
horaria de huérfanos vencidos, con protección de archivados, historial y exportaciones.
Un registro processing abandonado puede reintentarse con la misma clave sin perder la
foto publicada. Ningún endpoint permite fijar rutas o URLs arbitrarias para imágenes.

La cuota predeterminada es 2 GB, configurable mediante `STORAGE_QUOTA_MB`. Se muestra
aviso al 80% y crítico al 90%; falta de disco devuelve error sin cambiar la foto anterior.
No se elimina material vigente para liberar espacio. La capacidad no es ilimitada.

El 19/09 se restauraron 34 fotos del catálogo original. Ver `REVISION-FOTOS.md` para
fuentes, trazabilidad y la referencia pendiente de la tabla soporte. Old Amsterdam se
validó contra la foto suelta del cliente. Para migrar esta instalación,
restaurar un respaldo actual: el importador legado contiene las fotos previas a esa
corrección. La marca del reparador evita sobrescribir cambios posteriores.

## Respaldos cifrados

El servidor revisa cada hora si corresponde el respaldo diario y lo realiza al iniciar
si está vencido. Debe estar encendido para ejecutarlo. Guarda copia consistente de DB,
maestras y derivados, verificando hashes; cada archivo y manifiesto se cifra con AES-256-GCM.
No respalda sesiones ni la clave de cifrado. Retención: un respaldo por cada uno de los
últimos 7 días disponibles y uno por cada una de las últimas 4 semanas disponibles.

`pnpm backup` permite ejecutarlo manualmente. En local usa `storage/backups` y genera
`storage/.backup-key`. Esa clave debe conservarse aparte: sin ella no se puede restaurar.
Para producción configurar `BACKUP_KEY` (32 bytes aleatorios en Base64) y `BACKUP_DIR`
en un destino persistente que luego se replique fuera del servidor. No basta con un
directorio del mismo disco como única copia. El proveedor/destino externo está pendiente.
La aplicación no contrató ni configuró un servicio externo.

Restaurar siempre a una carpeta nueva/vacía:

```sh
pnpm restore /ruta/al/respaldo /ruta/nueva-vacia
```

Configurar la misma clave de backup; el comando rechaza sobrescribir datos existentes
y verifica integridad antes de entregar la carpeta. Luego detener el servidor y apuntar
`DATA_DIR` al destino verificado. Crear/restaurar por separado el secreto de sesiones;
todos deberán volver a ingresar. Se probó restauración aislada con fotos y precios.

## Publicación pendiente (E8 fuera del alcance)

Dockerfile preparado, **no ejecutado aquí porque Docker no está instalado**. Requiere
contenedor sin privilegios, sandbox de Chromium compatible, volumen /data, HTTPS y secreto.
No agregar `--no-sandbox` ni `--privileged` para ocultar incompatibilidades del hosting.
El contenedor no contiene el JSON legado con precios; migrar localmente y restaurar
un respaldo en el volumen, o preparar una entrada privada de importación.

Antes de producción: verificar Docker/hosting, dominio y APP_ORIGIN, backups realmente
externos, credenciales definitivas, precios comerciales y pruebas desde teléfonos reales.
Actualizaciones de dependencias/Node/Chromium requieren repetir `pnpm test` y QA de PDF.
Nunca servir la raíz del repo, hacer público storage ni volver a subir el JSON con precios.

## Fuentes técnicas consultadas

- https://sharp.pixelplumbing.com/api-output/
- https://pptr.dev/api/puppeteer.pdfoptions
- https://expressjs.com/en/resources/middleware/session/
