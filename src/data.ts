export type PlaceKind = 'casa' | 'local';
export interface PublicPoint {
  id: string;
  nombre: string;
  direccion: string;
  horario: string;
  lat: number;
  lng: number;
  tipo: PlaceKind;
}
export interface ParticipantSubmission {
  tipo: 'solicitud_dulceruta';
  version: 1;
  solicitante: { nombre: string; apellido: string };
  punto: PublicPoint;
  consentimientoUbicacion: true;
  consentimientoPrivacidad?: true;
  fechaSolicitud: string;
}
const object = (val: unknown): val is Record<string, unknown> => typeof val === 'object' && val !== null && !Array.isArray(val);
const str = (val: unknown, limit: number): val is string => typeof val === 'string' && val.trim().length > 0 && val.length <= limit;
const optionalString = (val: unknown, limit: number): val is string => typeof val === 'string' && val.length <= limit;

export function readPublicPoint(value: unknown): PublicPoint | null {
  if (!object(value)) return null;
  if (!str(value.id, 110) || !str(value.nombre, 90) || !str(value.direccion, 180)) return null;
  if (!optionalString(value.horario, 90)) return null;
  if (value.tipo !== 'casa' && value.tipo !== 'local') return null;
  const lat = value.lat;
  const lng = value.lng;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
      typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180) return null;
  // Lista blanca explícita: NUNCA se copian campos extra o datos personales.
  return {
    id: value.id.trim(), nombre: value.nombre.trim(),
    direccion: value.direccion.trim(), horario: value.horario.trim(),
    lat, lng, tipo: value.tipo,
  };
}

export function readSubmission(value: unknown): { point: PublicPoint; contact: string } | null {
  if (!object(value) || value.tipo !== 'solicitud_dulceruta' || value.version !== 1 || value.consentimientoUbicacion !== true) return null;
  const who = value.solicitante;
  if (!object(who) || !str(who.nombre, 70) || !str(who.apellido, 90)) return null;
  const point = readPublicPoint(value.punto);
  if (!point) return null;
  return { point, contact: who.nombre.trim() + ' ' + who.apellido.trim() };
}

export function distanceMeters(a: {lat:number;lng:number}, b:{lat:number;lng:number}): number {
  const r=6371000, p1=a.lat*Math.PI/180, p2=b.lat*Math.PI/180;
  const dp=(b.lat-a.lat)*Math.PI/180, dl=(b.lng-a.lng)*Math.PI/180;
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*r*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function likelyDuplicate(point:PublicPoint, existing:PublicPoint[]): boolean {
  const n=point.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  return existing.some(e=>e.id===point.id ||
    (distanceMeters(point,e)<25 && e.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()===n));
}
export function inRosarioArea(point:{lat:number;lng:number}): boolean {
  return distanceMeters(point,{lat:22.9921,lng:-105.8573}) < 45000;
}
