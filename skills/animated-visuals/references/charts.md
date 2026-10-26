# Charts

Charts carry quantitative claims. Make the claim visible (annotate it), make the numbers exact (computed, labeled), and make exploration cheap (hover details, one parameter). Two ways to build: hand-built SVG/canvas with the `FS` runtime (standalone pages, full control), or nivo in React sites.

## Contents
1. Craft rules (any library)
2. Hand-built charts with `FS`
3. nivo in React
4. Annotation patterns
5. Statistics on the figure

---

## 1. Craft rules

- **Title states the claim**, not the variable ("Smoothing hides the plateau", not "Loss vs step").
- **Direct labels** at line ends and bar tops; push colliding labels apart (14px minimum spacing). A legend only when direct labels are impossible; then a two-tier legend: series identity, then encoding meaning.
- **Quiet scaffolding**: no axis spine, 3-4 horizontal grid lines at round values in `--fs-line`, ticks in `--fs-muted` at 11px, one axis title as plain text at the end of the axis ("step →").
- **One emphasized series** in `--fs-fg` at the series stroke (1.75px); context series in `--fs-muted` at 1-1.25px or 45-50% opacity.
- **Uncertainty is shown**, not smoothed away: bands at 12-16% opacity, or error bars 1.45px with 4px caps; value labels above the caps.
- **Counterfactuals share an axis**; differences are marked (bracket, delta label) and computed from the data.
- **Name features the claim is about** (a shaded band labeled "plateau", a reference line labeled "chance"). Bands use `--fs-surface-2`; reference lines are dashed or dotted text color at 0.65 opacity with a small label at the right end, never solid or full-opacity across the data.
- **Bars start at zero; use dot plots when the range matters more than magnitude.** A threshold on a dot plot runs horizontally across the value axis; dragging it changes the threshold, never the plotted values.
- **Readers never edit a plotted value.** Handles are for parameters, thresholds and other what-if inputs. Radar vertices, bar heights and data dots stay fixed; a radar legend may toggle series.
- **Encoding without hue first**: solid vs hatched for two states (hatch on the treatment), dashed for references; hue only for named categories (`--fs-c1..c6`), consistent across the page.
- **Numbers**: tabular figures, units always, the same rounding in labels, readouts and prose.
- **Ordered segments** (stacked parts, pipeline stages) use a lightness ramp `--fs-line-strong` → `--fs-muted` → `--fs-fg`, never fg plus accent: in monochrome themes such as the default the accent is ink and two segments become identical.
- **Labels never clip**: near an edge, measure (`c.measureText`) and flip the label to the other side of its mark, or break it into two lines.
- **Counterfactual rows** ("one at a time", "without X") repeat the real marks faint and end to end, appear once the real run reaches its payoff, carry the computed ratio, and the caption says they are arithmetic, not a run.

## 2. Hand-built charts with `FS`

Use the demo Fig. 3 in `assets/plate-template.html` as the pattern: compute derived series once per parameter change (in `onParam`, not every frame), draw in `render` from `f.v` (eased params) so changes animate, and write the claim's numbers with `f.api.out()`.

- Scales: `const X = (i) => L + (R - L) * (i / (N - 1))`, `const Y = (v) => B - (B - T) * (v / max)`; margins left ~40px, right ~90px for end labels.
- Hover details: set a pointer handler in `resize(f)`, store the position, `f.api.redraw()`; draw a dashed crosshair, a dot on the emphasized series and a haloed label; mirror the value in an HTML output if it matters.
- Fading a group: set `c.globalAlpha` before its marks; `FS.k.text` and `FS.k.label` multiply the current alpha (and take `alpha` as an option), so faded rows stay faded.
- Large data (thousands of points): canvas, one path per series; decimate to ~2 points per pixel for display while computing statistics on the full data.
- Animated transitions between datasets: keep mark identity, interpolate positions with `FS.ease.smooth`, ~0.6-0.9 s.

## 3. nivo in React

nivo 0.99.0 (MIT; last npm release 2025-05-23, repository active through 2026-07; pin exact versions). 31 chart types: AreaBump, Bar, BoxPlot, Bullet, Bump, Calendar, Choropleth, Chord, CirclePacking, Funnel, GeoMap, HeatMap, Icicle, Line, Marimekko, Network, ParallelCoordinates, Pie, PolarBar, Radar, RadialBar, Sankey, ScatterPlot, Stream, Sunburst, SwarmPlot, TimeRange, Tree, TreeMap, Voronoi, Waffle. Good for standard quantitative charts; a poor fit for mechanism diagrams (hand-build those).

Why its defaults look finished: transparent axis domain line (no spine), light 1px grid, 11px text with halo outlines on labels, soft tooltip shadow. Keep those instincts when theming.

Theme (`assets/react/nivo-theme.ts`): set the font once on root `text` (it is merged into axis ticks, legends, labels, markers and annotations); hoist the theme object to module scope (a new object each render re-merges the theme).

```ts
import type { PartialTheme } from "@nivo/theming";
export const chartTheme: PartialTheme = {
  text: { fontFamily: "var(--fs-font-figure)", fontSize: 11, fill: "var(--fs-muted)" },
  axis: { domain: { line: { stroke: "transparent" } }, ticks: { line: { stroke: "var(--fs-line)" }, text: { fontSize: 10.5 } } },
  grid: { line: { stroke: "var(--fs-line)", strokeWidth: 1 } },
  crosshair: { line: { stroke: "var(--fs-line-strong)", strokeWidth: 1, strokeOpacity: 1, strokeDasharray: "3 3" } },
  tooltip: { container: { background: "var(--fs-surface)", color: "var(--fs-fg)", border: "1px solid var(--fs-line)", borderRadius: 6, fontSize: 12, boxShadow: "none" } },
};
```

Gotchas (from source):
- `var()` resolves where nivo uses the React `style` prop (axis ticks, tooltip). Grid lines are SVG presentation attributes; whether `var()` resolves there in every browser is unverified, so also add a CSS rule on the wrapper (`.chart line[stroke] { … }`) or pass resolved colors.
- Canvas variants cannot read CSS variables: resolve tokens with `getComputedStyle` (or a probe element) and re-render on theme change. Patterns (hatching) are SVG-only.
- Default `margin` is 0: axes and legends clip unless you set it (start around `{ top: 16, right: 96, bottom: 36, left: 44 }` for direct labels on the right).
- Def ids (`patternLinesDef('hatch', …)`) are document-global: prefix per chart with `useId()`.
- Tooltips are not portaled; an `overflow: hidden` ancestor clips them. The `.fs-plate` uses `overflow: hidden`, so either set it to `visible` around nivo charts or render custom tooltips into the plate.
- Responsive wrappers render nothing on the server and pop in after hydration: reserve height (`aspect-ratio` or explicit height) and pass `defaultWidth/defaultHeight` when known.
- Motion is react-spring (`motionConfig` presets: default 170/26, gentle 120/14, wobbly 180/12, stiff 210/20, slow 280/60, molasses 280/120). nivo ignores reduced motion: pass `animate={!reduced}`. Prefer `gentle` for data transitions. Animations run on data change, not on entering the viewport.
- `useMesh` (Line) gives a Voronoi hover target: turn it on for article charts. `enableSlices="x"` gives a table of all series at one x.
- Custom layers read the chart's scales: add a callout layer instead of absolutely positioning HTML over the chart.
- Size: `@nivo/line` ~96 KB gzip with dependencies; load lazily in a client component so it never enters an article's base bundle.
- Static fallback: `@nivo/static`'s approach (`animate: false, isInteractive: false`) server-renders an SVG for no-JS/RSS.

## 4. Annotation patterns

- **Callout**: a 3.5px dot on the mark plus a haloed label offset 8px; no leader line if the label sits next to the mark.
- **Reference line**: dashed or dotted text color at 0.65 opacity, with a small label at its right end ("chance 10%"); never draw a solid full-opacity target, baseline, goal, average or threshold across the chart.
- **Region**: a `--fs-surface-2` band behind the data with a label under the axis.
- **Delta**: a bracket between two values with the computed difference ("1.44× sooner", "−0.13").
- **Before → after**: ghost the old series at 25% opacity while the new one animates in.

## 5. Statistics on the figure

Print the method where the reader looks: "Mean over 5 seeds · 95% t-interval" in the caption or under the legend. State n. Say "simulated" for synthetic data. If a value is from a paper, cite the panel ("Fig. 2l · p = 2×10⁻⁶").
