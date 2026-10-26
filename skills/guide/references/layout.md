# Layout

## Page anatomy

Use this order:

1. A header with the guide brand and theme button.
2. An optional table of contents for long guides.
3. The title, opening, audience, prerequisites, and scope.
4. The hero figure.
5. Sections on the fixed skeleton.
6. The reference section.

Use a skip link when prerequisites exist. Its target begins after the prerequisite section so prepared readers can move straight to the problem.

## Measures and spacing

- Keep prose at `46rem` or narrower.
- Let wide figure plates, large tables, and code pairs reach `58rem`.
- Use `20px` side padding on phones.
- Use an `8px` spacing rhythm. Half steps of `4px` are acceptable inside controls.
- Place the hero figure after the opening context and before the first detailed section.
- Keep one screen of prose plus its figure in a section at 1,440 CSS pixels wide.

## Type scale

| Role | Size | Notes |
|---|---|---|
| Page title | `clamp(2rem, 1.5rem + 2vw, 3rem)` | 3 to 6 words |
| Section heading | `1.5rem` | Sentence case |
| Subheading | `1.125rem` | Use sparingly |
| Body | `1rem` to `1.0625rem` | About 46rem measure |
| Lede | `1.1875rem` | 2 or 3 sentences |
| Caption and source | `0.8125rem` to `0.875rem` | Never below 11px rendered |
| Code | `0.875rem` | Wrap where safe |

Use the type tokens supplied by animated-visuals. Keep code and changing numbers in the mono face. The build does not inline font files. When the page is offline, each token falls back to the system font named in its stack.

## Responsive rules

- At 390 CSS pixels, plates fill the available width and reflow instead of shrinking their text.
- Tables scroll inside a labelled wrapper. The page itself never scrolls horizontally.
- Code wraps by default. A line that cannot wrap scrolls inside the code block.
- Put code and plain English in one column below 720 CSS pixels.
- Keep controls at least 40 CSS pixels tall. Use 44 CSS pixels for touch-first actions.
- Do not hide essential facts on hover.

## Four surfaces

Use only the shared token roles:

| Surface | Token | Use |
|---|---|---|
| Page | `--fs-bg` | Body background |
| Plate or card | `--fs-surface` | Framed figures and cards |
| Content block | `--fs-block` | Notes, formulas, code, and table headings |
| Figure node | `--fs-node` | Boxes inside a figure |
| Raised state | `--fs-surface-2` | Hover, selected, or raised controls |

Do not use a node surface as a page card. Keep the four lightness steps distinct in every theme.
