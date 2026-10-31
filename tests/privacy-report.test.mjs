import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/[[path]].js';

const origin='https://dulceruta.pages.dev';
const secret='test-only-password-very-long';
const points=[{id:'a',nombre:'Casa A',direccion:'Calle Uno',horario:'18:00 a 21:00',lat:22.99,lng:-105.85,tipo:'casa'}];
const reports=[];
const db={
 prepare(query){
   const q=query.trim();
   let args=[];
   const stmt={
     bind(...values){args=values;return stmt;},
     async run(){
       if(q.startsWith('INSERT INTO reportes'))reports.push({id:args[0],punto_id:args[1],motivo:args[2],detalle:args[3],estado:'pendiente',creado:'2026-10-31'});
       if(q.startsWith('UPDATE reportes'))for(const r of reports)if(r.id===args[0])r.estado='atendido';
       return {success:true};
     },
     async all(){
       if(q.startsWith('SELECT id,punto_id,motivo'))return {results:reports.filter(r=>r.estado==='pendiente')};
       if(q.startsWith('SELECT id,nombre'))return {results:points};
       return {results:[]};
     },
     async first(){
       if(q.startsWith('SELECT id FROM puntos'))return points.find(p=>p.id===args[0])||null;
       if(q.startsWith('SELECT id FROM reportes'))return reports.find(r=>r.punto_id===args[0]&&r.motivo===args[1]&&r.estado==='pendiente')||null;
       if(q.startsWith('SELECT COUNT'))return {n:reports.filter(r=>r.estado==='pendiente').length};
       return null;
     },
   };
   return stmt;
 },
};
const env={DB:db,ADMIN_PASSWORD:secret};
const req=(path,options={},environment=env)=>onRequest({request:new Request(origin+path,options),env:environment});

test('configuración de privacidad pública omite campos no configurados',async()=>{
 const r=await req('/api/aviso-config');
 assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{responsable:'',domicilio:'',correo:''});
});
test('rechaza un reporte enviado desde otro origen',async()=>{
 const r=await req('/api/reportes',{method:'POST',headers:{Origin:'https://otro.example','Content-Type':'application/json'},body:'{}'});
 assert.equal(r.status,403);
});
test('rechaza reportes inválidos y de puntos inexistentes',async()=>{
 const bad=await req('/api/reportes',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({puntoId:'x',motivo:'otro',detalle:''})});
 assert.equal(bad.status,404);
});
test('registro de reporte público no modifica los puntos publicados',async()=>{
 const r=await req('/api/reportes',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({puntoId:'a',motivo:'sin_permiso',detalle:'Verificar autorización'})});
 assert.equal(r.status,201);
 assert.deepEqual(await r.json(),{recibido:true});
 assert.equal(points.length,1);
 const repeat=await req('/api/reportes',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({puntoId:'a',motivo:'sin_permiso',detalle:''})});
 assert.equal(repeat.status,200);
 assert.equal(reports.length,1);
});
test('reportes no se pueden consultar sin sesión',async()=>{
 const r=await req('/api/admin/reportes');
 assert.equal(r.status,401);
});
test('administrador puede consultar y marcar atendido un reporte',async()=>{
 const login=await req('/api/admin/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:secret})});
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const listed=await req('/api/admin/reportes',{headers:{Cookie:cookie}});
 assert.equal(listed.status,200);
 const list=await listed.json();
 assert.equal(list.reportes.length,1);
 const changed=await req('/api/admin/reportes/resolver',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({id:list.reportes[0].id})});
 assert.equal(changed.status,200);
 const after=await req('/api/admin/reportes',{headers:{Cookie:cookie}});
 assert.equal((await after.json()).reportes.length,0);
});
