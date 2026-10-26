---
name: guide
description: Create one self-contained HTML guide that explains a topic, paper, codebase, or decision in plain practical language with verified claims and live figures. Use it for a durable explanation or reference-quality walkthrough; for lessons, video or teaching from scratch use teach-me; guide explains, in a practical voice, in one file.
license: MIT
compatibility: Requires the animated-visuals skill (same repository) for figures
metadata: { author: Juan Bermudez, version: 0.2.0 }
---

# Guide

Turn one subject into one self-contained HTML file. Carry one example through the page. Verify every factual claim and figure.

## Workflow

### 0. Scaffold

Run:

```sh
node <guide-skill>/scripts/new.mjs <slug> --path <guide-directory>
```

The scaffold writes:

- `plan.md`: factual and structural contract. Complete it before the page.
- `guide.src.html`: authored page markup.
- `data.js`: shared computed values for browser figures and Node checks.
- `guide.js`: figure registrations and page behavior.
- `meta.json`: title, summary, source, and type used by an examples index.
- `.gitignore`: ignores the legacy `.verify/` artifact folder.

The queue plan in `assets/template/example/` is a filled example, not scaffold data.

### 1. Brief

Write the audience, the outcome, one running example, and what is out of scope. Pick a reading length: short is about 1,000 words, standard is 2,000 to 3,000 words, and long is 4,000 to 6,000 words.

### 2. Plan before HTML

Complete `plan.md` with [references/plan-file.md](references/plan-file.md). Label each factual claim and number as measured, reported, estimate, or speculative. Attach its source.

Run the checks in [references/structure.md](references/structure.md). Do not start the page until they pass or the plan records a reason.

### 3. Structure

Choose a topic or paper explanation, codebase guide, decision record, or separate how-to. Use the matching skeleton in [references/structure.md](references/structure.md).

### 4. Write

Follow [references/writing.md](references/writing.md). Put the point first. Use one term per thing. Put conditions before instructions. Flag simplifications where they appear.

### 5. Make figures

For each claim a sentence cannot carry, load the **animated-visuals** skill by name and follow its workflow. If that skill is unavailable, stop and print:

```sh
npx skills@latest add juanbermudez/skills --skill animated-visuals -g
```

Make the figure title its claim. Name every labelled part in the prose. Add interaction only when the reader must change the input the claim depends on. Use [references/layout.md](references/layout.md) and [references/components.md](references/components.md) for the page around each plate.

### 6. Build

Published guides ship without a baked theme default. Run:

```sh
node <guide-skill>/scripts/build.mjs <guide-directory>
```

To bake bb's current theme as the default, opt in with one of:

```sh
node <guide-skill>/scripts/build.mjs <guide-directory> --bb
GUIDE_BB=1 node <guide-skill>/scripts/build.mjs <guide-directory>
```

`GUIDE_NO_BB=1` remains accepted as a no-op. The live probe still follows bb when the finished page opens inside it. The PASS line names the default and the reason. The build inlines themes, runtime, controls, guide styles, optional `data.js`, optional `figures.shared.js`, and `guide.js`. It does not inline fonts; an offline page uses the system fallback.

### 7. Verify

Follow [references/verification.md](references/verification.md). Run the verifier, inspect its contact sheets and per-plate screenshots, then run the isolated reader test. Revise until a fresh reader can answer the predicted questions from the built file alone.

### 8. Deliver

Return the HTML file and list anything not verified. Do not add a “made with” footer. Put the AI-generated note in the reference section.

## What a guide is not

A guide is not a lesson, slide deck, or dashboard. Do not use hooks, eyebrows, or definition quizzes. Use short application checks only to expose real misconceptions.

## References

- [references/plan-file.md](references/plan-file.md) — plan fields, shared data, and copy-lint exceptions.
- [references/structure.md](references/structure.md) — guide types, skeleton, structural rules, and plan checks.
- [references/writing.md](references/writing.md) — voice, sentences, captions, steps, and endings.
- [references/layout.md](references/layout.md) — measures, responsive behavior, type, rhythm, and surfaces.
- [references/components.md](references/components.md) — component markup and optional shared figure code.
- [references/verification.md](references/verification.md) — commands, browser proof, audits, artifacts, and reader testing.
- [references/reader-test.md](references/reader-test.md) — prompt and isolated-reader setup.
- [references/sources.md](references/sources.md) — sources behind the guide rules.
- [references/theming.md](references/theming.md) — theme layer and bb integration.
