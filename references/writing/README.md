# Writing styles

Every figure's words (title, status, labels, captions, step text, tips, readouts, buttons) follow one writing style. Styles are modular: each is one file with the same sections, so a new one can be added without touching the rest of the skill.

| Style | File | Use when |
|---|---|---|
| **Practical** (default) | `practical.md` | always, unless another style is asked for. Juan's voice: a stance first, explained through a lived moment, plain words, light humor, no profanity |
| **Academic** | `academic.md` | the user asks for academic, paper or publication style; the host document is a paper with numbered figures and references; or the user mentions reviewers, arXiv, a venue or "proper nomenclature" |

Rules:
- One style per page or document. Never mix registers between figures.
- The copy budget in `content-design.md` §5 applies to every style; a style may lengthen captions, not labels.
- If the request is ambiguous, use practical and say so in one line.
- A host site's own voice guide wins over a style file where they conflict (for zef-builder-site, also apply the `write-post` rules: no em dashes, evidence-sized claims).

## Adding a style

1. Copy `practical.md` to `<name>.md` and keep its section headings: Voice, Vocabulary, Titles, Labels, Captions and steps, Numbers and units, Tips, Sources, Examples, Checklist.
2. Fill each section with concrete rules and at least three before/after examples.
3. Add a row to the table above with its trigger ("use when").
