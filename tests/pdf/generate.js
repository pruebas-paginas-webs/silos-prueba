import fs from 'node:fs/promises';
import path from 'node:path';
import {config} from '../../server/config.js';
import {createApp} from '../../server/app.js';
import {generatePdf} from '../../server/services/pdf.js';
const cfg=config();const ctx=createApp(cfg);try{const snapshot={settings:ctx.catalog.settings(),items:ctx.catalog.ordered(ctx.catalog.all().filter(p=>p.visible&&!p.archived_at))};await fs.mkdir(path.join(cfg.root,'output/pdf'),{recursive:true});for(const includePrices of [false,true]){const bytes=await generatePdf(snapshot,{includePrices},cfg,ctx.images);const name=`Silos-Paraguay-movil-${includePrices?'con':'sin'}-precios.pdf`;await fs.writeFile(path.join(cfg.root,'output/pdf',name),bytes);console.log(name,bytes.length+' bytes');}}finally{ctx.close();}
