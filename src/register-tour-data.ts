export const TOUR_STORAGE_KEY = 'dulceruta-registration-tour-v1';
export const TOUR_HIDDEN_VALUE = 'hidden';

export interface RegistrationTourStep {
  targetId: string;
  title: string;
  description: string;
}

export const REGISTRATION_TOUR_STEPS: readonly RegistrationTourStep[] = [
  {
    targetId: 'tour-participant',
    title: 'Escribe tus datos',
    description: 'Introduce tu nombre y apellido. Son para revisar tu solicitud: no se muestran en el mapa público.',
  },
  {
    targetId: 'tour-place',
    title: 'Describe tu casa o negocio',
    description: 'Selecciona si es casa o negocio. Agrega un nombre público y una referencia para que las familias puedan encontrarlo.',
  },
  {
    targetId: 'tour-hours',
    title: 'Selecciona el horario',
    description: 'Elige la hora de inicio y la hora de finalización con los selectores del celular. La hora final debe ser posterior a la inicial, el mismo día.',
  },
  {
    targetId: 'tour-registration-location',
    title: 'Marca la ubicación en el mapa',
    description: 'Si estás en tu casa, pulsa «Usar mi ubicación» y permite el GPS. También puedes tocar el mapa directamente. Comprueba que el marcador esté en la entrada correcta y arrástralo si hace falta.',
  },
  {
    targetId: 'tour-consent',
    title: 'Confirma tu autorización',
    description: 'Marca esta casilla solo si eres responsable del lugar o tienes permiso para publicar su ubicación y horario.',
  },
  {
    targetId: 'tour-download',
    title: 'Descarga y envía tu solicitud',
    description: 'Descarga tu archivo JSON y envíalo al organizador por WhatsApp como documento. Tu casa aparecerá en el mapa solo cuando sea aprobada.',
  },
];

export function shouldShowRegistrationTour(savedPreference: string | null): boolean {
  return savedPreference !== TOUR_HIDDEN_VALUE;
}
