import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REGISTRATION_TOUR_STEPS } from '../src/register-tour-data.ts';

const html=readFileSync(new URL('../registro.html',import.meta.url),'utf8');
const ts=readFileSync(new URL('../src/registro.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');

test('el boton GPS existe y no envia el formulario',()=>{
  assert.match(html,/id="register-geolocate"[^>]+type="button"/);
  assert.match(html,/id="register-geolocate-status"/);
});
test('la geolocalizacion solo sucede al tocar el boton',()=>{
  assert.match(ts,/locateButton.addEventListener\('click',/);
  assert.match(ts,/navigator\.geolocation\.getCurrentPosition\(/);
  assert.match(ts,/enableHighAccuracy:\s*true/);
  assert.match(ts,/setPin\(latitude, longitude\)/);
});
test('GPS poco preciso no coloca automaticamente una casa',()=>{
  assert.match(ts,/accuracy > 100/);
  assert.match(ts,/No se colocó un marcador automático/);
});
test('se pueden corregir marcadores y consultar los permisos',()=>{
  assert.match(ts,/reason\.code === 1/);
  assert.match(ts,/marker\.on\('dragend'/);
});
test('se integra al tutorial y responde en pantallas moviles',()=>{
  assert.equal(REGISTRATION_TOUR_STEPS[3].targetId,'tour-registration-location');
  assert.match(REGISTRATION_TOUR_STEPS[3].description,/Usar mi ubicación/);
  assert.match(css,/registration-location-button\{width:100%/);
});
