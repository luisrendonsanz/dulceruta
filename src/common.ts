export const ROOT = import.meta.env.BASE_URL;
export const ROSARIO = { lat: 22.9921, lng: -105.8573 };

export function getElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error('Elemento faltante: ' + id);
  return node as T;
}

export function textElement(tag: string, className: string, value: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function walkingDirections(lat: number, lng: number): string {
  const params = new URLSearchParams({
    api: '1',
    destination: lat + ',' + lng,
    travelmode: 'walking',
    dir_action: 'navigate',
  });
  return 'https://www.google.com/maps/dir/?' + params.toString();
}

export function registerPwa(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT })
        .catch(error => console.warn('Error al registrar PWA:', error));
    });
  }
}
