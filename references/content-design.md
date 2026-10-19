# Content design: from a request to the right figure

A figure is an argument a stranger can follow. Before choosing a chart type, reduce the idea to its primitives, decide what a reader who knows nothing about the project needs to see, and set how much text the figure may carry. Wording rules live in `references/writing/` (practical by default).

## 1. Name the purpose

Most requests are one of these. Pick one per figure; if a request mixes two, it is two figures or one figure with steps.

| Purpose | The reader must see | Primitives | Default form |
|---|---|---|---|
| **Flow through a system** | what enters, where it goes, what comes back | parts, connections, the thing that moves, direction | flow diagram with moving packets (`diagrams.md`) |
| **Sequence or timeline** | what happens when, what overlaps, what waits | events, durations, "now" | lanes on one time axis; the surface scrubs |
| **Mechanism or process** | how one state becomes the next | state, rule, change | stepped diagram on one worked example |
| **Results or values** | how much, compared with what | quantities, units, a reference | dots or bars, a line for trends (`charts.md`) |
| **Dependence (X drives Y)** | what happens to Y when X moves | input, output, the curve between | explorable chart with a handle on X |
| **Relationships** | what connects to what, how strongly | entities, links, weights | node-link, matrix past ~50 nodes |
| **Activity over time** | what is busy, idle or waiting, and when | states, intervals | state strips or Gantt lanes |
| **Paths and choices** | which way something goes and why | positions, branches, the chosen route | graph or map with the taken path drawn, the others dimmed |
| **Comparison or counterfactual** | the same thing two ways, and the difference | two runs, one axis, the delta | both on one axis plus a computed bracket |
| **Distribution** | spread, clusters, outliers | points | strip, histogram, beeswarm |
| **Part of a whole** | shares that add up | parts, total | stacked bar or waffle |
| **Space, attention or a field** | where something concentrates or moves | positions, intensity, focus | particle field with a focus ring |

## 2. Reduce to primitives

Write the figure's claim in one sentence using only primitives: actors (who acts), objects (what moves or changes), events (what happens), states, quantities with units, and relations. No codenames, no internal file or function names.

- Request: "Show worker-file vs fan-out in the action ledger."
- Primitives: three requests; each made of actions (reply, note, task); some actions wait for others to finish.
- Claim: "Actions that do not depend on each other run at the same time; an action that needs another's result waits for it."

If you cannot write that sentence, read more before drawing.

## 3. Choose the granularity

- Show the level where the claim lives. One level up appears as dimmed context; one level down goes into tips.
- At most about 7 nodes, lanes or series in view. Group the rest ("3 other sources") or step through them.
- Every visible mark must be explainable in one short phrase. If a mark needs a paragraph, it is the wrong level of detail.
- Keep geometry fixed across steps and states; change emphasis, not layout.

## 4. The cold reader test

Hand the figure to someone who has never seen the project. Without the surrounding text they should answer:

1. What are these things? (every node, lane and series has a plain role name)
2. What moves or changes? (direction and time are obvious)
3. What is the point? (the title says it; the payoff state shows it)

Fixes that usually pass the test:
- **Name by role, not by codename.** "Long task, then note, then reply", not "worker-file". "Decide", not "Router v1.14". If the codename matters to the audience, show it once as a secondary label ("Decide · Jev") or inside the tip ("Internal name: worker-file").
- **Say whose action it is.** "You ask", "the assistant decides", "a background worker runs". A reader must know whether a box is a person, a request, or an internal process.
- **Spell out units and directions.** Seconds on the axis, arrows or packets for direction, "lower is better" when it is.
- **One worked example.** A concrete request ("add 17 × 23 and write it down") beats an abstract category.

## 5. Copy budget

Concise and consistent across a page. Defaults for the practical style; the academic style may lengthen captions, never labels.

| Element | Budget | Notes |
|---|---|---|
| Title | the claim, at most ~9 words | sentence case, no period |
| Status (head, right) | at most 4 words | source or scope: "October 18 run", "illustrative" |
| Node or lane label | 1 to 3 words | role names; nouns or verb phrases ("Reply", "Write note") |
| Sublabel | at most 4 words | what it holds or does; drop it if the label is enough |
| Mark label in the drawing | at most 3 words or a number with its unit | |
| Axis label | the unit and, if needed, the direction ("seconds →") | |
| Step caption | one sentence, at most ~22 words | says what changed in this step |
| Figure caption | at most 2 sentences, ~35 words | what is shown, what is simulated or measured, how to interact |
| Readout label | at most 6 words | |
| Tip | title 1 to 3 words + body at most ~25 words | what it is, then why it matters here |
| Buttons | a verb or an icon with an `aria-label` | |

If the copy does not fit the budget, the figure is carrying an explanation that belongs in the prose or in a tip.

## 6. Plan the explanations (tips)

Decide which parts get a tip before writing any: every node or lane whose role is not obvious from its label, every term the audience may not know, and every mark whose number needs context. Tip formula: **what it is**, then **why it matters here**. Never put essential facts only in a tip; tips explain, the figure states.

## 7. Simulations and what-ifs

When a figure compares options that don't exist yet (a learning rule, a different bar), simulate them honestly:
- Give every option the same starting conditions and the same input stream; a comparison where one option starts at the answer is not a comparison.
- Keep the measured reference visible (a dotted line for today's value) and say "a simulation, not data" in the status.
- Draw the simulated inputs to resemble recorded ones and say so in the caption.
- Show the outcome a reader cares about as computed counts (misses, false alarms) that update with the scrub.

## 8. Checklist before building

- [ ] Purpose named; claim written with primitives only.
- [ ] Every label is a role name a stranger understands; codenames only as secondary labels or in tips.
- [ ] Granularity: ≤ ~7 things in view; the rest grouped, stepped or in tips.
- [ ] Copy within budget; one voice across the page (`references/writing/`).
- [ ] Tips planned for every non-obvious part.
- [ ] The interaction answers a question from §1 (`interaction.md`).
