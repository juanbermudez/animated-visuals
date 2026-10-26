# Interaction design

Every figure should answer: what can the reader do to understand this faster than by reading? Then make that one thing effortless, precise and reversible. Interaction is part of the explanation, not a feature list.

## Contents
1. Find the interaction in the idea
2. The interaction ladder
3. Patterns
4. Controls: where they live and how they feel
5. Feel: feedback, continuity, recovery
6. The programmable layer (`FS` API)
7. Accessibility and input parity
8. Anti-patterns

---

## 1. Find the interaction in the idea

Ask, for each claim:

| If the claim is… | The reader should be able to… | Pattern |
|---|---|---|
| "X depends on Y" | change Y and watch X | parameter slider, or a scrubbable number in the prose |
| "This happens, then that" | move through the sequence at their pace | steps (←/→) |
| "Over time, A overtakes B" | scrub to any moment and see exact values | one-clock timeline with chapters |
| "A is faster/better than B" | see both on one axis and the difference measured | counterfactual lane + computed bracket |
| "Only some of these matter" | point at one and see its connections | linked hover between prose and figure; focus + dim |
| "The aggregate hides structure" | ask for details where they look | hover crosshair / details on demand |
| "This parameter has a sweet spot" | find it themselves | slider with a live readout and a marked optimum |
| "These two views are the same thing" | select in one and see it in the other | linked views (brushing) |

If no row fits, the figure probably should not be interactive. A static, beautifully labeled figure beats a gratuitous control.

## 2. The interaction ladder

Prefer the lowest rung that answers the question:

1. **Play/pause and replay**: a process or timeline the reader only needs to watch.
2. **Steps**: reader-paced explanation (Prev/Next, dots, ←/→). Each step changes one thing.
3. **Scrub**: the timeline drawing itself is the scrubber (drag across it, click a moment, flick); the clock glides to each target. A toolbar scrubber with chapter marks mirrors it; Home/End jump to start and payoff.
4. **One parameter**: a slider in the toolbar or a scrubbable number in the sentence that makes the claim.
5. **Hover and focus details**: crosshair readouts, linked words, and tips that explain what a part is (after a hover delay, at once on focus).
6. **Direct manipulation**: drag a point, a threshold, a node. Constrain to meaningful ranges and snap to meaningful values.
7. **Free exploration**: orbit, zoom, pan. Rarely needed in an explanation; when used, keep page scroll intact (no wheel capture by default).

Two parameters at once is the usual limit. If a figure needs more, provide named presets ("default", "too much smoothing", "the paper's setting") and let one slider vary at a time.

## 3. Patterns

- **Scrubbable numbers** (explorable explanations): the parameter lives in the sentence ("At a smoothing of 0.90, the plateau shows up 0.069 tall"). Drag sideways or use arrow keys; every number in the sentence updates from the same data. `<span data-fs-scrub="fig:smooth">` plus `<span data-fs-out="fig:bump">`.
- **Linked prose**: words that name parts of the figure are links in both directions. Hovering or focusing "router" rings the router; hovering the router node lights the word. `<span data-fs-ref="fig:router">` and `fig.hover(key)`.
- **One clock**: a narrative timeline is `render(t)`. It plays once when it scrolls into view and stops at the payoff; the reader can scrub, jump between chapters and replay. Never loop a story.
- **Counterfactual on the same axis**: the baseline and the change share a scale; the difference is drawn and computed from the data.
- **Details on demand**: a crosshair or nearest-point readout on hover, written in the stage with a halo, and mirrored in an HTML readout for screen readers. Positional hover marks follow the pointer target through the runtime follower instead of staying where hover began.
- **Focus pull**: one control or step brings one region into focus (ring, brightness, or depth of field in 3D) and dims the rest to `--fs-dim`.
- **Presets**: named states (`fig.apply({ params, step, t })`) that jump to the interesting configurations; good as buttons under a figure or links in the prose.
- **Compare toggle**: A/B between two states of the same marks, with the transition animated so the change is traceable; ghost the previous state at low opacity when the difference is small.
- **Reset**: whenever a reader can change more than one thing, a Reset control returns to the authored state.

## 4. Controls: where they live and how they feel

These are rules, not suggestions.

**Direct manipulation before sliders.** If the variable has a place in the figure (a position, a radius, a threshold line, a moment on a time axis, a node, a boundary), the reader drags that thing in the figure. A slider is only for abstract parameters with no spatial meaning. Never put "focus x" and "focus y" sliders next to a focus ring: make the ring draggable and give it an edge knob for its radius (template Fig. 4).

**Settings live in a popover.** Every parameter that is not the interaction itself goes in the figure's settings popover, opened from a settings icon button in the plate head (generated by the runtime from `params` with the default `placement: "settings"`). Inline controls are reserved for the control that *is* the interaction: the time scrubber of a timeline, Prev/Next of a stepped figure, Play/Pause of a process, the scrubbable number in the sentence that makes the claim, or a single slider when the claim is literally about that abstract parameter and no spatial handle exists (`placement: "inline"`). Rendering knobs (field scale, strength, show/hide a series, particle count, smoothing used only for display) are always settings.

**Draggable handles** (`spec.handles`, see §6):
- Real focusable elements over the drawing (`.fs-handle`), so keyboard (arrows, Shift ×4) and touch work while the canvas keeps page scrolling. Hit area ≥ 24px (the whole disc for a ring), ≥ 44px on touch-first figures.
- Cursor `grab`, `grabbing` while held. The figure draws the states: rest, hover/focus (`f.handleHover`), held (`f.drag`): the stroke thickens (1.25 → 1.75 → 2.25px), knobs grow (4.5 → 6 → 7px) with a halo in the surface color, and a value label appears while held (`r 0.30`).
- Past its bounds a handle rubber-bands (iOS-style compression, `FS.rubber`, c = 0.55, dimension ≈ 22% of the region), then springs back on release with a slight overshoot (`FS.springTo`, k = 420, ζ = 0.62). Constraints that are not boxes (a radius) rubber-band inside `set()` and choose their resting point in `release()`.

**The physics slider** (`<div data-fs-param="id:name">`, `<div data-fs-seek="id">`, or `FS.slider(el, …)`); never a bare native range in a finished figure:
- 2px track in `--fs-line-strong`, fill in `--fs-fg`; a **vertical bar handle** 4×18px, radius 2, with a 3px halo in the surface color; it grows to 22px on hover and 5×26px while held, on the spring ease (`--fs-ease-spring`).
- A value bubble pops above the handle while held or keyboard-focused (scale 0.85 → 1 on the spring ease), plus a tabular value readout at the end of the row.
- Click anywhere on the track: the handle springs to the pointer and follows it.
- Past either end it **rubber-bands** (dimension max(28px, 18% of the track)); the track line stretches with it; on release it springs back with a small overshoot. The value never leaves its range.
- Magnet: marks (default: the authored value) snap within 6px; steps quantize. Timeline sliders get chapter marks.
- Keyboard: arrows (Shift ×10), PageUp/PageDown, Home/End; `role="slider"` with `aria-valuenow` and `aria-valuetext`.
- Reduced motion: no springs; values jump.

**The settings popover:** the icon rotates 90° while open; the panel opens from the icon's corner (opacity and a 0.96 → 1 scale on the spring ease) in the top layer (native `popover`, so plates never clip it), with a Reset that returns to authored values. Escape and outside clicks close it; focus moves to the first control and returns to the icon.

**Timelines: the surface is the scrubber.** Every figure with a time axis declares `timeAxis(f) -> { x0, x1, t0?, t1? }` and the runtime turns the whole drawing into a scrub surface:
- Hover shows where a click would land (`FS.k.hoverTime`: a faint dashed line and the time).
- Press and drag sideways: after a 4px threshold the clock follows the pointer through a short critically damped glide (smooth time 0.07 s: precise, with a sense of weight). Playback pauses; the cursor is `grabbing` page-wide; text selection is suppressed.
- Click a moment: the clock glides there (0.22 s). A fast release coasts a little further (projected landing, 0.12 s of the release speed) and settles.
- Touch: horizontal drags scrub, vertical drags scroll the page (`touch-action: pan-y`).
- Chapter buttons, ←/→, Home/End and the toolbar scrubber all glide through the same target clock (`seek(t, { animate: true })`), so every way of moving time looks the same and can be interrupted mid-flight.
- Draw the playhead with `FS.k.playhead` (its knob grows while held). The toolbar scrubber is a mirror, not the main control.

**Explanations: tips.** Any part whose role is not obvious gets a tip: a 1 to 3 word title and one or two plain sentences (`content-design.md` §6).
- HTML or SVG: `data-fs-tip="body"` with optional `data-fs-tip-title`; give SVG groups `tabindex="0"` so keyboard users reach them. Canvas: `tips: { key: { title, body } }` and `tipAt(f, x, y) -> key | { key, x, y } | null` (hit-test the rectangles stored during `render`).
- Timing: opens after a 500 ms hover; once one is open, neighbours open at once (warm group, 450 ms); closes after a 100 ms grace. Keyboard focus opens immediately; a tap toggles on touch; Escape and scrolling close it.
- Position: on pointer hover, the raw pointer (`f.pointer`) is the target and the tip plus positional hover marks draw from `f.hoverSmooth`, which follows with an 85 ms exponential time constant and settles exactly within 0.3 px. The tip keeps its cursor offset, flips and clamps inside the plate, and swaps title and body without resetting its drawn position when the pointer enters another part. Held handles still track 1:1, and keyboard focus stays anchored to the focused part. Reduced motion snaps to every pointer target.
- Look: surface, 1px strong line, small radius, soft shadow; enters with opacity and a 4px rise toward the anchor (140/220 ms), exits faster. Hovering a part highlights it at once (`f.hover`), even while the tip waits.
- Tips explain; they never hold the only copy of a number or a fact.

**Expand.** Every plate gets an expand button next to settings (opt out with `expand: false` or `data-fs-expand="false"`). The plate itself rises into the top layer (no DOM move, so canvases, state and React ownership survive) while a holder keeps its place in the page; it keeps its own layout and scales up, proportions unchanged, until it fills 84% of the viewport's width or height, whichever it reaches first, centered; the canvas renders at the scaled resolution so it stays sharp, and pointer math divides by the scale. A figure that reflows well (a Mermaid diagram) can set `expand: "fill"` to be laid out again at 84vw by up to 84vh instead. The motion rides a critically damped spring (ω 26, settled in about 0.35 s) and the page behind dims and blurs. Both ends are real resting layouts, so nothing snaps: never FLIP a scaled snapshot of one layout into a different layout (the expanded layout is proportionally shorter, so a width-ratio scale lands smaller than the original and then jumps), and never change a figure's proportions when it expands. The holder copies the plate's exact width and margins (wide plates break out of the text column), and closing aims at the holder. Close with the same button (its icon morphs to ×), Escape or a click on the backdrop; a reversal mid-flight keeps the current position and velocity. Focus moves to the close button, Tab stays inside, focus returns on close with `preventScroll` (a plain `focus()` makes the browser scroll a partly hidden opener into view, so the page jumps just after the plate lands; dialog libraries need their close auto-focus replaced for the same reason); page scroll is locked without a layout shift. Reduced motion: a short fade.

**Stable layout.** Nothing in a plate moves because a value changed.
- Step captions are stacked in one grid cell (runtime), so the box keeps the tallest caption's height and steps crossfade.
- Outputs that change (`data-fs-out`) reserve the width of their widest text: `t` and `step` automatically from `formatTime` and the step count; others through `reserve: { name: [samples] | (f) => samples }` with the widest values the figure can produce (longest label, largest number, negative sign). Digits are tabular.
- Buttons whose label would change (Play/Pause/Replay) are icon buttons of fixed size with an `aria-label`; the icons crossfade (opacity, scale 0.25 → 1, blur 4px → 0, 300 ms).
- Lists that grow ("running: a, b, c") do not belong in a toolbar line; show the state in the drawing.
- Verify by recording control and caption rectangles across every step, both ends of every range and a full playback (`verification.md`).

**Thresholds are handles.** Any bar, band or cut-off a figure shows (a report bar, an act/ask band, a false-alarm budget, a relevance cut) is draggable, snaps back to its default within a few pixels, and recomputes everything downstream live. Its tip says where the number came from (held out, stated, provisional, re-measured by hand) so a reader sees both the trade-off and that today it is a fixed choice.

**Split figures: scene and mechanism.** When a mechanism acts on something you can picture (a person on camera, a page in a browser, a voice in a room), draw the scene on the left (particles for a body or a camera view, a browser mock-up with a moving pointer) and the mechanism rows on the right, on one clock. Limit scrubbing to the chart half with `timeAxis(f).area`; the scene reacts (focus rings, outlines, the thing that changes) at the same moments the rows cross their bars. On phones the scene goes on top.

**Real people, traced, never shown.** When there is real footage of the person in the example (a recorded session, a demo clip), don't draw a mannequin. Run pose and person segmentation over the frames offline (MediaPipe's pose landmarker gives landmarks and a mask in one pass), keep only geometry (an outline resampled to a fixed number of points starting at the topmost point, plus the landmarks the story needs), quantize it, and animate particles on it: points along the outline, a fixed field of points lit wherever the body is, and the leading and trailing edges of movement marked by brightness and size. Ship no pixels, keep the extraction script beside the figure, check the timing against the recording's own measurements, and get the person's OK before anything is published. Smoothness comes from the data, not the drawing: keep every frame (not a 2 fps subsample), pick the take with the fewest recording gaps and the fewest frames cut by the frame edge, roll each outline so its points line up with the previous frame's (best circular shift), smooth each point lightly over time (a Gaussian of about 0.1 s), and blend linearly between saved frames. If points jump between frames, the outline starts at a different place each frame; fix the correspondence, don't add easing. Trace a moving limb as its own shape: give each person pixel to the arm or the body by which skeleton it is nearer (shoulder, elbow, wrist and hand landmarks against head, shoulders and torso), leave the shoulder joint to the body, and outline each part separately. One silhouette for both makes the outline melt and reform every time the arm leaves or meets the body; separate parts stay stable and the arm simply fades in and out. Draw outlines as a soft dotted line (dots about 1.8 px apart, 0.85 px, around half opacity with a little variation per dot), never scattered particles. Inside, keep only a soft, even texture (faint dots, a slow shimmer) and two round particle eyes; skip brows, nose, mouth and finger lines, which read as a face drawing instead of a trace. Keep keyframes adaptively (every source frame while the outline moves fast, a few per second while it's still): a fast arm swing moves a long way between 15 fps frames, and thinning those makes the blend cut corners. If a cleaner take of the same gesture exists than the session that produced the data, trace the cleaner one, play it at real speed, and map the recorded clock onto it with anchor pairs (raise to raise, hold to hold, drop to drop); mark on the axis wherever the recorded clock runs faster, and say in the caption that the person and the scores come from different recordings. Play the moment that matters at real speed and compress the rest with a piecewise clock, marked on the axis.

**Frames.** Every rich block in a content column gets the same frame and the same outer width: figure plates, images, diagrams, embeds, tables and code. The frame is a 4px band in the host's frame color around the content, outer radius 12px, inner media concentric (outer radius minus the band, 8px). One token sets the band (`--fs-frame-width`, bridged to the host's own frame variable); never style one kind of block on its own. A block nested inside another framed block (a table in a framed quote, code in a callout) fills its container and drops its own band, so frames never nest. Where a host's utility classes are `!important` (Tailwind's `important` mode), a width utility on a wrapper silently beats the wide-media rule: put the wide attribute on an element that carries no width utilities.

**Code blocks.** A toolbar above the code carries the language, a copy button (copies the text without the trailing newline, shows a check for about 1.5 s, stays silent if the clipboard is refused) and an expand button. The body scrolls past a set height (about 32rem, never more than 70% of the viewport) and is one scroll box in both directions: the `<pre>` grows to its longest line rather than scrolling on its own. Expanded, the code fills the viewport's expanded box, and clicks inside it select and scroll instead of closing; the backdrop, the close button and Escape close it.

**Generated figures with fixed ids.** A figure whose markup and script come from a standalone page keeps that page's ids. Before mounting it again (a remount, a client navigation), dispose any registration for ids inside its own container, and on unmount dispose only figures whose element sits inside that container. Otherwise an old registration keeps the id bound to a detached canvas and the visible one never draws.

**Plates keep their own type and surface.** A plate sets its own base size and line height, and every text part inside it sets its size, so nothing inherits the host's prose scale. A host whose prose rules are more specific than one class (`.post-body h3`, `.post-body p`) must skip plate contents without raising specificity: `.post-body p:where(:not(.fs-plate *))`. The plate sits one surface step above the page in every theme (in dark themes, one step up the gray ramp), and its inner fills sit one step above the plate.

**Theme changes move together.** A host that tweens its color tokens on `<html>` (the site animates every registered color token in one animation) must not leave canvases behind: read the tokens again every frame while `document.documentElement.getAnimations()` has a running animation, and draw in the same frame you read (waiting for the next tick lags by one). Palette and light/dark switch in the same call, so one animation carries both. Read tokens through one probe element per token so a read costs one style pass.

**Voice in an illustration.** When a person says something in a scene, show it as dictation, not a caption: a mic (accent while they talk), the last second of sound as a moving waveform, and the words appearing as they're said, in a pill sized for the whole sentence from the start. Time the words against the gesture: the pointing word ("this") lands while the pointer marks the thing, and what it triggers (things coming into focus) starts on that word. Put the same voice on the timeline row so the alignment is visible.

**Moving figures from a research page into articles.** Keep one source of truth: generate a module per figure from the research page (its markup plus a `mount(FS)` that runs its script), mount it from a small client component after the markup is in the document, dispose the figures it created on unmount, and load each one lazily where an article uses it. Fix lint findings in the source, not in the generated files, and format the output so a lint pass doesn't rewrite it.

**Mock-up screens.** When an example happens on a screen (a document, a board, a browser), draw a real app as a calm wireframe: window chrome with an address, a side rail or sidebar, a top bar with a title and one or two buttons, and content with believable density (a heading with a byline, ragged text lines, a checklist, photos with soft hills, small cards). Thin hairlines and low-contrast fills, real text only where it names something (the heading, the button, the file); everything else is 2.5 to 3px skeleton bars. No thick outlines, no cartoon icons, no big rounded blobs. Keep the window short enough that a key fits under it.

**What the agent looks at.** Mark attention with dashed outlines, the same way in every tab: thin dashed in a muted ink while something is in focus, accent dashed with a slow marching offset (stopped under reduced motion) once it gets attention, each with a short label above it. When the whole input is what gets scored (a camera frame), outline the whole frame, not a guessed region. Put a key titled "What the agent looks at" under every illustration, separated by a hairline, with a swatch for each mark used.

**Pointers move like a hand.** Never draw a ring around the pointer unless the story is a click. Script the pointer as rests, reaches and gestures, and generate the path from how people actually point. Calibrated on SapiMouse (22,446 aimed movements that end in a click, 120 people): a reach takes about 0.24 + 0.091 · log2(D/40 + 1) s for a distance of D screen pixels (median 0.43 s for 100 to 200 px, 0.5 s for 200 to 400 px); the speed peaks early (median 27% of the time); a fast first push ends about halfway through the time but covers about 91% of the distance, lands short three times out of four and about 5% to the side; then one or two slower corrections home in (69% of reaches have at least one); the path bows about 10% of its length (the 25th to 75th percentile is 5 to 20%), most at a third of the way, a little more often downward. Peak speeds sit around 1,750 px/s for 100 to 200 px and 2,900 px/s for 200 to 400 px at screen scale. In a mock-up, convert figure pixels to screen pixels first (a miniature window at 0.3 scale means a 90 px figure move is a 300 px screen move) so timings stay real. Rests are still apart from an occasional adjustment of a few pixels, or a slow glide along a line while reading; circles are loose, uneven ellipses at 0.6 to 0.8 s per loop, started and ended from rest. Check the path numerically: no jumps where segments meet, and duration, time to peak, peak speed and bow inside those ranges. Say in the caption that the path is generated. Use summary statistics only; don't ship recorded paths. Show the pointer's recent path as fading dots when the agent keeps it.

**Tabbed examples.** When one idea shows up in different situations (a camera watch, pointing at the screen, a back-reference), show it as one figure with tabs instead of three figures: the same stages and visual grammar, a different worked example per tab. Declare a param with `options` and `placement: "inline"`, and put `<div class="fs-tabbar"><div data-fs-param="id:example" data-label="Examples"></div></div>` under the head. The runtime builds a real tablist (←/→, Home/End) with a pill that slides to the active tab on a soft spring. On change, reset the clock and replay, crossfade the drawing (~280 ms), and say in the status which tabs are measured and which are illustrations. When the tabs are the figure's main choice, put them in the head in the title's place: `<h3 class="fs-title fs-sr">` keeps the title for screen readers, `<div class="fs-head-tabs" data-fs-param="id:example">` takes its spot, and the figure sets `--fs-tabs-width` on the plate to the width of the column the tabs control (so they span the illustration they switch, edge to edge), centered on one line with the status pill and the expand button. Keep legends to the marks a reader can't decode on their own; a speech bubble or a waveform explains itself.

**Buttons.** 32 to 44px visuals with hit areas of at least 40px (44px on touch) via a `::after` extension, never overlapping a neighbour's; press feedback `scale(0.96)` over 150 ms; hover background `--fs-surface-2`; visible focus rings.

**Theme picker = icon button top-right opening a shadcn-style dropdown; never a select in the hero.** A page that lets the reader pick a theme puts one palette icon button (`aria-label="Theme"`, `aria-haspopup="menu"`, `aria-expanded`) fixed in the top-right corner. It opens a menu with the anatomy and feel of shadcn/ui's `DropdownMenu`: a popover panel (`--fs-surface`, `--fs-line` border, `--fs-radius-inner`, `--fs-shadow`, 4px padding) under the button's right edge, a muted group label per section ("Dark", "Light"; every theme sits in the group of its mode), separators between groups, `role="menuitemradio"` items with `aria-checked` and a check on the active theme, and a max height with its own scroll (there are about 27 themes). Enter, Space or ↓ on the button opens it with focus on the active theme; ↑/↓ move, Home/End jump, typed letters jump to a name; Enter, Space or a click applies the theme and closes; Escape and Tab close and return focus to the button; a click outside closes. The choice is saved in `localStorage` and restored on load; with nothing saved the page follows the system's light or dark. Style it with `--fs-*` tokens only so every theme restyles it, and keep it inside the viewport at 390px (`width: min(14rem, 100vw - 32px)`). Standalone pages use the vanilla menu in `assets/plate-src.html`; React sites use the real shadcn `DropdownMenu` (`assets/react/README.md`). Either way the menu only calls `FS.setTheme` / `FS.setMode`.

## 5. Feel: feedback, continuity, recovery

- **Respond within 100 ms.** Any input changes something visible immediately (the value, the handle, the mark under the pointer), even if the full re-layout eases in afterward.
- **Ease toward targets, never jump.** Parameters animate toward their new value (`FS` damps `f.v` toward `f.params` with λ ≈ 12, about 80 ms to settle); steps cross-fade over ~0.48 s; the clock glides to every new time (0.07 s while dragging so the mark stays under the hand, 0.22 s for jumps).
- **Interruptible.** A new input redirects the motion from its current state; nothing queues.
- **Continuity of identity.** The same datum is the same mark across states; morph it, don't swap it.
- **Live readouts.** Every parameter shows its value with units and tabular figures; every derived claim updates with it.
- **Affordances on hover, not on load.** Handles and dashed underlines appear or strengthen on hover/focus; the resting figure stays clean.
- **Guard rails.** Clamp ranges to where the model is meaningful; snap to authored values; disable buttons at the ends of a sequence.
- **Recover.** Reset, Replay and Home are always available; a reader can never get the figure into a state the author did not consider.

## 6. The programmable layer (`FS` API)

Everything a reader can do, code can do, through the same path. That makes figures scriptable by other figures, by the prose, by tours, by tests and by agents.

```js
const fig = FS.figure("fig-id", {
  height: (w) => w * 0.5,                       // CSS px for a given width
  duration: 10.6, loop: false,                  // timelines; omit for processes
  chapters: [{ t: 1.6, label: "first call" }],  // ←/→ and seek stops
  steps: [{ caption: "…" }],                     // discrete states; a caption may be a function of f (it changes with a param)
  params: {
    smooth: { value: 0.9, min: 0, max: 0.98, step: 0.01, label: "Smoothing", format: (v) => v.toFixed(2) }, // settings popover
    window: { value: 4, min: 1, max: 12, step: 1, label: "Window", placement: "inline" },                    // the interaction
    showRaw: { value: true, label: "Show raw series" },                                                      // switch in settings
    mode: { value: "ema", options: [{ value: "ema", label: "EMA" }, { value: "box", label: "Box" }] },        // segmented in settings
  },
  handles: {
    focus: {
      label: "Focus: drag or use arrow keys", radius: (f) => ringRadiusPx,
      get: (f) => ({ x, y }), set: (f, x, y, phase) => {}, bounds: (f) => ({ x0, y0, x1, y1 }) /* or null */,
      release: (f) => ({ x, y }) /* optional resting point */,
    },
  },
  timeAxis: (f) => ({ x0: 96, x1: f.w - 16 }),    // timelines: the drawing scrubs (hover, drag, click, flick)
  tips: { lane: { title: "Reply", body: "…" } },   // explanations for drawn parts
  tipAt: (f, x, y) => "lane",                       // hit test in CSS px -> key | { key, x, y } | null
  reserve: { phase: ["waiting for first audio"] },  // widest text each changing output can show
  expand: true,                                     // false removes the expand button
  init(f) {}, update(f, dt) {}, render(f, ctx) {}, resize(f) {}, onParam(f, name, value) {}, onStep(f, n) {},
  settle: 3,                                    // seconds to pre-run a process for the reduced-motion still
  keyframe: 9.8,                                // the moment a reduced-motion reader sees for a timeline
});
fig.play(); fig.pause(); fig.seek(4.8); fig.seek(4.8, { animate: true }); fig.chapter(+1);
fig.expand(); fig.collapse();
fig.goto(2); fig.next(); fig.set("smooth", 0.97); fig.set({ smooth: 0.5 }, { instant: true });
fig.state();            // { t, step, params, playing } — serializable
fig.apply(state);       // restore a preset or a shared link
fig.on("param", ({ name, value }) => {}); // also: step, seek, play, pause, end, hover, reset
fig.out("bump", "0.069");                 // writes [data-fs-out="fig-id:bump"]
fig.openSettings(); fig.closeSettings();
FS.rubber(x, min, max, dim); FS.springTo(state, target, dt, k, z); FS.follow(state, target, dt, { tau: 0.085, epsilon: 0.3 }); FS.animate((dt) => done); FS.slider(el, options);
FS.k.playhead(f, ctx, x, y0, y1); FS.k.hoverTime(f, ctx, y0, y1, toX, format); FS.reserve(el, samples); FS.tip({ title, body }, rect);
FS.get("fig-id"); FS.list(); FS.setTheme("tokyo-night"); FS.setMode("light");
```

Inside `render(f, ctx)`: `f.t` (clock), `f.pointer` (raw pointer in figure pixels), `f.hoverSmooth` (the damped pointer for positioned hover marks), `f.hoverT` and `f.hoverTSmooth` (raw and damped time on a scrub surface), `f.step`, `f.from`, `f.stepT` (0→1 transition), `f.v` (eased params), `f.params` (targets), `f.hover`, `f.drag` (`"time"` while the surface is held, or a handle key) and `f.handleHover`, `f.w`, `f.h`, `f.C` (resolved theme colors and fonts), `FS.k` (drawing kit), `FS.window(t, t0, t1)` (eased progress through a declared interval). Keep `render` a pure function of these; put simulation state in `update`.

Declarative bindings let markup drive figures with no glue code: `data-fs="id play|next|prev|reset|chapter-next|chapter-prev"`, `data-fs-param="id:name"`, `data-fs-seek="id"`, `data-fs-out="id:name|t|step|caption"`, `data-fs-dots="id"`, `data-fs-scrub="id:name"`, `data-fs-ref="id:key"`, `data-fs-tip="body"` (+ `data-fs-tip-title`). Each figure element also dispatches `fs:<event>` DOM events (including `scrub` and `expand`).

React: keep the same contract with a controller hook (`assets/react/use-figure.ts`) exposing the same verbs through `useImperativeHandle`, and never `setState` per frame.

## 7. Accessibility and input parity

- Keyboard: the stage is focusable; Space plays/pauses, ←/→ step or jump chapters, Home/End go to the ends. Scrubbable numbers are `role="slider"` with arrow keys (Shift for ×10).
- Touch: no hover-only information. Linked words and nodes respond to tap/focus; scrubbing uses pointer capture and `touch-action: none` only on the scrub target, never on the stage, so the page still scrolls.
- Screen readers: figure has a label; the step caption has a polite live twin; numbers that matter exist as HTML text (readouts, outputs); a shown tip is linked with `aria-describedby`.
- Expanded plates keep focus inside and return it to the expand button on close.
- Reduced motion: no autoplay; timelines show their keyframe/payoff; processes show a settled still; steps jump; eased params snap.

## 8. Anti-patterns

- A slider that changes something the text never mentions.
- A slider for a spatial variable (position, radius, threshold) instead of a handle in the figure.
- Rendering knobs sitting in the toolbar instead of the settings popover.
- Native range inputs in a finished figure; hard stops with no rubber band or settle.
- Controls that only exist on hover, or only with a mouse.
- Visible lag between the hand and the mark while dragging (more than ~80 ms); glide, do not trail.
- Tooltips as the only place a number appears.
- Hijacking scroll or wheel for zoom inside an article.
- A "Play" that loops a narrative forever; a story with no payoff state.
- More than two simultaneous moving things competing for attention.
- Readouts that disagree with the marks because one was typed by hand.
- A timeline that can only be moved through a small slider; a scrub that jumps instead of gliding.
- Text buttons whose label changes width (Play/Pause), captions that change the box height, numbers without a reserved width.
- Codenames and internal identifiers as the only label ("worker-file", "Router v1.14").
- Tips that open instantly on every hover, or that hold the only copy of a fact.
- Figures that cannot be opened larger.
- A theme `<select>` (or a "themebar") in the hero; the theme picker is the top-right icon dropdown.
