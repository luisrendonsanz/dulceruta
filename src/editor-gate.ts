import './style.css';

// Cloudflare verifica ADMIN_PASSWORD del servidor. La cookie de sesión es HttpOnly.
const ROOT = import.meta.env.BASE_URL;
const form = document.getElementById('admin-gate-form') as HTMLFormElement;
const input = document.getElementById('admin-gate-password') as HTMLInputElement;
const submit = document.getElementById('admin-gate-submit') as HTMLButtonElement;
const feedback = document.getElementById('admin-gate-error') as HTMLParagraphElement;
const gate = document.getElementById('admin-gate') as HTMLElement;
const shell = document.getElementById('admin-shell') as HTMLElement;
const logout = document.getElementById('admin-logout') as HTMLButtonElement;
let opening = false;
function error(message: string) { feedback.textContent = message; feedback.hidden = false; }
async function openEditor() {
  if (opening) return;
  opening = true; gate.hidden = true; shell.hidden = false;
  try { await import('./editor'); }
  catch (reason) {
    console.error(reason);
    shell.hidden = true; gate.hidden = false;
    error('No se pudo cargar el editor. Recarga la página.');
    opening = false;
  }
}
async function restoreSession() {
  try {
    const response = await fetch(ROOT+'api/admin/session', { credentials:'same-origin',cache:'no-store' });
    if (response.status === 503) { error('Configuración pendiente: D1 o ADMIN_PASSWORD no están listos.'); return; }
    if (response.ok) {
      const result: { authenticated?: boolean } = await response.json();
      if (result.authenticated) await openEditor();
    }
  } catch { error('No se pudo conectar con Cloudflare.'); }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!input.value || opening) return;
  submit.disabled = true; feedback.hidden = true;
  try {
    const response = await fetch(ROOT+'api/admin/login', {
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({password:input.value}),
    });
    input.value = '';
    if (response.status === 503) { error('Primero configura D1 y ADMIN_PASSWORD en Cloudflare.'); return; }
    if (!response.ok) { error(response.status===401?'Contraseña incorrecta.':'No se pudo iniciar sesión.'); return; }
    await openEditor();
  } catch { error('No se pudo conectar con Cloudflare.'); }
  finally { submit.disabled = false; }
});
logout.addEventListener('click', async () => {
  try { await fetch(ROOT+'api/admin/logout',{method:'POST',credentials:'same-origin'}); }
  finally { window.location.reload(); }
});
void restoreSession();
