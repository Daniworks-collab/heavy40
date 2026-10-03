import type { Equipment, ExerciseClass, Joint, Level, Mode, Muscle, Pattern } from '@/engine/types';

export const MUSCLES: Muscle[] = ['pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'cuadriceps', 'femorales', 'gluteos', 'gemelos', 'core'];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  cuadriceps: 'Cuádriceps',
  femorales: 'Femorales',
  gluteos: 'Glúteos',
  gemelos: 'Gemelos',
  core: 'Core'
};

export const BIG_MUSCLES: Muscle[] = ['pecho', 'espalda', 'cuadriceps', 'femorales', 'hombros'];
export const SMALL_MUSCLES: Muscle[] = ['biceps', 'triceps', 'gemelos', 'core'];

export const EQUIPMENT: Equipment[] = ['barra', 'mancuernas', 'maquina', 'polea', 'smith', 'rack', 'banco', 'barra-dominadas', 'paralelas', 'peso-corporal'];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barra: 'Barra y discos',
  mancuernas: 'Mancuernas',
  maquina: 'Máquinas',
  polea: 'Poleas',
  smith: 'Smith',
  rack: 'Rack con seguros',
  banco: 'Banco ajustable',
  'barra-dominadas': 'Barra de dominadas',
  paralelas: 'Paralelas',
  'peso-corporal': 'Peso corporal'
};

export const JOINTS: Joint[] = ['hombro', 'codo', 'muneca', 'lumbar', 'rodilla', 'cadera'];
export const JOINT_LABEL: Record<Joint, string> = {
  hombro: 'Hombro',
  codo: 'Codo',
  muneca: 'Muñeca',
  lumbar: 'Zona lumbar',
  rodilla: 'Rodilla',
  cadera: 'Cadera'
};

export const CLASS_LABEL: Record<ExerciseClass, string> = {
  C1: 'Compuesto libre',
  C2: 'Compuesto guiado',
  A: 'Aislamiento',
  P: 'Músculo pequeño'
};

export const LEVEL_LABEL: Record<Level, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado'
};

export const MODE_LABEL: Record<Mode, string> = {
  puro: 'HD Puro',
  adaptado: 'HD Adaptado',
  fast40: 'Fast-40'
};

export const MODE_BLURB: Record<Mode, string> = {
  puro: '1 serie efectiva por ejercicio, siempre al fallo, 6-10 reps. Máxima fidelidad a Mentzer.',
  adaptado: 'Intensidad alta y poco volumen, con ~2 series en ejercicios clave y 2×/semana por músculo. Fallo sólo donde es seguro.',
  fast40: 'Pares antagonistas para meter más series en tu tiempo. Una concesión al purismo HD.'
};

export const PATTERN_LABEL: Record<Pattern, string> = {
  'empuje-horizontal': 'Empuje horizontal',
  'empuje-vertical': 'Empuje vertical',
  'traccion-vertical': 'Tracción vertical',
  'traccion-horizontal': 'Tracción horizontal',
  sentadilla: 'Sentadilla',
  bisagra: 'Bisagra de cadera',
  puente: 'Puente de cadera',
  aperturas: 'Aperturas',
  'elevacion-lateral': 'Elevación lateral',
  'abduccion-horizontal': 'Abducción horizontal',
  pullover: 'Pullover',
  'flexion-codo': 'Flexión de codo',
  'extension-codo': 'Extensión de codo',
  'extension-rodilla': 'Extensión de rodilla',
  'flexion-rodilla': 'Flexión de rodilla',
  'abduccion-cadera': 'Abducción de cadera',
  'flexion-plantar': 'Flexión plantar',
  'flexion-tronco': 'Flexión de tronco'
};

export const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const WEEKDAY_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
