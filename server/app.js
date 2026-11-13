import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './routes/api.js';
import { errorHandler } from './middleware/errors.js';
import { HttpError, ok } from './lib/http.js';
import { pool } from './config/db.js';
export const root=fileURLToPath(new URL('../',import.meta.url));
export const app=express();
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:{directives:{'script-src':["'self'","'unsafe-eval'"],'img-src':["'self'",'data:','https:'],'style-src':["'self'","'unsafe-inline'"],'upgrade-insecure-requests':process.env.NODE_ENV==='production' ? [] : null}},strictTransportSecurity:process.env.NODE_ENV==='production' ? undefined : false}));
app.use((req,res,next)=>{req.requestId=randomUUID();res.set('X-Correlation-ID',req.requestId);res.on('finish',()=>{if(req.path.startsWith('/api/'))console.log(JSON.stringify({id:req.requestId,method:req.method,path:req.path,status:res.statusCode}));});next();});
app.use('/api',cors({origin:process.env.CLIENT_ORIGIN || false,exposedHeaders:['X-Correlation-ID']}));
app.use('/api', (req,res,next) => {
  if (['POST','PUT','PATCH'].includes(req.method) && (Number(req.get('content-length')) > 0 || req.get('transfer-encoding')) && !req.is('application/json')) {
    return next(new HttpError(415,'Envía el cuerpo con Content-Type: application/json.'));
  }
  next();
});
app.use(express.json({limit:'128kb'}));
app.use('/api',rateLimit({windowMs:60000,limit:300,standardHeaders:'draft-8',legacyHeaders:false,message:{status:'error',error:{message:'Demasiadas solicitudes.'}}}));
app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
app.get('/api/v1/salud',async(req,res)=>{await pool.query('SELECT 1 FROM michoks.producto LIMIT 1');ok(res,{database:'ok',architecture:'MVC'});});
app.use('/api/v1',api);
app.use('/api',(req,res)=>{throw new HttpError(404,'Ruta de API no encontrada.');});
app.get('/vendor/vue.js',(req,res)=>res.sendFile(path.join(root,'node_modules/vue/dist/vue.esm-browser.prod.js')));
app.get(['/', '/index.html'],(req,res)=>res.sendFile(path.join(root,'index.html')));
app.get('/cuenta',(req,res)=>res.sendFile(path.join(root,'index.html')));
app.get('/cuenta-contenido',(req,res)=>res.sendFile(path.join(root,'cuenta.html')));
// Lista explícita: .env, SQL, scripts, .git y código del servidor nunca son públicos.
for(const dir of ['assets','js'])app.use('/'+dir,express.static(path.join(root,dir),{dotfiles:'deny',index:false}));
for(const file of ['sw.js','manifest.webmanifest'])app.get('/'+file,(req,res)=>res.sendFile(path.join(root,file)));
app.use((req,res)=>{throw new HttpError(404,'Página no encontrada.');});
app.use(errorHandler);
