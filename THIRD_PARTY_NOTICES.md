# Credits and third-party notices

Animated Visuals is MIT-licensed (see `LICENSE`). It builds on other people's work, credited here. Nothing below is vendored as code unless it says so.

## Inspiration and adapted ideas

- **diagram-design** by Cathryn Lavery ([github.com/cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design), MIT). The catalog of 27 diagram types and the semantic patterns in `references/diagram-types.md` follow its taxonomy; our guidance adds the motion and interaction layer. Its README shaped this one. For static, branded diagrams, use that skill.
- **pmndrs `math`** (MIT, Poimandres) and the `math` agent skill: the data-oriented approach to geometry and simulation that `references/webgl.md` points to.
- **pmndrs `gpgpu-curl-noise-dof`** example (MIT, Poimandres): the per-point depth-of-field idea; `assets/react/FocusField.tsx` is an independent implementation.
- **Alex Zhang's blog figures** (alexzhang13.github.io): patterns studied, not copied; see `references/alex-zhang-notes.md`. No code from those posts is included.
- **interface-design** guidance (adapted from jakubkrehel/skills, MIT, and Vercel's Web Interface Guidelines, MIT) informed the interaction, motion and accessibility rules.
- **OKLab** by Björn Ottosson ([bottosson.github.io/posts/oklab](https://bottosson.github.io/posts/oklab/)) and the sRGB, XYZ and OKLab matrices published in W3C's [CSS Color Module Level 4](https://www.w3.org/TR/css-color-4/): `scripts/oklch.mjs` implements the conversion every theme color goes through.
- **Konsistent** by Vercel Labs ([github.com/vercel-labs/konsistent](https://github.com/vercel-labs/konsistent), Apache-2.0): optional structural linting, see `references/konsistent.md` and `konsistent/`. Not bundled.

- **SapiMouse** (Margit Antal, Norbert Fejér and Krisztián Buza, Sapientia University; [dataset](https://www.ms.sapientia.ro/~manyi/sapimouse/sapimouse.html); paper: "SapiMouse: Mouse Dynamics-based User Authentication Using Deep Feature Learning", 2021): the pointer-movement numbers in `references/interaction.md` are summary statistics computed from it. No recorded data is included in this repository.

## Libraries the guidance works with (not bundled)

- **Motion** (`motion`, formerly Framer Motion, MIT) for React sites.
- **nivo** (MIT) for standard charts.
- **three.js**, **react-three-fiber** and **drei** (MIT) for WebGL scenes.
- **MediaPipe** pose landmarker (Google, Apache-2.0) for tracing a person from footage as geometry only (`references/interaction.md`, "Real people, traced").
- **Mermaid** (MIT) diagrams can use the "fill" expand mode.

## Themes

- **Omarchy theme palettes** (`themes/omarchy.json`, generated `themes/omarchy.css`): color values from [basecamp/omarchy](https://github.com/basecamp/omarchy) at commit 81fd2d23ca6e3462183a4dc8360de3113fa8d80c, MIT License, © Basecamp/37signals and Omarchy contributors (Ethereal, Hackerman, Last Horizon, Lumon, Lupine, Matte Black, Miasma, Osaka Jade, Retro 82, Ristretto, Solitude, Starship, Vantablack, White).
- Upstream palettes, credited to their authors (all MIT): **Catppuccin** (Catppuccin org), **Everforest** (sainnhe), **Flexoki** (Steph Ango), **Gruvbox** (morhetz, Pavel Pertsev), **Kanagawa** (rebelot), **Nord** (Arctic Ice Studio, Sven Greb), **Rosé Pine** (Rosé Pine), **Tokyo Night** (enkia). Derived ladders and contrast adjustments are computed by `scripts/build-themes.mjs`.
- **Default** and **Notebook** themes (`themes/default.css`, `themes/notebook.css`) and the example bridge `themes/site-bridge.css`: original to this project (MIT).

## Fonts

Manrope, JetBrains Mono, IBM Plex Mono, Newsreader and Bricolage Grotesque load from Google Fonts under the SIL Open Font License 1.1.
