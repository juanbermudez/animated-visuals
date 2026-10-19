# Animated and interactive diagrams

Diagrams explain structure and process. Animation adds direction, sequence and load; interaction lets the reader walk through it. Build them in SVG unless they need thousands of moving parts.

## Contents
1. Layout
2. Nodes
3. Connectors
4. Packets and flow
5. Stepping through a process
6. State machines and sequences
7. Linking prose to the figure
8. Responsive diagrams

---

## 1. Layout

- Lay out on a fixed `viewBox` (for example `0 0 960 300`) and let the SVG scale; compute the canvas height from the width so aspect stays fixed.
- Read direction is the argument's direction: left→right for pipelines, top→bottom for hierarchies and time.
- Align nodes on a grid (multiples of 10 or 20 units); equal gaps between ranks; center branches on their parent.
- Reserve space for what will appear later in the steps so nothing reflows.
- 5-9 nodes per diagram. More than that: group into a labeled region and zoom into it in a later step or a second plate.

## 2. Nodes

- Rect, 6px radius, `--fs-surface` fill, 1px stroke (`--fs-line-strong`; `--fs-fg` when active; `--fs-accent` ring when hovered or linked). Title 13px/600 in the figure font; subline 10.5px muted with the one number that matters ("gate · 4 ms").
- Shape encodes kind sparingly: rect = component, rounded pill = data/message, cylinder only for persistent stores, dashed outline = optional or external.
- Do not put icons in nodes unless the icon is the fastest way to say what the node is.

## 3. Connectors

- Cubic Béziers with horizontal tangents for left→right flows: `M p0 C mx,p0y mx,p1y p1` where `mx` is the midpoint x. Orthogonal elbows (2px corner radius) for top→bottom trees.
- `--fs-stroke-edge` (1.1px) in `--fs-muted`. Arrowheads only where direction is not already shown by packets or layout.
- Label a connector at its midpoint with a halo, only if the label adds information (a rate, a condition).
- Never let connectors cross nodes; reroute or reorder.
- Return paths (receipts, feedback, retries) run around the outside on nested orthogonal lanes into one node, then one line back: the farthest source takes the outer lane so lanes never cross. Never send a return vertically through sibling nodes. Hovering a node highlights every connector that touches it.

## 4. Packets and flow

- 2-4 packets per edge, 3px radius dots, `--fs-fg`; `--fs-accent` on the path that the current step is about.
- Position by `path.getPointAtLength(u * length)`; advance `u` linearly; fade by `sin(πu)`.
- Encode relative load by packet count or speed, never by both. Say in the caption that speed is illustrative.
- A branch that the current case does not take keeps its packets but drops to 0.18 opacity.
- For many simultaneous flows (hundreds), switch to canvas and draw packets as short streaks along precomputed polylines.

## 5. Stepping through a process

Model the figure as data:

```js
const steps = [
  { on: ['input', 'router', 'model', 'memory', 'output'], caption: 'The whole path.' },
  { on: ['input', 'router'], caption: 'Every event reaches the router first.' },
  { on: ['router', 'memory', 'output'], caption: 'Most requests are answered from memory.' },
];
```

- Step 0 is the overview; later steps isolate one move each.
- Each step changes one thing: what is lit, a value, one new element. If two things must change, make two steps.
- The caption is one sentence in the reader's terms, shown in a live region (`1/4 · …`).
- Elements not in `on` dim to 0.28 (nodes) and 0.18 (edges); they never disappear.
- Transition 0.45-0.6 s ease-out; reduced motion jumps.
- Provide ←/→ buttons, dots, and keyboard stepping on the focused stage.

## 6. State machines and sequences

- State machine: states as pills on a circle or line, transitions as curved arrows with condition labels; the current state is solid, others outlined; a token travels the taken transition.
- Sequence diagram: lifelines as 1px dashed verticals, messages as arrows that draw on in order; the active lifeline segment thickens to an activation bar.
- Timeline/Gantt: lanes per actor, bars per activity, a playhead that sweeps; solid vs hatched for two kinds of time.

## 7. Linking prose to the figure

- Words in the prose that name a node drive the figure: hovering or focusing the word rings the node, and hovering the node lights the word. Mark words with `data-fs-ref="fig-id:router"`; read `f.hover` in `render`; call `fig.hover(key)` from the node's pointer events. The step does not change.
- The figure never introduces a term the prose has not named, and the prose never refers to a part the figure does not label.

## 8. Responsive diagrams

- Below ~560px, re-lay out vertically instead of shrinking: keep two layouts (positions + viewBox) and pick one in the figure's `resize(f)` hook, regenerating connector paths (demo Fig. 1 does this). Or step through regions one at a time.
- Keep text ≥ 12px at the rendered size; if the viewBox scaling would make it smaller, switch layouts.
- Touch: steps by buttons; hover-only details also open on tap.
