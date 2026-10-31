/** Horarios entregados por <input type="time">: siempre HH:mm en formato de 24 horas. */
const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;

export type DeliveryHoursResult =
  | { ok: true; hours: string }
  | { ok: false; reason: 'start' | 'end' | 'order' };

export function validateDeliveryHours(start: string, end: string): DeliveryHoursResult {
  if (!validTime.test(start)) return { ok: false, reason: 'start' };
  if (!validTime.test(end)) return { ok: false, reason: 'end' };
  // HH:mm zero-padded: string comparison is equivalent to time comparison.
  if (end <= start) return { ok: false, reason: 'order' };
  return { ok: true, hours: start + ' a ' + end };
}
