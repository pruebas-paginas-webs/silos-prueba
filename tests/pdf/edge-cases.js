import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {config} from '../../server/config.js';
import {createApp} from '../../server/app.js';
import {defaults} from '../../server/services/catalog.js';
import {generatePdf} from '../../server/services/pdf.js';
const cfg=config(),ctx=createApp(cfg);const out=path.join(cfg.root,'tmp/qa-mobile');await fs.mkdir(out,{recursive:true});
try{for(const count of [1,7]){const items=Array.from({length:count},(_,i)=>({...defaults,id:randomUUID(),producto:`PRUEBA-${i+1} `+'Queso especial de nombre extenso '.repeat(4).slice(0,110),marca:'Marca de prueba',origen:'Paraguay',presentacion:'Pieza de peso variable, venta por kilo',notas:'Descripción de prueba para verificar el espacio y la lectura. '.repeat(5).slice(0,300),visible:true,stock:i%2===0,precio:i%2?null:123456,por_kg:true}));const bytes=await generatePdf({settings:ctx.catalog.settings(),items},{includePrices:true},cfg,ctx.images);await fs.writeFile(path.join(out,`edge-${count}.pdf`),bytes);console.log('PDF de prueba:',count,'productos;',bytes.length,'bytes');}}finally{ctx.close();}
