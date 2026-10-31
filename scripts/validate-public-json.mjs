import fs from 'node:fs';
const filename = new URL('../public/puntos.json', import.meta.url);
let data;
try { data = JSON.parse(fs.readFileSync(filename, 'utf8')); }
catch (error) { console.error('No se puede leer puntos.json', error); process.exit(1); }
if (!Array.isArray(data) || data.length > 500) {
  console.error('puntos.json debe ser un arreglo de hasta 500 puntos.'); process.exit(1);
}
const allowed = new Set(['id','nombre','direccion','horario','lat','lng','tipo']);
const ids = new Set();
for (const [index, point] of data.entries()) {
  if (!point || Array.isArray(point) || typeof point !== 'object') throw new Error('Punto ' + index + ' inválido.');
  for (const key of Object.keys(point)) {
    if (!allowed.has(key)) throw new Error('Campo inesperado ' + key + ' en punto ' + index + '. Evita subir datos personales.');
  }
  for (const key of ['id','nombre','direccion','horario']) {
    if (typeof point[key] !== 'string') throw new Error('Campo ' + key + ' inválido en punto ' + index);
  }
  if (!point.id.trim() || !point.nombre.trim() || !point.direccion.trim() || point.id.length > 110 || point.nombre.length > 90 || point.direccion.length > 180 || point.horario.length > 90) throw new Error('Campos incompletos/largos en ' + index);
  if ((point.tipo !== 'casa' && point.tipo !== 'local') || !Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) throw new Error('Tipo o coordenadas inválidas en ' + index);
  if (ids.has(point.id)) throw new Error('ID duplicado ' + point.id);
  ids.add(point.id);
}
console.log('puntos.json válido: ' + data.length + ' punto(s). No se encontraron campos privados.');
