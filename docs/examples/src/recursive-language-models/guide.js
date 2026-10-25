/* Recursive Language Models: six figures. Every number below is from arXiv:2512.24601v2 and says where.
   Claims, one per figure:
   1 fig-window   A base model must fit the input in its window; an RLM keeps the input in a variable.
   2 fig-loop     The root writes code, the session runs it, sub-calls read pieces, only short printouts come back.
   3 fig-split    The root chooses how to cut the input, and the cut sets how many sub-calls it makes.
   4 fig-scale    As the task needs more of the input, GPT-5 falls off sooner; the RLM slides slowly, past the window.
   5 fig-results  An RLM variant has the best score on all four tasks, with either model, at a mid-pack cost.
   6 fig-train    Fine-tuning a small model on 1,000 RLM runs lifts it on every task. */

const hitAt = (f, x, y, pad = 0) => f.state.hits?.find((h) => x >= h.x - pad && x <= h.x + h.w + pad && y >= h.y - pad && y <= h.y + h.h + pad)?.key ?? null;
const fmtTok = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1e3)}K`);

/* ================= Fig 1: the window against the input (canvas, to scale) ================= */
(() => {
  const WINDOW = 272e3; // GPT-5's context window, the paper's Fig. 1 caption
  const INPUTS = {
    pairs: { label: "OOLONG-Pairs task · 32K", tokens: 32e3, what: "an OOLONG-Pairs task" },          // Table 1
    oolong: { label: "OOLONG task · 131K", tokens: 131e3, what: "an OOLONG task" },                  // Table 1
    codeqa: { label: "A code repository · ~900K", tokens: 900e3, what: "a code repository" },        // App. E.4
    bcp: { label: "1,000 documents · ~8.3M", tokens: 8.3e6, what: "the pageant question's documents" }, // App. E.1
  };
  const tips = {
    window: { title: "The window", body: "How much text the model reads in one call: 272K tokens for GPT-5. Everything it knows about the task has to be in here." },
    input: { title: "The input", body: "Drawn as tiles the size of one window, so the lengths compare to scale." },
    session: { title: "Python session", body: "The RLM's REPL: a Python session that keeps its variables between turns. The whole input sits in one of them, named context." },
    over: { title: "Doesn't fit", body: "Every tile past the first window. A base model can't take these at all; the call fails or the input must be cut." },
  };
  const layout = (w) => {
    const narrow = w < 560, gap = narrow ? 4 : 6, cols = narrow ? 7 : 10, rows = narrow ? 5 : 4;
    const gx0 = narrow ? 12 : 196, gw = w - gx0 - 12;
    const s = Math.min(narrow ? 44 : 58, (gw - gap * (cols - 1)) / cols);
    const win = narrow ? { x: 12, y: 34, s: s * 1.6 } : { x: 28, y: 52, s: Math.max(s * 1.9, 110) };
    const gy0 = narrow ? win.y + win.s + 70 : 52;
    const h = gy0 + rows * (s + gap) - gap + (narrow ? 34 : 40);
    return { narrow, gap, cols, rows, gx0, gy0, s, win, h: Math.max(h, narrow ? 0 : win.y + win.s + 96) };
  };
  FS.figure("fig-window", {
    height: (w) => layout(w).h,
    params: {
      who: { value: "base", label: "Who reads it", options: [{ value: "base", label: "Base model" }, { value: "rlm", label: "RLM" }], placement: "inline" },
      input: { value: "bcp", label: "Input", options: Object.entries(INPUTS).map(([value, i]) => ({ value, label: i.label })) },
      mix: { value: 0, min: 0, max: 1, hidden: true },
    },
    reserve: { readout: ["Base model: only 3% of the input fits in its window", "RLM: all 8.3M tokens sit in a variable; the window holds a few lines"] },
    tips,
    tipAt: (f, x, y) => hitAt(f, x, y),
    autoplay: false,
    onParam(f, name, value) { if (name === "who") f.api.set("mix", value === "rlm" ? 1 : 0); },
    render(f, c) {
      const C = f.C, L = layout(f.w), m = FS.ease.smooth(f.v.mix), inp = INPUTS[f.params.input];
      const tiles = inp.tokens / WINDOW, hits = (f.state.hits = []);
      const ring = (k) => f.hover === k;
      // the window
      const W = L.win;
      FS.k.text(f, c, "Model's window", W.x, W.y - 22, { size: 12, weight: 600, color: C.fg });
      FS.k.text(f, c, "272K tokens", W.x, W.y - 8, { size: 10.5 });
      FS.k.rrect(c, W.x, W.y, W.s, W.s, 6); c.fillStyle = C.surface; c.fill();
      c.strokeStyle = ring("window") ? C.accent : C.fg; c.lineWidth = ring("window") ? 1.75 : 1.25; c.stroke(); c.lineWidth = 1;
      hits.push({ key: "window", x: W.x, y: W.y, w: W.s, h: W.s });
      // base: the window fills with the input (to its fraction); rlm: a few short lines
      const pad = 8, lineH = W.s > 120 ? 6 : 5, nLines = Math.floor((W.s - pad * 2) / lineH);
      const fillFrac = Math.min(1, tiles);
      c.save(); c.globalAlpha = 1 - m;
      for (let i = 0; i < Math.round(nLines * fillFrac); i++) { const lw = (W.s - pad * 2) * (0.55 + 0.45 * Math.abs(Math.sin(i * 2.3))); FS.k.rrect(c, W.x + pad, W.y + pad + i * lineH, lw, 2.2, 1); c.fillStyle = C.muted; c.fill(); }
      c.restore();
      const parts = [["instructions", 4], ["question", 1], ["about context", 1], ["printouts", 2]];
      c.save(); c.globalAlpha = m;
      let row = 0;
      parts.forEach(([, n], pi) => { for (let i = 0; i < n; i++) { const lw = (W.s - pad * 2) * (pi === 2 ? 0.5 : 0.7 + 0.3 * Math.abs(Math.sin(row * 1.7))); FS.k.rrect(c, W.x + pad, W.y + pad + row * lineH, lw, 2.2, 1); c.fillStyle = pi === 2 ? C.accent : pi === 1 ? C.fg : C.muted; c.fill(); row++; } row++; });
      c.restore();
      const capY = W.y + W.s + 16;
      if (!L.narrow) {
        FS.k.text(f, c, tiles <= 1 ? `holds ${Math.round(fillFrac * 100)}% of the window` : "full, and the rest is left out", W.x, capY, { size: 10.5, alpha: 1 - m });
        FS.k.text(f, c, "instructions, the question,", W.x, capY, { size: 10.5, alpha: m });
        FS.k.text(f, c, "one line about context,", W.x, capY + 14, { size: 10.5, alpha: m });
        FS.k.text(f, c, "short printouts", W.x, capY + 28, { size: 10.5, alpha: m });
      } else {
        FS.k.text(f, c, tiles <= 1 ? `holds ${Math.round(fillFrac * 100)}% of the window` : "full, the rest left out", W.x + W.s + 12, W.y + 18, { size: 10.5, alpha: 1 - m });
        FS.k.text(f, c, "instructions, the question,", W.x + W.s + 12, W.y + 18, { size: 10.5, alpha: m });
        FS.k.text(f, c, "a line about context,", W.x + W.s + 12, W.y + 32, { size: 10.5, alpha: m });
        FS.k.text(f, c, "short printouts", W.x + W.s + 12, W.y + 46, { size: 10.5, alpha: m });
      }
      // the input as window-sized tiles
      const n = Math.ceil(tiles), gx = L.gx0, gy = L.gy0, s = L.s;
      FS.k.text(f, c, "The input", gx, L.narrow ? gy - 24 : gy - 22, { size: 12, weight: 600, color: C.fg });
      FS.k.text(f, c, `${inp.what} · ${fmtTok(inp.tokens)} tokens = ${tiles < 10 ? tiles.toFixed(2) : tiles.toFixed(1)} windows`, L.narrow ? gx : gx + 70, L.narrow ? gy - 8 : gy - 22, { size: 10.5 });
      const sess = { x: gx - 6, y: gy - 6, w: Math.min(n, L.cols) * (s + L.gap) - L.gap + 12, h: Math.ceil(n / L.cols) * (s + L.gap) - L.gap + 12 };
      c.save(); c.globalAlpha = m;
      FS.k.rrect(c, sess.x, sess.y, sess.w, sess.h, 9); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = ring("session") ? C.accent : C.lineStrong; c.setLineDash([4, 3]); c.stroke(); c.setLineDash([]);
      c.restore();
      if (m > 0.5) hits.push({ key: "session", x: sess.x, y: sess.y, w: sess.w, h: sess.h });
      for (let i = 0; i < n; i++) {
        const col = i % L.cols, r = Math.floor(i / L.cols), x = gx + col * (s + L.gap), y = gy + r * (s + L.gap);
        const frac = Math.min(1, tiles - i), tw = s * frac, fits = i === 0;
        FS.k.rrect(c, x, y, s, s, 5); c.strokeStyle = ring("input") ? C.accent : C.line; c.stroke();
        FS.k.rrect(c, x, y, tw, s, 5); c.fillStyle = C.surface; c.fill();
        if (!fits) { c.save(); c.globalAlpha = 1 - m; FS.k.rrect(c, x, y, tw, s, 5); c.fillStyle = FS.k.hatch(f, c, C.muted, 5); c.fill(); c.restore(); }
        const ink = fits && m < 0.5 ? C.fg : C.muted;
        c.save(); c.globalAlpha = fits ? 1 : m + (1 - m) * 0.25;
        for (let j = 0; j < 4; j++) { FS.k.rrect(c, x + 6, y + 8 + j * (s - 16) / 4, Math.max(0, Math.min(tw - 12, (s - 12) * (0.6 + 0.4 * Math.abs(Math.sin(i + j))))), 2, 1); c.fillStyle = ink; c.fill(); }
        c.restore();
        hits.push({ key: fits ? "input" : m < 0.5 ? "over" : "input", x, y, w: s, h: s });
        c.strokeStyle = ring("input") ? C.accent : fits && m < 0.5 ? C.fg : C.lineStrong; c.lineWidth = fits && m < 0.5 ? 1.25 : 1; FS.k.rrect(c, x, y, tw, s, 5); c.stroke(); c.lineWidth = 1;
      }
      if (m > 0.02) FS.k.label(f, c, "variable: context", sess.x + sess.w - 8, sess.y + sess.h + 12, { size: 10.5, weight: 600, align: "right", color: C.muted, alpha: m });
      if (tiles > 1 && m < 0.98) FS.k.label(f, c, "doesn't fit", gx + s + L.gap + 6, gy + s / 2, { size: 10.5, weight: 600, color: C.fg, alpha: 1 - m, halo: C.surface });
      const pct = Math.round((Math.min(WINDOW, inp.tokens) / inp.tokens) * 100);
      f.api.out("readout", f.params.who === "base"
        ? tiles > 1 ? `Base model: only ${pct}% of the input fits in its window` : `Base model: it fits, filling ${Math.round(tiles * 100)}% of the window`
        : `RLM: all ${fmtTok(inp.tokens)} tokens sit in a variable; the window holds a few lines`);
    },
  });
})();

/* ================= Fig 2: the loop on the pageant question (stepped flow, App. E.1) ================= */
(() => {
  const meta = {
    question: { label: "Your question", sub: "who won the pageant?", tip: { title: "The question", body: "A multi-hop trivia question from BrowseComp-Plus, query 74: a festival, its 13th year, a pageant, the winner's first and last name." } },
    root: { label: "Root model", sub: "GPT-5, sees summaries", tip: { title: "Root model", body: "The model in charge. It never sees the documents themselves, only the question, a description of context, and short printouts." } },
    repl: { label: "Python session", sub: "runs the root's code", tip: { title: "Python session", body: "A REPL: it runs each block of code the root writes and keeps every variable for the next turn." } },
    context: { label: "context", sub: "1,000 documents", tip: { title: "context", body: "The prompt, stored as a variable: 1,000 documents, about 8.3M tokens. Code can index, slice and search it." } },
    vars: { label: "Variables", sub: "answer6, confirm", tip: { title: "Variables", body: "Where results go. Sub-call answers are stored here, so they don't fill the root's window." } },
    sub: { label: "Sub-call", sub: "GPT-5-mini, one piece", tip: { title: "Sub-call", body: "llm_query(text): one call to a smaller model on whatever string the code passes it, here one document." } },
    answer: { label: "Answer", sub: "FINAL(...)", tip: { title: "Final answer", body: "The root ends the loop by writing FINAL(answer), or FINAL_VAR(name) to return a variable." } },
  };
  const layouts = {
    wide: { box: [960, 250], at: { question: [20, 40, 160], root: [220, 40, 170], repl: [450, 40, 170], context: [680, 40, 150], vars: [450, 160, 170], sub: [790, 160, 150], answer: [220, 160, 170] } },
    narrow: { box: [360, 370], at: { question: [16, 10, 180], root: [16, 80, 180], repl: [16, 150, 180], context: [16, 220, 180], vars: [16, 290, 180], sub: [222, 220, 128], answer: [222, 80, 128] } },
  };
  const edges = [
    { a: "question", b: "root", wide: "x", narrow: "y" },
    { a: "root", b: "repl", wide: "x", narrow: "y" },
    { a: "repl", b: "context", wide: "x", narrow: "y" },
    { a: "repl", b: "sub", wide: "v", narrow: "x" },
    { a: "sub", b: "vars", wide: "back", narrow: "back" },
    { a: "vars", b: "repl", wide: "v", narrow: "left" },
    { a: "root", b: "answer", wide: "v", narrow: "x" },
  ];
  const returns = [{ a: "repl", b: "root", wide: "top", narrow: "left" }];
  const steps = [
    { on: Object.keys(meta), caption: "One root model, one Python session holding the prompt, and a function that calls a smaller model on any piece." },
    { on: ["question", "root", "repl", "context"], caption: "The 1,000 documents, about 8.3M tokens, go into a variable. The root gets the question and a short description of it." },
    { on: ["root", "repl", "context"], caption: "The root writes a keyword search over every document: “festival”, “beauty pageant”, “La Union” and six more. It runs in 0.158 s." },
    { on: ["repl", "root"], caption: "Only a short, cut-off printout of the hits comes back. One hit, the document at index 6, looks promising." },
    { on: ["repl", "context", "sub", "vars"], caption: "Code sends document 6 to a sub-call. The GPT-5-mini call uses 1,605 tokens and costs $0.0017; its answer goes into answer6." },
    { on: ["repl", "sub", "vars", "root"], caption: "Two more sub-calls confirm the year and pull out the winner's first and last name: Maria Dalmacio." },
    { on: ["root", "answer"], caption: "The root returns it with FINAL. The right answer, and the whole run cost $0.079." },
  ];
  flowFigure("fig-loop", {
    meta, layouts, edges, returns, steps,
    regions: [{ keys: ["repl", "context", "vars"], label: "Python session" }],
  });
})();

/* ================= Fig 3: four real runs, four cuts (canvas, plays once per tab) ================= */
(() => {
  const RUNS = {
    e1: { tab: "Search", model: "RLM(GPT-5)", input: "1,000 documents · about 8.3M tokens", kind: "filter", units: 1000, pieces: 1000, pick: 6,
      cut: "Code searches all 1,000 for keywords; no model", calls: 3, callNote: "3 sub-calls, all on document 6", combine: "The root reads three short answers", answer: "Maria Dalmacio", ok: true, cost: "$0.079", src: "App. E.1" },
    e4: { tab: "Chunks", model: "RLM(GPT-5)", input: "a code repository · about 900K tokens", kind: "chunks", pieces: 10,
      cut: "Chunks of 380,000 characters", calls: 10, extra: 1, callNote: "a sub-call per chunk, 11 in all", combine: "One more sub-call combines the findings", answer: "choice 1", ok: true, cost: "$0.27", src: "App. E.4" },
    e2: { tab: "Batches", model: "RLM(Qwen3-Coder)", input: "787 questions · about 32K tokens", kind: "chunks", pieces: 8,
      cut: "Batches of 100 lines", calls: 8, callNote: "8 sub-calls label every question", combine: "Plain code: 131 users, 8,515 pairs", answer: "kept re-checking, returned a different answer", ok: false, cost: "$1.12", src: "App. E.2" },
    e3: { tab: "Each line", model: "RLM(Qwen3-Coder)", input: "3,182 questions", kind: "lines", pieces: 3182,
      cut: "One question per sub-call", calls: 382, callNote: "382 sub-calls in the step the paper shows", combine: "Plain code counts the labels", answer: "“less common than”", ok: true, cost: "$0.38", src: "App. E.3" },
  };
  const T = { cut: [0, 1], calls: [1, 2.6], combine: [2.6, 3.3], answer: [3.3, 4] }, END = 4.2;
  const tips = {
    input: { title: "The input", body: "What the run had to work through, stored as the variable context." },
    cut: { title: "The cut", body: "How the root's code divided the input. The paper's instructions suggest strategies but never pick one (App. C.1)." },
    calls: { title: "Sub-calls", body: "Each dot is one llm_query call to a model, on one piece. Recursion is one level deep here (§6)." },
    combine: { title: "Putting it together", body: "How the pieces came back into one answer: the root reading printouts, one more sub-call, or plain code." },
    answer: { title: "The answer", body: "Whether the run was right, and what the whole trajectory cost (App. E)." },
  };
  const geo = (f) => {
    const narrow = f.w < 560, x0 = narrow ? 12 : 128, x1 = f.w - 14;
    return { narrow, x0, x1, labelX: 12, yIn: narrow ? 46 : 34, yCalls: narrow ? 124 : 112, yComb: narrow ? 214 : 196, yAns: narrow ? 262 : 244 };
  };
  FS.figure("fig-split", {
    height: (w) => (w < 560 ? 300 : 276),
    duration: END,
    keyframe: END,
    params: { run: { value: "e1", label: "Runs from Appendix E", options: Object.entries(RUNS).map(([value, r]) => ({ value, label: r.tab })), placement: "inline" } },
    reserve: { readout: ["RLM(Qwen3-Coder) · 382 sub-calls · $0.38 · right answer"], chip: ["putting it together", "App. E.3 · a real run"] },
    tips,
    tipAt: (f, x, y) => hitAt(f, x, y, 4),
    onParam(f, name) { if (name === "run") { f.api.seek(0); f.api.play(); } },
    render(f, c) {
      const C = f.C, G = geo(f), R = RUNS[f.params.run], t = f.t, hits = (f.state.hits = []);
      const W = G.x1 - G.x0, w = (a, b) => FS.window(t, a, b);
      const rowLabel = (s, y, key) => {
        if (G.narrow) return;
        FS.k.text(f, c, s, G.labelX, y + 4, { size: 12, weight: 600, color: f.hover === key ? C.accent : C.fg });
      };
      // row 1: the input bar and the cut
      rowLabel("Input", G.yIn + 8, "input");
      FS.k.text(f, c, R.input, G.narrow ? G.x0 : G.x0 + W, G.narrow ? G.yIn - 26 : G.yIn - 6, { size: 10.5, align: G.narrow ? "left" : "right", color: G.narrow ? C.fg : C.muted });
      const yb = G.yIn, hb = 16;
      FS.k.rrect(c, G.x0, yb, W, hb, 4); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = f.hover === "input" ? C.accent : C.lineStrong; c.stroke();
      hits.push({ key: "input", x: G.x0, y: yb, w: W, h: hb });
      const cutP = w(...T.cut), pieceX = (i, n) => G.x0 + (W * (i + 0.5)) / n;
      c.save();
      if (R.kind === "chunks") {
        c.strokeStyle = C.fg; c.lineWidth = 1.25;
        for (let i = 1; i < R.pieces; i++) { const x = G.x0 + (W * i) / R.pieces; c.globalAlpha = FS.clamp(cutP * R.pieces - i + 1); FS.k.line(c, x, yb - 2, x, yb + hb + 2); }
      } else if (R.kind === "lines") {
        c.globalAlpha = 0.5 * cutP; c.fillStyle = FS.k.hatch(f, c, C.muted, 3); FS.k.rrect(c, G.x0, yb, W * cutP, hb, 4); c.fill();
      } else {
        // a keyword scan sweeps across all documents; the hit (document 6) lights at the end
        const sx = G.x0 + W * cutP;
        c.globalAlpha = 0.45; c.fillStyle = FS.k.hatch(f, c, C.muted, 3); FS.k.rrect(c, G.x0, yb, Math.max(0, sx - G.x0), hb, 4); c.fill();
        c.globalAlpha = cutP < 1 ? 1 : 0; c.strokeStyle = C.accent; c.lineWidth = 1.5; FS.k.line(c, sx, yb - 4, sx, yb + hb + 4);
        if (cutP >= 1) { const x = G.x0 + (W * (R.pick + 0.5)) / R.units; c.globalAlpha = 1; c.fillStyle = C.accent; c.fillRect(x - 1.5, yb - 3, 3, hb + 6); FS.k.label(f, c, "document 6", x + 6, G.narrow ? yb + hb + 12 : yb - 8, { size: 10.5, weight: 600, color: C.fg }); }
      }
      c.restore();
      FS.k.text(f, c, R.cut, G.narrow ? G.x0 : G.x1, G.narrow ? yb - 8 : yb + hb + 14, { size: 10.5, align: G.narrow ? "left" : "right", alpha: cutP, color: f.hover === "cut" ? C.accent : C.muted });
      hits.push({ key: "cut", x: G.x0 + W / 2, y: yb + hb + 2, w: W / 2, h: 16 });
      // row 2: the sub-calls
      rowLabel("Sub-calls", G.yCalls, "calls");
      const callP = w(...T.calls), shown = Math.floor(callP * R.calls + 1e-6);
      const dots = [];
      if (R.kind === "lines") {
        const cols = G.narrow ? 32 : 64, rows = Math.ceil(R.calls / cols), gx = (W - 8) / (cols - 1), gy = G.narrow ? 7 : 7.5, top = G.yCalls - ((rows - 1) * gy) / 2;
        for (let i = 0; i < R.calls; i++) dots.push({ x: G.x0 + 4 + (i % cols) * gx, y: top + Math.floor(i / cols) * gy, r: G.narrow ? 2 : 2.4, from: null });
      } else if (R.kind === "filter") {
        const px = G.x0 + (W * (R.pick + 0.5)) / R.units;
        for (let i = 0; i < R.calls; i++) dots.push({ x: G.x0 + 40 + i * 34, y: G.yCalls, r: 5, from: px });
      } else for (let i = 0; i < R.calls; i++) dots.push({ x: pieceX(i, R.pieces), y: G.yCalls, r: 5, from: pieceX(i, R.pieces) });
      dots.forEach((d, i) => {
        if (i >= shown) { c.strokeStyle = C.line; c.beginPath(); c.arc(d.x, d.y, d.r, 0, 7); c.stroke(); return; }
        const age = FS.clamp((callP * R.calls - i) / 1.5);
        if (d.from != null) { c.strokeStyle = C.muted; c.lineWidth = 1; c.globalAlpha = 0.6; c.beginPath(); c.moveTo(d.from, yb + hb + 2); c.bezierCurveTo(d.from, (yb + hb + d.y) / 2, d.x, (yb + hb + d.y) / 2, d.x, d.y - d.r); c.stroke(); c.globalAlpha = 1; }
        c.fillStyle = f.hover === "calls" ? C.accent : C.fg; c.beginPath(); c.arc(d.x, d.y, d.r * (1 + 0.5 * (1 - age)), 0, 7); c.fill();
      });
      const lastDot = dots[dots.length - 1];
      const noteX = R.kind === "filter" ? dots[dots.length - 1].x + 18 : G.x0;
      const noteY = R.kind === "filter" ? G.yCalls + 4 : R.kind === "lines" ? lastDot.y + 18 : G.yCalls + 22;
      FS.k.text(f, c, R.callNote, noteX, noteY, { size: 10.5, alpha: FS.clamp(callP * 4), color: f.hover === "calls" ? C.accent : C.muted });
      hits.push({ key: "calls", x: G.x0, y: G.yCalls - 26, w: W, h: 52 });
      // row 3: putting it together
      rowLabel("Combine", G.yComb + 4, "combine");
      const combP = w(...T.combine), bw = Math.min(W, G.narrow ? W : 330), bx = G.x0 + (W - bw) / 2, by = G.yComb - 14;
      c.save(); c.globalAlpha = combP;
      const fromDots = R.kind === "lines" ? [dots[0], dots[Math.floor(dots.length / 2)], lastDot] : dots;
      c.strokeStyle = C.muted; c.lineWidth = 1;
      for (const d of fromDots) { c.beginPath(); c.moveTo(d.x, d.y + d.r + 2); c.bezierCurveTo(d.x, (d.y + by) / 2, bx + bw / 2, (d.y + by) / 2, bx + bw / 2, by); c.stroke(); }
      FS.k.rrect(c, bx, by, bw, 28, 6); c.fillStyle = C.surface; c.fill(); c.strokeStyle = f.hover === "combine" ? C.accent : C.fg; c.stroke();
      if (R.extra) { c.fillStyle = C.fg; c.beginPath(); c.arc(bx + 14, by + 14, 5, 0, 7); c.fill(); }
      FS.k.text(f, c, R.combine, bx + bw / 2 + (R.extra ? 8 : 0), by + 18, { size: 11.5, weight: 600, color: C.fg, align: "center" });
      c.restore();
      hits.push({ key: "combine", x: bx, y: by, w: bw, h: 28 });
      // row 4: the answer
      rowLabel("Answer", G.yAns + 2, "answer");
      const ansP = w(...T.answer);
      c.save(); c.globalAlpha = ansP;
      const mark = R.ok ? "✓" : "✗", text = `${mark} ${R.ok ? "right" : "wrong"}: ${R.answer} · run cost ${R.cost}`;
      FS.k.text(f, c, text, G.x0 + (G.narrow ? 0 : 0), G.yAns + 6, { size: 12, weight: 600, color: R.ok ? C.fg : C.strong });
      if (!R.ok) { c.strokeStyle = C.strong; c.setLineDash([3, 3]); const tw = c.measureText(text).width; FS.k.line(c, G.x0, G.yAns + 11, G.x0 + tw, G.yAns + 11); c.setLineDash([]); }
      c.restore();
      hits.push({ key: "answer", x: G.x0, y: G.yAns - 10, w: W, h: 22 });
      const phase = t < T.cut[1] ? "cutting the input" : t < T.calls[1] ? "sub-calls" : t < T.combine[1] ? "putting it together" : `${R.src} · a real run`;
      f.api.out("chip", phase);
      f.api.out("readout", `${R.model} · ${R.calls + (R.extra || 0)} sub-calls · ${R.cost} · ${R.ok ? "right answer" : "wrong answer"}`);
    },
  });
})();

/* ================= Fig 4: score against input length (canvas, the paper's Fig. 1) ================= */
(() => {
  // Extracted from the vector drawing of the paper's Fig. 1 (v2): each point mapped onto the 0-100 gridlines.
  const LENS = ["8K", "16K", "33K", "66K", "131K", "262K", "524K", "1M"];
  const WINDOW_AT = 5 + Math.log2(272 / 262.144); // 272K between 2^18 and 2^19
  const DATA = {
    sniah: { gpt: [100, 100, 100, 100, 100, 100], rlm: [100, 100, 100, 100, 100, 100, 100, 100] },
    oolong: { gpt: [92.1, 77.2, 49.4, 44.7, 44.0, 31.1], rlm: [84.5, 76.3, 64.0, 61.3, 56.5, 51.1, 50.0, 46.0] },
    pairs: { gpt: [80.7, 56.8, 3.7, 0.0, 0.0, 0.0], rlm: [74.3, 59.7, 58.0, 61.1, 66.9, 56.5, 54.4, 49.1] },
  };
  const TASKS = [
    { value: "sniah", label: "S-NIAH", note: "Find one phrase in filler: the work stays the same as the input grows" },
    { value: "oolong", label: "OOLONG", note: "Count over nearly every line: the work grows with the input" },
    { value: "pairs", label: "OOLONG-Pairs", note: "List pairs of entries: the work grows with the square of the input" },
  ];
  const tips = {
    window: { title: "GPT-5's window", body: "272K tokens. Past this line GPT-5 can't take the input, so it has no points; the RLM keeps going." },
    gpt: { title: "GPT-5", body: "The base model, the whole input in its window." },
    rlm: { title: "RLM(GPT-5)", body: "GPT-5 as root in the Python session, sub-calls to GPT-5-mini, one level deep (§3.2)." },
  };
  const geo = (f) => { const narrow = f.w < 560; return { narrow, L: narrow ? 34 : 44, R: f.w - (narrow ? 40 : 104), T: narrow ? 58 : 46, B: f.h - 44 }; };
  const X = (G, i) => G.L + ((G.R - G.L) * i) / (LENS.length - 1);
  const Y = (G, v) => G.B - ((G.B - G.T) * v) / 100;
  const handle = {
    label: "Input length: drag, or use the arrow keys", radius: 18, step: 40,
    get: (f) => { const G = geo(f); return { x: f.state.cx ?? X(G, f.v.len), y: G.B }; },
    set: (f, x) => {
      const G = geo(f); f.state.cx = x;
      const i = FS.clamp(Math.round(((x - G.L) / (G.R - G.L)) * (LENS.length - 1)), 0, LENS.length - 1);
      if (i !== f.params.len) { f.state.fromHandle = true; f.api.set("len", i, { instant: true }); f.state.fromHandle = false; }
      f.dirty = true;
    },
    bounds: (f) => { const G = geo(f); return { x0: G.L, y0: G.T, x1: G.R, y1: G.B }; },
    release: (f) => { const G = geo(f); return { x: X(G, f.params.len), y: G.B }; },
  };
  FS.figure("fig-scale", {
    height: (w) => (w < 560 ? 310 : 320),
    params: {
      task: { value: "pairs", label: "Tasks", options: TASKS, placement: "inline" },
      len: { value: 2, min: 0, max: 7, step: 1, hidden: true },
      k: { value: 1, min: 0, max: 1, hidden: true },
    },
    handles: { cursor: handle },
    reserve: { readout: ["At 262K tokens: GPT-5 100.0 · RLM 100.0 · RLM ahead by 100.0 points", "At 524K tokens: GPT-5 can't take it · RLM 54.4"] },
    tips,
    tipAt: (f, x, y) => hitAt(f, x, y, 3),
    autoplay: false,
    init(f) { f.state.prev = DATA.pairs; },
    onParam(f, name, value) {
      if (name === "task") { f.state.prev = f.state.shown || DATA[value]; f.api.set("k", 0, { instant: true }); f.api.set("k", 1); }
      if (name === "len" && !f.state.fromHandle) f.state.cx = null;
    },
    resize(f) { handle.step = (geo(f).R - geo(f).L) / (LENS.length - 1); },
    render(f, c) {
      const C = f.C, G = geo(f), hits = (f.state.hits = []), cur = DATA[f.params.task], k = FS.ease.smooth(f.v.k), prev = f.state.prev || cur;
      const blend = (a, b) => b.map((v, i) => FS.lerp(a[i] ?? v, v, k));
      const shown = (f.state.shown = { gpt: blend(prev.gpt, cur.gpt), rlm: blend(prev.rlm, cur.rlm) });
      const note = TASKS.find((t) => t.value === f.params.task).note;
      if (G.narrow) { const cut = note.indexOf(": "); FS.k.text(f, c, note.slice(0, cut + 1), 0, 14, { size: 11, color: C.fg }); FS.k.text(f, c, note.slice(cut + 2), 0, 29, { size: 11 }); }
      else FS.k.text(f, c, note, 0, 14, { size: 11.5, color: C.fg });
      // past the window
      const wx = X(G, WINDOW_AT);
      FS.k.rrect(c, wx, G.T, G.R - wx + 6, G.B - G.T, 0); c.fillStyle = C.surface2; c.fill();
      c.save(); c.globalAlpha = 0.5; FS.k.rrect(c, wx, G.T, G.R - wx + 6, G.B - G.T, 0); c.fillStyle = FS.k.hatch(f, c, C.line, 6); c.fill(); c.restore();
      c.strokeStyle = f.hover === "window" ? C.accent : C.lineStrong; c.setLineDash([4, 3]); FS.k.line(c, wx, G.T - 16, wx, G.B); c.setLineDash([]);
      FS.k.label(f, c, G.narrow ? "272K window" : "GPT-5's window, 272K", wx + 6, G.T - 9, { size: 10.5, weight: 600, color: f.hover === "window" ? C.accent : C.muted, halo: C.surface2 });
      hits.push({ key: "window", x: wx - 4, y: G.T - 18, w: G.narrow ? 70 : 130, h: 18 });
      // grid
      c.strokeStyle = C.line; c.lineWidth = 1;
      for (const v of [0, 25, 50, 75, 100]) { FS.k.line(c, G.L, Y(G, v), G.R, Y(G, v)); FS.k.text(f, c, String(v), G.L - 8, Y(G, v) + 4, { align: "right", size: 10.5 }); }
      LENS.forEach((s, i) => { if (G.narrow && i % 2 === 1 && i !== 7) return; FS.k.text(f, c, s, X(G, i), G.B + 16, { align: "center", size: 10.5, color: i >= 6 ? C.fg : C.muted }); });
      FS.k.text(f, c, "input tokens, log scale →", G.R, G.B + 31, { size: 10.5, align: "right" });
      FS.k.text(f, c, "score", G.L - 8, G.T - 8, { align: "right", size: 10.5 });
      // series
      const series = (vals, key, strong) => {
        const hot = f.hover === key;
        c.strokeStyle = hot ? C.accent : strong ? C.fg : C.muted; c.lineWidth = strong ? 1.75 : 1.25;
        if (!strong) c.setLineDash([5, 3]);
        c.beginPath(); vals.forEach((v, i) => (i ? c.lineTo(X(G, i), Y(G, v)) : c.moveTo(X(G, i), Y(G, v)))); c.stroke(); c.setLineDash([]); c.lineWidth = 1;
        vals.forEach((v, i) => { c.beginPath(); c.arc(X(G, i), Y(G, v), strong ? 3.5 : 3, 0, 7); if (strong) { c.fillStyle = hot ? C.accent : C.fg; c.fill(); } else { c.fillStyle = C.surface; c.fill(); c.strokeStyle = hot ? C.accent : C.muted; c.stroke(); } });
        vals.forEach((v, i) => hits.push({ key, x: X(G, i) - 5, y: Y(G, v) - 5, w: 10, h: 10 }));
      };
      series(shown.gpt, "gpt", false);
      series(shown.rlm, "rlm", true);
      const gl = shown.gpt.length - 1, same = Math.abs(shown.gpt[gl] - shown.rlm[gl]) < 6;
      FS.k.label(f, c, "GPT-5", X(G, gl) + 8, Y(G, shown.gpt[gl]) + (same ? 12 : 0), { size: 11, weight: 600, color: f.hover === "gpt" ? C.accent : C.muted });
      FS.k.label(f, c, G.narrow ? "RLM" : "RLM(GPT-5)", X(G, 7) + 8, Y(G, shown.rlm[7]) - (same ? 10 : 0), { size: 11, weight: 600, color: f.hover === "rlm" ? C.accent : C.fg });
      // cursor
      const cx = f.state.cx ?? X(G, f.v.len), held = f.drag === "cursor", hot = held || f.handleHover === "cursor" || f.hover === "cursor";
      c.strokeStyle = hot ? C.accent : C.strong; c.lineWidth = held ? 2.25 : hot ? 1.75 : 1.25; FS.k.line(c, cx, G.T - 4, cx, G.B); c.lineWidth = 1;
      c.fillStyle = C.surface; c.beginPath(); c.arc(cx, G.B, (held ? 7 : hot ? 6 : 4.5) + 2, 0, 7); c.fill();
      c.fillStyle = hot ? C.accent : C.strong; c.beginPath(); c.arc(cx, G.B, held ? 7 : hot ? 6 : 4.5, 0, 7); c.fill();
      const i = f.params.len, g = cur.gpt[i], r = cur.rlm[i];
      if (held) FS.k.label(f, c, LENS[i], cx, G.T - 12, { size: 10.5, weight: 600, align: "center", color: C.fg });
      for (const [v, strong] of [[g, false], [r, true]]) if (v != null) { c.strokeStyle = strong ? C.fg : C.muted; c.lineWidth = 1.5; c.beginPath(); c.arc(X(G, i), Y(G, v), 6.5, 0, 7); c.stroke(); c.lineWidth = 1; }
      f.api.out("readout", g == null ? `At ${LENS[i]} tokens: GPT-5 can't take it · RLM ${r.toFixed(1)}`
        : `At ${LENS[i]} tokens: GPT-5 ${g.toFixed(1)} · RLM ${r.toFixed(1)} · ${r > g ? `RLM ahead by ${(r - g).toFixed(1)} points` : r < g ? `GPT-5 ahead by ${(g - r).toFixed(1)} points` : "tied"}`);
    },
  });
})();

/* ================= Fig 5: Table 1 as bars (canvas) ================= */
(() => {
  const TASKS = [{ name: "CodeQA", len: "23K–4.2M tokens" }, { name: "BrowseComp+ (1K)", len: "6M–11M tokens" }, { name: "OOLONG", len: "131K tokens" }, { name: "OOLONG-Pairs", len: "32K tokens" }];
  const ROWS = [
    { key: "base", name: "Base model" }, { key: "bm25", name: "CodeAct + BM25" }, { key: "codesub", name: "CodeAct + sub-calls" },
    { key: "summary", name: "Summary agent" }, { key: "rlm", name: "RLM" }, { key: "nosub", name: "RLM, no sub-calls" },
  ];
  // Table 1 (v2): [score, ran into the input limit (asterisk), mean cost $, cost std $]; null cost is N/A.
  const T1 = {
    gpt: {
      base: [[24.0, 1, 0.13, 0.07], [0.0, 1, null, null], [44.0, 0, 0.14, 0.02], [0.1, 0, 0.16, 0.10]],
      bm25: [[22.0, 1, 0.06, 0.08], [51.0, 0, 0.71, 1.20], [38.0, 0, 0.61, 1.06], [24.7, 0, 0.75, 0.43]],
      codesub: [[24.0, 1, 0.06, 0.08], [0.0, 1, null, null], [40.0, 0, 0.85, 1.27], [28.4, 0, 1.11, 0.62]],
      summary: [[58.0, 0, 1.31, 1.46], [70.5, 0, 0.57, 0.10], [46.0, 0, 0.13, 0.01], [0.1, 0, 0.13, 0.09]],
      rlm: [[62.0, 0, 0.11, 0.10], [91.3, 0, 0.99, 1.22], [56.5, 0, 0.43, 0.85], [58.0, 0, 0.33, 0.20]],
      nosub: [[58.0, 0, 0.18, 0.56], [88.0, 0, 0.44, 0.90], [36.0, 0, 0.37, 0.42], [43.9, 0, 0.69, 1.16]],
    },
    qwen: {
      base: [[20.0, 1, 0.13, 0.08], [0.0, 1, null, null], [36.0, 0, 0.06, 0.00], [0.1, 0, 0.05, 0.01]],
      bm25: [[24.0, 1, 0.17, 0.08], [12.7, 0, 0.39, 0.50], [38.0, 0, 1.51, 1.09], [0.3, 0, 1.54, 0.35]],
      codesub: [[26.0, 1, 0.28, 0.30], [0.0, 1, null, null], [32.0, 0, 1.83, 1.14], [0.1, 0, 1.49, 0.46]],
      summary: [[50.0, 0, 1.26, 1.50], [38.0, 0, 8.98, 2.12], [44.1, 0, 0.15, 0.01], [0.31, 0, 0.05, 0.00]],
      rlm: [[56.0, 0, 0.92, 1.23], [44.7, 0, 0.84, 0.63], [48.0, 0, 0.61, 0.49], [23.1, 0, 1.02, 0.52]],
      nosub: [[66.0, 0, 0.18, 0.58], [46.0, 0, 0.82, 0.69], [43.5, 0, 0.32, 0.13], [17.3, 0, 1.77, 1.23]],
    },
  };
  const MODELS = { gpt: "GPT-5", qwen: "Qwen3-Coder-480B" };
  const money = (v) => (v == null ? "N/A" : `$${v.toFixed(2)}`);
  const best = (m, ti) => ROWS.reduce((b, r) => (T1[m][r.key][ti][0] > T1[m][b.key][ti][0] ? r : b), ROWS[0]);
  const tips = {};
  for (const m of Object.keys(T1)) ROWS.forEach((r, ri) => TASKS.forEach((task, ti) => {
    const [s, star, mean, sd] = T1[m][r.key][ti];
    tips[`${m}:${ri}:${ti}`] = { title: `${r.name} · ${task.name}`, body: `${MODELS[m]}: score ${s.toFixed(1)}${star ? ", ran into the input limit at least sometimes" : ""}. ${mean == null ? "No cost reported." : `Average cost ${money(mean)} a query, spread ±${money(sd)}.`}` };
  }));
  const geo = (f) => {
    const narrow = f.w < 560;
    if (narrow) { const labelW = 132, rowH = 22, head = 44, gap = 14; return { narrow, labelW, rowH, head, gap, panelH: head + ROWS.length * rowH, colW: f.w - labelW - 16, col: (ti) => ({ x: labelW, y: 8 + ti * (head + ROWS.length * rowH + gap) }) }; }
    const labelW = 150, gapX = 18, colW = (f.w - labelW - 12 - gapX * 3) / 4, rowH = 30, head = 42;
    return { narrow, labelW, rowH, head, colW, col: (ti) => ({ x: labelW + ti * (colW + gapX), y: 8 }) };
  };
  FS.figure("fig-results", {
    height: (w) => { const G = geo({ w }); return G.narrow ? 8 + 4 * (G.panelH + G.gap) : 8 + G.head + ROWS.length * G.rowH + 26; },
    params: {
      model: { value: "gpt", label: "Model", options: [{ value: "gpt", label: "GPT-5" }, { value: "qwen", label: "Qwen3-Coder" }], placement: "inline" },
      m: { value: 0, min: 0, max: 1, hidden: true },
    },
    reserve: { readout: ["Best on each task: no sub-calls, no sub-calls, RLM, RLM"] },
    tips,
    tipAt: (f, x, y) => hitAt(f, x, y),
    autoplay: false,
    onParam(f, name, value) { if (name === "model") f.api.set("m", value === "qwen" ? 1 : 0); },
    render(f, c) {
      const C = f.C, G = geo(f), mix = FS.ease.smooth(f.v.m), model = f.params.model, hits = (f.state.hits = []);
      const val = (r, ti) => FS.lerp(T1.gpt[r][ti][0], T1.qwen[r][ti][0], mix);
      const rowHot = (key) => f.hover === key;
      TASKS.forEach((task, ti) => {
        const P = G.col(ti), bx = P.x + 2, maxW = G.colW - 64, Xs = (v) => bx + (maxW * v) / 100;
        const winner = best(model, ti).key;
        FS.k.text(f, c, task.name, G.narrow ? 12 : P.x, P.y + 16, { size: 12, weight: 600, color: C.fg });
        FS.k.text(f, c, task.len, G.narrow ? 12 : P.x, P.y + 30, { size: 10.5 });
        const y0 = P.y + G.head;
        c.strokeStyle = C.line; FS.k.line(c, bx, y0 - 4, bx, y0 + ROWS.length * G.rowH - 6);
        // the base model as a dashed reference through the column
        const bv = val("base", ti), xb = Xs(bv);
        c.strokeStyle = rowHot("base") ? C.accent : C.strong; c.setLineDash([3, 3]); c.lineWidth = 1; FS.k.line(c, xb, y0 - 6, xb, y0 + ROWS.length * G.rowH - 6); c.setLineDash([]);
        ROWS.forEach((r, ri) => {
          const y = y0 + ri * G.rowH, h = G.narrow ? 11 : 13, [, star, mean] = T1[model][r.key][ti];
          const v = val(r.key, ti), w = Math.max(1.5, Xs(v) - bx), win = r.key === winner, hot = rowHot(r.key) || f.hover === `${model}:${ri}:${ti}`;
          if (ti === 0 || G.narrow) FS.k.text(f, c, r.name, 12, y + h - 1, { size: G.narrow ? 11 : 11.5, weight: r.key === "rlm" || r.key === "nosub" ? 600 : 500, color: rowHot(r.key) ? C.accent : r.key === "rlm" || r.key === "nosub" ? C.fg : C.muted });
          FS.k.rrect(c, bx, y, w, h, 2); c.fillStyle = win ? C.fg : r.key === "rlm" || r.key === "nosub" ? C.muted : C.lineStrong; c.fill();
          if (star) { FS.k.rrect(c, bx, y, w, h, 2); c.fillStyle = FS.k.hatch(f, c, C.surface, 4); c.fill(); }
          if (hot) { FS.k.rrect(c, bx - 1, y - 1, w + 2, h + 2, 3); c.strokeStyle = C.accent; c.lineWidth = 1.5; c.stroke(); c.lineWidth = 1; }
          const target = T1[model][r.key][ti][0], label = `${(Math.abs(v - target) < 0.05 ? target : v).toFixed(Number.isInteger(Math.round(target * 100) / 10) ? 1 : 2)}${star ? "*" : ""}`;
          FS.k.label(f, c, label, bx + w + 5, y + h / 2, { size: 11, weight: win ? 700 : 500, color: win ? C.fg : C.muted });
          if (!G.narrow || true) FS.k.text(f, c, money(mean), P.x + G.colW, y + h - 2, { size: 10, align: "right", mono: true, color: C.faint || C.muted });
          hits.push({ key: `${model}:${ri}:${ti}`, x: P.x, y: y - 6, w: G.colW, h: G.rowH });
        });
      });
      if (!G.narrow) FS.k.text(f, c, `${MODELS[model]} · bar = score, right = average cost a query · * ran into the input limit · dashed line = base model`, G.labelW, f.h - 8, { size: 10.5 });
      const names = TASKS.map((_, ti) => (best(model, ti).key === "rlm" ? "RLM" : "no sub-calls"));
      f.api.out("readout", names.every((n) => n === "RLM") ? "Best on each task: the RLM, all four" : `Best on each task: ${names.join(", ")}`);
    },
  });
})();

/* ================= Fig 6: training a small RLM (canvas, steps; Table 1's Qwen3-8B rows) ================= */
(() => {
  const TASKS = ["CodeQA", "BrowseComp+ (1K)", "OOLONG", "OOLONG-Pairs"];
  const S = {
    base: { name: "Qwen3-8B", v: [4.0, 0.0, 0.0, 0.1], star: [1, 1, 1, 0], cost: [0.01, null, null, 0.01] },
    rlm: { name: "as an RLM", v: [26.0, 2.0, 24.0, 4.3], star: [0, 0, 0, 0], cost: [0.04, 0.03, 0.19, 0.05] },
    ft: { name: "fine-tuned RLM", v: [32.0, 14.0, 32.0, 5.2], star: [0, 0, 0, 0], cost: [0.02, 0.01, 0.04, 0.02] },
    gpt: { name: "base GPT-5", v: [24.0, 0.0, 44.0, 0.1], star: [1, 1, 0, 0], cost: [0.13, null, 0.14, 0.16] },
  };
  const ORDER = ["base", "rlm", "ft"];
  const rel = S.ft.v.map((v, i) => ((v - S.rlm.v[i]) / S.rlm.v[i]) * 100);
  const sorted = [...rel].sort((a, b) => a - b), median = (sorted[1] + sorted[2]) / 2;
  const steps = [
    { show: 1, gpt: false, caption: "Qwen3-8B on its own: it runs into its input limit on three tasks and scores almost nothing." },
    { show: 2, gpt: false, caption: "The same model run as an RLM, no training: 26.0 on CodeQA and 24.0 on OOLONG, still weak elsewhere." },
    { show: 3, gpt: false, caption: "Fine-tuned on 1,000 RLM runs from a bigger model, on unrelated tasks: up on all four." },
    { show: 3, gpt: true, caption: "Base GPT-5 for scale, dashed: the small RLM is above it on three tasks and below it on OOLONG." },
  ];
  const tips = {};
  ORDER.concat("gpt").forEach((k) => TASKS.forEach((t, i) => { const c = S[k].cost[i]; tips[`${k}:${i}`] = { title: `${S[k].name} · ${t}`, body: `Score ${S[k].v[i].toFixed(1)}${S[k].star[i] ? ", ran into the input limit at least sometimes" : ""}. ${c == null ? "No cost reported." : `Average cost $${c.toFixed(2)} a query.`} (Table 1)` }; }));
  const geo = (f) => { const narrow = f.w < 560, L = narrow ? 30 : 44, R = f.w - 12, T = 26, B = f.h - (narrow ? 64 : 58); return { narrow, L, R, T, B, colW: (R - L) / 4 }; };
  FS.figure("fig-train", {
    height: (w) => (w < 560 ? 300 : 300),
    steps,
    tips,
    tipAt: (f, x, y) => hitAt(f, x, y, 2),
    init(f) {
      f.api.out("gains", rel.map((g) => `${g.toFixed(1)}%`).join(", "));
      f.api.out("median", `${median.toFixed(1)}%`);
    },
    render(f, c) {
      const C = f.C, G = geo(f), st = steps[f.step], e = FS.ease.out(f.stepT), hits = (f.state.hits = []);
      const Y = (v) => G.B - ((G.B - G.T) * v) / 50;
      c.strokeStyle = C.line;
      for (const v of [0, 25, 50]) { FS.k.line(c, G.L, Y(v), G.R, Y(v)); FS.k.text(f, c, String(v), G.L - 8, Y(v) + 4, { align: "right", size: 10.5 }); }
      FS.k.text(f, c, "score", G.narrow ? 0 : G.L - 8, G.T - 10, { align: G.narrow ? "left" : "right", size: 10.5 });
      TASKS.forEach((task, i) => {
        const cx = G.L + G.colW * (i + 0.5), bw = Math.min(G.narrow ? 14 : 30, G.colW / 5), gap = G.narrow ? 3 : 6;
        FS.k.text(f, c, G.narrow ? task.replace("BrowseComp+ (1K)", "BrowseComp+").replace("OOLONG-Pairs", "Pairs") : task, cx, G.B + 16, { align: "center", size: G.narrow ? 10.5 : 11.5, weight: 600, color: C.fg });
        ORDER.forEach((k, j) => {
          const x = cx + (j - 1) * (bw + gap) - bw / 2, v = S[k].v[i];
          const vis = j < st.show ? (j === st.show - 1 && f.from < f.step && steps[f.from]?.show <= j ? e : 1) : 0;
          if (vis <= 0) { c.strokeStyle = C.line; c.setLineDash([2, 3]); FS.k.rrect(c, x, Y(0) - 1, bw, 1, 0); c.stroke(); c.setLineDash([]); return; }
          const h = (Y(0) - Y(v)) * vis, hot = f.hover === `${k}:${i}`;
          FS.k.rrect(c, x, Y(0) - Math.max(1.5, h), bw, Math.max(1.5, h), 2);
          c.fillStyle = k === "ft" ? C.fg : k === "rlm" ? C.muted : C.lineStrong; c.fill();
          if (S[k].star[i]) { FS.k.rrect(c, x, Y(0) - Math.max(1.5, h), bw, Math.max(1.5, h), 2); c.fillStyle = FS.k.hatch(f, c, C.surface, 4); c.fill(); }
          if (hot) { c.strokeStyle = C.accent; c.lineWidth = 1.5; FS.k.rrect(c, x - 1, Y(0) - Math.max(1.5, h) - 1, bw + 2, Math.max(1.5, h) + 2, 3); c.stroke(); c.lineWidth = 1; }
          if (!G.narrow || k === "ft") FS.k.text(f, c, v.toFixed(1), x + bw / 2, Y(v) - 5, { align: "center", size: G.narrow ? 10 : 10.5, weight: k === "ft" ? 700 : 500, color: k === "ft" ? C.fg : C.muted, alpha: vis });
          hits.push({ key: `${k}:${i}`, x, y: Math.min(Y(v), Y(0) - 12), w: bw, h: Math.max(12, Y(0) - Y(v)) });
        });
        if (st.gpt) {
          const v = S.gpt.v[i], x0 = cx - 1.5 * (bw + gap) - 6, x1 = cx + 1.5 * (bw + gap) + 6, hot = f.hover === `gpt:${i}`;
          c.save(); c.globalAlpha = f.from < f.step ? e : 1;
          c.strokeStyle = hot ? C.accent : C.strong; c.lineWidth = 1.5; c.setLineDash([4, 3]); FS.k.line(c, x0, Y(v), x1, Y(v)); c.setLineDash([]); c.lineWidth = 1;
          FS.k.label(f, c, G.narrow ? `${v.toFixed(1)}` : `GPT-5 ${v.toFixed(1)}`, x1 + 3, Y(v) - (v < 3 ? 8 : 0), { size: 10, weight: 600, color: C.strong });
          c.restore();
          hits.push({ key: `gpt:${i}`, x: x0, y: Y(v) - 5, w: x1 - x0, h: 10 });
        }
        if (st.show === 3) FS.k.text(f, c, `+${(S.ft.v[i] - S.rlm.v[i]).toFixed(1)} pts`, cx, G.B + (G.narrow ? 30 : 32), { align: "center", size: 10.5, alpha: f.step === 2 && f.from < 2 ? e : 1 });
      });
      // key
      const ky = f.h - 12; let kx = G.L;
      ORDER.forEach((k, j) => { if (j >= st.show) return; c.fillStyle = k === "ft" ? C.fg : k === "rlm" ? C.muted : C.lineStrong; FS.k.rrect(c, kx, ky - 8, 10, 10, 2); c.fill(); FS.k.text(f, c, S[k].name, kx + 14, ky + 1, { size: 10.5 }); kx += c.measureText(S[k].name).width + 34; });
      if (st.gpt) { c.strokeStyle = C.strong; c.setLineDash([4, 3]); FS.k.line(c, kx, ky - 3, kx + 14, ky - 3); c.setLineDash([]); FS.k.text(f, c, "base GPT-5", kx + 18, ky + 1, { size: 10.5 }); }
    },
  });
})();
