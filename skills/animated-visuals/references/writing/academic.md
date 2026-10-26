# Academic style (on request)

Precise, formal, and referenceable, as in a machine learning paper. Use only when the user asks for it or the host document is a paper (see `README.md`). Concision still applies: labels stay short; captions carry the detail.

## Voice
- Formal, impersonal, present tense for what the figure shows ("Latency decomposes into three components"), past tense for what was run ("Each condition was run five times").
- Precise over plain: name the quantity, the condition and the sample.
- No colloquialisms, no rhetorical questions, no second person.

## Vocabulary
- Use the field's established terms ("time to first token", "ablation", "baseline", "throughput") and define each symbol or abbreviation at first use in the caption.
- Codenames only when they are the method's published name; otherwise use the descriptive name.
- Consistent notation across figures and text: the same symbol for the same quantity ($\tau$ for a threshold everywhere).

## Titles
- Figures are numbered and referenced from the text: "Figure 3". The plate title states the result: "Independent actions execute concurrently".
- Panels are labeled (a), (b), (c) and each panel is referenced in the caption.

## Labels
- Axis labels name the quantity and the unit in brackets or parentheses: "Latency (s)", "Threshold $\tau$".
- Legend entries name conditions as in the text ("Sequential", "Concurrent", "Baseline [12]").
- Symbols are typeset consistently (italic for variables, upright for units).

## Captions and steps
- Caption opens with a bold one-sentence result, then: what is plotted, the conditions, the sample size, how uncertainty is shown, and what is simulated or illustrative.
- Typical length 2 to 5 sentences. Interaction hints go last, in one short sentence.
- Step captions name the stage of the method ("Step 2: dependency resolution").

## Numbers and units
- SI units; report n, the statistic and its uncertainty: "median 2.92 s (n = 5, IQR 2.85 to 3.44)".
- Significant figures consistent with measurement precision. Never report more precision than the instrument has.
- State whether values are measured, estimated or derived arithmetic.

## Tips
- Definitions with the formal term first: **Dependency edge** · "A precedence constraint: the target action starts only after the source action's completion receipt."

## Sources
- Cite with numbered references ([3]) or author-year, matching the host document; the reference list lives with the document, not inside the figure.
- Data provenance in the caption: dataset, run identifier or commit when relevant.

## Examples
| Practical | Academic |
|---|---|
| Independent actions run at the same time | Independent actions execute concurrently |
| Long task → note → reply | Sequential chain: task → write → speak |
| 2.3× longer | 2.28× longer than the concurrent schedule (sum of measured durations) |
| Hover a block to see what it is | Hover to inspect each component's definition. |

## Checklist
- [ ] Every symbol and abbreviation defined at first use.
- [ ] Units, n and uncertainty stated wherever a number is shown.
- [ ] Figure and panel numbering referenced in the text.
- [ ] Measured, estimated and illustrative values distinguished.
- [ ] Labels still within the copy budget.
