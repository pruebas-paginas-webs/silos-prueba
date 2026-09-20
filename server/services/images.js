import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {randomUUID,createHash} from 'node:crypto';
import {HttpError,invalid} from '../errors.js';
import {detect,effective,parseManual} from './framing.js';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const VARIANTS={master:2400,thumb:320,web:1000,pdf:1600};
const DAY=86400000;
export function removeInside(root,target){const r=path.resolve(root),t=path.resolve(target);if(t===r||!t.startsWith(r+path.sep))throw new Error('Ruta de limpieza fuera del almacenamiento.');fs.rmSync(t,{recursive:true,force:true});}
export function imageService(db,cfg,{fault=()=>{}}={}) {
  const mediaRoot=path.join(cfg.dataDir,'media'), staging=path.join(cfg.dataDir,'staging');
  fs.mkdirSync(mediaRoot,{recursive:true});fs.mkdirSync(staging,{recursive:true});
  const active=new Set();
  const row=id=>db.prepare('SELECT * FROM media WHERE id=?').get(id);
  const result=r=>({mediaId:r.id,status:r.status,...(r.metadata?JSON.parse(r.metadata):{})});
  function file(id,variant){if(!/^[a-f0-9-]{36}$/.test(id)||!Object.hasOwn(VARIANTS,variant))throw invalid('Imagen inválida.');return path.join(mediaRoot,id,variant+'.jpg');}
  function usage(){const used=db.prepare("SELECT metadata FROM media WHERE status='ready'").all().reduce((sum,r)=>sum+Object.values(JSON.parse(r.metadata).files).reduce((s,v)=>s+v.size,0),0);const disk=fs.statfsSync(cfg.dataDir);const free=disk.bavail*disk.bsize;const ratio=Math.max(used/cfg.quota,1-free/(disk.blocks*disk.bsize));return {bytes:used,quota:cfg.quota,free,level:ratio>=.9?'critical':ratio>=.8?'warning':'ok'};}
  async function upload(bytes,owner,key){
    if(!/^[a-zA-Z0-9-]{8,100}$/.test(key||''))throw invalid('Volvé a elegir la foto para subirla.');
    if(bytes.length>10*1024**2)throw new HttpError(413,'TAMANO','La foto pesa más de 10 MB. Elegí una versión más liviana.');
    const digest=hash(bytes);let r=db.prepare('SELECT * FROM media WHERE owner=? AND upload_key=?').get(owner,key);
    if(r){if(r.hash!==digest)throw new HttpError(409,'SUBIDA_DISTINTA','Esta selección corresponde a otra foto. Elegila de nuevo.');if(r.status==='ready')return result(r);if(active.has(r.id))throw new HttpError(409,'PROCESANDO','La foto se está procesando. Esperá un momento.');}
    if(active.size>=2)throw new HttpError(429,'OCUPADO','Estamos procesando otra foto. Reintentá en unos segundos.');
    const capacity=usage();if(capacity.bytes+bytes.length*4>cfg.quota||capacity.free<Math.max(bytes.length*6,50*1024**2))throw new HttpError(507,'ESPACIO','No hay espacio suficiente. Tu foto anterior está a salvo; contactá al administrador técnico.');
    let meta;try{meta=await sharp(bytes,{limitInputPixels:40000000,failOn:'warning'}).metadata();}catch{throw invalid('No pudimos leer esta foto. Elegí un JPG, PNG o WebP de hasta 40 megapíxeles.');}
    if(!['jpeg','png','webp'].includes(meta.format))throw invalid('Este formato no es compatible. Exportá la foto como JPG, PNG o WebP.');
    if((meta.pages||1)>1)throw invalid('Elegí una foto fija, sin animación.');
    const id=r?.id||randomUUID();const temp=path.join(staging,id),dest=path.join(mediaRoot,id);
    active.add(id);
    db.prepare('INSERT INTO media(id,owner,upload_key,hash,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(owner,upload_key) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at').run(id,owner,key,digest,'processing',Date.now(),Date.now());
    try{
      removeInside(staging,temp);fs.mkdirSync(temp);fault('afterStage');
      const master=await sharp(bytes,{limitInputPixels:40000000,failOn:'warning'}).rotate().toColourspace('srgb').flatten({background:'#fff'}).resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:94}).toBuffer();
      await fsp.writeFile(path.join(temp,'master.jpg'),master);fault('afterMaster');
      for(const [variant,size] of Object.entries(VARIANTS)){if(variant==='master')continue;await sharp(master).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).jpeg({quality:variant==='pdf'?88:85}).toFile(path.join(temp,variant+'.jpg'));}
      const files={};for(const variant of Object.keys(VARIANTS)){const b=await fsp.readFile(path.join(temp,variant+'.jpg'));const m=await sharp(b).metadata();await sharp(b).raw().toBuffer();files[variant]={size:b.length,width:m.width,height:m.height,hash:hash(b)};}
      fault('afterDerivatives');
      if(fs.existsSync(dest))removeInside(mediaRoot,dest); // Only this failed, never-published upload ID.
      await fsp.rename(temp,dest);fault('afterRename');
      // El encuadre se mide sobre el master; si falla, queda la foto completa.
      const metadata={files,warning:Math.max(meta.width,meta.height)<600?'La foto es pequeña; puede verse poco nítida.':null,frame:await detect(master),frameManual:null};
      db.prepare("UPDATE media SET status='ready',metadata=?,updated_at=? WHERE id=?").run(JSON.stringify(metadata),Date.now(),id);fault('afterMediaCommit');return result(row(id));
    }catch(e){if(row(id)?.status!=='ready')db.prepare("UPDATE media SET status='failed',updated_at=? WHERE id=?").run(Date.now(),id);if(e instanceof HttpError)throw e;throw new HttpError(e.code==='ENOSPC'?507:500,'FOTO_GUARDADO','No se pudo guardar la foto. La anterior sigue intacta. Reintentá.');}
    finally{active.delete(id);if(fs.existsSync(temp))removeInside(staging,temp);}
  }
  /* Ajuste manual del encuadre. frame=null restablece el automático; la foto
     original nunca se toca, así siempre se puede volver a ajustar. */
  function setFrame(id,frame){
    const r=row(id);if(!r||r.status!=='ready')throw new HttpError(404,'NO_EXISTE','Esa foto ya no está disponible.');
    const metadata=JSON.parse(r.metadata||'{}');
    metadata.frameManual=parseManual(frame);
    db.prepare('UPDATE media SET metadata=?,updated_at=? WHERE id=?').run(JSON.stringify(metadata),Date.now(),id);
    return {mediaId:id,frame:effective(metadata),manual:!!metadata.frameManual};
  }
  function status(owner,key){const r=db.prepare('SELECT * FROM media WHERE owner=? AND upload_key=?').get(owner,key);if(!r)throw new HttpError(404,'NO_EXISTE','La subida no se encontró. Podés reintentar.');return result(r);}
  async function ensure(id,variant){const r=row(id);if(!r||r.status!=='ready')throw new HttpError(503,'FOTO_FALTANTE','Una foto publicada no está disponible. Reintentá o reemplazala.');const target=file(id,variant);if(fs.existsSync(target))return target;
    const master=file(id,'master');if(variant==='master'||!fs.existsSync(master))throw new HttpError(503,'FOTO_FALTANTE','Falta una foto del catálogo. Recuperala antes de descargar el PDF.');
    const tmp=target+'.'+randomUUID()+'.tmp';try{await sharp(master).resize({width:VARIANTS[variant],height:VARIANTS[variant],fit:'inside',withoutEnlargement:true}).jpeg({quality:variant==='pdf'?88:85}).toFile(tmp);await fsp.rename(tmp,target);return target;}catch(e){throw new HttpError(503,'FOTO_FALTANTE','No se pudo recuperar una foto. Reintentá.');}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
  function pin(ids){const token=randomUUID();for(const id of [...new Set(ids)])db.prepare('INSERT INTO leases VALUES(?,?,?)').run(token+':'+id,id,Date.now()+10*60000);return ()=>db.prepare('DELETE FROM leases WHERE id LIKE ?').run(token+':%');}
  function cleanup(now=Date.now()){
    db.prepare('DELETE FROM leases WHERE expires<?').run(now);if(db.prepare("SELECT id FROM leases WHERE media_id IS NULL AND expires>?").get(now))return {removed:0,paused:true};
    const referenced=new Set(db.prepare("SELECT json_extract(data,'$.imagen_id') AS id FROM products").all().map(r=>r.id));
    for(const r of db.prepare('SELECT media_id AS id FROM media_versions WHERE created_at>? UNION SELECT media_id AS id FROM leases WHERE expires>?').all(now-30*DAY,now))referenced.add(r.id);
    let removed=0;for(const r of db.prepare('SELECT * FROM media WHERE updated_at<?').all(now-DAY)){if(active.has(r.id)||referenced.has(r.id))continue;removeInside(mediaRoot,path.join(mediaRoot,r.id));removeInside(staging,path.join(staging,r.id));db.transaction(()=>{db.prepare('DELETE FROM media_versions WHERE media_id=?').run(r.id);db.prepare('DELETE FROM media WHERE id=?').run(r.id);}).immediate();removed++;}
    for(const root of [staging,mediaRoot])for(const entry of fs.readdirSync(root,{withFileTypes:true})){if(!entry.isDirectory()||!/^[a-f0-9-]{36}$/.test(entry.name)||active.has(entry.name)||row(entry.name))continue;const target=path.join(root,entry.name);if(fs.statSync(target).mtimeMs<now-DAY)removeInside(root,target);}
    db.prepare('DELETE FROM sessions WHERE expires<?').run(now);return {removed};
  }
  return {upload,status,setFrame,ensure,pin,cleanup,usage,file,row,active};
}
