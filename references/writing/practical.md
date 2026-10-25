# Practical style (default)

The voice of a person talking straight to you about something they built and care about. Plain, concrete, a little funny, never stiff. No profanity. Labels stay short; the voice shows most in titles, intros, captions and tips.

## Voice
- **Open with a stance, in one short sentence.** "I know the model is going to devour the harness." Then the turn: concede the other side, then push back. "Sure, with enough compute you can brute-force it. But is that the most efficient way?"
- **Explain through a moment the reader has lived.** Start from what you do and what you see, then what happens inside. "I point at a paragraph and say 'make this shorter'. the agent has to work out which paragraph I mean before it can do anything."
- **Say what it should feel like.** Name the experience in human terms: "like working with someone at the same whiteboard", "magical", "frustrating". Then show the mechanism that gets there.
- **Unpack the small thing.** "That sounds small, but there is a lot inside it." Then list what is inside, in plain words.
- **First person when it is the author's own work** ("I asked", "I measured"); "you" for the reader. Contractions are fine.
- **Short sentences, with the occasional long one that carries a list.** One idea per sentence.
- **Light humor, used sparingly.** An honest aside, a vivid exaggeration ("hearing 'let me check' a hundred times before lunch"), a coined phrase. Never at the expense of accuracy, never profanity, never hype.
- **Honest about limits.** "This is one run on a busy laptop." "I am not a researcher; here is what I measured."

## Vocabulary
- Everyday words over system words. Describe what happens instead of naming the mechanism:
  - "something you asked it to watch for" or "a goal", not "standing request" or "objective"
  - "a set of questions it answers" or "a decision", not "packet"
  - "proof it finished", not "receipt" (say "receipt" once, explained, if the reader will see it again)
  - "what 'this' points at", not "referent"
  - "evidence builds up", not "CUSUM" or "accumulator"
  - "comes into focus", "gets attention", not "candidate", "fires", "admitted"
- Role names over codenames: "Decide", "Long task", "Reply". A codename appears once, as a secondary label or in a tip.
- One term per thing across the page. If the legend says "Reply", the caption does not say "speech output".

## Titles
- The claim, in sentence case, no period, at most ~9 words, said the way a person would say it: "The agent only acts on what you meant", "Polling on a timer is expensive or blind".
- Not the variable list ("Latency vs. phase"), not a question.

## Labels
- 1 to 3 words. Nouns for things ("Note", "Screen look"), verbs for actions ("Write note", "Reply").
- Sublabels at most 4 words, only when they add something the label cannot ("Codex, 25 s").
- No abbreviations a stranger would not know. "s" for seconds is fine; "TTFA" is not.

## Captions and steps
- Figure caption: what is shown, whether it is measured or illustrative, and how to play with it. At most two sentences, in the voice: "One run on a busy Mac. Drag across the lanes to see what was happening at any moment."
- Step caption: what changed in this step, one sentence, as a little story: "You stop talking. The agent answers one set of questions about what you meant."
- Interaction hints use the input's verb: "drag", "click", "hover", "tap".

## Mechanisms as stories
Explain a mechanism as what happens to one concrete thing, in order:
> If you ask the agent to watch for something, it turns that into a goal. Everything coming in gets a quick score against the goal. Anything close enough comes into focus and starts building evidence. Enough evidence, and it gets the agent's attention: it takes a proper look and decides what to do.

## Numbers and units
- Always a unit, with a space: "15.7 s", "0.60", "1,800 an hour".
- Round to what the point needs (usually one decimal for seconds). The same rounding in labels, readouts and prose.
- Comparisons as a plain ratio or difference: "2.3× longer", "1.2 s sooner".

## Tips
- Title 1 to 3 words, body at most ~25 words: what it is, then why it matters here, in the voice.
- Example: **Note** · "A short file the agent writes so the result sticks around. The reply waits for it."

## Sources
- One line under the figure: where the numbers came from, in plain words plus the file or paper.

## Examples
| Before | After |
|---|---|
| worker-file | File, then note, then say it |
| A standing request is checked against the camera | Ask the agent to watch for something and it turns that into a goal |
| The router answers one packet of typed questions | The agent answers one set of questions about what you meant |
| The referent is taken above 0.55 | If it's sure enough which thing you meant (above 0.55), it acts; if not, it asks |
| Receipt-moment packet | A quick follow-up decision once something finishes |

## Checklist
- [ ] The intro opens with a stance or a lived moment, not a definition.
- [ ] A stranger understands every label without the prose.
- [ ] No system word stands alone (goal, focus, evidence, attention, not objective, candidate, CUSUM, packet).
- [ ] Copy within the budget in `content-design.md` §5; no profanity.
- [ ] Units everywhere; rounding consistent with the prose.
