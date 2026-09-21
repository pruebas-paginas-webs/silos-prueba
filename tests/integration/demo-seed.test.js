import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeSeedUpdate} from '../../scripts/demo-assets/demo-seed-update.js';
test('la foto del soporte completa el vacío original y conserva una retirada con historial',()=>{
  const fresh={products:[{id:'stand',imagen_id:'new-photo',version:4}],updates:{version:'stand',photos:[{id:'stand',previousMedia:null}],addedProductIds:[]}};
  for(const ownHistory of [false,true]){
    const saved={products:[{id:'stand',imagen_id:null,version:2}],settings:{revision:1,mediaHistory:ownHistory?{stand:['own-upload']}:{}}};
    assert.equal(mergeSeedUpdate(saved,fresh).products[0].imagen_id,ownHistory?null:'new-photo');
  }
});
test('demo actualiza fotos y altas conservando cambios, archivos propios, archivo y selección',()=>{
  const old={products:[{id:'a',imagen_id:'old-a',producto:'Editado',stock:false,version:8},{id:'b',imagen_id:'upload',version:9},{id:'c',imagen_id:null,version:3},{id:'d',imagen_id:'old-d',archived_at:'2026',version:2}],settings:{revision:20,mostrar_precios:true,featured:['b'],mediaHistory:{a:['old-a']}}};
  const fresh={products:['a','b','c','d','new'].map(id=>({id,imagen_id:'hi-'+id,version:5})),updates:{version:'v2',photos:['a','b','c','d'].map(id=>({id,previousMedia:'old-'+id})),addedProductIds:['new']}};
  const r=mergeSeedUpdate(old,fresh);
  assert.equal(r.products[0].imagen_id,'hi-a');assert.equal(r.products[0].producto,'Editado');assert.equal(r.products[0].stock,false);
  assert.equal(r.products[1].imagen_id,'upload');assert.equal(r.products[2].imagen_id,null);assert.equal(r.products[3].archived_at,'2026');
  assert.equal(r.products.length,5);assert.deepEqual(r.settings.featured,['b']);assert.equal(r.settings.mostrar_precios,true);assert.deepEqual(r.settings.mediaHistory,{a:['old-a']});
  assert.deepEqual(mergeSeedUpdate(r,fresh),r);assert.equal(old.products[0].imagen_id,'old-a');
});
test('demo migra ambas generaciones de fotos y Old Amsterdam sin pisar categorías editadas',()=>{
  const fresh={products:[{id:'a',imagen_id:'restored',version:10},{id:'old',categoria:'Quesos',version:10}],updates:{version:'v3',photos:[{id:'a',previousMedia:'tiny'},{id:'a',previousMedia:'quality'}],addedProductIds:[],categories:[{id:'old',previous:'Especialidades',next:'Quesos'}]}};
  for(const image of ['tiny','quality','own'])for(const category of ['Especialidades','Personalizada']){
    const saved={products:[{id:'a',imagen_id:image,version:2},{id:'old',categoria:category,version:2}],settings:{revision:2,demoContentVersion:'v2'}};
    const result=mergeSeedUpdate(saved,fresh);
    assert.equal(result.products[0].imagen_id,image==='own'?'own':'restored');
    assert.equal(result.products[1].categoria,category==='Especialidades'?'Quesos':'Personalizada');
    assert.deepEqual(mergeSeedUpdate(result,fresh),result);
  }
});
test('la demo propaga el renombre de categoría y conserva los encuadres del visitante',()=>{
  const fresh={products:[{id:'a',categoria:'Accesorios',version:9}],
    updates:{version:'accesorios',photos:[],addedProductIds:[],renameCategories:[{previous:'Especialidades',next:'Accesorios'}]}};
  const saved={products:[{id:'a',categoria:'Especialidades',version:3}],
    settings:{revision:5,categories:['Quesos','Especialidades'],frames:{foto1:{manual:{x:.1,y:.1,w:.5,h:.5},auto:null,r:1}}}};
  const out=mergeSeedUpdate(saved,fresh);
  assert.deepEqual(out.settings.categories,['Quesos','Accesorios']);
  assert.equal(out.products[0].categoria,'Accesorios');
  assert.deepEqual(out.settings.frames.foto1.manual,{x:.1,y:.1,w:.5,h:.5});   // el ajuste propio no se pierde
  // Una categoría que el visitante renombró por su cuenta no se toca.
  const propio={products:[{id:'a',categoria:'Mis cosas',version:3}],settings:{revision:5,categories:['Quesos','Mis cosas'],frames:{}}};
  const out2=mergeSeedUpdate(propio,fresh);
  assert.deepEqual(out2.settings.categories,['Quesos','Mis cosas']);
  assert.equal(out2.products[0].categoria,'Mis cosas');
});
test('un producto que se muda de categoría no queda atrapado por el renombre',()=>{
  // Old Amsterdam se muda de Especialidades a Quesos; a la vez Especialidades pasa
  // a llamarse Accesorios. La mudanza puntual tiene que ganar.
  const fresh={products:[{id:'oa',categoria:'Quesos',version:9},{id:'tabla',categoria:'Accesorios',version:9}],
    updates:{version:'v9',photos:[],addedProductIds:[],
      categories:[{id:'oa',previous:'Especialidades',next:'Quesos'}],
      renameCategories:[{previous:'Especialidades',next:'Accesorios'}]}};
  const saved={products:[{id:'oa',categoria:'Especialidades',version:3},{id:'tabla',categoria:'Especialidades',version:3}],
    settings:{revision:5,categories:['Quesos','Especialidades'],frames:{}}};
  const out=mergeSeedUpdate(saved,fresh);
  assert.equal(out.products.find(p=>p.id==='oa').categoria,'Quesos');
  assert.equal(out.products.find(p=>p.id==='tabla').categoria,'Accesorios');
  assert.deepEqual(out.settings.categories,['Quesos','Accesorios']);
});
