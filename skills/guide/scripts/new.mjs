#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const template = join(here, "..", "assets", "template");
const args = process.argv.slice(2);
const slug = args.find((arg) => !arg.startsWith("-"));
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error("usage: node new.mjs <kebab-case-slug> [--path <directory>]");
  process.exit(2);
}
const pathIndex = args.indexOf("--path");
const positionalDestination = args.filter((arg, index) => !arg.startsWith("-") && index !== args.indexOf(slug))[0];
const destination = resolve(pathIndex >= 0 ? args[pathIndex + 1] : positionalDestination || join("guides", slug));
if (existsSync(destination) && readdirSync(destination).length) {
  console.error(`refusing to overwrite non-empty directory: ${destination}`);
  process.exit(1);
}
mkdirSync(destination, { recursive: true });
for (const file of ["guide.src.html", "guide.js", "data.js", "plan.md", "meta.json", ".gitignore"]) {
  const source = readFileSync(join(template, file), "utf8")
    .replaceAll("__SLUG__", slug)
    .replaceAll("__TITLE__", slug.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "));
  writeFileSync(join(destination, file), source);
}
console.log(JSON.stringify({ status: "PASS", slug, directory: destination, files: readdirSync(destination).sort() }));
