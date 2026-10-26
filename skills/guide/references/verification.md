# Verification

Run these checks in order. Stop on a failure, fix its cause, and restart from the nearest affected check.

## 1. Build

```sh
node <guide-skill>/scripts/build.mjs <guide-directory>
```

The output must contain no unfilled placeholders and must open without network access.

## 2. Browser

```sh
node <guide-skill>/scripts/verify.mjs <guide-directory>/index.html
```

Require:

- no console errors or warnings;
- every figure registered with `FS`;
- no page overflow at 1,440 and 390 CSS pixels;
- Default dark, Default light, and Tokyo Night applied;
- reduced motion renders a complete still;
- local links and fragment links resolve.

Open the written screenshots. Check label clipping, collisions, visual hierarchy, theme repaint, and the phone reflow.

## 3. Term audit

```sh
node <guide-skill>/scripts/term-audit.mjs <guide-directory>/plan.md <guide-directory>/index.html
```

Every term in the plan's terms table must appear after its named figure and use only its approved aliases. This audit is adapted from teach-me's `term_audit.mjs`; the script carries the credit.

## 4. Copy lint

```sh
node <guide-skill>/scripts/copy-lint.mjs <guide-directory>/guide.src.html
```

Check banned patterns, labels above headings, title length, heading case, numbers without units, and sentences over 25 words. Treat each flag as a revision or a written exception.

## 5. Numbers check

```sh
node <guide-skill>/scripts/numbers-check.mjs <guide-directory>/guide.src.html
```

Every number in prose, captions, tables, and readouts must appear in the checked-against-source block. Keep units and rounding identical.

## 6. Links

The browser verifier checks local files and fragment targets. Open every external primary source used by a load-bearing claim during research. Do not treat a reachable URL as proof that the cited passage supports the claim.

## 7. Reader test

Give a fresh agent only the built HTML and 5 to 10 predicted reader questions from `plan.md`. Use [reader-test.md](reader-test.md) as the exact prompt. Do not give it the plan, source notes, intended answers, or prior review.

Compare its answers with the fact sheet. Revise the guide when it misses, invents, or cannot locate an answer. Rebuild and repeat until the answers are right or the guide states the limit clearly.

Record the reader model or session, questions, result, and revisions. A source check is not a reader test.
