import {config} from '../server/config.js';
import {createApp} from '../server/app.js';
import {backup,pruneBackups} from '../server/services/backup.js';
import path from 'node:path';
const cfg=config(),ctx=createApp(cfg);try{const result=await backup(ctx,cfg);pruneBackups(process.env.BACKUP_DIR||path.join(cfg.dataDir,'backups'));console.log(result);}finally{ctx.close();}
