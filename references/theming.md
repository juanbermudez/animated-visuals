# Theming

Styles are layers that can be swapped or overridden without touching figure code. Figures read only `--fs-*` tokens, resolved at draw time from the figure's own element, so a theme can be applied to the whole page or to a single figure.

## Layers

| Layer | File | Owns |
|---|---|---|
| Tokens: default | `themes/default.css` | monochrome, ink accent, Manrope, JetBrains Mono, 12px frames, 240 ms soft easing; dark default, light via `data-fs-mode="light"` or system preference |
| Tokens: registers | `themes/notebook.css` | the lab-notebook register (mono figure text, uppercase heads, square corners, amber focus) as `notebook` / `notebook-light` |
| Tokens: Omarchy | `themes/omarchy.css` (generated) | 23 palettes from Omarchy's theme `colors.toml` files, as `data-fs-theme="<id>"` |
| Structure | `themes/base.css` | plate, head, stage, toolbar, controls, params, dots, captions, readouts, scrubbable numbers, linked words, live highlight, phase chip; tokens only |
| Page | the page's own CSS | layout around figures |

The standalone template inlines all four (`scripts/build-template.mjs`).

## Token contract

Colors: `--fs-bg`, `--fs-surface` (plate), `--fs-surface-2` (hover/raised), `--fs-line`, `--fs-line-strong`, `--fs-faint`, `--fs-muted` (≥ 4.5:1 on the page), `--fs-fg`, `--fs-strong`, `--fs-accent` (focus; ≥ 3:1 on the surface), `--fs-c1`…`--fs-c6` (categories, each ≥ 3:1), `--fs-good`, `--fs-bad`.

Type: `--fs-font-body`, `--fs-font-display`, `--fs-font-mono`, `--fs-font-figure` (text inside figures), `--fs-size-title|status|label|tick|caption`, `--fs-weight-title`, `--fs-head-case`, `--fs-head-tracking`.

Shape and motion: `--fs-radius`, `--fs-radius-inner`, `--fs-radius-control`, `--fs-border`, `--fs-frame-width` (the plate's frame band, 4px) and `--fs-frame` (its color, surface-2 by default), `--fs-control-size`, `--fs-stroke-hair|edge|series`, `--fs-dim`, `--fs-dur`, `--fs-dur-step`, `--fs-ease`.

In canvas, use `f.C` (`f.C.fg`, `f.C.accent`, `f.C.c[0]`, `f.C.font`, `f.C.dim`, `f.C.edge`, `f.C.series`); in SVG, set attributes from `f.C` in `render` or use `var(--fs-…)` in CSS.

## Switching and overriding

- Page: `FS.setTheme("tokyo-night")`, `FS.setTheme(null)` for the default; `FS.setMode("light" | "dark" | null)` for the default light-dark pair. Omarchy themes carry their own mode.
- Reader-facing picker: theme picker = icon button top-right opening a shadcn-style dropdown; never a select in the hero. Default light is `FS.setTheme(null)` + `FS.setMode("light")`; Default is `FS.setMode("dark")` + `FS.setTheme("default")`; every other theme is `FS.setMode(null)` + `FS.setTheme(id)`. Anatomy, keyboard and persistence: `interaction.md` §4 "Theme picker"; working code in `assets/plate-src.html`.
- One figure: put `data-fs-theme="nord"` on its `.fs-plate`.
- Overrides: declare any token after the theme layer, globally or on a plate: `.fs-plate { --fs-radius: 4px; --fs-accent: #ff6a3d; }`.
- New theme: copy a block from `omarchy.css`, change values, check contrast (muted 4.5:1, accent and categories 3:1).
- Inside a host site: map tokens to the site's variables once (`themes/site-bridge.css` is a worked example with placeholder `--site-*` names: `--fs-bg: var(--site-bg)`, `--fs-surface: var(--site-panel)`, `--fs-fg: var(--site-text)`, `--fs-accent: var(--site-accent)`, `--fs-font-body: var(--site-font-body)`, `--fs-radius: var(--site-radius-large)`). The runtime resolves `var()` chains and `color-mix()` through a probe element, so canvas figures follow the site's palettes too.

## Omarchy palettes

Source: `themes/omarchy.json`, copied from `github.com/basecamp/omarchy` themes at commit `81fd2d2` (MIT). Each theme's `colors.toml` gives mode, accent, background/foreground ladders and ANSI hues; original theme authors keep their credit (Catppuccin, Everforest, Flexoki, Gruvbox, Kanagawa, Nord, Rosé Pine, Tokyo Night). Omarchy's `rose-pine` is the Dawn (light) variant.

`scripts/build-themes.mjs` derives every ladder from the theme's background and foreground with the same 12-step structure as the default theme's grays, then enforces contrast: muted text is raised until it reaches 4.5:1 (17 themes needed it), the steps above it stay monotonic, and the accent and hues move toward the foreground until they reach 3:1 on the surface. Adjustments are written as comments in the generated CSS.

To refresh from upstream: download each theme's `colors.toml`, update `themes/omarchy.json` (keep `commit`), run `node scripts/build-themes.mjs`, then `node scripts/build-template.mjs`. For a site: `node scripts/build-themes.mjs --site-css <path>/palettes.css --site-json <path>/palette-data.json`.

## Theme parity rules

- Every color a figure uses is a token; nothing hard-codes a light surface.
- Captions, labels and exported images get the same treatment in both modes (transparent PNG exports or one per mode).
- A hue keeps one meaning across all figures on a page, in every theme.
- Check at least one dark Omarchy theme, one light one, and the default in both modes before shipping a figure.
