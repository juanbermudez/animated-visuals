#!/usr/bin/env node
// Inlines theme CSS and the runtime into a self-contained page.
//   node scripts/build-template.mjs [src] [out]
// Defaults: assets/plate-src.html -> assets/plate-template.html
// Markers: /* @inline themes/base.css */ inside <style>, // @inline assets/runtime/fs-runtime.js inside <script>.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [src = join(root, "assets/plate-src.html"), out = join(root, "assets/plate-template.html")] = process.argv
  .slice(2)
  .map((p) => resolve(p));
const page = readFileSync(src, "utf8").replace(
  /(?:\/\*\s*@inline\s+(\S+)\s*\*\/|\/\/\s*@inline\s+(\S+))/g,
  (_, a, b) => `/* ---- ${a || b} ---- */\n${readFileSync(join(root, a || b), "utf8").trim()}\n/* ---- end ${a || b} ---- */`,
);
writeFileSync(out, page);
console.log(`Wrote ${out} (${(page.length / 1024).toFixed(1)} KB)`);
