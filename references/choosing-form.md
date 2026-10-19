# Choosing the form

Start from the claim, not the chart type. First name the purpose and reduce the idea to primitives (`content-design.md` §1-2), then write the figure's claim as one sentence ("Run B ends 35% lower and plateaus later"). If a sentence would prove it as well, do not draw. Then pick the form and the medium.

## Claim → form

| The claim is about… | Form | Notes |
|---|---|---|
| Ranking or comparing a few values | dot plot or bar (horizontal when labels are long) | bars start at zero; dots when the range matters more than magnitude |
| A trend over time | line with an uncertainty band; direct end labels | one emphasized series, others muted |
| Many series over time | small multiples, or a bump chart for rank changes | avoid spaghetti over ~5 lines |
| A distribution | histogram, strip/beeswarm, violin, ridgeline | show the points when n is small |
| Two quantities related | scatter with a fit line and its slope written on the plot | annotate the outliers the text discusses |
| Before vs after | slope chart or dumbbell | the change is the mark |
| Part of a whole | stacked bar, waffle, treemap | avoid pies past 3 slices; never 3D |
| Flows between stages | sankey or alluvial | widths are quantities; label totals |
| A network | node-link (force or fixed layout), arc diagram, chord, adjacency matrix | matrices beat hairballs past ~50 nodes |
| A hierarchy | tree, icicle, sunburst, circle packing | icicle/tree for depth, packing for size |
| Time spent in states | raster plus state strip, Gantt-like lanes | solid vs hatched for two states |
| A mechanism or algorithm | stepped diagram on one worked example | one change per step, dim the rest |
| System architecture | animated flow diagram: nodes, connectors, packets | packets show direction and relative load |
| A field, diffusion, attention, flow | particle field (canvas) or GPU particles (WebGL) | streaks reveal flow; a focus ring shows selection |
| High-dimensional structure | 2D projection scatter, or a 3D point cloud with depth of field | 3D only when depth is the idea |
| A sequence of messages | sequence diagram, stepped | use `diagram-design` for static versions |
| An equation's behavior | interactive plot with a slider per parameter | "Try / Notice" line under it |

## Medium

| Medium | Use when | Limits |
|---|---|---|
| SVG | diagrams, charts under ~2k marks, text-heavy figures, anything that must be crisp and accessible | ~300 animated elements |
| Canvas 2D | many marks, rasters, particles (≤ ~5k moving), time series replay | text is invisible to screen readers: mirror key numbers in HTML |
| WebGL (three.js / react-three-fiber) | ≥ 20k points, real 3D, GPU simulation (FBO particles, curl noise), depth of field | needs a fallback still; dispose on unmount; budget DPR |
| nivo (React) | standard charts inside a React/Next.js site with consistent theming and motion | see `charts.md`; theme it to the page tokens |
| HTML/CSS | readouts, tables, legends, bar charts with few bars | keep it simple; CSS bars are fine |

## Delivery target

- **Standalone page or artifact**: start from `assets/plate-template.html` (themes + `FS` runtime inlined, four working demos). Edit `assets/plate-src.html` and rebuild with `node scripts/build-template.mjs` when changing the shared layers. Libraries only from cdnjs/jsdelivr/unpkg with pinned versions if needed.
- **React / Next.js site**: use `assets/react/` (plate, figure controller hook, nivo theme, flow diagram, R3F focus scene). Client components only; lazy-load heavy libraries; map `--fs-*` to the site's tokens (`theming.md`).
- **A lesson or full guide**: use the `teach-me` skill and apply this skill's figure craft inside it.
- **A static structure diagram** (architecture, ER, swimlane) with no motion: the `diagram-design` skill may be faster.

## Interaction

- Interaction must answer a question the reader has: "what if this parameter changes?", "what happens at this moment?", "which one is this?".
- Prefer, in order: step buttons (reader-paced explanation) → a single slider (one parameter) → hover/focus details → free manipulation (drag, orbit). Orbit controls on a 3D scene are rarely needed; a few fixed camera moves usually explain more.
- Every interactive figure gets a "Try / Notice" sentence, and the notice must be true when checked in the browser.
