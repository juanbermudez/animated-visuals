# Structure

## Pick the guide type

Diátaxis separates tutorials, how-to guides, explanations, and reference. A topic or paper guide is mainly explanation: it helps the reader understand causes, relationships, and limits. A codebase guide explains one user action through the system. A decision record explains the choice, alternatives, evidence, and consequences. A how-to helps the reader complete a task and stays in its own section so instructions do not interrupt the explanation. Put glossary entries, source checks, and detailed facts in the reference section at the end.

| Type | Use it when | Main spine | Extra section |
|---|---|---|---|
| Topic or paper explanation | The reader needs a mental model, mechanism, evidence, and limits. | Problem → worked example → mechanism → general form → limits | Results for a paper |
| Codebase guide | The reader needs to follow one real user action through code. | User action → components → data flow → failure path → limits | Run it, kept apart |
| Decision record | The reader needs to understand why one option was chosen. | Constraint → options → evidence → decision → consequences | Rejected alternatives |
| How-to | The reader already understands the subject and needs steps. | Conditions → ordered steps → verification → recovery | Keep it separate from explanatory sections |

## Section skeleton

| # | Section | Must contain | When optional |
|---|---|---|---|
| 1 | Title and opening | Subject name in 3 to 6 words; 2 or 3 plain sentences on what it is and why it matters; a hero figure showing the object or answer; one line each for audience, prerequisites, and excluded scope | Never |
| 2 | Prerequisites | One short part per missing foundation; each leaves a picture used later; a skip link | When the audience already has them |
| 3 | The problem | A concrete situation where the subject matters; for a codebase, one user action | Never |
| 4 | Worked example | One small case with real or clearly illustrative numbers; a stepped figure; the same case used later | Never |
| 5 | How it works | One section per idea in dependency order; prose; one figure whose title is its claim; the term named after the figure | Never |
| 6 | The general form | Formula, code, or rule assembled from pieces already shown, followed by one plain sentence; codebases pair code with plain English | When no general form exists |
| 7 | Results | Numbers with exact sources; measured and illustrative values separated | Unless the guide explains a paper or measured result |
| 8 | Limits | Where the simple account breaks; what remains unknown or contested | Never |
| 9 | Check yourself | 3 to 5 application questions; wrong options are real misconceptions; answers include reasons | One per major section in a long guide |
| 10 | What to keep | Answer to the opening problem; one transferable principle; where to go next | Never |
| 11 | Reference | Glossary in teaching order; checked-against-source block; sources; AI-generated note | Never |
| 12 | Run it | Setup and commands | Codebases only; keep apart |

## Ten structural rules

1. The first screen holds the answer and the object, never an agenda. (visual-explainer "First viewport = the answer"; teach-me anti-pattern 3)
2. Concrete before abstract: example first, definition last. (3Blue1Brown; IES rec. 4)
3. One worked example runs from the first section to the last. (teach-me P4; animated-visuals content-design §4; IES rec. 2)
4. Each section teaches one idea and adds one thing to the last. (teach-me P8; codebase-to-course "exactly one idea")
5. A term is named only after its figure has shown it, and never two new terms at once. The audit permits the term in its own figure title, caption, step text, and tips, plus the Source line and paper title. It reads headings only to catch an introduction before that figure. (teach-me method §5)
6. Every figure proves one claim, stated in its title; cut figures a sentence would replace. (animated-visuals; visual-explainer; diagram-design "deletion")
7. Words sit with their pictures: labels on the part, prose linked to the figure. (IES rec. 3; Mayer contiguity via teach-me learning-science §3)
8. Interaction only where the reader needs to change the input the claim depends on, always with "try this, notice that". (Nicky Case; teach-me V8; animated-visuals interaction ladder)
9. Self-checks test application and reasons, with real misconceptions as wrong answers. (IES rec. 5b and 7; codebase-to-course quiz bans)
10. Explanation, instruction and reference stay apart; reference goes at the end. (Diátaxis)

## Plan checks

Tick these before writing HTML:

1. Each section carries one idea.
2. The same example runs through the page.
3. Terms appear one at a time, after the figure that shows them.
4. Nothing sits above a heading.
5. The page title is the subject's name in 3 to 6 words.
6. Every number has a source or an explicit illustrative label.
7. Glossary, source checks, and detailed reference material sit at the end.
8. How-to instructions stay apart from the explanation.

## Chunking

- Keep paragraphs to 1 to 3 sentences.
- Give one figure to one idea.
- At 1,440 CSS pixels wide, one section should fit one screen of prose plus its figure.
- Split a section when it introduces a second mechanism, second example, or second claim.
- Keep the figure near the paragraph that names its parts.
