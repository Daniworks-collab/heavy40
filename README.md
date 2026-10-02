# HEAVY·40

PWA mobile-first para hipertrofia **Heavy Duty** (Mentzer / Yates) en sesiones de **máximo 40 minutos**, **3 días por semana**. Español (México), kg, 100 % local y offline.

## Cómo correr

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests del motor (Vitest)
npm run build      # tsc estricto + build + service worker
npm run preview    # sirve dist/ (para probar la PWA offline)
```

Requiere Node 18+. No hay backend ni cuentas: todo vive en el navegador (localStorage + IndexedDB). Exporta/importa JSON en **Ajustes**.

## Publicación (GitHub Pages)

Cada `push` a `main` ejecuta `.github/workflows/deploy.yml`: instala dependencias, corre los tests, compila con `VITE_BASE=/<nombre-del-repo>/` y publica `dist/` en GitHub Pages (con `404.html` para que funcionen las rutas profundas). La app queda en `https://<usuario>.github.io/<repo>/` y se puede instalar como app desde el navegador del teléfono ("Agregar a pantalla de inicio").

Cada persona guarda sus datos sólo en su propio dispositivo; no hay servidor ni cuentas.

## Estructura

```
src/
├── data/            exercises.ts (77 ejercicios), templates.ts (plantilla por defecto), labels.ts
├── engine/          motor puro en TypeScript, sin UI
│   ├── rules.ts         reglas por clase y modo, calentamientos, técnicas, prioridad
│   ├── time.ts          modelo de tiempo y timeline de la sesión
│   ├── plan.ts          planDay(): disponibilidad, relleno y recortes a 40 min
│   ├── validate.ts      volumen, cobertura, fatiga, redundancia, espaciado
│   ├── recalc.ts        computePlan(), diff explicado, applyProposal() (Optimizar)
│   ├── progression.ts   doble progresión, e1RM, PRs, estancamiento, calibración, descarga
│   ├── readiness.ts     readiness → modo conservador
│   └── __tests__/       48 tests
├── store/           app.ts (perfil, rutina, ajustes; recalcula y guarda el diff), live.ts (sesión en vivo)
├── db/              Dexie: sesiones, medidas, readiness
├── components/      Ring, NumberTicker, Sheet, Stepper, MuscleMap, Fx (onda de choque, chispas), PlanWidgets, Chart…
├── screens/         Onboarding, Today, Workout, Routine, Library, Progress, Method, Calendar, Nutrition, Settings, More
├── hooks/ lib/      wake lock, reloj, audio/vibración, fechas, agenda, datos de ejemplo
PLAN.md              arquitectura y modelo de datos
DECISIONS.md         decisiones tomadas donde el brief dejaba margen
```

## Cómo ajustar el motor

Todo lo numérico está en tres archivos:

- **`src/engine/rules.ts`**
  - `classRule()` — rango de reps, esfuerzo y descanso por clase (C1/C2/A/P) y modo.
  - `warmupsFor()` — cuántas aproximaciones y a qué %.
  - `techniqueFor()` — qué técnica de intensidad se presupuesta por modo.
  - `priorityFor()` — prioridad para relleno/recorte.
  - `DEFAULT_REST`, `ANTAGONISTS` (pares de Fast-40).
- **`src/engine/time.ts`** — constante `TIME` (40 s por serie de calentamiento, 5 s por rep, 45 s de transición, 15 s de pre-agotamiento, 60/90 s en pares…) y `targetReps()`.
- **`src/engine/plan.ts`** — `DEFAULT_CONFIG` (presupuesto 2400 s, objetivo 2280 s, fatiga 24) y el orden de pasos de relleno/recorte dentro de `planDay()`.

Para añadir un ejercicio: una entrada en `SEEDS` de `src/data/exercises.ts` (clase, fatiga, fallo seguro, equipo, patrón, articulaciones, 3 cues, error común, alternativas). El rango de reps y el descanso se derivan de la clase.

Tras cualquier cambio: `npm test`. El test `templates.test.ts` comprueba que la plantilla por defecto estima 36-40 min en los 3 modos.

## Lo que hace

- **Hoy**: sesión del día con anillo de tiempo, readiness check (3 preguntas), racha, cuenta regresiva, aviso de <48 h, "Iniciar entrenamiento".
- **Entrenar**: reloj 40:00 con ritmo adelantado/atrasado, tarjeta deslizable por ejercicio, carga sugerida (doble progresión), steppers kg/reps, esfuerzo (fallo/1 RIR/2+), calentamientos diferenciados, temporizador circular con ±15 s, aviso a 10 s con sonido y vibración, metrónomo de tempo, panel post-fallo (rest-pause con cuenta de 15 s, negativas, forzadas, drop set), recorte de un toque si vas >2 min atrasado, Wake Lock, PRs en vivo con chispas, resumen con mapa muscular.
- **Mi rutina**: 3 días, cambiar ejercicio (bottom sheet filtrado), drag & drop, fijar series, opcionales, recálculo en vivo con "qué cambió y por qué", barra de tiempo, alertas, volumen semanal por bandas, matriz de cobertura, **Optimizar** con antes/después.
- **Biblioteca**, **Progreso** (e1RM, volumen semanal, PRs, próxima carga, estancamiento, peso y medidas, historial), **Método** (principios, ciencia con referencias, nota honesta, glosario, FAQ), **Recuperación** (calendario, reprogramar, planificador de descarga, tendencia de readiness), **Nutrición** (proteína, hidratación, sueño), **Ajustes** (modo, descansos, calentamiento general, días, sonido/vibración/metrónomo, tema, perfil, equipo, lesiones, exportar/importar, datos de ejemplo, borrar).

## Aviso

HEAVY·40 no sustituye consejo médico ni a un entrenador. Con 40 min × 3 días el volumen semanal es moderado; la app lo muestra y no promete resultados.
