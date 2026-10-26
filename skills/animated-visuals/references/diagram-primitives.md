# Diagram presentation primitives

These primitives support a diagram whose type and claim are already clear. They do not add a second story.

The rules below are adapted from diagram-design once for this section and narrowed to animated, interactive figures.

## Attached callouts

- A callout has three parts: a target dot, a dashed translucent leader and a short label on a quiet surface.
- Keep it in the margin or open canvas, not across the main flow.
- Use at most two. If the note merely names a part, make it a direct label instead.
- Store the anchor in the same model as the target. When the target moves, recompute the leader from that anchor so the note cannot drift away.
- Ease both ends toward their new positions on the figure clock. The resting still shows the final attachment.

## Icons

- Use an icon only when its silhouette is recognized faster than its label.
- Keep a label beside or below it. Unfamiliar technologies still need words.
- Use one icon family and one stroke weight in a figure. Do not mix outline and filled marks without a semantic reason.
- Icons inherit the figure ink or accent; they do not introduce a brand rainbow.
- A specimen grid is navigable by keyboard and exposes a plain name and role for every mark.

## Sketch treatment

- Sketch treatment changes the register, not the geometry or content.
- Generate a small seeded displacement once. Never sample new noise per frame.
- Apply the wobble to shapes and connectors only. Text, numbers, handles and hit targets stay exact.
- Keep the amplitude subtle enough that endpoints, cardinalities and thresholds remain unambiguous.
- Reduced motion uses the same settled shape; the option does not wiggle continuously.

## Terminal and log figures

- Use terminal chrome only when commands or log order are part of the claim.
- A log is an ordered record: append on one clock, keep sequence numbers or times visible, and stop at a complete outcome.
- The viewport may follow the newest line during playback. At rest and under reduced motion, the decisive lines remain visible without scrolling.
- Play, pause, scrub, Home and End use the same figure state. Semantic logs do not loop.
- Use one accent for the active or decisive line; success and failure also have words or symbols.

## Shared checks

- The still frame tells the story.
- Motion is eased and interruptible.
- Keyboard and touch reach the same information as pointer hover.
- `FS.get(id)` can drive every reader-visible state.
