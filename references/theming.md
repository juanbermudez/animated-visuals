# Theming

Styles are layers that can be swapped or overridden without touching figure code. Figures read only `--fs-*` tokens, resolved at draw time from the figure's own element, so a theme can be applied to the whole page or to a single figure.

## Layers

| Layer | File | Owns |
|---|---|---|
| Tokens: default | `themes/default.css` | monochrome, ink accent, Manrope, JetBrains Mono, 12px frames, 240 ms soft easing; dark default, light via `data-fs-mode="light"` or system preference |
| Tokens: notebook | `themes/notebook.css` | the Notebook theme (mono figure text, uppercase heads, the shared 12 / 6 / 4px radius scale, amber focus) as `notebook` / `notebook-light` |
| Tokens: Omarchy | `themes/omarchy.css` (generated) | 23 palettes from Omarchy's theme `colors.toml` files, as `data-fs-theme="<id>"` |
| Structure | `themes/base.css` | plate, head, stage, toolbar, controls, params, dots, captions, readouts, scrubbable numbers, linked words, live highlight, phase chip; tokens only |
| Page | the page's own CSS | layout around figures |

The standalone template inlines all four (`scripts/build-template.mjs`).

## Token contract

Colors: `--fs-bg` (page), `--fs-surface` (plate or card), `--fs-block` (code, callout, note, formula or table heading), `--fs-node` (boxes and panels drawn inside a figure), `--fs-surface-2` (raised or hover surface), `--fs-line`, `--fs-line-strong`, `--fs-faint`, `--fs-muted`, `--fs-fg`, `--fs-strong`, `--fs-accent` (focus; ≥ 3:1 on the surface), `--fs-link`, `--fs-link-underline`, `--fs-c1`…`--fs-c6` (categories, each ≥ 3:1), `--fs-good`, `--fs-bad`.

Old figures can read the node fill as `var(--fs-node, var(--fs-surface-2))`. New figures use `--fs-node` directly.

## Four surface steps

Measure the steps on OKLCH lightness:

- `--fs-bg` → `--fs-surface`: ΔL ≥ 0.025.
- `--fs-bg` → `--fs-block`: ΔL ≥ 0.055.
- `--fs-surface` → `--fs-node`: ΔL ≥ 0.045.
- `--fs-surface` → `--fs-surface-2`: ΔL ≥ 0.025.
- `--fs-node` ↔ `--fs-surface-2`: ΔL ≥ 0.015 when they can touch or sit side by side.

Dark themes make the plate lighter than the page. Light themes may use a lighter or darker plate; use the direction that keeps the palette recognisable. Every surface stays in the page's hue and chroma family. Do not put a gray card on a tinted page.

`--fs-fg`, `--fs-muted` and `--fs-link` reach at least 4.5:1 on the page, plate, block and node. `--fs-link-underline` reaches at least 3:1 there and on the raised surface. Run `node scripts/check-contrast.mjs` after changing a theme.

Links keep their underline at rest: 1px, about 3px from the text. `--fs-link` differs from body text; `--fs-link-underline` may carry the accent when the accent is not readable enough for link text. Visited links look the same as unvisited links.

Type: `--fs-font-body`, `--fs-font-display`, `--fs-font-mono`, `--fs-font-figure` (text inside figures), `--fs-size-title|status|label|tick|caption`, `--fs-weight-title`, `--fs-head-case`, `--fs-head-tracking`.

Shape and motion: `--fs-radius`, `--fs-radius-inner`, `--fs-radius-control`, `--fs-border`, `--fs-frame-width` (the plate's frame band, 4px) and `--fs-frame` (its color, surface-2 by default), `--fs-control-size`, `--fs-stroke-hair|edge|series`, `--fs-dim`, `--fs-dur`, `--fs-dur-step`, `--fs-ease`.

In canvas, use `f.C` (`f.C.fg`, `f.C.accent`, `f.C.c[0]`, `f.C.font`, `f.C.dim`, `f.C.edge`, `f.C.series`); in SVG, set attributes from `f.C` in `render` or use `var(--fs-…)` in CSS.

## Colors are OKLCH

Every theme color is written as `oklch(L C H)`: lightness from 0 to 1, chroma (0 is gray), hue in degrees (0 for grays); translucent shadows are `oklch(0 0 0 / 8%)`. Equal steps in L look like equal steps in lightness, which is why ramps and contrast fixes are easier to reason about than in hex.

- The values are exact: each one converts to precisely the 8-bit sRGB color it came from, so the themes look as they did in hex. `scripts/oklch.mjs` does the conversion (sRGB -> linear -> LMS -> OKLab -> OKLCH with the CSS Color 4 matrices; L and C printed to 5 decimals, H to 3, which round-trips all 16,777,216 8-bit colors).
- `node scripts/verify-oklch.mjs` checks every color in `themes/*.css`: OKLCH only, and every value an exact sRGB color.
- `node scripts/hex-to-oklch.mjs <file>` rewrites a hand-written hex theme in place.
- The runtime needs nothing special: canvases receive the computed color string and accept `oklch()` in every current browser.

## Switching and overriding

- Page: `FS.setTheme("tokyo-night")`, `FS.setTheme(null)` for the default; `FS.setMode("light" | "dark" | null)` for the default light-dark pair. Omarchy themes carry their own mode.
- Reader-facing picker: theme picker = icon button top-right opening a shadcn-style dropdown; never a select in the hero. Default light is `FS.setTheme(null)` + `FS.setMode("light")`; Default is `FS.setMode("dark")` + `FS.setTheme("default")`; every other theme is `FS.setMode(null)` + `FS.setTheme(id)`. Anatomy, keyboard and persistence: `interaction.md` §4 "Theme picker"; working code in `assets/plate-src.html`.
- One figure: put `data-fs-theme="nord"` on its `.fs-plate`.
- Overrides: declare any token after the theme layer, globally or on a plate: `.fs-plate { --fs-radius: 4px; --fs-node: oklch(0.32504 0 0); --fs-accent: oklch(0.70393 0.19154 37.126); }`.
- New theme: copy a block from `omarchy.css`, change values, then run `node scripts/check-contrast.mjs` and `node scripts/verify-oklch.mjs`. Write colors in OKLCH; to start from hex, write hex and run `node scripts/hex-to-oklch.mjs <file>`.
- Inside a host site: map tokens to the site's variables once (`themes/site-bridge.css` is a worked example with placeholder `--site-*` names: page → `--fs-bg`, panel → `--fs-surface`, content block → `--fs-block`, figure box → `--fs-node`, raised panel → `--fs-surface-2`, text → `--fs-fg`, and site link roles → `--fs-link` / `--fs-link-underline`). Map the type and radius tokens in the same layer. The runtime resolves `var()` chains and `color-mix()` through a probe element, so canvas figures follow the site's palettes too.

## Omarchy palettes

Source: `themes/omarchy.json`, copied from `github.com/basecamp/omarchy` themes at commit `81fd2d2` (MIT). Each theme's `colors.toml` gives mode, accent, background/foreground ladders and ANSI hues; original theme authors keep their credit (Catppuccin, Everforest, Flexoki, Gruvbox, Kanagawa, Nord, Rosé Pine, Tokyo Night). Omarchy's `rose-pine` is the Dawn (light) variant.

`scripts/build-themes.mjs` derives every ladder from the theme's background and foreground with the same 12-step structure as the default theme's grays, then enforces contrast: muted text is raised until it reaches 4.5:1 (17 themes needed it), the steps above it stay monotonic, and the accent and hues move toward the foreground until they reach 3:1 on the surface. Adjustments are written as comments in the generated CSS.

`themes/omarchy.json` keeps the upstream hex values; the build derives in sRGB and writes OKLCH, and stops if any written value does not convert back to its hex. To refresh from upstream: download each theme's `colors.toml`, update `themes/omarchy.json` (keep `commit`), run `node scripts/build-themes.mjs`, then `node scripts/build-template.mjs` and `node docs/sync.mjs`. For a site: `node scripts/build-themes.mjs --site-css <path>/palettes.css --site-json <path>/palette-data.json`.

## Theme parity rules

- Every color a figure uses is a token; nothing hard-codes a light surface.
- Captions, labels and exported images get the same treatment in both modes (transparent PNG exports or one per mode).
- A hue keeps one meaning across all figures on a page, in every theme.
- Check at least one dark Omarchy theme, one light one, and the default in both modes before shipping a figure.
