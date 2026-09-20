import fs from 'node:fs';
import {restore,backupKey} from '../server/services/backup.js';
import {config} from '../server/config.js';
const [source,destination]=process.argv.slice(2);if(!source||!destination)throw new Error('Uso: pnpm restore <respaldo> <carpeta-nueva-vacia>');console.log(await restore(source,destination,backupKey(config())));
