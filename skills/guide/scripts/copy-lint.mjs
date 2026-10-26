#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = process.argv[2] && resolve(process.argv[2]);
if (!file || !existsSync(file)) {
  console.error("usage: node copy-lint.mjs <guide.src.html>");
  process.exit(2);
}
const html = readFileSync(file, "utf8");
const without = (input, tag) => input.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
const withoutChecks = html.replace(/<div\b[^>]*class=["'][^"']*\bguide-check\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, " ");
let prose = withoutChecks.replace(/<!--[\s\S]*?-->/g, " ");
for (const tag of ["script", "style", "code", "pre", "svg"]) prose = without(prose, tag);
prose = prose.replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|amp|lt|gt|quot|#\d+);/gi, " ").replace(/\s+/g, " ").trim();
const issues = [];
const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, " ").trim() || "";
const titleWords = h1.split(/\s+/).filter(Boolean).length;
if (titleWords < 3 || titleWords > 6) issues.push(`title has ${titleWords} words; expected 3 to 6`);
if (/<(?:p|span|div)\b[^>]*class=["'][^"']*\b(?:eyebrow|kicker|overline|section-number)\b[^"']*["'][^>]*>[\s\S]*?<\/(?:p|span|div)>\s*<h[1-6]\b/i.test(html)) issues.push("label appears above a heading");

const banned = [
  [/\b(?:here is the thing|the trick|the magic|under the hood)\b/i, "stock phrase"],
  [/\b(?:simply|just|obviously|clearly|game-changing|revolutionary)\b/i, "dismissive or admiring word"],
  [/\bnot\s+[^.!?]{1,80}\s+but\s+[^.!?]{1,80}/i, "not X but Y turn"],
  [/\bIn this guide,? we (?:will|are going to)\b/i, "roadmap opening"],
];
for (const [pattern, label] of banned) if (pattern.test(prose)) issues.push(`${label}: ${prose.match(pattern)[0]}`);
for (const question of prose.match(/[^.!?]{1,180}\?/g) || []) issues.push(`question needs review: ${question.trim()}`);

for (const heading of html.matchAll(/<h([2-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
  const text = heading[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(/\s+/).filter((word) => /^[A-Z][a-z]/.test(word));
  if (words.length >= 3 && !/[.:]/.test(text)) issues.push(`heading may use title case: ${text}`);
}

const unit = "(?:ms|s|seconds?|minutes?|hours?|days?|weeks?|months?|years?|px|rem|em|%|percent|points?|words?|sentences?|paragraphs?|sections?|figures?|questions?|steps?|files?|jobs?|workers?|bytes?|KB|MB|GB|×|x|probability|UTC)";
const numberPattern = new RegExp(`\\b(\\d+(?:[.,]\\d+)?)(?!\\s*(?:to|–|—|-)\\s*\\d)\\b(?!\\s*${unit})`, "gi");
for (const match of prose.matchAll(numberPattern)) {
  if (/^\d{4}$/.test(match[1]) && Number(match[1]) >= 1900 && Number(match[1]) <= 2200) continue;
  issues.push(`number may lack a unit: ${match[1]}`);
}

for (const sentence of prose.split(/(?<=[.!?])\s+/)) {
  const count = (sentence.match(/\b[\p{L}\p{N}][\p{L}\p{N}’'-]*\b/gu) || []).length;
  if (count > 25) issues.push(`sentence has ${count} words: ${sentence.slice(0, 120)}${sentence.length > 120 ? "…" : ""}`);
}
console.log(`copy lint: ${issues.length} flags`);
for (const issue of issues) console.log(`FLAG ${issue}`);
if (!issues.length) console.log("PASS copy lint");
process.exit(issues.length ? 1 : 0);
