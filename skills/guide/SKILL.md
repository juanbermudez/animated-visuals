---
name: guide
description: Create one self-contained HTML guide that explains a topic, paper, codebase, or decision in plain practical language with verified claims and live figures. Use it for a durable explanation or reference-quality walkthrough; for lessons, video or teaching from scratch use teach-me; guide explains, in a practical voice, in one file.
license: MIT
compatibility: Requires the animated-visuals skill (same repository) for figures
metadata: { author: Juan Bermudez, version: 0.1.0 }
---

# Guide

Turn one subject into one self-contained HTML file. Keep the prose practical, carry one example through the page, and verify every factual claim and figure.

## Workflow

### 1. Brief

Write down the audience, what they must be able to do or explain afterwards, the one example you will carry through, and what is out of scope. Pick a reading length: short is about 1,000 words, standard is 2,000 to 3,000 words, and long is 4,000 to 6,000 words.

### 2. Plan before HTML

Create `plan.md` before writing HTML. Use [references/plan-file.md](references/plan-file.md) for the thesis, terms in teaching order, running example, and fact sheet. Label every claim and number as measured, reported, estimate, or speculative, and attach its source.

Run the plan checks in [references/structure.md](references/structure.md). Do not start the page until they pass or carry a written reason.

### 3. Structure

Choose one guide type: topic or paper explanation, codebase guide, decision record, or a how-to kept apart from the explanation. Lay the content on the matching skeleton in [references/structure.md](references/structure.md).

### 4. Write

Follow [references/writing.md](references/writing.md). Put the point first, use one term per thing, keep conditions before instructions, and flag simplifications where they appear.

### 5. Make figures

For every claim a sentence cannot carry, load the **animated-visuals** skill by name and follow its workflow. If that skill is unavailable, stop and print:

```sh
npx skills@latest add juanbermudez/skills --skill animated-visuals -g
```

Make the figure title its claim. Name every labelled part in the prose. Add interaction only when the reader must change the input the claim depends on. Use [references/layout.md](references/layout.md) and [references/components.md](references/components.md) for the page around the figures.

### 6. Build

Run:

```sh
node <guide-skill>/scripts/build.mjs <guide-directory>
```

The build locates animated-visuals, then inlines its themes, runtime, theme controls, the guide components, page CSS, highlighting, and guide JavaScript.

### 7. Verify

Follow [references/verification.md](references/verification.md). Run `scripts/verify.mjs`, the term audit, copy lint, numbers check, and the reader test. Revise until a fresh reader can answer the predicted questions from the built file alone.

### 8. Deliver

Return the one HTML file, a link to it, and a list of anything not verified. Do not add a “made with” footer. Put an AI-generated note in the reference section.

## What a guide is not

A guide is not a lesson, a slide deck, or a dashboard. Do not use hooks, eyebrows, or quizzes that test definitions. Use short application checks only to expose real misconceptions.

## References

- [references/plan-file.md](references/plan-file.md) — plan template and the pre-HTML rule.
- [references/structure.md](references/structure.md) — guide types, section skeleton, structural rules, and plan checks.
- [references/writing.md](references/writing.md) — voice, sentence craft, captions, steps, and endings.
- [references/layout.md](references/layout.md) — page anatomy, measures, responsive behavior, type, rhythm, and surfaces.
- [references/components.md](references/components.md) — component purpose, markup, and CSS classes.
- [references/verification.md](references/verification.md) — commands, browser proof, audits, links, and reader testing.
- [references/reader-test.md](references/reader-test.md) — prompt for an independent reader.
- [references/sources.md](references/sources.md) — sources behind the guide rules.
- [references/theming.md](references/theming.md) — theme layer and bb integration.
