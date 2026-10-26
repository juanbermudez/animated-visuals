# Reader test

Give the reader only the built HTML file. Never give it the guide source folder, plan, notes, intended answers, or prior review.

Copy the built file alone into an empty folder. With bb, run:

```sh
mkdir -p /private/tmp/guide-reader-test
cp <guide-directory>/index.html /private/tmp/guide-reader-test/guide.html
bb thread spawn --environment /private/tmp/guide-reader-test
```

Paste the prompt below into that fresh thread. With native subagents, use the Agent tool and provide only the copied file path and this prompt.

```text
Read only the attached HTML guide. Do not use outside knowledge or browse the web.

Answer each reader question in 1 to 3 sentences. After each answer, name the guide section that supports it. If the guide does not answer a question, write “Not answered by the guide.” Do not infer missing facts.

Then report:
1. terms the guide uses before explaining them;
2. statements that appear to conflict;
3. numbers whose source or status is unclear;
4. instructions mixed into explanatory sections, excluding figure captions, step text, and interaction tips;
5. the single most likely misunderstanding a new reader would keep.

Reader questions:
<paste 5 to 10 questions from plan.md here>
```

Grade each answer against the plan's fact sheet. Revise the guide when the reader misses, invents, or cannot locate an answer. Rebuild, copy the new built file into a new empty folder, and repeat. Record the reader model or session, questions, result, and revisions in `plan.md`.
