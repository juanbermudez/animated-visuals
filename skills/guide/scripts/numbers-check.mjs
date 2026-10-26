#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { NUMBER_TOKEN, normalizeNumber } from "./lint-shared.mjs";

const file = process.argv[2] && resolve(process.argv[2]);
if (!file || !existsSync(file)) {
  console.error("usage: node numbers-check.mjs <guide.src.html>");
  process.exit(2);
}
const html = readFileSync(file, "utf8");
const checkedMatch = html.match(/<(?:details|section)\b[^>]*class=["'][^"']*\bguide-checked\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:details|section)>/i);
if (!checkedMatch) { console.error("numbers check: no .guide-checked block found"); process.exit(1); }
function visible(input) {
  let out = input.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of ["script", "style", "title", "code", "pre"])
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  return out.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ");
}
const tokens = (value) => [...value.matchAll(new RegExp(NUMBER_TOKEN.source, NUMBER_TOKEN.flags))].map((match) => normalizeNumber(match[0]));
const before = html.slice(0, checkedMatch.index);
const numbers = [...new Set(tokens(visible(before)))];
const ledger = new Set(tokens(visible(checkedMatch[1])));
const dataFile = join(dirname(file), "data.js");
let dataNumbers = [];
if (existsSync(dataFile)) {
  try {
    const module = await import(`${pathToFileURL(dataFile).href}?check=${Date.now()}`);
    dataNumbers = (module.data?.checkedNumbers || []).map((value) => normalizeNumber(String(value)));
  } catch (error) {
    console.error(`numbers check: could not read ${dataFile}: ${error.message}`);
    process.exit(1);
  }
}
const missing = [...new Set([...numbers, ...dataNumbers])].filter((number) => !ledger.has(number));
console.log(`numbers check: ${numbers.length} prose tokens, ${dataNumbers.length} data.js tokens, ${missing.length} missing from checked block`);
for (const number of missing) console.log(`ERROR ${number}`);
if (!missing.length) console.log("PASS numbers check");
process.exit(missing.length ? 1 : 0);
