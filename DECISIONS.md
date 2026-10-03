# DECISIONS.md

Decisiones no especificadas en el brief (o donde el brief deja margen), con el motivo.

## Motor

| # | Decisión | Motivo |
|---|----------|--------|
| 1 | **Las series no se guardan en la plantilla.** El motor parte de 1 serie efectiva por ejercicio y rellena hasta 38-40 min según el orden del brief. El usuario puede *fijar* series (1-3) por ejercicio. | Así el recálculo es completo y determinista (regla 4): el resultado depende sólo de los ejercicios, el orden, el modo y el perfil, no del estado anterior. Los números de la sección 6 son lo que el motor produce aproximadamente. |
| 2 | **Reps objetivo para estimar tiempo = mitad del rango redondeada hacia arriba** (8-12 → 10). | Usar el tope sobreestima y el mínimo subestima. |
| 3 | **Los ejercicios `optional` compiten en el paso (3) del relleno**, ordenados por déficit de volumen semanal junto con las 2ª series de aislamientos. | Un opcional de un músculo con déficit (p. ej. extensión de cuádriceps) aporta más que la 2ª serie de un músculo ya cubierto. El paso (4) "sugerir ejercicio extra" sigue siendo sólo una sugerencia: el motor nunca añade ejercicios que el usuario no puso. |
| 4 | **Recortes automáticos (1-3) sí; quitar un ejercicio (4) nunca.** Los recortes aplicados se explican en la línea de cambio; si no bastan, el día queda marcado en rojo y el botón **Optimizar** muestra antes/después. | "Nunca recortes en silencio" + "el motor lo garantiza o avisa claramente". |
| 5 | **HD Puro: transición entre ejercicios = descanso de clase del siguiente** (mín. 45 s) y **+1 aproximación (Yates)** en el compuesto principal. | Con 1 serie por ejercicio y 45 s de transición la sesión se queda en ~24 min; Mentzer pedía recuperar entre ejercicios y Yates hacía 2-3 aproximaciones. Con esto y los opcionales, Puro estima 37-38 min. |
| 6 | **HD Puro**: todo al fallo, 6-10 reps (gemelos/core conservan 12-20 / 10-15). Técnica por defecto: rest-pause (2 mini) en aislamientos y negativas en máquinas. | Fidelidad a Mentzer sin forzar gemelos a rangos bajos. |
| 7 | **Calentamientos**: C1 principal 2 (60%, 80%; +40% si fatiga 5); C2 principal 1 (+60% si fatiga ≥3); compuesto secundario 1 (recortable); aislamiento 1 ligera sólo si es el primero de su músculo; P y compuesto pre-agotado 0. | Concreta el "1-2 series" del brief y reproduce el ejemplo "Prensa → Sentadilla libre = +1 calentamiento". |
| 8 | **Técnica de intensidad en Adaptado**: rest-pause (2 mini-series) en la última serie de aislamientos con fallo seguro. Fast-40: 1 mini-serie sólo si el aislamiento no va en par. | El brief "permite" técnica en la última serie de A; se presupuesta para no romper los 40 min. |
| 9 | **Fast-40** empareja pecho↔espalda y bíceps↔tríceps dentro del día (el segundo del par se ejecuta junto al primero). Excluye fatiga 5 y pares de pre-agotamiento. "90 s al terminar el par" = 90 s tras cada ronda A+B. | Interpretación literal más útil. |
| 10 | **Pre-agotamiento**: el par aislamiento+compuesto queda fijo en 1+1 series y el compuesto no lleva calentamiento. | Así lo hacía Mentzer; el músculo ya está caliente. |
| 11 | **Prioridad**: 4 = compuesto principal de músculo grande, 3 = músculo prioritario, 2 = resto, 1 = brazos/gemelos/core. Empates → el que va más tarde en el día es menos prioritario. | Orden del brief. |
| 12 | **Fatiga por sesión = suma del coste de cada ejercicio** (no × series). Aviso extra si hay ≥2 ejercicios de fatiga 5 el mismo día. | Simple y predecible; el caso "peso muerto + sentadilla libre" queda cubierto. |
| 13 | **Volumen semanal**: primario = 1, secundario = 0.5 por serie efectiva. Bandas grandes: <6 bajo, 6-9 mínimo HD, 10-16 óptimo, >16 excesivo; brazos/gemelos/core: <4 bajo, 4-8 ok, >8 alto. | Brief + bandas para pequeños donde el brief sólo daba "ok 4-8". |
| 14 | **Sustitución por equipo/lesión/nivel**: primero alternativas del mismo músculo, luego catálogo del mismo músculo y clase cercana, luego alternativas de otro músculo; nunca un ejercicio ya usado en la semana. Si no hay ninguno, el ejercicio se descarta con aviso. | "Sin equipo" no rompe la rutina. |
| 15 | **Lesiones** se modelan como articulaciones cargadas por ejercicio (hombro, codo, muñeca, lumbar, rodilla, cadera). | Permite excluir sin una base médica compleja. |
| 16 | **Plantilla**: Día 3 incluye *Curl femoral sentado* como fijo y opcionales de relleno en los 3 días (extensión de cuádriceps, pullover, elevación de piernas, crunch). Día 2 usa *Remo en máquina* (no barra) tras el peso muerto rumano. | Sin femorales el día 3, femorales tendría 1 exposición semanal (falla la validación de cobertura). Remo en máquina reduce la carga lumbar acumulada. |
| 17 | **Readiness** = (sueño + energía + (6 − molestias)) / 3. Bajo si < 2.75 o sueño/energía = 1. Molestias ≥ 4 sugiere cambiar ejercicios. Conservador = sólo el paso (1) del relleno, sin opcionales, +1 RIR, sin técnicas. | El brief no daba fórmula. |
| 18 | **Doble progresión**: sube si *todas* las series a la carga máxima llegan al tope con el esfuerzo objetivo o más duro. Barra/máquina +2.5 sup / +5 inf; mancuernas +1 / +2 kg; tope ~5 %. Bajo el mínimo → −7.5 %. | Concreta "2-5 %". |
| 19 | **Estancamiento** = 3 sesiones seguidas sin superar el mejor e1RM previo (se necesitan ≥4 sesiones). | |
| 20 | **Descarga**: −40 % series (redondeo, mínimo 1), −10 % carga y modo conservador. Se planifica por semana (lunes). | |

## Producto / UI

| # | Decisión | Motivo |
|---|----------|--------|
| 21 | Perfil, ajustes y rutina en **Zustand + localStorage**; historial, medidas y readiness en **Dexie/IndexedDB**. La sesión en vivo también persiste (puedes recargar o salir y volver; el resumen sobrevive a recargas). | Pequeño y síncrono vs. creciente. |
| 22 | La sesión en vivo guarda una **instantánea** de la prescripción al iniciar. | Editar la rutina a mitad no altera la sesión en curso. |
| 23 | **Recorte en vivo** (> 2 min atrasado y proyección > 40 min): quita calentamientos de ejercicios secundarios y luego series extra de menor prioridad, nunca la serie en curso. | Mismo orden que el motor. |
| 24 | **Reprogramar** mueve una sesión sólo esa semana (override por semana); los días fijos se cambian en Ajustes. | |
| 25 | Formato numérico **es-MX**: punto decimal, coma de miles. | Idioma pedido. |
| 26 | Tres temas: **Forja** (oscuro, por defecto), **Hueso** (claro) y **Alto contraste**. Tokens semánticos como variables CSS. | "Tema" en ajustes. |
| 27 | **Datos de ejemplo** (6 semanas) disponibles en Progreso/Ajustes. | Explorar gráficas sin entrenar semanas. |
| 28 | Unidades fijas en kg. | El brief pide kg. |
| 29 | Iconos Lucide; logotipo y mapa muscular en SVG propio (figura facetada, "forjada"). | Brief. |

## Fase 1 y 1.5 (mejoras)

| # | Decisión | Motivo |
|---|----------|--------|
| 30 | **Tiempo disponible configurable** (15-120 min) en Ajustes y por sesión en el readiness; el motor usa `budget` y `target = budget − 2 min`. | Petición del usuario: no todos tienen 40 min. |
| 31 | **Cadencia por defecto 2-0-4** (6 s/rep) y configurable; el modelo de tiempo usa `secPerRep` de la cadencia. | Pedido explícito; las plantillas siguen cabiendo en 36-40 min. |
| 32 | **Rango de reps global** opcional que reemplaza el de clase, salvo gemelos y core. | Pedido (6-10 configurable) sin romper los rangos altos de músculos pequeños. |
| 33 | Si el usuario configura su **incremento de carga**, se aplica tal cual (sin el tope automático de 5 %). Mancuernas: ~40 % por mancuerna, mínimo 1 kg. | Respetar la configuración explícita. |
| 34 | **Split ≠ estilo.** El split decide qué días y ejercicios; el estilo decide series, reps, esfuerzo y descansos. Cualquier split funciona con cualquier estilo. | Que la app sirva más allá de Heavy Duty sin duplicar lógica. |
| 35 | Estilos nuevos: **Hipertrofia clásica** (3 series base hasta 4, 8-12 / aislamientos 10-15, 1-2 RIR, descansos 45-120 s, tope 10 series/músculo/sesión) y **Personalizado** (series, reps, esfuerzo, descansos y calentamientos fijados por el usuario; no rellena). | Pedido del usuario. |
| 36 | 9 **splits prearmados** + **split personalizado** (nombre, 1-7 días con nombre y día de la semana). Se guardan varios splits y se cambia entre ellos; `routine` es siempre la del split activo. | Pedido del usuario. |
| 37 | **Recuperación según el split**: Heavy Duty mantiene ≥48 h entre sesiones; los demás avisan por **músculo** (mismo músculo en días seguidos). La regla de "ejercicios distintos cada día" sólo aplica a Heavy Duty. | Un PPL 6 días entrena días seguidos sin problema. |
| 38 | Racha, XP y medallas: **semana completa = todos los días del split**. | Coherencia con splits de 2 a 7 días. |
| 39 | Los nombres de los días del split HD se regeneran por músculos al editar; los de los demás splits los conserva el usuario. | Compatibilidad con el comportamiento previo. |
| 40 | Migración v3 del almacenamiento: la rutina existente se convierte en el split "Heavy Duty 3 días". | No perder la rutina del usuario. |

## Fase 2 y 3 (diseño y animación)

| # | Decisión | Motivo |
|---|----------|--------|
| 41 | Paleta Forja en **gris oscuro** (#121215) en lugar de casi negro; bordes de control en `line2` ≥3:1; verificador `npm run contrast`. | Pedido (no negro puro) y WCAG 1.4.3 / 1.4.11. |
| 42 | HOY con **divulgación progresiva**: lo esencial visible, el resto en secciones colapsables. | Pedido; escaneable en menos de 2 s. |
| 43 | **Glass** sólo en navegación y modales, con 78 % de opacidad (sólido en Alto contraste). | Pedido, sin sacrificar contraste. |
| 44 | Migración de `framer-motion` a **`motion`** (`motion/react`): misma API, bundle 130 → 109 KB. | Pedido y aprobado. |
| 45 | Efectos tipo Magic UI / React Bits (border beam, text reveal, tilt) **escritos a mano** en `components/Motion.tsx` y CSS, sin instalar shadcn. | Evitar que el CLI de shadcn reescriba Tailwind y estilos; aprobado. |
| 46 | **Sin Lottie**: los íconos animados se hacen con SVG + motion/CSS. | Peso de la librería y falta de archivos de animación; aprobado. |
| 47 | Interacción < 300 ms (tokens en `lib/motion.ts`); celebraciones y revelado de datos pueden durar más porque no bloquean nada. El registro de una serie ocurre antes de cualquier animación. | Regla del brief: la velocidad importa más que el adorno. |
| 48 | El feedback de "serie hecha" (onda, chispas, check) vive en una capa fija para no desmontarse al pasar a descanso. | Que la animación se vea completa sin retrasar el flujo. |

## Fase 4 y 5 (motivación y app nativa)

| # | Decisión | Motivo |
|---|----------|--------|
| 49 | XP sólo por lo que construye el hábito (serie efectiva, récord, sesión dentro del tiempo, semana completa del split) y 6 rangos; nunca resta. | Motivar sin castigar. |
| 50 | **Congelador de racha**: 1 por cada 4 semanas completas; una semana congelada no rompe la racha. | Vacaciones o enfermedad no deben borrar meses de constancia. |
| 51 | Resumen semanal y celebración mensual se muestran **una sola vez** (`seenRecaps`). | Recompensa en capas sin ruido. |
| 52 | Confeti con `canvas-confetti` (aprobado) sólo en hitos: récords, medallas, rango, mes completo. | Que celebrar siga significando algo. |
| 53 | Compartir genera una **imagen 1080×1350** en canvas con la estética Forja; si el navegador no comparte archivos, copia el texto y descarga la imagen. | Funciona en iOS, Android y escritorio sin servidor. |
| 54 | Instalación guiada (Android: aviso nativo; iOS: pasos de "Agregar a inicio"), atajos del manifest y aviso de conexión. | Sentirse como app nativa sin tienda. |

## Fase 6 (progreso y datos)

| # | Decisión | Motivo |
|---|----------|--------|
| 55 | El motor y la base de datos **siempre guardan kg**; las libras son sólo de presentación (`lib/units.ts`). Redondeo al mostrar: 0.5 kg / 1 lb (0.5 lb en cargas < 20 lb). | Cambiar de unidad no altera el historial ni los cálculos. |
| 56 | En libras se usan los discos estándar (45/35/25/10/5/2.5) y barra de 45 lb; al cambiar de unidad, la barra y los incrementos por defecto pasan a su equivalente redondo (20 kg ↔ 45 lb, 2.5/5 kg ↔ 5/10 lb). | Evitar valores raros como 5.5 lb. |
| 57 | Gráfica por ejercicio con 4 métricas (1RM estimado, peso máximo, reps máximas, volumen) y volumen por sesión. | Pedido: ver el progreso desde distintos ángulos. |
| 58 | **Fotos de progreso** en IndexedDB (tabla `photos`, Dexie v2), comprimidas a 1080 px JPEG 0.8; **no** se incluyen en el respaldo JSON ni en el CSV. | Privacidad y tamaño; nunca salen del dispositivo. |
| 59 | CSV de series (una fila por serie, con columna `unidad`) y CSV de cuerpo. Importar **suma** sesiones (no reemplaza), omite repetidas (misma fecha y día), reconoce ejercicios por id o por nombre, acepta `,` o `;` y recalcula volumen, músculos y récords. | Abrir los datos en Excel/Sheets o traerlos de otra app. |
| 60 | El respaldo JSON (v2) ahora incluye splits, semanas congeladas y resúmenes vistos; los respaldos viejos sin splits colocan su rutina en el split activo. | Un respaldo debe restaurar todo. |
| 61 | **Modo calma** (sin animaciones, confeti ni brillos; brasa atenuada) y volumen maestro de sonido. | Accesibilidad y preferencias de sensibilidad. |

