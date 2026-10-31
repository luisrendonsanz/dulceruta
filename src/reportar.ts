import './style.css';
import { ROOT, getElement } from './common';
type Location={id:string,nombre:string,direccion:string};
const select=getElement<HTMLSelectElement>('report-place');
const result=getElement('report-result');
async function load(){
 try{
  const r=await fetch(ROOT+'api/puntos',{cache:'no-store'});
  if(!r.ok)throw Error('API');
  const points:Location[]=await r.json();
  select.replaceChildren(new Option('Selecciona una casa o negocio',''));
  for(const p of points)select.add(new Option(p.nombre+' — '+p.direccion,p.id));
  const preset=new URLSearchParams(location.search).get('p');
  if(preset&&points.some(p=>p.id===preset))select.value=preset;
  if(!points.length)result.textContent='No hay casas publicadas que reportar por ahora.';
 }catch{ select.replaceChildren(new Option('No se pudieron cargar los lugares',''));result.textContent='Error de conexión. Recarga la página.'; }
}
getElement<HTMLFormElement>('report-form').addEventListener('submit',async event=>{
 event.preventDefault();
 if(!select.value){result.textContent='Selecciona la ubicación correspondiente.';return;}
 const btn=getElement<HTMLButtonElement>('report-submit');btn.disabled=true;
 try{
  const r=await fetch(ROOT+'api/reportes',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({
   puntoId:select.value,motivo:getElement<HTMLSelectElement>('report-reason').value,
   detalle:getElement<HTMLTextAreaElement>('report-detail').value.trim(),sitio_web:getElement<HTMLInputElement>('report-web').value,
  })});
  if(!r.ok)throw Error('No se pudo enviar el reporte. Inténtalo de nuevo.');
  result.textContent='Reporte recibido. El organizador lo revisará; el punto no se ha retirado automáticamente.';
  getElement<HTMLTextAreaElement>('report-detail').value='';
 }catch(e){result.textContent=e instanceof Error?e.message:'Error al reportar';}
 finally{btn.disabled=false;}
});
void load();
