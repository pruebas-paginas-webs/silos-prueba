// Curated replacements only: no blanket rollback to old assets or PDF thumbnails.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {config} from '../server/config.js';
import {createApp} from '../server/app.js';
import {hash} from '../server/services/images.js';
import {backup} from '../server/services/backup.js';

const cfg=config(),ctx=createApp(cfg);
try {
  const spec=JSON.parse(await fs.readFile(new URL('./photo-quality-selection.json',import.meta.url),'utf8'));
  if(ctx.db.prepare('SELECT value FROM meta WHERE key=?').get(spec.version)) {
    console.log('Revisión ya aplicada; se conservan ediciones posteriores.');
  } else {
    const base=path.join(cfg.root,'Fotos del cliente/Productos alta calidad');
    const inventory=JSON.parse(await fs.readFile(path.join(base,'inventario-revisado.json'),'utf8'));
    const plans=[];
    for(const [producto,presentacion,ref] of spec.replacements) {
      const matches=ctx.catalog.all().filter(p=>!p.archived_at&&p.producto===producto&&p.presentacion===presentacion);
      if(matches.length!==1)throw new Error('Ficha ausente/ambigua: '+producto+' '+presentacion);
      const candidate=inventory.find(x=>x.id===ref);
      if(!candidate||candidate.estado!=='Seleccionada'||!candidate.candidata.startsWith('seleccionadas/'))throw new Error('Candidata no aprobada: '+ref);
      const source=path.join(base,candidate.candidata),bytes=await fs.readFile(source),meta=await sharp(bytes).metadata();
      plans.push({product:matches[0],source:path.relative(cfg.root,source),bytes,sha256:hash(bytes),width:meta.width,height:meta.height,ref});
    }
    console.log('Reemplazos revisados:',plans.length);
    if(process.argv.includes('--apply')) {
      console.log('Respaldo previo:',await backup(ctx,cfg));
      const report=[];
      for(const p of plans){const media=await ctx.images.upload(p.bytes,'quality-review',p.sha256);report.push({id:p.product.id,producto:p.product.producto,presentacion:p.product.presentacion,source:p.source,sha256:p.sha256,width:p.width,height:p.height,previousMedia:p.product.imagen_id,mediaId:media.mediaId});}
      ctx.db.transaction(()=>{
        for(let i=0;i<report.length;i++)ctx.catalog.save(report[i].id,{imagen_id:report[i].mediaId},plans[i].product.version);
        ctx.db.prepare('INSERT INTO meta VALUES(?,?)').run(spec.version,JSON.stringify(report));
      }).immediate();
      await fs.mkdir(path.join(cfg.root,'tmp/photo-quality-review'),{recursive:true});
      await fs.writeFile(path.join(cfg.root,'tmp/photo-quality-review/applied.json'),JSON.stringify(report,null,2));
      console.log('Aplicados:',report.length,'sin modificar otros datos ni destacados.');
    } else console.log('Sin cambios. Usar --apply para aplicar.');
  }
} finally {ctx.close();}
