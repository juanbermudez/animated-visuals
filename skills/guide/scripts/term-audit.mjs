#!/usr/bin/env node
// Adapted from Juan Bermudez's teach-me scripts/term_audit.mjs.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const [planArg, htmlArg] = process.argv.slice(2);
if (!planArg || !htmlArg) { console.error("usage: node term-audit.mjs <plan.md> <guide.html>"); process.exit(2); }
const planFile = resolve(planArg);
const htmlFile = resolve(htmlArg);
if (!existsSync(planFile) || !existsSync(htmlFile)) { console.error("plan or guide file does not exist"); process.exit(2); }
const plan = readFileSync(planFile, "utf8");
const html = readFileSync(htmlFile, "utf8");
const termsBlock = plan.match(/^##\s+Terms\b[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im)?.[1] || "";
const terms = [];
for (const line of termsBlock.split("\n")) {
  const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
  if (cells.length < 2 || /^term$/i.test(cells[0]) || /^-+$/.test(cells[0].replace(/:/g, ""))) continue;
  terms.push({ term: cells[0].replace(/[`*_]/g, ""), figure: cells[1].replace(/[`*_#]/g, ""), aliases: (cells[2] || "").split(/[,;]/).map((name) => name.trim()).filter(Boolean) });
}
if (!terms.length) { console.log("term audit: 0 terms, 0 problems"); console.log("PASS term audit"); process.exit(0); }
const spaces = (value) => " ".repeat(value.length);
const maskTag = (input, tag) => input.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), spaces);
const maskClass = (input, cls) => input.replace(new RegExp(`<([a-z][a-z0-9-]*)\\b[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/\\1>`, "gi"), spaces);
let visible = html;
for (const tag of ["script", "style", "title", "nav"]) visible = maskTag(visible, tag);
for (const cls of ["guide-source", "guide-brand", "guide-skip"]) visible = maskClass(visible, cls);
visible = visible.replace(/<!--[\s\S]*?-->/g, spaces).replace(/<[^>]+>/g, spaces).replace(/&[a-z#0-9]+;/gi, " ");
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const problems = [];
for (const row of terms) {
  const marker = new RegExp(`\\bid=["']${escape(row.figure)}["']`, "i").exec(html);
  if (!marker) { problems.push(`${row.term}: figure #${row.figure} was not found`); continue; }
  const figureOpen = html.lastIndexOf("<figure", marker.index);
  const figureClose = html.indexOf("</figure>", marker.index);
  for (const name of [row.term, ...row.aliases]) {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escape(name).replace(/\\ /g, "\\s+")}(?=$|[^\\p{L}\\p{N}])`, "iu");
    const matches = [...visible.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))];
    if (!matches.length) { if (name === row.term) problems.push(`${row.term}: term does not appear in the guide`); continue; }
    const firstOutsideOwnFigure = matches.find((match) => match.index < figureOpen || match.index > figureClose);
    if (firstOutsideOwnFigure && firstOutsideOwnFigure.index < figureOpen) problems.push(`${row.term}: “${name}” appears before figure #${row.figure}`);
  }
}
console.log(`term audit: ${terms.length} terms, ${problems.length} problems`);
for (const problem of problems) console.log(`ERROR ${problem}`);
if (!problems.length) console.log("PASS term audit");
process.exit(problems.length ? 1 : 0);
