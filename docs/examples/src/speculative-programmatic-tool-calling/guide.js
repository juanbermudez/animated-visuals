/* Speculative programmatic tool calling: five figures on one worked program.
   Shared first: the six-line cell and the simulated turn that Figs. 1 and 4 both draw from. */
const PROGRAM = [
  'chunks = context.split("\\n\\n")',
  'labels = [llm_query("Label: " + c) for c in chunks[:3]]',
  'tally = llm_query("Count the labels: " + str(labels))',
  'notes = read_file("notes.txt")',
  'review = llm_query("Compare with my notes: " + notes)',
  "print(tally, review)",
];
const SHORT = [
  "chunks = context.split(…)",
  "labels = [llm_query(…) for c in chunks[:3]]",
  "tally = llm_query(… + str(labels))",
  'notes = read_file("notes.txt")',
  "review = llm_query(… + notes)",
  "print(tally, review)",
];
// Illustrative timings, not from the post: text before the code, characters written per second at 1x, a file read.
const THINK = 4, CPS = 16, READ = 0.2;

/* One turn, both ways. Without speculation the cell runs after writing, every call blocking in turn.
   With it, line 2's three calls start together when line 2 is complete, the tally starts when they return
   (or when line 3 is complete, if later), and the real run claims both; the file and the review run after. */
function simulate(call, speed) {
  let t = THINK;
  const lines = PROGRAM.map((s, i) => { const t0 = t; t += s.length / (CPS * speed); return { i, t0, t1: t }; });
  const W = t, e2 = lines[1].t1, e3 = lines[2].t1;
  const plain = [];
  let u = W;
  for (let k = 0; k < 3; k++) { plain.push({ kind: "label", n: k + 1, t0: u, t1: u + call }); u += call; }
  plain.push({ kind: "tally", t0: u, t1: u + call }); u += call;
  plain.push({ kind: "file", t0: u, t1: u + READ }); u += READ;
  plain.push({ kind: "review", t0: u, t1: u + call }); u += call;
  const B = u;
  const spec = [0, 1, 2].map((k) => ({ kind: "label", n: k + 1, sub: k, t0: e2, t1: e2 + call }));
  const s3 = Math.max(e3, e2 + call);
  spec.push({ kind: "tally", t0: s3, t1: s3 + call });
  const tc = Math.max(W, s3 + call);
  spec.push({ kind: "file", t0: tc, t1: tc + READ });
  spec.push({ kind: "review", t0: tc + READ, t1: tc + READ + call });
  const S = tc + READ + call;
  const J = W + 3 * call + READ; // the same calls run at once after writing, with no overlap
  return { lines, W, e2, e3, plain, spec, B, S, J, wait: tc - W > 0.05 ? [W, tc] : null };
}
const sec = (s) => `${s.toFixed(1)} s`;

/* ================= Fig 1: one turn on one clock (canvas, simulated) ================= */
(() => {
  const ID = "fig-turn";
  let P = simulate(4, 1); // from the targets, for readouts and chapters
  const span = () => P.B * 1.06;
  const tips = {
    think: { title: "Text before code", body: "The model writes its reasoning first. There is no code to read yet, so nothing can start." },
    line: { title: "A line of code", body: "A line is complete when the next one begins. Only then can the harness read the calls in it." },
    label: { title: "Label call", body: "One sub-model call per part of the text. Without speculation they run one after another; with it, all three start when line 2 is complete." },
    tally: { title: "Tally call", body: "Needs all three labels. With speculation it starts the moment they return, still during the writing." },
    file: { title: "File read", body: "read_file touches the outside world, so it never runs early. It runs once, for real, after writing ends." },
    review: { title: "Review call", body: "Needs the file's contents, which the copy can't know, so it never starts early." },
    wait: { title: "Waits for the tally", body: "The real program reached line 3 before the early tally returned. It waits for that call instead of making a new one." },
    launch: { title: "Calls start", body: "Line 2 is complete: the copy runs it, and the three label calls start in the background." },
    ends: { title: "Writing ends", body: "The real program now runs the cell from the top. Answers that are already there are handed over at once." },
    answer: { title: "Answer", body: "The cell has finished running: the moment the user is waiting for." },
  };
  const spec = {
    height: (w) => (w < 560 ? 250 : 240),
    duration: 1,
    keyframe: 1,
    formatTime: (t) => `t = ${(t * span()).toFixed(1)} s`,
    timeAxis: (f) => ({ x0: f.w < 560 ? 70 : 128, x1: f.w - 18 }),
    params: {
      call: { value: 4, min: 0.5, max: 12, step: 0.5, label: "Each sub-call takes", unit: " s", format: (v) => `${v.toFixed(1)} s` },
      speed: { value: 1, min: 0.5, max: 3, step: 0.25, label: "Writing speed", format: (v) => `${v.toFixed(2)}×` },
    },
    reserve: {
      clock: ["t = 99.9 s · answered; the other run is still going"],
      specEnd: ["99.9 s"], plainEnd: ["99.9 s"], atOnce: ["99.9 s"], overlap: ["99.9 s"],
    },
    tips,
    tipAt: (f, x, y) => f.state.hits?.find((h) => x >= h.x - 3 && x <= h.x + h.w + 3 && y >= h.y - 2 && y <= h.y + h.h + 2)?.kind ?? null,
    init(f) { f.rate = 1 / 10; outs(f); },
    onParam(f) { P = simulate(f.params.call, f.params.speed); outs(f); },
    render(f, c) {
      const C = f.C, narrow = f.w < 560, Sv = simulate(f.v.call, f.v.speed), s = f.t * span();
      const Lx = narrow ? 70 : 128, R = f.w - 18, X = (v) => Lx + (R - Lx) * (v / span());
      const hits = (f.state.hits = []);
      const rows = { write: { y: 26, h: 26 }, plain: { y: 78, h: 40 }, spec: { y: 138, h: 40 } }, bottom = 206, bracketY = 198;
      // grid and ticks
      const stepS = span() <= 30 ? 5 : span() <= 70 ? 10 : 20;
      c.strokeStyle = C.line; c.lineWidth = 1;
      for (let v = 0; v <= span(); v += stepS) { FS.k.line(c, X(v), 18, X(v), bottom); FS.k.text(f, c, `${v} s`, X(v), bottom + 16, { align: "center", size: 11 }); }
      // lane names
      const name = (txt, sub, r) => {
        FS.k.text(f, c, txt, 0, r.y + r.h / 2 + (sub ? -1 : 4), { color: C.fg, size: 12, weight: 600 });
        if (sub) FS.k.text(f, c, sub, 0, r.y + r.h / 2 + 13, { size: 11 });
      };
      name(narrow ? "Writes" : "Model writes", null, rows.write);
      name("Without", narrow ? null : "speculation", rows.plain);
      name("With", narrow ? null : "speculation", rows.spec);
      const fits = (txt, w, size = 11) => { c.font = FS.k.font(f, size, 500); return c.measureText(txt).width + 10 <= w; };
      // a block that grows with the clock; kind decides the fill
      const block = (kind, t0, t1, y, h, label, live) => {
        const grow = FS.clamp((s - t0) / Math.max(1e-6, t1 - t0));
        if (grow <= 0) return;
        const x0 = X(t0), w = Math.max(1.5, (X(t1) - x0) * grow - 1.5), hot = f.hover === kind || live;
        hits.push({ kind, x: x0, y, w, h });
        FS.k.rrect(c, x0, y, w, h, 3);
        if (kind === "think") { c.fillStyle = C.lineStrong; c.fill(); }
        else if (kind === "line") { c.fillStyle = C.surface2; c.fill(); }
        else if (kind === "file") { c.fillStyle = C.fg; c.fill(); }
        else { c.fillStyle = C.surface2; c.fill(); FS.k.rrect(c, x0, y, w, h, 3); c.fillStyle = FS.k.hatch(f, c, C.muted, 5); c.fill(); }
        c.strokeStyle = hot ? C.fg : C.line; c.lineWidth = hot ? 1.5 : 1; c.stroke(); c.lineWidth = 1;
        if (label && grow === 1 && fits(label, w)) FS.k.label(f, c, label, x0 + w / 2, y + h / 2, { size: 11, align: "center", halo: kind === "think" ? C.lineStrong : C.surface2 });
      };
      // the model writing
      block("think", 0, THINK, rows.write.y, rows.write.h, "text", s > 0 && s < THINK);
      Sv.lines.forEach((ln) => block("line", ln.t0, ln.t1, rows.write.y, rows.write.h, String(ln.i + 1), s > ln.t0 && s < ln.t1));
      // without speculation: one call after another, after writing
      for (const b of Sv.plain) block(b.kind, b.t0, b.t1, rows.plain.y, rows.plain.h, b.kind === "label" ? (narrow ? `${b.n}` : `label ${b.n}`) : b.kind === "file" ? "" : b.kind, s > b.t0 && s < b.t1);
      // with speculation: three labels stacked, then the tally, then what is left after writing
      const sh = (rows.spec.h - 4) / 3;
      for (const b of Sv.spec) {
        if (b.kind === "label") block("label", b.t0, b.t1, rows.spec.y + b.sub * (sh + 2), sh, "", s > b.t0 && s < b.t1);
        else block(b.kind, b.t0, b.t1, rows.spec.y, rows.spec.h, b.kind === "file" ? "" : b.kind, s > b.t0 && s < b.t1);
      }
      if (s >= Sv.spec[0].t0) {
        const room = X(Sv.e2) - Lx - 10, txt = fits("3 labels at once", room) ? "3 labels at once" : fits("3 at once", room) ? "3 at once" : "";
        if (txt) { FS.k.text(f, c, txt, X(Sv.e2) - 8, rows.spec.y + rows.spec.h / 2 + 4, { align: "right", size: 11, color: C.muted }); hits.push({ kind: "label", x: X(Sv.e2) - room, y: rows.spec.y + 8, w: room - 4, h: 24 }); }
      }
      if (Sv.wait && s > Sv.wait[0]) {
        const x0 = X(Sv.wait[0]), x1 = X(Math.min(s, Sv.wait[1])), y = rows.spec.y + rows.spec.h + 5;
        hits.push({ kind: "wait", x: x0, y: y - 6, w: Math.max(4, x1 - x0), h: 9 });
        c.strokeStyle = f.hover === "wait" ? C.fg : C.muted; c.lineWidth = 2; FS.k.line(c, x0, y, x1, y); c.lineWidth = 1;
      }
      // line 2 complete: the calls start (a dashed drop from the writing lane)
      if (s >= Sv.e2) {
        const x = X(Sv.e2), a = FS.window(s, Sv.e2, Sv.e2 + span() * 0.02);
        hits.push({ kind: "launch", x: x - 4, y: rows.write.y + rows.write.h, w: 8, h: rows.spec.y - rows.write.y - rows.write.h });
        c.save(); c.globalAlpha = a; c.strokeStyle = f.hover === "launch" ? C.fg : C.muted; c.setLineDash([3, 3]);
        FS.k.line(c, x, rows.write.y + rows.write.h + 2, x, rows.spec.y - 2); c.restore();
      }
      // writing ends: the real program starts
      if (s >= Sv.W) {
        const x = X(Sv.W);
        hits.push({ kind: "ends", x: x - 4, y: rows.plain.y - 14, w: 8, h: rows.spec.y + rows.spec.h - rows.plain.y + 14 });
        c.save(); c.strokeStyle = f.hover === "ends" ? C.fg : C.lineStrong; c.setLineDash([2, 3]); FS.k.line(c, x, rows.plain.y - 6, x, rows.spec.y + rows.spec.h + 4); c.restore();
        FS.k.label(f, c, "writing ends", x + 5, rows.plain.y - 9, { size: 11, color: C.muted, weight: 500 });
      }
      // answers
      const answer = (t, r) => {
        if (s < t) return;
        const x = X(t), y = r.y + r.h / 2;
        hits.push({ kind: "answer", x: x - 6, y: y - 6, w: 12, h: 12 });
        c.fillStyle = C.surface; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill();
        c.fillStyle = C.accent; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill();
      };
      answer(Sv.B, rows.plain); answer(Sv.S, rows.spec);
      // the saving, computed from the same numbers, once the slower run answers
      const reveal = FS.window(s, Sv.B, Sv.B + span() * 0.03, FS.ease.out);
      if (reveal > 0) FS.k.bracket(f, c, X(Sv.S), X(Sv.B), bracketY, `${sec(Sv.B - Sv.S)} sooner · ${(Sv.B / Sv.S).toFixed(2)}×`, { alpha: reveal });
      FS.k.hoverTime(f, c, 18, bottom, (t) => X(t * span()), (t) => sec(t * span()));
      FS.k.playhead(f, c, X(s), 18, bottom);
      f.api.out("clock", `t = ${s.toFixed(1)} s · ${phase(Sv, s)}`);
    },
  };
  // Chapters follow the parameters: line 2 complete, writing ends, each answer.
  Object.defineProperty(spec, "chapters", { get: () => [P.e2, P.W, P.S, P.B].map((t, i) => ({ t: t / span(), label: ["line 2 complete", "writing ends", "answer with", "answer without"][i] })) });
  function phase(Sv, s) {
    if (s >= Sv.B) return "both answered";
    if (s >= Sv.S) return "answered; the other run is still going";
    if (s < THINK) return "the model writes text";
    const running = Sv.spec.filter((b) => b.kind !== "file" && s >= b.t0 && s < b.t1);
    const what = running.length === 3 ? "3 label calls running" : running.some((b) => b.kind === "tally") ? "tally running" : running.some((b) => b.kind === "review") ? "review running" : "";
    if (s < Sv.W) return what ? `writing, ${what}` : "writing code";
    if (Sv.wait && s < Sv.wait[1]) return "real run waits for the tally";
    return what || "real run reads the file";
  }
  function outs(f) {
    f.api.out("specEnd", sec(P.S)); f.api.out("plainEnd", sec(P.B));
    f.api.out("atOnce", sec(P.B - P.J)); f.api.out("overlap", sec(P.J - P.S));
    f.api.out("summary", `Without speculation the answer lands at ${sec(P.B)}; with it, at ${sec(P.S)}: ${sec(P.B - P.S)} sooner (${(P.B / P.S).toFixed(2)}×).`);
  }
  FS.figure(ID, spec);
})();

/* ================= Fig 2: the shadow copy, stepped (SVG) ================= */
(() => {
  const ID = "fig-shadow", NS = "http://www.w3.org/2000/svg", svg = document.getElementById(ID);
  const el = (tag, attrs, parent = svg) => { const n = document.createElementNS(NS, tag); for (const a in attrs) n.setAttribute(a, attrs[a]); parent.append(n); return n; };
  const VARS = ["context", "chunks", "labels", "tally", "notes", "review"];
  const value = (name, s) => ({
    context: "a copy of the text",
    chunks: s >= 1 ? "the parts of the text" : "",
    labels: s >= 3 ? "3 answers" : s >= 2 ? "3 promises" : "",
    tally: s >= 5 ? "an answer" : s >= 3 ? "a promise" : "",
    notes: s >= 4 ? "unknown: not run" : "",
    review: s >= 5 ? "skipped" : "",
  })[name];
  const CALLS = [
    { key: "label 1" }, { key: "label 2" }, { key: "label 3" }, { key: "tally" }, { key: "review" },
  ];
  const callState = (i, s) => {
    if (i < 3) return s >= 6 ? "handed over" : s >= 3 ? "ready" : s >= 2 ? "running" : "";
    if (i === 3) return s >= 6 ? "handed over" : s >= 5 ? "ready" : s >= 3 ? "running" : "";
    return s >= 7 ? "runs now, normally" : s >= 5 ? "not started" : "";
  };
  const realState = (i, s) => {
    if (s < 6) return "waiting";
    if (s === 6) return ["ran", "3 handed over", "handed over", "next", "", ""][i];
    return ["ran", "3 handed over", "handed over", "reads the file", "calls now", "prints"][i];
  };
  const steps = [
    { line: -1, caption: "Before the code starts, the harness deep-copies the program's variables. The copy runs ahead; the real program waits." },
    { line: 0, caption: "Line 1 is complete. It's plain code, so the copy runs it: chunks now holds the parts of the text." },
    { line: 1, caption: "Line 2 is complete. Its three calls have known inputs, so the copy starts all three at once and gets promises back." },
    { line: 2, caption: "Line 3 needs labels. The copy waits for the three answers, then starts the tally. The model is still writing." },
    { line: 3, caption: "Line 4 reads a file. That touches the outside world, so the copy doesn't run it: notes is unknown." },
    { line: 4, caption: "Line 5 needs notes. Its input is unknown, so the review isn't started early. Meanwhile the tally has come back." },
    { line: 5, caption: "Writing ends. The copy is thrown away and the real program runs the cell from the top. Four answers are waiting." },
    { line: 5, caption: "Lines 4 and 5 run the normal way: the file is read for real, and the review calls the sub-model now." },
  ];
  const tipsFor = {
    code: ["The program so far", "What the model has written. A line counts once the next one begins; unwritten lines are grey bars."],
    copy: ["The copy", "A deep copy of the REPL's variables. It runs each complete line, starts safe calls in the background, and is thrown away at the end."],
    store: ["Early calls", "Calls the copy started, filed by their inputs and occurrence. The real program claims them by asking for the same call."],
    real: ["The real program", "The REPL the user's state lives in. It runs nothing until the cell is complete, then runs all of it."],
  };
  const panels = {};
  for (const key of ["code", "copy", "store", "real"]) {
    const g = el("g", { tabindex: "0", role: "img", "aria-label": `${tipsFor[key][0]}: ${tipsFor[key][1]}`, "data-fs-tip": tipsFor[key][1], "data-fs-tip-title": tipsFor[key][0] });
    panels[key] = { g, rect: el("rect", { rx: 8 }, g), head: el("text", { "font-size": 11, "font-weight": 600, "letter-spacing": "0.06em" }, g), tag: el("text", { "font-size": 11, "font-weight": 600, "text-anchor": "end" }, g) };
    panels[key].head.textContent = tipsFor[key][0].toUpperCase();
    g.addEventListener("pointerenter", () => FS.get(ID).hover(key)); g.addEventListener("pointerleave", () => FS.get(ID).hover(null));
    g.addEventListener("focus", () => FS.get(ID).hover(key)); g.addEventListener("blur", () => FS.get(ID).hover(null));
  }
  const codeRows = SHORT.map((src, i) => {
    const g = el("g", {}, panels.code.g);
    const r = { g, bg: el("rect", { rx: 4 }, g), rule: el("rect", { width: 2, rx: 1 }, g), num: el("text", { "font-size": 11, "text-anchor": "end" }, g), txt: el("text", { "font-size": 12 }, g), bar: el("rect", { height: 3, rx: 1.5 }, g) };
    r.num.textContent = String(i + 1); r.txt.textContent = src; r.txt.style.fontFamily = "var(--fs-font-mono)";
    return r;
  });
  const varRows = VARS.map((name) => {
    const g = el("g", {}, panels.copy.g);
    const r = { g, k: el("text", { "font-size": 12 }, g), v: el("text", { "font-size": 11 }, g), line: el("rect", { height: 1 }, g) };
    r.k.textContent = name; r.k.style.fontFamily = "var(--fs-font-mono)";
    return r;
  });
  const callRows = CALLS.map((cl) => {
    const g = el("g", {}, panels.store.g);
    const r = { g, pill: el("rect", { rx: 13, height: 26 }, g), k: el("text", { "font-size": 11.5, "font-weight": 600 }, g), v: el("text", { "font-size": 11, "text-anchor": "end" }, g) };
    r.k.textContent = cl.key;
    return r;
  });
  const realCells = PROGRAM.map((_, i) => {
    const g = el("g", {}, panels.real.g);
    const r = { g, box: el("rect", { rx: 6, height: 40 }, g), k: el("text", { "font-size": 11, "font-weight": 600 }, g), v: el("text", { "font-size": 11 }, g) };
    r.k.textContent = `line ${i + 1}`;
    return r;
  });
  const realNote = el("text", { "font-size": 11.5 }, panels.real.g);
  let L = null;
  function layout(w) {
    const narrow = w < 560;
    L = narrow
      ? { box: [360, 890], code: [8, 8, 344, 238], copy: [8, 262, 344, 236], store: [8, 514, 344, 210], real: [8, 740, 344, 142], rowH: 32, cols: 3 }
      : { box: [960, 420], code: [8, 8, 430, 282], copy: [454, 8, 238, 282], store: [708, 8, 244, 282], real: [8, 306, 944, 106], rowH: 36, cols: 6 };
    svg.setAttribute("viewBox", `0 0 ${L.box[0]} ${L.box[1]}`);
    for (const [key, p] of Object.entries(panels)) {
      const [x, y, pw, ph] = L[key];
      Object.assign(p.rect, {}); p.rect.setAttribute("x", x); p.rect.setAttribute("y", y); p.rect.setAttribute("width", pw); p.rect.setAttribute("height", ph);
      p.head.setAttribute("x", x + 14); p.head.setAttribute("y", y + 22);
      p.tag.setAttribute("x", x + pw - 14); p.tag.setAttribute("y", y + 22);
    }
    const [cx, cy, cw] = L.code;
    codeRows.forEach((r, i) => {
      const y = cy + 36 + i * L.rowH;
      r.bg.setAttribute("x", cx + 8); r.bg.setAttribute("y", y); r.bg.setAttribute("width", cw - 16); r.bg.setAttribute("height", L.rowH - 6);
      r.rule.setAttribute("x", cx + 8); r.rule.setAttribute("y", y); r.rule.setAttribute("height", L.rowH - 6);
      r.num.setAttribute("x", cx + 30); r.num.setAttribute("y", y + (L.rowH - 6) / 2 + 4);
      r.txt.setAttribute("x", cx + 40); r.txt.setAttribute("y", y + (L.rowH - 6) / 2 + 4); r.txt.setAttribute("font-size", narrow ? 11 : 12);
      r.bar.setAttribute("x", cx + 40); r.bar.setAttribute("y", y + (L.rowH - 6) / 2 - 1); r.bar.setAttribute("width", Math.min(cw - 60, SHORT[i].length * (narrow ? 6.2 : 6.9)));
    });
    const [vx, vy, vw] = L.copy;
    varRows.forEach((r, i) => {
      const y = vy + 36 + i * L.rowH + (L.rowH - 6) / 2 + 4;
      r.k.setAttribute("x", vx + 14); r.k.setAttribute("y", y);
      r.v.setAttribute("x", vx + (narrow ? 110 : 84)); r.v.setAttribute("y", y);
      r.line.setAttribute("x", vx + 14); r.line.setAttribute("y", y + 9); r.line.setAttribute("width", vw - 28);
    });
    const [sx, sy, sw] = L.store, sRow = narrow ? 32 : L.rowH;
    callRows.forEach((r, i) => {
      const y = sy + 36 + i * sRow;
      r.pill.setAttribute("x", sx + 12); r.pill.setAttribute("y", y); r.pill.setAttribute("width", sw - 24);
      r.k.setAttribute("x", sx + 26); r.k.setAttribute("y", y + 17);
      r.v.setAttribute("x", sx + sw - 26); r.v.setAttribute("y", y + 17);
    });
    const [rx, ry, rw] = L.real;
    realNote.setAttribute("x", narrow ? rx + 14 : rx + 190); realNote.setAttribute("y", ry + (narrow ? 44 : 22));
    const cellW = narrow ? (rw - 28 - 2 * 6) / 3 : (rw - 28 - 5 * 8) / 6;
    realCells.forEach((r, i) => {
      const col = narrow ? i % 3 : i, row = narrow ? Math.floor(i / 3) : 0;
      const x = rx + 14 + col * (cellW + (narrow ? 6 : 8)), y = ry + (narrow ? 58 : 46) + row * 40;
      r.box.setAttribute("x", x); r.box.setAttribute("y", y); r.box.setAttribute("width", cellW); r.box.setAttribute("height", narrow ? 34 : 44);
      r.k.setAttribute("x", x + 10); r.k.setAttribute("y", y + (narrow ? 14 : 18));
      r.v.setAttribute("x", x + 10); r.v.setAttribute("y", y + (narrow ? 27 : 34));
    });
    L.narrow = narrow;
  }
  FS.figure(ID, {
    height: (w) => (w < 560 ? (w * 890) / 360 : (w * 420) / 960),
    steps,
    resize(f) { layout(f.w); },
    render(f) {
      const C = f.C, s = f.step, st = steps[s], thrown = s >= 6;
      for (const [key, p] of Object.entries(panels)) {
        const hot = f.hover === key;
        p.rect.setAttribute("fill", C.surface); p.rect.setAttribute("stroke", hot ? C.accent : C.line); p.rect.setAttribute("stroke-width", hot ? 1.5 : 1);
        p.head.setAttribute("fill", C.muted);
        p.tag.setAttribute("fill", C.muted);
      }
      panels.copy.tag.textContent = thrown ? "thrown away" : "";
      panels.copy.g.setAttribute("opacity", thrown && f.hover !== "copy" ? C.dim : 1);
      panels.code.tag.textContent = s >= 6 ? "complete" : s === 0 ? "writing…" : `line ${st.line + 1} complete`;
      // the program as written so far
      codeRows.forEach((r, i) => {
        const written = i <= st.line, now = i === st.line && s <= 5;
        r.txt.setAttribute("opacity", written ? 1 : 0); r.bar.setAttribute("opacity", written ? 0 : 1);
        r.bar.setAttribute("fill", C.line);
        r.txt.setAttribute("fill", C.fg); r.num.setAttribute("fill", C.muted);
        r.bg.setAttribute("fill", now ? C.surface2 : "none");
        r.rule.setAttribute("fill", now ? C.accent : "none");
      });
      // the copy's variables
      varRows.forEach((r, i) => {
        const v = value(VARS[i], Math.min(s, 5)), fresh = v && v !== value(VARS[i], Math.min(s, 5) - 1) && s <= 5 && s > 0;
        r.v.textContent = v || "·";
        r.k.setAttribute("fill", v ? C.fg : C.muted); r.v.setAttribute("fill", fresh ? C.fg : C.muted);
        r.v.setAttribute("font-weight", fresh ? 600 : 400);
        r.line.setAttribute("fill", C.line);
      });
      // the store of early calls
      callRows.forEach((r, i) => {
        const v = callState(i, s), handed = v === "handed over", off = v === "not started", none = !v;
        r.v.textContent = v || "·";
        r.g.setAttribute("opacity", none ? C.dim : 1);
        r.pill.setAttribute("fill", handed ? C.fg : C.surface);
        r.pill.setAttribute("stroke", off ? C.lineStrong : none ? C.line : C.fg);
        r.pill.setAttribute("stroke-dasharray", v === "running" || v.startsWith("runs") ? "4 3" : off ? "1 3" : "");
        r.k.setAttribute("fill", handed ? C.surface : C.fg); r.v.setAttribute("fill", handed ? C.surface : C.muted);
      });
      // the real program
      realNote.textContent = L.narrow
        ? (s < 6 ? "Waits for the whole cell; untouched." : s === 6 ? "Runs the cell; answers are waiting." : "4 of 5 sub-calls were done. 1 runs now.")
        : (s < 6 ? "Waits for the whole cell. Its variables haven't changed." : s === 6 ? "Runs the cell from the top. Lines 2 and 3 find their answers waiting." : "Four of the five sub-calls were done before it asked. One runs now.");
      realNote.setAttribute("fill", s < 6 ? C.muted : C.fg);
      realCells.forEach((r, i) => {
        const v = realState(i, s), active = s >= 6 && v && v !== "next";
        r.v.textContent = v || "·";
        r.box.setAttribute("fill", active && /handed/.test(v) ? C.surface2 : C.surface);
        r.box.setAttribute("stroke", active ? C.fg : C.line);
        r.k.setAttribute("fill", active ? C.fg : C.muted); r.v.setAttribute("fill", active ? C.fg : C.muted);
      });
    },
  });
})();

/* ================= Fig 3: the life of one call (SVG state machine with tabs) ================= */
(() => {
  const ID = "fig-life", NS = "http://www.w3.org/2000/svg", svg = document.getElementById(ID);
  const el = (tag, attrs, parent = svg) => { const n = document.createElementNS(NS, tag); for (const a in attrs) n.setAttribute(a, attrs[a]); parent.append(n); return n; };
  const states = {
    closes: { label: "Line complete", sub: "the call can be read", tip: "The harness only reads a call once its line is complete, so it knows the whole call and its inputs." },
    check: { label: "Inputs safe?", sub: "known, no side effects", tip: "The tool must be marked speculatable and pure, and every input must come from code the copy could run safely." },
    wait: { label: "Waits for inputs", sub: "an earlier early call", tip: "Safe, but an input is still a promise from another early call. The copy waits for it; the model keeps writing." },
    started: { label: "Started early", sub: "a promise, filed by inputs", tip: "Runs in the background. Its answer is filed under its inputs and its occurrence, so repeated identical calls stay separate." },
    claimed: { label: "Handed over", sub: "no new call made", tip: "The real program asks for the same call and gets the filed answer, at once if it is ready, or as soon as it is." },
    thrown: { label: "Thrown away", sub: "nobody asked for it", tip: "The real program never asked: the cell failed, or later code changed the call. Only the copy saw it, so nothing needs undoing." },
    normal: { label: "Runs after writing", sub: "the normal way", tip: "Not started early. The real program makes the call itself when it reaches the line, exactly as without speculation." },
  };
  const trans = [
    { key: "a", a: "closes", b: "check", label: "", side: ["above", "right"] },
    { key: "b", a: "check", b: "started", label: "yes", side: ["above", "right"] },
    { key: "c", a: "check", b: "wait", label: "not ready", side: ["left", "left"], at: 0.3 },
    { key: "d", a: "wait", b: "started", label: "inputs arrive", side: ["right", "left"] },
    { key: "e", a: "check", b: "normal", label: "no", side: ["right", "right"] },
    { key: "f", a: "started", b: "claimed", label: "real program asks", side: ["left", "left"], at: 0.8, dy: -10 },
    { key: "g", a: "started", b: "thrown", label: "never asked", side: ["left", "right"], at: 0.8, dy: 12 },
  ];
  const CALLS = {
    label: { path: ["closes", "check", "started", "claimed"], at: [-1, 0, 1, 2, 3], caps: [
      "Line 2 is complete, so the harness can read the call and its input: “Label: ” plus one part of the text.",
      "The input comes from plain code and llm_query is marked safe, so the call can start now.",
      "It starts in the background, filed under its input. Three such calls, three separate slots.",
      "The real program reaches line 2, finds the answer filed under the same input, and gets it at once."] },
    tally: { path: ["closes", "check", "wait", "started", "claimed"], at: [-1, 0, 2, 3, 4], caps: [
      "Line 3 is complete. Its input is labels, which are still three promises.",
      "Safe, but not ready: the copy waits for the three labels while the model keeps writing.",
      "The labels arrive and the tally starts, still before the writing ends.",
      "The real program reaches line 3. If the tally is still running, it waits for that call, never a new one."] },
    review: { path: ["closes", "check", "normal"], at: [-1, 0, 1, 2, 2], caps: [
      "Line 5 is complete. Its input is notes, from read_file on line 4.",
      "read_file touches the outside world, so the copy never ran it. notes is unknown, so the call is not safe.",
      "Not started. After writing ends, the real program reads the file and makes this call itself.",
      "That costs a full call after the writing, which is why the review sits at the end of Fig. 1."] },
    typo: { path: ["closes", "check", "started", "thrown"], at: [-1, 1, 2, 2, 3], caps: [
      "The same label call as before: line 2 is complete and its input is safe.",
      "It starts early, as before.",
      "Then the model ends the cell with a typo. The cell can't run, so nothing ever asks for the label.",
      "Its answer is thrown away. The real variables never saw it; the cost is one wasted sub-call."] },
  };
  const OPTIONS = [{ value: "label", label: "A label call" }, { value: "tally", label: "The tally" }, { value: "review", label: "The review" }, { value: "typo", label: "A typo at the end" }];
  const G = { states: {}, trans: {} };
  for (const t of trans) {
    const g = el("g", {});
    G.trans[t.key] = { g, path: el("path", { fill: "none" }, g), head: el("path", {}, g), lbl: el("text", { "font-size": 11, "text-anchor": "middle" }, g), length: 1 };
    G.trans[t.key].lbl.textContent = t.label;
  }
  for (const [key, s] of Object.entries(states)) {
    const g = el("g", { tabindex: "0", role: "img", "aria-label": `${s.label}: ${s.tip}`, "data-fs-tip": s.tip, "data-fs-tip-title": s.label });
    G.states[key] = { g, rect: el("rect", { rx: 22, height: 44 }, g), t1: el("text", { "font-size": 12.5, "font-weight": 600, "text-anchor": "middle" }, g), t2: el("text", { "font-size": 11, "text-anchor": "middle" }, g) };
    G.states[key].t1.textContent = s.label; G.states[key].t2.textContent = s.sub;
    g.addEventListener("pointerenter", () => FS.get(ID).hover(key)); g.addEventListener("pointerleave", () => FS.get(ID).hover(null));
    g.addEventListener("focus", () => FS.get(ID).hover(key)); g.addEventListener("blur", () => FS.get(ID).hover(null));
  }
  const token = el("circle", { r: 6 });
  let P = {}, W = 170, narrow = false;
  function layout(w) {
    narrow = w < 560;
    const box = narrow ? [360, 430] : [960, 330];
    svg.setAttribute("viewBox", `0 0 ${box[0]} ${box[1]}`);
    W = narrow ? 140 : 170;
    P = narrow
      ? { closes: [180, 32], check: [180, 118], wait: [80, 208], normal: [280, 208], started: [180, 296], claimed: [86, 392], thrown: [274, 392] }
      : { closes: [100, 160], check: [300, 160], wait: [500, 58], started: [630, 160], claimed: [862, 76], thrown: [862, 244], normal: [300, 284] };
    for (const [key, s] of Object.entries(G.states)) {
      const [cx, cy] = P[key];
      s.rect.setAttribute("x", cx - W / 2); s.rect.setAttribute("y", cy - 22); s.rect.setAttribute("width", W);
      s.t1.setAttribute("x", cx); s.t1.setAttribute("y", cy - 2); s.t2.setAttribute("x", cx); s.t2.setAttribute("y", cy + 13);
      s.t1.setAttribute("font-size", narrow ? 12 : 12.5);
    }
    // anchor on the box edge facing the other node
    const anchor = (from, to) => {
      const [x, y] = P[from], [tx, ty] = P[to], dx = tx - x, dy = ty - y;
      if (Math.abs(dy) < 30) return [x + Math.sign(dx) * W / 2, y];
      if (Math.abs(dx) < 30) return [x, y + Math.sign(dy) * 22];
      return narrow ? [x + Math.sign(dx) * Math.min(W / 2 - 18, Math.abs(dx) * 0.5), y + Math.sign(dy) * 22] : [x + Math.sign(dx) * (W / 2 - 24), y + Math.sign(dy) * 22];
    };
    for (const t of trans) {
      const o = G.trans[t.key], a = anchor(t.a, t.b), b = anchor(t.b, t.a);
      const d = Math.abs(a[1] - b[1]) < 2 || Math.abs(a[0] - b[0]) < 2 ? `M${a[0]},${a[1]} L${b[0]},${b[1]}` : `M${a[0]},${a[1]} C${a[0]},${(a[1] + b[1]) / 2} ${b[0]},${(a[1] + b[1]) / 2} ${b[0]},${b[1]}`;
      o.path.setAttribute("d", d); o.length = o.path.getTotalLength();
      const end = o.path.getPointAtLength(o.length), near = o.path.getPointAtLength(Math.max(0, o.length - 8)), ang = Math.atan2(end.y - near.y, end.x - near.x);
      o.head.setAttribute("d", `M${end.x},${end.y} L${end.x - 8 * Math.cos(ang - 0.45)},${end.y - 8 * Math.sin(ang - 0.45)} L${end.x - 8 * Math.cos(ang + 0.45)},${end.y - 8 * Math.sin(ang + 0.45)} Z`);
      const mid = o.path.getPointAtLength(o.length * (narrow ? 0.5 : t.at ?? 0.5)), side = t.side[narrow ? 1 : 0];
      o.lbl.setAttribute("x", mid.x + (side === "left" ? -9 : side === "right" ? 9 : 0)); o.lbl.setAttribute("y", mid.y + (side === "above" ? -8 : 4) + (narrow ? 0 : t.dy ?? 0));
      o.lbl.setAttribute("text-anchor", side === "left" ? "end" : side === "right" ? "start" : "middle");
    }
  }
  const edgeOf = (a, b) => trans.find((t) => t.a === a && t.b === b);
  const callOf = (f) => CALLS[f.params.call];
  FS.figure(ID, {
    height: (w) => (w < 560 ? (w * 430) / 360 : (w * 330) / 960),
    params: { call: { value: "label", label: "Which call", options: OPTIONS, placement: "inline" } },
    steps: [0, 1, 2, 3, 4].map((i) => ({ caption: (f) => (i === 0 ? "Every call the copy finds goes through these states. Step through to follow this one." : callOf(f).caps[i - 1]) })),
    onParam(f) { f.api.goto(1); f.dirty = true; },
    resize(f) { layout(f.w); },
    render(f) {
      const C = f.C, cl = callOf(f), at = cl.at[f.step], prevAt = cl.at[f.from] ?? -1, e = FS.ease.inOut(f.stepT);
      const lit = new Set(at >= 0 ? cl.path.slice(0, at + 1) : []);
      const walked = new Set();
      for (let i = 0; i < at; i++) walked.add(edgeOf(cl.path[i], cl.path[i + 1])?.key);
      const moved = at > prevAt && at > 0 && f.from < f.step;
      const via = moved ? edgeOf(cl.path[at - 1], cl.path[at])?.key : null;
      for (const [key, st] of Object.entries(G.states)) {
        const on = lit.has(key) || at < 0, hot = f.hover === key, here = at >= 0 && key === cl.path[at] && (f.stepT >= 1 || !via);
        st.g.setAttribute("opacity", hot || on ? 1 : C.dim);
        st.rect.setAttribute("fill", here ? C.fg : C.surface);
        st.rect.setAttribute("stroke", hot ? C.accent : on && at >= 0 ? C.fg : C.lineStrong); st.rect.setAttribute("stroke-width", hot ? 1.5 : 1);
        st.t1.setAttribute("fill", here ? C.surface : C.fg); st.t2.setAttribute("fill", here ? C.surface : C.muted);
      }
      for (const t of trans) {
        const o = G.trans[t.key], active = t.key === via || (walked.has(t.key) && t.key === edgeOf(cl.path[at - 1], cl.path[at])?.key);
        const on = walked.has(t.key) || at < 0;
        o.g.setAttribute("opacity", active ? 1 : on ? 0.75 : 0.22);
        o.path.setAttribute("stroke", active ? C.accent : C.muted); o.path.setAttribute("stroke-width", active ? 1.75 : C.edge);
        o.head.setAttribute("fill", active ? C.accent : C.muted);
        o.lbl.setAttribute("fill", active ? C.fg : C.muted);
        o.lbl.setAttribute("stroke", C.surface); o.lbl.setAttribute("stroke-width", 5); o.lbl.setAttribute("stroke-linejoin", "round"); o.lbl.setAttribute("paint-order", "stroke");
        o.lbl.setAttribute("opacity", narrow && !active ? 0 : 1);
      }
      const v = via && G.trans[via];
      if (v && f.stepT < 1) { const p = v.path.getPointAtLength(v.length * e); token.setAttribute("cx", p.x); token.setAttribute("cy", p.y); token.setAttribute("opacity", 1); }
      else token.setAttribute("opacity", 0);
      token.setAttribute("fill", C.accent); token.setAttribute("stroke", C.surface); token.setAttribute("stroke-width", 1.5);
    },
  });
})();

/* ================= Fig 4: when it pays (canvas chart with a draggable line, simulated) ================= */
(() => {
  const ID = "fig-gain", CMIN = 0.5, CMAX = 12, BAND = [1, 1.2];
  const ratio = (c, speed) => { const s = simulate(c, speed); return { full: s.B / s.S, once: s.B / s.J, saved: s.B - s.S }; };
  const peakOf = (speed) => { let best = { c: CMIN, r: 0 }; for (let c = CMIN; c <= CMAX + 1e-9; c += 0.05) { const r = ratio(c, speed).full; if (r > best.r) best = { c, r }; } return best; };
  const geo = (f) => { const narrow = f.w < 560, L = narrow ? 44 : 52, R = f.w - (narrow ? 14 : 22), T = 22, B = f.h - 40; return { L, R, T, B, narrow }; };
  const yMax = (f) => Math.max(2, Math.ceil((peakOf(f.v.speed).r + 0.12) * 10) / 10);
  const X = (f, c) => { const g = geo(f); return g.L + (g.R - g.L) * ((c - CMIN) / (CMAX - CMIN)); };
  const Y = (f, r) => { const g = geo(f); return g.B - (g.B - g.T) * ((r - 0.9) / (yMax(f) - 0.9)); };
  const invX = (f, x) => { const g = geo(f); return CMIN + ((x - g.L) / (g.R - g.L)) * (CMAX - CMIN); };
  const tips = {
    band: { title: "Measured range", body: "The post's summary for its RLM benchmark: speed-ups of about 1 to 1.2×. Everything else on this chart is the simulated turn." },
    full: { title: "With speculation", body: "Plain run time divided by speculative run time, for the worked turn, as each sub-call gets longer." },
    once: { title: "Running at once only", body: "If the same calls started together only after writing ended: the JIT part of the saving, without any overlap." },
    peak: { title: "The peak", body: "Where the tally just finishes as writing ends. Shorter calls leave writing time unused; longer ones run past it." },
  };
  const fig = FS.figure(ID, {
    height: (w) => (w < 560 ? 280 : 300),
    params: {
      call: { value: 4, min: CMIN, max: CMAX, step: 0.1, label: "Each sub-call takes", hidden: true },
      speed: { value: 1, min: 0.5, max: 3, step: 0.25, label: "Writing speed", format: (v) => `${v.toFixed(2)}×` },
    },
    reserve: { peak: ["about 9.99× when each call takes 99.9 s"] },
    tips,
    tipAt: (f, x, y) => f.state.hits?.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)?.kind ?? null,
    handles: {
      line: {
        label: "Sub-call length: drag or use the arrow keys",
        radius: 22,
        get: (f) => ({ x: X(f, f.params.call), y: (geo(f).T + geo(f).B) / 2 }),
        set: (f, x) => { const v = invX(f, x); f.state.raw = v; f.api.set("call", FS.clamp(v, CMIN, CMAX), { instant: true }); },
        bounds: (f) => { const g = geo(f), y = (g.T + g.B) / 2; return { x0: X(f, CMIN), x1: X(f, CMAX), y0: y, y1: y }; },
        step: 12,
      },
    },
    init(f) { outs(f); },
    onParam(f) { outs(f); },
    render(f, c) {
      const C = f.C, g = geo(f), hits = (f.state.hits = []), speed = f.v.speed, cNow = f.v.call;
      // band: the post's measured range
      const yb0 = Y(f, BAND[1]), yb1 = Y(f, BAND[0]);
      c.fillStyle = C.surface2; c.fillRect(g.L, yb0, g.R - g.L, yb1 - yb0);
      hits.push({ kind: "band", x: g.L, y: yb0, w: g.R - g.L, h: yb1 - yb0 });
      FS.k.text(f, c, g.narrow ? "measured: 1 to 1.2× (post)" : "measured on the benchmark: 1 to 1.2× (post)", g.R - 8, yb1 - 6, { align: "right", size: 11, color: C.fg });
      // grid
      c.strokeStyle = C.line; c.lineWidth = 1;
      for (let r = 1; r <= yMax(f) + 1e-9; r += 0.5) { FS.k.line(c, g.L, Y(f, r), g.R, Y(f, r)); FS.k.text(f, c, `${r.toFixed(1)}×`, g.L - 8, Y(f, r) + 4, { align: "right", size: 11 }); }
      for (let v = 2; v <= CMAX; v += 2) FS.k.text(f, c, `${v} s`, X(f, v), g.B + 16, { align: "center", size: 11 });
      FS.k.text(f, c, "length of each sub-call →", g.R, g.B + 32, { align: "right", size: 11 });
      // curves
      const curve = (key, dash, color, width) => {
        c.save(); c.strokeStyle = color; c.lineWidth = width; if (dash) c.setLineDash(dash);
        c.beginPath();
        for (let i = 0; i <= 160; i++) { const cc = CMIN + (CMAX - CMIN) * (i / 160), y = Y(f, ratio(cc, speed)[key]); i ? c.lineTo(X(f, cc), y) : c.moveTo(X(f, cc), y); }
        c.stroke(); c.restore();
      };
      curve("once", [5, 4], f.hover === "once" ? C.fg : C.muted, 1.4);
      curve("full", null, f.hover === "full" ? C.accent : C.fg, C.series);
      // direct labels where the curves are apart
      const cl = g.narrow ? 9.2 : 9.8, rf = ratio(cl, speed);
      FS.k.label(f, c, "with speculation", X(f, cl), Y(f, rf.full) - 12, { size: 11, align: "center", color: C.fg });
      FS.k.label(f, c, "running at once only", X(f, cl), Y(f, rf.once) + 14, { size: 11, align: "center", color: C.muted });
      hits.push({ kind: "full", x: X(f, cl) - 50, y: Y(f, rf.full) - 20, w: 100, h: 16 });
      hits.push({ kind: "once", x: X(f, cl) - 60, y: Y(f, rf.once) + 6, w: 120, h: 16 });
      // the peak
      const pk = peakOf(speed), px = X(f, pk.c), py = Y(f, pk.r);
      c.fillStyle = C.surface; c.beginPath(); c.arc(px, py, 5, 0, 7); c.fill(); c.strokeStyle = C.fg; c.lineWidth = 1.5; c.stroke(); c.lineWidth = 1;
      const hNow = X(f, FS.clamp(cNow, CMIN, CMAX)), clash = Math.abs(hNow - px) < 44;
      FS.k.label(f, c, `peak ${pk.r.toFixed(2)}×`, clash ? px + (hNow <= px ? 9 : -9) : px, py - 13, { size: 11, align: clash ? (hNow <= px ? "left" : "right") : "center", weight: 600 });
      hits.push({ kind: "peak", x: px - 30, y: py - 22, w: 60, h: 28 });
      // the handle: a vertical line at the current call length
      const hx = X(f, FS.clamp(f.state.raw != null && f.drag === "line" ? f.state.raw : cNow, CMIN - 1, CMAX + 1)), held = f.drag === "line", hov = f.handleHover === "line";
      c.strokeStyle = held || hov ? C.accent : C.strong; c.lineWidth = held ? 2.25 : hov ? 1.75 : 1.25;
      FS.k.line(c, hx, g.T, hx, g.B); c.lineWidth = 1;
      const r = ratio(FS.clamp(cNow, CMIN, CMAX), speed);
      for (const [key, color] of [["once", C.muted], ["full", C.fg]]) { c.fillStyle = C.surface; c.beginPath(); c.arc(hx, Y(f, r[key]), 5.5, 0, 7); c.fill(); c.fillStyle = color; c.beginPath(); c.arc(hx, Y(f, r[key]), 4, 0, 7); c.fill(); }
      const right = hx + 70 < g.R;
      FS.k.label(f, c, `${r.full.toFixed(2)}×`, hx + (right ? 9 : -9), Y(f, r.full) + 12, { size: 11, weight: 600, align: right ? "left" : "right" });
      c.fillStyle = C.surface; c.beginPath(); c.arc(hx, g.B, held ? 9 : 7.5, 0, 7); c.fill(); c.fillStyle = held || hov ? C.accent : C.strong; c.beginPath(); c.arc(hx, g.B, held ? 7 : hov ? 6 : 4.5, 0, 7); c.fill();
      if (held) FS.k.label(f, c, `${f.params.call.toFixed(1)} s`, hx, g.T - 8, { size: 11, align: "center", weight: 600 });
    },
  });
  function outs(f) {
    const r = ratio(f.params.call, f.params.speed), pk = peakOf(f.params.speed);
    f.api.out("readout", `At ${f.params.call.toFixed(1)} s per call: ${r.full.toFixed(2)}× (${sec(r.saved)} sooner). Running at once alone: ${r.once.toFixed(2)}×.`);
    f.api.out("peak", `about ${pk.r.toFixed(2)}× when each call takes ${sec(pk.c)}`);
  }
  // Figs. 1 and 4 share the call length and the writing speed.
  const link = (from, to) => FS.get(from).on("param", ({ name, value }) => { const other = FS.get(to); if (other.params[name] !== value) other.set(name, value, { instant: true }); });
  link("fig-gain", "fig-turn"); link("fig-turn", "fig-gain");
  void fig;
})();

/* ================= Fig 5: the post's measurements (canvas, read off its plot) ================= */
(() => {
  const ID = "fig-measured";
  // [mean, low, high] read by pixel from the post's results plot; lows clipped at 0 by its plotting code.
  const CELLS = [{ temp: "0.0", conc: 4 }, { temp: "0.0", conc: 8 }, { temp: "0.7", conc: 4 }, { temp: "0.7", conc: 8 }];
  const DATA = {
    wall: { unit: "s", base: [[1117, 575, 1646], [834, 394, 1257], [1014, 74, 1917], [1319, 0, 3444]], spec: [[772, 509, 1018], [595, 230, 943], [792, 357, 1213], [718, 287, 1111]] },
    subcalls: { unit: "", base: [[667, 269, 1050], [694, 315, 1055], [938, 726, 1131], [1182, 531, 1814]], spec: [[1001, 250, 1729], [890, 213, 1553], [1177, 658, 1682], [914, 297, 1516]] },
    turns: { unit: "", base: [[10.3, 9.2, 11.3], [10.4, 9.0, 11.7], [8.8, 7.7, 9.9], [10.0, 9.1, 10.8]], spec: [[10.0, 8.9, 11.0], [8.9, 7.7, 10.0], [9.7, 8.1, 11.2], [10.2, 9.2, 11.0]] },
  };
  const NAMES = { wall: "Wall time", subcalls: "Sub-calls per task", turns: "Turns per task" };
  const fmtV = (m, v) => (m === "turns" ? v.toFixed(1) : Math.round(v).toLocaleString("en-US")) + (m === "wall" ? " s" : "");
  const delta = (m, i) => {
    const b = DATA[m].base[i][0], s = DATA[m].spec[i][0];
    if (m === "wall") return `${(b / s).toFixed(2)}×`;
    if (m === "subcalls") { const p = Math.round((s / b - 1) * 100); return `${p > 0 ? "+" : "−"}${Math.abs(p)}%`; }
    const d = s - b; return `${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(d).toFixed(1)}`;
  };
  const overlap = (m, i) => { const b = DATA[m].base[i], s = DATA[m].spec[i]; return b[1] <= s[2] && s[1] <= b[2]; };
  const tips = { key: { title: "Two runs per setting", body: "Hollow: the base RLM. Filled: the same harness with speculation. Whiskers: 95% intervals over 5 runs." } };
  for (const m of Object.keys(DATA)) CELLS.forEach((cell, i) => {
    for (const mode of ["base", "spec"]) {
      const [v, lo, hi] = DATA[m][mode][i];
      tips[`${m}:${i}:${mode}`] = { title: `${mode === "base" ? "Without" : "With"} · temp ${cell.temp} · ${cell.conc} tasks`, body: `${NAMES[m]}: mean ${fmtV(m, v)}, 95% interval ${fmtV(m, lo)} to ${fmtV(m, hi)}, over 5 runs, read off the post's plot.` };
    }
  });
  const nice = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
  const scaleOf = (m) => { const hi = Math.max(...DATA[m].base.map((d) => d[2]), ...DATA[m].spec.map((d) => d[2])); const step = nice(hi / 4); return { max: Math.ceil((hi * 1.1) / step) * step, step }; };
  const tw = { k: 1, from: null };
  FS.figure(ID, {
    height: (w) => (w < 560 ? 300 : 300),
    params: { metric: { value: "wall", label: "Measure", options: Object.keys(DATA).map((k) => ({ value: k, label: NAMES[k] })), placement: "inline" } },
    tips,
    tipAt: (f, x, y) => f.state.hits?.find((h) => Math.hypot(h.x - x, h.y - y) < 12)?.kind ?? (f.state.keyHit && x >= f.state.keyHit.x && x <= f.state.keyHit.x + f.state.keyHit.w && y >= f.state.keyHit.y && y <= f.state.keyHit.y + 16 ? "key" : null),
    init(f) { outs(f); },
    onParam(f, name, value) {
      tw.from = f.state.last ?? null; tw.k = FS.reduced() || !tw.from ? 1 : 0;
      if (tw.k < 1) FS.animate((dt) => { tw.k = Math.min(1, tw.k + dt / 0.6); f.dirty = true; return tw.k >= 1; });
      outs(f); void value; void name;
    },
    render(f, c) {
      const C = f.C, m = f.params.metric, narrow = f.w < 560, hits = (f.state.hits = []);
      const L = narrow ? 46 : 64, R = f.w - 12, T = 46, B = f.h - 50;
      const sc = scaleOf(m), Yof = (v, s = sc) => B - (B - T) * (v / s.max);
      // grid
      c.strokeStyle = C.line; c.lineWidth = 1;
      for (let v = 0; v <= sc.max + 1e-9; v += sc.step) { FS.k.line(c, L, Yof(v), R, Yof(v)); FS.k.text(f, c, m === "turns" ? v.toFixed(1) : v.toLocaleString("en-US"), L - 8, Yof(v) + 4, { align: "right", size: 11 }); }
      FS.k.text(f, c, `${NAMES[m]}${m === "wall" ? " (s)" : ""}`, L, T - 22, { size: 11, color: C.fg, weight: 600 });
      // key
      const kx = narrow ? L : R - 270, ky = narrow ? T - 8 : T - 26;
      if (!narrow) {
        c.strokeStyle = C.muted; c.lineWidth = 1.5; c.fillStyle = C.surface; c.beginPath(); c.arc(kx + 5, ky - 4, 4.5, 0, 7); c.fill(); c.stroke();
        FS.k.text(f, c, "without speculation", kx + 15, ky, { size: 11 });
        c.fillStyle = C.fg; c.beginPath(); c.arc(kx + 150, ky - 4, 4.5, 0, 7); c.fill();
        FS.k.text(f, c, "with speculation", kx + 160, ky, { size: 11, color: C.fg });
        f.state.keyHit = { x: kx, y: ky - 12, w: 270 };
      } else f.state.keyHit = null;
      // groups: two temperatures, two concurrencies each
      const slotW = (R - L) / 4, gap = narrow ? 11 : 16;
      const k = FS.ease.smooth(tw.k), last = [];
      CELLS.forEach((cell, i) => {
        const cx = L + slotW * (i + 0.5);
        FS.k.text(f, c, `${cell.conc} tasks`, cx, B + 16, { align: "center", size: 11 });
        if (i % 2 === 0) {
          const gx = L + slotW * (i + 1);
          FS.k.text(f, c, narrow ? `temp ${cell.temp}` : `temperature ${cell.temp}`, gx, B + 34, { align: "center", size: 11, color: C.fg, weight: 600 });
          if (i === 2) { c.strokeStyle = C.lineStrong; FS.k.line(c, L + slotW * 2, T - 4, L + slotW * 2, B + 22); }
        }
        let top = Infinity;
        for (const mode of ["base", "spec"]) {
          const [v, lo, hi] = DATA[m][mode][i], x = cx + (mode === "base" ? -gap : gap);
          const prev = tw.from?.[`${i}:${mode}`];
          const yv = prev ? FS.lerp(prev[0], Yof(v), k) : Yof(v), ylo = prev ? FS.lerp(prev[1], Yof(lo), k) : Yof(lo), yhi = prev ? FS.lerp(prev[2], Yof(hi), k) : Yof(hi);
          last.push([`${i}:${mode}`, [Yof(v), Yof(lo), Yof(hi)]]);
          top = Math.min(top, yhi);
          const key = `${m}:${i}:${mode}`, hot = f.hover === key, ink = mode === "base" ? C.muted : C.fg;
          c.strokeStyle = hot ? C.accent : ink; c.lineWidth = 1.45;
          FS.k.line(c, x, ylo, x, yhi); FS.k.line(c, x - 4, ylo, x + 4, ylo); FS.k.line(c, x - 4, yhi, x + 4, yhi);
          c.beginPath(); c.arc(x, yv, hot ? 6 : 4.5, 0, 7);
          if (mode === "base") { c.fillStyle = C.surface; c.fill(); c.lineWidth = 1.5; c.stroke(); } else { c.fillStyle = hot ? C.accent : C.fg; c.fill(); }
          c.lineWidth = 1;
          hits.push({ kind: key, x, y: yv });
        }
        FS.k.label(f, c, delta(m, i), cx, Math.max(T + 4, top - 12), { size: 11, align: "center", weight: 600 });
      });
      f.state.last = Object.fromEntries(last);
    },
  });
  function outs(f) {
    const m = f.params.metric, n = CELLS.length, ov = CELLS.filter((_, i) => overlap(m, i)).length;
    const lower = CELLS.filter((_, i) => DATA[m].spec[i][0] < DATA[m].base[i][0]).length;
    const text = m === "wall" ? `Lower with speculation in ${lower} of ${n} settings; the intervals overlap in ${ov} of ${n}.`
      : m === "subcalls" ? `More sub-calls with speculation in ${n - lower} of ${n} settings; the intervals overlap in ${ov} of ${n}.`
      : `About 9 to 10 turns per task either way; the intervals overlap in ${ov} of ${n}.`;
    f.api.out("readout", text);
    const rs = CELLS.map((_, i) => DATA.wall.base[i][0] / DATA.wall.spec[i][0]);
    f.api.out("ratios", `${Math.min(...rs).toFixed(2)}× to ${Math.max(...rs).toFixed(2)}×`);
  }
})();
