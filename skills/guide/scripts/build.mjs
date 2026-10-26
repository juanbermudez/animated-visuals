#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findVisualsRoot, loadVisuals } from "./find-visuals.mjs";
import { themeLayer } from "./theme-layer.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const guideRoot = join(here, "..");
const directory = process.argv[2] ? resolve(process.argv[2]) : null;
if (!directory) {
  console.error("usage: node build.mjs <guide-directory>");
  process.exit(2);
}
const sourceFile = join(directory, "guide.src.html");
const scriptFile = join(directory, "guide.js");
if (!existsSync(sourceFile) || !existsSync(scriptFile)) {
  console.error(`expected guide.src.html and guide.js in ${directory}`);
  process.exit(1);
}

const read = (path) => readFileSync(path, "utf8");
const found = findVisualsRoot();
const visuals = loadVisuals(found);
const layer = await themeLayer({ visualsRoot: visuals.root });
for (const key of ["css", "pickerHtml", "script", "defaultTheme"]) {
  if (!(key in layer)) throw new Error(`themeLayer() did not return ${key}`);
}

const source = read(sourceFile);
if (/class=["'][^"']*language-(?:js|ts|tsx|javascript|typescript|python|py|shell|sh|bash|json|html|css)/i.test(source) && !visuals.highlighter) {
  throw new Error("This guide contains highlighted code, but the located animated-visuals has no assets/highlight.js. Update the skill (npx skills@latest add juanbermudez/skills --skill animated-visuals -g).");
}

const themeScript = layer.script ? `<script>\n${layer.script}\n</script>` : "";
const sharedFigureScript = existsSync(join(directory, "flow.js")) ? read(join(directory, "flow.js")) : "";
const guideScript = [visuals.highlighter, visuals.flow, sharedFigureScript, read(scriptFile)].filter(Boolean).join("\n\n");
// The highlighter only defines AV.enhanceCode; a guide calls it once the page is parsed.
const enhanceCall = visuals.highlighter ? "\n\nif (window.AV && typeof AV.enhanceCode === \"function\") AV.enhanceCode();" : "";
const guideScriptWithCode = guideScript + enhanceCall;
const replacements = {
  THEMES: layer.css,
  RUNTIME: visuals.runtime,
  COMPONENTS: read(join(guideRoot, "assets", "components.css")),
  PAGE_CSS: existsSync(join(directory, "page.css")) ? read(join(directory, "page.css")) : "",
  GUIDE_JS: guideScriptWithCode,
};

let html = source;
for (const [key, value] of Object.entries(replacements)) html = html.split(`/*__${key}__*/`).join(value);
html = html.split("<!--__THEME_PICKER__-->").join(layer.pickerHtml);
html = html.split("<!--__THEME_SCRIPT__-->").join(themeScript);
const leftovers = html.match(/\/\*__[A-Z_]+__\*\/|<!--__[A-Z_]+__-->/g);
if (leftovers) throw new Error(`unfilled placeholders: ${leftovers.join(", ")}`);

const output = join(directory, "index.html");
writeFileSync(output, html);
console.log(JSON.stringify({
  status: "PASS",
  input: sourceFile,
  output,
  bytes: Buffer.byteLength(html),
  visuals: { source: found.source, root: found.path, highlighter: visuals.highlighterSource },
  theme: { defaultTheme: layer.defaultTheme, picker: Boolean(layer.pickerHtml), script: Boolean(layer.script) },
}));
