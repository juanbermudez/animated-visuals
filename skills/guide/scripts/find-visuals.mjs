#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const INSTALL_COMMAND = "npx skills@latest add juanbermudez/skills --skill animated-visuals -g";
const THEME_FILES = ["default.css", "notebook.css", "omarchy.css", "base.css"];

function valid(root) {
  return existsSync(join(root, "SKILL.md")) &&
    existsSync(join(root, "assets", "runtime", "fs-runtime.js")) &&
    THEME_FILES.every((file) => existsSync(join(root, "themes", file)));
}

function monorepoCandidate(start) {
  let cursor = resolve(start);
  const filesystemRoot = parse(cursor).root;
  while (true) {
    const candidate = join(cursor, "skills", "animated-visuals");
    if (valid(candidate)) return candidate;
    if (cursor === filesystemRoot) return null;
    cursor = dirname(cursor);
  }
}

export function findVisualsRoot({ cwd = process.cwd(), env = process.env, home = homedir() } = {}) {
  const candidates = [];
  if (env.CLAUDE_PLUGIN_ROOT?.trim()) {
    candidates.push({ source: "plugin-root", path: join(env.CLAUDE_PLUGIN_ROOT, "skills", "animated-visuals") });
  }
  const sibling = monorepoCandidate(cwd);
  if (sibling) candidates.push({ source: "monorepo-sibling", path: sibling });
  candidates.push(
    { source: "home-claude", path: join(home, ".claude", "skills", "animated-visuals") },
    { source: "home-agents", path: join(home, ".agents", "skills", "animated-visuals") },
  );
  for (const candidate of candidates) {
    if (!valid(candidate.path)) continue;
    return { ...candidate, path: resolve(candidate.path), realPath: realpathSync(candidate.path) };
  }
  const error = new Error(`animated-visuals was not found. Install it with:\n${INSTALL_COMMAND}`);
  error.code = "ANIMATED_VISUALS_NOT_FOUND";
  throw error;
}

function siteScript(root) {
  const real = realpathSync(root);
  const candidates = [
    join(root, "assets", "site", "site.js"),
    join(root, "assets", "site.js"),
    join(real, "..", "..", "docs", "animated-visuals", "site", "site.js"),
  ];
  return candidates.find(existsSync) || null;
}

function extractHighlighter(source) {
  const iconStart = source.indexOf("  const ICON = {");
  const iconEnd = source.indexOf("\n  };", iconStart);
  const blockStart = source.indexOf("  // ---------- code blocks: live source, highlighting, copy ----------");
  const blockEnd = source.indexOf("\n  // Current page in the nav.", blockStart);
  if ([iconStart, iconEnd, blockStart, blockEnd].some((value) => value < 0)) return "";
  const icons = source.slice(iconStart, iconEnd + 5);
  const block = source.slice(blockStart, blockEnd);
  return `// Generated at build time from animated-visuals/docs/site/site.js.\n(() => {\n${icons}\n${block}\n})();`;
}

export function loadVisuals(found = findVisualsRoot()) {
  const root = typeof found === "string" ? found : found.path;
  const themesCss = THEME_FILES.map((file) => {
    const path = join(root, "themes", file);
    return `/* animated-visuals/themes/${file} */\n${readFileSync(path, "utf8")}`;
  }).join("\n");
  const runtime = readFileSync(join(root, "assets", "runtime", "fs-runtime.js"), "utf8");
  const pickerAsset = join(root, "assets", "plate-src.html");
  const site = siteScript(root);
  const highlightAsset = join(root, "assets", "highlight.js");
  const flowAsset = join(root, "assets", "flow.js");
  // The skill ships both as assets; the site extraction is only a fallback for older copies of the skill.
  const highlighter = existsSync(highlightAsset) ? readFileSync(highlightAsset, "utf8") : site ? extractHighlighter(readFileSync(site, "utf8")) : "";
  const flow = existsSync(flowAsset) ? readFileSync(flowAsset, "utf8") : "";
  return {
    root,
    themesCss,
    runtime,
    highlighter,
    highlighterSource: existsSync(highlightAsset) ? highlightAsset : site,
    flow,
    flowSource: existsSync(flowAsset) ? flowAsset : null,
    pickerSource: existsSync(pickerAsset) ? pickerAsset : site,
    pickerTemplate: existsSync(pickerAsset) ? readFileSync(pickerAsset, "utf8") : site ? readFileSync(site, "utf8") : "",
  };
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    const found = findVisualsRoot();
    const loaded = loadVisuals(found);
    console.log(JSON.stringify({
      status: "PASS",
      source: found.source,
      path: found.path,
      realPath: found.realPath,
      runtime: join(found.path, "assets", "runtime", "fs-runtime.js"),
      themes: THEME_FILES,
      pickerSource: loaded.pickerSource,
      highlighterSource: loaded.highlighterSource,
    }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
