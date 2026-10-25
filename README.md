# Animated Visuals

**Figures and diagrams that move only to explain, and that readers can touch.**

An agent skill for Claude Code, Codex and other coding agents. It builds explorable charts, stepped mechanism diagrams, animated architecture flows, timelines you can scrub, particle fields and WebGL scenes for papers, articles, explainers and sites. Every figure proves one claim, runs on one clock, can be driven by code, and is checked in a real browser before it ships.

[Docs and live examples](https://juanbermudez.github.io/animated-visuals/) · [Diagram types](references/diagram-types.md) · [Credits](THIRD_PARTY_NOTICES.md)

---

## What it makes

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

- **Built in**: Zef (light and dark, the default), a lab-notebook register, and 23 Omarchy palettes (Tokyo Night, Catppuccin, Gruvbox, Nord, Kanagawa, Rosé Pine, Everforest, Flexoki and more). Set one with `FS.setTheme("tokyo-night")` or `data-fs-theme` on any ancestor.
- **Your own theme**: define the `--fs-*` tokens (colors, fonts, radii, frame, stroke widths) in a CSS file. `references/theming.md` lists every token.
- **Your site's theme**: map `--fs-*` to your site's tokens, as `themes/zef-site-bridge.css` does, and figures follow your light/dark mode and palette. If the site animates a theme change, the figures repaint every frame with it.
- **Writing style**: captions, tips and labels follow a style in `references/writing/` (practical by default, academic on request). Add a style by adding a file there.
- **Frames**: every figure sits in a 4px frame band, like the images and diagrams around it.

## Optional: lint with Konsistent

For projects with many figures, the agent can set up [Konsistent](https://github.com/vercel-labs/konsistent) with the convention pack in `konsistent/`: every figure must declare its claim, status (measured or illustration) and sources, export its tips, render in a plate and keep heavy libraries out. See [references/konsistent.md](references/konsistent.md). It asks before installing anything.

## What "done" means

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
scripts/                 build-template.mjs, build-themes.mjs
docs/                    the docs site (GitHub Pages)
```

## Credits

Built on the work of others: Cathryn Lavery's [diagram-design](https://github.com/cathrynlavery/diagram-design) (the diagram catalog and the shape of this README), the [Omarchy](https://github.com/basecamp/omarchy) theme palettes and their original authors (Catppuccin, Everforest, Flexoki, Gruvbox, Kanagawa, Nord, Rosé Pine, Tokyo Night), pmndrs `math` and its examples, Vercel Labs' [Konsistent](https://github.com/vercel-labs/konsistent), and the libraries the guidance works with (Motion, nivo, three.js, react-three-fiber, MediaPipe, Mermaid). Details and licenses in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

MIT © Juan Bermudez
