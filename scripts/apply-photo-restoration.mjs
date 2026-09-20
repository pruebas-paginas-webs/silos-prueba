// Faithful AI restorations explicitly requested on 2026-09-20.
// Inputs remain alongside the original customer references; previous media is recoverable.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {config} from '../server/config.js';
import {createApp} from '../server/app.js';
import {hash} from '../server/services/images.js';
import {backup} from '../server/services/backup.js';
const cfg=config(),ctx=createApp(cfg),marker='photo-restoration-2026-09-20';
try {
  if(ctx.db.prepare('SELECT value FROM meta WHERE key=?').get(marker))console.log('Restauraciones ya aplicadas.');
  else {
    const prior=JSON.parse(ctx.db.prepare('SELECT value FROM meta WHERE key=?').get('original-photos-2026-09-19').value);
    const folder='Fotos del cliente/Productos alta calidad/restauradas-2026-09-20';
    const files=(await fs.readdir(path.join(cfg.root,folder))).filter(f=>/^p\d\d-\d\.png$/.test(f));
    if(files.length!==23)throw new Error(`Se requieren 23 fotos revisadas; hay ${files.length}.`);
    const plans=[];
    for(const file of files){
      const original=prior.find(p=>p.file===file);
      if(!original)throw new Error('Referencia sin producto: '+file);
      const product=ctx.catalog.all().find(p=>p.id===original.id&&!p.archived_at);
      if(!product)throw new Error('Producto no disponible: '+file);
      const source=path.join(folder,file),bytes=await fs.readFile(path.join(cfg.root,source)),meta=await sharp(bytes).metadata();
      if(Math.max(meta.width,meta.height)<1200)throw new Error('Resolución insuficiente: '+file);
      plans.push({product,source,bytes,sha256:hash(bytes),width:meta.width,height:meta.height});
    }
    console.log('Fotos verificadas:',plans.length);
    if(process.argv.includes('--apply')){
      console.log('Respaldo:',await backup(ctx,cfg));
      const report=[];
      for(const p of plans){
        const media=await ctx.images.upload(p.bytes,'ai-restoration',p.sha256);
        report.push({id:p.product.id,producto:p.product.producto,presentacion:p.product.presentacion,source:p.source,sha256:p.sha256,width:p.width,height:p.height,previousMedia:p.product.imagen_id,mediaId:media.mediaId,method:'AI restoration from same package reference'});
      }
      ctx.db.transaction(()=>{
        for(let i=0;i<report.length;i++)ctx.catalog.save(report[i].id,{imagen_id:report[i].mediaId},plans[i].product.version);
        ctx.db.prepare('INSERT INTO meta VALUES(?,?)').run(marker,JSON.stringify(report));
      }).immediate();
      await fs.writeFile(path.join(cfg.root,folder,'applied.json'),JSON.stringify(report,null,2));
      console.log('Restauraciones aplicadas:',report.length);
    }
  }
}finally{ctx.close();}
