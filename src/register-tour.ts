import { getElement } from './common';
import { REGISTRATION_TOUR_STEPS, shouldShowRegistrationTour, TOUR_HIDDEN_VALUE, TOUR_STORAGE_KEY } from './register-tour-data';

export function initRegistrationTour(): void {
  const overlay = getElement('registration-tutorial');
  const dialog = getElement<HTMLElement>('registration-tutorial-dialog');
  const launch = getElement<HTMLButtonElement>('open-register-tour');
  const skip = getElement<HTMLButtonElement>('registration-tutorial-skip');
  const back = getElement<HTMLButtonElement>('registration-tutorial-back');
  const next = getElement<HTMLButtonElement>('registration-tutorial-next');
  const remember = getElement<HTMLInputElement>('registration-tutorial-remember');
  const title = getElement('registration-tutorial-title');
  const description = getElement('registration-tutorial-text');
  const progress = getElement('registration-tutorial-progress');
  const dots = getElement('registration-tutorial-dots');

  let activeIndex = 0;
  let activeTarget: HTMLElement | null = null;
  let lastFocus: HTMLElement | null = null;

  function savedPreference(): string | null {
    try { return localStorage.getItem(TOUR_STORAGE_KEY); }
    catch { return null; }
  }
  function savePreference(): void {
    try {
      if (remember.checked) localStorage.setItem(TOUR_STORAGE_KEY, TOUR_HIDDEN_VALUE);
      else localStorage.removeItem(TOUR_STORAGE_KEY);
    } catch { /* Modo privado o almacenamiento deshabilitado. */ }
  }

  function clearHighlight(): void {
    activeTarget?.classList.remove('registration-tour__target');
    activeTarget = null;
  }

  function showStep(index: number): void {
    activeIndex = index;
    clearHighlight();
    const step = REGISTRATION_TOUR_STEPS[index];
    const target = getElement<HTMLElement>(step.targetId);
    activeTarget = target;
    target.classList.add('registration-tour__target');
    title.textContent = step.title;
    description.textContent = step.description;
    progress.textContent = 'Paso ' + (index + 1) + ' de ' + REGISTRATION_TOUR_STEPS.length;
    dots.replaceChildren();
    for (let i = 0; i < REGISTRATION_TOUR_STEPS.length; i++) {
      const dot = document.createElement('span');
      dot.className = 'registration-tutorial__dot' + (i === index ? ' is-active' : '');
      dots.append(dot);
    }
    back.disabled = index === 0;
    next.textContent = index === REGISTRATION_TOUR_STEPS.length - 1 ? 'Finalizar ✓' : 'Siguiente →';

    // Mantener el campo señalado por encima de la tarjeta inferior en iPhone.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.requestAnimationFrame(() => {
      if (overlay.hidden) return;
      const bounding = target.getBoundingClientRect();
      const desiredTop = Math.min(96, Math.max(24, window.innerHeight * 0.11));
      window.scrollTo({
        top: Math.max(0, window.scrollY + bounding.top - desiredTop),
        behavior: reduceMotion ? 'instant' : 'smooth',
      });
    });
  }

  function closeTour(): void {
    if (overlay.hidden) return;
    savePreference();
    clearHighlight();
    overlay.hidden = true;
    document.body.classList.remove('registration-tour--active');
    lastFocus?.focus({ preventScroll: true });
  }

  function openTour(): void {
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : launch;
    remember.checked = !shouldShowRegistrationTour(savedPreference());
    overlay.hidden = false;
    document.body.classList.add('registration-tour--active');
    showStep(0);
    dialog.focus({ preventScroll: true });
  }

  launch.addEventListener('click', openTour);
  skip.addEventListener('click', closeTour);
  back.addEventListener('click', () => { if (activeIndex > 0) showStep(activeIndex - 1); });
  next.addEventListener('click', () => {
    if (activeIndex === REGISTRATION_TOUR_STEPS.length - 1) closeTour();
    else showStep(activeIndex + 1);
  });

  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeTour();
      return;
    }
    // La navegación de teclado permanece dentro del tutorial.
    if (event.key !== 'Tab') return;
    const available = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'));
    const first = available[0], last = available[available.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  });

  if (shouldShowRegistrationTour(savedPreference())) openTour();
}
