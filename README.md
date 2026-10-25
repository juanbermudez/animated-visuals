# Animated Visuals

**An agent skill for interactive and animated figures.**

An agent skill for Claude Code, Codex and other coding agents. It builds explorable charts, stepped mechanism diagrams, animated architecture flows, timelines you can scrub, particle fields and WebGL scenes for papers, articles, explainers and sites. Every figure proves one claim, runs on one clock, can be driven by code, and is checked in a real browser before it ships.

[Docs and live examples](https://juanbermudez.github.io/animated-visuals/) · [Diagram types](references/diagram-types.md) · [Credits](THIRD_PARTY_NOTICES.md)

---

## Figure types

- **Diagrams that explain a process**: architecture flows with packets on the path that matters, flowcharts with a token that takes the branch, sequence diagrams that draw on in order, state machines you fire events at.
- **Timelines you can scrub**: drag anywhere on the surface and the clock glides there; hover shows the time under the pointer; chapters mark the moments that matter.
- **What-if figures**: drag a threshold, a rate or a budget and watch the outcome recompute.
- **Charts**: hand-built or with nivo for React sites, themed to the page.
- **Fields and scenes**: particle fields, traced movement, three.js and react-three-fiber scenes with depth of field.

All 27 diagram types from [diagram-design](https://github.com/cathrynlavery/diagram-design) have guidance for their animated and interactive version: what should move, what the reader can do, and what goes wrong ([references/diagram-types.md](references/diagram-types.md)). For static, branded diagrams, use diagram-design itself.

## Install

```bash
git clone https://github.com/juanbermudez/animated-visuals ~/.claude/skills/animated-visuals
```

For Codex, clone into `~/.codex/skills/animated-visuals`. Other agents: point them at `SKILL.md`.

Then ask for a figure: *"Make the reply-time breakdown in section 3 interactive"*, *"Turn this architecture into an animated diagram"*, *"Add a timeline I can scrub for this session log"*.

## How it works

- **`SKILL.md`** is the workflow: claim first, pick the form, pick a writing style, build, verify. It loads only the references a task needs.
- **The runtime** (`assets/runtime/fs-runtime.js`, global `FS`, no dependencies) gives every figure one clock, steps, eased parameters, draggable handles, a timeline surface, hover tips, expand to fit the screen, stable layout and a controller API (`play`, `seek`, `set`, `state`, `apply`, events) that prose, tests and agents all use.
- **Themes** (`themes/`) are CSS token layers. A figure never hardcodes a color.
- **React assets** (`assets/react/`) wrap the runtime for React and Next.js sites: `FigurePlate`, `useFigure`, typed figure metadata, a nivo theme, a flow diagram and a depth-of-field scene.

## Options

A figure is a spec passed to `FS.figure(id, spec)`. The ones you'll use most:

| Option | What it does |
|---|---|
| `height(width)` | The drawing's height for a given width |
| `render(f, ctx)` | Draws one frame from the figure's state (`f.t`, `f.step`, `f.v`, `f.hover`, colors in `f.C`) |
| `duration`, `loop`, `chapters` | A timeline: its length, whether it repeats, named moments |
| `steps` | A stepped explanation, one caption per step |
| `params` | Named values that ease to their targets; shown in settings, inline as tabs, or hidden behind handles |
| `handles` | Draggable points on the drawing with bounds, rubber banding, keyboard steps and a spring settle |
| `timeAxis(f)` | Makes the drawing a scrub surface: drag, click or flick to move the clock |
| `tips`, `tipAt(f, x, y)` | Plain explanations for drawn parts, after a hover delay |
| `reserve` | The widest text each changing readout can show, so nothing shifts |
| `expand` | `"fit"` (default) scales the plate, proportions kept, to 84% of the viewport; `"fill"` re-lays it out at 84vw by up to 84vh (for Mermaid); `false` removes it |

Markup can drive figures with no glue code: `data-fs="id play"`, `data-fs-param="id:name"`, `data-fs-out="id:name"`, `data-fs-ref="id:part"` (a word in the prose linked to a part of the figure), `data-fs-tip`. The full list is in the runtime's header and `references/interaction.md`.

## Themes and customization

- **Built in**: Default (light and dark), Notebook (light and dark), and 23 Omarchy palettes (Tokyo Night, Catppuccin, Gruvbox, Nord, Kanagawa, Rosé Pine, Everforest, Flexoki and more). Set one with `FS.setTheme("tokyo-night")` or `data-fs-theme` on any ancestor.
- **Your own theme**: define the `--fs-*` tokens (colors, fonts, radii, frame, stroke widths) in a CSS file. Every built-in color is written in OKLCH, converted exactly from the original sRGB values; `scripts/hex-to-oklch.mjs` converts a hex theme the same way. `references/theming.md` lists every token.
- **Your site's theme**: map `--fs-*` to your site's tokens, as `themes/site-bridge.css` does, and figures follow your light/dark mode and palette. If the site animates a theme change, the figures repaint every frame with it.
- **Writing style**: captions, tips and labels follow a style in `references/writing/` (practical by default, academic on request). Add a style by adding a file there.
- **Frames**: every figure sits in a 4px frame band, like the images and diagrams around it.

## Konsistent linting

For projects with many figures, the agent can set up [Konsistent](https://github.com/vercel-labs/konsistent) with the convention pack in `konsistent/`: every figure must declare its claim, status (measured or illustration) and sources, export its tips, render in a plate and keep heavy libraries out. See [references/konsistent.md](references/konsistent.md). It asks before installing anything.

## Verification

Each figure is checked in a real browser: no console errors; nothing shifts as values change; tips, scrubbing, handles and expand work by mouse, touch and keyboard; it reads at 375 px wide and in light and dark; reduced motion gives a still that tells the whole story. `references/verification.md` has the checklist.

## Layout

```
SKILL.md                 the workflow the agent follows
references/              loaded on demand: form, content, writing, interaction, motion, diagrams, charts, WebGL, theming, verification, Konsistent
assets/runtime/          fs-runtime.js, the dependency-free runtime
assets/react/            React and Next.js wrappers and types
assets/plate-src.html    four working demos; plate-template.html is the built single file
themes/                  base structure and theme token layers
konsistent/              the optional convention pack
scripts/                 build-template.mjs, build-themes.mjs, OKLCH conversion and checks
docs/                    the docs site (GitHub Pages)
```

## Credits

This skill combines the skills and libraries I use in my day-to-day work. Check them out below, with the license for each project. The full notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

- **Inspiration**: [diagram-design](https://github.com/cathrynlavery/diagram-design) by [Cathryn Lavery](https://github.com/cathrynlavery) (MIT). Its 27 diagram types and 7 semantic patterns are the taxonomy in [references/diagram-types.md](references/diagram-types.md), and its approach to diagrams and its README shaped this skill; this one adds motion and interaction.
- **Theme palettes**: [Omarchy](https://github.com/basecamp/omarchy) (MIT, Basecamp/37signals and contributors), pinned at commit [`81fd2d2`](https://github.com/basecamp/omarchy/tree/81fd2d23ca6e3462183a4dc8360de3113fa8d80c/themes), and the original palette authors: Catppuccin, Everforest, Flexoki, Gruvbox, Kanagawa, Nord, Rosé Pine and Tokyo Night.
- **Libraries the references work with** (none is bundled): [nivo](https://nivo.rocks) for charts; [three.js](https://threejs.org), [react-three-fiber](https://github.com/pmndrs/react-three-fiber), [drei](https://github.com/pmndrs/drei), [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing), pmndrs `math` and [maath](https://github.com/pmndrs/maath) for WebGL scenes and motion math; [Mermaid](https://mermaid.js.org) diagrams in the "fill" expand mode; [MediaPipe](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker) pose landmarks for tracing people as geometry.
- **Linting**: [Konsistent](https://github.com/vercel-labs/konsistent) by Vercel Labs (Apache-2.0), optional, see [references/konsistent.md](references/konsistent.md).
- **Figures studied**: Alex Zhang's interactive figures ([alexzhang13.github.io](https://alexzhang13.github.io)), the source of [references/alex-zhang-notes.md](references/alex-zhang-notes.md). Patterns only; no code from them is included.
- **Color**: Björn Ottosson's [OKLab](https://bottosson.github.io/posts/oklab/) and the [CSS Color 4](https://www.w3.org/TR/css-color-4/) matrices, used to write every theme color in OKLCH.
- **Fonts** (SIL Open Font License 1.1, from Google Fonts): [Manrope](https://fonts.google.com/specimen/Manrope), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono), [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono), [Newsreader](https://fonts.google.com/specimen/Newsreader) and [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque).

## License

MIT © Juan Bermudez
