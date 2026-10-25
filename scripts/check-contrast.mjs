#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseOklch, oklchToRgb } from "./oklch.mjs";

const root = join(import.meta.dirname, "..");
const files = ["themes/default.css", "themes/notebook.css", "themes/omarchy.css"];
const MIN = {
  bgSurface: 0.025,
  bgBlock: 0.055,
  surfaceNode: 0.045,
  surfaceRaised: 0.025,
  nodeRaised: 0.015,
  text: 4.5,
  underline: 3,
};
const REQUIRED = ["bg", "surface", "block", "node", "surface-2", "fg", "muted", "link", "link-underline"];

const round = (value) => value.toFixed(2);
const lightness = (value) => parseOklch(value)[0];
const hueDistance = (a, b) => {
  const difference = Math.abs(a - b) % 360;
  return Math.min(difference, 360 - difference);
};
const luminance = (value) => {
  const rgb = oklchToRgb(parseOklch(value)).map((channel) => Math.max(0, Math.min(1, channel)));
  const linear = rgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};
const contrast = (foreground, background) => {
  const [high, low] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
};
const token = (body, name) => {
  const match = new RegExp("--fs-" + name + ":\\s*(oklch\\([^;]+\\))").exec(body);
  return match?.[1];
};

function themeId(file, selector) {
  const ids = [...selector.matchAll(/\[data-fs-theme="([^"]+)"\]/g)].map((match) => match[1]);
  if (file === "themes/default.css") {
    if (ids.includes("default-light")) return "default-light";
    if (ids.includes("default") && selector.includes(":root")) return "default";
    return null;
  }
  if (file === "themes/notebook.css") return ids.find((id) => id === "notebook" || id === "notebook-light") ?? null;
  return ids[0] ?? null;
}

const themes = new Map();
for (const file of files) {
  const source = readFileSync(join(root, file), "utf8");
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*--fs-bg:[^{}]*)\}/g)) {
    const id = themeId(file, match[1]);
    if (!id || themes.has(id)) continue;
    themes.set(id, { file, body: match[2] });
  }
}

const failures = [];
if (themes.size !== 27) failures.push("expected 27 named theme blocks, found " + themes.size);
for (const [id, theme] of themes) {
  const t = Object.fromEntries(REQUIRED.map((name) => [name, token(theme.body, name)]));
  for (const name of REQUIRED) if (!t[name]) failures.push(id + ": missing --fs-" + name);
  if (REQUIRED.some((name) => !t[name])) continue;

  const deltas = {
    bgSurface: Math.abs(lightness(t.bg) - lightness(t.surface)),
    bgBlock: Math.abs(lightness(t.bg) - lightness(t.block)),
    surfaceNode: Math.abs(lightness(t.surface) - lightness(t.node)),
    surfaceRaised: Math.abs(lightness(t.surface) - lightness(t["surface-2"])),
    nodeRaised: Math.abs(lightness(t.node) - lightness(t["surface-2"])),
  };
  for (const [name, value] of Object.entries(deltas)) {
    if (value + 1e-6 < MIN[name]) failures.push(id + ": " + name + " ΔL " + value.toFixed(5) + " < " + MIN[name]);
  }

  const fourSurfaces = ["bg", "surface", "block", "node"];
  for (const foreground of ["fg", "muted"]) {
    for (const background of fourSurfaces) {
      const ratio = contrast(t[foreground], t[background]);
      if (ratio + 1e-6 < MIN.text) {
        failures.push(id + ": --fs-" + foreground + " on --fs-" + background + " is " + round(ratio) + ":1 < " + MIN.text + ":1");
      }
    }
  }
  for (const background of [...fourSurfaces, "surface-2"]) {
    const linkRatio = contrast(t.link, t[background]);
    const underlineRatio = contrast(t["link-underline"], t[background]);
    if (linkRatio + 1e-6 < MIN.text) {
      failures.push(id + ": --fs-link on --fs-" + background + " is " + round(linkRatio) + ":1 < " + MIN.text + ":1");
    }
    if (underlineRatio + 1e-6 < MIN.underline) {
      failures.push(id + ": --fs-link-underline on --fs-" + background + " is " + round(underlineRatio) + ":1 < " + MIN.underline + ":1");
    }
  }

  const [fgL, fgC, fgH] = parseOklch(t.fg);
  const [linkL, linkC, linkH] = parseOklch(t.link);
  if (
    Math.abs(linkL - fgL) < 0.015 &&
    Math.abs(linkC - fgC) < 0.015 &&
    hueDistance(linkH, fgH) < 8
  ) failures.push(id + ": --fs-link does not differ visibly from --fs-fg");

  const [, bgC, bgH] = parseOklch(t.bg);
  if (bgC >= 0.01) {
    for (const surface of ["surface", "block", "node", "surface-2"]) {
      const [, surfaceC, surfaceH] = parseOklch(t[surface]);
      if (surfaceC < 0.003 || hueDistance(surfaceH, bgH) > 30) {
        failures.push(id + ": --fs-" + surface + " leaves the page hue/chroma family");
      }
    }
  }

  const minText = Math.min(
    ...["fg", "muted"].flatMap((foreground) =>
      fourSurfaces.map((background) => contrast(t[foreground], t[background])),
    ),
  );
  console.log(
    id.padEnd(18) + " ΔL " + Object.values(deltas).map((value) => value.toFixed(3)).join("/") + " text " + round(minText) + ":1",
  );
}

if (failures.length) {
  console.error("\nFAIL " + failures.length + " problem" + (failures.length === 1 ? "" : "s") + ":");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log(
  "\nPASS " + themes.size + " themes; ΔL minima bg→surface " + MIN.bgSurface + ", bg→block " + MIN.bgBlock +
    ", surface→node " + MIN.surfaceNode + ", surface→surface-2 " + MIN.surfaceRaised +
    ", node↔surface-2 " + MIN.nodeRaised + "; text ≥ " + MIN.text +
    ":1, link underline ≥ " + MIN.underline + ":1.",
);
