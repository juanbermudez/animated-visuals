# Writing

## Voice

Put the point first, then its consequence, then the reason. Write as a colleague who knows the subject and wants the reader to use it correctly.

- Keep each sentence at 25 words or fewer. Keep most under 20 words.
- Keep paragraphs to 1 to 3 sentences.
- Use second person, active voice, and present tense.
- Put a condition before its instruction: “When the build passes, publish the file.”
- Prefer everyday words. Keep an exact technical term when the reader will see or use it.
- Define a term once, after its figure shows the thing. Use that term consistently afterwards.
- Lead every paragraph with its point. Cut a sentence that adds no fact, consequence, or step.

## Lede

Use 2 or 3 sentences:

1. State what the subject does.
2. State why the result matters in the running example.
3. Add the mechanism only when the opening needs it.

Do not open with an agenda, a definition, or a rhetorical question.

## Headings and titles

- Make the page title the subject's name in 3 to 6 words.
- Make each section heading name its topic in sentence case.
- Put nothing above a heading. Do not use an eyebrow, kicker, overline, section number, or small label.
- Make each figure title its claim in at most 9 words.

## Banned patterns

Remove:

- jokes, wit, teasing, and admiration;
- coined phrases and unsupported metaphors;
- rhetorical questions;
- “not X but Y” turns;
- “here is the thing,” “the trick,” “the magic,” and “under the hood”;
- “simply,” “just,” “obviously,” “clearly,” and “easy” when they dismiss work;
- sweeping claims such as “revolutionary,” “powerful,” or “game-changing”;
- roadmap sentences such as “In this guide, we will…”;
- definitions used as quiz questions.

## Analogies

Use an analogy only when it reaches the real object within 2 sentences. Name where the analogy stops matching. Remove it when the real example is already clear.

## Numbers and units

- Give every number a unit or named count: `240 ms`, `3 jobs`, `0.60 probability`.
- Use the same rounding in prose, labels, tables, and readouts.
- Put the source next to the number or in its source line.
- Mark author-chosen numbers as illustrative.
- Show arithmetic for estimates.

## Simplifications

Flag a simplification where you make it. Say what you left out, why the shorter account is safe here, and where the full account lives.

## Captions, steps, and tips

Make a caption say what the figure shows, whether values are measured or illustrative, and how to interact. Keep it to 2 sentences.

Make step text say what changed in 1 sentence. Use a verb tied to the visible action.

Make a tip say what the part is, then why it matters here. Keep the title to 1 to 3 words and the body to about 25 words.

For figure text, read animated-visuals' `references/writing/practical.md` and follow it. Do not restate that file inside the guide.

## Ending

End in this order:

1. Answer the opening problem in a few sentences.
2. State one principle worth keeping.
3. Point to the next useful source or action.
4. Put the glossary, checked-against-source block, limits, and sources in the reference section.
5. Add an AI-generated note that names the sources, simplifications, and correction path.

## Before and after

| Before | After |
|---|---|
| In this guide, we will explore how queues work. | A queue holds work until a worker can take it. |
| But what happens when the worker crashes? | A crash before storage can return the job to the queue. |
| The elegant retry mechanism magically prevents loss. | The queue makes the job visible again after the lease ends. |
| Simply click Submit to initiate the process. | When the form is complete, select **Submit request**. |
| The ack is emitted by the consumer. | The worker sends an acknowledgement after it stores the result. |
| Latency improved by 40. | Median latency fell by 40 ms, from 180 ms to 140 ms. |
