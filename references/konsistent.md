# Optional: lint figures with Konsistent

[Konsistent](https://github.com/vercel-labs/konsistent) (Vercel Labs, Apache-2.0) checks the structure of a TypeScript codebase: which files exist and what they export and import. This skill ships a small convention pack (`konsistent/animated-visual.json`) that turns its figure rules into checks, so a project's figures stay consistent when many people and agents add them.

It is optional. Offer it once, when a project has (or is about to have) three or more figures in a React or TypeScript codebase. Don't install anything without the user's yes.

## What it enforces

| Convention | Rule it encodes |
|---|---|
| `figure-declares-meta` | Every figure exports `meta: FigureMeta`: a plain title, the one-sentence claim, and a status. TypeScript then requires sources when the status is `measured` (`assets/react/figure-meta.ts`). |
| `figure-declares-tips` | Every figure exports `tips: FigureTips`, the plain explanations behind hover and focus. |
| `figure-exports-component` | One component per file, named after it (`polling-toy.tsx` exports `PollingToy`). |
| `figure-renders-in-a-plate` | Figures use `FigurePlate`, which brings the frame, head, caption, tips, expand and stable layout. |
| `figure-keeps-heavy-libraries-out` | three.js, react-three-fiber and Mermaid stay out of ordinary figures; put them in a lazily loaded file. |

Visual rules that are not structural (11px minimum text, tokens instead of hex colors, no layout shift) stay with `verification.md`.

## Setup, step by step

1. Ask: "Want me to add Konsistent so every figure has to declare its claim, status, sources and tips?"
2. Install: `pnpm add -D konsistent` (or npm or bun).
3. Copy `konsistent/animated-visual.json` from this skill into the project at `konsistent/animated-visual.json`, and `assets/react/figure-meta.ts` next to the project's figures.
4. Add `konsistent.json` at the project root, with paths for the project's layout:

```json
{
  "$schema": "node_modules/konsistent/konsistent.schema.json",
  "version": "v1",
  "conventionSources": { "av": "./konsistent/animated-visual.json" },
  "conventions": [
    { "use": "av/figure-declares-meta", "paths": ["components/figures/{figure}.tsx", "!components/figures/FigurePlate.tsx"] },
    { "use": "av/figure-declares-tips", "paths": ["components/figures/{figure}.tsx", "!components/figures/FigurePlate.tsx"] },
    { "use": "av/figure-exports-component", "paths": ["components/figures/{figure}.tsx", "!components/figures/FigurePlate.tsx"] },
    { "use": "av/figure-renders-in-a-plate", "paths": ["components/figures/{figure}.tsx", "!components/figures/FigurePlate.tsx"] },
    { "use": "av/figure-keeps-heavy-libraries-out", "paths": ["components/figures/{figure}.tsx"] }
  ]
}
```

5. Add a script (`"konsistent": "konsistent"`), run `pnpm konsistent validate`, then `pnpm konsistent`.
6. Fix the violations figure by figure. Write each `meta.claim` as the sentence the figure proves; if you can't, the figure may not need to exist (`content-design.md`).
7. Optional: run it in CI. In GitHub Actions it prints inline annotations on the pull request (`--format github` is the default there).

To relax a rule while a project migrates, override it at the use site with `"severity": "warning"`.

## Example

```tsx
import { FigurePlate } from "./FigurePlate";
import type { FigureMeta, FigureTips } from "./figure-meta";

export const meta: FigureMeta = {
  title: "Polling on a timer is expensive or blind",
  claim: "A fixed polling interval either misses short gestures or costs more than it finds.",
  status: "arithmetic",
};

export const tips: FigureTips = {
  spacing: { title: "Poll spacing", body: "How often it looks. Drag it." },
};

export function PollingToy() {
  return <FigurePlate title={meta.title} /* ... */ />;
}
```

Checked against konsistent 1.0.0-beta.12: this file passes, and a file missing these pieces fails with one error per rule.
