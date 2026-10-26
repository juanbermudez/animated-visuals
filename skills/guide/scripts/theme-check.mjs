#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { auditBridgeCss } from "./bb-theme.mjs";
import { themeLayer } from "./theme-layer.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const repo = resolve(import.meta.dirname, "..", "..", "..");
const sibling = join(repo, "skills", "animated-visuals");
const installed = join(homedir(), ".claude", "skills", "animated-visuals");
const fixturePath = join(import.meta.dirname, "..", "assets", "theme", "fixtures", "sample-bb.css");
const ids = [
  "default", "default-light", "notebook", "notebook-light", "catppuccin-latte", "catppuccin", "ethereal",
  "everforest", "flexoki-light", "gruvbox", "hackerman", "kanagawa", "last-horizon", "lumon", "lupine",
  "matte-black", "miasma", "nord", "osaka-jade", "retro-82", "ristretto", "rose-pine", "solitude",
  "starship", "tokyo-night", "vantablack", "white",
];

function assertThemes(layer, label) {
  for (const id of ids) assert.match(layer.css, new RegExp(`data-fs-theme=["']${id}["']`), `${label}: missing ${id}`);
  const configured = JSON.parse(layer.script.match(/const CONFIG = (\{.*\});/)?.[1] ?? "null");
  assert.equal(configured.themes.filter((theme) => ids.includes(theme.id)).length, 27, `${label}: expected 27 configured themes`);
  assert.deepEqual(new Set(configured.themes.filter((theme) => ids.includes(theme.id)).map((theme) => theme.id)), new Set(ids));
}

async function staticChecks() {
  const bbOutput = JSON.parse(execFileSync("bb", ["theme", "list", "--json"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }));
  console.log(`bb active.themeId: ${bbOutput.active?.themeId ?? "null"}`);

  const siblingLayer = await themeLayer({ visualsRoot: sibling });
  assertThemes(siblingLayer, "sibling");
  assert.equal(siblingLayer.defaultTheme, "hackerman");

  const installedLayer = await themeLayer({ visualsRoot: installed, bb: false });
  assertThemes(installedLayer, "installed symlink");
  assert.equal(installedLayer.defaultTheme, null);

  const previous = process.env.GUIDE_NO_BB;
  process.env.GUIDE_NO_BB = "1";
  const disabledLayer = await themeLayer({ visualsRoot: sibling });
  if (previous == null) delete process.env.GUIDE_NO_BB;
  else process.env.GUIDE_NO_BB = previous;
  assert.equal(disabledLayer.defaultTheme, null);

  const customCss = await readFile(fixturePath, "utf8");
  const bridgedLayer = await themeLayer({
    visualsRoot: sibling,
    bb: { payload: { active: { themeId: "plugin:studio:something-else", customCss } } },
  });
  assert.equal(bridgedLayer.defaultTheme, "bb");
  assert.match(bridgedLayer.css, /\[data-fs-theme="bb"\]/);
  const bridgeStart = bridgedLayer.css.lastIndexOf("/* bb theme bridge.");
  const bridgeEnd = bridgedLayer.css.indexOf("/* Theme picker.", bridgeStart);
  const audit = await auditBridgeCss(bridgedLayer.css.slice(bridgeStart, bridgeEnd), { visualsRoot: sibling });
  assert.equal(audit.pass, true, audit.failures.join("\n"));
  assert.doesNotMatch(siblingLayer.script, /docs\/animated-visuals|site\/site|vendor\/themes|\.\.\//);

  execFileSync(process.execPath, [join(sibling, "scripts", "check-contrast.mjs")], { stdio: "pipe" });
  return { layer: siblingLayer, bbOutput, audit };
}

function pageHtml(layer, runtime, plate) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Guide theme check</title>
<script>${runtime}</script>
<script>${layer.script}</script>
<style>${layer.css}</style>
<style>
* { box-sizing: border-box; }
html { background: var(--fs-bg); color: var(--fs-fg); }
body { min-height: 100vh; margin: 0; padding: 20px; background: var(--fs-bg); color: var(--fs-fg); font: 16px/1.6 var(--fs-font-body); }
.check-head { display: flex; align-items: center; width: min(58rem, 100%); margin: 0 auto 32px; padding-bottom: 12px; border-bottom: 1px solid var(--fs-line); }
.check-head strong { color: var(--fs-strong); }
main { width: min(46rem, 100%); margin: auto; }
h1 { margin: 0 0 8px; color: var(--fs-strong); font: 600 clamp(28px, 6vw, 48px)/1.05 var(--fs-font-display); letter-spacing: -0.035em; }
.lede { margin: 0 0 28px; color: var(--fs-muted); }
.probe { margin-top: 24px; padding: 16px; color: var(--fs-muted); background: var(--fs-block); border-radius: var(--fs-radius-inner); }
@media (max-width: 520px) { body { padding: 20px; } .fs-plate.wide { width: 100%; margin-inline: 0; } }
</style>
</head>
<body>
<header class="check-head"><strong>Guide</strong>${layer.pickerHtml}</header>
<main>
<h1>Theme layer check</h1>
<p class="lede">One plate verifies the four surfaces, text roles, controls, and the saved theme.</p>
${plate}
<p class="probe"><strong>Block surface.</strong> This text uses the current muted and strong roles.</p>
</main>
</body>
</html>`;
}

async function serve(html) {
  const server = createServer((request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    response.end(html);
  });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const { port } = server.address();
  return { server, url: `http://127.0.0.1:${port}/` };
}

async function browserChecks(layer) {
  const out = await mkdtemp(join(tmpdir(), "guide-theme-check-"));
  const runtime = await readFile(join(sibling, "assets", "runtime", "fs-runtime.js"), "utf8");
  const template = await readFile(join(sibling, "assets", "plate-src.html"), "utf8");
  let plate = template.match(/<figure class="fs-plate wide"[\s\S]*?<\/figure>/)?.[0];
  assert.ok(plate, "could not extract a plate from animated-visuals/assets/plate-src.html");
  plate = plate.replace(/<div class="fs-stage">[\s\S]*?<\/div>/, '<div class="fs-stage"><svg viewBox="0 0 720 220" role="img" aria-label="Three connected nodes"><rect x="40" y="65" width="170" height="90" rx="6" fill="var(--fs-node)" stroke="var(--fs-line-strong)"/><rect x="275" y="65" width="170" height="90" rx="6" fill="var(--fs-node)" stroke="var(--fs-line-strong)"/><rect x="510" y="65" width="170" height="90" rx="6" fill="var(--fs-node)" stroke="var(--fs-line-strong)"/><path d="M210 110H275M445 110H510" stroke="var(--fs-accent)" stroke-width="2" stroke-dasharray="5 5"/><g fill="var(--fs-fg)" font-family="var(--fs-font-figure)" font-size="14" text-anchor="middle"><text x="125" y="115">Page</text><text x="360" y="115">Plate</text><text x="595" y="115">Node</text></g></svg></div>');
  const html = pageHtml(layer, runtime, plate);
  const htmlPath = join(out, "theme-check.html");
  await writeFile(htmlPath, html);
  const { server, url } = await serve(html);
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--disable-gpu-sandbox", "--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
  const consoleProblems = [];
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) consoleProblems.push(`${message.type()}: ${message.text()}`); });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  const shot = async (name) => {
    await page.waitForTimeout(350);
    const path = join(out, `${name}.png`);
    await page.screenshot({ path, fullPage: true });
    return path;
  };

  try {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.AV?.currentTheme?.() === "hackerman");
    await shot("1440-bb-built-default");

    for (const [id, name] of [["default", "default-dark"], ["default-light", "default-light"], ["tokyo-night", "tokyo-night"]]) {
      await page.evaluate((theme) => window.AV.applyTheme(theme), id);
      await page.waitForFunction((theme) => window.AV.currentTheme() === theme, id);
      await shot(`1440-${name}`);
    }

    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.evaluate(() => window.AV.currentTheme()), "tokyo-night");
    await shot("1440-tokyo-night-persisted");

    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.evaluate(() => window.AV.currentTheme()), "hackerman");

    await page.locator("[data-guide-theme-trigger]").focus();
    await page.keyboard.press("Space");
    assert.equal(await page.locator("[data-guide-theme-menu]").getAttribute("hidden"), null);
    await page.keyboard.press("Escape");
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.locator("[data-guide-theme-menu]").getAttribute("hidden"), null);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Tokyo");
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.theme), "tokyo-night");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => window.AV.currentTheme()), "tokyo-night");
    assert.equal(await page.evaluate(() => localStorage.getItem("av-theme")), "tokyo-night");

    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => {
      const values = {
        "--canvas": "#f4f2ec", "--card": "#ffffff", "--popover": "#e5e0d7", "--ink": "#1d211f",
        "--muted-foreground": "#505a55", "--primary": "#245c48", "--link-foreground": "#185f87",
        "--heading-foreground": "#16231d", "--ring": "#245c48", "--success": "#26734d", "--destructive": "#a33b3b",
      };
      for (const [name, value] of Object.entries(values)) document.documentElement.style.setProperty(name, value);
      document.documentElement.style.colorScheme = "light";
    });
    await page.waitForFunction(() => window.AV.currentTheme() === "bb");
    await shot("1440-bb-live-probe");

    await page.evaluate(() => window.AV.applyTheme("tokyo-night"));
    await page.evaluate(() => document.documentElement.style.setProperty("--canvas", "#fff8e8"));
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => window.AV.currentTheme()), "tokyo-night");
    await shot("1440-reader-pick-wins");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      localStorage.clear();
      for (const name of [...document.documentElement.style]) if (name.startsWith("--") || name === "color-scheme") document.documentElement.style.removeProperty(name);
      document.documentElement.removeAttribute("style");
      window.AV.applyTheme("default");
    });
    await shot("390-default-dark");
    await page.evaluate(() => window.AV.applyTheme("default-light"));
    await shot("390-default-light");
    await page.evaluate(() => window.AV.applyTheme("tokyo-night"));
    await shot("390-tokyo-night");

    await page.locator("[data-guide-theme-trigger]").focus();
    await page.keyboard.press("Enter");
    const rect = await page.locator("[data-guide-theme-menu]").boundingBox();
    assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= 390, `390 picker overflow: ${JSON.stringify(rect)}`);
    await shot("390-picker-open");
    await page.keyboard.press("Escape");

    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await page.locator("[data-guide-theme-menu]").evaluate((element) => getComputedStyle(element).animationName), "none");
    await shot("390-reduced-motion");
    assert.deepEqual(consoleProblems, []);
  } finally {
    await browser.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
  return { out, htmlPath };
}

const { layer, audit } = await staticChecks();
const browser = await browserChecks(layer);
console.log(`PASS 27 themes from sibling and installed symlink; bb default hackerman; GUIDE_NO_BB null; fake bridge contrast ${audit.pass ? "PASS" : "FAIL"}; browser 1440/390 PASS`);
console.log(`artifacts: ${browser.out}`);
