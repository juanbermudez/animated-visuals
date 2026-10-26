# Reader test prompt

Give this prompt to a fresh agent with only the built HTML file attached or available at the named path.

```text
Read only the attached HTML guide. Do not use outside knowledge or browse the web.

Answer each reader question in 1 to 3 sentences. After each answer, name the guide section that supports it. If the guide does not answer a question, write “Not answered by the guide.” Do not infer missing facts.

Then report:
1. terms the guide uses before explaining them;
2. statements that appear to conflict;
3. numbers whose source or status is unclear;
4. instructions mixed into explanatory sections;
5. the single most likely misunderstanding a new reader would keep.

Reader questions:
<paste 5 to 10 questions from plan.md here>
```

Grade against the plan's fact sheet. A correct answer uses only the guide. A failure is a reason to revise the guide, not to coach the reader.
