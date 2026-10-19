# Notes from Alex Zhang's figures

Source: a teardown of 14 figures in two posts by Alex Zhang (alexzhang13.github.io, "spec-ptc" and "harness", 2026), checked rendered in a browser and in source. Patterns and measurements only: his prose, images, videos and the figure code in the site repo carry no license of his own, so re-implement rather than copy. His `alexzhang13/spec-ptc` repo is MIT (© 2026 Alex Zhang); if code from it is adapted, ship its notice.

## Copy

1. **One clock drives the figure.** The interactive teaser is `render(t)`, a pure function of one scalar. Elements declare their timing as data (`{t0, t1}` windows, `showAt`, highlight intervals). Play advances `t` (dt clamped at 100 ms); scrub sets `t`; resize re-measures and calls `render(t)`. Any moment can be shown, linked to and verified. The `FS` runtime's timeline (`duration`, `chapters`, `seek`) is this model.
2. **Run once, stop at the payoff.** A narrative timeline plays when it enters the viewport (threshold 0.35-0.5) and stops on its conclusion; it does not loop. Only running processes loop.
3. **The counterfactual on the same axis.** Baseline and treatment share one time scale, stacked as lanes; the difference is a bracket (1.2px, ±6px end ticks) with a ratio computed from the same numbers ("2.4× = 112 / 46"), faded in when the slower lane finishes.
4. **Highlight only what is happening now.** A row or line being worked on gets a 2px left rule in the state color and a soft 8-10% tint, bleeding slightly into the gutter; it clears when the work moves on.
5. **Arrows are gestures.** Draw in over ~350 ms (stroke-dashoffset), hold ~1.3 s, fade over ~450 ms. Permanent arrows belong to static diagrams only.
6. **Fixed geometry.** Reserve every slot at its final size from the first frame; elements fade in place (0.45-0.6 s); nothing slides or reflows during playback; changing numbers use fixed widths and tabular figures.
7. **A phase chip as the face of the state machine.** A small pill with a dot whose pulse period encodes urgency (faster when executing than when generating, still when done).
8. **Real effects, scripted stream.** Script the narrative deterministically, but make the demonstrated effect real (measured latencies, data-true geometry) and show the clock.
9. **Static diagram devices.** A recurring "what the model sees" glyph; context windows as strips of colored segments reused across arrangements; "=" between columns that are equivalent, with the variable parts pushed to the gutters.
10. **Chart conventions.** Train as a light line or area, eval as a 2px line with markers; a reference as a dotted gray horizontal; a subtitle "source → **target**"; a two-tier legend (series identity, then line-style meaning); the statistical method printed on the figure ("Mean over repeats · 95% t-interval · n=5"); hatching on the treatment as a second cue beyond hue; value labels above error-bar caps.
11. **Group by background.** Tint panel backgrounds by experiment family and add a small chip label in the corner.

## Avoid (all observed)

- `preserveAspectRatio="none"` on SVG with text: labels stretched to 0.47× width and 1.69× height at an 800px window.
- Type that renders at 4-9px on phones or in exported images; check the effective size at the real embed width (≥ 11px).
- Dead readouts (a static "Time t"), timelines with no axis, legends commented out.
- The same hue meaning a code-syntax role and a state, or different things in neighboring figures.
- Dark mode with hard-coded light surfaces, captions at fixed `rgba(0,0,0,.6)`, and white PNGs.
- Controls clipped or overflowing on mobile; linked views split apart.
- Autoplay without visibility gating; ignoring reduced motion (one video played faster under it).
- Mixed chart fonts within one post.

## How this maps onto Animated Visual

| Pattern | Where |
|---|---|
| One clock, chapters, play-once | `FS` runtime: `duration`, `loop: false`, `chapters`, `seek`, Space/←/→/Home/End |
| Counterfactual lane + bracket | `FS.k.bracket`, demo Fig. 2 in `assets/plate-template.html` |
| Live-only highlight, phase chip | `.fs-live`, `.fs-chip` in `themes/base.css` |
| Arrow gesture timing | `references/motion.md` §4 |
| Theme parity | `references/theming.md`; every color is a `--fs-*` token |
