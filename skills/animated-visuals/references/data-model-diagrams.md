# ER and data-model diagrams

Use an ER diagram when the claim depends on entities, fields, keys and relationship cardinality. If the question is only “which service calls which,” use architecture instead.

## Worked-example standard

Show one small model a reader can follow end to end. The gallery uses customers, orders, order items and products. It traces one order query so the relationships do work instead of sitting as decoration.

## Structure

- Keep the model to 4–8 entities. Above that, group by domain and make an overview plus detail figures.
- Give each entity a header and a short field list. Mark primary and foreign keys in text, not color alone.
- Put cardinality at both ends of every relationship. Use one notation throughout the figure.
- Prefer straight or orthogonal relationships and cluster related entities. A dense web of foreign-key arrows is a signal to split the model.
- Fill entity boxes with `var(--fs-node, var(--fs-surface-2))` in SVG or CSS, or `C.node ?? C.surface2` on canvas, so they remain distinct from the plate.

## Interaction

- Selecting an entity may trace the relationships needed by one representative query.
- Hover or focus may explain a relationship, but the cardinality stays printed in the still frame.
- Keep entity positions stable. A trace changes emphasis, not layout.
- Anything that travels uses eased progress on the figure's one clock. Reduced motion shows the completed trace.

## Labels and density

Adapted from diagram-design: keep the focal model small, put labels next to the marks they explain, and reserve the accent for one root entity or active query path. Do not use a legend for field syntax when a two-word inline key can explain it.

## Watch-outs

- Natural entity height is better than padding every box to the tallest one.
- Do not animate schema changes unless change over time is the claim.
- Do not allow readers to drag entities into arbitrary layouts; that changes presentation, not the data model.
