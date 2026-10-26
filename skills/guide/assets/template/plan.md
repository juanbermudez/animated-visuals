---
title: Safe queue handoffs
slug: queue-handoffs
type: topic              # topic | paper | codebase | decision | how-to
length: short            # short | standard | long
audience: Engineers who know what a job queue is.
outcome: Explain why an acknowledgement must follow durable work.
source: https://example.com/queue-spec
---

## Scope

- Audience: Engineers who have used a queue but have not implemented one.
- Afterwards: Trace a job from receipt to durable completion and place the acknowledgement.
- Running example: One image resize job, received at 09:00 UTC and stored in 240 ms.
- Out of scope: Queue selection, capacity planning, and multi-region replication.
- Reading length: Short, about 1,000 words.

## Thesis

A worker acknowledges a job only after the result is durable, because an earlier acknowledgement can lose work.

## Terms

| Term | Introduced after figure | Approved aliases |
|---|---|---|
| acknowledgement | job-flow | ack |
| durable result | storage-step | stored result |

## Running example

The same image resize job appears in the problem, worked example, mechanism, limits, and closing answer. It is small enough to trace without hiding a second process.

## Sections

| Section | One idea | Part of the running example | Figure claim | Required source |
|---|---|---|---|---|
| The problem | Early acknowledgement can lose a job. | The worker stops after 120 ms. | The queue forgets work acknowledged too soon | Queue specification |
| Worked example | Durable storage changes the safe point. | The result is stored after 240 ms. | Storage moves the safe acknowledgement point | Queue specification |

## Fact sheet

| Claim or number | Label | Source | Where used | Checked |
|---|---|---|---|---|
| The example stores its result in 240 ms. | estimate | Author-defined running example | Worked example | yes |
| Acknowledged jobs are removed from the visible queue. | reported | Queue specification, delivery section | The problem | yes |
| The failure at 120 ms loses this illustrative job. | estimate | Derived from the example timeline | Worked example | yes |

Labels are `measured`, `reported`, `estimate`, or `speculative`. A measured claim comes from an observation. A reported claim comes from a source. An estimate shows its arithmetic. An estimate may be chosen for a clearly illustrative example and names that basis as its source. A speculative claim is visibly uncertain.

## Limits

- The example assumes one worker and one durable store.
- The guide does not compare delivery guarantees across queue products.

## Predicted reader questions

1. When is it safe to acknowledge the job?
2. What fails if acknowledgement happens first?
3. Which values are illustrative?
4. Does this guide choose a queue product?
5. What changes when storage fails?

## Plan checks

- [ ] One idea per section.
- [ ] One example runs through the guide.
- [ ] Each term appears only after its figure.
- [ ] Nothing sits above a heading.
- [ ] The title is the subject's name.
- [ ] Every number has a source or is marked illustrative.
- [ ] Reference material is at the end.
- [ ] How-to steps are kept apart from explanation.
