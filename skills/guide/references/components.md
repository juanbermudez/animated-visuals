# Components

Use these components in this order. Their styles live in `assets/components.css` and use only `--fs-*` theme tokens. The guide type rules exclude every descendant of `.fs-plate`; plate titles, captions, step text, and tips keep Animated Visuals spacing and type.

## Plate

Use a plate for one visual claim. Load animated-visuals and follow its plate markup, interaction, motion, accessibility, and verification rules. Do not recreate the plate here. Set `autoplay: false` on a figure with steps but no finite `duration`; a timeless figure must wait for reader input.

```html
<figure class="fs-plate wide" aria-labelledby="flow-title">
  <header class="fs-head"><h3 class="fs-title" id="flow-title">Storage moves the safe acknowledgement point</h3></header>
  <div class="fs-stage"><svg id="job-flow" role="img" aria-label="The job reaches storage before the acknowledgement returns"></svg></div>
  <p class="fs-caption">Illustrative timing. Step through the job and notice when the acknowledgement becomes safe.</p>
</figure>
```

## Shared figure code

Put guide-specific helpers used by several figures in `<guide-directory>/figures.shared.js`. The build places it after Animated Visuals `assets/flow.js` and before `guide.js`. Do not create a guide-local `flow.js`; that name belongs to Animated Visuals and is always loaded from the dependency.

Put shared computed values in `data.js` as described in [plan-file.md](plan-file.md). Keep drawing helpers in `figures.shared.js` and factual values in `data.js`.

## Callout and note

Use a callout for a consequence and a note for supporting context. The accent sits on a flat left edge.

```html
<aside class="guide-callout"><strong>Failure boundary</strong><p>A crash before storage returns the job to the queue.</p></aside>
<aside class="guide-note"><p>This example uses one worker and one store.</p></aside>
```

## Steps

Use steps only when order changes the result.

```html
<ol class="guide-steps">
  <li><strong>Receive the job.</strong><span>The worker starts a lease.</span></li>
  <li><strong>Store the result.</strong><span>The output becomes durable.</span></li>
</ol>
```

## Stats with sources

Show a small set of quantities. Put a source under each value.

```html
<div class="guide-stats">
  <div class="guide-stat"><strong>240 ms</strong><span>Illustrative storage time</span><small>Running example</small></div>
</div>
```

## Code block

Use `language-js`, `language-ts`, `language-python`, `language-shell`, `language-json`, `language-html`, or `language-css`. The build inlines animated-visuals' site highlighter and wraps the block with the `.code` class. Do not write another highlighter.

```html
<pre><code class="language-js">await store(result);
acknowledge(job);</code></pre>
```

## Code and plain English

Pair a short code path with its meaning. Keep matching rows aligned.

```html
<div class="guide-code-pair wide">
  <pre><code class="language-ts">await save(output)</code></pre>
  <div class="guide-plain"><strong>Store the result</strong><p>The worker waits until the write finishes.</p></div>
</div>
```

## Formula

Build formulas from terms already shown. Follow with one plain sentence.

```html
<div class="guide-formula"><code>safe = stored && acknowledged</code><p>The job is complete only when both states are true.</p></div>
```

## Definition list and glossary

Use a definition list near the explanation. Put the full glossary in the reference section, in teaching order.

```html
<dl class="guide-definitions">
  <dt>Acknowledgement</dt><dd>A message that lets the queue remove the delivered job.</dd>
</dl>
```

## Table

Wrap tables so they scroll on phones.

```html
<div class="guide-table" role="region" aria-label="Delivery outcomes" tabindex="0">
  <table><thead><tr><th>Order</th><th>Crash outcome</th></tr></thead><tbody><tr><td>Store, then acknowledge</td><td>The result remains available.</td></tr></tbody></table>
</div>
```

## Check yourself

Use 3 to 5 application questions. Make every wrong option a real misconception. Reveal the reason for every option. Use native buttons and keep the group keyboard operable. Do not add scores, streaks, confetti, or progress theatrics.

```html
<div class="guide-check" data-guide-check>
  <h3>Check yourself</h3>
  <p>When may the worker acknowledge this job?</p>
  <div class="guide-options">
    <button type="button" data-correct>After durable storage<span>Storage survives the worker crash.</span></button>
    <button type="button">After receipt<span>This can remove work before the result exists.</span></button>
  </div>
</div>
```

The template script marks the chosen option, reveals its reason, and exposes the correct reason after 2 wrong attempts.

## Checked against the source

Use a `details` block in the reference section.

```html
<details class="guide-checked" open>
  <summary>Checked against the source</summary>
  <ul><li><code>240 ms</code> is illustrative and belongs only to the running example.</li></ul>
</details>
```

## Limits list

Name where the account stops.

```html
<ul class="guide-limits"><li><strong>One worker.</strong> Concurrent claims are outside this example.</li></ul>
```

## Source line

Keep a source next to the claim it supports.

```html
<p class="guide-source">Source: <a href="https://example.com/spec">Queue specification, delivery section</a>.</p>
```

## AI-generated note

Put this in the reference section, not the footer.

```html
<p class="guide-ai-note">This guide was generated with AI and checked against the sources above. The illustrative timings are labelled. Report corrections at SOURCE.</p>
```

## Table of contents

Use it only for long guides. Keep labels equal to section headings.

```html
<nav class="guide-toc" aria-label="Contents"><ol><li><a href="#problem">The problem</a></li></ol></nav>
```
