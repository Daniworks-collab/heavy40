# HEAVY·40 — Plan de arquitectura

PWA mobile-first, 100 % local/offline, para hipertrofia Heavy Duty en sesiones de ≤40 min, 3 días/semana.

## Capas

```
src/
├── data/           Catálogo de ejercicios (seed), plantillas por defecto, músculos, textos del método
├── engine/         TypeScript puro (sin React, sin DOM). Testeado con Vitest.
│   ├── types.ts        Tipos de dominio
│   ├── rules.ts        Reglas por clase y modo (reps, RIR, descanso, calentamientos)
│   ├── time.ts         Modelo de tiempo (segundos por bloque)
│   ├── prescribe.ts    Ejercicio elegido → prescripción completa
│   ├── budget.ts       Ajuste al presupuesto de 40 min (añadir/quitar con prioridades)
│   ├── validate.ts     Cobertura, volumen, fatiga, redundancia, espaciado
│   ├── recalc.ts       Recalcular rutina + diff explicado en una línea
│   ├── progression.ts  Doble progresión, e1RM, PRs, estancamiento, descarga
│   ├── readiness.ts    Readiness → modo conservador
│   └── __tests__/      Tests obligatorios
├── db/             Dexie (IndexedDB): sesiones registradas, medidas, readiness
├── store/          Zustand persistido (perfil, ajustes, rutina) + estado de sesión en vivo
├── components/     UI reutilizable (anillos, contadores, mapa muscular, sheets, botones resorte…)
├── screens/        Onboarding, Hoy, Entrenar, Rutina, Biblioteca, Progreso, Método, Calendario, Nutrición, Ajustes
├── hooks/          Wake Lock, audio (Web Audio), vibración, reduced-motion, timers
└── lib/            Formateo, fechas, export/import
```

## Modelo de datos

### Catálogo (`Exercise`)
`id, name, primary: Muscle, secondary: Muscle[] (peso 0.5), cls: 'C1'|'C2'|'A'|'P', fatigue 1-5,
safeFailure: bool, repRange: [min,max], rest (s), equipment: Equipment[], unilateral, pattern: Pattern,
cues: [3], commonError, alternatives: id[], level?: 'advanced', lowerBody`.

### Rutina (`Routine`)
```
Routine { mode: Mode; days: DayPlan[3] }
DayPlan { id, name, weekday (0-6), slots: Slot[] }
Slot    { uid, exerciseId, sets (efectivas, petición del usuario), preExhaustWith?: uid, optional? }
```
El usuario sólo edita **qué** ejercicios y en qué orden (y opcionalmente series). Todo lo demás lo deriva el motor.

### Prescripción (salida del motor, nunca se persiste como fuente de verdad)
```
PrescribedExercise { slot, exercise, workSets, warmups: WarmupSet[], reps:[min,max], effort: 'fallo'|'1 RIR'|'2 RIR',
                     rest, technique?: 'rest-pause'|'negativas'|'pre-agotamiento', tempo, seconds, priority }
PrescribedDay { day, items, seconds, fatigue, notes[], adjustments: Adjustment[] }
PlanResult { days, weekly: VolumeByMuscle, coverage: matriz, warnings: Warning[] }
```

### Registro (Dexie)
```
sessions   { id, date, dayId, durationSec, readiness, sets: LoggedSet[], prs[] }
LoggedSet  { exerciseId, kind: 'warmup'|'work', kg, reps, effort, technique? }
body       { id, date, weightKg, waist?, chest?, arm?, thigh? }
readiness  { id, date, sleep, energy, pain, score }
```
Perfil, ajustes y rutina viven en Zustand con `persist` (localStorage) porque son pequeños y síncronos;
el historial va a IndexedDB porque crece. Export/import JSON combina ambos.

## Motor — flujo

1. `prescribe(slot, ctx)` aplica reglas de clase/modo → reps, esfuerzo, descanso, calentamientos, técnica.
2. `estimateDay()` suma el modelo de tiempo.
3. `fitBudget()` añade/quita en el orden de prioridad del brief hasta quedar en 38-40 min.
   El ajuste automático sólo añade relleno y aplica recortes "suaves" (1-3); quitar un ejercicio
   (paso 4) nunca es automático: se propone con el botón **Optimizar** (vista antes/después).
4. `validatePlan()` → cobertura, volumen semanal, fatiga, redundancia, espaciado.
5. `recalc(prev, next)` → diff legible ("Cambiaste X por Y → …").

## UI

- Router con tab bar inferior (móvil) / sidebar (≥1024 px).
- Framer Motion: `AnimatePresence` entre rutas, `layoutId` tarjeta→detalle, resortes en botones.
- Entrenamiento en vivo: máquina de estados en Zustand (no persiste el reloj sino timestamps → sobrevive recargas).

## Verificación
`npm test` (motor), `npm run build` (tsc strict + vite), capturas en 390×844 y escritorio.
