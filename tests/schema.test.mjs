import test from 'node:test';
import assert from 'node:assert/strict';
import { readPublicPoint, readSubmission, likelyDuplicate, inRosarioArea } from '../src/data.ts';

const point = {
  id: 'test-01', nombre: 'Casa de los dulces', direccion: 'Calle Hidalgo',
  horario: '6 pm', lat: 22.9921, lng: -105.8573, tipo: 'casa',
};

test('La lista pública excluye de manera explícita campos personales inesperados', () => {
  const result = readPublicPoint({ ...point, solicitante: { nombre: 'Confidencial' }, telefono: '1234' });
  assert.ok(result);
  assert.deepEqual(Object.keys(result).sort(), ['id','nombre','direccion','horario','lat','lng','tipo'].sort());
  assert.equal('telefono' in result, false);
});
test('Una solicitud sin consentimiento o identidad no es importable', () => {
  assert.equal(readSubmission({ tipo: 'solicitud_dulceruta', version: 1, solicitante: { nombre: 'A', apellido: 'B' }, punto: point, consentimientoUbicacion: false }), null);
  assert.equal(readSubmission({ tipo: 'solicitud_dulceruta', version: 1, punto: point, consentimientoUbicacion: true }), null);
});
test('El sistema no acepta coordenadas inválidas ni campos maliciosamente largos', () => {
  assert.equal(readPublicPoint({ ...point, lat: 910 }), null);
  assert.equal(readPublicPoint({ ...point, nombre: 'X'.repeat(91) }), null);
  assert.equal(readPublicPoint({ ...point, lng: 'no-numero' }), null);
});
test('Se detectan duplicados por ID y por nombre/geografía', () => {
  assert.equal(likelyDuplicate({ ...point, id: 'otro' }, [point]), true);
  assert.equal(likelyDuplicate({ ...point, id: 'otro', lat: 23.1 }, [point]), false);
});
test('Detecta ubicaciones claramente fuera del área del evento', () => {
  assert.equal(inRosarioArea(point), true);
  assert.equal(inRosarioArea({ lat: 19.4326, lng: -99.1332 }), false);
});
