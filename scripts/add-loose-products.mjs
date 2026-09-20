import fs from 'node:fs/promises';
import path from 'node:path';
import {config} from '../server/config.js';
import {createApp} from '../server/app.js';
import {hash} from '../server/services/images.js';
import {backup} from '../server/services/backup.js';
const cfg=config(),ctx=createApp(cfg),marker='loose-products-2026-09-20';
try{
  if(ctx.db.prepare('SELECT value FROM meta WHERE key=?').get(marker))console.log('Altas ya incorporadas; no se duplican.');
  else{
    const spec=JSON.parse(await fs.readFile(new URL('./photo-quality-selection.json',import.meta.url),'utf8'));
    const pending=[];
    for(const p of spec.newProducts){
      if(ctx.catalog.all().some(x=>x.producto===p.producto))throw new Error('Ya existe: '+p.producto);
      const source=path.join('Fotos del cliente',p.source),bytes=await fs.readFile(path.join(cfg.root,source));
      pending.push({...p,source,bytes,sha256:hash(bytes)});
    }
    console.log('Respaldo previo:',await backup(ctx,cfg));
    for(const p of pending)p.mediaId=(await ctx.images.upload(p.bytes,'client-original',p.sha256)).mediaId;
    const records=ctx.db.transaction(()=>{
      const added=pending.map((p,i)=>{
        // These facts are not supplied by a photo. Leave them explicitly unconfirmed.
        const product=ctx.catalog.save(null,{producto:p.producto,marca:p.marca,origen:p.origen,categoria:'Quesos',presentacion:'',precio:null,stock:null,visible:true,orden:100+i,imagen_id:p.mediaId});
        return {id:product.id,producto:p.producto,source:p.source,sha256:p.sha256,mediaId:p.mediaId};
      });
      ctx.db.prepare('INSERT INTO meta VALUES(?,?)').run(marker,JSON.stringify(added));return added;
    }).immediate();
    console.log('Agregados:',records.map(p=>p.producto).join(', '));
  }
}finally{ctx.close();}
