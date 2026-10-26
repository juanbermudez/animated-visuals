#!/usr/bin/env node
// Builds the example guides: docs/examples/src/<slug>/{guide.src.html, guide.js, page.css?, meta.json}
// -> docs/examples/<slug>.html (self-contained: the site's themes, runtime and chrome inlined, so a built guide
// can be shared as one file), and docs/examples.html, the index, from every meta.json. No dependencies:
//   node docs/examples/build.mjs            # every example and the index
//   node docs/examples/build.mjs <slug>...  # some examples, and the index
// The site chrome (header, footer, the early theme script) is lifted from docs/gallery.html at build time, so a
// change to the site's navigation or theme ids reaches every example on the next build.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const docs = join(here, "..");
const src = join(here, "src");
const shared = join(src, "_shared");
const vendor = join(docs, "vendor");
const read = (p) => readFileSync(p, "utf8");

// Themes, in cascade order: the base theme (default.css, or zef.css before the rename), notebook, Omarchy, base.
const baseTheme = ["default.css", "zef.css"].map((f) => join(vendor, f)).find((f) => existsSync(f));
const cssFiles = [baseTheme, join(vendor, "notebook.css"), join(vendor, "omarchy.css"), join(vendor, "base.css")].filter((f) => f && existsSync(f));
const themesCss = cssFiles.map((f) => `/* ---- ${f.slice(docs.length + 1)} ---- */\n${read(f)}`).join("\n");

const gallery = read(join(docs, "gallery.html"));
const early = (gallery.match(/<script>try\{var t=localStorage[\s\S]*?<\/script>/) || [""])[0];
const relink = (html) => html.replace(/(href|src)="(?!https?:|\/|#|\.\.\/)([^"]+)"/g, '$1="../$2"');
const header = relink((gallery.match(/<header class="site-head">[\s\S]*?<\/header>/) || [""])[0]);
const footer = relink((gallery.match(/<footer class="site-foot">[\s\S]*?<\/footer>/) || [""])[0]);
if (!header || !footer || !early) throw new Error("docs/gallery.html no longer carries the site chrome this build lifts");

const fonts = (gallery.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/) || [""])[0];
const parts = {
  THEMES: themesCss,
  SITE_CSS: read(join(docs, "site/site.css")),
  EXAMPLES_CSS: read(join(shared, "examples.css")),
  RUNTIME: read(join(vendor, "fs-runtime.js")),
  THEMES_JS: read(join(vendor, "themes.js")),
  SITE_JS: read(join(docs, "site/site.js")),
  FLOW_JS: read(join(shared, "flow.js")),
};

function build(slug) {
  const dir = join(src, slug);
  const meta = JSON.parse(read(join(dir, "meta.json")));
  let html = read(join(dir, "guide.src.html"));
  const fill = {
    ...parts,
    PAGE_CSS: existsSync(join(dir, "page.css")) ? read(join(dir, "page.css")) : "",
    GUIDE_JS: read(join(dir, "guide.js")),
  };
  for (const [key, value] of Object.entries(fill)) html = html.split(`/*__${key}__*/`).join(value);
  html = html.replace("<!--__EARLY_THEME__-->", early).replace("<!--__FONTS__-->", fonts)
    .replace("<!--__SITE_HEAD__-->", header).replace("<!--__SITE_FOOT__-->", footer);
  const left = html.match(/\/\*__[A-Z_]+__\*\/|<!--__[A-Z_]+__-->/g);
  if (left) throw new Error(`${slug}: unfilled placeholders ${left.join(", ")}`);
  const out = join(here, `${slug}.html`);
  writeFileSync(out, html);
  return { slug, out, bytes: Buffer.byteLength(html), title: meta.title };
}

function index(entries) {
  const cards = entries.map((m) => {
    const card = existsSync(join(here, "cards", `${m.slug}.png`)) ? `<img src="examples/cards/${m.slug}.png" alt="" loading="lazy">` : "";
    const source = m.source ? `<span class="muted">${escape(m.source.label)}</span>` : "";
    return `    <a class="card" href="examples/${m.slug}.html">${card}<b>${escape(m.title)}</b><span>${escape(m.summary)}</span>${source}</a>`;
  }).join("\n");
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Examples · Animated Visuals</title>
<meta name="description" content="Visual guides built with Animated Visuals: each explains one paper or idea with live figures, verified against its source.">
${early}
<link rel="icon" href="site/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
${cssFiles.map((f) => `<link rel="stylesheet" href="${f.slice(docs.length + 1)}">`).join("\n")}
<link rel="stylesheet" href="site/site.css">
<style>
.cards img { display: block; width: 100%; aspect-ratio: 1200 / 630; object-fit: cover; margin: 0 0 10px; border-radius: 6px; border: 1px solid var(--fs-line); }
</style>
</head>
<body>
<a class="sr-only" href="#main">Skip to content</a>
${gallery.match(/<header class="site-head">[\s\S]*?<\/header>/)[0]}

<main class="page" id="main">
  <h1>Examples</h1>
  <p class="lede">Each guide explains one paper or idea with live figures and is checked against its source. Open one, change the theme from the palette button, and try <code>FS.list()</code> in the console. The sources are under <code>docs/examples/src/</code>.</p>
  <div class="cards">
${cards}
  </div>
</main>

${gallery.match(/<footer class="site-foot">[\s\S]*?<\/footer>/)[0]}
<script src="vendor/fs-runtime.js"></script>
<script src="vendor/themes.js"></script>
<script src="site/site.js"></script>
</body>
</html>
`;
  writeFileSync(join(docs, "examples.html"), page);
  return entries.length;
}

const escape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const slugs = readdirSync(src).filter((d) => !d.startsWith("_") && existsSync(join(src, d, "meta.json")));
const wanted = process.argv.slice(2);
const built = (wanted.length ? wanted : slugs).map(build);
mkdirSync(join(here, "cards"), { recursive: true });
const entries = slugs.map((s) => ({ slug: s, ...JSON.parse(read(join(src, s, "meta.json"))) }))
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title));
const n = index(entries);
console.log(JSON.stringify({ status: "PASS", built: built.map((b) => ({ slug: b.slug, bytes: b.bytes })), index: n }));
