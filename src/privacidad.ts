import './style.css';
import { ROOT, getElement } from './common';
type Config={responsable?:string,domicilio?:string,correo?:string};
async function init(){
 try {
  const r=await fetch(ROOT+'api/aviso-config',{cache:'no-store'});
  if(!r.ok)return;
  const c:Config=await r.json();
  if(c.responsable)getElement('legal-name').textContent=c.responsable;
  if(c.domicilio)getElement('legal-address').textContent=c.domicilio;
  if(c.correo&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.correo)){
   const a=document.createElement('a');a.href='mailto:'+c.correo;a.textContent=c.correo;getElement('legal-email').replaceChildren(a);
  }
  if(c.responsable&&c.domicilio&&c.correo)getElement('legal-missing').hidden=true;
 }catch { /* El aviso indica que faltan datos de forma explícita. */ }
}
void init();
