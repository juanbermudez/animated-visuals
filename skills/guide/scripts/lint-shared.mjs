import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const UNITS = [
  "%", "percent", "percentage", "points", "point", "pp", "ms", "s", "sec", "seconds", "second",
  "min", "minutes", "minute", "h", "hours", "hour", "px", "nodes", "node", "edges", "edge",
  "seeds", "seed", "datasets", "dataset", "patterns", "pattern", "dimensions", "dimension", "dimensional", "steps", "step", "epochs", "epoch",
  "layers", "layer", "tokens", "token", "MB", "GB", "KB", "bytes", "byte", "jobs", "job", "workers",
  "worker", "files", "file", "figures", "figure", "sections", "section", "questions", "question", "words",
  "word", "sentences", "sentence", "paragraphs", "paragraph", "rem", "em", "days", "day", "weeks",
  "week", "months", "month", "years", "year", "probability", "times", "UTC", "×",
];
const unitAlternation = UNITS.map((unit) => unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|");
export const NUMBER_TOKEN = new RegExp(`(?<![\\p{L}\\p{N}_])(?:[−-]?)(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?(?:[kK])?(?:(?:\\s+|-)?(?:${unitAlternation})(?![\\p{L}\\p{N}_]))?(?![\\p{L}\\p{N}_])`, "giu");
export const NUMBER_WITHOUT_UNIT = new RegExp(`(?<![\\p{L}\\p{N}_])([−-]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?)(?![\\d.,])(?!\\s*(?:to|through|–|—|-)\\s*[−-]?\\d)(?!(?:\\s+|-)?(?:${unitAlternation})(?![\\p{L}\\p{N}_]))`, "giu");

export function decode(value) {
  return value.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#\d+;|&[a-z]+;/gi, " ");
}
export function stripTags(value) {
  return decode(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
export function removeElementByClass(html, className) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`<([a-z][a-z0-9-]*)\\b[^>]*class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/\\1>`, "gi"), " ");
}
export function proseBlocks(html, { numbers = false } = {}) {
  let out = html.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of ["script", "style", "svg", "code", "pre", "table"])
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  for (const cls of ["guide-checked", "guide-check", "fs-title", "fs-status", "guide-brand", "guide-skip", "guide-formula", "data-copy-lint-skip"])
    out = removeElementByClass(out, cls);
  out = out.replace(/<(?:dt|dd)\b[^>]*>[\s\S]*?<\/(?:dt|dd)>/gi, " ");
  const boundary = /<\/?(?:address|article|aside|blockquote|div|figcaption|figure|footer|h[1-6]|header|li|main|nav|ol|p|section|summary|ul)\b[^>]*>/gi;
  out = out.replace(boundary, "\n").replace(/<[^>]+>/g, " ");
  return decode(out).split(/\n+/).map((block) => block.replace(/\s+/g, " ").trim()).filter(Boolean);
}
export function normalizeNumber(value) {
  return value.replace(/−/g, "-").replace(/,/g, "").replace(/\s+/g, " ").trim().toLowerCase().replace(/\b(points|steps|nodes|edges|seeds|datasets|patterns|epochs|layers|tokens|hours|minutes|seconds)\b/g, (unit) => unit.slice(0, -1));
}
export function parseCopyExceptions(planPath) {
  let plan = "";
  try { plan = readFileSync(planPath, "utf8"); } catch { return { dimensionless: [], exceptions: [] }; }
  const block = plan.match(/^##\s+Copy-lint exceptions\s*$\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im)?.[1] || "";
  const dimensionless = [];
  const exceptions = [];
  for (const raw of block.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const dim = line.match(/^(?:[-*]\s*)?dimensionless\s*:\s*(.+)$/i);
    if (dim) { dimensionless.push(...dim[1].split(/[,;]/).map((v) => v.trim()).filter(Boolean)); continue; }
    const body = line.replace(/^[-*]\s*/, "");
    const split = body.match(/^(.*?)\s+(?:—|--)\s+(.+)$/);
    if (!split) continue;
    let pattern = split[1].trim().replace(/^`|`$/g, "");
    const reason = split[2].trim();
    if (!pattern || !reason) continue;
    let test;
    const regex = pattern.match(/^\/(.*)\/([gimsuy]*)$/);
    try { test = regex ? new RegExp(regex[1], regex[2].replace("g", "")) : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); }
    catch { continue; }
    exceptions.push({ pattern, reason, test });
  }
  return { dimensionless, exceptions };
}
export function inferredPlan(sourceFile) { return join(dirname(sourceFile), "plan.md"); }
