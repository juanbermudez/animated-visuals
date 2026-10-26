#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const directory = resolve(process.argv[2] || "docs/guide/examples");
const indexFile = join(directory, "index.html");
if (!existsSync(indexFile)) { console.error(`missing ${indexFile}`); process.exit(2); }
const escape = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const items = readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory() && existsSync(join(directory, entry.name, "meta.json"))).map((entry) => {
  const meta = JSON.parse(readFileSync(join(directory, entry.name, "meta.json"), "utf8"));
  for (const key of ["title", "summary", "source", "type"]) if (!(key in meta)) throw new Error(`${entry.name}/meta.json is missing ${key}`);
  if (!meta.source?.label || !meta.source?.url) throw new Error(`${entry.name}/meta.json needs source.label and source.url`);
  return { slug: entry.name, ...meta };
}).sort((a, b) => a.title.localeCompare(b.title));
const cards = items.map((item) => `    <li class="card">\n      <p class="type">${escape(item.type)}</p>\n      <h2><a href="${escape(item.slug)}/">${escape(item.title)}</a></h2>\n      <p>${escape(item.summary)}</p>\n      <p class="source">Source: <a href="${escape(item.source.url)}">${escape(item.source.label)}</a></p>\n    </li>`).join("\n");
let html = readFileSync(indexFile, "utf8");
const start = "<!-- GENERATED CARDS: START -->";
const end = "<!-- GENERATED CARDS: END -->";
if (!html.includes(start) || !html.includes(end)) throw new Error(`index needs ${start} and ${end}`);
html = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), `${start}\n${cards}\n    ${end}`);
writeFileSync(indexFile, html);
console.log(JSON.stringify({ status: "PASS", index: indexFile, cards: items.length, sources: items.map((item) => `${item.slug}/meta.json`) }));
