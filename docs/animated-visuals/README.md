# Animated Visuals docs site

The docs and live gallery for the skill, published with GitHub Pages from this `docs/` folder. Plain HTML, CSS and the skill's own runtime: no build step, no server code, no third-party scripts (fonts load from Google Fonts).

## Run it locally

Serve the folder over HTTP (opening the files directly works for most things, but a server matches Pages):

```sh
python3 -m http.server 8000 -d docs
```

Then open <http://localhost:8000>. Run it from the skill's root folder, or pass the full path to `docs`.

## Refresh the vendor files

Pages can only serve files inside `docs/`, so the runtime and themes are copied in. After any change to the runtime, the themes or the credits, run:

```sh
node docs/sync.mjs
```

It needs Node 18 or newer and nothing else. It:

- copies `assets/runtime/fs-runtime.js` and `themes/base.css`, `default.css`, `notebook.css`, `omarchy.css` into `docs/vendor/`
- writes `docs/vendor/themes.js`, the theme list for the picker and the themes page, from `themes/omarchy.json`
- renders `THIRD_PARTY_NOTICES.md` into `credits.html` and `themes/site-bridge.css` into `themes.html`, between their `<!-- name:start -->` and `<!-- name:end -->` markers

Don't edit anything in `vendor/` or between those markers by hand; the next sync overwrites it. Commit the synced files, since Pages serves them as they are.

## What's where

| Path | What |
|---|---|
| `index.html` | What it is, install, a live hero figure |
| `gallery.html` + `site/gallery*.js` | A live figure for each of the 27 diagram types in `references/diagram-types.md`, with a sidebar grouped as there, plus a dot plot, a particle field and the semantic patterns. `gallery-kit.js` holds the shared canvas helpers, `gallery-nav.js` the sidebar; the figures are split by group (`gallery-structure.js`, `gallery-flow.js`, `gallery-position.js`, `gallery-charts.js`; the first seven are in `gallery.js`) |
| `themes.html` + `site/themes.js` | Every theme as a card with live swatches and a live figure, searchable and filtered by mode and family (kept in the URL), the token table, writing a theme, bridging to a site |
| `customize.html` + `site/customize.js` | The figure spec, runnable samples (each code block shows the script that runs next to it), the FS API, React assets, writing styles |
| `credits.html` | Credits, rendered from `THIRD_PARTY_NOTICES.md` |
| `site/site.css` | Page chrome. Colors come only from `--fs-*` tokens, so the page and figures change theme together |
| `site/site.js` | Theme picker, code highlighting, copy buttons, live source blocks |
| `vendor/` | Synced from the skill (see above) |
| `screenshots/` | Captures from the last verification pass |

## How theming works here

- The picker sets `data-fs-mode` (Default light or dark) or `data-fs-theme` (everything else) on `<html>`, exactly like `FS.setMode` and `FS.setTheme`, and saves the choice in `localStorage` under `av-theme`. A small inline script in each page's `<head>` applies it before first paint. With nothing saved, Default follows the system's light or dark setting.
- The color tokens are registered with `@property` in `site/site.css` and transition on `<html>`. While `<html>` has a running animation, the runtime re-reads tokens every frame, so canvas and SVG figures change color with the page.
- A plate with its own `data-fs-theme` keeps that theme whatever the page uses; the themes page relies on that.

## Adding a figure

Copy one of the samples on the customize page: a `.fs-plate` in the page, then `FS.figure(id, spec)` in a script after it. Keep text at 11px or more at every width by laying SVG out in CSS pixels (`viewBox` = the figure's own size) and switching layouts at narrow widths instead of scaling down. Use only synthetic data and say so in the plate's status or caption.
