import { chromium } from 'playwright-core';

const origin = 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox','--disable-dev-shm-usage'],
});
const sizes = [
  ['Android pequeño', 320, 640],
  ['Android medio', 360, 740],
  ['iPhone', 390, 844],
  ['iPhone grande', 430, 932],
  ['Tablet vertical', 768, 1024],
  ['Tablet horizontal', 1024, 768],
  ['Computadora', 1366, 768],
];
let failures = 0;
for (const [name,width,height] of sizes) {
  const context = await browser.newContext({
    viewport:{width,height},isMobile:width<1100,hasTouch:width<1100,
    deviceScaleFactor:width<1100?2:1,
  });
  const page = await context.newPage();
  const jsErrors=[];
  page.on('pageerror',error=>jsErrors.push(error.message));
  await page.goto(origin+'/registro.html', {waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForTimeout(450);
  const data = await page.evaluate(()=>{
    const d=document.documentElement;
    const panel=document.querySelector('#register-form');
    const tour=document.querySelector('#registration-tutorial-dialog');
    const box = el => {const r=el.getBoundingClientRect();return {left:Math.round(r.left),right:Math.round(r.right),top:Math.round(r.top),bottom:Math.round(r.bottom),width:Math.round(r.width)}};
    return {
      viewport: d.clientWidth,scroll:d.scrollWidth,
      panel:panel?box(panel):null,overlay:tour?box(tour):null,
      inputStart:box(document.querySelector('#hours-start')),
      inputEnd:box(document.querySelector('#hours-end')),
      locate:box(document.querySelector('#register-geolocate')),
      tutorialVisible:!document.querySelector('#registration-tutorial').hidden,
    };
  });
  const horizontalOverflow=data.scroll > data.viewport + 3;
  const inputOverflow=[data.inputStart,data.inputEnd,data.locate].some(r=>r.right>data.viewport+2 || r.left < -2);
  const overlayOverflow=data.overlay.left < -2 || data.overlay.right > data.viewport + 2;
  const passed=!horizontalOverflow&&!inputOverflow&&!overlayOverflow&&data.tutorialVisible&&!jsErrors.length;
  if(!passed)failures++;
  console.log(JSON.stringify({device:name,passed,...data,jsErrors}));
  if(name==='Android medio'){
    await page.locator('#registration-tutorial-remember').check();
    await page.locator('#registration-tutorial-skip').click();
    await page.reload({waitUntil:'load'});
    await page.waitForTimeout(400);
    // El contenedor tiene hijos position:fixed y mide 0x0; comprobar
    // el atributo hidden y la tarjeta visible, no isVisible() del padre.
    const hidden=await page.locator('#registration-tutorial').evaluate(el=>el.hidden);
    await page.locator('#open-register-tour').click();
    await page.waitForTimeout(150);
    const reopened=await page.locator('#registration-tutorial').evaluate(el=>!el.hidden)
      && await page.locator('#registration-tutorial-dialog').isVisible();
    if(!reopened) console.error('Tutorial debug:',await page.evaluate(()=>({hidden:document.querySelector('#registration-tutorial')?.hidden,ready:document.readyState,focus:document.activeElement?.id,local:localStorage.getItem('dulceruta-registration-tour-v1')})),jsErrors);
    if(!hidden||!reopened){failures++;console.error('Tutorial persistencia FALLÓ',hidden,reopened);}
    else console.log('Tutorial omitir/no mostrar/reabrir: OK');
  }
  await context.close();
}
const desktop = await browser.newPage({viewport:{width:900,height:700}});
await desktop.goto(origin+'/',{waitUntil:'domcontentloaded'});
const map = await desktop.locator('#map').isVisible();
console.log('Mapa principal visible:',map);
if(!map)failures++;
await desktop.close();
await browser.close();
if(failures){console.error('Responsive QA FAILED: '+failures+' fallas');process.exitCode=1;}
else console.log('Responsive QA passed all viewports');
