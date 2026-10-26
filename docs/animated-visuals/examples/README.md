# Example guides

Each example is a self-contained visual guide to one paper or idea, built on the runtime and the site's own chrome,
written claims-first and checked against its source. The built pages live beside this file (`<slug>.html`) and are
listed on `docs/examples.html`; the sources live in `src/<slug>/`.

## Add one

1. Copy `src/_template/` to `src/<slug>/` (a short kebab-case slug) and fill `meta.json`: title, a one-sentence
   summary for the index, the source with its URL, and an `order` for the index.
2. Follow the skill's workflow in `SKILL.md`: claims first (`references/content-design.md`), one worked example, the
   interaction that answers each claim (`references/interaction.md`), the form (`references/choosing-form.md`), the
   writing style (`references/writing/practical.md`), then build and verify. The site's register is the default theme;
   never hard-code colors, use the `--fs-*` tokens.
3. Write `guide.src.html` (prose and plates; keep the placeholders) and `guide.js` (the figures). `page.css` is
   optional, for the guide's own furniture. The shared flow helper `flowFigure(id, spec)` from `_shared/flow.js` is
   available to every guide for stepped node-and-edge diagrams.
4. Build and verify:

   ```sh
   node docs/examples/build.mjs <slug>
   node docs/examples/verify.mjs <slug>
   ```

   The build inlines the themes, the runtime and the site chrome from `docs/`, so it must run after `docs/sync.mjs`
   when the themes or the runtime change. The check runs the page in Chrome: no console errors, figures registered,
   no overflow at 1440 and 390, two themes applied, reduced motion rendering; it writes the index card image.
5. Commit the source folder, the built page, the card image and the regenerated `docs/examples.html`.

## Rules

- Do not put a label above a heading. The heading stands alone.
- Nothing sits above a heading: no eyebrow, kicker, overline or numbered label ("02 · The method"). The heading
  stands alone and says what the section is about.
- The guide's title is the subject's name or a simplified version of it, 3 to 6 words. Section headings say what the
  section is about. Prose is practical, concise and direct: it explains the subject and never embellishes, jokes or
  teases (`references/writing/practical.md`).
- Every number in a guide comes from the source and says where (the figure, table or section). Anything simulated or
  illustrative says so in the plate's status chip and caption.
- A guide ends with a "Checked against the source" list: the numbers and where they come from, what is simulated,
  what was left out on purpose.
- No external requests at runtime: fonts are the only remote resource, as on the rest of the site.
- Nothing hand-edited in a built page: edit the source and rebuild.
