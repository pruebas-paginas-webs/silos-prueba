import {config} from './config.js';
import {createApp} from './app.js';
import {backup,pruneBackups} from './services/backup.js';
import path from 'node:path';
const cfg=config();const ctx=createApp(cfg);const server=ctx.app.listen(cfg.port,cfg.host,()=>console.log(`Silos Paraguay: ${cfg.origin}\nPanel: ${cfg.origin}/admin.html`));
const timer=setInterval(()=>{try{ctx.images.cleanup();}catch(e){console.error('No se pudo completar la limpieza: '+(e.code||'INTERNO'));}},3600000);timer.unref();
let backingUp=false,backupTask=Promise.resolve();
async function scheduledBackup(){if(backingUp)return;const last=Number(ctx.db.prepare("SELECT value FROM meta WHERE key='last_backup'").get()?.value||0);if(Date.now()-last<86400000)return;if(cfg.production&&!process.env.BACKUP_DIR){console.error('Backup externo pendiente: configurá BACKUP_DIR y BACKUP_KEY.');return;}backingUp=true;try{await backup(ctx,cfg);pruneBackups(process.env.BACKUP_DIR||path.join(cfg.dataDir,'backups'));ctx.db.prepare("INSERT OR REPLACE INTO meta VALUES('last_backup',?)").run(String(Date.now()));console.log('Respaldo diario cifrado verificado.');}catch(e){console.error('Falló el respaldo diario:',e.code||e.message);}finally{backingUp=false;}}
const runBackup=()=>{backupTask=scheduledBackup();};const backupTimer=setInterval(runBackup,3600000);backupTimer.unref();runBackup();
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{clearInterval(timer);clearInterval(backupTimer);server.close(async()=>{await backupTask;ctx.close();process.exit(0);});});
