import './style.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getElement, ROSARIO, registerPwa, downloadJson } from './common';
import type { ParticipantSubmission, PlaceKind } from './data';
import { validateDeliveryHours } from './time-range';
import { initRegistrationTour } from './register-tour';

const map = L.map('registration-map').setView([ROSARIO.lat, ROSARIO.lng], 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);
const icon = L.divIcon({ className: '', html: '<div class="pin active"><span>🍬</span></div>', iconSize: [40, 40], iconAnchor: [20, 36] });
let marker: L.Marker | null = null;
let selectedPosition: L.LatLng | null = null;
function setPin(lat: number, lng: number) {
  selectedPosition = L.latLng(lat, lng);
  if (!marker) {
    marker = L.marker(selectedPosition, { draggable: true, icon }).addTo(map);
    marker.on('dragend', () => { const p = marker!.getLatLng(); setPin(p.lat, p.lng); });
  } else marker.setLatLng(selectedPosition);
  getElement('pin-status').textContent = '✓ Ubicación marcada: ' + lat.toFixed(6) + ', ' + lng.toFixed(6);
  getElement('pin-status').parentElement?.classList.add('confirmed');
  getElement('remove-pin').hidden = false;
}
map.on('click', event => setPin(event.latlng.lat, event.latlng.lng));

const locateButton = getElement<HTMLButtonElement>('register-geolocate');
const locateStatus = getElement<HTMLElement>('register-geolocate-status');
function locationFeedback(message: string, isError = false) {
  locateStatus.hidden = false;
  locateStatus.textContent = message;
  locateStatus.classList.toggle('is-error', isError);
}
locateButton.addEventListener('click', () => {
  if (!navigator.geolocation) {
    locationFeedback('Este navegador no admite ubicación. Marca tu casa tocando el mapa.', true);
    return;
  }
  locateButton.disabled = true;
  locateButton.textContent = 'Buscando ubicación…';
  locationFeedback('Solicitando permiso para obtener tu ubicación…');
  const reset = () => {
    locateButton.disabled = false;
    locateButton.textContent = '◎ Usar mi ubicación';
  };
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      reset();
      const latitude = coords.latitude;
      const longitude = coords.longitude;
      const accuracy = coords.accuracy;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        locationFeedback('No se pudo obtener una posición válida. Toca el mapa para marcar tu casa.', true);
        return;
      }
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), 17));
      if (Number.isFinite(accuracy) && accuracy > 100) {
        locationFeedback('Ubicación aproximada (precisión ±' + Math.round(accuracy) + ' m). Acércate al mapa y toca la ubicación exacta de tu casa. No se colocó un marcador automático.', true);
        return;
      }
      setPin(latitude, longitude);
      locationFeedback('Ubicación encontrada. Confirma que el marcador esté en tu casa o local; puedes arrastrarlo para corregirlo. La ubicación solo se incluirá en el JSON si decides enviarlo.');
    },
    reason => {
      reset();
      const message = reason.code === 1
        ? 'No se concedió permiso de ubicación. Actívalo en Safari o marca tu casa tocando el mapa.'
        : reason.code === 3
          ? 'La búsqueda de ubicación tardó demasiado. Puedes reintentar o tocar tu casa en el mapa.'
          : 'No se pudo obtener tu ubicación. Comprueba el GPS o selecciona tu casa directamente en el mapa.';
      locationFeedback(message, true);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
  );
});
getElement('remove-pin').addEventListener('click', () => {
  if (marker) map.removeLayer(marker);
  marker = null; selectedPosition = null;
  getElement('pin-status').textContent = 'Toca el mapa para colocar un marcador.';
  getElement('pin-status').parentElement?.classList.remove('confirmed');
  getElement('remove-pin').hidden = true;
});
const val = (id: string) => getElement<HTMLInputElement>(id).value.trim();
function error(message: string, focus?: string) {
  const box = getElement('form-error'); box.hidden = false; box.textContent = message;
  if (focus) getElement<HTMLElement>(focus).focus();
  else box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function createSubmission(): ParticipantSubmission | null {
  getElement('form-error').hidden = true;
  const nombre = val('name'); const apellido = val('surname');
  const tipo: PlaceKind = val('kind') === 'local' ? 'local' : 'casa';
  const place = val('place-name'); const reference = val('reference');
  const start = val('hours-start'); const end = val('hours-end');
  const range = validateDeliveryHours(start, end);
  if (!range.ok) {
    const messages = {
      start: 'Selecciona una hora de inicio válida.',
      end: 'Selecciona una hora de finalización válida.',
      order: 'La hora de finalización debe ser posterior al inicio (el mismo día).',
    };
    error(messages[range.reason], range.reason === 'start' ? 'hours-start' : 'hours-end');
    return null;
  }
  const hours = range.hours;
  if (nombre.length < 2) { error('Escribe un nombre de al menos 2 letras.', 'name'); return null; }
  if (apellido.length < 2) { error('Escribe un apellido de al menos 2 letras.', 'surname'); return null; }
  if (tipo === 'local' && !place) { error('Escribe el nombre del negocio o local.', 'place-name'); return null; }
  if (!selectedPosition) { error('Toca el mapa para colocar la ubicación de la casa o local.'); return null; }
  if (!getElement<HTMLInputElement>('consent').checked) { error('Debes confirmar que tienes autorización para registrar ese lugar.', 'consent'); return null; }
  return {
    tipo: 'solicitud_dulceruta', version: 1,
    solicitante: { nombre, apellido },
    punto: {
      id: crypto.randomUUID(),
      nombre: place || 'Casa participante',
      direccion: reference || 'Punto participante en El Rosario',
      horario: hours,
      lat: Number(selectedPosition.lat.toFixed(6)),
      lng: Number(selectedPosition.lng.toFixed(6)), tipo,
    },
    consentimientoUbicacion: true,
    fechaSolicitud: new Date().toISOString(),
  };
}
function filename(submission: ParticipantSubmission) {
  const slug = (submission.solicitante.nombre + '-' + submission.solicitante.apellido)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  return 'dulceruta-solicitud-' + slug + '.json';
}
function feedback(message: string) { const node = getElement('form-success'); node.hidden = false; node.textContent = message; }
getElement<HTMLFormElement>('register-form').addEventListener('submit', event => {
  event.preventDefault();
  const submission = createSubmission(); if (!submission) return;
  const name = filename(submission);
  downloadJson(submission, name);
  feedback('Descarga preparada: ' + name + '. Ahora envíalo por WhatsApp como documento al organizador. Aún NO está publicado en el mapa.');
});
getElement('share-file').addEventListener('click', async () => {
  const submission = createSubmission(); if (!submission) return;
  const name = filename(submission);
  const file = new File([JSON.stringify(submission, null, 2) + '\n'], name, { type: 'application/json' });
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Solicitud DulceRuta', text: 'Te comparto mi registro de DulceRuta.', files: [file] });
      feedback('Se abrió el menú de compartir. Confirma dentro de WhatsApp que el documento llegó al organizador.');
    } else {
      downloadJson(submission, name);
      feedback('Se preparó la descarga. Entra a WhatsApp y adjunta el JSON como documento desde Descargas o Archivos.');
    }
  } catch (reason) {
    if ((reason as Error).name === 'AbortError') feedback('Cancelaste el envío; puedes descargar el JSON e intentarlo de nuevo.');
    else { downloadJson(submission, name); feedback('No se pudo compartir. Se preparó el JSON para enviarlo manualmente.'); }
  }
});
initRegistrationTour();
registerPwa();
