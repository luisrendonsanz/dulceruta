import './style.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ROOT, ROSARIO, getElement, registerPwa, textElement, walkingDirections } from './common';
import { distanceMeters, readPublicPoint, type PublicPoint } from './data';

const map = L.map('map', { zoomControl: false }).setView([ROSARIO.lat, ROSARIO.lng], 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);

let points: PublicPoint[] = [];
let selected: string | null = null;
let currentLocation: L.LatLng | null = null;
let currentMarker: L.Marker | null = null;
const markers = new Map<string, L.Marker>();
let installEvent: (Event & { prompt(): Promise<void> }) | null = null;
let toastTimer: number | undefined;
const markerIcon = (active = false) => L.divIcon({
  className: '',
  html: '<div class="pin' + (active ? ' active' : '') + '"><span>🍬</span></div>',
  iconSize: [40, 40], iconAnchor: [20, 36],
});
const blueIcon = L.divIcon({ className: '', html: '<div class="user-marker"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });

function alertUser(message: string) {
  const node = getElement('message');
  node.textContent = message;
  node.hidden = false;
  if (toastTimer !== undefined) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => node.hidden = true, 4000);
}

function selectPoint(p: PublicPoint) {
  selected = p.id;
  markers.forEach((marker, id) => marker.setIcon(markerIcon(id === selected)));
  map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15), { duration: .45 });
  const details = getElement('place-details');
  const titleRow = textElement('div', 'detail-top', '');
  titleRow.append(textElement('h3', '', p.nombre));
  const close = document.createElement('button');
  close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Cerrar detalle');
  close.addEventListener('click', () => {
    details.hidden = true;
    selected = null;
    markers.forEach(marker => marker.setIcon(markerIcon()));
    render();
  });
  titleRow.append(close);
  const address = textElement('p', '', p.direccion);
  const hours = textElement('div', 'hours', '◷ ' + (p.horario || 'Horario por confirmar'));
  const link = document.createElement('a');
  link.href = walkingDirections(p.lat, p.lng);
  link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'btn btn-orange full';
  link.textContent = '↗ Cómo llegar a pie';
  const report = document.createElement('a');
  report.href = ROOT + 'reportar.html?p=' + encodeURIComponent(p.id);
  report.textContent = 'Reportar esta ubicación';
  report.className = 'place-report-link';
  details.replaceChildren(titleRow, address, hours, link, report);
  details.hidden = false;
  render();
}

function render() {
  const search = getElement<HTMLInputElement>('search').value.trim().toLocaleLowerCase('es');
  const filtered = points.filter(p => [p.nombre, p.direccion].some(s => s.toLocaleLowerCase('es').includes(search)));
  if (currentLocation) filtered.sort((a, b) =>
    distanceMeters(a, currentLocation!) - distanceMeters(b, currentLocation!));
  getElement('counter').textContent = String(filtered.length);
  getElement('list-caption').textContent = search ? filtered.length + ' resultado(s)' :
    points.length ? 'Toca un punto para ver la ruta' : 'Todavía no hay puntos publicados';
  const list = getElement('places');
  list.replaceChildren();
  for (const [id, marker] of markers) {
    if (filtered.some(p => p.id === id)) marker.addTo(map);
    else map.removeLayer(marker);
  }
  if (!filtered.length) {
    const state = textElement('div', 'empty', '');
    state.append(textElement('div', 'empty-icon', '✦'));
    state.append(textElement('strong', '', points.length ? 'No encontramos lugares' : 'Próximamente, ¡dulces!'));
    state.append(textElement('p', '', points.length ? 'Prueba con otro nombre o dirección.' :
      'Los lugares aparecerán aquí cuando el organizador apruebe las solicitudes.'));
    list.append(state);
    return;
  }
  for (const point of filtered) {
    const card = document.createElement('button');
    card.className = 'place-card' + (selected === point.id ? ' active' : '');
    card.type = 'button';
    card.append(textElement('strong', '', '🍬 ' + point.nombre));
    card.append(textElement('small', '', point.direccion));
    card.append(textElement('em', '', point.horario || 'Horario por confirmar'));
    if (currentLocation) {
      const m = distanceMeters(point, currentLocation);
      card.append(textElement('small', '', m < 1000 ? Math.round(m) + ' m en línea recta' : (m / 1000).toFixed(1) + ' km en línea recta'));
    }
    card.addEventListener('click', () => selectPoint(point));
    list.append(card);
  }
}

async function loadPoints() {
  try {
    const live = await fetch(ROOT + 'api/puntos', { cache: 'no-store' });
    let raw: unknown;
    if (live.ok && live.headers.get('content-type')?.includes('application/json')) {
      raw = await live.json();
    } else if (live.status === 404 || (live.ok && !live.headers.get('content-type')?.includes('application/json'))) {
      // GitHub Pages no ejecuta Functions; usa el JSON estático allí.
      const fallback = await fetch(ROOT + 'puntos.json', { cache: 'no-store' });
      if (!fallback.ok) throw new Error('No se pudo cargar el mapa');
      raw = await fallback.json();
    } else {
      // D1 conectada pero caída: NO mostrar lugares potencialmente retirados.
      throw new Error('D1 temporalmente no disponible');
    }
    if (!Array.isArray(raw)) throw new Error('El JSON público debe ser un arreglo');
    const ids = new Set<string>();
    points = raw.flatMap(value => {
      const p = readPublicPoint(value);
      if (!p || ids.has(p.id)) return [];
      ids.add(p.id);
      return [p];
    });
    for (const p of points) {
      const marker = L.marker([p.lat, p.lng], { icon: markerIcon(), title: p.nombre }).addTo(map);
      marker.on('click', () => selectPoint(p));
      markers.set(p.id, marker);
    }
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15);
    if (points.length > 1) map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
  } catch {
    alertUser('No se pudo cargar la lista de puntos; revisa tu conexión.');
  }
  render();
}

getElement<HTMLInputElement>('search').addEventListener('input', render);
getElement('locate').addEventListener('click', () => {
  if (!navigator.geolocation) { alertUser('Tu navegador no admite ubicación GPS.'); return; }
  const button = getElement<HTMLButtonElement>('locate');
  button.disabled = true; button.textContent = 'Localizando...';
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    currentLocation = L.latLng(coords.latitude, coords.longitude);
    if (currentMarker) map.removeLayer(currentMarker);
    currentMarker = L.marker(currentLocation, { icon: blueIcon, title: 'Tu ubicación' }).addTo(map);
    map.flyTo(currentLocation, 15);
    button.disabled = false; button.textContent = '◎ Mi ubicación';
    alertUser('Ubicación encontrada; no se guarda ni comparte.');
    render();
  }, error => {
    button.disabled = false; button.textContent = '◎ Mi ubicación';
    alertUser(error.code === 1 ? 'Permite el acceso a la ubicación en tu navegador.' : 'No se pudo obtener tu ubicación.');
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
});

const steps: Record<'ios' | 'android', string[]> = {
  ios: ['Abre DulceRuta desde Safari.', 'Toca Compartir en la barra del navegador.', 'Selecciona Agregar a inicio.', 'Confirma Agregar para tener la app en tu pantalla.'],
  android: ['Abre DulceRuta desde Chrome.', 'Abre el menú de tres puntos.', 'Elige Instalar app o Agregar a pantalla principal.', 'Confirma la instalación.'],
};
function setPlatform(platform: 'ios' | 'android') {
  getElement('ios').classList.toggle('active', platform === 'ios');
  getElement('android').classList.toggle('active', platform === 'android');
  const ol = getElement('install-steps');
  ol.replaceChildren(...steps[platform].map(step => textElement('li', '', step)));
}
function showGuide() {
  setPlatform(/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'android');
  getElement('install-modal').hidden = false;
  getElement<HTMLButtonElement>('close-guide').focus();
}
function closeGuide() { getElement('install-modal').hidden = true; }
getElement('install').addEventListener('click', async () => {
  if (installEvent) { await installEvent.prompt(); installEvent = null; }
  else showGuide();
});
getElement('help').addEventListener('click', showGuide);
getElement('ios').addEventListener('click', () => setPlatform('ios'));
getElement('android').addEventListener('click', () => setPlatform('android'));
getElement('close-guide').addEventListener('click', closeGuide);
getElement('done').addEventListener('click', closeGuide);
getElement('install-modal').addEventListener('click', event => {
  if (event.target === getElement('install-modal')) closeGuide();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeGuide();
});
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installEvent = event as Event & { prompt(): Promise<void> };
});
registerPwa();
void loadPoints();
