import { useApp, withDefaults } from '@/store/app';

export type Unit = 'kg' | 'lb';
export const KG_PER_LB = 0.45359237;

export function toUnit(kg: number, u: Unit): number {
  return u === 'kg' ? kg : kg / KG_PER_LB;
}
export function fromUnit(v: number, u: Unit): number {
  return u === 'kg' ? v : v * KG_PER_LB;
}

/** Redondeo amable para mostrar: kg a 0.5, lb a 1 (o 0.5 en cargas ligeras). */
export function roundDisplay(v: number, u: Unit): number {
  if (u === 'kg') return Math.round(v * 2) / 2;
  return v < 20 ? Math.round(v * 2) / 2 : Math.round(v);
}

export function fmtNum(v: number): string {
  return Number.isInteger(v) ? v.toLocaleString('es-MX') : v.toLocaleString('es-MX', { maximumFractionDigits: 1 });
}

export function fmtLoad(kg: number, u: Unit, withUnit = true): string {
  const v = roundDisplay(toUnit(kg, u), u);
  return withUnit ? `${fmtNum(v)} ${u}` : fmtNum(v);
}

/** Paso del stepper de carga en la unidad elegida. */
export function loadStepIn(stepKg: number, u: Unit): number {
  if (u === 'kg') return stepKg;
  return stepKg <= 1 ? 2.5 : 5;
}

/** Discos estándar por unidad. */
export const PLATES_LB = [45, 35, 25, 10, 5, 2.5];

export interface UnitsApi {
  unit: Unit;
  label: Unit;
  toDisp: (kg: number) => number;
  fromDisp: (v: number) => number;
  fmt: (kg: number, withUnit?: boolean) => string;
}

export function useUnits(): UnitsApi {
  const unit = withDefaults(useApp((s) => s.settings)).units;
  return {
    unit,
    label: unit,
    toDisp: (kg) => roundDisplay(toUnit(kg, unit), unit),
    fromDisp: (v) => fromUnit(v, unit),
    fmt: (kg, withUnit = true) => fmtLoad(kg, unit, withUnit)
  };
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.01;

/** Al cambiar de unidad, la barra y los incrementos por defecto pasan a sus equivalentes redondos. */
export function unitSwitch(next: Unit, st: { barKg: number; increments: { upper: number; lower: number } }) {
  const map = (v: number, kg: number, lb: number) => (next === 'lb' && near(v, kg) ? lb * KG_PER_LB : next === 'kg' && near(v, lb * KG_PER_LB) ? kg : v);
  return {
    units: next,
    barKg: map(st.barKg, 20, 45),
    increments: { upper: map(st.increments.upper, 2.5, 5), lower: map(st.increments.lower, 5, 10) }
  };
}
