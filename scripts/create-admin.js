import {randomUUID} from 'node:crypto';
import argon2 from 'argon2';
import {config} from '../server/config.js';
import {openDb} from '../server/db.js';
import {credentials} from './admin-input.js';
const {usuario,password}=await credentials();const db=openDb(config().dataDir);try{db.prepare('INSERT INTO admins(id,usuario,password_hash) VALUES(?,?,?)').run(randomUUID(),usuario,await argon2.hash(password));console.log('Administrador creado.');}finally{db.close();}
