import argon2 from 'argon2';
import {config} from '../server/config.js';
import {openDb} from '../server/db.js';
import {credentials} from './admin-input.js';
const {usuario,password}=await credentials();const db=openDb(config().dataDir);try{const hash=await argon2.hash(password);db.transaction(()=>{if(!db.prepare('UPDATE admins SET password_hash=? WHERE usuario=?').run(hash,usuario).changes)throw new Error('Usuario inexistente.');db.prepare('DELETE FROM sessions').run();})();console.log('Contraseña actualizada; sesiones cerradas.');}finally{db.close();}
