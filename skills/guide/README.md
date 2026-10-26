# Guide

Guide turns a topic, paper, codebase, or decision into one self-contained HTML page. It combines practical writing, a fixed explanatory structure, source checks, live figures from [Animated Visuals](../animated-visuals/), and the same theme system.

Use `guide` for a durable explanation in one file. Use `teach-me` for lessons, video, or teaching from scratch.

## Install

```sh
npx skills@latest add juanbermudez/skills --skill guide -g
```

The guide skill requires `animated-visuals`. The Claude Code plugin declares that dependency. For a direct skills.sh install, install it too:

```sh
npx skills@latest add juanbermudez/skills --skill animated-visuals -g
```

## Start a guide

```sh
node skills/guide/scripts/new.mjs my-guide
node skills/guide/scripts/build.mjs guides/my-guide
node skills/guide/scripts/verify.mjs guides/my-guide/index.html
```

Write and check `plan.md` before editing the HTML. The build writes one offline `index.html` beside the sources.

Read the [skill instructions](SKILL.md) or open the [Guide site](https://juanbermudez.github.io/skills/guide/).
