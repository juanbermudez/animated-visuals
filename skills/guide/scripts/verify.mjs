#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { resolvePlaywright } from "./playwright-path.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] && resolve(process.argv[2]);
if (!file || !existsSync(file)) { console.error("usage: node verify.mjs <built-guide.html>"); process.exit(2); }
const directory = dirname(file);
const source = join(directory, "guide.src.html");
const plan = join(directory, "plan.md");
for (const required of [source, plan]) if (!existsSync(required)) { console.error(`required verification input is missing: ${required}`); process.exit(2); }
const screenshotDirectory = mkdtempSync(join(tmpdir(), "guide-verify-"));
console.log(`browser artifacts: ${screenshotDirectory}`);
const { module: playwright, path: playwrightPath } = resolvePlaywright({ guideDirectory: directory, skillDirectory: resolve(here, "..") });
const { chromium } = playwright;
const executable = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", chromium.executablePath()].find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath: executable, args: ["--disable-gpu-sandbox", "--no-sandbox"] });
const errors = [];
const checks = [];
let failed = null;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const safe = (value) => value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const signature = async (page, id) => page.evaluate((figureId) => {
  const api = FS.get(figureId);
  const plate = api?.element?.closest("figure.fs-plate");
  const canvas = api?.element;
  const drawing = canvas?.tagName === "CANVAS" ? canvas.toDataURL() : canvas?.outerHTML;
  const readouts = [...(plate?.querySelectorAll(`[data-fs-out^="${figureId}:"]`) || [])].map((node) => node.textContent).join("|");
  return JSON.stringify({ state: api?.state(), drawing, readouts });
}, id);

async function exerciseFigure(page, id) {
  const plate = page.locator(`#${id}`).locator("xpath=ancestor::figure[contains(@class,'fs-plate')]");
  await plate.scrollIntoViewIfNeeded();
  await page.evaluate((figureId) => { const f = FS.get(figureId); f.play(); }, id);
  await page.waitForTimeout(80);
  await page.evaluate((figureId) => FS.get(figureId).pause(), id);
  assert(!(await page.evaluate((figureId) => FS.get(figureId).playing, id)), `${id}: pause did not stop playback`);
  const next = plate.locator(`[data-fs="${id} next"]`);
  if (await next.count()) {
    const before = await page.evaluate((figureId) => FS.get(figureId).step, id);
    if (!(await next.isDisabled())) await next.click();
    const after = await page.evaluate((figureId) => FS.get(figureId).step, id);
    assert(after >= before, `${id}: next moved backwards`);
    const prev = plate.locator(`[data-fs="${id} prev"]`);
    if (await prev.count() && !(await prev.isDisabled())) await prev.click();
    checks.push(`${id}: next and prev`);
  }
  const seek = plate.locator(`[data-fs-seek="${id}"][role="slider"], [data-fs-seek="${id}"] [role="slider"], input[data-fs-seek="${id}"]`);
  if (await seek.count()) {
    await seek.first().focus(); await page.keyboard.press("End"); await page.keyboard.press("Home");
    checks.push(`${id}: timeline seek`);
  }
  await page.evaluate((figureId) => FS.get(figureId).openSettings(), id);
  const sliders = plate.locator(`[data-fs-param^="${id}:"][role="slider"], [data-fs-param^="${id}:"] [role="slider"], .fs-popover [role="slider"]`);
  for (let i = 0; i < await sliders.count(); i += 1) {
    const slider = sliders.nth(i);
    const before = await signature(page, id);
    await slider.focus(); await page.keyboard.press("Home"); await page.waitForTimeout(80);
    const atMin = await signature(page, id);
    await page.keyboard.press("End"); await page.waitForTimeout(80);
    const atMax = await signature(page, id);
    assert(before !== atMin || atMin !== atMax, `${id}: parameter slider ${i + 1} changed no readout or drawing`);
  }
  const tabGroups = plate.locator(`[data-fs-param^="${id}:"][role="tablist"], [data-fs-param^="${id}:"] [role="tablist"], .fs-popover [role="group"]`);
  for (let i = 0; i < await tabGroups.count(); i += 1) {
    const options = tabGroups.nth(i).locator('button, [role="tab"]');
    if (await options.count() < 2) continue;
    const before = await signature(page, id);
    await options.first().click(); await page.waitForTimeout(60);
    await options.last().click(); await page.waitForTimeout(80);
    assert(before !== await signature(page, id), `${id}: parameter choices changed no readout or drawing`);
  }
  await page.evaluate((figureId) => FS.get(figureId).closeSettings(), id);
  const handles = plate.locator(".fs-handle");
  for (let i = 0; i < await handles.count(); i += 1) {
    const handle = handles.nth(i);
    const before = await handle.evaluate((node) => getComputedStyle(node).transform);
    await handle.focus();
    for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) {
      await page.keyboard.press(key); await page.waitForTimeout(50);
      if (await handle.evaluate((node, prior) => getComputedStyle(node).transform !== prior, before)) break;
    }
    const after = await handle.evaluate((node) => getComputedStyle(node).transform);
    assert(before !== after, `${id}: handle ${i + 1} did not move on arrow keys`);
  }
  const expand = plate.locator(".fs-expand");
  if (await expand.count()) {
    await expand.click();
    await page.waitForFunction((figureId) => document.querySelector(`#${figureId}`)?.closest("figure")?.classList.contains("fs-expanded"), id).catch(() => {});
    assert(await expand.getAttribute("aria-expanded") === "true", `${id}: expand did not open`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    assert(await expand.getAttribute("aria-expanded") === "false", `${id}: expanded figure did not close`);
  }
  await page.evaluate((figureId) => FS.get(figureId).reset(), id);
}

async function screenshotPlate(page, plate, path) {
  await plate.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  await plate.screenshot({ path, animations: "disabled" });
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`); });
  await page.goto(pathToFileURL(file).href);
  await page.waitForFunction(() => window.FS && FS.list().length > 0, null, { timeout: 15_000 });
  const registration = await page.evaluate(() => ({ figures: FS.list(), drawings: [...document.querySelectorAll("figure.fs-plate canvas[id], figure.fs-plate svg[id]")].map((node) => node.id) }));
  const missing = registration.drawings.filter((id) => !registration.figures.includes(id));
  assert(!missing.length, `unregistered figures: ${missing.join(", ")}`);
  checks.push(`${registration.figures.length} figures registered`);
  if (await page.locator("pre > code[class*='language-']").count()) {
    assert(await page.locator("pre > code .tok-k, pre > code .tok-s, pre > code .tok-p").count(), "code block was not highlighted");
    assert(await page.locator(".copy-btn").count(), "highlighted code block has no copy button");
  }
  for (const id of registration.figures) await exerciseFigure(page, id);
  checks.push("play and pause, parameters, handles, and expand controls passed");

  const trigger = page.locator("[data-guide-theme-trigger]");
  await trigger.focus(); await page.keyboard.press("Enter");
  assert(await page.locator("[data-guide-theme-menu]").getAttribute("hidden") === null, "theme picker did not open");
  const tokyo = page.locator('[data-theme="tokyo-night"]');
  await tokyo.click();
  assert(await page.evaluate(() => window.AV.currentTheme()) === "tokyo-night", "theme picker did not select Tokyo Night");
  checks.push("theme picker opened and selected Tokyo Night");

  const themes = [
    { id: "default-dark", theme: "default" },
    { id: "default-light", theme: "default-light" },
    { id: "tokyo-night", theme: "tokyo-night" },
  ];
  const perTheme = new Map(themes.map(({ id }) => [id, []]));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of themes) {
      await page.evaluate((id) => window.AV.applyTheme(id), theme.theme);
      await page.waitForTimeout(120);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(overflow <= 0, `${overflow}px horizontal overflow at ${width}px in ${theme.id}`);
      await page.evaluate(() => scrollTo(0, 0));
      const topPath = join(screenshotDirectory, `${width}-${theme.id}-page-top.png`);
      await page.screenshot({ path: topPath }); perTheme.get(theme.id).push(topPath);
      const plates = page.locator("figure.fs-plate");
      for (let i = 0; i < await plates.count(); i += 1) {
        const plate = plates.nth(i);
        const id = await plate.locator("canvas[id],svg[id]").first().getAttribute("id");
        await page.evaluate((figureId) => FS.get(figureId)?.reset(), id);
        const restPath = join(screenshotDirectory, `${width}-${theme.id}-${safe(id)}-rest.png`);
        await screenshotPlate(page, plate, restPath); perTheme.get(theme.id).push(restPath);
        let changed = false;
        const nextControl = plate.locator(`[data-fs="${id} next"]`);
        if (await nextControl.count() && !(await nextControl.isDisabled())) { await nextControl.click(); changed = true; }
        if (!changed) {
          const alternateTab = plate.locator(`[data-fs-param^="${id}:"] [role="tab"]:not([aria-selected="true"])`).first();
          if (await alternateTab.count()) { await alternateTab.click(); changed = true; }
        }
        if (!changed) {
          const inlineSlider = plate.locator(`[data-fs-param^="${id}:"][role="slider"], [data-fs-param^="${id}:"] [role="slider"]`).first();
          if (await inlineSlider.count()) { await inlineSlider.focus(); await page.keyboard.press("End"); changed = true; }
        }
        if (!changed) {
          const handle = plate.locator(".fs-handle").first();
          if (await handle.count()) { await handle.focus(); await page.keyboard.press("ArrowRight"); changed = true; }
        }
        if (!changed) {
          await page.evaluate((figureId) => FS.get(figureId)?.openSettings(), id);
          const slider = plate.locator('.fs-popover [role="slider"]').first();
          const option = plate.locator('.fs-popover [role="group"] button').last();
          if (await slider.count()) { await slider.focus(); await page.keyboard.press("End"); changed = true; }
          else if (await option.count()) { await option.click(); changed = true; }
          await page.evaluate((figureId) => FS.get(figureId)?.closeSettings(), id);
        }
        if (!changed) await page.evaluate((figureId) => FS.get(figureId)?.play(), id);
        await page.waitForTimeout(120);
        await page.evaluate((figureId) => FS.get(figureId)?.pause(), id);
        const changedPath = join(screenshotDirectory, `${width}-${theme.id}-${safe(id)}-changed.png`);
        await screenshotPlate(page, plate, changedPath); perTheme.get(theme.id).push(changedPath);
      }
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const endPath = join(screenshotDirectory, `${width}-${theme.id}-page-end.png`);
      await page.screenshot({ path: endPath }); perTheme.get(theme.id).push(endPath);
      checks.push(`${width}px ${theme.id}: top, end, and per-plate states written`);
    }
  }
  for (const [theme, images] of perTheme) {
    const contact = await context.newPage();
    const cells = images.map((path) => `<figure><img src="data:image/png;base64,${readFileSync(path).toString("base64")}"><figcaption>${basename(path)}</figcaption></figure>`).join("");
    await contact.setContent(`<style>body{margin:20px;background:#222;color:#eee;font:12px system-ui}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}figure{margin:0;background:#111;padding:8px}img{display:block;width:100%;height:auto}figcaption{padding-top:5px;overflow-wrap:anywhere}</style><main>${cells}</main>`);
    await contact.screenshot({ path: join(screenshotDirectory, `contact-${theme}.png`), fullPage: true });
    await contact.close();
  }
  const linkProblems = await page.evaluate(() => [...document.querySelectorAll("a[href]")].flatMap((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href || /^(?:https?:|mailto:|tel:)/.test(href)) return [];
    if (href.startsWith("#")) return document.getElementById(decodeURIComponent(href.slice(1))) ? [] : [`missing fragment ${href}`];
    return [];
  }));
  assert(!linkProblems.length, linkProblems.join("; "));
  await context.close();
  const reduced = await browser.newContext({ viewport: { width: 390, height: 1000 }, reducedMotion: "reduce" });
  const reducedPage = await reduced.newPage();
  reducedPage.on("pageerror", (error) => errors.push(`reduced page: ${error.message}`));
  await reducedPage.goto(pathToFileURL(file).href);
  await reducedPage.waitForFunction(() => window.FS && FS.list().length > 0, null, { timeout: 15_000 });
  await reducedPage.screenshot({ path: join(screenshotDirectory, "390-reduced-motion.png") });
  await reduced.close();
  checks.push("reduced motion renders at 390px");
  assert(!errors.length, `console problems: ${errors.join(" | ")}`);
} catch (error) { failed = error; } finally { await browser.close(); }

const audits = [
  ["term-audit.mjs", plan, file],
  ["copy-lint.mjs", source, plan],
  ["numbers-check.mjs", source],
].map(([script, ...args]) => {
  const result = spawnSync(process.execPath, [join(here, script), ...args], { encoding: "utf8" });
  return { script, status: result.status, output: `${result.stdout || ""}${result.stderr || ""}`.trim() };
});
for (const audit of audits) if (audit.status !== 0 && !failed) failed = new Error(`${audit.script} failed`);
console.log(JSON.stringify({ status: failed ? "FAIL" : "PASS", file, playwright: playwrightPath, screenshots: screenshotDirectory, checks, browserErrors: errors, audits, readerTest: "Run references/reader-test.md with only a copied built file.", error: failed?.message }, null, 2));
process.exit(failed ? 1 : 0);
