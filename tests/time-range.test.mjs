import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDeliveryHours } from '../src/time-range.ts';

test('acepta una hora iOS válida en formato de 24 horas', () => {
  assert.deepEqual(validateDeliveryHours('17:39','21:45'), { ok:true,hours:'17:39 a 21:45' });
});
test('acepta ceros y minutos correctos', () => {
  assert.deepEqual(validateDeliveryHours('00:00','00:01'), { ok:true,hours:'00:00 a 00:01' });
});
test('no confunde texto de validación con barras invertidas', () => {
  assert.deepEqual(validateDeliveryHours('18:00','21:00'), { ok:true,hours:'18:00 a 21:00' });
});
test('rechaza inicio vacío y hora incompleta', () => {
  assert.deepEqual(validateDeliveryHours('','21:00'), { ok:false,reason:'start' });
  assert.deepEqual(validateDeliveryHours('8:00','21:00'), { ok:false,reason:'start' });
});
test('rechaza hora final inválida', () => {
  assert.deepEqual(validateDeliveryHours('17:39','25:01'), { ok:false,reason:'end' });
  assert.deepEqual(validateDeliveryHours('17:39',''), { ok:false,reason:'end' });
});
test('explica el error real si fin es anterior o igual a inicio', () => {
  assert.deepEqual(validateDeliveryHours('17:39','04:45'), { ok:false,reason:'order' });
  assert.deepEqual(validateDeliveryHours('17:39','17:39'), { ok:false,reason:'order' });
});
