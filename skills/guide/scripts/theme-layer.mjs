import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { bbTheme } from "./bb-theme.mjs";

const ASSETS = join(import.meta.dirname, "..", "assets", "theme");
const THEME_FILES = ["default.css", "notebook.css", "omarchy.css", "base.css"];

function themeList(omarchy) {
  return [
    { id: "default", name: "Default", mode: "dark", family: "default" },
    { id: "notebook", name: "Notebook", mode: "dark", family: "notebook" },
    ...Object.entries(omarchy.themes)
      .filter(([, theme]) => theme.mode === "dark")
      .map(([id, theme]) => ({ id, name: theme.name, mode: theme.mode, family: "omarchy" })),
    { id: "default-light", name: "Default Light", mode: "light", family: "default" },
    { id: "notebook-light", name: "Notebook Light", mode: "light", family: "notebook" },
    ...Object.entries(omarchy.themes)
      .filter(([, theme]) => theme.mode === "light")
      .map(([id, theme]) => ({ id, name: theme.name, mode: theme.mode, family: "omarchy" })),
  ];
}

async function read(path) {
  return readFile(path, "utf8");
}

export async function themeLayer({ visualsRoot, bb = true } = {}) {
  if (!visualsRoot) throw new Error("themeLayer requires { visualsRoot }");
  const [omarchySource, pickerHtml, pickerCss, runtimeTemplate, ...themeSources] = await Promise.all([
    read(join(visualsRoot, "themes", "omarchy.json")),
    read(join(ASSETS, "picker.html")),
    read(join(ASSETS, "picker.css")),
    read(join(ASSETS, "theme-runtime.js")),
    ...THEME_FILES.map((file) => read(join(visualsRoot, "themes", file))),
  ]);
  const omarchy = JSON.parse(omarchySource);
  const themes = themeList(omarchy);
  let detected = null;
  if (bb !== false && process.env.GUIDE_NO_BB !== "1") {
    detected = bb && typeof bb === "object" && "kind" in bb
      ? bb
      : await bbTheme({ visualsRoot, ...(bb && typeof bb === "object" ? bb : {}) });
  }
  if (detected?.kind === "bridged") {
    themes.push({ id: "bb", name: "bb (current)", mode: detected.mode, family: "bb" });
  }
  const defaultTheme = detected?.themeId ?? null;
  const config = JSON.stringify({ themes, defaultTheme });
  const script = runtimeTemplate.replace("/*__THEME_CONFIG__*/", config);
  const css = [
    ...themeSources.map((source, index) => `/* ---- animated-visuals/themes/${THEME_FILES[index]} ---- */\n${source.trim()}`),
    detected?.kind === "bridged" ? detected.css.trim() : "",
    pickerCss.trim(),
  ].filter(Boolean).join("\n\n");
  return { css, pickerHtml: pickerHtml.trim(), script, defaultTheme };
}
