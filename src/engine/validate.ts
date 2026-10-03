import { MUSCLES, MUSCLE_LABEL, PATTERN_LABEL, WEEKDAY_LONG } from '@/data/labels';
import { BIG, SMALL } from './rules';
import type { EngineConfig, Muscle, MuscleVolume, Pattern, PrescribedDay, VolumeBand, Warning } from './types';

export function bandFor(m: Muscle, sets: number): VolumeBand {
  if (SMALL.includes(m)) {
    if (sets < 4) return 'bajo';
    if (sets <= 8) return 'ok';
    return 'alto';
  }
  if (sets < 6) return 'bajo';
  if (sets < 10) return 'minimo';
  if (sets <= 16) return 'optimo';
  return 'excesivo';
}

export const BAND_LABEL: Record<VolumeBand, string> = {
  bajo: 'Bajo',
  minimo: 'Mínimo HD',
  optimo: 'Óptimo',
  excesivo: 'Excesivo',
  ok: 'OK',
  alto: 'Alto'
};

/** Series efectivas semanales: directa = 1, indirecta (secundario) = 0.5. */
export function weeklyVolume(days: PrescribedDay[]): MuscleVolume[] {
  const acc: Record<Muscle, number> = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  for (const d of days) {
    for (const it of d.items) {
      acc[it.exercise.primary] += it.workSets;
      for (const s of it.exercise.secondary) acc[s] += it.workSets * 0.5;
    }
  }
  return MUSCLES.map((m) => ({ muscle: m, sets: acc[m], band: bandFor(m, acc[m]) }));
}

/** Matriz músculo × día. 1 = estímulo directo, 0.5 = indirecto, 0 = nada. */
export function coverageMatrix(days: PrescribedDay[]): Record<Muscle, number[]> {
  const out = {} as Record<Muscle, number[]>;
  for (const m of MUSCLES) {
    out[m] = days.map((d) => {
      if (d.items.some((i) => i.exercise.primary === m)) return 1;
      if (d.items.some((i) => i.exercise.secondary.includes(m))) return 0.5;
      return 0;
    });
  }
  return out;
}

export function spacingWarnings(weekdays: number[]): Warning[] {
  const out: Warning[] = [];
  const sorted = [...weekdays].sort((a, b) => a - b);
  if (new Set(sorted).size !== sorted.length) {
    out.push({ kind: 'espaciado', severity: 'critico', text: 'Dos sesiones caen el mismo día de la semana.' });
    return out;
  }
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const b = sorted[(i + 1) % sorted.length];
    const gap = (b - a + 7) % 7 || 7;
    if (gap < 2) {
      out.push({
        kind: 'espaciado',
        severity: 'aviso',
        text: `${WEEKDAY_LONG[a]} y ${WEEKDAY_LONG[b]} son consecutivos: menos de 48 h de recuperación.`
      });
    }
  }
  return out;
}

/** Recuperación por músculo: avisa si un músculo se entrena directo en días seguidos (<48 h). */
export function muscleSpacingWarnings(days: PrescribedDay[]): Warning[] {
  const out: Warning[] = [];
  const watch: Muscle[] = ['pecho', 'espalda', 'hombros', 'cuadriceps', 'femorales', 'gluteos', 'biceps', 'triceps'];
  for (const m of watch) {
    const wds = [...new Set(days.filter((d) => d.items.some((i) => i.exercise.primary === m)).map((d) => d.day.weekday))].sort((a, b) => a - b);
    if (wds.length < 2) continue;
    for (let i = 0; i < wds.length; i++) {
      const a = wds[i];
      const b = wds[(i + 1) % wds.length];
      if (a === b) continue;
      const gap = (b - a + 7) % 7;
      if (gap === 1) {
        out.push({
          kind: 'espaciado',
          severity: 'aviso',
          text: `${MUSCLE_LABEL[m]}: ${WEEKDAY_LONG[a]} y ${WEEKDAY_LONG[b]} seguidos, menos de 48 h para recuperarse.`
        });
        break;
      }
    }
  }
  return out;
}

export function validatePlan(days: PrescribedDay[], config: EngineConfig): { weekly: MuscleVolume[]; coverage: Record<Muscle, number[]>; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const weekly = weeklyVolume(days);
  const coverage = coverageMatrix(days);

  // Tiempo
  for (const d of days) {
    if (d.overBudget) {
      warnings.push({
        kind: 'tiempo',
        severity: 'critico',
        dayId: d.day.id,
        text: `${d.name}: ${Math.ceil(d.seconds / 60)} min, pasa de ${Math.round(config.budget / 60)}. Usa "Optimizar".`
      });
    } else if (d.suggestion) {
      warnings.push({ kind: 'tiempo', severity: 'info', dayId: d.day.id, text: `${d.name}: ${d.suggestion.text}.` });
    }
  }

  // Cobertura: músculos grandes ≥2 exposiciones/semana
  for (const m of BIG) {
    const exp = coverage[m].reduce((a, b) => a + b, 0);
    if (exp < 2) {
      warnings.push({
        kind: 'cobertura',
        severity: 'aviso',
        text: `${MUSCLE_LABEL[m]} recibe ${exp.toString()} ${exp === 1 ? 'exposición' : 'exposiciones'} por semana (meta ≥2).`
      });
    }
  }

  // Volumen
  for (const v of weekly) {
    if (v.band === 'bajo' && (BIG.includes(v.muscle) || SMALL.includes(v.muscle))) {
      if (v.muscle === 'core') continue;
      warnings.push({
        kind: 'volumen',
        severity: 'info',
        text: `${MUSCLE_LABEL[v.muscle]}: ${fmtSets(v.sets)} series/semana, volumen bajo.`
      });
    }
    if (v.band === 'excesivo') {
      warnings.push({ kind: 'volumen', severity: 'aviso', text: `${MUSCLE_LABEL[v.muscle]}: ${fmtSets(v.sets)} series/semana, más de lo que se recupera en HD.` });
    }
  }

  // Fatiga y redundancia por día
  for (const d of days) {
    if (d.fatigue > config.fatigueLimit) {
      warnings.push({ kind: 'fatiga', severity: 'aviso', dayId: d.day.id, text: `${d.name}: fatiga ${d.fatigue}/${config.fatigueLimit}. Considera un compuesto guiado.` });
    }
    const heavy = d.items.filter((i) => i.exercise.fatigue >= 5);
    if (heavy.length >= 2) {
      warnings.push({
        kind: 'fatiga',
        severity: 'aviso',
        dayId: d.day.id,
        text: `${heavy.map((h) => h.exercise.name).join(' + ')} el mismo día: carga sistémica y lumbar muy alta.`
      });
    }
    const patterns = new Map<Pattern, number>();
    for (const it of d.items) patterns.set(it.exercise.pattern, (patterns.get(it.exercise.pattern) ?? 0) + 1);
    for (const [p, n] of patterns) {
      if (n >= 3) {
        warnings.push({ kind: 'redundancia', severity: 'aviso', dayId: d.day.id, text: `${d.name}: ${n} ejercicios de ${PATTERN_LABEL[p].toLowerCase()}. Cambia uno por otro patrón.` });
      }
    }
    for (const adj of d.adjustments) {
      if (adj.kind === 'substitute' || adj.kind === 'drop-unavailable') {
        warnings.push({ kind: 'equipo', severity: 'info', dayId: d.day.id, text: adj.text });
      }
    }
  }

  // Días con ejercicios distintos (sólo si el split lo pide, p. ej. Heavy Duty)
  const seen = new Map<string, string>();
  if (config.distinctDays !== false)
  for (const d of days) {
    for (const it of d.items) {
      const prev = seen.get(it.exercise.id);
      if (prev && prev !== d.day.id) {
        warnings.push({ kind: 'redundancia', severity: 'aviso', text: `${it.exercise.name} aparece en más de un día. En este split cada día lleva ejercicios distintos.` });
      }
      seen.set(it.exercise.id, d.day.id);
    }
  }

  const weekdays = days.map((d) => d.day.weekday);
  if (config.restRule === 'musculo') {
    if (new Set(weekdays).size !== weekdays.length) {
      warnings.push({ kind: 'espaciado', severity: 'critico', text: 'Dos días del split caen el mismo día de la semana.' });
    }
    warnings.push(...muscleSpacingWarnings(days));
  } else {
    warnings.push(...spacingWarnings(weekdays));
  }
  return { weekly, coverage, warnings };
}

export function fmtSets(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
