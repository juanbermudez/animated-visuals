#!/usr/bin/env node
// Adapted from Juan Bermudez's teach-me scripts/term_audit.mjs. The guide version checks that each declared term
// first appears after the figure named in plan.md and that declared aliases do not appear early.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const [planArg, htmlArg] = process.argv.slice(2);
if (!planArg || !htmlArg) {
  console.error("usage: node term-audit.mjs <plan.md> <guide.html>");
  process.exit(2);
}
const planFile = resolve(planArg);
const htmlFile = resolve(htmlArg);
if (!existsSync(planFile) || !existsSync(htmlFile)) {
  console.error("plan or guide file does not exist");
  process.exit(2);
}
const plan = readFileSync(planFile, "utf8");
const html = readFileSync(htmlFile, "utf8");
const termsBlock = plan.match(/^##\s+Terms\b[^\n]*\n([\s\S]*?)(?=^##\s|\Z)/im)?.[1] || "";
const terms = [];
for (const line of termsBlock.split("\n")) {
  const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
  if (cells.length < 2 || /^term$/i.test(cells[0]) || /^-+$/.test(cells[0].replace(/:/g, ""))) continue;
  terms.push({ term: cells[0].replace(/[`*_]/g, ""), figure: cells[1].replace(/[`*_#]/g, ""), aliases: (cells[2] || "").split(/[,;]/).map((name) => name.trim()).filter(Boolean) });
}
if (!terms.length) {
  console.error("term audit: no term rows found in plan.md");
  process.exit(1);
}

function spaces(value) { return " ".repeat(value.length); }
function maskBlocks(input, tag) {
  return input.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), spaces);
}
let visible = html;
for (const tag of ["script", "style", "title", "h1", "nav"]) visible = maskBlocks(visible, tag);
visible = visible.replace(/<!--[\s\S]*?-->/g, spaces).replace(/<[^>]+>/g, spaces).replace(/&[a-z#0-9]+;/gi, " ");
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const problems = [];
for (const row of terms) {
  const marker = new RegExp(`\\bid=["']${escape(row.figure)}["']`, "i").exec(html);
  if (!marker) {
    problems.push(`${row.term}: figure #${row.figure} was not found`);
    continue;
  }
  const figureOpen = html.lastIndexOf("<figure", marker.index);
  const figureClose = html.indexOf("</figure>", marker.index);
  const threshold = figureClose >= 0 ? figureClose + 9 : marker.index;
  for (const name of [row.term, ...row.aliases]) {
    const match = new RegExp(`(^|[^A-Za-z0-9])${escape(name).replace(/\\ /g, "\\s+")}(?=$|[^A-Za-z0-9])`, "i").exec(visible);
    if (!match) {
      if (name === row.term) problems.push(`${row.term}: term does not appear in the guide`);
      continue;
    }
    if (match.index < threshold || (figureOpen >= 0 && match.index < figureOpen)) problems.push(`${row.term}: “${name}” first appears before figure #${row.figure}`);
  }
}
console.log(`term audit: ${terms.length} terms, ${problems.length} problems`);
for (const problem of problems) console.log(`ERROR ${problem}`);
if (!problems.length) console.log("PASS term audit");
process.exit(problems.length ? 1 : 0);
