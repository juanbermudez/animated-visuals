#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = process.argv[2] && resolve(process.argv[2]);
if (!file || !existsSync(file)) {
  console.error("usage: node numbers-check.mjs <guide.src.html>");
  process.exit(2);
}
const html = readFileSync(file, "utf8");
const checkedMatch = html.match(/<(?:details|section)\b[^>]*class=["'][^"']*\bguide-checked\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:details|section)>/i);
const checked = checkedMatch?.[1] || "";
if (!checkedMatch) {
  console.error("numbers check: no .guide-checked block found");
  process.exit(1);
}
const before = html.slice(0, checkedMatch.index);
function visible(input) {
  let out = input.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of ["script", "style", "title", "code", "pre"]) out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  return out.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ");
}
const token = /(?<![A-Za-z])(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:\s?(?:ms|s|px|rem|em|%|×|x|KB|MB|GB))?/g;
const normalize = (value) => value.replace(/,/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const numbers = [...new Set((visible(before).match(token) || []).map(normalize))];
const ledger = new Set((visible(checked).match(token) || []).map(normalize));
const missing = numbers.filter((number) => !ledger.has(number));
console.log(`numbers check: ${numbers.length} unique numbers, ${missing.length} missing from checked block`);
for (const number of missing) console.log(`ERROR ${number}`);
if (!missing.length) console.log("PASS numbers check");
process.exit(missing.length ? 1 : 0);
