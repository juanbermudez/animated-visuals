# React assets

Thin React wrappers over the same `FS` runtime the standalone template uses, so figures behave identically in a page and in a Next.js site. Checked 2026-10-19 with React 19.2, TypeScript 5.9, three 0.186.1, @react-three/fiber 9.8.2, @nivo/line 0.99.0: `tsc --strict` clean, and all three components rendered in a browser (flow diagram stepping and packets, nivo chart with direct labels, R3F focus pull).

| File | What |
|---|---|
| `useFigure.ts` | `useFigure(id, spec)`: loads the runtime in the browser, mounts the figure on the element `#id`, disposes on unmount; returns the controller (`play`, `seek`, `goto`, `set`, `state`, `apply`, `on`, `hover`…) |
| `fs-runtime.d.ts` | types for the runtime, spec and controller |
| `FigurePlate.tsx` | the plate markup (head, stage, toolbar, step text, caption, readouts) wired with `data-fs*` bindings |
| `FlowDiagram.tsx` | stepped architecture diagram with packets; wide and narrow layouts; prose-linkable via `controller.hover` |
| `ExplorableLine.tsx` | nivo line chart with one parameter, direct end labels, Voronoi hover, reduced-motion aware |
| `nivo-theme.ts` | `chartTheme` on `--fs-*` tokens, `chartMargin`, `useReducedMotion`, `useResolvedTokens` (for canvas charts) |
| `FocusField.tsx` | R3F stateless particle field with a depth-of-field focus pull driven by a damped spring; starter values, tune per figure |

## Install into a site

1. Copy this folder and `../runtime/fs-runtime.js` into one directory (for example `components/figures/`). `useFigure` imports `./fs-runtime.js`.
2. Import `themes/base.css` once, globally, plus one token layer: `themes/site-bridge.css` adapted to your site's variables (follows the site's modes and palettes), or `themes/default.css` (+ `themes/omarchy.css` for palettes) elsewhere.
3. Install only what you use, pinned: `@nivo/core@0.99.0 @nivo/line@0.99.0` for charts; `three@0.186.1 @react-three/fiber@9.8.2` (+ `@react-three/drei@10.7.9` if used) for 3D.
4. Load heavy figures lazily from a client component, in a box with reserved height:

```tsx
"use client";
import dynamic from "next/dynamic";
const FocusField = dynamic(() => import("@/components/figures/FocusField"), { ssr: false });
```

## Theme picker

Theme picker = icon button top-right opening a shadcn-style dropdown; never a select in the hero. In React use the real shadcn `DropdownMenu` (`npx shadcn@latest add dropdown-menu`): it already gives the keyboard, type-ahead, outside-click, focus return and ARIA. Persist the choice yourself and keep the `default` / `default-light` cases:

```tsx
"use client";
import { Fragment, useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { loadFigureRuntime } from "@/components/figures/useFigure";

const GROUPS: [string, [string, string][]][] = [
  ["Site", [["default", "Default"], ["default-light", "Default light"]]],
  ["Registers", [["notebook", "Lab notebook"], ["notebook-light", "Lab notebook light"]]],
  ["Omarchy", [["tokyo-night", "Tokyo Night"], ["catppuccin", "Catppuccin"], ["nord", "Nord"]]],
];

async function apply(id: string) {
  const FS = await loadFigureRuntime();
  if (id === "default-light") { FS.setTheme(null); FS.setMode("light"); }
  else { FS.setMode(id === "default" ? "dark" : null); FS.setTheme(id); }
}

export function ThemeMenu() {
  const [theme, setTheme] = useState("default");
  useEffect(() => { const saved = localStorage.getItem("fs-theme"); if (saved) { setTheme(saved); void apply(saved); } }, []);
  const choose = (id: string) => { setTheme(id); void apply(id); localStorage.setItem("fs-theme", id); };
  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Theme"><Palette /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto">
          <DropdownMenuRadioGroup value={theme} onValueChange={choose}>
            {GROUPS.map(([label, items], i) => (
              <Fragment key={label}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-muted-foreground text-xs">{label}</DropdownMenuLabel>
                  {items.map(([id, name]) => <DropdownMenuRadioItem key={id} value={id}>{name}</DropdownMenuRadioItem>)}
                </DropdownMenuGroup>
              </Fragment>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

List every Omarchy id from `themes/omarchy.json` (the vanilla menu in `../plate-src.html` has the full list). `FS.setTheme` / `FS.setMode` only set `data-fs-theme` / `data-fs-mode` on `<html>`. Map shadcn's `--popover`, `--border` and `--accent` to `--fs-surface`, `--fs-line` and `--fs-surface-2` if the menu should follow the figure theme.

## Rules

- Never `setState` per frame; let the runtime mutate DOM attributes or draw to canvas. Discrete changes (layout, a slider value for nivo) may be React state.
- The plate uses `overflow: hidden`; nivo tooltips are not portaled, so give nivo plates `overflow: visible` or render tooltips inside the plate.
- `.fs-stage > svg|canvas` styles apply to direct children only; library-owned nested SVG/canvas keep their own sizing.
- Reduced motion: the runtime handles `FS` figures; pass `animate={!reduced}` to nivo; R3F switches to `frameloop="demand"`.
