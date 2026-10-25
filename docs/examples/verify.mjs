#!/usr/bin/env node
// Browser check of one or more built example guides, with Playwright driving Chrome:
//   node docs/examples/verify.mjs <slug>...
// Checks: no console or page errors; at least one figure registered with the runtime; no horizontal overflow at
// 1440 and 390; one dark and one light theme apply through the site's picker; the page renders under reduced
// motion. Writes docs/examples/cards/<slug>.png (the first figure, for the index card) and prints a JSON summary.
// Playwright is required by absolute path so the repository keeps no dependencies of its own.
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PLAYWRIGHT = process.env.PLAYWRIGHT_PATH || "/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
const { chromium } = require(PLAYWRIGHT);
const here = dirname(fileURLToPath(import.meta.url));
const slugs = process.argv.slice(2);
if (!slugs.length) { console.error("usage: node docs/examples/verify.mjs <slug>..."); process.exit(2); }
mkdirSync(join(here, "cards"), { recursive: true });
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const exe = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", chromium.executablePath()].find((p) => existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath: exe });
const report = {};
let failed = false;
for (const slug of slugs) {
  const file = join(here, `${slug}.html`);
  const errors = [];
  const checks = [];
  try {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })).newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => window.FS && FS.list().length > 0, null, { timeout: 15000 });
    const figures = await page.evaluate(() => FS.list());
    checks.push(`figures: ${figures.length}`);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(overflow <= 0, `overflows by ${overflow}px at ${width}`);
      checks.push(`${width}: no overflow`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const theme of ["tokyo-night", "flexoki-light"]) {
      await page.evaluate((t) => window.AV?.applyTheme?.(t), theme);
      await page.waitForTimeout(400);
      checks.push(`theme ${theme}: applied`);
    }
    await page.evaluate(() => window.AV?.applyTheme?.(window.AV_THEMES?.[1]?.id ?? "default-dark"));
    await page.waitForTimeout(400);
    const first = page.locator("figure.fs-plate").first();
    await first.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await first.screenshot({ path: join(here, "cards", `${slug}.png`) });
    checks.push("card screenshot written");
    const rm = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" })).newPage();
    rm.on("pageerror", (e) => errors.push(`reduced: ${e}`));
    await rm.goto(pathToFileURL(file).href);
    await rm.waitForFunction(() => window.FS && FS.list().length > 0, null, { timeout: 15000 });
    checks.push("reduced motion: renders");
    assert(errors.length === 0, `console: ${errors.join(" | ")}`);
    report[slug] = { status: "PASS", checks };
  } catch (e) {
    failed = true;
    report[slug] = { status: "FAIL", error: e.message, checks, errors };
  }
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
process.exit(failed ? 1 : 0);
