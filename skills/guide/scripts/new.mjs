#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
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
for (const file of ["guide.src.html", "guide.js", "plan.md", "meta.json"]) {
  copyFileSync(join(template, file), join(destination, file));
}
console.log(JSON.stringify({ status: "PASS", slug, directory: destination, files: readdirSync(destination).sort() }));
