# HEAVY·40 — Design System (MASTER)

Fuente de verdad visual. Generado a partir de **UI/UX Pro Max** (`--design-system "fitness workout tracker dark intense" --variance 8 --motion 7 --density 6`) y adaptado al concepto "Forja" del brief.

## Dirección
- **Estilo base (plugin):** Vibrant & Block-based + Dark OLED (producto *Fitness/Gym App*), con acento **brutalista industrial** (variance 8): esquinas duras, retícula visible, bloques grandes, tipografía condensada 700+.
- **Concepto propio:** "Forja" — carbón, acero, hueso y un único acento brasa.
- **Desviaciones conscientes del plugin:** se conserva la paleta del brief (brasa #FF4A1C en vez de naranja #F97316 + verde), y Big Shoulders Display en vez de Barlow Condensed (mismo carácter condensado deportivo; ya autoalojada).

## Tokens
| Rol | Forja (oscuro) | Hueso (claro) |
|---|---|---|
| bg | #0A0A0B | #EDE6DA |
| surface | #151517 | #E4DCCE |
| line | #2A2D31 | #C4BAA8 |
| fg | #EDE6DA | #121213 |
| muted | #9699A0 (AA) | #58544D |
| ember | #FF4A1C | #D0340C |

Radios: `sm 3 · DEFAULT 4 · md 5 · lg 7 · xl 8 · 2xl 10` px. Botón principal sin radio: **placa biselada** (clip-path, 12 px).

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
