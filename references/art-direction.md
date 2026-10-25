# Art direction

The look, and the rules that keep it honest. The default register is calm and monochrome, with ink as the accent and every figure framed like the diagrams around it. Colors, type and shape come from theme tokens (`theming.md`), so the same figure can be re-themed (notebook, Omarchy palettes) without touching its code. One register per page.

## Contents
1. The default register
2. The plate
3. Type inside figures
4. Encoding without color
5. Strokes, marks, labels
6. Density and focus
7. Data honesty
8. Other registers

---

## 1. The default register

- Dark first (`#191919` page and plate, `#ededed` ink, Radix-style gray ramp); light is `#f2f2f2` page with white plates and `#111` ink. Values live in `themes/default.css`.
- The accent is ink, not color. Emphasis comes from contrast and dimming: the subject is full-strength `--fs-fg`/`--fs-strong`, context drops to `--fs-dim` (0.28). Under an Omarchy theme the same token becomes the theme's accent hue.
- Manrope for everything, including text inside figures; JetBrains Mono for code and data identifiers only.
- Soft frames: 1px `--fs-line` border, 12px outer radius, 6px inner radius, no shadows.
- Motion is soft and short: 240 ms, `cubic-bezier(0.16, 1, 0.3, 1)`; step transitions ~0.48 s.

## 2. The plate

The site's figure grammar, implemented by `themes/base.css`:

1. **Head** (`.fs-head`): the claim as a title (`.fs-title`, 14px/600) on the left; a 10px muted status on the right ("Fig. 3 · simulated, seeded") or a phase chip for live state.
2. **Stage** (`.fs-stage`, 8px 12px padding): the SVG or canvas. Mostly empty. Focusable for keyboard control.
3. **Toolbar** (`.fs-toolbar`, top border, 44px tall): position or time readout on the left ("2 / 4", "t = 4.8 s", 11px muted); controls on the right: borderless 44×44 buttons with 4px radius and a hover surface, pressed state underlined, disabled at 0.3 opacity; parameter sliders as `.fs-param` (label, range, live value).
4. **Step text** (`.fs-step-text`, 12px muted, polite live region) for stepped figures.
5. **Caption** (`.fs-caption`, 12px/1.5 muted): what is simulated, illustrative or sourced; time scaling; the "Try / Notice" line.
6. **Readouts** (`.fs-readouts`, optional): the numbers the figure argues for, 20px tabular, computed from the same data.

Figures break out of the 46rem reading column to ~58rem on wide screens; on phones they fill the column and re-lay out rather than shrink.

## 3. Type inside figures

- Figure text uses `--fs-font-figure` (Manrope in the default theme; mono in the notebook theme).
- Node titles 13px/600, sublines 10.5px muted; axis ticks 10.5px; mark labels 11px/500 with a halo; captions 12px.
- Nothing under 10px at the rendered width; 11px minimum for anything the reader must read on a phone. If a `viewBox` would scale text below that, switch layouts.
- Never stretch text: no `preserveAspectRatio="none"` on SVG with text.
- Changing numbers use `tabular-nums` and fixed widths.

## 4. Encoding without color

States are encoded so figures survive grayscale, print, color-blindness and the monochrome default:

- Two states: **solid** vs **hatched** (`FS.k.hatch`, 1.1px lines, 5px gap); treatment gets the hatch.
- Membership vs context: solid vs dashed stroke.
- Magnitude: opacity, size or length; never hue alone. Sign: two textures or two stroke styles, labeled.
- Active vs inactive: full strength vs `--fs-dim`.
- Categories (`--fs-c1..c6`) only when a figure must tell more than two kinds apart; in the default theme they are grays, so pair them with labels or textures. A hue keeps one meaning across the page.

## 5. Strokes, marks, labels

- Hairlines 1px (`--fs-line`) for grids and frames; connectors `--fs-stroke-edge` (1.1px, `--fs-muted`); primary series `--fs-stroke-series` (1.75px, `--fs-fg`); secondary series 1-1.25px muted.
- One arrowhead: 7px, ±24°, filled. Arrows that describe a moment are gestures (draw in ~350 ms, hold, fade).
- Nodes: `--fs-surface` fill, 1px `--fs-line-strong` stroke (`--fs-fg` when active), 6px radius.
- Label marks directly; legends are a fallback. Labels over marks get a 4px halo in the plate color.
- Grids: 3-4 horizontal lines at round values; no axis spine.

## 6. Density and focus

- 3-4 chunk-level elements on the stage; a new idea gets a new plate.
- One focal element; the rest dims (never deleted). Hover on a linked word or part rings it in `--fs-accent`.
- Introduce layers in order when stepping (frame → nodes → connections → numbers).
- Collapse many items into a count or texture when they aren't the subject.

## 7. Data honesty

- Say "simulated", "illustrative" or the source; seed every random generator.
- State time scaling.
- Readouts, labels, captions and prose agree because they are computed from one source (`fig.out()`).
- Show uncertainty; do not smooth away the noise that is the point.
- No decorative gradients, 3D on 2D quantities, or animation that changes what a quantity appears to be.

## 8. Other registers

| Register | Theme | When |
|---|---|---|
| Default | `default`, `default-light` | anything that should read calm and monochrome |
| Lab notebook | `notebook`, `notebook-light` | paper explainers: mono figure text, uppercase heads, square plates, amber focus (from the "Conscious Micro-Epochs" guide) |
| Omarchy palettes | `tokyo-night`, `catppuccin`, `gruvbox`, `nord`, `rose-pine`, … (23) | reader-selected themes, terminal-flavored pages, matching a product's palette |
| Specimen (3D) | any theme + `webgl.md` | point clouds and fields: black stage, rim-lit sprites, depth of field to direct focus |

Patterns learned from Alex Zhang's figures are in `alex-zhang-notes.md`.
