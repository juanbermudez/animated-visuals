# Themes

A guide gets its theme layer from the installed **animated-visuals** skill when it is built. The build reads `themes/default.css`, `themes/notebook.css`, `themes/omarchy.css`, and `themes/base.css` in that order. It also reads `themes/omarchy.json` for the picker labels and light or dark grouping. Guide does not keep a copy of those themes.

The build calls `await themeLayer({ visualsRoot })`. The result contains the complete CSS layer, the picker markup, its script, and the default theme id. The picker goes in the guide header at `<!--__THEME_PICKER__-->`; the button is not fixed. Animated Visuals' fixed-corner rule applies to standalone plates and sites without a header. Inline the script after the Animated Visuals runtime. The script applies the initial attributes as soon as it runs, before it waits for the picker markup.

## The picker

The palette button opens a menu with Dark and Light groups. Each choice is a radio menu item. Enter, Space, or Down Arrow opens the menu on the active theme. Up Arrow and Down Arrow move through it. Home and End jump to its edges. Typing moves to a matching name. Enter, Space, or a click selects a theme. Escape and Tab close the menu and return focus to the button. A click outside also closes it.

The menu is no wider than 14 rem and stays 16 pixels inside a 390 pixel viewport. It scrolls internally when its full list does not fit. Its colors, type, borders, radii, and motion use `--fs-*` tokens.

The storage key is `av-theme`. The selected id persists across reloads. `window.AV.applyTheme(id)` uses the same path and saves the choice. `window.AV.currentTheme()` returns the active id.

## Which theme wins

Published guides have no baked theme default. Build them with:

```sh
node <guide-skill>/scripts/build.mjs <guide-directory>
```

The page chooses Default or Default Light from the system preference until a live bb probe or reader choice applies. Bake bb's current theme only when requested:

```sh
node <guide-skill>/scripts/build.mjs <guide-directory> --bb
GUIDE_BB=1 node <guide-skill>/scripts/build.mjs <guide-directory>
```

`GUIDE_NO_BB=1` is a compatibility no-op. The PASS line reports the baked default and whether `--bb`, `GUIDE_BB=1`, or the published-build default selected it.

Runtime precedence is:

1. A reader's saved choice.
2. A baked bb default, when the build explicitly requested one, or the live bb probe.
3. The system light or dark preference.

When a guide opens inside bb, the script checks for `--canvas` on the root at load and when the root `style` or `class` changes. If bb variables are present and the reader has no saved choice, it applies the live `bb` bridge. A saved reader choice always wins. The runtime probe is independent of build flags.

## bb variable mapping

| bb variable | Guide token |
|---|---|
| `--canvas` | `--fs-bg` |
| `--card` | `--fs-surface` |
| `--popover` | `--fs-surface-2` |
| `--ink` | `--fs-fg` |
| `--muted-foreground`, then `--subtle-foreground` | `--fs-muted` |
| `--primary` | `--fs-accent` |
| `--link-foreground`, then `--primary` | `--fs-link` |
| `--heading-foreground`, then `--ink` | `--fs-strong` |
| `--ring`, then `--primary` | `--fs-link-underline` |
| `--success` or `--diff-added` | `--fs-good` |
| `--destructive-text` or `--destructive` | `--fs-bad` |
| `--ansi-2` through `--ansi-7` | `--fs-c1` through `--fs-c6` |

The bridge derives `--fs-block` from the page and `--fs-node` from the plate in OKLCH. It uses the Animated Visuals minimum lightness steps. Lines and faint text roles are derived between the plate and the main text. The generated bridge is checked against the same surface and text contrast minima as the Animated Visuals themes. If bb's fixed page, surface, or text colors prevent a pass, the generated CSS keeps those bb colors and records the failed minimum in a comment.

## One guide with a custom theme

Add a complete theme block after the generated theme layer in that guide's page CSS:

```css
[data-fs-theme="project"] {
  color-scheme: dark;
  --fs-bg: oklch(0.18 0.02 250);
  --fs-surface: oklch(0.22 0.02 250);
  --fs-block: oklch(0.25 0.02 250);
  --fs-node: oklch(0.27 0.02 250);
  --fs-surface-2: oklch(0.30 0.02 250);
  --fs-fg: oklch(0.94 0.01 250);
  --fs-muted: oklch(0.74 0.02 250);
  --fs-strong: oklch(0.99 0.01 250);
  --fs-accent: oklch(0.78 0.13 245);
  --fs-link: oklch(0.82 0.10 230);
  --fs-link-underline: oklch(0.78 0.13 245);
}
```

Complete the remaining tokens from the Animated Visuals token contract and run its contrast check. To put the theme in this guide's picker, define it before the returned theme script runs:

```html
<script>window.GUIDE_THEMES = [{ id: "project", name: "Project", mode: "dark", family: "project" }];</script>
```

Keep the block and this small list with the guide that owns them. Do not add either to the shared Animated Visuals palettes unless every guide should receive the theme.
