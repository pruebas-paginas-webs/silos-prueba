import session from 'express-session';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {HttpError} from '../errors.js';
export class SQLiteSessions extends session.Store {
  constructor(db){super();this.db=db;}
  get(sid,cb){try{const r=this.db.prepare('SELECT data FROM sessions WHERE sid=? AND expires>?').get(sid,Date.now());cb(null,r?JSON.parse(r.data):null);}catch(e){cb(e);}}
  set(sid,value,cb=()=>{}){try{this.db.prepare('INSERT OR REPLACE INTO sessions VALUES(?,?,?)').run(sid,JSON.stringify(value),Math.min(Date.now()+8*3600000,(value.born||Date.now())+24*3600000));cb();}catch(e){cb(e);}}
  destroy(sid,cb=()=>{}){try{this.db.prepare('DELETE FROM sessions WHERE sid=?').run(sid);cb();}catch(e){cb(e);}}
  touch(sid,value,cb){this.set(sid,value,cb);}
}
export function sessionMiddleware(db,cfg){return session({name:'silos.sid',secret:cfg.secret,store:new SQLiteSessions(db),resave:false,saveUninitialized:false,rolling:true,cookie:{httpOnly:true,secure:cfg.production,sameSite:'lax',maxAge:8*3600000}});}
export function token(req){req.session.born ||= Date.now();req.session.csrf ||= randomBytes(32).toString('hex');return req.session.csrf;}
export function csrf(cfg){return (req,res,next)=>{if(['GET','HEAD','OPTIONS'].includes(req.method))return next();const a=Buffer.from(req.get('X-CSRF-Token')||''),b=Buffer.from(req.session.csrf||'');if(req.get('Origin')!==cfg.origin||!a.length||a.length!==b.length||!timingSafeEqual(a,b))return next(new HttpError(403,'CSRF','La sesión cambió. Actualizá la página y volvé a intentar.'));next();};}
export function requireAdmin(db){return (req,res,next)=>{if(!req.session.adminId||!req.session.born||Date.now()-req.session.born>24*3600000||!db.prepare('SELECT id FROM admins WHERE id=? AND active=1').get(req.session.adminId))return next(new HttpError(401,'SESION','Ingresá al panel para continuar.'));next();};}
