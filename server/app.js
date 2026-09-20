import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import argon2 from 'argon2';
import {randomUUID} from 'node:crypto';
import {openDb} from './db.js';
import {catalogService} from './services/catalog.js';
import {imageService} from './services/images.js';
import {effective as frameOf, ratio as frameRatio} from './services/framing.js';
import {sessionMiddleware,csrf,requireAdmin,token} from './middleware/auth.js';
import {HttpError,invalid,conflict} from './errors.js';
export function createApp(cfg,{fault=()=>{},pdfGenerator}={}){
  const db=openDb(cfg.dataDir),catalog=catalogService(db,{fault}),images=imageService(db,cfg,{fault});
  const app=express();app.disable('x-powered-by');if(cfg.production)app.set('trust proxy',1);
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],imgSrc:["'self'",'data:','blob:'],fontSrc:["'self'"],styleSrc:["'self'"],scriptSrc:["'self'"],upgradeInsecureRequests:cfg.production?[]:null}},strictTransportSecurity:cfg.production?undefined:false}));
  app.use(express.json({limit:'128kb'}));app.use(sessionMiddleware(db,cfg));
  app.use('/api',(req,res,next)=>{res.set('Cache-Control','private, no-store');next();});
  app.use('/api',csrf(cfg));
  app.get('/api/auth/session',(req,res)=>{const authenticated=!!req.session.adminId&&Date.now()-(req.session.born||0)<24*3600000&&!!db.prepare('SELECT id FROM admins WHERE id=? AND active=1').get(req.session.adminId);res.json({authenticated,csrf:token(req)});});
  app.post('/api/auth/login',rateLimit({windowMs:15*60000,limit:10,standardHeaders:'draft-8',legacyHeaders:false,handler:(req,res,next)=>next(new HttpError(429,'INTENTOS','Demasiados intentos. Esperá 15 minutos.'))}),async(req,res)=>{
    const {usuario,password}=req.body||{};if(typeof usuario!=='string'||typeof password!=='string'||password.length>256)throw invalid('Ingresá tu usuario y contraseña.');const a=db.prepare('SELECT * FROM admins WHERE usuario=? AND active=1').get(usuario.trim());
    if(!a||!await argon2.verify(a.password_hash,password))throw new HttpError(401,'CLAVE','El usuario o la contraseña no coinciden.');
    await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.adminId=a.id;req.session.born=Date.now();res.json({authenticated:true,csrf:token(req)});
  });
  app.post('/api/auth/logout',requireAdmin(db),(req,res,next)=>req.session.destroy(e=>{if(e)return next(e);res.clearCookie('silos.sid');res.json({ok:true});}));
  app.get('/api/catalogo',(req,res)=>res.json(catalog.publicCatalog()));
  app.use('/api/admin',requireAdmin(db));
  app.get('/api/admin/products',(req,res)=>res.json({...catalog.list(req.query),storage:images.usage()}));
  app.post('/api/admin/products',(req,res)=>res.status(201).json(catalog.save(null,req.body)));
  app.patch('/api/admin/products/:id',(req,res)=>res.json(catalog.save(req.params.id,req.body.changes,req.body.version)));
  for(const [action,restore] of [['archive',false],['restore',true]])app.post(`/api/admin/products/:id/${action}`,(req,res)=>res.json(catalog.archive(req.params.id,req.body.version,restore)));
  app.get('/api/admin/settings',(req,res)=>res.json(catalog.settings()));
  app.get('/api/admin/featured',(req,res)=>res.json({settings:catalog.settings(),items:catalog.ordered(catalog.all().filter(p=>!p.archived_at)).map(p=>({id:p.id,producto:p.producto,presentacion:p.presentacion,visible:p.visible,imagen_id:p.imagen_id,categoria:p.categoria}))}));
  app.patch('/api/admin/settings',(req,res)=>{const {revision,...changes}=req.body;res.json(catalog.updateSettings(changes,revision));});
  app.put('/api/admin/categories',(req,res)=>{const {revision,...change}=req.body;res.json(catalog.categories(change,revision));});
  app.put('/api/admin/featured',(req,res)=>res.json(catalog.featured(req.body.ids,req.body.revision,req.body.mostrar_destacados)));
  const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024**2,files:1,fields:0}});
  app.post('/api/admin/media',upload.single('foto'),async(req,res)=>{if(!req.file)throw invalid('Elegí una foto.');res.json(await images.upload(req.file.buffer,req.session.adminId,req.get('Idempotency-Key')));});
  app.get('/api/admin/media/:id/frame',(req,res)=>{const row=images.row(req.params.id);if(!row||row.status!=='ready')throw new HttpError(404,'NO_EXISTE','Esa foto ya no está disponible.');const m=JSON.parse(row.metadata||'{}');res.json({mediaId:row.id,frame:frameOf(m),manual:!!m.frameManual,r:frameRatio(m)});});
  // Ajuste manual del encuadre. Bump: cambia lo que se ve en la web y en el PDF.
  app.put('/api/admin/media/:id/frame',(req,res)=>{const out=images.setFrame(req.params.id,req.body?.frame??null);catalog.bump();res.json({...out,settings:catalog.settings()});});
  app.get('/api/admin/media/uploads/:key',(req,res)=>res.json(images.status(req.session.adminId,req.params.key)));
  app.get('/api/admin/products/:id/media-history',(req,res)=>{catalog.get(req.params.id);res.json({items:db.prepare('SELECT DISTINCT media_id AS id, MAX(created_at) AS created_at FROM media_versions WHERE product_id=? AND created_at>? GROUP BY media_id ORDER BY created_at DESC').all(req.params.id,Date.now()-30*86400000)});});
  app.post('/api/admin/products/:id/media-restore',(req,res)=>{if(!db.prepare('SELECT id FROM media_versions WHERE product_id=? AND media_id=? AND created_at>?').get(req.params.id,req.body.mediaId,Date.now()-30*86400000))throw invalid('Esa foto ya no está disponible para recuperar.');res.json(catalog.save(req.params.id,{imagen_id:req.body.mediaId},req.body.version));});
  app.get('/media/:id/:variant',async(req,res)=>{const admin=!!req.session.adminId&&Date.now()-(req.session.born||0)<24*3600000&&db.prepare('SELECT id FROM admins WHERE id=? AND active=1').get(req.session.adminId);if(!admin&&!db.prepare("SELECT id FROM products WHERE archived_at IS NULL AND json_extract(data,'$.visible')=1 AND json_extract(data,'$.imagen_id')=?").get(req.params.id))throw new HttpError(404,'NO_EXISTE','Imagen no disponible.');res.set('Cache-Control','private, no-store');res.sendFile(await images.ensure(req.params.id,req.params.variant));});
  let pdfBusy=false;
  app.post('/api/admin/pdf',async(req,res)=>{const b=req.body||{};if(Object.keys(b).some(k=>!['onlyInStock','includePrices','revision'].includes(k))||typeof b.onlyInStock!=='boolean'||typeof b.includePrices!=='boolean')throw invalid('Elegí si querés incluir precios en este PDF.');if(pdfBusy)throw new HttpError(429,'PDF_OCUPADO','Ya estamos preparando un catálogo. Esperá a que termine.');
    const snapshot=db.transaction(()=>{const s=catalog.settings();if(s.revision!==b.revision)throw conflict();return {settings:s,items:catalog.ordered(catalog.all().filter(p=>p.visible&&!p.archived_at&&(!b.onlyInStock||p.stock)))};})();if(!snapshot.items.length)throw invalid('No hay productos para incluir en este catálogo.');
    const options={onlyInStock:b.onlyInStock,includePrices:b.includePrices};
    pdfBusy=true;const release=images.pin(snapshot.items.map(p=>p.imagen_id).filter(Boolean));try{const generate=pdfGenerator||(await import('./services/pdf.js')).generatePdf;const result=await generate(snapshot,options,cfg,images);res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="Silos-Paraguay-celular-${options.includePrices?'con':'sin'}-precios-r${b.revision}.pdf"`});res.send(Buffer.from(result));}finally{release();pdfBusy=false;}
  });
  app.use('/api',(req,res,next)=>next(new HttpError(404,'NO_EXISTE','No encontramos esta operación.')));
  app.use(express.static(cfg.publicDir,{dotfiles:'deny',index:'index.html'}));
  app.use((req,res)=>res.status(404).type('text').send('Página no encontrada.'));
  app.use((err,req,res,next)=>{const operation=randomUUID();const tooLarge=err.code==='LIMIT_FILE_SIZE';const status=tooLarge?413:(err.status||500);if(status>=500)console.error(JSON.stringify({operation,code:err.code||'INTERNO',status}));res.status(status).json({error:{code:tooLarge?'TAMANO':err.code||'INTERNO',message:tooLarge?'La foto pesa más de 10 MB. Elegí una más liviana.':status>=500&&!(err instanceof HttpError)?'No se pudo guardar. Tus cambios anteriores están a salvo.':err.message,operation}});});
  return {app,db,catalog,images,close:()=>db.close()};
}
