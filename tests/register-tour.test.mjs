import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REGISTRATION_TOUR_STEPS, TOUR_HIDDEN_VALUE, shouldShowRegistrationTour } from '../src/register-tour-data.ts';

test('abre automaticamente sin preferencia previa',()=>{
  assert.equal(shouldShowRegistrationTour(null), true);
  assert.equal(shouldShowRegistrationTour(''),true);
});
test('no vuelve a mostrarse si se guarda la casilla',()=>{
  assert.equal(shouldShowRegistrationTour(TOUR_HIDDEN_VALUE),false);
});
test('incluye todos los pasos del registro y permite descargar/compartir',()=>{
  assert.equal(REGISTRATION_TOUR_STEPS.length,6);
  assert.match(REGISTRATION_TOUR_STEPS.at(-1).description,/WhatsApp/);
  assert.match(REGISTRATION_TOUR_STEPS.at(-1).description,/aprobada/);
});
test('los campos destacados existen en el formulario',()=>{
  const html=readFileSync(new URL('../registro.html',import.meta.url),'utf8');
  const targets=new Set(REGISTRATION_TOUR_STEPS.map(step=>step.targetId));
  assert.equal(targets.size,REGISTRATION_TOUR_STEPS.length);
  for (const id of targets) assert.ok(html.includes('id="'+id+'"'),id+' no existe');
});
test('controles de accesibilidad y omision estan disponibles',()=>{
  const html=readFileSync(new URL('../registro.html',import.meta.url),'utf8');
  for(const id of ['registration-tutorial-skip','registration-tutorial-next','registration-tutorial-back','registration-tutorial-remember','open-register-tour']){
    assert.ok(html.includes('id="'+id+'"'),id+' no existe');
  }
  assert.match(html,/aria-modal="true"/);
  assert.match(html,/No volver a mostrar este tutorial/);
});
