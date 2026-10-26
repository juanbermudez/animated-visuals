# Verification

Run the nearest affected check after each change. Run the full sequence before delivery.

## 1. Build

```sh
node <guide-skill>/scripts/build.mjs <guide-directory>
```

The JSON PASS line must report `theme.defaultTheme: null` and `theme.defaultReason: "published build: no baked default"` for a plain build. It also reports that fonts are not inlined and use the system fallback offline. The output must contain no placeholder.

Check explicit bb selection separately when the guide will use it:

```sh
GUIDE_BB=1 node <guide-skill>/scripts/build.mjs <guide-directory>
```

## 2. Browser and interactions

```sh
node <guide-skill>/scripts/verify.mjs <guide-directory>/index.html
```

Set `PLAYWRIGHT_PATH` when Playwright is not installed in the guide folder, skill folder, or known runtime cache:

```sh
PLAYWRIGHT_PATH=/absolute/path/to/playwright node <guide-skill>/scripts/verify.mjs <guide-directory>/index.html
```

The verifier writes to a new directory under `TMPDIR`, prints that path before launching the browser, and never writes into the guide folder. `TMPDIR` can differ between sandboxed and unsandboxed shells, so use the printed path.

It checks:

- every drawing is registered with `FS.get(id)`;
- no console errors or warnings;
- play and pause on every figure;
- next and previous where steps exist;
- seek where a timeline control exists;
- each numeric parameter at its minimum and maximum, with a changed readout or drawing;
- every handle with keyboard arrows, with visible movement;
- theme picker open and selection;
- expand and close for every plate;
- no page overflow at 1,440 and 390 CSS pixels;
- Default dark, Default light, and Tokyo Night;
- reduced motion at 390 CSS pixels;
- fragment links and highlighted code controls.

It saves the page top and end plus every plate at rest and after one step or parameter change, at both widths and all three themes. It also saves one contact sheet per theme. Open all three contact sheets, then inspect individual plate files for clipping, collisions, hierarchy, repaint, and phone reflow.

## 3. Term audit

```sh
node <guide-skill>/scripts/term-audit.mjs <guide-directory>/plan.md <guide-directory>/index.html
```

A term may appear in its own figure title, caption, step text, and tips, and in the Source line or paper title. It may not be introduced in an earlier heading or prose block. Approved aliases follow the same rule. An empty terms table passes for a new scaffold.

## 4. Copy lint

```sh
node <guide-skill>/scripts/copy-lint.mjs <guide-directory>/guide.src.html <guide-directory>/plan.md
```

The lint checks banned patterns, labels above headings, title length, heading case, unitless numbers, and sentences over 25 words. Decimal values are one token. It ignores tables, checked-against-source content, figure titles and status chips, definition pairs, brand, skip link, formula and code content, and scaffold boilerplate. It does not split sentences at `Eq.`, `Fig.`, `Sec.`, `e.g.`, `i.e.`, or `vs.`.

Record justified findings in the plan's `## Copy-lint exceptions` block. The command fails only unexplained findings. See [plan-file.md](plan-file.md) for syntax and dimensionless symbols.

## 5. Numbers check

```sh
node <guide-skill>/scripts/numbers-check.mjs <guide-directory>/guide.src.html
```

Every prose token must appear in the checked-against-source block with the same unit and rounding. The tokenizer keeps decimals intact and requires a boundary after units, so `4 steps` cannot become `4 s`. It also reads optional `data.checkedNumbers` from `data.js`.

## 6. Links and sources

The browser verifier checks fragment targets. Open each external primary source used by a load-bearing claim during research. A reachable URL does not prove that the cited passage supports the claim.

## 7. Reader test

Follow [reader-test.md](reader-test.md). Give the reader only a copied built file in an empty folder and the predicted questions. Compare the answers with the fact sheet. Rebuild and repeat after a miss, invention, or unclear source. A source check is not a reader test.
