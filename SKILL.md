---
name: animated-visual
description: Design and build polished, minimal, interactive and animated visualizations and diagrams for papers, articles, explainers and sites — explorable charts (hand-built or nivo), stepped mechanism diagrams, animated system/agent architecture flows, one-clock timelines, particle and flow fields, and WebGL / react-three-fiber scenes with depth-of-field focus. Styles are swappable theme layers (default matches Juan Bermudez's site; lab-notebook register; 23 Omarchy palettes such as Tokyo Night, Catppuccin, Gruvbox, Nord). Every figure is programmable (play, seek, step, set parameters, link prose). Use when asked to visualize data or a paper's findings, explain a mechanism or architecture visually, make a figure interactive or animated, build charts for a React/Next.js site, theme figures, or polish figures that look generic. Not for full lessons (use teach-me) or static branded diagrams with no interaction (diagram-design is faster).
---

# Animated Visual

Every figure proves one claim, is minimal and on-brand, moves only to show a process or lead the eye, can be explored by the reader and driven by code, and is verified in a real browser.

## Workflow

1. **Claims first, from first principles.** Name each figure's purpose (flow through a system, timeline, mechanism, results, dependence, relationships, activity, paths, comparison…), reduce it to primitives (actors, objects, events, states, quantities, relations) and write its claim in one sentence with no codenames: `references/content-design.md`. Cut any figure a sentence would replace. Pick the granularity a stranger can follow and plan tips for every non-obvious part.
2. **Pick the writing style.** Practical by default (`references/writing/practical.md`); academic only when asked or when the host is a paper (`references/writing/academic.md`). Styles are modular (`references/writing/README.md`). Keep every label, caption and tip within the copy budget.
3. **Find the interaction.** For each claim, decide what the reader should be able to do to understand it faster (scrub time, step a mechanism, drag the parameter the claim depends on, point at a part, compare on one axis). Pick the lowest rung of the interaction ladder that answers it: `references/interaction.md`.
4. **Form and medium.** `references/choosing-form.md` (SVG, canvas, WebGL, nivo).
5. **Theme.** Inside a host site, map `--fs-*` tokens to its variables (for zef-builder-site use `themes/zef-site-bridge.css`). Otherwise the default `zef` theme matches Juan's site; registers and Omarchy palettes are one attribute away. Never hard-code colors: `references/theming.md`, `references/art-direction.md`.
6. **Build.**
   - Standalone page or Artifact: copy `assets/plate-template.html` (themes + `FS` runtime inlined, four working demos: stepped SVG flow with linked prose, one-clock timeline with a physics time scrubber and a computed counterfactual bracket, explorable chart with a scrubbable number and a settings popover, curl-noise field with a draggable, resizable focus). To change shared layers, edit `assets/plate-src.html`, `themes/*` or `assets/runtime/fs-runtime.js` and run `node scripts/build-template.mjs`.
   - React / Next.js: `assets/react/` (see its README): `useFigure`, `FigurePlate`, `FlowDiagram`, `ExplorableLine` (nivo), `FocusField` (R3F).
   - Domain guides: `references/diagrams.md`, `references/charts.md`, `references/webgl.md`, `references/motion.md`.
7. **Critique, then refine.** Look at the render; name what is weak (clutter, no focal point, unlabeled mark, a number that disagrees, motion that decorates, a control nobody needs). Fix one concern at a time; two passes minimum.
8. **Verify.** Every state, default theme in both modes plus one dark and one light Omarchy theme, 1440 and 390 widths, reduced motion, keyboard, console, programmatic control from the console, measured frame times: `references/verification.md`. Capture stills and short clips for anything that moves.
9. **Deliver.** A page for others is published as an Artifact (load `artifact-design` first) or saved where asked. Report what was verified and what was not.

## Quality bar

- One claim per figure, stated in its title; caption says what is simulated, scaled or sourced.
- Minimal and on-brand: the site's frame and type; mostly empty stage; one focal element; context dims to `--fs-dim`, never disappears.
- Monochrome-first encoding (fill, hatch, stroke); hue only for named categories, consistent across the page and checked for contrast.
- Direct labels; nothing clipped, colliding or under 11px on a phone; layouts re-flow instead of shrinking.
- Interaction answers a question; every control has a live readout; every derived number is computed (`fig.out`) and agrees with the prose.
- A stranger understands every label: role names, not codenames; copy within the budget; one writing style per page (`content-design.md`, `writing/`).
- Direct manipulation before sliders: spatial variables (positions, radii, thresholds, moments) are dragged in the figure via `handles`, with rubber-banding past bounds and a spring settle.
- Timelines scrub on the drawing itself (`timeAxis`): hover previews the moment, drag scrubs, click jumps, flick coasts, and the clock always glides to its target (`seek(t, { animate: true })`).
- Non-obvious parts explain themselves in tips (`tips`/`tipAt` or `data-fs-tip`): 500 ms hover delay, instant within a warm group and on focus, short and plain.
- Every plate expands nearly full screen with a FLIP animation (runtime default) and closes with ×, Escape or the backdrop.
- Nothing shifts when values change: stacked step captions keep the tallest height, changing outputs reserve their widest text (`reserve`), state buttons are fixed-size icons.
- Settings live in the popover behind the plate's settings icon (default `placement: "settings"`); only the control that *is* the interaction sits inline (time scrubber, steps, play, the scrubbable number in the prose).
- Sliders are the runtime's physics slider (vertical bar handle, value bubble, rubber band, springy settle, magnet marks, full keyboard), never bare native ranges.
- One clock for narratives (`render(t)`, scrub, chapters, play once to the payoff); processes loop with Pause; changes ease and are interruptible.
- Programmable: anything a reader can do, `FS.get(id)` can do (`play`, `seek`, `goto`, `set`, `apply`, `state`), and prose can drive figures (`data-fs-scrub`, `data-fs-ref`).
- Reduced motion shows the payoff or a settled still; keyboard and touch parity; seeded randomness; loops sleep offscreen; heavy libraries load lazily; WebGL is disposed.

## References

| File | Owns |
|---|---|
| `references/content-design.md` | purpose taxonomy, primitives, granularity, the cold reader test, copy budget, tips plan |
| `references/writing/` | writing styles (practical default, academic on request) and how to add one |
| `references/interaction.md` | finding the interaction, the ladder, patterns, controls (handles, sliders, settings, timeline surface, tips, expand, stable layout, buttons), feel, the `FS` API, input parity, anti-patterns |
| `references/theming.md` | layers, token contract, switching/overriding, Omarchy palettes and contrast, host-site bridges |
| `references/art-direction.md` | the zef register, plate anatomy, type, encoding, strokes, density, data honesty, other registers |
| `references/choosing-form.md` | claim → form, medium, delivery target |
| `references/diagrams.md` | layout, nodes, connectors, packets, stepping, state machines, responsive re-layout |
| `references/charts.md` | chart craft, hand-built charts with `FS`, nivo (theme, gotchas), annotation, statistics |
| `references/webgl.md` | three.js / R3F integration and budgets, stateless vs ping-pong particles, depth-of-field focus, pmndrs `math` vs `maath` |
| `references/motion.md` | what may move, timing tokens, easing/damping/springs, one clock, reduced motion |
| `references/verification.md` | browser checklist, motion capture, gotchas, reporting |
| `references/alex-zhang-notes.md` | patterns and failures from Alex Zhang's interactive figures |

## Files

| Path | Use |
|---|---|
| `assets/plate-template.html` | self-contained starter (built) |
| `assets/plate-src.html`, `assets/runtime/fs-runtime.js` | sources for the template; the runtime is also used by the React assets |
| `assets/react/` | React components and hook |
| `themes/zef.css`, `themes/notebook.css`, `themes/omarchy.css`, `themes/base.css`, `themes/zef-site-bridge.css` | token layers and structure |
| `themes/omarchy.json` | palette source (Omarchy, MIT, pinned commit) |
| `scripts/build-themes.mjs` | regenerate Omarchy CSS (and a site's palette CSS/registry with `--site-css/--site-json`) |
| `scripts/build-template.mjs` | inline themes and runtime into the template |
| `NOTICE.md` | credits and licenses |

## Related skills

`teach-me` (whole lessons and videos), `diagram-design` (static branded diagrams), `dataviz` (chart color validation), `interface-design` (UI around the figures), `artifact-design` (publishing a page).
