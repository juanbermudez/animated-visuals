# The plan file

Write `plan.md` before HTML. It is the factual and structural contract for the guide. Use the empty scaffold from `scripts/new.mjs`. Read the filled queue example at `assets/template/example/plan.md` when you need a model.

## Required blocks

Keep these blocks in this order:

1. Frontmatter: `title`, `slug`, `type`, `length`, `audience`, `outcome`, and primary `source`.
2. Scope: audience, outcome, running example, exclusions, and length.
3. Thesis: one sentence that the page will prove.
4. Terms: term, the figure that shows it first, and approved aliases.
5. Running example: what remains constant across the page.
6. Sections: one idea, example part, figure claim, and source per section.
7. Fact sheet: claim or number, evidence label, source, use, and checked state.
8. Limits: where the account stops.
9. Predicted reader questions: 5 to 10 questions the built file must answer.
10. Copy-lint exceptions: documented lint exceptions and dimensionless symbols.

The plan checks live in [structure.md](structure.md). Run them before HTML.

## Shared example values

Put computed values in `<guide-directory>/data.js`:

```js
export const data = Object.freeze({
  settings: { workers: 1 },
  checkedNumbers: ["1 worker"],
});
```

The build removes the `export` keyword and inlines this file before `guide.js`. Figures use `data.settings`. A Node check imports the same module. `numbers-check.mjs` reads `data.checkedNumbers` and requires those tokens in the checked-against-source block. The fact sheet must take its example values from this module. Do not copy calculations into `guide.js` or a checker.

## Copy-lint exceptions

Use one line per exception: the exact flagged text or a `/regular expression/`, then an em dash and the reason. The verifier fails only unexplained flags.

```markdown
## Copy-lint exceptions

dimensionless: λ, β, α, x, y, w
- `unit: 0.65` — This probability is dimensionless and is named in the sentence.
- `/sentence:.*Eq\. 2/` — The compact equation citation is clearer as one sentence.
```

`dimensionless:` declares symbols whose nearby numeric values do not take units. Keep it on its own line. Do not use an exception to hide a missing source, inconsistent rounding, or unclear prose.

Labels are `measured`, `reported`, `estimate`, or `speculative`. A measured claim comes from an observation. A reported claim comes from a source. An estimate shows its arithmetic or names an author-defined illustration. A speculative claim is visibly uncertain.

Keep the plan current. When a claim changes, update the plan before the prose.
