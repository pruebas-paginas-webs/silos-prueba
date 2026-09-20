// One-time repair, by exact product + presentation. Source images are extracted
// by audit-original-photos.py, without generative changes or substitute packaging.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {config} from '../server/config.js';
import {createApp} from '../server/app.js';
import {backup} from '../server/services/backup.js';

const mapping=[
  ['Queso azul danés cremoso','100 g',3,3],['Queso azul danés','100 g',3,4],
  ['Queso crema','200 g',4,5],['Brie','125 g',4,3],['Camembert','125 g',4,4],
  ['Gouda','150 g',5,3],['Cheddar','150 g',5,4],['Cheddar madurado 10 meses','200 g',5,5],
  ['Queso griego (feta)','200 g',6,3],['Queso griego en aceite de oliva con aceitunas y hierbas','300 g',6,4],
  ['Parmigiano Reggiano','Pieza 1 kg aprox.',8,1],['Grana Padano','Pieza 1 kg aprox.',8,0],
  ['Parmigiano Reggiano','150 g',9,0],['Grana Padano','150 g',9,2],
  ['Provolone blanco','Pieza 1.5 kg aprox.',10,0],['Queso rallado Granello','160 g',10,4],
  ['Manchego DO Maese Miguel','430 g',12,3],['Manchego DO Maese Miguel','150 g',12,4],
  ['Queso de cabra semicurado','150 g',13,5],['Queso de cabra al vino tinto','150 g',13,4],['Tapas de quesos españoles','100 g',13,3],
  ['Jamón cocido Castagna','Bloque 7.5 kg aprox.',15,3],['Mortadela con pistacho Optima','Pieza 3 kg aprox.',15,4],['Mortadela Ovalina','700 g',15,5],
  ['Tapas de jamón serrano','80 g',17,0],['Jamón serrano loncheado Gourmet','50 g',17,3],
  ['Jamón serrano Bodega sin hueso','Bloque 4 kg aprox.',18,2],['Pata de jamón serrano con hueso','Pieza 7.5 kg aprox.',21,3],
  ['Mini jamón serrano con soporte y cuchillo','800 g aprox.',22,2],
  ['Chorizo extra loncheado Artesano','70 g',17,2],['Salchichón loncheado Artesano','70 g',18,1],
  ['Fuet bites','55 g',20,3],['Little chorizo','55 g',20,2],['Little fuet','55 g',20,1]
];
const cfg=config(),ctx=createApp(cfg);
try{
  const planned=[];
  for(const [producto,presentacion,page,index] of mapping){
    const matches=ctx.catalog.all().filter(p=>p.producto===producto&&p.presentacion===presentacion&&!p.archived_at);
    if(matches.length!==1)throw new Error('Producto ambiguo o ausente: '+producto+' '+presentacion);
    const file=`p${String(page).padStart(2,'0')}-${index}.png`;
    const bytes=await fs.readFile(path.join(cfg.root,'tmp/original-photo-audit',file));
    const sha256=createHash('sha256').update(bytes).digest('hex');
    planned.push({product:matches[0],page,file,bytes,sha256});
  }
  const marker='original-photos-2026-09-19';
  if(ctx.db.prepare('SELECT value FROM meta WHERE key=?').get(marker)){console.log('Originales ya restaurados; no se pisan ediciones posteriores.');}
  else{
    console.log('Respaldo previo:',await backup(ctx,cfg));
    const report=[];
    for(const x of planned){const media=await ctx.images.upload(x.bytes,'original-catalog','source-'+x.sha256.slice(0,40));report.push({id:x.product.id,producto:x.product.producto,presentacion:x.product.presentacion,page:x.page,file:x.file,sha256:x.sha256,previousMedia:x.product.imagen_id,mediaId:media.mediaId});}
    ctx.db.transaction(()=>{
      for(let i=0;i<report.length;i++)ctx.catalog.save(report[i].id,{imagen_id:report[i].mediaId},planned[i].product.version);
      ctx.db.prepare('INSERT INTO meta VALUES(?,?)').run(marker,JSON.stringify(report));
    }).immediate();
    await fs.writeFile(path.join(cfg.root,'tmp/original-photo-audit/restored.json'),JSON.stringify(report,null,2));
    console.log('Restauradas:',report.length,'fotos; versiones anteriores recuperables.');
  }
}finally{ctx.close();}
