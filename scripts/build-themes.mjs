#!/usr/bin/env node
// Generates theme CSS from themes/omarchy.json.
//   node scripts/build-themes.mjs                      -> themes/omarchy.css (figure tokens, --fs-*)
//   node scripts/build-themes.mjs --site-css a.css --site-json b.json
//                                                      -> also a site palette stylesheet + registry
// Every ladder is derived from the theme's background and foreground with the same 12-step
// structure, so all themes behave alike; contrast is checked and corrected, never assumed.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(readFileSync(join(root, "themes/omarchy.json"), "utf8"));
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i > -1 ? args[i + 1] : undefined;
};

// ---------- color math (sRGB <-> OKLab) ----------
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function rgbToOklab([r, g, b]) {
  [r, g, b] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, toGamma(c))));
}
const rgbToHex = (rgb) => `#${rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}`;
/** Mix `a` toward `b` by t in OKLab (t = 0 -> a). */
function mix(a, b, t) {
  const x = rgbToOklab(hexToRgb(a));
  const y = rgbToOklab(hexToRgb(b));
  return rgbToHex(oklabToRgb(x.map((v, i) => v + (y[i] - v) * t)));
}
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** Smallest mix of `from` toward `to` that reaches `ratio` against `against`, starting at `t`. */
function atLeast(from, to, against, ratio, t) {
  let value = mix(from, to, t);
  while (contrast(value, against) < ratio && t < 1) {
    t = Math.min(1, t + 0.02);
    value = mix(from, to, t);
  }
  return { value, t };
}
const rgbTriplet = (hex) => hexToRgb(hex).map((c) => Math.round(c * 255)).join(" ");

// The site's own gray ramps, expressed as the share of foreground mixed into background.
const RAMP = {
  dark: [0, 0.028, 0.057, 0.094, 0.127, 0.156, 0.2, 0.28, 0.4, 0.53, 0.74, 1],
  light: [0, 0.018, 0.027, 0.071, 0.124, 0.182, 0.28, 0.44, 0.596, 0.658, 0.76, 1],
};

function derive(id, t) {
  const mode = t.mode === "light" ? "light" : "dark";
  const bg = t.background;
  const fg = t.foreground;
  const shares = [...RAMP[mode]];
  const notes = [];
  // Muted text must stay readable at caption size (4.5:1 against the page); the steps above it
  // move up with it so the ramp stays monotonic.
  const mutedIndex = mode === "dark" ? 9 : 8;
  const muted = atLeast(bg, fg, bg, 4.5, shares[mutedIndex]);
  if (muted.t > shares[mutedIndex] + 1e-6) notes.push(`muted raised to ${(muted.t * 100).toFixed(0)}% for 4.5:1`);
  shares[mutedIndex] = muted.t;
  for (let i = mutedIndex + 1; i < 11; i++) shares[i] = Math.min(0.97, Math.max(shares[i], shares[i - 1] + 0.06));
  const gray = shares.map((share) => mix(bg, fg, share));
  const surface = mode === "light" ? mix(bg, "#ffffff", 0.55) : bg;
  // Accent is used for strokes and focus rings: keep 3:1 against the surface.
  const accent = atLeast(t.accent, fg, surface, 3, 0);
  if (accent.t > 0) notes.push(`accent moved ${(accent.t * 100).toFixed(0)}% toward foreground for 3:1`);
  const hue = (key, fallback) => t[key] ?? t[fallback] ?? t.accent;
  const categorical = ["blue", "green", "yellow", "magenta", "cyan", "orange"].map((key) =>
    atLeast(hue(key, "red"), fg, surface, 3, 0).value,
  );
  return {
    id,
    name: t.name,
    mode,
    bg,
    fg,
    strong: t.bright_foreground ?? fg,
    surface,
    gray,
    accent: accent.value,
    categorical,
    good: atLeast(t.green, fg, surface, 3, 0).value,
    bad: atLeast(t.red, fg, surface, 3, 0).value,
    notes,
    swatch: [bg, fg, accent.value, categorical[1], categorical[2], categorical[3]],
  };
}

const themes = Object.entries(source.themes).map(([id, t]) => derive(id, t));
const header = (what) =>
  `/* Generated by animated-visuals/scripts/build-themes.mjs from themes/omarchy.json — do not edit.\n   ${what}\n   Palettes: Omarchy ${source.commit.slice(0, 7)} (${source.source}). ${source.license} */\n`;

// ---------- figure tokens ----------
const figureCss = themes
  .map((t) => {
    const g = t.gray;
    const lines = [
      `color-scheme: ${t.mode};\n`,
      `--fs-bg: ${t.bg};`,
      `--fs-surface: ${t.surface};`,
      `--fs-surface-2: ${t.mode === "light" ? g[2] : g[1]};`,
      `--fs-line: ${t.mode === "light" ? g[3] : g[4]};`,
      `--fs-line-strong: ${g[6]};`,
      `--fs-faint: ${g[7]};`,
      `--fs-muted: ${t.mode === "light" ? g[8] : g[9]};`,
      `--fs-fg: ${t.fg};`,
      `--fs-strong: ${t.strong};`,
      `--fs-accent: ${t.accent};`,
      ...t.categorical.map((c, i) => `--fs-c${i + 1}: ${c};`),
      `--fs-good: ${t.good};`,
      `--fs-bad: ${t.bad};`,
      `--fs-shadow: ${t.mode === "light" ? "0 2px 6px rgb(0 0 0 / 8%), 0 12px 28px -6px rgb(0 0 0 / 16%)" : "0 2px 8px rgb(0 0 0 / 30%), 0 14px 32px -6px rgb(0 0 0 / 50%)"};`,
    ];
    const note = t.notes.length ? ` /* ${t.notes.join("; ")} */` : "";
    return `[data-fs-theme="${t.id}"] {${note}\n  ${lines.join("\n  ")}\n}`;
  })
  .join("\n\n");
writeFileSync(join(root, "themes/omarchy.css"), `${header("Figure tokens: apply with data-fs-theme on :root or any figure.")}\n${figureCss}\n`);

// ---------- site palettes (zef-builder-site variables) ----------
const siteCss = option("--site-css");
const siteJson = option("--site-json");
if (siteCss) {
  const blocks = themes.map((t) => {
    const g = t.gray;
    const selector =
      t.mode === "dark" ? `:root.dark[data-style-palette="${t.id}"]` : `:root:not(.dark)[data-style-palette="${t.id}"]`;
    const [blue, green, yellow, magenta, cyan] = t.categorical;
    const lines = [
      `color-scheme: ${t.mode};\n`,
      ...g.map((value, i) => `--gray-${i + 1}: ${value};`),
      `--rose-quartz: ${t.accent};`,
      `--rose-quartz-rgb: ${rgbTriplet(t.accent)};`,
      `--muted: ${t.mode === "light" ? "var(--gray-9)" : "var(--gray-10)"};`,
      `--zef-surface-panel: ${t.surface};`,
      `--zef-surface-panel-strong: ${t.mode === "light" ? t.surface : g[1]};`,
      `--amethyst: ${magenta};`,
      `--jade: ${green};`,
      `--citrine: ${yellow};`,
      `--violet-topaz: ${blue};`,
      `--minsk: ${cyan};`,
      `--cement: ${g[7]};`,
      `--fs-accent: ${t.accent};`,
      ...t.categorical.map((c, i) => `--fs-c${i + 1}: ${c};`),
    ];
    return `${selector} {\n  ${lines.join("\n  ")}\n}`;
  });
  writeFileSync(
    siteCss,
    `${header("Site palettes: a palette applies only while the page is in its own mode (dark or light).")}\n@layer base {\n${blocks.join("\n\n")}\n}\n`,
  );
}
if (siteJson) {
  writeFileSync(
    siteJson,
    `${JSON.stringify(
      themes.map(({ id, name, mode, swatch }) => ({ id, name, mode, swatch })),
      null,
      1,
    )}\n`,
  );
}

const adjusted = themes.filter((t) => t.notes.length);
console.log(`${themes.length} themes written.${adjusted.length ? ` Contrast adjusted: ${adjusted.map((t) => `${t.id} (${t.notes.join("; ")})`).join(", ")}` : ""}`);
