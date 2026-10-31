import './style.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ROOT, ROSARIO, downloadJson, getElement, textElement } from './common';
import { inRosarioArea, likelyDuplicate, readPublicPoint, readSubmission, type PlaceKind, type PublicPoint } from './data';

const DRAFT_KEY = 'dulceruta-gh-draft-v1';
const MAX_FILES = 100;
const MAX_BYTES = 64 * 1024;
const MAX_POINTS = 500;
const map = L.map('editor-map').setView([ROSARIO.lat, ROSARIO.lng], 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);
const candyIcon = L.divIcon({ className: '', html: '<div class="pin"><span>🍬</span></div>', iconSize: [40, 40], iconAnchor: [20, 36] });
let pointMarker: L.Marker | null = null;
let selectedPosition: L.LatLng | null = null;
let editingId: string | null = null;
let published: PublicPoint[] = [];
let revision: number | null = null;
let draft: PublicPoint[] = [];
type Pending = { point: PublicPoint; contact: string | null; source: string; checked: boolean };
let pending: Pending[] = [];

/** Mapa independiente: nunca escribe en D1 ni muestra datos personales del solicitante. */
const previewMap = L.map('preview-map').setView([ROSARIO.lat, ROSARIO.lng], 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(previewMap);
const previewLayer = L.layerGroup().addTo(previewMap);
function previewEntries(): { point: PublicPoint; status: 'pending' | 'draft' }[] {
  return [
    ...pending.map(({ point }) => ({ point, status: 'pending' as const })),
    ...draft.map(point => ({ point, status: 'draft' as const })),
  ];
}
function focusPreview(): void {
  previewMap.invalidateSize();
  const items = previewEntries();
  if (!items.length) {
    previewMap.setView([ROSARIO.lat, ROSARIO.lng], 14);
    return;
  }
  const bounds = L.latLngBounds(items.map(({ point }) => [point.lat, point.lng] as [number, number]));
  previewMap.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 });
}
function drawPreview(): void {
  const items = previewEntries();
  previewLayer.clearLayers();
  getElement('preview-summary').textContent =
    pending.length + ' por revisar · ' + draft.length + ' en borrador';
  getElement('preview-empty').hidden = items.length !== 0;
  getElement<HTMLButtonElement>('preview-all').disabled = items.length === 0;

  for (const { point, status } of items) {
    const colorClass = status === 'pending' ? 'admin-preview-pin--pending' : 'admin-preview-pin--draft';
    const icon = L.divIcon({
      className: '',
      html: '<div class="pin ' + colorClass + '"><span>🍬</span></div>',
      iconSize: [40, 40], iconAnchor: [20, 36],
    });
    const marker = L.marker([point.lat, point.lng], { icon, title: point.nombre });
    const popup = textElement('div', 'admin-preview-popup', '');
    popup.append(
      textElement('strong', '', point.nombre),
      textElement('span', '', status === 'pending' ? 'Pendiente de revisión' : 'En borrador, sin publicar cambios'),
      textElement('p', '', point.direccion),
      textElement('small', '', 'Horario: ' + (point.horario || 'Sin horario')),
    );
    if (!inRosarioArea(point)) popup.append(textElement('small', 'admin-preview-warning', 'Verifica: ubicación lejos de El Rosario.'));
    marker.bindPopup(popup, { maxWidth: 270 });
    marker.addTo(previewLayer);
  }
  window.requestAnimationFrame(() => focusPreview());
}
getElement('preview-all').addEventListener('click', focusPreview);

let searchTimer: number | undefined;
let searchAbort: AbortController | null = null;
let lastSearchTime = 0;
type Report = {id:string;punto_id:string;motivo:string;detalle:string;creado:string};
let reports: Report[] = [];
const reportReasons:Record<string,string> = {
  sin_permiso:'Domicilio publicado sin permiso',
  solicitar_retiro:'Solicitud de retirada',
  ubicacion_incorrecta:'Ubicación incorrecta',
  horario_incorrecto:'Horario incorrecto',
  otro:'Otra incidencia',
};
function clearReportElement() {
  const list=getElement('reports-list');list.replaceChildren();return list;
}
function renderReports() {
  const list=clearReportElement();
  getElement('reports-count').textContent=reports.length+' reporte(s) pendiente(s)';
  if(!reports.length){list.append(textElement('p','muted','No hay reportes pendientes.'));return;}
  for(const r of reports){
    const place=published.find(p=>p.id===r.punto_id);
    const item=textElement('div','admin-report','');
    item.append(textElement('strong','',reportReasons[r.motivo]||'Reporte de ubicación'));
    item.append(textElement('p','',place?place.nombre+' · '+place.direccion:'La ubicación ya no figura en el mapa público'));
    if(r.detalle)item.append(textElement('p','',r.detalle));
    item.append(textElement('small','',r.creado+' · ID '+r.punto_id));
    const actions=textElement('div','admin-report-actions','');
    if(place){
      const retire=document.createElement('button');
      retire.type='button';retire.className='btn btn-outline danger';retire.textContent='Retirar esta casa del mapa público';
      retire.addEventListener('click',()=>void retireReported(r.punto_id));
      actions.append(retire);
    }
    const resolve=document.createElement('button');
    resolve.type='button';resolve.className='btn btn-outline';resolve.textContent='Marcar atendido';
    resolve.addEventListener('click',()=>void resolveReport(r.id));
    actions.append(resolve);item.append(actions);list.append(item);
  }
}
async function loadReports(){
 try{
  const response=await fetch(ROOT+'api/admin/reportes',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const result:{reportes?:Report[]}=await response.json();
  reports=Array.isArray(result.reportes)?result.reportes:[];
  renderReports();
 }catch{getElement('reports-count').textContent='No se pudieron cargar los reportes. Revisa tu sesión y vuelve a intentar.';}
}
async function resolveReport(id:string){
 if(!confirm('¿Ya verificaste y atendiste este reporte?'))return;
 try{
  const response=await fetch(ROOT+'api/admin/reportes/resolver',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
  if(!response.ok)throw Error('HTTP '+response.status);
  await loadReports();
  setMessage('Reporte marcado como atendido.');
 }catch{setMessage('No se pudo actualizar el reporte.');}
}
async function retirePublicPoints(ids:string[]){
 if(revision===null)throw Error('No se pudo verificar la versión publicada.');
 const next=published.filter(p=>!ids.includes(p.id));
 const response=await fetch(ROOT+'api/admin/puntos',{
  method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({points:next,revision}),
 });
 if(response.status===409)throw Error('Otro dispositivo cambió el mapa. Recarga y vuelve a verificar.');
 if(!response.ok)throw Error('Error HTTP '+response.status);
 const saved:{revision?:number}=await response.json();
 if(typeof saved.revision!=='number')throw Error('Respuesta D1 inválida');
 revision=saved.revision;published=next;
 draft=draft.filter(p=>!ids.includes(p.id));saveDraft();
 renderReports();
}
async function retireReported(id:string){
 const place=published.find(p=>p.id===id);
 if(!place)return;
 if(!confirm('¿RETIRAR del mapa público «'+place.nombre+'» inmediatamente? Esta acción modifica D1 y no solo el borrador.'))return;
 try{await retirePublicPoints([id]);setMessage('Casa retirada del mapa público. Comprueba el mapa. Marca el reporte atendido tras verificarlo.');}
 catch(e){setMessage(e instanceof Error?e.message:'No se pudo retirar la ubicación.');}
}
getElement('reports-refresh').addEventListener('click',()=>void loadReports());
getElement('retire-event').addEventListener('click',async()=>{
 if(!published.length){setMessage('No hay casas públicas por retirar.');return;}
 if(!confirm('¿Finalizó el evento? Esto RETIRARÁ TODAS las casas del mapa público y actualizará D1 inmediatamente.'))return;
 if(!confirm('Confirma definitivamente que quieres vaciar todo el mapa público.'))return;
 try{await retirePublicPoints(published.map(p=>p.id));setMessage('Se retiraron todas las ubicaciones públicas. Verifica la página del mapa.');}
 catch(e){setMessage(e instanceof Error?e.message:'No se pudieron retirar las ubicaciones.');}
});
const val = (id: string) => getElement<HTMLInputElement>(id).value.trim();
const setMessage = (value: string) => getElement('import-result').textContent = value;

function placeMarker(lat: number, lng: number): void {
  selectedPosition = L.latLng(lat, lng);
  if (!pointMarker) {
    pointMarker = L.marker(selectedPosition, { icon: candyIcon, draggable: true }).addTo(map);
    pointMarker.on('dragend', () => {
      const pos = pointMarker!.getLatLng();
      placeMarker(pos.lat, pos.lng);
    });
  } else pointMarker.setLatLng(selectedPosition);
  getElement('edit-coordinate').textContent = '✓ Ubicación: ' + lat.toFixed(6) + ', ' + lng.toFixed(6);
  getElement('edit-coordinate').classList.add('confirmed');
}
map.on('click', event => placeMarker(event.latlng.lat, event.latlng.lng));

function saveDraft(): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }
  catch { setMessage('El navegador no pudo guardar el borrador. Descarga un respaldo cuanto antes.'); }
  drawDraft();
}
function drawDraft(): void {
  const list = getElement('draft-list'); list.replaceChildren();
  getElement('draft-counter').textContent = draft.length + ' punto(s) en el borrador local';
  if (!draft.length) {
    list.append(textElement('div', 'empty', 'Todavía no tienes puntos en el borrador.'));
    drawPreview();
    return;
  }
  for (const p of draft) {
    const row = textElement('div', 'draft-item', '');
    const caption = textElement('div', '', '');
    caption.append(textElement('strong', '', p.nombre));
    caption.append(textElement('small', '', p.direccion + ' · ' + p.lat.toFixed(6) + ', ' + p.lng.toFixed(6)));
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Editar';
    edit.addEventListener('click', () => {
      editingId = p.id;
      getElement<HTMLInputElement>('edit-name').value = p.nombre;
      getElement<HTMLInputElement>('edit-ref').value = p.direccion;
      getElement<HTMLInputElement>('edit-hours').value = p.horario;
      getElement<HTMLSelectElement>('edit-kind').value = p.tipo;
      placeMarker(p.lat, p.lng);
      map.flyTo([p.lat, p.lng], 16);
      getElement('save-point').textContent = 'Guardar cambios';
      getElement('cancel-edit').hidden = false;
      getElement('edit-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Eliminar'; remove.className = 'danger';
    remove.addEventListener('click', () => {
      if (!confirm('¿Eliminar ' + p.nombre + ' del borrador?')) return;
      draft = draft.filter(x => x.id !== p.id);
      saveDraft();
    });
    row.append(caption, edit, remove); list.append(row);
  }
  drawPreview();
}
function resetForm(): void {
  editingId = null;
  for (const id of ['edit-name', 'edit-ref', 'edit-hours', 'address-search']) getElement<HTMLInputElement>(id).value = '';
  getElement<HTMLSelectElement>('edit-kind').value = 'casa';
  getElement('save-point').textContent = '+ Agregar punto al borrador';
  getElement('cancel-edit').hidden = true;
  getElement('edit-coordinate').textContent = 'Toca el mapa para colocar el marcador.';
  getElement('edit-coordinate').classList.remove('confirmed');
  if (pointMarker) map.removeLayer(pointMarker);
  pointMarker = null; selectedPosition = null;
  clearSearch();
}
getElement('cancel-edit').addEventListener('click', resetForm);
getElement('save-point').addEventListener('click', () => {
  const nombre = val('edit-name'), referencia = val('edit-ref');
  const horario = val('edit-hours');
  const tipo: PlaceKind = getElement<HTMLSelectElement>('edit-kind').value === 'local' ? 'local' : 'casa';
  if (!nombre || nombre.length > 90 || !referencia || referencia.length > 180 || horario.length > 90) {
    setMessage('Completa un nombre público y referencia válidos.'); return;
  }
  if (!selectedPosition) { setMessage('Primero selecciona la ubicación en el mapa.'); return; }
  if (draft.length >= MAX_POINTS && !editingId) { setMessage('El borrador alcanzó el límite de 500 puntos.'); return; }
  const p: PublicPoint = {
    id: editingId || crypto.randomUUID(), nombre, direccion: referencia, horario, tipo,
    lat: Number(selectedPosition.lat.toFixed(6)), lng: Number(selectedPosition.lng.toFixed(6)),
  };
  if (likelyDuplicate(p, draft.filter(x => x.id !== editingId))) {
    setMessage('Posible duplicado detectado: revisa la lista antes de guardar.'); return;
  }
  if (!inRosarioArea(p) && !confirm('El marcador está lejos de El Rosario. ¿Deseas guardarlo de todos modos?')) return;
  if (editingId) draft = draft.map(x => x.id === editingId ? p : x);
  else draft.push(p);
  saveDraft(); resetForm(); setMessage('Punto guardado en tu borrador local.');
});

function drawPending(): void {
  const section = getElement('review'); section.hidden = !pending.length;
  const list = getElement('reviews'); list.replaceChildren();
  getElement('review-count').textContent = pending.length + ' lugar(es) por revisar';
  for (const [index, item] of pending.entries()) {
    const label = document.createElement('label'); label.className = 'review-item';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = item.checked;
    checkbox.addEventListener('change', () => { item.checked = checkbox.checked; });
    const text = document.createElement('span');
    text.append(textElement('strong', '', item.point.nombre + ' · ' + item.point.tipo));
    text.append(textElement('small', '', 'Archivo ' + item.source + ' · ' + item.point.direccion));
    text.append(textElement('small', '', 'Coordenadas: ' + item.point.lat + ', ' + item.point.lng));
    if (item.contact) text.append(textElement('small', '', 'Solicitante (solo revisión): ' + item.contact));
    if (!inRosarioArea(item.point)) text.append(textElement('small', '', 'ATENCIÓN: el marcador está lejos de El Rosario'));
    checkbox.id = 'review-' + index;
    label.append(checkbox, text); list.append(label);
  }
  drawPreview();
}
getElement('select-all').addEventListener('click', () => {
  const shouldCheck = pending.some(x => !x.checked);
  pending.forEach(item => item.checked = shouldCheck);
  drawPending();
});
getElement('discard').addEventListener('click', () => {
  pending = []; drawPending(); setMessage('Solicitudes pendientes descartadas.');
});
getElement('approve').addEventListener('click', () => {
  if (!pending.some(x => x.checked)) { setMessage('Selecciona al menos un punto.'); return; }
  if (!confirm('¿Confirmas que revisaste las ubicaciones y autorizaciones de los lugares seleccionados? Se añadirán al borrador local, NO al mapa público.')) return;
  let added = 0, duplicates = 0;
  for (const item of pending.filter(x => x.checked)) {
    if (draft.length >= MAX_POINTS) break;
    if (likelyDuplicate(item.point, draft)) { duplicates++; continue; }
    draft.push(item.point); added++;
  }
  pending = pending.filter(x => !x.checked);
  saveDraft(); drawPending();
  setMessage('Añadidos ' + added + ' punto(s) al borrador. ' + duplicates + ' duplicado(s) omitido(s). Usa «Publicar cambios» para actualizarlos en Cloudflare D1.');
});

getElement<HTMLInputElement>('files').addEventListener('change', async event => {
  const input = event.currentTarget as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = '';
  if (files.length > MAX_FILES) { setMessage('Selecciona como máximo 100 archivos cada vez.'); return; }
  if (!files.length) return;
  let accepted = 0, rejected = 0, duplicates = 0;
  const staged: PublicPoint[] = pending.map(p => p.point);
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.json') || file.size > MAX_BYTES) { rejected++; continue; }
    try {
      const decoded: unknown = JSON.parse(await file.text());
      const entries: { point: PublicPoint; contact: string | null }[] = [];
      if (Array.isArray(decoded)) {
        // Carga de respaldo público anterior, sin datos privados.
        if (decoded.length > MAX_POINTS) { rejected++; continue; }
        for (const raw of decoded) {
          const point = readPublicPoint(raw);
          if (point) entries.push({ point, contact: null });
          else rejected++;
        }
      } else {
        const submission = readSubmission(decoded);
        if (submission) entries.push(submission);
        else rejected++;
      }
      for (const item of entries) {
        if (likelyDuplicate(item.point, draft) || likelyDuplicate(item.point, staged)) { duplicates++; continue; }
        if (pending.length >= MAX_POINTS) { rejected++; continue; }
        pending.push({ ...item, source: file.name, checked: true });
        staged.push(item.point); accepted++;
      }
    } catch { rejected++; }
  }
  drawPending();
  setMessage(accepted + ' ubicaciones preparadas para revisar; ' + rejected + ' inválidas; ' + duplicates + ' duplicadas. Selecciona las aprobadas.');
});

getElement('export').addEventListener('click', () => {
  if (!draft.length && !confirm('El borrador no contiene casas o locales. ¿Descargar un puntos.json vacío para retirar todos los lugares cuando lo publiques en GitHub?')) return;
  // Defensa adicional: esta transformación excluye todos los campos ajenos al esquema público.
  const clean = draft.map(readPublicPoint).filter((p): p is PublicPoint => !!p);
  if (clean.length !== draft.length) { setMessage('Hay registros inválidos. Corrígelos antes de exportar.'); return; }
  downloadJson(clean, 'puntos.json');
  setMessage('Respaldo descargado; para actualizar el mapa usa «Publicar cambios».');
});
getElement('publish').addEventListener('click', async () => {
  if (revision === null) { setMessage('D1 todavía no está conectada. No se puede publicar.'); return; }
  const clean = draft.map(readPublicPoint).filter((p): p is PublicPoint => !!p);
  if (clean.length !== draft.length) { setMessage('Hay registros inválidos; corrígelos antes de publicar.'); return; }
  const warning = clean.length === 0
    ? '¿Eliminar TODAS las ubicaciones del mapa público?'
    : '¿Publicar ' + clean.length + ' lugares y reemplazar por completo los puntos del mapa público?';
  if (!confirm(warning)) return;
  const button = getElement<HTMLButtonElement>('publish'); button.disabled = true;
  try {
    const response = await fetch(ROOT + 'api/admin/puntos', {
      method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body: JSON.stringify({points:clean, revision}),
    });
    if (response.status === 409) { setMessage('Otro dispositivo cambió el mapa. Guarda un respaldo, restablece al publicado y revisa antes de reintentar.'); return; }
    if (!response.ok) throw new Error('HTTP '+response.status);
    const saved: {revision?:number} = await response.json();
    if (typeof saved.revision !== 'number') throw new Error('La respuesta del servidor no es válida');
    revision = saved.revision;
    published = clean.map(p=>({...p}));
    saveDraft();
    setMessage('Publicado: ' + clean.length + ' lugares guardados en Cloudflare D1. Recarga el mapa público para comprobar.');
  } catch (reason) {
    setMessage('No se pudo publicar: '+(reason instanceof Error ? reason.message : 'error desconocido'));
  } finally { button.disabled = false; }
});
getElement('reset').addEventListener('click', () => {
  if (!confirm('¿Borrar tu borrador local y volver a los puntos que están publicados en GitHub?')) return;
  draft = published.map(p => ({ ...p }));
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* navegador restringido */ }
  drawDraft(); resetForm(); setMessage('Borrador restablecido a los puntos del sitio publicado.');
});

type GeocodeResult = { geometry?: { coordinates?: [number, number] }, properties?: Record<string, string | undefined> };
function clearSearch() {
  if (searchTimer !== undefined) clearTimeout(searchTimer);
  searchAbort?.abort(); searchAbort = null;
  getElement('address-results').hidden = true;
  getElement('address-results').replaceChildren();
}
async function searchAddress(query: string) {
  if (query.length < 5) return;
  searchAbort?.abort();
  const controller = new AbortController(); searchAbort = controller;
  lastSearchTime = Date.now();
  try {
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', query + (query.toLowerCase().includes('rosario') ? '' : ', El Rosario, Sinaloa, México'));
    url.searchParams.set('limit', '5'); url.searchParams.set('lang', 'es');
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('Photon no disponible');
    const json: { features?: GeocodeResult[] } = await response.json();
    if (controller.signal.aborted) return;
    const results = getElement('address-results'); results.replaceChildren();
    for (const item of json.features || []) {
      if (!item.geometry?.coordinates) continue;
      const [lng, lat] = item.geometry.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const p = item.properties || {};
      const display = [p.name, p.street, p.housenumber, p.city, p.state].filter(Boolean).join(', ') || 'Dirección sin nombre';
      const button = document.createElement('button'); button.type = 'button'; button.textContent = display;
      button.addEventListener('click', () => {
        clearSearch(); placeMarker(lat, lng); map.flyTo([lat, lng], 17);
        if (!val('edit-ref')) getElement<HTMLInputElement>('edit-ref').value = display.slice(0, 180);
        setMessage('Dirección aproximada encontrada. Revisa el marcador y arrástralo si hace falta.');
      });
      results.append(button);
    }
    results.hidden = !results.childElementCount;
    if (results.hidden) setMessage('No hubo resultados; puedes tocar el mapa manualmente.');
  } catch (reason) {
    if ((reason as Error).name !== 'AbortError') setMessage('Búsqueda no disponible. Puedes marcar el lugar manualmente.');
  }
}
getElement<HTMLInputElement>('address-search').addEventListener('input', () => {
  clearSearch();
  const query = val('address-search');
  if (query.length < 5) return;
  searchTimer = window.setTimeout(() => {
    const wait = Math.max(0, 1500 - (Date.now() - lastSearchTime));
    searchTimer = window.setTimeout(() => void searchAddress(query), wait);
  }, 850);
});
getElement('search-address').addEventListener('click', () => {
  clearSearch(); const query = val('address-search');
  if (query.length < 5) { setMessage('Escribe al menos 5 letras para buscar la dirección.'); return; }
  searchTimer = window.setTimeout(() => void searchAddress(query), Math.max(0, 1500 - (Date.now() - lastSearchTime)));
});

async function init(): Promise<void> {
  try {
    const response = await fetch(ROOT + 'api/admin/puntos', {credentials:'same-origin',cache:'no-store'});
    if (!response.ok) throw new Error('HTTP '+response.status);
    const result: {points?:unknown, revision?:unknown} = await response.json();
    if (!Array.isArray(result.points) || typeof result.revision !== 'number') throw new Error('Respuesta D1 inválida');
    revision = result.revision;
    published = result.points.flatMap(value => { const p = readPublicPoint(value); return p ? [p] : []; });
  } catch { setMessage('D1 no disponible o sesión vencida. Puedes editar el borrador, pero NO publicarlo hasta configurar D1.'); }
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved !== null) {
      const raw: unknown = JSON.parse(saved);
      draft = Array.isArray(raw) ? raw.flatMap(value => { const p = readPublicPoint(value); return p ? [p] : []; }) : [];
      setMessage('Se recuperó tu borrador local. Puede diferir de la lista publicada; revisa antes de exportar.');
    } else draft = published.map(p => ({ ...p }));
  } catch { draft = published.map(p => ({ ...p })); }
  drawDraft();
  await loadReports();
  if (draft.length) map.fitBounds(L.latLngBounds(draft.map(p => [p.lat, p.lng])), { maxZoom: 15, padding: [40, 40] });
}
void init();
