# Motion

Motion is evidence or guidance, never decoration. Something moves because a process runs, a state changes, or the reader's eye needs to be led. These values are calibrated starts; tune them live, then bake them in.

## Contents
1. What may move
2. Tokens
3. Easing, damping, springs
4. Patterns
5. Steps, scrubbing, scrollytelling
6. Loops and the runtime
7. Reduced motion
8. Budgets

---

## 1. What may move

| Moves | Because |
|---|---|
| Packets along connectors | the diagram describes flow; speed is illustrative and the caption says so |
| A raster, a strip, a playhead | the data is a time series being replayed (state the time scaling) |
| Particles in a field | the field is the idea (flow, diffusion, attention) |
| Marks morphing between states | the reader is comparing two states of the same data |
| Dimming and a focus ring | a step changes what matters |
| Counters | a quantity accumulates |

Never: idle breathing, bounce, wobble, parallax, glow pulses on things that are not acting, entrance animations on every scroll.

## 2. Tokens

| Verb | Duration | Easing |
|---|---|---|
| Step transition (dim/undim, recolor) | 0.48 s (`--fs-dur-step`) | ease-out cubic |
| Morph between data states | 0.6-0.9 s | minimum-jerk (smootherstep) |
| Draw-on of a line or path | 0.8-1.4 s | minimum-jerk; stroke-dashoffset or progressive slice |
| Panel or group entrance | 0.28 s, drift ≤ 16px | ease-out |
| Stagger | 40-60 ms per item (one wave) or ≥ 500 ms (one by one); never 150-500 ms | |
| Hover and control feedback | 240 ms (`--fs-dur`), `cubic-bezier(0.16, 1, 0.3, 1)` | site soft ease |
| Parameter change | damped toward the target, λ ≈ 12 (~80 ms) | exponential |
| Arrow as a gesture | draw 350 ms, hold 1.3 s, fade 450 ms | ease |
| Packet travel | 2.5-4 s per edge at reading pace | linear in u, faded at both ends by sin(πu) |
| Counters, sweeps, playheads | as long as the process | linear |

Hold at least 1 s on a new state; 2-3 s after a new sentence appears.

## 3. Easing, damping, springs

```js
const smooth = t => t * t * t * (t * (6 * t - 15) + 10);        // minimum-jerk, for moves
const out = t => 1 - Math.pow(1 - t, 3);                          // entrances
// Frame-rate independent approach to a moving target. lambda ≈ 4 (soft) … 14 (snappy).
const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));
```

- Use `damp` for anything that chases a target that can change mid-flight (hover, pointer, focus); it never jumps and never depends on frame rate. In pmndrs `math@0.1.0` the equivalent is `spring.damp(state, target, smoothTime, delta)`; legacy `maath@0.10.8` has `easing.damp(obj, prop, target, smoothTime, delta)` with different signatures (see `webgl.md`).
- Use a critically damped spring when velocity must carry over (dragging, interruptible morphs): `FS.spring(state, target, smoothTime, dt)` with `state = { value, velocity }`. Overshoot ≤ 1.5% if you underdamp on purpose.
- Use a fixed-duration eased tween when the reader triggered a discrete change (next step) and the end state is known.

## 3b. Physics for direct manipulation

- **Rubber band** past a bound: `x' = bound ± (1 − 1 / (d·c/dim + 1))·dim` with c = 0.55 (`FS.rubber`). The pointer keeps working; the response compresses.
- **Settle** after release: a damped spring toward the resting point, k ≈ 420, ζ ≈ 0.62 (`FS.springTo`): one small overshoot, settles in ~0.3 s. Snappier for jumps-to-pointer (k 900, ζ 0.8).
- **Pops** (value bubbles, switch knobs, the settings icon): `--fs-ease-spring` = `cubic-bezier(0.34, 1.56, 0.64, 1)`, 220-300 ms.
- **While held, no easing**: the handle tracks the pointer 1:1 (inside bounds); easing only on release, on keyboard steps and on programmatic changes.

## 3c. Target-based clock, tips, expand

- **The clock glides to targets.** Every way of moving time (dragging the surface, clicking a moment, chapter buttons, keys, the toolbar scrubber, `seek(t, { animate: true })`) sets a target; `f.t` follows through a critically damped spring that keeps its velocity when the target changes. Smooth time 0.07 s while dragging (the mark stays under the hand with a hint of weight), 0.22 s for clicks and jumps, 0.3 s for a flick's coast. Reduced motion: jumps.
- **Flick**: on release faster than 0.6 durations per second, land at `t + 0.12 · v` (a mild projection; a scrubber should not fly).
- **Tips**: 500 ms hover delay; warm group 450 ms (the next tip opens at once and glides 240 ms to its anchor); enter 140 ms opacity + 220 ms rise of 4px; exit 140 ms; close grace 100 ms. Immediate on keyboard focus. High-frequency use: no other delay.
- **Expand**: animate the plate's real box (left, top, width) on a critically damped spring (ω 26: most of the move in 0.2 s, settled by about 0.35 s, no overshoot) and re-lay out the figure every frame. Both ends are true resting layouts, so the landing is exact in both directions. Don't FLIP a scaled snapshot between two layouts with different aspect ratios: it ends at the wrong size and snaps. Backdrop fades 280/260 ms with an 8px blur. A reversal mid-flight keeps position and velocity. Measure: record the plate's rect every frame through open and close; it must change monotonically and its last frame must equal the resting rect.
- **Slow motion where it matters.** When the interesting part is a few seconds at the end of a long span, run the figure's clock piecewise: fast through the context, slow through the moment (for example 26 s in 8 figure seconds, then 9 s in 12). Map x to the figure clock so scrubbing stays linear, and mark the knee on the axis ("slowed down from here") so the axis doesn't lie.
- **Icon swaps** (play/pause/replay, expand/close): both icons share one box; opacity, scale 0.25 → 1 and blur 4px → 0 over 300 ms, no bounce.
- **Caption swaps**: stacked captions crossfade over 220 ms with a 2px blur on the outgoing one; the box never changes height.

## 4. Patterns

- **Packets on paths (SVG)**: precompute `getTotalLength()`; each frame place a few `<circle>`s at `getPointAtLength(u * length)`, `u += dt * speed`, opacity `sin(πu)` so packets emerge from and dissolve into nodes. 2-4 packets per edge. Inactive edges drop to 0.18 opacity and their packets fade with them.
- **Draw-on**: SVG `stroke-dasharray: L; stroke-dashoffset: L → 0`, or on canvas slice the point array to `round(progress * n)`.
- **Morph**: keep the same mark identities across states; interpolate positions with `smooth(t)`; never cross-fade two unrelated plots and call it a morph.
- **Focus pull**: dim context to 0.28-0.45 over 0.45 s, draw an accent ring offset from the target, label the ring, keep the rest moving if it is a running process.
- **Streaks for flow fields**: draw each particle as a short segment from its previous to current position, stretched ×4-6, alpha by life (`min(1, age·2, (T − age)·2)`). Reads as flow at 1-2px widths.
- **Raster/playhead**: shift columns left as time advances; draw a 1px `--strong` playhead; tint the background of columns in a given state at 5% opacity.

## 5. Steps, scrubbing, scrollytelling

- A **stepped figure** holds an array of `{ on: [...], caption }`. The runtime animates `stepT` 0→1 on change; drawing interpolates from `from` to `step`. Prev/next buttons, dots, ←/→ keys when the stage is focused, and a caption live region.
- **Scrubbing** happens on the drawing itself (`timeAxis`, `interaction.md` §4); the toolbar scrubber mirrors it with chapter marks. Both pause playback and glide the clock. Use them for anything the reader should inspect at an exact moment.
- **Scrollytelling** (one per page at most): a sticky figure with step cards scrolling past; the card crossing the viewport middle sets the step via IntersectionObserver. Steps must also work with buttons; never make scroll the only way through.

## 6. Loops and the runtime

- **One clock per figure.** A narrative is `render(t)`: elements declare their time windows as data and draw with `FS.window(t, t0, t1)`. Play advances `t`, scrubbing sets it, resize redraws it. Never build a story out of chained timers; the reader could not scrub or link to a moment.
- **Run once, stop at the payoff.** Timelines (`duration`, `loop: false`) autoplay once at 35% visibility and end on their conclusion with a Replay control; only running processes loop.

- One `requestAnimationFrame` loop for the whole page. It sleeps when no figure is visible and moving, and wakes on input, resize, theme change or a step change.
- Each figure animates only while intersecting the viewport (rootMargin ~80px) and while the document is visible.
- A figure's `render` may request another frame (while something eases) with `f.api.redraw()`; the runtime clears the dirty flag before calling `render`.
- Every looping figure has a Pause button. Pause holds the exact frame.
- Seeded randomness only (`FS.rng(seed)`); no `Math.random()` or `Date.now()` in drawing, so the same state always draws the same picture.
- Parameters ease: `f.params` holds targets, `f.v` the eased values the figure draws; readouts use the targets so text never lags the control.

## 7. Reduced motion

- Honor `prefers-reduced-motion: reduce`: figures start paused; step changes jump (`stepT = 1`); CSS transitions collapse to 0.
- A paused process figure must still show a representative moment: advance its simulation a few seconds offline (`for (i < 180) step(1/60)`) before the first draw, then hold.
- Never hide information behind motion: anything shown only during an animation must also be reachable by stepping or scrubbing.

## 8. Budgets

- Canvas 2D: ≤ ~5k moving marks at 60 fps on a laptop; batch strokes into one path per style.
- SVG: ≤ ~300 animated elements; beyond that, switch to canvas.
- WebGL: see `webgl.md`.
- Measure: wrap simulation and drawing in `performance.now()` and report averaged ms per frame with the device and viewport. Do not claim "smooth" without numbers.
