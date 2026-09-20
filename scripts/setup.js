import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import argon2 from 'argon2';
import {config} from '../server/config.js';
import {openDb} from '../server/db.js';
import {importCatalog} from './import-catalog.js';
const cfg=config();console.log(await importCatalog(cfg));const db=openDb(cfg.dataDir);
if(!db.prepare('SELECT id FROM admins LIMIT 1').get()){
  if(cfg.production)throw new Error('Creá la cuenta de producción con el comando admin.');
  const password=randomBytes(12).toString('base64url');db.prepare('INSERT INTO admins(id,usuario,password_hash) VALUES(?,?,?)').run(randomUUID(),'silos',await argon2.hash(password));
  fs.writeFileSync(path.join(cfg.dataDir,'ACCESO-LOCAL.txt'),`PROTOTIPO LOCAL - NO PUBLICAR\nPanel: ${cfg.origin}/admin.html\nUsuario: silos\nContraseña: ${password}\n`,{mode:0o600});
}
db.close();console.log('Listo. Acceso de prueba en storage/ACCESO-LOCAL.txt. Ejecutá pnpm start.');
