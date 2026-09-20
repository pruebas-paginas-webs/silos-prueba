import puppeteer from 'puppeteer';
import {template} from '../pdf/template.js';
import {paginate} from '../pdf/paginate.js';
import {applyFraming} from '../pdf/apply-framing.js';
import {HttpError} from '../errors.js';
export async function generatePdf(snapshot,options,cfg,images){
  const deadline=Date.now()+45000;
  const remaining=()=>{const n=deadline-Date.now();if(n<=0)throw new Error('Se agotó el tiempo de generación.');return n;};
  let browser,timer;
  try{
    const html=await template(snapshot,options,cfg,images);
    browser=await puppeteer.launch({headless:true,executablePath:cfg.executablePath,timeout:remaining()});
    timer=setTimeout(()=>browser.close().catch(()=>{}),remaining());
    const page=await browser.newPage();page.setDefaultTimeout(remaining());
    await page.setRequestInterception(true);
    page.on('request',r=>{if(r.url().startsWith('data:')||r.url()==='about:blank')r.continue();else r.abort();});
    await page.setContent(html,{waitUntil:'load',timeout:remaining()});
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
    const layout=await page.evaluate(paginate);
    if(layout.products!==snapshot.items.length||layout.overflow)throw new Error('Paginación incompleta.');
    // Después de paginar: recién acá se conoce el recuadro real de cada ficha.
    const framed=await page.evaluate(applyFraming);
    if(framed.applied!==framed.total)console.warn(`PDF: ${framed.total-framed.applied} foto(s) sin encuadre; quedan enteras y centradas.`);
    return await page.pdf({printBackground:true,preferCSSPageSize:true,timeout:remaining()});
  }catch(e){if(e instanceof HttpError)throw e;console.error('PDF:',e.message);throw new HttpError(503,'PDF','No pudimos preparar el catálogo. Tus productos están guardados; reintentá.');}
  finally{clearInterval(timer);if(browser)await browser.close();}
}
