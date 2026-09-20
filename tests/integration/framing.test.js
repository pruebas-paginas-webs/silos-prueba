import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {detect,normalize,layout,toView,fromView,fitWidth,parseManual,COMPLETA} from '../../server/services/framing.js';

const WEB=1, PDF=45/40;          // proporciones de los dos recuadros reales
const revisados=JSON.parse(fs.readFileSync(new URL('../../public/assets/photo-framing.json',import.meta.url),'utf8'));
const caja=b=>({x:b.left/b.width,y:b.top/b.height,w:(b.right-b.left)/b.width,h:(b.bottom-b.top)/b.height});
const cerca=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} ≠ ${b}`);

test('los 39 encuadres ya revisados se ven exactamente igual que antes',()=>{
  const ids=Object.keys(revisados);
  assert.equal(ids.length,39);
  for(const id of ids){
    const b=revisados[id], f=caja(b), r=b.width/b.height;
    // Fórmula histórica de la web (build-photo-framing.mjs)
    const s=.84/Math.max(b.right-b.left,b.bottom-b.top);
    const web=layout(f,r,WEB);
    cerca(web.width,b.width*s*100); cerca(web.height,b.height*s*100);
    cerca(web.left,(0.5-(b.left+b.right)/2*s)*100); cerca(web.top,(0.5-(b.top+b.bottom)/2*s)*100);
    // Fórmula histórica del PDF móvil (server/pdf/template.js)
    const k=Math.min(.84*PDF/(b.right-b.left),.84/(b.bottom-b.top));
    const pdf=layout(f,r,PDF);
    cerca(pdf.width,b.width*k/PDF*100); cerca(pdf.height,b.height*k*100);
    cerca(pdf.left,(0.5-(b.left+b.right)/2*k/PDF)*100); cerca(pdf.top,(0.5-(b.top+b.bottom)/2*k)*100);
  }
});

test('ante un encuadre inválido se muestra la foto completa y centrada',()=>{
  for(const malo of [null,undefined,{},{x:0,y:0,w:0,h:1},{x:NaN,y:0,w:1,h:1},{x:0,y:0,w:99,h:1},'x',{x:0,y:0,w:1}]){
    assert.deepEqual(normalize(malo),COMPLETA);
  }
  const l=layout(null,1,WEB);
  cerca(l.width,84); cerca(l.height,84); cerca(l.left,8); cerca(l.top,8);
});

test('nunca deforma ni recorta: la parte útil entra entera en cualquier recuadro',()=>{
  for(const r of [0.4,0.75,1,1.33,2.5]){                 // fotos altas y anchas
    for(const a of [WEB,PDF,1.4,0.8]){                    // recuadros web y PDF
      for(const f of [{x:0,y:0,w:1,h:1},{x:.3,y:.05,w:.4,h:.9},{x:.05,y:.35,w:.9,h:.3},{x:.2,y:.2,w:.6,h:.6}]){
        const l=layout(f,r,a);
        // proporción intacta: (ancho·anchoRecuadro)/(alto·altoRecuadro) == r
        cerca((l.width*a)/l.height,r,1e-9);
        // la parte útil ocupa como máximo el margen, y toca el margen por un lado
        const útilAncho=l.width*f.w, útilAlto=l.height*f.h;
        assert.ok(útilAncho<=84+1e-9&&útilAlto<=84+1e-9,`se sale: ${útilAncho}×${útilAlto}`);
        cerca(Math.max(útilAncho,útilAlto),84,1e-9);
        // queda centrada
        cerca(l.left+l.width*(f.x+f.w/2),50); cerca(l.top+l.height*(f.y+f.h/2),50);
      }
    }
  }
});

test('el ajuste manual conserva lo que se ve y respeta el zoom',()=>{
  for(const [id,b] of Object.entries(revisados)){
    const f=caja(b), r=b.width/b.height;
    const antes=layout(f,r,WEB), después=layout(fromView(toView(f,r),r),r,WEB);
    for(const k of ['width','height','left','top']) cerca(antes[k],después[k],1e-9);
  }
  // Acercar agranda la foto; el punto elegido queda en el centro del recuadro.
  const r=1.2, base=fitWidth(r);
  const cerca2=fromView({width:base*2,cx:.3,cy:.7},r);
  const l=layout(cerca2,r,WEB);
  assert.ok(l.width>layout(fromView({width:base,cx:.5,cy:.5},r),r,WEB).width);
  cerca(l.left+l.width*.3,50,1e-9); cerca(l.top+l.height*.7,50,1e-9);
  // No se puede perder la foto: el centro siempre cae dentro de ella.
  const fuera=fromView({width:base,cx:9,cy:-4},r);
  assert.ok(fuera.x+fuera.w/2<=1.000001&&fuera.x+fuera.w/2>=-0.000001);
});

const lienzo=async(ancho,alto,fondo,producto)=>sharp({create:{width:ancho,height:alto,channels:4,background:fondo}})
  .composite([{input:await sharp({create:{width:producto.w,height:producto.h,channels:4,background:{r:120,g:60,b:40,alpha:1}}}).png().toBuffer(),left:producto.x,top:producto.y}])
  .png().toBuffer();

test('mide el vacío con fondo blanco y con fondo transparente',async()=>{
  for(const fondo of [{r:255,g:255,b:255,alpha:1},{r:0,g:0,b:0,alpha:0}]){
    const f=await detect(await lienzo(1000,1000,fondo,{x:400,y:250,w:200,h:500}));
    assert.equal(f.source,'auto');
    assert.ok(Math.abs(f.x-0.4)<0.02&&Math.abs(f.w-0.2)<0.03,`x=${f.x} w=${f.w}`);
    assert.ok(Math.abs(f.y-0.25)<0.02&&Math.abs(f.h-0.5)<0.03,`y=${f.y} h=${f.h}`);
  }
});

test('con fondo de color muestra la foto completa en vez de adivinar',async()=>{
  const f=await detect(await lienzo(900,900,{r:40,g:90,b:140,alpha:1},{x:300,y:300,w:300,h:300}));
  assert.deepEqual(f,COMPLETA);
});

test('productos altos y anchos se miden sin cortarse',async()=>{
  const alto=await detect(await lienzo(1200,1200,{r:255,g:255,b:255,alpha:1},{x:520,y:60,w:160,h:1080}));
  assert.ok(alto.h>0.85&&alto.w<0.2,`alto: w=${alto.w} h=${alto.h}`);
  const ancho=await detect(await lienzo(1200,1200,{r:255,g:255,b:255,alpha:1},{x:60,y:520,w:1080,h:160}));
  assert.ok(ancho.w>0.85&&ancho.h<0.2,`ancho: w=${ancho.w} h=${ancho.h}`);
  for(const f of [alto,ancho]) for(const a of [WEB,PDF]){
    const l=layout(f,1,a);
    assert.ok(l.width*f.w<=84+1e-9&&l.height*f.h<=84+1e-9);
  }
});

test('una foto ya recortada o casi vacía se deja como está',async()=>{
  const lleno=await detect(await lienzo(800,800,{r:255,g:255,b:255,alpha:1},{x:2,y:2,w:796,h:796}));
  assert.deepEqual(lleno,COMPLETA);
  const vacío=await sharp({create:{width:600,height:600,channels:3,background:{r:255,g:255,b:255}}}).jpeg().toBuffer();
  assert.deepEqual(await detect(vacío),COMPLETA);
  assert.deepEqual(await detect(Buffer.from('no soy una foto')),COMPLETA);
});

test('valida el encuadre que llega del panel',()=>{
  assert.equal(parseManual(null),null);
  assert.deepEqual(parseManual({x:.1,y:.2,w:.5,h:.5}),{x:.1,y:.2,w:.5,h:.5,source:'manual'});
  for(const malo of [{x:0,y:0,w:0,h:1},{x:0,y:0,w:1,h:99},{x:'a',y:0,w:1,h:1},{x:0,y:0,w:1,h:1,raro:1}])
    assert.throws(()=>parseManual(malo));
});
