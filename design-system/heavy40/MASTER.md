# HEAVY·40 — Design System (MASTER)

Fuente de verdad visual. Generado a partir de **UI/UX Pro Max** (`--design-system "fitness workout tracker dark intense" --variance 8 --motion 7 --density 6`) y adaptado al concepto "Forja" del brief.

## Dirección
- **Estilo base (plugin):** Vibrant & Block-based + Dark OLED (producto *Fitness/Gym App*), con acento **brutalista industrial** (variance 8): esquinas duras, retícula visible, bloques grandes, tipografía condensada 700+.
- **Concepto propio:** "Forja" — carbón, acero, hueso y un único acento brasa.
- **Desviaciones conscientes del plugin:** se conserva la paleta del brief (brasa #FF4A1C en vez de naranja #F97316 + verde), y Big Shoulders Display en vez de Barlow Condensed (mismo carácter condensado deportivo; ya autoalojada).

## Tokens
| Rol | Forja (oscuro, gris — no negro puro) | Hueso (claro) |
|---|---|---|
| bg | #121215 | #EDE6DA |
| surface | #1C1D21 | #E4DCCE |
| raised (controles) | #27292E | #DBD2C2 |
| line (decorativo) | #36393F | #C4BAA8 |
| line2 (bordes de control, ≥3:1) | #70757D | #787062 |
| fg | #EDE6DA | #121213 |
| muted (AA ≥4.5:1) | #A8ACB4 | #58544D |
| ember | #FF4D1F | #D0340C |

Contraste verificado con `npm run contrast` (36 comprobaciones en 3 temas).

Radios: `sm 3 · DEFAULT 4 · md 5 · lg 7 · xl 8 · 2xl 10` px. Botón principal sin radio: **placa biselada** (clip-path, 12 px).

## Fase 2
- **Glassmorphism sólo en acentos**: `.glass` (78 % de opacidad + blur 18 px) en barra de navegación, sidebar y modales; sólido en Alto contraste.
- **HOY con divulgación progresiva**: mensaje motivador, entrenamiento de hoy con anillo y botón de 72 px, racha semanal; sesión, tiempo, otros días y avisos en secciones colapsables.
- **Progreso en bento grid**: rango 2×2, métricas 1×1, frecuencia 2×1, actividad por músculo 2×2; una columna en móvil.
- **Números grandes**: steppers de carga/reps a 52 px con botones de 64 px.

## Componentes firma
- `.card-forge` — tarjeta con marcas de registro brasa en esquinas opuestas (héroes, rango, sesión en vivo).
- `.btn-ember` — placa de acero biselada; el brillo va en un contenedor (`drop-shadow`) porque el clip lo recorta.
- `.hazard` / `.hazard-ember` — franja de peligro diagonal para avisos (48 h, descarga).
- `.grid-bg` — retícula de 24 px con desvanecido radial.
- `.text-outline` — marca de agua tipográfica contorneada (títulos de página, número de día, "40").
- Barra de prioridad izquierda de 3 px en listas de ejercicios (brasa = compuesto principal).
- `PlanBar` — presupuesto de 40:00 en bloques a escala, uno por ejercicio.

## Gamificación (anti-patrón del plugin: "No gamification")
Rangos Hierro → Acero → Acero templado → Titanio → Tungsteno → Forjado. XP: serie efectiva +10, récord +50, sesión ≤40:00 +25, semana completa +100. 8 medallas hexagonales. Ver `src/lib/rank.ts`.

## Interacción
- Feedback de toque `.press` (scale .97, 120 ms) en chips, botones y pestañas; sin desplazar el layout.
- Vibración sólo en confirmaciones (serie hecha, fin de descanso).
- Zonas táctiles ≥44 px; iconos Lucide con `aria-hidden` junto a texto.
- `prefers-reduced-motion` respetado (MotionConfig + CSS).

## Checklist pre-entrega (pro-rules del plugin)
- [x] Sin emojis como iconos; una sola familia (Lucide) con trazo 2
- [x] Estados de pulsación sin saltos de layout
- [x] Tokens semánticos por tema (Forja / Hueso / Alto contraste)
- [x] Contraste de texto ≥4.5:1 en ambos temas (Lighthouse a11y 100)
- [x] Áreas seguras en tab bar y CTA fijas
- [x] Sin scroll horizontal en 360-430 px
