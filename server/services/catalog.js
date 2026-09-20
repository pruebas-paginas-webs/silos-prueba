import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {HttpError, invalid, conflict} from '../errors.js';
import {effective as frameOf, ratio as frameRatio} from './framing.js';
export const CATEGORIES=['Quesos','Jamones y fiambres','Embutidos y salames','Accesorios'];
export const fields=z.object({producto:z.string().trim().min(1).max(120),categoria:z.string().trim().min(1).max(60),marca:z.string().trim().max(80),origen:z.string().trim().max(80),presentacion:z.string().trim().max(120),notas:z.string().trim().max(300),resumen:z.string().trim().max(300).default(''),precio:z.number().int().min(0).max(999999999).nullable(),por_kg:z.boolean(),visible:z.boolean(),stock:z.boolean().nullable(),destacado:z.boolean(),orden:z.number().int().min(0).max(999999),imagen_id:z.string().uuid().nullable()}).strict();
export const defaults={producto:'',categoria:CATEGORIES[0],marca:'',origen:'',presentacion:'',notas:'',resumen:'',precio:null,por_kg:false,visible:false,stock:false,destacado:false,orden:0,imagen_id:null};
export const normalize=text=>String(text).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

export function catalogService(db,{fault=()=>{}}={}) {
  // El encuadre viaja con el producto: la web, los destacados y el PDF lo aplican igual.
  const encuadre=id=>{if(!id)return null;const m=db.prepare('SELECT metadata FROM media WHERE id=?').get(id)?.metadata;if(!m)return null;const f=frameOf(m);return f&&{x:f.x,y:f.y,w:f.w,h:f.h,r:frameRatio(m)};};
  const unpack=r=>r&&({...JSON.parse(r.data),id:r.id,version:r.version,created_at:r.created_at,updated_at:r.updated_at,archived_at:r.archived_at});
  const all=()=>db.prepare('SELECT * FROM products ORDER BY created_at,id').all().map(unpack);
  const get=id=>{const p=unpack(db.prepare('SELECT * FROM products WHERE id=?').get(id));if(!p)throw new HttpError(404,'NO_EXISTE','No encontramos ese producto.');return p;};
  const settings=()=>{const r=db.prepare('SELECT * FROM settings WHERE id=1').get();return {...JSON.parse(r.data),revision:r.revision,updatedAt:r.updated_at};};
  const writeSettings=({revision,updatedAt,...data})=>db.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify(data));
  const bump=()=>db.prepare('UPDATE settings SET revision=revision+1,updated_at=? WHERE id=1').run(new Date().toISOString());

  // Invalidate old forms when retiring the per-product price setting.
  db.transaction(()=>{
    if(db.prepare("SELECT value FROM meta WHERE key='simple-admin-v2'").get())return;
    const s=settings();
    writeSettings({mostrar_precios:s.mostrar_precios??s.mostrar_precios_web??false,mostrar_destacados:s.mostrar_destacados??true,featured:s.featured||[],categories:s.categories||[...new Set([...CATEGORIES,...all().map(p=>p.categoria)])]});
    for(const row of db.prepare('SELECT id,data FROM products').all()){
      const data=JSON.parse(row.data);delete data.mostrar_precio_web;
      db.prepare('UPDATE products SET data=?,version=version+1 WHERE id=?').run(JSON.stringify(data),row.id);
    }
    bump();db.prepare("INSERT INTO meta VALUES('simple-admin-v2',?)").run(new Date().toISOString());
  }).immediate();

  function checked(data){const result=fields.safeParse(data);if(!result.success)throw invalid('Revisá los datos: '+result.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));if(!settings().categories.includes(result.data.categoria))throw invalid('Esa categoría cambió. Actualizá la lista y elegí una categoría existente.');return result.data;}
  function checkMedia(id){if(id&&!db.prepare("SELECT id FROM media WHERE id=? AND status='ready'").get(id))throw invalid('La foto todavía no está lista. Volvé a subirla.');}
  function featureLimit(data,id=null){if(data.destacado&&all().filter(p=>p.id!==id&&!p.archived_at&&p.destacado).length>=8)throw invalid('Ya hay ocho destacados. Desmarcá uno para elegir otro.');}
  function syncFeatures(id,enabled){const s=settings();s.featured=s.featured.filter(x=>x!==id);if(enabled)s.featured.push(id);writeSettings(s);}
  function save(id,changes,version){return db.transaction(()=>{
    const old=id?get(id):null;if(old&&(old.archived_at||version!==old.version))throw conflict();
    const source=old?Object.fromEntries(Object.keys(defaults).map(k=>[k,old[k]])):{...defaults,categoria:settings().categories[0]};
    const data=checked({...source,...changes});checkMedia(data.imagen_id);featureLimit(data,id);
    const now=new Date().toISOString(),pid=id||randomUUID();
    if(old?.imagen_id&&old.imagen_id!==data.imagen_id)db.prepare('INSERT INTO media_versions(product_id,media_id,created_at) VALUES(?,?,?)').run(pid,old.imagen_id,Date.now());
    fault('beforeProductCommit');
    if(old)db.prepare('UPDATE products SET data=?,version=version+1,updated_at=? WHERE id=?').run(JSON.stringify(data),now,pid);
    else db.prepare('INSERT INTO products(id,data,created_at,updated_at) VALUES(?,?,?,?)').run(pid,JSON.stringify(data),now,now);
    if(old?.destacado!==data.destacado)syncFeatures(pid,data.destacado);
    bump();return get(pid);
  }).immediate();}
  function archive(id,version,restore=false){return db.transaction(()=>{
    const p=get(id);if(version!==p.version)throw conflict();const data=Object.fromEntries(Object.keys(defaults).map(k=>[k,p[k]]));data.destacado=false;if(restore)data.visible=false;
    db.prepare('UPDATE products SET data=?,archived_at=?,version=version+1,updated_at=? WHERE id=?').run(JSON.stringify(data),restore?null:new Date().toISOString(),new Date().toISOString(),id);syncFeatures(id,false);bump();return get(id);
  }).immediate();}
  function featured(ids,revision,show){return db.transaction(()=>{
    const s=settings();if(s.revision!==revision)throw conflict();if(!Array.isArray(ids)||ids.length>8||new Set(ids).size!==ids.length)throw invalid('Elegí hasta ocho productos diferentes.');ids.forEach(id=>{if(get(id).archived_at)throw invalid('Un producto archivado no puede ser destacado.');});
    for(const p of all()){const selected=ids.includes(p.id);if(p.destacado!==selected){const data=JSON.parse(db.prepare('SELECT data FROM products WHERE id=?').get(p.id).data);data.destacado=selected;db.prepare('UPDATE products SET data=?,version=version+1,updated_at=? WHERE id=?').run(JSON.stringify(data),new Date().toISOString(),p.id);}}
    if(show!==undefined&&typeof show!=='boolean')throw invalid('Elegí si querés mostrar los destacados.');
    writeSettings({...s,featured:ids,...(show===undefined?{}:{mostrar_destacados:show})});bump();return settings();
  }).immediate();}
  function updateSettings(changes,revision){return db.transaction(()=>{
    const s=settings();if(s.revision!==revision)throw conflict();const parsed=z.object({mostrar_precios:z.boolean().optional(),mostrar_destacados:z.boolean().optional()}).strict().safeParse(changes);
    if(!parsed.success||!Object.keys(parsed.data).length)throw invalid('Elegí qué opción querés cambiar.');writeSettings({...s,...parsed.data});bump();return settings();
  }).immediate();}
  function categories(change,revision){return db.transaction(()=>{
    const s=settings();if(s.revision!==revision)throw conflict();
    const parsed=z.object({action:z.enum(['create','rename','remove','move']),name:z.string().trim().min(1).max(60),newName:z.string().trim().min(1).max(60).optional(),target:z.string().optional(),direction:z.enum(['up','down']).optional()}).strict().safeParse(change);
    if(!parsed.success)throw invalid('Usá un nombre de categoría de entre 1 y 60 caracteres.');const c=parsed.data,index=s.categories.indexOf(c.name);
    if(c.action!=='create'&&index<0)throw invalid('La categoría ya no existe. Actualizá la lista.');
    if(c.action==='create'||c.action==='rename'){
      const name=c.action==='create'?c.name:c.newName;if(!name)throw invalid('Ingresá el nombre de la categoría.');
      if(s.categories.some((n,i)=>i!==(c.action==='rename'?index:-1)&&normalize(n)===normalize(name)))throw invalid('Ya existe una categoría con ese nombre.');
      if(c.action==='create')s.categories.push(name);else{s.categories[index]=name;moveProducts(c.name,name);}
    }else if(c.action==='remove'){
      if(s.categories.length===1)throw invalid('Conservá al menos una categoría.');
      if(all().some(p=>p.categoria===c.name)){
        if(c.target===c.name||!s.categories.includes(c.target))throw invalid('Elegí a qué categoría mover sus productos, incluidos los archivados.');moveProducts(c.name,c.target);
      }
      s.categories.splice(index,1);
    }else{
      if(!c.direction)throw invalid('Elegí hacia dónde mover la categoría.');const next=index+(c.direction==='up'?-1:1);
      if(next<0||next>=s.categories.length)throw invalid('La categoría ya está en ese extremo.');[s.categories[index],s.categories[next]]=[s.categories[next],s.categories[index]];
    }
    fault('beforeCategoryCommit');writeSettings(s);bump();return settings();
  }).immediate();}
  function moveProducts(from,to){for(const p of all().filter(p=>p.categoria===from)){const data=JSON.parse(db.prepare('SELECT data FROM products WHERE id=?').get(p.id).data);data.categoria=to;db.prepare('UPDATE products SET data=?,version=version+1,updated_at=? WHERE id=?').run(JSON.stringify(data),new Date().toISOString(),p.id);}}
  const ordered=items=>{const cats=settings().categories;return items.sort((a,b)=>cats.indexOf(a.categoria)-cats.indexOf(b.categoria)||a.orden-b.orden||a.producto.localeCompare(b.producto,'es')||a.id.localeCompare(b.id));};
  function publicCatalog(){const s=settings();return {revision:s.revision,updatedAt:s.updatedAt,mostrar_destacados:s.mostrar_destacados,items:ordered(all().filter(p=>p.visible&&!p.archived_at)).map(p=>{const out={id:p.id,producto:p.producto,categoria:p.categoria,marca:p.marca,origen:p.origen,presentacion:p.presentacion,notas:p.notas,resumen:p.resumen,stock:p.stock,por_kg:p.por_kg,imagen:p.imagen_id?`/media/${p.imagen_id}/web`:null,encuadre:encuadre(p.imagen_id),destacado:p.destacado,featuredOrder:s.featured.indexOf(p.id)};if(s.mostrar_precios)out.precio=p.precio;return out;})};}
  function list(query={}){
    let items=all();const counts={total:items.filter(p=>!p.archived_at).length,visible:items.filter(p=>p.visible&&!p.archived_at).length,noStock:items.filter(p=>p.stock===false&&!p.archived_at).length,noPhoto:items.filter(p=>!p.imagen_id&&!p.archived_at).length};
    items=items.filter(p=>query.status==='archived'?p.archived_at:!p.archived_at).filter(p=>!query.q||normalize(p.producto+' '+p.marca).includes(normalize(query.q))).filter(p=>!query.category||p.categoria===query.category).filter(p=>query.status==='hidden'?!p.visible:query.status==='nostock'?p.stock===false:query.status==='nophoto'?!p.imagen_id:true);
    return {items:ordered(items).map(p=>({...p,encuadre:encuadre(p.imagen_id)})),total:items.length,counts,settings:settings()};
  }
  return {all,get,settings,save,archive,featured,updateSettings,categories,publicCatalog,list,ordered,bump};
}
