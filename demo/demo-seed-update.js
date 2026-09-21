// Update only the curated photos and added products. Preserve visitor edits.
export function mergeSeedUpdate(saved, fresh) {
  const result=structuredClone(saved),update=fresh.updates;
  if(!update||result.settings.demoContentVersion===update.version)return result;
  const initial=new Map(fresh.products.map(p=>[p.id,p]));
  for(const photo of update.photos){
    const p=result.products.find(p=>p.id===photo.id),next=initial.get(photo.id);
    // A visitor's own upload/removal must win over the catalog update.
    const removedOwnPhoto=photo.previousMedia===null&&result.settings.mediaHistory?.[photo.id]?.length;
    if(p&&next&&!removedOwnPhoto&&p.imagen_id===photo.previousMedia){p.imagen_id=next.imagen_id;p.version=Math.max(p.version,next.version)+1;}
  }
  for(const id of update.addedProductIds){
    if(!result.products.some(p=>p.id===id)&&initial.has(id))result.products.push(structuredClone(initial.get(id)));
  }
  for(const change of update.categories||[]){
    const p=result.products.find(p=>p.id===change.id);
    if(p&&p.categoria===change.previous){p.categoria=change.next;p.version++;}
  }
  // Después de las mudanzas puntuales: renombrar la categoría y lo que quedó en ella.
  for(const {previous,next} of update.renameCategories||[]){
    const i=result.settings.categories.indexOf(previous);
    if(i>=0&&!result.settings.categories.includes(next))result.settings.categories[i]=next;
    for(const p of result.products)if(p.categoria===previous){p.categoria=next;p.version++;}
  }
  result.settings.demoContentVersion=update.version;
  result.settings.revision++;
  return result;
}
