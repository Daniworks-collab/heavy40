import type { Equipment, Exercise, ExerciseClass, Joint, Level, Muscle, Pattern } from '@/engine/types';

const LOWER: Muscle[] = ['cuadriceps', 'femorales', 'gluteos', 'gemelos'];

/** Rango y descanso por defecto según clase (modo HD Adaptado). El motor los recalcula por modo. */
function defaults(cls: ExerciseClass, primary: Muscle, hinge?: boolean): { repRange: [number, number]; rest: number } {
  const lower = LOWER.includes(primary) && !hinge;
  switch (cls) {
    case 'C1':
      return { repRange: lower ? [8, 12] : [6, 10], rest: 150 };
    case 'C2':
      return { repRange: lower ? [8, 12] : [6, 10], rest: 120 };
    case 'A':
      return { repRange: [8, 12], rest: 75 };
    case 'P':
      return { repRange: primary === 'core' ? [10, 15] : [12, 20], rest: 60 };
  }
}

interface Seed {
  id: string;
  name: string;
  primary: Muscle;
  secondary?: Muscle[];
  cls: ExerciseClass;
  fatigue: 1 | 2 | 3 | 4 | 5;
  safeFailure: boolean;
  equipment: Equipment[];
  pattern: Pattern;
  joints?: Joint[];
  unilateral?: boolean;
  cues: [string, string, string];
  error: string;
  alt: string[];
  level?: Level;
  hinge?: boolean;
}

function mk(s: Seed): Exercise {
  const d = defaults(s.cls, s.primary, s.hinge);
  return {
    id: s.id,
    name: s.name,
    primary: s.primary,
    secondary: s.secondary ?? [],
    cls: s.cls,
    fatigue: s.fatigue,
    safeFailure: s.safeFailure,
    repRange: d.repRange,
    rest: d.rest,
    equipment: s.equipment,
    unilateral: s.unilateral ?? false,
    pattern: s.pattern,
    joints: s.joints ?? [],
    cues: s.cues,
    commonError: s.error,
    alternatives: s.alt,
    level: s.level,
    hinge: s.hinge
  };
}

const SEEDS: Seed[] = [
  // ───────────── PECHO ─────────────
  {
    id: 'press-banca-barra', name: 'Press banca con barra', primary: 'pecho', secondary: ['triceps', 'hombros'],
    cls: 'C1', fatigue: 4, safeFailure: false, equipment: ['barra', 'banco', 'rack'], pattern: 'empuje-horizontal', joints: ['hombro'],
    cues: ['Escápulas juntas y hundidas antes de descolgar', 'Baja a la parte baja del esternón, codos a ~45°', 'Empuja el piso con los pies y la barra hacia atrás'],
    error: 'Rebotar la barra en el pecho y abrir los codos a 90°', alt: ['press-banca-mancuernas', 'press-pecho-maquina', 'press-inclinado-smith']
  },
  {
    id: 'press-inclinado-mancuernas', name: 'Press inclinado con mancuernas', primary: 'pecho', secondary: ['hombros', 'triceps'],
    cls: 'C1', fatigue: 3, safeFailure: false, equipment: ['mancuernas', 'banco'], pattern: 'empuje-horizontal', joints: ['hombro'],
    cues: ['Banco a 30°, no más: más alto es hombro', 'Baja lento hasta sentir estiramiento en el pecho', 'Junta las mancuernas arriba sin chocarlas'],
    error: 'Banco demasiado vertical que convierte el ejercicio en press de hombro', alt: ['press-inclinado-smith', 'press-inclinado-maquina', 'press-banca-mancuernas']
  },
  {
    id: 'press-inclinado-smith', name: 'Press inclinado en Smith', primary: 'pecho', secondary: ['hombros', 'triceps'],
    cls: 'C2', fatigue: 3, safeFailure: true, equipment: ['smith', 'banco'], pattern: 'empuje-horizontal', joints: ['hombro'],
    cues: ['Coloca el banco para que la barra caiga en la clavícula baja', 'Pon los topes de seguridad a la altura del pecho', 'Controla 3 s abajo, sin rebote'],
    error: 'Banco mal colocado: la barra baja al cuello o al abdomen', alt: ['press-inclinado-mancuernas', 'press-inclinado-maquina']
  },
  {
    id: 'press-pecho-maquina', name: 'Press de pecho en máquina', primary: 'pecho', secondary: ['triceps', 'hombros'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['maquina'], pattern: 'empuje-horizontal',
    cues: ['Asiento con las agarraderas a la altura del pecho medio', 'Espalda pegada al respaldo todo el tiempo', 'Para 1 cm antes de bloquear y vuelve lento'],
    error: 'Despegar los hombros del respaldo para mover más peso', alt: ['press-inclinado-maquina', 'press-banca-mancuernas', 'press-inclinado-smith']
  },
  {
    id: 'press-inclinado-maquina', name: 'Press inclinado en máquina', primary: 'pecho', secondary: ['hombros', 'triceps'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['maquina'], pattern: 'empuje-horizontal',
    cues: ['Ajusta el asiento para empujar hacia arriba y al frente', 'Pecho alto, escápulas atrás', 'Fase negativa de 3 s completa'],
    error: 'Recorrido corto por cargar de más', alt: ['press-inclinado-smith', 'press-pecho-maquina']
  },
  {
    id: 'press-banca-mancuernas', name: 'Press plano con mancuernas', primary: 'pecho', secondary: ['triceps', 'hombros'],
    cls: 'C1', fatigue: 3, safeFailure: false, equipment: ['mancuernas', 'banco'], pattern: 'empuje-horizontal', joints: ['hombro'],
    cues: ['Sube las mancuernas apoyándolas en las rodillas', 'Antebrazos verticales en todo el recorrido', 'Baja hasta la línea del pecho, no más'],
    error: 'Dejar caer las mancuernas al final sin control', alt: ['press-banca-barra', 'press-pecho-maquina']
  },
  {
    id: 'fondos', name: 'Fondos en paralelas (lastre o asistidos)', primary: 'pecho', secondary: ['triceps', 'hombros'],
    cls: 'C1', fatigue: 4, safeFailure: false, equipment: ['paralelas'], pattern: 'empuje-vertical', joints: ['hombro'],
    cues: ['Inclina el torso ligeramente al frente para enfatizar pecho', 'Baja hasta que el hombro quede a la altura del codo', 'Hombros lejos de las orejas'],
    error: 'Bajar demasiado con hombros hacia el frente: estrés en hombro', alt: ['press-pecho-maquina', 'flexiones-declinadas', 'press-cerrado']
  },
  {
    id: 'pec-deck', name: 'Pec deck (aperturas en máquina)', primary: 'pecho', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'aperturas',
    cues: ['Codos ligeramente flexionados y fijos', 'Abraza un árbol: junta con el pecho, no con las manos', 'Pausa de 1 s en contracción'],
    error: 'Convertirlo en press doblando los codos', alt: ['cruces-polea', 'aperturas-mancuernas']
  },
  {
    id: 'cruces-polea', name: 'Cruces en polea', primary: 'pecho', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['polea'], pattern: 'aperturas',
    cues: ['Un paso al frente y postura estable', 'Arco amplio, manos se encuentran frente al pecho bajo', 'Deja que la polea estire el pecho atrás'],
    error: 'Inclinarse y usar el peso del cuerpo', alt: ['pec-deck', 'aperturas-mancuernas']
  },
  {
    id: 'aperturas-mancuernas', name: 'Aperturas con mancuernas', primary: 'pecho', secondary: [],
    cls: 'A', fatigue: 2, safeFailure: false, equipment: ['mancuernas', 'banco'], pattern: 'aperturas', joints: ['hombro'],
    cues: ['Codos semiflexionados todo el tiempo', 'Baja sólo hasta el estiramiento cómodo', 'Sube en arco sin chocar'],
    error: 'Bajar demasiado con peso pesado: riesgo en hombro', alt: ['pec-deck', 'cruces-polea']
  },
  {
    id: 'flexiones', name: 'Flexiones', primary: 'pecho', secondary: ['triceps', 'hombros', 'core'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['peso-corporal'], pattern: 'empuje-horizontal',
    cues: ['Cuerpo en tabla de talones a cabeza', 'Manos un poco más abiertas que hombros', 'Pecho al piso, codos a 45°'],
    error: 'Cadera caída y medio recorrido', alt: ['flexiones-declinadas', 'press-pecho-maquina']
  },
  {
    id: 'flexiones-declinadas', name: 'Flexiones declinadas', primary: 'pecho', secondary: ['hombros', 'triceps'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['peso-corporal'], pattern: 'empuje-horizontal',
    cues: ['Pies elevados en una silla o banco', 'Abdomen firme, sin arquear', 'Baja 3 s hasta rozar el piso'],
    error: 'Hundir la zona lumbar', alt: ['flexiones', 'press-inclinado-maquina']
  },

  // ───────────── ESPALDA ─────────────
  {
    id: 'jalon-neutro', name: 'Jalón al pecho agarre neutro', primary: 'espalda', secondary: ['biceps'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['polea'], pattern: 'traccion-vertical',
    cues: ['Muslos bien trabados bajo los rodillos', 'Lleva los codos a los bolsillos', 'Sube controlado hasta estirar el dorsal'],
    error: 'Echarse hacia atrás y tirar con impulso', alt: ['jalon-prono', 'dominadas', 'chin-ups']
  },
  {
    id: 'jalon-prono', name: 'Jalón al pecho agarre prono', primary: 'espalda', secondary: ['biceps'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['polea'], pattern: 'traccion-vertical',
    cues: ['Agarre un poco más ancho que hombros', 'Pecho al encuentro de la barra', 'Pausa breve abajo, escápulas deprimidas'],
    error: 'Llevar la barra detrás de la nuca', alt: ['jalon-neutro', 'dominadas']
  },
  {
    id: 'dominadas', name: 'Dominadas', primary: 'espalda', secondary: ['biceps'],
    cls: 'C1', fatigue: 3, safeFailure: true, equipment: ['barra-dominadas'], pattern: 'traccion-vertical',
    cues: ['Empieza desde colgado completo', 'Pecho a la barra, no la barbilla', 'Baja 3 s sin balanceo'],
    error: 'Kipping y medias repeticiones', alt: ['chin-ups', 'jalon-neutro', 'jalon-prono']
  },
  {
    id: 'chin-ups', name: 'Chin-ups (supinas)', primary: 'espalda', secondary: ['biceps'],
    cls: 'C1', fatigue: 3, safeFailure: true, equipment: ['barra-dominadas'], pattern: 'traccion-vertical',
    cues: ['Agarre supino al ancho de hombros', 'Codos hacia las costillas', 'Extiende por completo abajo'],
    error: 'Encoger hombros hacia las orejas', alt: ['dominadas', 'jalon-neutro']
  },
  {
    id: 'remo-barra', name: 'Remo con barra', primary: 'espalda', secondary: ['biceps', 'hombros', 'femorales'],
    cls: 'C1', fatigue: 4, safeFailure: false, equipment: ['barra'], pattern: 'traccion-horizontal', joints: ['lumbar'],
    cues: ['Torso a ~45°, espalda neutra y bloqueada', 'Lleva la barra al ombligo', 'Sin extender la cadera para subir'],
    error: 'Remar con impulso de cadera y espalda redondeada', alt: ['remo-maquina', 'remo-mancuerna', 'remo-t']
  },
  {
    id: 'remo-maquina', name: 'Remo en máquina con apoyo', primary: 'espalda', secondary: ['biceps', 'hombros'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['maquina'], pattern: 'traccion-horizontal',
    cues: ['Pecho pegado al apoyo todo el tiempo', 'Inicia retrayendo escápulas, luego codos', 'Estira por completo al volver'],
    error: 'Despegar el pecho del apoyo', alt: ['remo-polea-baja', 'remo-t', 'remo-barra']
  },
  {
    id: 'remo-polea-baja', name: 'Remo en polea baja', primary: 'espalda', secondary: ['biceps'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['polea'], pattern: 'traccion-horizontal',
    cues: ['Rodillas semiflexionadas, torso vertical', 'Tira hacia el abdomen bajo', 'Deja que las escápulas se separen al volver'],
    error: 'Balancear el torso hacia atrás', alt: ['remo-maquina', 'remo-mancuerna']
  },
  {
    id: 'remo-mancuerna', name: 'Remo con mancuerna a una mano', primary: 'espalda', secondary: ['biceps'],
    cls: 'C1', fatigue: 3, safeFailure: true, equipment: ['mancuernas', 'banco'], pattern: 'traccion-horizontal', unilateral: true,
    cues: ['Mano y rodilla en el banco, espalda plana', 'Lleva la mancuerna hacia la cadera', 'Sin rotar el torso'],
    error: 'Girar el tronco para subir el peso', alt: ['remo-maquina', 'remo-polea-baja']
  },
  {
    id: 'remo-t', name: 'Remo T con apoyo de pecho', primary: 'espalda', secondary: ['biceps', 'hombros'],
    cls: 'C2', fatigue: 3, safeFailure: true, equipment: ['maquina'], pattern: 'traccion-horizontal',
    cues: ['Pecho firme sobre el apoyo', 'Agarre neutro, codos a 45°', 'Pausa de 1 s arriba'],
    error: 'Recorrido corto en la fase de estiramiento', alt: ['remo-maquina', 'remo-barra']
  },
  {
    id: 'remo-invertido', name: 'Remo invertido', primary: 'espalda', secondary: ['biceps'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['peso-corporal'], pattern: 'traccion-horizontal',
    cues: ['Bajo una mesa firme o barra baja, cuerpo recto', 'Pecho al borde', 'Baja controlado hasta brazos extendidos'],
    error: 'Cadera colgando', alt: ['remo-maquina', 'remo-polea-baja']
  },
  {
    id: 'pullover-polea', name: 'Pullover en polea', primary: 'espalda', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['polea'], pattern: 'pullover',
    cues: ['Brazos casi rectos, codos fijos', 'Lleva la barra a los muslos en arco', 'Siente el dorsal estirarse arriba'],
    error: 'Doblar los codos y convertirlo en jalón de tríceps', alt: ['pullover-mancuerna', 'jalon-neutro']
  },
  {
    id: 'pullover-mancuerna', name: 'Pullover con mancuerna', primary: 'espalda', secondary: ['pecho'],
    cls: 'A', fatigue: 2, safeFailure: false, equipment: ['mancuernas', 'banco'], pattern: 'pullover', joints: ['hombro'],
    cues: ['Cadera baja, apoyado transversal o a lo largo del banco', 'Baja detrás de la cabeza hasta estiramiento cómodo', 'Sube hasta encima de los ojos'],
    error: 'Bajar demasiado con hombros rígidos', alt: ['pullover-polea']
  },
  {
    id: 'peso-muerto', name: 'Peso muerto convencional', primary: 'espalda', secondary: ['femorales', 'gluteos', 'cuadriceps'],
    cls: 'C1', fatigue: 5, safeFailure: false, equipment: ['barra'], pattern: 'bisagra', joints: ['lumbar', 'cadera'], level: 'avanzado', hinge: true,
    cues: ['Barra sobre medio pie, espinillas cerca', 'Tensa dorsales: "rompe la barra"', 'Empuja el piso, cadera y hombros suben juntos'],
    error: 'Espalda redondeada al despegar', alt: ['peso-muerto-rumano', 'remo-barra']
  },

  // ───────────── HOMBROS ─────────────
  {
    id: 'press-militar-mancuernas', name: 'Press militar sentado con mancuernas', primary: 'hombros', secondary: ['triceps'],
    cls: 'C1', fatigue: 3, safeFailure: false, equipment: ['mancuernas', 'banco'], pattern: 'empuje-vertical', joints: ['hombro'],
    cues: ['Respaldo a 80-85°, no totalmente vertical', 'Codos ligeramente al frente', 'Baja hasta orejas, sube sin bloquear'],
    error: 'Arquear la zona lumbar para empujar', alt: ['press-hombros-maquina', 'press-militar-barra']
  },
  {
    id: 'press-hombros-maquina', name: 'Press de hombros en máquina', primary: 'hombros', secondary: ['triceps'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['maquina'], pattern: 'empuje-vertical',
    cues: ['Agarraderas a la altura de la barbilla', 'Espalda apoyada todo el recorrido', 'Negativa de 3 s'],
    error: 'Recorrido incompleto abajo', alt: ['press-militar-mancuernas']
  },
  {
    id: 'press-militar-barra', name: 'Press militar de pie con barra', primary: 'hombros', secondary: ['triceps', 'core'],
    cls: 'C1', fatigue: 4, safeFailure: false, equipment: ['barra', 'rack'], pattern: 'empuje-vertical', joints: ['hombro', 'lumbar'],
    cues: ['Glúteos y abdomen apretados', 'Saca la cabeza de la trayectoria y vuelve a meterla', 'Barra sobre medio pie al terminar'],
    error: 'Hiperextender la espalda', alt: ['press-militar-mancuernas', 'press-hombros-maquina']
  },
  {
    id: 'pike-pushup', name: 'Flexiones pike', primary: 'hombros', secondary: ['triceps'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['peso-corporal'], pattern: 'empuje-vertical',
    cues: ['Cadera alta formando una V invertida', 'Cabeza hacia delante de las manos', 'Codos a 45°'],
    error: 'Convertirlo en flexión normal bajando la cadera', alt: ['press-hombros-maquina']
  },
  {
    id: 'elevacion-lateral-mancuerna', name: 'Elevación lateral con mancuerna', primary: 'hombros', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['mancuernas'], pattern: 'elevacion-lateral',
    cues: ['Ligera inclinación al frente', 'Sube con los codos, no con las manos', 'Para a la altura del hombro'],
    error: 'Balanceo y trapecio subiendo', alt: ['elevacion-lateral-polea', 'elevacion-lateral-maquina']
  },
  {
    id: 'elevacion-lateral-polea', name: 'Elevación lateral en polea', primary: 'hombros', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['polea'], pattern: 'elevacion-lateral', unilateral: true,
    cues: ['Polea baja, cable por detrás o delante del cuerpo', 'Tensión constante desde abajo', 'Codo ligeramente flexionado'],
    error: 'Inclinarse lejos de la polea para hacer trampa', alt: ['elevacion-lateral-mancuerna', 'elevacion-lateral-maquina']
  },
  {
    id: 'elevacion-lateral-maquina', name: 'Elevación lateral en máquina', primary: 'hombros', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'elevacion-lateral',
    cues: ['Eje de la máquina alineado con el hombro', 'Empuja con el antebrazo/codo', 'Baja 3 s sin soltar tensión'],
    error: 'Encoger hombros', alt: ['elevacion-lateral-polea', 'elevacion-lateral-mancuerna']
  },
  {
    id: 'pajaros-maquina', name: 'Pájaros en máquina (deltoide posterior)', primary: 'hombros', secondary: ['espalda'],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'abduccion-horizontal',
    cues: ['Pecho contra el respaldo, agarre neutro', 'Abre en arco con brazos casi rectos', 'No juntes escápulas: es hombro, no espalda'],
    error: 'Usar trapecio y romboides tirando con la espalda', alt: ['pajaros-polea', 'face-pull']
  },
  {
    id: 'pajaros-polea', name: 'Pájaros en polea cruzada', primary: 'hombros', secondary: ['espalda'],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['polea'], pattern: 'abduccion-horizontal',
    cues: ['Cables cruzados a la altura del hombro', 'Abre hacia los lados, no hacia atrás', 'Controla el regreso'],
    error: 'Rotar el torso', alt: ['pajaros-maquina', 'face-pull']
  },
  {
    id: 'face-pull', name: 'Face pull', primary: 'hombros', secondary: ['espalda'],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['polea'], pattern: 'abduccion-horizontal',
    cues: ['Polea a la altura de la cara, cuerda', 'Separa las manos al llegar a las orejas', 'Codos altos, rotación externa al final'],
    error: 'Tirar hacia el pecho como un remo', alt: ['pajaros-polea', 'pajaros-maquina']
  },

  // ───────────── BÍCEPS ─────────────
  {
    id: 'curl-barra-z', name: 'Curl con barra Z', primary: 'biceps', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['barra'], pattern: 'flexion-codo', joints: ['codo'],
    cues: ['Codos pegados a las costillas', 'Sube sin adelantar los codos', 'Baja completo en 3 s'],
    error: 'Balancear el tronco para subir', alt: ['curl-polea', 'curl-predicador-maquina']
  },
  {
    id: 'curl-inclinado', name: 'Curl inclinado con mancuernas', primary: 'biceps', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['mancuernas', 'banco'], pattern: 'flexion-codo',
    cues: ['Banco a 45-60°, brazos colgando detrás del torso', 'Supina mientras subes', 'Estira completo abajo'],
    error: 'Adelantar el hombro al subir', alt: ['curl-polea', 'curl-barra-z']
  },
  {
    id: 'curl-predicador-maquina', name: 'Curl predicador en máquina', primary: 'biceps', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'flexion-codo',
    cues: ['Axila pegada al cojín', 'No despegues los codos', 'Para antes de bloquear abajo'],
    error: 'Levantar los glúteos del asiento', alt: ['curl-barra-z', 'curl-polea']
  },
  {
    id: 'curl-martillo', name: 'Curl martillo', primary: 'biceps', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['mancuernas'], pattern: 'flexion-codo',
    cues: ['Agarre neutro, pulgares arriba', 'Codos fijos al costado', 'Sube hacia el hombro opuesto o recto'],
    error: 'Girar el torso', alt: ['curl-barra-z', 'curl-polea']
  },
  {
    id: 'curl-polea', name: 'Curl en polea', primary: 'biceps', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['polea'], pattern: 'flexion-codo',
    cues: ['Un paso atrás para tensión desde abajo', 'Aprieta 1 s arriba', 'Negativa lenta'],
    error: 'Inclinarse hacia atrás', alt: ['curl-barra-z', 'curl-predicador-maquina']
  },
  {
    id: 'curl-concentrado', name: 'Curl concentrado', primary: 'biceps', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['mancuernas'], pattern: 'flexion-codo', unilateral: true,
    cues: ['Codo apoyado en la cara interna del muslo', 'Sube sin mover el hombro', 'Baja completo'],
    error: 'Ayudarse con el muslo', alt: ['curl-predicador-maquina', 'curl-martillo']
  },

  // ───────────── TRÍCEPS ─────────────
  {
    id: 'ext-triceps-cuerda', name: 'Extensión de tríceps en polea con cuerda', primary: 'triceps', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['polea'], pattern: 'extension-codo',
    cues: ['Codos fijos junto al torso', 'Separa la cuerda al final', 'Sube hasta 90° sin dejar que los codos avancen'],
    error: 'Usar el peso del cuerpo y mover los hombros', alt: ['ext-triceps-sobre-cabeza', 'press-frances']
  },
  {
    id: 'press-frances', name: 'Press francés con barra Z', primary: 'triceps', secondary: [],
    cls: 'A', fatigue: 2, safeFailure: true, equipment: ['barra', 'banco'], pattern: 'extension-codo', joints: ['codo'],
    cues: ['Brazos ligeramente inclinados hacia atrás', 'Baja a la frente o detrás de la cabeza', 'Codos apuntando al techo'],
    error: 'Abrir los codos hacia los lados', alt: ['ext-triceps-sobre-cabeza', 'ext-triceps-cuerda']
  },
  {
    id: 'ext-triceps-sobre-cabeza', name: 'Extensión de tríceps sobre la cabeza', primary: 'triceps', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['polea'], pattern: 'extension-codo',
    cues: ['De espaldas a la polea, cuerda detrás de la cabeza', 'Codos apuntando al frente, fijos', 'Estira completo atrás'],
    error: 'Mover los codos durante la extensión', alt: ['press-frances', 'ext-triceps-cuerda']
  },
  {
    id: 'press-cerrado', name: 'Press banca agarre cerrado', primary: 'triceps', secondary: ['pecho', 'hombros'],
    cls: 'C1', fatigue: 3, safeFailure: false, equipment: ['barra', 'banco', 'rack'], pattern: 'empuje-horizontal', joints: ['muneca', 'hombro'],
    cues: ['Manos al ancho de hombros, no más juntas', 'Codos pegados al bajar', 'Toca el esternón bajo'],
    error: 'Agarre demasiado cerrado que fuerza las muñecas', alt: ['fondos', 'press-frances']
  },
  {
    id: 'ext-triceps-maquina', name: 'Extensión de tríceps en máquina', primary: 'triceps', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'extension-codo',
    cues: ['Codos alineados con el eje', 'Extiende completo y aprieta', 'Vuelve en 3 s'],
    error: 'Levantar los codos del cojín', alt: ['ext-triceps-cuerda']
  },
  {
    id: 'fondos-banco', name: 'Fondos en banco', primary: 'triceps', secondary: ['pecho'],
    cls: 'A', fatigue: 2, safeFailure: true, equipment: ['peso-corporal'], pattern: 'extension-codo', joints: ['hombro'],
    cues: ['Manos en el borde de una silla o banco', 'Espalda cerca del banco', 'Baja hasta 90° en el codo'],
    error: 'Bajar demasiado: estrés en hombro', alt: ['ext-triceps-cuerda', 'fondos']
  },

  // ───────────── CUÁDRICEPS ─────────────
  {
    id: 'prensa-45', name: 'Prensa 45°', primary: 'cuadriceps', secondary: ['gluteos'],
    cls: 'C2', fatigue: 3, safeFailure: true, equipment: ['maquina'], pattern: 'sentadilla',
    cues: ['Pies a la anchura de hombros, mitad de la plataforma', 'Baja hasta que la pelvis no se despegue', 'No bloquees las rodillas arriba'],
    error: 'Despegar la cadera del respaldo al bajar', alt: ['sentadilla-hack', 'sentadilla-smith', 'sentadilla-pendulo']
  },
  {
    id: 'sentadilla-libre', name: 'Sentadilla libre con barra', primary: 'cuadriceps', secondary: ['gluteos', 'femorales', 'core'],
    cls: 'C1', fatigue: 5, safeFailure: false, equipment: ['barra', 'rack'], pattern: 'sentadilla', joints: ['rodilla', 'lumbar'],
    cues: ['Barras de seguridad a la altura correcta siempre', 'Respira y bloquea el abdomen antes de bajar', 'Rodillas siguen la línea de los pies'],
    error: 'Perder la tensión abajo y redondear la espalda', alt: ['sentadilla-hack', 'sentadilla-smith', 'prensa-45']
  },
  {
    id: 'sentadilla-hack', name: 'Sentadilla hack', primary: 'cuadriceps', secondary: ['gluteos'],
    cls: 'C2', fatigue: 3, safeFailure: true, equipment: ['maquina'], pattern: 'sentadilla', joints: ['rodilla'],
    cues: ['Pies ligeramente adelantados en la plataforma', 'Baja profundo con espalda pegada', 'Empuja con todo el pie'],
    error: 'Talones despegados', alt: ['sentadilla-pendulo', 'prensa-45', 'sentadilla-smith']
  },
  {
    id: 'sentadilla-smith', name: 'Sentadilla en Smith', primary: 'cuadriceps', secondary: ['gluteos'],
    cls: 'C2', fatigue: 3, safeFailure: true, equipment: ['smith'], pattern: 'sentadilla', joints: ['rodilla'],
    cues: ['Pies un poco por delante de la barra', 'Topes de seguridad puestos', 'Baja vertical controlando 3 s'],
    error: 'Pies demasiado atrás que cargan la rodilla', alt: ['sentadilla-hack', 'prensa-45']
  },
  {
    id: 'sentadilla-pendulo', name: 'Sentadilla péndulo', primary: 'cuadriceps', secondary: ['gluteos'],
    cls: 'C2', fatigue: 3, safeFailure: true, equipment: ['maquina'], pattern: 'sentadilla',
    cues: ['Hombros firmes en las almohadillas', 'Baja hasta el fondo útil', 'Sube sin bloquear'],
    error: 'Rebote abajo', alt: ['sentadilla-hack', 'prensa-45']
  },
  {
    id: 'bulgara', name: 'Sentadilla búlgara', primary: 'cuadriceps', secondary: ['gluteos'],
    cls: 'C1', fatigue: 4, safeFailure: false, equipment: ['mancuernas', 'banco'], pattern: 'sentadilla', unilateral: true, joints: ['rodilla'],
    cues: ['Pie trasero apoyado en el empeine', 'Torso ligeramente inclinado', 'Rodilla delantera sigue al pie'],
    error: 'Paso demasiado corto que manda la rodilla muy al frente', alt: ['zancadas', 'prensa-45']
  },
  {
    id: 'zancadas', name: 'Zancadas caminando', primary: 'cuadriceps', secondary: ['gluteos'],
    cls: 'C1', fatigue: 3, safeFailure: false, equipment: ['mancuernas'], pattern: 'sentadilla', unilateral: true, joints: ['rodilla'],
    cues: ['Paso largo y controlado', 'Rodilla trasera roza el piso', 'Empuja con el talón delantero'],
    error: 'Pasos cortos con rebote', alt: ['bulgara', 'prensa-45']
  },
  {
    id: 'sentadilla-goblet', name: 'Sentadilla goblet', primary: 'cuadriceps', secondary: ['gluteos', 'core'],
    cls: 'C1', fatigue: 3, safeFailure: true, equipment: ['mancuernas'], pattern: 'sentadilla',
    cues: ['Mancuerna pegada al pecho', 'Codos entre las rodillas abajo', 'Torso erguido'],
    error: 'Talones despegados y torso caído', alt: ['prensa-45', 'sentadilla-hack']
  },
  {
    id: 'extension-cuadriceps', name: 'Extensión de cuádriceps', primary: 'cuadriceps', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'extension-rodilla',
    cues: ['Rodilla alineada con el eje de la máquina', 'Aprieta 1 s arriba', 'Baja lento sin soltar'],
    error: 'Patear el peso con impulso', alt: ['sissy-squat']
  },
  {
    id: 'sissy-squat', name: 'Sissy squat', primary: 'cuadriceps', secondary: [],
    cls: 'A', fatigue: 2, safeFailure: true, equipment: ['peso-corporal'], pattern: 'extension-rodilla', joints: ['rodilla'],
    cues: ['Sujétate de algo fijo', 'Rodillas al frente, cadera extendida', 'Baja sólo lo que controles'],
    error: 'Doblar la cadera y convertirlo en sentadilla', alt: ['extension-cuadriceps']
  },

  // ───────────── FEMORALES / GLÚTEO ─────────────
  {
    id: 'peso-muerto-rumano', name: 'Peso muerto rumano', primary: 'femorales', secondary: ['gluteos', 'espalda'],
    cls: 'C1', fatigue: 4, safeFailure: false, equipment: ['barra'], pattern: 'bisagra', joints: ['lumbar'], hinge: true,
    cues: ['Rodillas semiflexionadas y fijas', 'Lleva la cadera atrás, barra pegada a las piernas', 'Baja hasta sentir el femoral, no al piso'],
    error: 'Redondear la espalda buscando más profundidad', alt: ['pdr-mancuernas', 'curl-femoral-tumbado', 'hiperextension']
  },
  {
    id: 'pdr-mancuernas', name: 'Peso muerto rumano con mancuernas', primary: 'femorales', secondary: ['gluteos'],
    cls: 'C1', fatigue: 3, safeFailure: false, equipment: ['mancuernas'], pattern: 'bisagra', joints: ['lumbar'], hinge: true,
    cues: ['Mancuernas rozando los muslos', 'Cadera atrás, espalda neutra', 'Sube apretando glúteos'],
    error: 'Doblar las rodillas en exceso', alt: ['peso-muerto-rumano', 'hiperextension']
  },
  {
    id: 'buenos-dias', name: 'Buenos días con barra', primary: 'femorales', secondary: ['gluteos', 'espalda'],
    cls: 'C1', fatigue: 4, safeFailure: false, equipment: ['barra', 'rack'], pattern: 'bisagra', joints: ['lumbar'], level: 'avanzado', hinge: true,
    cues: ['Barra en trapecio, abdomen bloqueado', 'Bisagra pura de cadera', 'Carga moderada, rango controlado'],
    error: 'Usar carga excesiva', alt: ['peso-muerto-rumano', 'hiperextension']
  },
  {
    id: 'curl-femoral-tumbado', name: 'Curl femoral tumbado', primary: 'femorales', secondary: ['gemelos'],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'flexion-rodilla',
    cues: ['Cadera pegada al banco', 'Rodillas justo fuera del borde', 'Baja 3 s sin dejar caer'],
    error: 'Levantar la cadera para ayudarse', alt: ['curl-femoral-sentado', 'curl-nordico']
  },
  {
    id: 'curl-femoral-sentado', name: 'Curl femoral sentado', primary: 'femorales', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'flexion-rodilla',
    cues: ['Rodillo fijo sobre los muslos', 'Inclínate un poco al frente para más estiramiento', 'Aprieta 1 s abajo'],
    error: 'Rango incompleto', alt: ['curl-femoral-tumbado']
  },
  {
    id: 'curl-nordico', name: 'Curl nórdico (asistido)', primary: 'femorales', secondary: [],
    cls: 'A', fatigue: 3, safeFailure: false, equipment: ['peso-corporal'], pattern: 'flexion-rodilla', joints: ['rodilla'],
    cues: ['Talones anclados, cuerpo recto', 'Baja tan lento como puedas', 'Ayúdate con las manos para subir'],
    error: 'Doblar la cadera', alt: ['curl-femoral-tumbado']
  },
  {
    id: 'hip-thrust', name: 'Hip thrust', primary: 'gluteos', secondary: ['femorales'],
    cls: 'C2', fatigue: 3, safeFailure: true, equipment: ['barra', 'banco'], pattern: 'puente',
    cues: ['Escápulas apoyadas en el banco', 'Barbilla abajo, costillas cerradas', 'Pausa arriba apretando glúteos'],
    error: 'Hiperextender la espalda en lugar de la cadera', alt: ['puente-gluteo', 'hiperextension']
  },
  {
    id: 'hiperextension', name: 'Hiperextensión 45°', primary: 'gluteos', secondary: ['femorales', 'espalda'],
    cls: 'C2', fatigue: 2, safeFailure: true, equipment: ['maquina'], pattern: 'bisagra',
    cues: ['Borde del cojín en la cadera', 'Espalda neutra, mueve sólo la cadera', 'Aprieta glúteos arriba'],
    error: 'Hiperextender la lumbar arriba', alt: ['hip-thrust', 'pdr-mancuernas']
  },
  {
    id: 'puente-gluteo', name: 'Puente de glúteo a una pierna', primary: 'gluteos', secondary: ['femorales'],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['peso-corporal'], pattern: 'puente', unilateral: true,
    cues: ['Talón cerca del glúteo', 'Empuja con el talón', 'Pausa de 2 s arriba'],
    error: 'Arquear la lumbar', alt: ['hip-thrust']
  },
  {
    id: 'abduccion-maquina', name: 'Abducción de cadera en máquina', primary: 'gluteos', secondary: [],
    cls: 'A', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'abduccion-cadera',
    cues: ['Inclina el torso un poco al frente', 'Abre controlado', 'Pausa fuera'],
    error: 'Rebotar las piernas', alt: ['puente-gluteo']
  },

  // ───────────── GEMELOS ─────────────
  {
    id: 'talones-de-pie', name: 'Elevación de talones de pie', primary: 'gemelos', secondary: [],
    cls: 'P', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'flexion-plantar',
    cues: ['Rodillas extendidas sin bloquear', 'Pausa de 2 s en estiramiento abajo', 'Sube a la punta máxima'],
    error: 'Rebotar con medias repeticiones', alt: ['talones-prensa', 'talones-sentado', 'talones-unilateral']
  },
  {
    id: 'talones-sentado', name: 'Elevación de talones sentado', primary: 'gemelos', secondary: [],
    cls: 'P', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'flexion-plantar',
    cues: ['Cojín sobre la parte baja del muslo', 'Estira completo abajo', 'Contracción de 1 s arriba'],
    error: 'Rango corto', alt: ['talones-de-pie', 'talones-prensa']
  },
  {
    id: 'talones-prensa', name: 'Elevación de talones en prensa', primary: 'gemelos', secondary: [],
    cls: 'P', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'flexion-plantar',
    cues: ['Sólo la parte delantera del pie en la plataforma', 'Seguros puestos', 'Empuja con el dedo gordo'],
    error: 'Doblar las rodillas', alt: ['talones-de-pie', 'talones-sentado']
  },
  {
    id: 'talones-unilateral', name: 'Elevación de talón a una pierna', primary: 'gemelos', secondary: [],
    cls: 'P', fatigue: 1, safeFailure: true, equipment: ['peso-corporal'], pattern: 'flexion-plantar', unilateral: true,
    cues: ['En el borde de un escalón', 'Apóyate sólo para equilibrio', 'Baja hasta estirar por completo'],
    error: 'Rebote', alt: ['talones-de-pie']
  },

  // ───────────── CORE ─────────────
  {
    id: 'crunch-polea', name: 'Crunch en polea', primary: 'core', secondary: [],
    cls: 'P', fatigue: 1, safeFailure: true, equipment: ['polea'], pattern: 'flexion-tronco',
    cues: ['Cuerda junto a la cabeza, cadera fija', 'Enrolla la columna llevando costillas a pelvis', 'No tires con los brazos'],
    error: 'Sentarse sobre los talones moviendo la cadera', alt: ['crunch-maquina', 'crunch-suelo']
  },
  {
    id: 'elevacion-piernas-colgado', name: 'Elevación de piernas colgado', primary: 'core', secondary: [],
    cls: 'P', fatigue: 2, safeFailure: true, equipment: ['barra-dominadas'], pattern: 'flexion-tronco',
    cues: ['Sin balanceo, hombros activos', 'Rueda la pelvis hacia arriba', 'Baja controlado'],
    error: 'Sólo levantar piernas con flexores de cadera', alt: ['crunch-inverso', 'crunch-polea']
  },
  {
    id: 'crunch-maquina', name: 'Crunch en máquina', primary: 'core', secondary: [],
    cls: 'P', fatigue: 1, safeFailure: true, equipment: ['maquina'], pattern: 'flexion-tronco',
    cues: ['Ajusta el pecho al cojín', 'Flexiona la columna, no la cadera', 'Exhala al contraer'],
    error: 'Tirar con los brazos', alt: ['crunch-polea']
  },
  {
    id: 'rueda-abdominal', name: 'Rueda abdominal', primary: 'core', secondary: ['espalda'],
    cls: 'P', fatigue: 2, safeFailure: false, equipment: ['peso-corporal'], pattern: 'flexion-tronco', joints: ['lumbar'],
    cues: ['Pelvis en retroversión todo el tiempo', 'Avanza sólo hasta donde mantengas la espalda', 'Vuelve con el abdomen'],
    error: 'Hundir la zona lumbar', alt: ['crunch-polea']
  },
  {
    id: 'crunch-inverso', name: 'Crunch inverso', primary: 'core', secondary: [],
    cls: 'P', fatigue: 1, safeFailure: true, equipment: ['peso-corporal'], pattern: 'flexion-tronco',
    cues: ['Tumbado, rodillas a 90°', 'Despega la pelvis del piso', 'Baja lento'],
    error: 'Impulso con las piernas', alt: ['elevacion-piernas-colgado']
  },
  {
    id: 'crunch-suelo', name: 'Crunch con pausa', primary: 'core', secondary: [],
    cls: 'P', fatigue: 1, safeFailure: true, equipment: ['peso-corporal'], pattern: 'flexion-tronco',
    cues: ['Zona lumbar pegada al piso', 'Pausa de 2 s arriba', 'Mirada al techo'],
    error: 'Tirar del cuello', alt: ['crunch-polea', 'crunch-inverso']
  }
];

export const EXERCISES: Exercise[] = SEEDS.map(mk);

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  const ex = EXERCISE_BY_ID[id];
  if (!ex) throw new Error(`Ejercicio desconocido: ${id}`);
  return ex;
}
