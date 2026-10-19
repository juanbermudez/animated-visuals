# Verification

Source proves wiring. Only a render proves a figure. Nothing is "done" until each figure has been seen in each of its states, at desktop and phone widths, in both themes.

## Checklist

1. **Console clean**: no errors or warnings on load, on every step, and after toggling every control.
2. **Every state seen**: step through every step; toggle every control; drag every slider to both ends and the middle. Screenshot the states that carry the argument.
3. **Widths**: 1440 and 390 CSS px (and the plate's own minimum). Labels unclipped, no overlapping labels, no horizontal page scroll, controls wrap rather than overflow.
4. **Themes**: the default in dark and light (`FS.setMode`), one dark and one light Omarchy theme (`FS.setTheme('tokyo-night')`, `FS.setTheme('catppuccin-latte')`). Canvas figures must repaint; nothing may keep a hard-coded surface.
5. **Numbers agree**: readouts, direct labels, captions and prose show the same values; the values come from the data, not typed by hand.
6. **Reduced motion**: emulate it; timelines show their keyframe/payoff, processes a settled still; steps jump; nothing is missing.
6b. **Programmable state**: drive each figure from the console (`FS.get(id).seek(...)`, `.goto(...)`, `.set(...)`) and confirm the prose, readouts and controls follow.
7. **Keyboard**: Tab reaches every control; ←/→ step a focused stage; Space toggles play; focus rings are visible; handles move with arrow keys; the settings popover opens from its icon, Escape closes it and focus returns to the icon.
7b. **Direct manipulation**: drag each handle and slider past its bounds and release: it rubber-bands while held and springs back (measure positions over frames, e.g. `getBoundingClientRect` per rAF). Drags must work with synthetic pointer events too (pointer capture is best-effort).
7c. **Layout stability**: record the rectangles of the toolbar controls, the head, the step text and every output at every step, at both ends of every range and through a full playback (`getBoundingClientRect`). Controls must not move by a pixel and the caption box must not change height.
7d. **Timeline surface**: hover shows the target time; a drag scrubs (the clock follows within ~80 ms); a click glides to the moment; ←/→ and chapter buttons glide; a vertical touch drag still scrolls the page.
7e. **Tips**: none opens before 500 ms; neighbours open at once once one is open; focus opens immediately; Escape closes; every tip fits the viewport at 390 px.
7f. **Expand**: opens from the plate's slot and lands centered with no flash; record the plate's rect every frame through open and close and check that it moves monotonically and that the last closing frame equals the original rect (a mismatch shows up as a snap); figures re-render at the new width; Escape, the × and a backdrop click close it; reversing mid-flight works; focus is trapped and returns; the page does not shift behind it; it works at 390 px.
8. **Cold reader**: read every label as a stranger. Each names a role, not a codename; copy is within the budget (`content-design.md` §5) and in the chosen writing style.
9. **Screen reader basics**: each figure has an `aria-label` or labelled title and a caption; numbers that matter also appear as HTML text.
10. **Performance**: report averaged simulation and draw ms per frame and the frame interval, with device, viewport and DPR. Check the loop sleeps when figures are offscreen (no rAF activity while scrolled away).
11. **Motion review**: watch each animation for at least one full cycle. For anything subtle, record frames and scrub them.

## Recording motion

Capture a canvas figure without screen recording: draw, then grab frames.

```js
// In the page: capture N frames from a canvas at a fixed step, return data URLs.
async function capture(canvas, frames = 90, every = 2) {
  const out = [];
  for (let i = 0; i < frames * every; i++) {
    await new Promise(r => requestAnimationFrame(r));
    if (i % every === 0) out.push(canvas.toDataURL('image/png'));
  }
  return out;
}
```

Save the frames as `frame-0001.png`… and assemble:

```bash
ffmpeg -y -framerate 30 -i frame-%04d.png -vf "scale=960:-2:flags=lanczos" -pix_fmt yuv420p clip.mp4
```

WebGL canvases need `preserveDrawingBuffer: true` (or capture right after `render()` in the same task) for `toDataURL` to return pixels.

## Browser gotchas

- A hidden or minimized preview never fires `requestAnimationFrame` and barely advances Web Animations (an expand can sit at 0 ms): animations look frozen though the code is fine. Check `document.visibilityState` before debugging "broken" motion.
- In the Claude desktop app's browser pane, local files open as static `data:` snapshots: `location.reload()` re-shows the old build. After rebuilding, navigate to the file again (each file navigation opens a new tab) or serve the folder from a `.claude/launch.json` static server and reload that.
- Size drawings from layout (`clientWidth`), never `getBoundingClientRect`, which includes transforms: a resize during any transform would otherwise record the wrong width and leave a blurry canvas.
- When sampling a canvas per frame to check it follows a theme tween, start the recorder after the change: rAF callbacks run in registration order, so a recorder registered earlier reads the canvas before the runtime draws and shows a false one-frame lag.
- Check the plate itself rendered: `document.querySelector("figure.fs-plate")`. The runtime finds the settings header and plate styles through that class, so a malformed class (for example `fs-platewide`) silently drops the settings button and every plate style.
- Screenshots below the fold may render blank in some harnesses; scroll the figure into view first or inspect computed values.

## Reporting

State what was verified in the browser, at which widths and themes, and what was not (for example: "touch not tested on a device", "screen reader not run"). Include before/after screenshots with identical framing for any redesign.
