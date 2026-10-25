#!/usr/bin/env node
// Rewrites the colors in CSS (or HTML with CSS in it) as OKLCH, in place:
//   node scripts/hex-to-oklch.mjs themes/default.css themes/notebook.css
// #rrggbb becomes oklch(L C H) and black shadows rgb(0 0 0 / a) become oklch(0 0 0 / a). Each value is checked
// to convert back to the same 8-bit sRGB color before it is written (scripts/oklch.mjs), so the look is unchanged.
import { readFileSync, writeFileSync } from "node:fs";
import { hexToOklch } from "./oklch.mjs";

for (const file of process.argv.slice(2)) {
  const source = readFileSync(file, "utf8");
  let count = 0;
  const output = source
    .replace(/#([0-9a-fA-F]{6})\b/g, (hex) => {
      count += 1;
      return hexToOklch(hex);
    })
    .replace(/rgb\(0 0 0 \/ ([\d.]+%?)\)/g, (_, alpha) => {
      count += 1;
      return `oklch(0 0 0 / ${alpha})`;
    });
  writeFileSync(file, output);
  console.log(`${file}: ${count} colors`);
}
