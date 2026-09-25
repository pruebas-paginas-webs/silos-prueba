/* Copia a src/vendor/ las dos piezas del proyecto que el HTML del PDF incrusta
   como texto: la hoja de estilos del PDF y la matemática del encuadre.
   Así el Worker usa exactamente lo mismo que el servidor, sin duplicar código. */
import fs from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const VENDOR = new URL('./src/vendor/', import.meta.url);

fs.mkdirSync(VENDOR, { recursive: true });
fs.copyFileSync(new URL('server/pdf/styles.css', ROOT), new URL('styles.css', VENDOR));
fs.copyFileSync(new URL('public/framing.js', ROOT), new URL('framing.js.txt', VENDOR));
console.log('vendor listo: styles.css y framing.js copiados desde el proyecto');
