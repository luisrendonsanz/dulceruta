import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser=await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();
const errors=[];
let writes=0;
page.on('pageerror', e=>errors.push(e.message));
await page.route('**/api/admin/session', route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({authenticated:true}),
}));
await page.route('**/api/admin/puntos',route=>{
  if(route.request().method()==='PUT') writes++;
  return route.fulfill({
    status:route.request().method()==='GET'?200:500,
    contentType:'application/json',
    body:JSON.stringify({points:[],revision:0}),
  });
});
try{
  await page.goto('http://127.0.0.1:4173/editor.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#preview-map .leaflet-map-pane',{timeout:15000});
  const submissions=Array.from({length:6},(_,i)=>({
    name:'casa-'+(i+1)+'.json',
    mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({
      tipo:'solicitud_dulceruta',version:1,
      solicitante:{nombre:'Dato Privado',apellido:'No Publicar'},
      punto:{
        id:'point-'+(i+1),nombre:'Casa prueba '+(i+1),
        direccion:'Calle Prueba '+(i+1),
        horario:'18:00 a 21:00',
        lat:22.990+i*0.001,lng:-105.857+i*0.001,
        tipo:i%2===0?'casa':'local',
      },
      consentimientoUbicacion:true,fechaSolicitud:'2026-10-31T08:00:00.000Z',
    })),
  }));
  await page.locator('#files').setInputFiles(submissions);
  await page.waitForFunction(()=>document.querySelector('#preview-summary')?.textContent?.includes('6 por revisar'));
  const before=await page.locator('#preview-map .leaflet-marker-icon').count();
  assert.equal(before,6,'Se deben ver los seis JSON antes de aprobar');
  assert.equal(writes,0,'No se debe publicar nada al importar');
  assert.equal(await page.locator('#preview-map .admin-preview-pin--pending').count(),6);
  await page.locator('#preview-map .leaflet-marker-icon').first().click({force:true});
  const popup=await page.locator('#preview-map .leaflet-popup-content').innerText();
  assert.match(popup,/Casa prueba/);
  assert.doesNotMatch(popup,/Dato Privado|No Publicar/);
  console.log('PREVIEW: 6 archivos JSON dibujados, sin publicar ni filtrar datos personales');
  page.on('dialog', async dialog=>dialog.accept());
  await page.locator('#approve').click();
  await page.waitForFunction(()=>document.querySelector('#preview-summary')?.textContent?.includes('6 en borrador'));
  const after=await page.locator('#preview-map .leaflet-marker-icon').count();
  assert.equal(after,6);
  assert.equal(await page.locator('#preview-map .admin-preview-pin--draft').count(),6);
  assert.equal(writes,0,'Aprobar no debe publicar en D1');
  assert.equal(errors.length,0,'Sin errores JS: '+errors.join('; '));
  console.log('PREVIEW: seis marcadores morados después de aprobar, sin escrituras D1');
}finally{
  await page.close();await context.close();await browser.close();
}
