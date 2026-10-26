// TEMPORARY FALLBACK. The theme worker replaces this file with the full picker and bb-aware layer.
// Keep this signature stable: themeLayer({ visualsRoot }) -> { css, pickerHtml, script, defaultTheme }.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function themeLayer({ visualsRoot }) {
  const files = ["default.css", "notebook.css", "omarchy.css", "base.css"];
  return {
    css: files.map((file) => readFileSync(join(visualsRoot, "themes", file), "utf8")).join("\n"),
    pickerHtml: "",
    script: "",
    defaultTheme: "default",
  };
}
