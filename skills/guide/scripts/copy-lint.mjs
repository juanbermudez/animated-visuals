#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NUMBER_WITHOUT_UNIT, inferredPlan, parseCopyExceptions, proseBlocks, stripTags } from "./lint-shared.mjs";

const file = process.argv[2] && resolve(process.argv[2]);
const planFile = process.argv[3] ? resolve(process.argv[3]) : file ? inferredPlan(file) : null;
if (!file || !existsSync(file)) {
  console.error("usage: node copy-lint.mjs <guide.src.html> [plan.md]");
  process.exit(2);
}
const html = readFileSync(file, "utf8");
const { dimensionless, exceptions } = parseCopyExceptions(planFile);
const findings = [];
const add = (kind, text) => findings.push({ kind, text: `${kind}: ${text}` });
const h1 = stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
const titleWords = h1.split(/\s+/).filter(Boolean).length;
if (titleWords < 3 || titleWords > 6) add("title", `${titleWords} words; expected 3 to 6`);
if (/<(?:p|span|div)\b[^>]*class=["'][^"']*\b(?:eyebrow|kicker|overline|section-number)\b[^"']*["'][^>]*>[\s\S]*?<\/(?:p|span|div)>\s*<h[1-6]\b/i.test(html)) add("heading", "label appears above a heading");

const blocks = proseBlocks(html);
const prose = blocks.join(" ");
const banned = [
  [/\b(?:here is the thing|the trick|the magic|under the hood)\b/i, "stock phrase"],
  [/\b(?:simply|just|obviously|clearly|game-changing|revolutionary)\b/i, "dismissive or admiring word"],
  [/\bnot\s+[^.!?]{1,80}\s+but\s+[^.!?]{1,80}/i, "not X but Y turn"],
  [/\bIn this guide,? we (?:will|are going to)\b/i, "roadmap opening"],
];
for (const [pattern, label] of banned) { const hit = prose.match(pattern); if (hit) add("copy", `${label}: ${hit[0]}`); }
for (const block of blocks) for (const question of block.match(/[^.!?]{1,180}\?/g) || []) add("question", question.trim());
for (const heading of html.matchAll(/<h([2-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
  const text = stripTags(heading[2]);
  const capitals = text.split(/\s+/).filter((word) => /^[A-Z][a-z]/.test(word));
  if (capitals.length >= 3 && !/[.:]/.test(text)) add("heading", `may use title case: ${text}`);
}

const dimPattern = dimensionless.length ? new RegExp(`(?:${dimensionless.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*(?:=|is|at)?\\s*$`, "iu") : null;
for (const block of proseBlocks(html, { numbers: true })) {
  for (const match of block.matchAll(NUMBER_WITHOUT_UNIT)) {
    const value = match[1];
    if (/^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= 2200) continue;
    const before = block.slice(Math.max(0, match.index - 24), match.index);
    const after = block.slice(match.index + match[0].length, match.index + match[0].length + 24);
    const dimensionlessAfter = dimensionless.some((symbol) => new RegExp(`^\\s*${symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_])`, "iu").test(after));
    const namedBefore = /(?:Eq\.|Equations?|Fig\.|Figures?|Sec\.|Sections?|Tables?|Appendix|steps?|layers?|dimensions?|patterns?)\s*$/iu.test(before);
    if (dimPattern?.test(before) || dimensionlessAfter || namedBefore || /^\s*[),/]/.test(block.slice(match.index + match[0].length))) continue;
    add("unit", `${value} in “${block.slice(Math.max(0, match.index - 80), match.index + match[0].length + 80)}”`);
  }
}

const splitSentences = (block) => {
  const protectedText = block.replace(/\b(?:Eq|Fig|Sec)\./g, (v) => v.replace(".", "∯")).replace(/\b(?:e\.g|i\.e)\./gi, (v) => v.replaceAll(".", "∯")).replace(/\bvs\./gi, (v) => v.replace(".", "∯"));
  return protectedText.split(/(?<=[.!?])\s+/).map((v) => v.replaceAll("∯", "."));
};
for (const block of blocks) for (const sentence of splitSentences(block)) {
  const count = (sentence.match(/\b[\p{L}\p{N}][\p{L}\p{N}’'-]*\b/gu) || []).length;
  if (count > 25) add("sentence", `${count} words: ${sentence.slice(0, 140)}${sentence.length > 140 ? "…" : ""}`);
}

const allowed = [];
const unexplained = [];
for (const finding of findings) {
  const exception = exceptions.find(({ test }) => test.test(finding.text));
  (exception ? allowed : unexplained).push(exception ? { ...finding, exception } : finding);
}
console.log(`copy lint: ${findings.length} flags, ${allowed.length} explained, ${unexplained.length} unexplained`);
for (const item of allowed) console.log(`ALLOW ${item.text} — ${item.exception.reason}`);
for (const item of unexplained) console.log(`FLAG ${item.text}`);
if (!unexplained.length) console.log("PASS copy lint");
process.exit(unexplained.length ? 1 : 0);
