#!/usr/bin/env node
// Checks the theme files: every color is written in OKLCH, and every OKLCH value lands on one exact 8-bit sRGB
// color, the one it was converted from (printing that color again gives back the same text).
//   node scripts/verify-oklch.mjs [files...]    (default: themes/*.css)
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { formatOklch, oklchToRgb, parseOklch, rgbToHex, rgbToOklch, hexToRgb } from "./oklch.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = process.argv.slice(2);
if (!files.length) for (const f of readdirSync(join(root, "themes"))) if (f.endsWith(".css")) files.push(join(root, "themes", f));

let checked = 0;
const problems = [];
for (const file of files) {
  const name = relative(root, file);
  const text = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g)) problems.push(`${name}: not OKLCH: ${m[0]}`);
  for (const m of text.matchAll(/oklch\([^)]*\)/g)) {
    if (m[0].includes("/")) continue; // translucent black shadows: oklch(0 0 0 / a)
    const rgb = oklchToRgb(parseOklch(m[0]));
    const hex = rgbToHex(rgb);
    const outOfGamut = rgb.some((c) => c < -0.5 / 255 || c > 1 + 0.5 / 255);
    const again = formatOklch(rgbToOklch(hexToRgb(hex)));
    if (outOfGamut) problems.push(`${name}: ${m[0]} is outside sRGB`);
    else if (again !== m[0]) problems.push(`${name}: ${m[0]} is ${hex}, which prints as ${again}`);
    checked += 1;
  }
}
for (const p of problems) console.error(p);
console.log(`${checked} OKLCH colors in ${files.length} files: ${problems.length ? `${problems.length} problems` : "every one is an exact 8-bit sRGB color"}`);
process.exit(problems.length ? 1 : 0);
