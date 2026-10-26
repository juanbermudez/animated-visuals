#!/usr/bin/env node
import { existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const PLAYWRIGHT = process.env.PLAYWRIGHT_PATH || "/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
const { chromium } = require(PLAYWRIGHT);
const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] && resolve(process.argv[2]);
if (!file || !existsSync(file)) {
  console.error("usage: node verify.mjs <built-guide.html>");
  process.exit(2);
}
const directory = dirname(file);
const source = join(directory, "guide.src.html");
const plan = join(directory, "plan.md");
for (const required of [source, plan]) {
  if (!existsSync(required)) {
    console.error(`required verification input is missing: ${required}`);
    process.exit(2);
  }
}

const screenshotDirectory = join(directory, ".verify");
mkdirSync(screenshotDirectory, { recursive: true });
const executable = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", chromium.executablePath()].find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath: executable });
const errors = [];
const checks = [];
let failed = null;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`page: ${error}`));
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`); });
  await page.goto(pathToFileURL(file).href);
  await page.waitForFunction(() => window.FS && FS.list().length > 0, null, { timeout: 15_000 });

  const registration = await page.evaluate(() => ({
    figures: FS.list(),
    drawings: [...document.querySelectorAll("figure.fs-plate canvas[id], figure.fs-plate svg[id]")].map((node) => node.id),
  }));
  const missingFigures = registration.drawings.filter((id) => !registration.figures.includes(id));
  assert(!missingFigures.length, `unregistered figures: ${missingFigures.join(", ")}`);
  checks.push(`${registration.figures.length} figures registered`);

  if (await page.locator("pre > code[class*='language-']").count()) {
    assert(await page.locator("pre > code .tok-k, pre > code .tok-s, pre > code .tok-p").count(), "code block was not highlighted");
    assert(await page.locator(".copy-btn").count(), "highlighted code block has no copy button");
    checks.push("code highlighting and copy control render");
  }

  for (const id of registration.figures) {
    await page.evaluate((figureId) => {
      const figure = FS.get(figureId);
      if (!figure) return;
      if (typeof figure.next === "function") figure.next();
      if (typeof figure.prev === "function") figure.prev();
      figure.state?.();
    }, id);
  }

  const themes = [
    { id: "default-dark", apply: () => { FS.setTheme(null); FS.setMode("dark"); } },
    { id: "default-light", apply: () => { FS.setTheme(null); FS.setMode("light"); } },
    { id: "tokyo-night", apply: () => { FS.setMode(null); FS.setTheme("tokyo-night"); } },
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of themes) {
      await page.evaluate(`(${theme.apply.toString()})()`);
      await page.waitForTimeout(350);
      const plates = page.locator("figure.fs-plate");
      for (let index = 0; index < await plates.count(); index += 1) {
        await plates.nth(index).scrollIntoViewIfNeeded();
        await page.waitForTimeout(120);
      }
      await page.evaluate(() => scrollTo(0, 0));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(overflow <= 0, `${overflow}px horizontal overflow at ${width}px in ${theme.id}`);
      const path = join(screenshotDirectory, `${basename(file, ".html")}-${width}-${theme.id}.png`);
      await page.screenshot({ path, fullPage: true });
      checks.push(`${width}px ${theme.id}: no overflow, screenshot written`);
    }
  }

  const links = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((anchor) => anchor.getAttribute("href")));
  const linkProblems = await page.evaluate(() => [...document.querySelectorAll("a[href]")].flatMap((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href || /^(?:https?:|mailto:|tel:)/.test(href)) return [];
    if (href.startsWith("#")) return document.getElementById(decodeURIComponent(href.slice(1))) ? [] : [`missing fragment ${href}`];
    return [];
  }));
  for (const href of links) {
    if (!href || /^(?:https?:|mailto:|tel:|#)/.test(href)) continue;
    const localPath = resolve(directory, decodeURIComponent(href.split(/[?#]/)[0]));
    if (!existsSync(localPath)) linkProblems.push(`missing local link ${href}`);
  }
  assert(!linkProblems.length, linkProblems.join("; "));
  checks.push("fragment and local links resolve");
  await context.close();

  const reduced = await browser.newContext({ viewport: { width: 390, height: 1000 }, reducedMotion: "reduce" });
  const reducedPage = await reduced.newPage();
  reducedPage.on("pageerror", (error) => errors.push(`reduced page: ${error}`));
  reducedPage.on("console", (message) => { if (["error", "warning"].includes(message.type())) errors.push(`reduced ${message.type()}: ${message.text()}`); });
  await reducedPage.goto(pathToFileURL(file).href);
  await reducedPage.waitForFunction(() => window.FS && FS.list().length > 0, null, { timeout: 15_000 });
  await reducedPage.screenshot({ path: join(screenshotDirectory, `${basename(file, ".html")}-390-reduced-motion.png`), fullPage: true });
  checks.push("reduced motion renders at 390px");
  await reduced.close();
  assert(!errors.length, `console problems: ${errors.join(" | ")}`);
} catch (error) {
  failed = error;
} finally {
  await browser.close();
}

const audits = [
  ["term-audit.mjs", plan, file],
  ["copy-lint.mjs", source],
  ["numbers-check.mjs", source],
].map(([script, ...args]) => {
  const result = spawnSync(process.execPath, [join(here, script), ...args], { encoding: "utf8" });
  return { script, status: result.status, output: `${result.stdout || ""}${result.stderr || ""}`.trim() };
});
for (const audit of audits) if (audit.status !== 0 && !failed) failed = new Error(`${audit.script} failed`);

console.log(JSON.stringify({
  status: failed ? "FAIL" : "PASS",
  file,
  screenshots: screenshotDirectory,
  checks,
  browserErrors: errors,
  audits,
  readerTest: "Run references/reader-test.md in a fresh agent session.",
  error: failed?.message,
}, null, 2));
process.exit(failed ? 1 : 0);
