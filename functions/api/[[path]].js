// Cloudflare Pages: DB (D1) and ADMIN_PASSWORD (server-side secret) are mandatory.
// Admin session is HMAC-signed and stored in a HttpOnly cookie.
const enc = new TextEncoder();
const secretOK = env => typeof env.ADMIN_PASSWORD === 'string' && env.ADMIN_PASSWORD.length >= 16;
const response = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
 status, headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}
});
const err = (message,status=400) => response({error:message},status);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const cookieName = 'dr_admin';
const lifetime = 8*60*60*1000;
const bytes = hex => Uint8Array.from(hex.match(/.{2}/g)||[],x=>parseInt(x,16));
const hex = array => [...new Uint8Array(array)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function digest(value){ return new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))); }
function eq(a,b){ if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];return d===0;}
async function sign(secret,payload){
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',key,enc.encode('dulceruta:v1:'+payload)));
}
async function validSession(req,secret){
 const match=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='));
 if(!match)return false;
 const parts=match.slice(cookieName.length+1).split('.');
 if(parts.length!==3)return false;
 const [expiry,id,signature]=parts;
 if(!/^\d{13}$/.test(expiry)||!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9]{64}$/.test(signature))return false;
 if(Number(expiry)<Date.now()||Number(expiry)>Date.now()+lifetime)return false;
 return eq(enc.encode(signature),enc.encode(await sign(secret,expiry+'.'+id)));
}
function point(raw) {
 if(!object(raw))return null;
 const {id,nombre,direccion,horario,lat,lng,tipo}=raw;
 if(typeof id!=='string'||!id.trim()||id.length>110||
    typeof nombre!=='string'||!nombre.trim()||nombre.length>90||
    typeof direccion!=='string'||!direccion.trim()||direccion.length>180||
    typeof horario!=='string'||horario.length>90||
    typeof lat!=='number'||!Number.isFinite(lat)||Math.abs(lat)>90||
    typeof lng!=='number'||!Number.isFinite(lng)||Math.abs(lng)>180||
    !['casa','local'].includes(tipo))return null;
 return {id:id.trim(),nombre:nombre.trim(),direccion:direccion.trim(),horario:horario.trim(),lat,lng,tipo};
}
async function points(db){
 const rows=await db.prepare('SELECT id,nombre,direccion,horario,lat,lng,tipo FROM puntos ORDER BY nombre COLLATE NOCASE LIMIT 500').all();
 return rows.results||[];
}
async function readJson(request,max){
 if(!request.headers.get('content-type')?.includes('application/json'))throw Error('content type');
 const raw=await request.text();
 if(raw.length>max)throw Error('payload too large');
 return JSON.parse(raw);
}
export async function onRequest({request,env}) {
 const route=new URL(request.url).pathname.replace(/\/$/,'');
 const method=request.method;
 if(route==='/api/puntos'&&method==='GET'){
   if(!env.DB)return err('D1 no vinculada',503);
   try {return response(await points(env.DB));}
   catch(e){console.error('D1 read',e);return err('D1 sin esquema',503);}
 }
 if(!route.startsWith('/api/admin/'))return err('No encontrado',404);
 if(!env.DB||!secretOK(env))return err('Falta DB o ADMIN_PASSWORD',503);
 if(method!=='GET'&&request.headers.get('origin')!==new URL(request.url).origin)return err('Origen no autorizado',403);
 if(route==='/api/admin/session'&&method==='GET')return response({authenticated:await validSession(request,env.ADMIN_PASSWORD)});
 if(route==='/api/admin/login'&&method==='POST'){
   let body;
   try{body=await readJson(request,1024);}catch{return err('Solicitud inválida');}
   if(!object(body)||typeof body.password!=='string'||body.password.length>200)return err('Contraseña incorrecta',401);
   const [given,expected]=await Promise.all([digest(body.password),digest(env.ADMIN_PASSWORD)]);
   if(!eq(given,expected))return err('Contraseña incorrecta',401);
   const payload=String(Date.now()+lifetime)+'.'+crypto.randomUUID();
   const token=payload+'.'+await sign(env.ADMIN_PASSWORD,payload);
   return response({authenticated:true},200,{'Set-Cookie':cookieName+'='+token+'; Max-Age=28800; Path=/api/admin; Secure; HttpOnly; SameSite=Strict'});
 }
 if(route==='/api/admin/logout'&&method==='POST')return response({authenticated:false},200,{'Set-Cookie':cookieName+'=; Max-Age=0; Path=/api/admin; Secure; HttpOnly; SameSite=Strict'});
 if(!(await validSession(request,env.ADMIN_PASSWORD)))return err('Sesión inválida',401);
 if(route==='/api/admin/puntos'&&method==='GET'){
   try{
     const [list,meta]=await Promise.all([points(env.DB),env.DB.prepare('SELECT revision FROM meta WHERE id=1').first()]);
     if(!meta||!Number.isInteger(meta.revision))return err('D1 sin esquema',503);
     return response({points:list,revision:meta.revision});
   }catch(e){console.error('D1 admin read',e);return err('D1 sin esquema',503);}
 }
 if(route==='/api/admin/puntos'&&method==='PUT'){
   let body;
   try{body=await readJson(request,350000);}catch{return err('JSON no válido');}
   if(!object(body)||!Array.isArray(body.points)||body.points.length>500||!Number.isInteger(body.revision)||body.revision<0)return err('Lista o revisión inválida');
   const clean=body.points.map(point);
   if(clean.some(x=>!x))return err('Hay registros inválidos');
   const ids=new Set();
   for(const item of clean){if(ids.has(item.id))return err('Identificadores duplicados');ids.add(item.id);}
   const nonce=crypto.randomUUID();
   const statements=[
     env.DB.prepare('UPDATE meta SET revision=revision+1, op_token=? WHERE id=1 AND revision=?').bind(nonce,body.revision),
     env.DB.prepare('DELETE FROM puntos WHERE EXISTS (SELECT 1 FROM meta WHERE id=1 AND op_token=?)').bind(nonce)
   ];
   for(const p of clean)statements.push(env.DB.prepare(
    'INSERT INTO puntos (id,nombre,direccion,horario,lat,lng,tipo) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM meta WHERE id=1 AND op_token=?)'
   ).bind(p.id,p.nombre,p.direccion,p.horario,p.lat,p.lng,p.tipo,nonce));
   try{
     const result=await env.DB.batch(statements);
     if(!result[0]?.meta?.changes)return err('Conflicto: hay una publicación más reciente',409);
     return response({ok:true,count:clean.length,revision:body.revision+1});
   }catch(e){console.error('D1 save',e);return err('No se pudieron guardar los puntos',500);}
 }
 return err('No encontrado',404);
}
