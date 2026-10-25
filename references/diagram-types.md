# Diagram types, animated and interactive

The catalog follows Cathryn Lavery's [diagram-design](https://github.com/cathrynlavery/diagram-design) (MIT): 27 visual types and 7 semantic patterns. That skill makes excellent static, branded diagrams; use it when nothing needs to move. This file adds the layer we care about: what should move, what the reader should be able to do, and what goes wrong when you add both.

## Contents
1. Rules that apply to every type
2. Structure: what exists and how it connects
3. Flow and process: what happens, in order
4. Time
5. Hierarchy
6. Position and comparison
7. Data charts
8. Semantic patterns
9. Presentation primitives
10. Picking the type
11. Coverage against diagram-design

---

## 1. Rules that apply to every type

- **The still frame tells the whole story.** Pause on any frame, print it, or turn motion off: the claim, the labels and the outcome are all there. Motion only adds direction, order and change. (Theirs is static by default for the same reason.)
- **One clock.** Everything that moves is a function of the figure's time `t`. Packets, highlights, playheads and counters read `t`; nothing has its own timer. That is what makes scrubbing, stepping, `seek()` and reduced motion work for free (`motion.md`).
- **Move only what the claim is about.** Packets on the path the step talks about; everything else holds still and dims to 0.28 (nodes) or 0.18 (edges), never disappears.
- **Steps for mechanisms, a timeline for durations, handles for what-ifs.** Pick the interaction from the question the reader has (`choosing-form.md`, Interaction). Do not add all three.
- **Every part a stranger might not know gets a tip** with a delay (`interaction.md`, Tips), and the prose names every part the figure labels.
- **Focus with the accent, 1 to 2 things.** The rest is ink and gray.
- **Layout never shifts.** Reserve space for what appears later; captions stack; readouts reserve their widest value (`interaction.md`, Stable layout).
- **Frames.** Every plate sits in the 4px frame band; expanding keeps its proportions and fits 84% of the viewport (`interaction.md`, Expand).

## 2. Structure: what exists and how it connects

| Type | Use it when | What moves | What the reader can do | Watch out |
|---|---|---|---|---|
| **Architecture** | Components, tiers, trust boundaries, integrations | 2 to 4 packets per edge on the path the current step is about; one request traced end to end | Step through a request; hover a node to light every edge it touches; click a boundary to dim everything outside it | Packets on every edge at once reads as noise; animate one request, not the whole system |
| **ER / data model** | Entities, fields, keys and cardinality are the point | A query trace crosses only the relationships used by one worked example | Pick an entity to trace its related records; hover a relationship for its cardinality | Do not turn every foreign key into a crossing arrow; cluster the model or split it |
| **High-level stack** | An end-to-end stack: ingest, store, query, show | A single record climbing the stack, with the time each layer added | Scrub the record's journey; toggle a layer off to see what breaks | Don't animate the cluster frame; it is context |
| **IT current-state** | The "before" of a modernization, with its friction | Manual hand-offs as slow, stalled packets (a file waiting in a folder); the friction points pulse once when the step names them | A before/after toggle that morphs the same nodes into the target layout | The after view must reuse node identity; morph, don't swap |
| **Layer stack** | Abstractions stacked on each other | A call descending the layers and the response climbing back, with time per layer | Click a layer to expand its internals in place; drag a "where this runs" marker | Expanding a layer must push the others smoothly, not reflow in a jump |
| **Nested** | Containment: this lives inside that | Zoom between levels (one level per step), the parent's label staying pinned | Click a region to zoom in; Escape or a breadcrumb to zoom out | Zooming past two levels loses the reader; split into plates |
| **Medallion** | Data tiers of the same dataset by quality (raw, clean, aggregated) | Rows thinning and changing shape as they move tier to tier; counts that tick | Pick a row and follow it through every tier | Show counts with units at every tier, still and moving |

## 3. Flow and process: what happens, in order

| Type | Use it when | What moves | What the reader can do | Watch out |
|---|---|---|---|---|
| **Flowchart** | Decision logic with branches and outcomes | A token walks the path; at a decision it pauses, the condition lights, the taken branch draws on | Toggle the inputs that drive each decision and watch the token re-route | Untaken branches stay visible, dimmed; they are half the explanation |
| **Process** | A multi-actor workflow in steps | The active step fills; a hand-off token crosses lanes | Step forward and back; hover a step for its inputs and outputs | One change per step; two changes means two steps |
| **Swimlane** | Cross-team flow with ownership | The token crossing a lane boundary is the moment to slow down (it is where work waits) | Scrub; hover a lane to see only its work | Waiting time is the usual point: show it as hatched time, not empty space |
| **Data flow** | Role-scoped pipeline steps | Packets by count (load) or speed (rate), never both; a stalled stage visibly backs up | Drag the input rate and watch the queue form | Say in the caption that speed is illustrative unless measured |
| **DP integration** | Sources into a platform hub and out to consumers | Packets in on each source protocol, out on each consumer protocol, one source at a time | Click a source or consumer to isolate its route and protocol | The hub boundary is the claim; keep it the strongest shape |
| **Loop / flywheel** | A cycle that feeds itself, with a shared hub that accumulates | The loop turning, plus the dashed write-backs into the hub filling it | Drag a station's strength and watch the loop speed up or stall | A loop that never changes speed says nothing; tie speed to a variable |
| **Sequence** | Messages between participants over time | Messages draw on in order along a playhead; the active lifeline thickens | Scrub the playhead; hover a message for its payload | Time runs down; parallel messages share a row |
| **State machine** | States and the transitions between them | A token travels the taken transition; the current state goes solid | Fire events from buttons or keys and watch the state change; a history trail of the last few states | Show the guard condition on each transition, not only on hover |

## 4. Time

| Type | Use it when | What moves | What the reader can do | Watch out |
|---|---|---|---|---|
| **Timeline** | Events on an axis | A playhead; events light as it passes; a slowed clock (marked on the axis) where the moment that matters is short | Drag anywhere on the surface to scrub, with a target-based glide; hover shows the time under the pointer | Never let the time readout change width; reserve it |
| **Gantt** | Tasks and phases with durations and dependencies | Bars fill as the playhead passes; the critical path in accent | Drag a task's duration and watch dependents shift; toggle "in order" vs "in parallel" | Two kinds of time (working vs waiting) as solid vs hatched |

## 5. Hierarchy

| Type | Use it when | What moves | What the reader can do | Watch out |
|---|---|---|---|---|
| **Tree** | Parent to children | Branches grow from the root on entry, once | Collapse and expand subtrees with the layout easing to its new shape | Keep node positions stable when siblings collapse |
| **Org chart** | Ownership and routing | A request routing up and across to whoever owns it | Click a person or team to see what they own and who they escalate to | Names are data: use roles in public figures |
| **Pyramid / funnel** | Ranked importance, or drop-off between stages | The funnel drains: counts flow down and the loss at each stage is shown as what leaves | Drag a stage's conversion rate and watch the bottom change | Width must be proportional to the number, or say it isn't |

## 6. Position and comparison

| Type | Use it when | What moves | What the reader can do | Watch out |
|---|---|---|---|---|
| **Quadrant** | Two-axis positioning (impact × effort) | Items glide to their positions when the weighting changes | Drag an item to re-score it; drag the axis split | One word at each axis end; no midpoint labels |
| **Consultant 2×2** | Named scenarios in a matrix | The current scenario cell lights; a marker moves as assumptions change | Two sliders (one per axis) moving a "we are here" marker | The cells' names carry the argument; keep them short |
| **Venn** | Set overlap | Members drop into regions when sets are toggled | Toggle a set; hover a region to list its members and the count | Area-proportional only if you say so |
| **Radar / spider** | Multi-axis comparison of a few things | The shape morphs between subjects | Pick subjects to compare; drag a vertex to ask "what if" | Radar hides magnitude; label values at the vertices |
| **DP security matrix** | Who can do what, per role and component | Nothing moves by default; selecting a role sweeps its column | Pick a role or component to highlight its row or column; filter by permission | A matrix is a lookup; animation would slow it down |

## 7. Data charts

For charts, `charts.md` owns the details. In short:

| Type | Use it when | What moves | What the reader can do | Watch out |
|---|---|---|---|---|
| **Bar** | Comparing categories | Bars grow once on entry; reorder smoothly when the sort or a filter changes | Drag a threshold line; toggle the series | Bars start at zero |
| **Line** | A trend over time | A playhead reveals the line; one series emphasized | Scrub; hover for values; drag a parameter that reshapes a modelled line | Direct end labels, no legend if possible |
| **Scatter** | Distribution and correlation | Points glide when the encoding changes; the fit line updates live | Brush to select; drag an outlier to see the fit move | Write the slope on the plot |

## 8. Semantic patterns

When behavior, state or risk is the point, start from the pattern, then use its nearest type as the layout.

| Pattern | Nearest type | What moves | What the reader can do |
|---|---|---|---|
| **Fan-in queue / bottleneck** | Data flow | Arrivals queue in visible slots; served items leave at the service rate; overflow is deferred or rejected | Drag the arrival rate and the capacity; watch the wait time readout |
| **Stage framework with semantic slots** | Process | The same slots fill stage by stage | Step through stages; hover a slot kind to light it in every stage |
| **Unstructured input → structured artifact** | Data flow | Words from the source utterance fly into the fields they fill; unknown fields stay visibly empty | Hover a field to see the words it came from |
| **Paired policy-evaluation traces** | Flowchart | Two tokens run the same rules side by side; the first rule where they differ stops and lights | Edit one input and watch where the traces diverge |
| **Secure paved road** | Architecture | An allowed request runs the road; a blocked one stops at the boundary with the rule that stopped it | Toggle a request's properties to see which boundary stops it |
| **Governance / control catalog** | Layer stack | A change passes each enforcement surface in order; each control checks it | Click a control to see where it applies |
| **Compensating security layers** | Layer stack | A threat passes layer by layer and the residual risk narrows (or doesn't) | Turn a layer off and watch the residual risk grow |

Use one pattern per figure. If two patterns both need full treatment, make an overview plate and a detail plate.

## 9. Presentation primitives

These are supporting devices, not substitutes for a clear diagram type. Their detailed rules are in `diagram-primitives.md`.

| Type | Use it when | What moves | What the reader can do | Watch out |
|---|---|---|---|---|
| **Attached callout** | One detail needs a short editorial explanation | The anchor follows its target; the dashed leader and label ease to the new position | Move the worked example and confirm the note stays attached; focus the anchor for the same text | Keep it out of the active path and use at most two |
| **Icon specimen** | Shape recognition is faster than another word inside a technical diagram | Selection focus moves between specimens; the icons stay still | Move through the set by keyboard or pointer and read the plain name and role | Icons support labels; they do not replace unfamiliar terms |
| **Sketch treatment** | A working-note or essay register is part of the meaning | A fixed, seeded wobble settles with the figure; text never deforms | Toggle the treatment on the same geometry | Never use fresh randomness per frame or distort text |
| **Terminal / log** | Ordered command output or an append-only record is the subject | Lines append on the figure clock and the viewport follows the newest entry | Play, pause, scrub and step between named log moments | The settled frame must keep the decisive line visible; do not loop a semantic log |

## 10. Picking the type

1. Write the claim in one sentence (`content-design.md`).
2. If behavior, state or risk is load-bearing, pick the semantic pattern first; otherwise pick the type from the tables above.
3. Decide the interaction from the reader's question: steps (how does it work?), timeline (when does what happen?), handles (what if?).
4. Sketch the still frame first. If it doesn't stand on its own, the motion won't save it.
5. If nothing needs to move or be touched, use diagram-design and ship a static diagram.

## 11. Coverage against diagram-design

This comparison uses the canonical light examples and reference rules in Cathryn Lavery's diagram-design skill. “More” means the gallery adds a useful interactive or quantitative dimension, not that it replaces the static reference. The worked scenarios and exact counts are recorded in the coverage worker report.

| Area | Ours | Coverage | Remaining action |
|---|---|---|---|
| Architecture, flowchart, sequence, state, swimlane, tree, Venn, bar and line | Live worked examples with steps, scrubbing, parameters or direct inspection | More | None |
| High-level, medallion, process, data flow and timeline | Existing examples plus a second scenario where the canonical reference exercises a different grammar | Same or more | Keep both scenarios |
| IT current-state | A narrower four-node system, but with a direct today/target comparison and visible re-entry work | Same | None |
| ER / data model | Query trace across an order model | Same, with interaction | New type added |
| Layer stack, nested and loop | The same structural ground with one-clock motion and tips | More | None |
| DP integration | Source and consumer routes are present, but cross-cutting identity and logging are absent | Less | Add cross-cutting services to the existing figure |
| DP security matrix | A role-by-component permissions lookup with filtering | Same | None |
| Gantt, org chart and scatter | Core grammar is present; one reference feature is still absent | Less | Add a today line, subtree collapse and brushed selection to the existing figures |
| Pyramid / funnel, quadrant and radar | The figures worker owns the current revisions | Pending this round | Verify after that branch lands |
| Consultant 2x2 | Named scenarios and a moving current-state marker | More | None |
| Seven semantic patterns | Fan-in already live; six pattern-specific worked examples added | Same or more | None |
| Attached callouts, icons, sketch treatment and terminal/log | Live primitive specimens | Same, with interaction | New primitives added |
| Animation | One clock, still-frame meaning, keyboard, reduced motion and programmatic control | More | None |
| Import, export and brand onboarding | No gallery equivalent | Less, outside figure scope | Documented request; an interactive wizard is useful for onboarding, not for export |
