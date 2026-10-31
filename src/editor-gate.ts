import './style.css';

// Esta protección es solo visual: GitHub Pages sirve código estático público.
// El hash no es un secreto y NO constituye autenticación de servidor.
const PASSWORD_HASH = '8652d8b4341b1fd05a5098bccd88e28a4af3e2a3022aa9b7b7a4e721475e7693';
const SESSION_KEY = 'dulceruta-editor-session-v1';

const form = document.getElementById('admin-gate-form') as HTMLFormElement;
const input = document.getElementById('admin-gate-password') as HTMLInputElement;
const submit = document.getElementById('admin-gate-submit') as HTMLButtonElement;
const feedback = document.getElementById('admin-gate-error') as HTMLParagraphElement;
const gate = document.getElementById('admin-gate') as HTMLElement;
const editorShell = document.getElementById('admin-shell') as HTMLElement;
const logout = document.getElementById('admin-logout') as HTMLButtonElement;

let opening = false;
async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function savedSession(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === PASSWORD_HASH; }
  catch { return false; }
}
async function openEditor(): Promise<void> {
  if (opening) return;
  opening = true;
  gate.hidden = true;
  editorShell.hidden = false;
  try {
    await import('./editor');
  } catch (reason) {
    console.error('No se pudo cargar el editor', reason);
    editorShell.hidden = true;
    gate.hidden = false;
    feedback.hidden = false;
    feedback.textContent = 'No se pudo cargar el administrador. Recarga la página.';
    opening = false;
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (opening || !input.value) return;
  submit.disabled = true;
  feedback.hidden = true;
  try {
    const valid = await sha256(input.value);
    if (valid !== PASSWORD_HASH) {
      feedback.textContent = 'Contraseña incorrecta. Inténtalo nuevamente.';
      feedback.hidden = false;
      input.value = '';
      input.focus();
      return;
    }
    try { sessionStorage.setItem(SESSION_KEY, PASSWORD_HASH); } catch { /* sesión solo en memoria */ }
    input.value = '';
    await openEditor();
  } catch {
    feedback.textContent = 'Tu navegador no pudo verificar la contraseña. Usa una conexión HTTPS.';
    feedback.hidden = false;
  } finally {
    submit.disabled = false;
  }
});
logout.addEventListener('click', () => {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* acceso a storage restringido */ }
  window.location.reload();
});
if (savedSession()) void openEditor();
