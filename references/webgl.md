# WebGL, react-three-fiber and GPU particles

Use 3D only when depth, a field, or particle density is the idea. Everything here keeps the same rules as the rest of the skill: one claim, theme tokens, programmable state, reduced motion, measured performance.

## Contents
1. Versions and integration
2. Canvas defaults for explanatory scenes
3. Performance rules
4. Particles and fields
5. Depth of field as an attention cursor
6. pmndrs math (`math`) vs legacy `maath`
7. Labels and diagrams in 3D
8. Reduced motion, fallbacks, disposal

---

## 1. Versions and integration (checked 2026-10-19)

`three@0.186.1`, `@react-three/fiber@9.8.2` (React 19: peers `react >=19 <19.4`, `three >=0.156`), `@react-three/drei@10.7.9`, `@react-three/postprocessing@3.2.0`, `math@0.1.0` (pmndrs, new), `maath@0.10.8` (legacy, pulled in by drei). All MIT (postprocessing is Zlib). fiber 10 and drei 11 exist only as alphas: do not use.

Next.js App Router: neither fiber nor drei is marked `"use client"`. Put the `<Canvas>` tree in a client file and load it with `next/dynamic(..., { ssr: false })` from inside a client component, inside a box with a reserved `aspect-ratio`, with a static poster until it mounts. Never let three/drei into an article's base bundle.

```tsx
"use client";
import dynamic from "next/dynamic";
const Scene = dynamic(() => import("./scene"), { ssr: false, loading: () => <div className="poster" /> });
export function Figure() { return <div style={{ aspectRatio: "16 / 10" }}><Scene /></div>; }
```

## 2. Canvas defaults for explanatory scenes

| Prop | Default | Use instead |
|---|---|---|
| tone mapping | ACESFilmic | `flat` so theme colors render exactly |
| `dpr` | `[1, 2]` | `[1, 1.5]` in articles |
| camera fov | 75 | 20-35 (less distortion, reads like a diagram) |
| `frameloop` | `"always"` | `"demand"` for static/interaction-driven figures; call `invalidate()` after imperative changes |
| fallback | none | a static image or SVG |

Read theme colors from CSS (`getComputedStyle` on the figure element) into uniforms and materials; re-read on theme change. For several 3D figures on one page, share one WebGL context with drei `View`.

## 3. Performance rules

- Never `setState` in `useFrame` or pointer handlers; mutate refs and uniforms.
- Use `delta`, clamp it (`Math.min(dt, 0.1)`), and never use per-frame `lerp(x, target, 0.1)` (frame-rate dependent: ~0.16 s at 60 Hz, ~0.08 s at 120 Hz). Use `spring.damp` or `1 - Math.exp(-k * dt)`.
- No allocation in the loop: reuse vectors at module or component scope.
- Draw calls: a few hundred at most, ≤ 100 per article figure; instance repeated objects (`instancedMesh`, drei `Instances`).
- Toggle `visible` per step instead of mounting/unmounting (remounting recompiles).
- Pause offscreen canvases (IntersectionObserver → `setFrameloop("never" | "always")`); R3F keeps rendering below the fold otherwise.
- Adaptive quality: drei `PerformanceMonitor` (defaults: 250 ms window, 10 iterations, threshold 0.75) with `onDecline/onIncline` to step particle counts or DPR. `AdaptiveDpr` does nothing unless something calls `regress()`.
- Budgets: start mobile at 128²–256² particles and step up; 512² (262,144) held 60 fps on one Mac (WebKit, 1732×1272, DPR 1); other devices unverified. Measure and report.

## 4. Particles and fields

**The pmndrs GPGPU curl-noise example is stateless, not ping-pong.** Its simulation pass renders a 512×512 float texture where each texel's position is a closed-form function of its seed and time: `pos = curl(seed * freq + t)` plus four octaves of curl, mixed by Perlin noise; `curlNoise` returns a normalized direction, which is why the cloud is a sphere (radius ~1-1.94). The render pass is 262k points whose `position` attribute is a texture lookup coordinate. Consequences:
- Deterministic and seekable: any `t` can be rendered directly. Ideal for scroll-scrubbed or stepped figures (`frameloop="demand"` + `invalidate()` on scroll).
- Particles do not travel along streamlines; it cannot show "information flows along this path".
- Normalizing breaks strict divergence-freeness: do not describe it as incompressible flow.
- Cost: ~108 simplex evaluations per texel per frame (~28M per frame at 512²).

**For true flow, use ping-pong advection**: two float render targets; each frame read the previous positions, add `curl(p * freq + t * k) * speed * dt`, write the other target, swap; respawn by age stored in `.w`. Use `FloatType` (half floats quantize small steps); `HalfFloatType` is fine for stateless sims. three ships `examples/jsm/misc/GPUComputationRenderer.js` for this. On CPU, the 2D equivalent (the template's Fig. 4) handles ~1-2k particles comfortably.

**Divergence-free fields** (curl of a smooth potential) keep a cloud evenly filled: particles never collapse into sinks, which suits "cloud of memories/attention" pictures.

## 5. Depth of field as an attention cursor

The example's DOF is a per-point fake, not post-processing: `vDistance = abs(uFocus - (-mvPosition.z))`; out-of-focus points get larger (`gl_PointSize ∝ vDistance * uBlur`) and fainter (`alpha = 1.04 - clamp(vDistance * 1.5, 0, 1)`), round sprites, normal blending, no depth write. Only a selected fraction becomes large bokeh discs; the rest stay 1px dust.

Use it to direct attention: drive `uFocus` with a critically damped spring to the depth of whatever the current step or paragraph is about; context blurs and fades. One uniform, almost free. Promote only the subset that matters (highlighted tokens, active agents) to large discs. A focus field is worth using only when depth, attention or a sensor field of view is the claim; do not use it as generic particle texture.

For meshes, post-processing DOF (`@react-three/postprocessing` `<DepthOfField focusDistance focusRange bokehScale />`, defaults 3.0 / 2.0 / 1.0, `resolutionScale 0.5`) costs a full-screen pass; prefer the point trick for particle figures.

## 6. pmndrs math (`math`) vs legacy `maath`

They share names but not signatures. New `math@0.1.0` (pin exactly; the registry also lists unrelated `1.0.0-canary` builds): plain tuples, `out`-first functions, no allocation.

```ts
import { spring, spring3, easing } from "math/time";   // spring.update(state, target, smoothTime, dampingRatio, delta)
import { simplex3d, curl3, fbm } from "math/noise";      // curl3(out, sample, x, y, z, eps = 1e-4)
import { mulberry32 } from "math/random";               // mulberry32.create(seed); mulberry32.sample(state)
const focus = spring.create(5.1);
useFrame((_, dt) => { spring.update(focus, target, 0.5, 0.8, Math.min(dt, 0.1)); material.uniforms.uFocus.value = focus.value; });
```

`spring.damp(state, target, smoothTime, delta)` is the critical case; the solver is exact and stable at any delta. `spring.fromResponse(response)` converts a SwiftUI-style period to `smoothTime`.

Legacy `maath@0.10.8`: `easing.damp(obj, "prop", target, smoothTime = 0.25, delta = 0.01, …)` and `damp2/3/4/E/Q/C/S/M/Angle/LookAt` return `true` while moving (handy with `frameloop="demand"`: `if (easing.damp3(p, t, 0.25, dt)) invalidate()`), store velocity on the object, and silently assume `delta = 0.01` if you forget it. `misc.remap` takes arrays; the new `remap` takes scalars.

## 7. Labels and diagrams in 3D

- drei `Html` for real-typography labels pinned to 3D points (each creates its own React root: context does not cross; re-provide it). `occlude` hides labels behind geometry.
- drei `Text` (troika SDF) for in-scene text; self-host a `.woff`/`.ttf` (no woff2; without a font it fetches from cdn.jsdelivr.net).
- drei `Line` / `CubicBezierLine` for edges; animate `dashOffset` for "flow along edge".
- drei `Bounds` + `useBounds().refresh(obj).fit()` as the "camera goes to step N" primitive.
- Keep `OrbitControls` optional and `enableZoom={false}` in articles so page scroll is never hijacked.

## 8. Reduced motion, fallbacks, disposal

- Reduced motion: `frameloop="demand"`, no autoRotate/Float/CameraShake, steps jump; render a representative frame.
- No WebGL: the `fallback` prop or the poster stays; the claim must still be readable from caption and readouts.
- R3F disposes unmounted objects automatically (`dispose={null}` to opt out for shared assets); `<primitive>` objects are never disposed; drei `useFBO` disposes its target.
