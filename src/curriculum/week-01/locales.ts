import { missions, type Mission } from './cases';
import type { StudioMission } from './manifest';
import type { Locale } from '@/lib/i18n/messages';

const spanish: Record<StudioMission, Pick<Mission, 'idea' | 'label' | 'name' | 'task' | 'success'>> = {
  transcript: {
    idea: 'Percepción',
    label: 'Mesa de sonido',
    name: 'La grabación del grupo con ruido',
    task: 'Crea una transcripción que puedas compartir de forma segura con tu grupo.',
    success: 'Verifica tres palabras, mejora la transcripción y protege los datos de la copia compartida.',
  },
  reading: {
    idea: 'Representación y razonamiento',
    label: 'Rincón de lectura',
    name: 'Recomendaciones del rincón de lectura',
    task: 'Ayuda a ocho estudiantes a encontrar un libro o club que les interese.',
    success: 'Detecta recomendaciones inadecuadas, mejora las reglas y permite que cada estudiante decida.',
  },
  tickets: {
    idea: 'Aprendizaje',
    label: 'Mural de notas',
    name: 'El clasificador de notas de salida',
    task: 'Clasifica estas reflexiones para decidir con quién hablar mañana.',
    success:
      'Verifica las notas ambiguas, entrena con ejemplos variados y revisa los errores antes de usar la lista.',
  },
  hints: {
    idea: 'Interacción natural',
    label: 'Mesa de ayuda',
    name: 'Un chatbot que da pistas',
    task: 'Prepara un asistente que ofrezca pistas útiles para un acertijo sencillo.',
    success:
      'Prueba el chat, ajusta sus instrucciones y establece cómo responder a conversaciones delicadas.',
  },
  toolkit: {
    idea: 'Impacto social',
    label: 'Tablero de planificación',
    name: 'Herramientas para un semestre',
    task: 'Elige herramientas que ayuden al profesorado y respeten a la comunidad del aula.',
    success:
      'Instala tres aplicaciones, configura medidas de protección, simula sus efectos y revisa tus decisiones.',
  },
};

export function missionContent(id: StudioMission, locale: Locale): Mission {
  return locale === 'es' ? { ...missions[id], ...spanish[id] } : missions[id];
}
