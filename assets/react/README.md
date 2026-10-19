# React assets

Thin React wrappers over the same `FS` runtime the standalone template uses, so figures behave identically in a page and in a Next.js site. Checked 2026-10-19 with React 19.2, TypeScript 5.9, three 0.186.1, @react-three/fiber 9.8.2, @nivo/line 0.99.0: `tsc --strict` clean, and all three components rendered in a browser (flow diagram stepping and packets, nivo chart with direct labels, R3F focus pull).

| File | What |
|---|---|
| `useFigure.ts` | `useFigure(id, spec)`: loads the runtime in the browser, mounts the figure on the element `#id`, disposes on unmount; returns the controller (`play`, `seek`, `goto`, `set`, `state`, `apply`, `on`, `hover`…) |
| `fs-runtime.d.ts` | types for the runtime, spec and controller |
| `FigurePlate.tsx` | the plate markup (head, stage, toolbar, step text, caption, readouts) wired with `data-fs*` bindings |
| `FlowDiagram.tsx` | stepped architecture diagram with packets; wide and narrow layouts; prose-linkable via `controller.hover` |
| `ExplorableLine.tsx` | nivo line chart with one parameter, direct end labels, Voronoi hover, reduced-motion aware |
| `nivo-theme.ts` | `chartTheme` on `--fs-*` tokens, `chartMargin`, `useReducedMotion`, `useResolvedTokens` (for canvas charts) |
| `FocusField.tsx` | R3F stateless particle field with a depth-of-field focus pull driven by a damped spring; starter values, tune per figure |

## Install into a site

1. Copy this folder and `../runtime/fs-runtime.js` into one directory (for example `components/figures/`). `useFigure` imports `./fs-runtime.js`.
2. Import `themes/base.css` once, globally, plus one token layer: `themes/zef-site-bridge.css` inside zef-builder-site (follows the site's modes and palettes), or `themes/zef.css` (+ `themes/omarchy.css` for palettes) elsewhere.
3. Install only what you use, pinned: `@nivo/core@0.99.0 @nivo/line@0.99.0` for charts; `three@0.186.1 @react-three/fiber@9.8.2` (+ `@react-three/drei@10.7.9` if used) for 3D.
4. Load heavy figures lazily from a client component, in a box with reserved height:

```tsx
"use client";
import dynamic from "next/dynamic";
const FocusField = dynamic(() => import("@/components/figures/FocusField"), { ssr: false });
```

## Rules

- Never `setState` per frame; let the runtime mutate DOM attributes or draw to canvas. Discrete changes (layout, a slider value for nivo) may be React state.
- The plate uses `overflow: hidden`; nivo tooltips are not portaled, so give nivo plates `overflow: visible` or render tooltips inside the plate.
- `.fs-stage > svg|canvas` styles apply to direct children only; library-owned nested SVG/canvas keep their own sizing.
- Reduced motion: the runtime handles `FS` figures; pass `animate={!reduced}` to nivo; R3F switches to `frameloop="demand"`.
