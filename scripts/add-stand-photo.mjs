import fs from 'node:fs/promises';
import {config} from '../server/config.js';
import {createApp} from '../server/app.js';
import {hash} from '../server/services/images.js';
import {backup} from '../server/services/backup.js';
const cfg=config(),ctx=createApp(cfg),key='stand-photo-2026-09-20';
try{
  if(ctx.db.prepare('SELECT value FROM meta WHERE key=?').get(key))console.log('Foto ya aplicada.');
  else{
    const matches=ctx.catalog.all().filter(p=>p.producto==='Tabla soporte para jamón'&&!p.archived_at);
    if(matches.length!==1)throw new Error('Ficha ausente o ambigua.');
    const p=matches[0];
    const source='Fotos del cliente/Productos alta calidad/restauradas-2026-09-20/tabla-soporte-sin-jamon.png';
    const bytes=await fs.readFile(source);
    console.log('Respaldo:',await backup(ctx,cfg));
    const media=await ctx.images.upload(bytes,'stand-photo',hash(bytes));
    const report=[{id:p.id,previousMedia:p.imagen_id,mediaId:media.mediaId,source,sha256:hash(bytes)}];
    ctx.db.transaction(()=>{
      ctx.catalog.save(p.id,{imagen_id:media.mediaId},p.version);
      ctx.db.prepare('INSERT INTO meta VALUES(?,?)').run(key,JSON.stringify(report));
    }).immediate();
    console.log(JSON.stringify(report));
  }
}finally{ctx.close();}
