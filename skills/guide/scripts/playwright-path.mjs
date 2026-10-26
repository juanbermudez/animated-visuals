import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const knownCache = "/Users/juanbermudez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
export function resolvePlaywright({ guideDirectory, skillDirectory }) {
  const require = createRequire(import.meta.url);
  const candidates = [
    process.env.PLAYWRIGHT_PATH,
    ...[guideDirectory, skillDirectory].flatMap((directory) => {
      if (!directory) return [];
      try { return [require.resolve("playwright", { paths: [directory] })]; } catch { return []; }
    }),
    knownCache,
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const target = existsSync(candidate) ? candidate : require.resolve(candidate);
      return { module: require(target), path: target };
    } catch { /* try the next documented location */ }
  }
  throw new Error(`Playwright was not found. Set PLAYWRIGHT_PATH. Tried: ${candidates.join(", ")}`);
}
