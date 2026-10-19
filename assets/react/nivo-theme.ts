import type { PartialTheme } from "@nivo/theming";

import { useEffect, useState } from "react";

/**
 * nivo theme on --fs-* tokens. Module scope on purpose: nivo memoizes on object identity,
 * so an inline literal would re-merge the theme on every render. SVG variants only;
 * canvas variants need resolved colors (useResolvedTokens).
 */
export const chartTheme: PartialTheme = {
  background: "transparent",
  text: { fontFamily: "var(--fs-font-figure)", fontSize: 11, fill: "var(--fs-muted)" },
  axis: {
    domain: { line: { stroke: "transparent" } },
    ticks: { line: { stroke: "var(--fs-line)", strokeWidth: 1 }, text: { fontSize: 10.5 } },
    legend: { text: { fontSize: 11, fill: "var(--fs-muted)" } },
  },
  grid: { line: { stroke: "var(--fs-line)", strokeWidth: 1 } },
  crosshair: { line: { stroke: "var(--fs-line-strong)", strokeWidth: 1, strokeOpacity: 1, strokeDasharray: "3 3" } },
  labels: { text: { fill: "var(--fs-fg)", outlineWidth: 2, outlineColor: "var(--fs-surface)" } },
  tooltip: {
    container: {
      background: "var(--fs-surface)",
      color: "var(--fs-fg)",
      border: "1px solid var(--fs-line)",
      borderRadius: 6,
      boxShadow: "none",
      fontSize: 12,
      padding: "6px 9px",
    },
  },
};

/** Margins with room for direct labels on the right (nivo defaults to 0 and clips). */
export const chartMargin = { top: 16, right: 104, bottom: 36, left: 44 };

/** Live reduced-motion preference; nivo does not read it, so pass animate={!reduced}. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return reduced;
}

const TOKENS = ["fg", "muted", "line", "line-strong", "surface", "accent", "c1", "c2", "c3", "c4", "c5", "c6"] as const;
/** Resolved token colors for canvas charts; re-reads when the theme changes. */
export function useResolvedTokens(scope?: HTMLElement | null) {
  const [colors, setColors] = useState<Record<(typeof TOKENS)[number], string> | null>(null);
  useEffect(() => {
    const host = scope ?? document.documentElement;
    const probe = document.createElement("span");
    probe.hidden = true;
    host.append(probe);
    const read = () => {
      const next = {} as Record<(typeof TOKENS)[number], string>;
      for (const token of TOKENS) {
        probe.style.color = `var(--fs-${token})`;
        next[token] = getComputedStyle(probe).color;
      }
      setColors(next);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-fs-theme", "data-fs-mode", "data-style-palette"] });
    return () => {
      observer.disconnect();
      probe.remove();
    };
  }, [scope]);
  return colors;
}
