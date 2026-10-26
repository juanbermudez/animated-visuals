#!/usr/bin/env node
import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const BRIDGE_TEMPLATE = join(import.meta.dirname, "..", "assets", "theme", "bb-bridge.css");
const PREFIX = "plugin:studio:omarchy-";
const MIN = Object.freeze({
  bgSurface: 0.025,
  bgBlock: 0.055,
  surfaceNode: 0.045,
  surfaceRaised: 0.025,
  nodeRaised: 0.015,
  text: 4.5,
  underline: 3,
});
const REQUIRED = ["bg", "surface", "block", "node", "surface-2", "fg", "muted", "link", "link-underline"];

async function colorTools(visualsRoot) {
  if (!visualsRoot) throw new Error("visualsRoot is required to build a bb theme bridge");
  return import(pathToFileURL(join(visualsRoot, "scripts", "oklch.mjs")).href);
}

function cssVariables(css) {
  const variables = new Map();
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)\s*;/g)) variables.set(match[1], match[2].trim());
  return variables;
}

function rootDeclarations(css) {
  for (const match of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) if (match[1].includes(":root")) return match[2];
  return css;
}

function resolveVariable(value, variables, seen = new Set()) {
  if (!value) return null;
  const match = /^var\(\s*(--[\w-]+)(?:\s*,\s*([^)]*))?\s*\)$/.exec(value.trim());
  if (!match) return value.trim();
  if (seen.has(match[1])) return null;
  seen.add(match[1]);
  return resolveVariable(variables.get(match[1]) ?? match[2], variables, seen);
}

function sourceColor(variables, names, fallback) {
  for (const name of names) {
    const value = resolveVariable(variables.get(name), variables);
    if (value && (/^#[\da-f]{6}$/i.test(value) || /^oklch\(/i.test(value))) return value;
  }
  return fallback;
}

function modeFromCss(css) {
  const match = /color-scheme\s*:\s*(light|dark)\b/i.exec(css);
  return match?.[1]?.toLowerCase() === "light" ? "light" : "dark";
}

function inGamut(rgb) {
  return rgb.every((channel) => channel >= -1e-6 && channel <= 1 + 1e-6);
}

function clamp(value, low = 0, high = 1) {
  return Math.max(low, Math.min(high, value));
}

async function normalizedColor(value, tools) {
  if (/^#[\da-f]{6}$/i.test(value)) return tools.hexToOklch(value.toLowerCase());
  const parsed = tools.parseOklch(value);
  return tools.formatOklch(parsed);
}

function withLightness(color, target, tools) {
  const [, originalC, H] = tools.parseOklch(color);
  const L = clamp(target, 0.04, 0.98);
  let C = originalC;
  while (C > 0.00001 && !inGamut(tools.oklchToRgb([L, C, H]))) C *= 0.9;
  return tools.formatOklch([L, C < 0.00001 ? 0 : C, H]);
}

function luminance(color, tools) {
  const rgb = tools.oklchToRgb(tools.parseOklch(color)).map((channel) => clamp(channel));
  const linear = rgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background, tools) {
  const [high, low] = [luminance(foreground, tools), luminance(background, tools)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

function token(css, name) {
  return new RegExp(`--fs-${name}:\\s*(oklch\\([^;]+\\))`).exec(css)?.[1] ?? null;
}

export async function auditBridgeCss(css, { visualsRoot } = {}) {
  const tools = await colorTools(visualsRoot);
  const values = Object.fromEntries(REQUIRED.map((name) => [name, token(css, name)]));
  const failures = [];
  for (const name of REQUIRED) if (!values[name]) failures.push(`missing --fs-${name}`);
  if (failures.length) return { pass: false, failures, values };

  const lightness = (name) => tools.parseOklch(values[name])[0];
  const deltas = {
    bgSurface: Math.abs(lightness("bg") - lightness("surface")),
    bgBlock: Math.abs(lightness("bg") - lightness("block")),
    surfaceNode: Math.abs(lightness("surface") - lightness("node")),
    surfaceRaised: Math.abs(lightness("surface") - lightness("surface-2")),
    nodeRaised: Math.abs(lightness("node") - lightness("surface-2")),
  };
  for (const [name, value] of Object.entries(deltas)) {
    if (value + 1e-6 < MIN[name]) failures.push(`${name} delta ${value.toFixed(5)} < ${MIN[name]}`);
  }
  const surfaces = ["bg", "surface", "block", "node"];
  for (const foreground of ["fg", "muted", "link"]) {
    for (const background of surfaces) {
      const ratio = contrast(values[foreground], values[background], tools);
      if (ratio + 1e-6 < MIN.text) failures.push(`${foreground} on ${background} ${ratio.toFixed(2)}:1 < ${MIN.text}:1`);
    }
  }
  for (const background of [...surfaces, "surface-2"]) {
    const ratio = contrast(values["link-underline"], values[background], tools);
    if (ratio + 1e-6 < MIN.underline) failures.push(`link-underline on ${background} ${ratio.toFixed(2)}:1 < ${MIN.underline}:1`);
  }
  return { pass: failures.length === 0, failures, deltas, values };
}

async function readBbThemeList() {
  const { stdout } = await execFile("bb", ["theme", "list", "--json"], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

async function themeIds(visualsRoot) {
  const source = await readFile(join(visualsRoot, "themes", "omarchy.json"), "utf8");
  return new Set(Object.keys(JSON.parse(source).themes ?? {}));
}

function replaceTemplate(template, values) {
  return template.replace(/__([A-Z0-9_]+)__/g, (_, name) => {
    if (!(name in values)) throw new Error(`bb bridge template has no value for ${name}`);
    return values[name];
  });
}

async function makeBridge(active, visualsRoot) {
  const tools = await colorTools(visualsRoot);
  const declarations = rootDeclarations(active.customCss || "");
  const variables = cssVariables(declarations);
  const mode = modeFromCss(declarations);
  const direction = mode === "light" ? -1 : 1;
  const defaults = mode === "light"
    ? { bg: "#f4f4f5", surface: "#ffffff", raised: "#e4e4e7", fg: "#18181b", muted: "#52525b", accent: "#1d4ed8" }
    : { bg: "#18181b", surface: "#242428", raised: "#303036", fg: "#f4f4f5", muted: "#b8b8c0", accent: "#93c5fd" };

  const raw = {
    bg: sourceColor(variables, ["--canvas"], defaults.bg),
    surface: sourceColor(variables, ["--card"], defaults.surface),
    raised: sourceColor(variables, ["--popover"], defaults.raised),
    fg: sourceColor(variables, ["--ink"], defaults.fg),
    muted: sourceColor(variables, ["--muted-foreground", "--subtle-foreground"], defaults.muted),
    accent: sourceColor(variables, ["--primary", "--ring"], defaults.accent),
    link: sourceColor(variables, ["--link-foreground", "--primary"], defaults.accent),
    strong: sourceColor(variables, ["--heading-foreground", "--ink"], defaults.fg),
    ring: sourceColor(variables, ["--ring", "--primary"], defaults.accent),
    good: sourceColor(variables, ["--success", "--diff-added", "--primary"], defaults.accent),
    bad: sourceColor(variables, ["--destructive-text", "--destructive", "--ansi-1"], defaults.accent),
  };
  for (let index = 0; index < 6; index += 1) raw[`c${index + 1}`] = sourceColor(variables, [`--ansi-${index + 2}`], index % 2 ? raw.link : raw.accent);
  const colors = {};
  for (const [name, value] of Object.entries(raw)) colors[name] = await normalizedColor(value, tools);

  const bgL = tools.parseOklch(colors.bg)[0];
  const surfaceL = tools.parseOklch(colors.surface)[0];
  const raisedL = tools.parseOklch(colors.raised)[0];
  colors.block = withLightness(colors.bg, bgL + direction * (MIN.bgBlock + 0.002), tools);
  let nodeL = surfaceL + direction * (MIN.surfaceNode + 0.002);
  for (let tries = 0; tries < 20 && Math.abs(nodeL - raisedL) < MIN.nodeRaised + 0.002; tries += 1) nodeL += direction * 0.005;
  colors.node = withLightness(colors.surface, nodeL, tools);
  colors.line = withLightness(colors.surface, surfaceL + direction * 0.035, tools);
  colors.lineStrong = withLightness(colors.surface, surfaceL + direction * 0.075, tools);
  colors.faint = withLightness(colors.surface, surfaceL + direction * 0.16, tools);

  const template = await readFile(BRIDGE_TEMPLATE, "utf8");
  const values = {
    COMMENT: "Contrast checked against the animated-visuals minima.",
    MODE: mode,
    BG: colors.bg,
    SURFACE: colors.surface,
    BLOCK: colors.block,
    NODE: colors.node,
    SURFACE_2: colors.raised,
    LINE: colors.line,
    LINE_STRONG: colors.lineStrong,
    FAINT: colors.faint,
    MUTED: colors.muted,
    FG: colors.fg,
    STRONG: colors.strong,
    ACCENT: colors.accent,
    LINK: colors.link,
    LINK_UNDERLINE: colors.ring,
    C1: colors.c1,
    C2: colors.c2,
    C3: colors.c3,
    C4: colors.c4,
    C5: colors.c5,
    C6: colors.c6,
    GOOD: colors.good,
    BAD: colors.bad,
  };
  let css = replaceTemplate(template, values);
  const audit = await auditBridgeCss(css, { visualsRoot });
  if (!audit.pass) {
    const note = `Some bb colors cannot meet every minimum without replacing bb's page, surface, or text colors: ${audit.failures.join("; ")}. Those source colors are preserved.`;
    css = replaceTemplate(template, { ...values, COMMENT: note });
  }
  return { kind: "bridged", themeId: "bb", css, mode, audit };
}

export async function resolveBbTheme(payload, { visualsRoot } = {}) {
  const active = payload?.active;
  if (!active?.themeId || typeof active.customCss !== "string") return null;
  if (active.themeId.startsWith(PREFIX)) {
    const id = active.themeId.slice(PREFIX.length);
    if ((await themeIds(visualsRoot)).has(id)) return { kind: "known", themeId: id };
  }
  return makeBridge(active, visualsRoot);
}

export async function bbTheme({ visualsRoot, load = readBbThemeList, payload } = {}) {
  try {
    return await resolveBbTheme(payload ?? await load(), { visualsRoot });
  } catch {
    return null;
  }
}
