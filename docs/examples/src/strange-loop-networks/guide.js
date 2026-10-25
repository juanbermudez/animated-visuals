/* Strange-loop networks: eight figures on one worked example, 2534 × 5423.
   Every number from the draft says where it comes from; every illustrative value says so in its plate. */

/* ---------- shared: the worked example and a small SVG kit ---------- */
const EX = {
  prompt: "What is 2534 × 5423?",
  draft1: "About 13.7 million.",
  draft2: ["2534 × 5000 + 2534 × 423", "= 12,670,000 + 1,071,882 = 13,741,882"],
  answer: "13,741,882",
  score1: 0.2, score2: 0.9, scoreTrue: 0.95, bar: 0.8,
};
const fmt2 = (v) => v.toFixed(2);
const SVGNS = "http://www.w3.org/2000/svg";

function svgKit(id) {
  const svg = document.getElementById(id);
  const el = (tag, attrs = {}, parent = svg) => { const n = document.createElementNS(SVGNS, tag); for (const a in attrs) n.setAttribute(a, attrs[a]); parent.append(n); return n; };
  const set = (n, attrs) => { for (const a in attrs) n.setAttribute(a, attrs[a]); return n; };
  const hoverable = (g, key) => {
    g.addEventListener("pointerenter", () => FS.get(id).hover(key));
    g.addEventListener("pointerleave", () => FS.get(id).hover(null));
    g.addEventListener("focus", () => FS.get(id).hover(key));
    g.addEventListener("blur", () => FS.get(id).hover(null));
  };
  return { svg, el, set, hoverable };
}

/* A labelled box (or pill) that can be placed and painted. */
function box(K, key, { label, sub = "", tip, pill = false, parent }) {
  const g = K.el("g", { "data-key": key, tabindex: "0", role: "img", "aria-label": `${label}. ${tip ? tip.body : sub}` }, parent || K.svg);
  if (tip) { g.setAttribute("data-fs-tip", tip.body); g.setAttribute("data-fs-tip-title", tip.title); }
  const rect = K.el("rect", {}, g);
  const t1 = K.el("text", { "font-size": 13, "font-weight": 600, "text-anchor": "middle" }, g);
  const t2 = K.el("text", { "font-size": 10.5, "text-anchor": "middle" }, g);
  t1.textContent = label; t2.textContent = sub;
  K.hoverable(g, key);
  const b = { key, g, rect, t1, t2, pill, x: 0, y: 0, w: 0, h: 0 };
  b.place = (x, y, w, h) => {
    Object.assign(b, { x, y, w, h });
    K.set(rect, { x, y, width: w, height: h, rx: pill ? h / 2 : 6 });
    const two = t2.textContent !== "";
    K.set(t1, { x: x + w / 2, y: y + h / 2 + (two ? -2 : 4.5) });
    K.set(t2, { x: x + w / 2, y: y + h / 2 + 12 });
  };
  b.sub = (s) => { if (t2.textContent !== s) { t2.textContent = s; b.place(b.x, b.y, b.w, b.h); } };
  b.paint = (C, { alpha = 1, hot = false, strong = false, filled = false }) => {
    g.setAttribute("opacity", hot ? 1 : alpha.toFixed(3));
    K.set(rect, { fill: filled ? C.fg : C.surface, stroke: hot ? C.accent : strong ? C.fg : C.lineStrong, "stroke-width": hot ? 1.5 : 1 });
    t1.setAttribute("fill", filled ? C.surface : C.fg);
    t2.setAttribute("fill", filled ? C.surface : C.muted);
  };
  return b;
}

/* A connector with an arrowhead and an optional label. */
function edge(K, label = "", parent) {
  const g = K.el("g", {}, parent || K.svg);
  const path = K.el("path", { fill: "none" }, g);
  const head = K.el("path", {}, g);
  const text = K.el("text", { "font-size": 10.5, "text-anchor": "middle", "paint-order": "stroke", "stroke-width": 4, "stroke-linejoin": "round" }, g);
  text.textContent = label;
  const e = { g, path, head, text, length: 1 };
  e.place = (d, at) => {
    path.setAttribute("d", d);
    e.length = path.getTotalLength();
    const end = path.getPointAtLength(e.length), near = path.getPointAtLength(Math.max(0, e.length - 8)), a = Math.atan2(end.y - near.y, end.x - near.x);
    head.setAttribute("d", `M${end.x},${end.y} L${end.x - 7 * Math.cos(a - 0.45)},${end.y - 7 * Math.sin(a - 0.45)} L${end.x - 7 * Math.cos(a + 0.45)},${end.y - 7 * Math.sin(a + 0.45)} Z`);
    if (at) K.set(text, { x: at[0], y: at[1] });
  };
  e.paint = (C, { alpha = 1, active = false, showLabel = true }) => {
    g.setAttribute("opacity", alpha.toFixed(3));
    K.set(path, { stroke: active ? C.accent : C.muted, "stroke-width": active ? 1.75 : C.edge });
    head.setAttribute("fill", active ? C.accent : C.muted);
    K.set(text, { fill: active ? C.fg : C.muted, stroke: C.surface, opacity: showLabel ? 1 : 0 });
  };
  e.at = (u) => path.getPointAtLength(FS.clamp(u) * e.length);
  return e;
}

/* A point along several connectors in order, u from 0 to 1 over their total length. */
function along(edges, u) {
  const total = edges.reduce((s, e) => s + e.length, 0);
  let d = FS.clamp(u) * total;
  for (const e of edges) { if (d <= e.length) return e.path.getPointAtLength(d); d -= e.length; }
  const last = edges[edges.length - 1];
  return last.path.getPointAtLength(last.length);
}

/* ================= Fig 1: what a strange loop is (SVG process, wiring inline) ================= */
(() => {
  const id = "fig-loop", K = svgKit(id), LAP = 4.4;
  const tips = {
    writer: { title: "Writer", body: "Writes a draft at level 1. In the strange loop, its input also includes the judge's last verdict." },
    judge: { title: "Judge", body: "Writes a verdict about the draft at level 2. An ordinary hierarchy does not carry the verdict back to the writer." },
  };
  const bands = [0, 1].map(() => ({ rect: K.el("rect", { rx: 10 }), text: K.el("text", { "font-size": 11, "font-weight": 600, "letter-spacing": "0.06em" }) }));
  bands[0].text.textContent = "LEVEL 1 · THE TEXT"; bands[1].text.textContent = "LEVEL 2 · ABOUT THE TEXT";
  const input = edge(K, "a new prompt"), up = edge(K, "up a level"), back = edge(K, "the verdict, fed back in"), stub = edge(K, "nothing comes back");
  const writer = box(K, "writer", { label: "Writer", sub: "writes a draft", tip: tips.writer });
  const judge = box(K, "judge", { label: "Judge", sub: "writes a verdict", tip: tips.judge });
  const cross = K.el("path", { fill: "none", "stroke-width": 1.5, "stroke-linecap": "round" });
  const token = K.el("circle", { r: 6, "stroke-width": 1.5 });
  const RUNGS = 8;
  const title = K.el("text", { "font-size": 11, "font-weight": 600, "letter-spacing": "0.06em" }); title.textContent = "LEVELS CLIMBED";
  const big = K.el("text", { "font-size": 34, "font-weight": 600 });
  const rungs = Array.from({ length: RUNGS }, () => ({ rect: K.el("rect", { rx: 3 }), t: K.el("text", { "font-size": 10.5, "text-anchor": "middle" }) }));
  let L = null;
  const LAYOUTS = {
    wide: { box: [960, 300], bands: [[160, 158, 480, 92], [160, 28, 480, 92]], writer: [300, 182, 180, 46], judge: [300, 52, 180, 46],
      input: ["M168,205 L300,205", [228, 196]], up: ["M390,182 L390,98", [434, 144]], back: ["M480,75 C610,75 610,205 480,205", [600, 144]],
      stub: ["M480,66 L566,66", [524, 56]], cross: [574, 66], title: [700, 36], big: [700, 78], rung: (i) => [770, 252 - i * 22, 120, 16], vertical: true },
    narrow: { box: [360, 330], bands: [[10, 140, 340, 92], [10, 18, 340, 92]], writer: [100, 164, 150, 46], judge: [100, 42, 150, 46],
      input: ["M22,187 L100,187", [56, 178]], up: ["M175,164 L175,88", [212, 128]], back: ["M250,65 C336,65 336,187 250,187", [306, 126]],
      stub: ["M250,56 L310,56", [292, 36]], cross: [318, 56], title: [12, 268], big: [12, 308], rung: (i) => [120 + i * 29, 286, 25, 26], vertical: false },
  };
  function layout(name) {
    L = LAYOUTS[name];
    K.svg.setAttribute("viewBox", `0 0 ${L.box[0]} ${L.box[1]}`);
    bands.forEach((b, i) => { const [x, y, w, h] = L.bands[i]; K.set(b.rect, { x, y, width: w, height: h }); K.set(b.text, { x: x + 12, y: y + 18 }); });
    writer.place(...L.writer); judge.place(...L.judge);
    back.text.textContent = name === "narrow" ? "fed back in" : "the verdict, fed back in";
    input.place(...L.input); up.place(...L.up); back.place(...L.back); stub.place(...L.stub);
    const [cx, cy] = L.cross; cross.setAttribute("d", `M${cx - 5},${cy - 5} L${cx + 5},${cy + 5} M${cx + 5},${cy - 5} L${cx - 5},${cy + 5}`);
    K.set(title, { x: L.title[0], y: L.title[1] }); K.set(big, { x: L.big[0], y: L.big[1] });
    rungs.forEach((r, i) => { const [x, y, w, h] = L.rung(i); K.set(r.rect, { x, y, width: w, height: h }); K.set(r.t, { x: x + w / 2, y: y + h / 2 + 4 }); });
  }
  function moment(f) {
    const strange = f.params.wiring === "strange", c = f.state.clock || 0, lap = Math.floor(c / LAP), u = c % LAP;
    if (strange) {
      if (u < 1.4) return { levels: 2 * lap + 1, at: "on the way up", pos: ["up", u / 1.4], text: lap ? `Draft ${lap + 1} goes to the judge with the last verdict in its context.` : "Draft 1 goes up to the judge." };
      if (u < 2.2) return { levels: 2 * lap + 2, at: "the judge", pos: ["judge"], text: `The judge writes a verdict about draft ${lap + 1}: level ${2 * lap + 2}.` };
      if (u < 3.6) return { levels: 2 * lap + 2, at: "on the way down", pos: ["back", (u - 2.2) / 1.4], text: "The verdict comes back down, into the writer's input." };
      return { levels: 2 * lap + 2, at: "the writer", pos: ["writer"], text: `The verdict returns to the writer, which now writes at level ${2 * lap + 3}.` };
    }
    if (u < 1.4) return { levels: 1, at: "on the way up", pos: ["up", u / 1.4], text: "A draft goes up to the judge." };
    if (u < 2.4) return { levels: 2, at: "the judge", pos: ["judge"], text: "The judge writes a verdict at level 2, and nothing carries it back to the writer." };
    if (u < 3.6) return { levels: 1, at: "a new prompt", pos: ["input", (u - 2.4) / 1.2], text: "A new prompt arrives, and the writer starts again at level 1." };
    return { levels: 1, at: "the writer", pos: ["writer"], text: "A new prompt arrives, and the writer starts again at level 1." };
  }
  FS.figure(id, {
    height: (w) => { const b = LAYOUTS[w < 560 ? "narrow" : "wide"].box; return (w * b[1]) / b[0]; },
    params: { wiring: { value: "strange", label: "Wiring", placement: "inline", options: [{ value: "ordinary", label: "Ordinary stack" }, { value: "strange", label: "Strange loop" }] } },
    reserve: { levels: ["Levels climbed: 88 · now at: on the way down"], wire: ["The verdict returns to the writer, which now writes at level 88.", "Draft 88 goes to the judge with the last verdict in its context."] },
    settle: 10.5,
    init(f) { f.state.clock = 0; f.state.mix = 1; },
    onParam(f) { f.state.clock = 0; f.dirty = true; },
    resize(f) { const name = f.w < 560 ? "narrow" : "wide"; if (L !== LAYOUTS[name]) layout(name); },
    update(f, dt) { f.state.clock += dt; f.state.mix = FS.damp(f.state.mix, f.params.wiring === "strange" ? 1 : 0, 10, dt); },
    render(f) {
      const C = f.C, m = moment(f), target = f.params.wiring === "strange" ? 1 : 0;
      if (!f.playing) f.state.mix = target;
      const mix = f.state.mix;
      bands.forEach((b) => { K.set(b.rect, { fill: C.surface2, stroke: C.line }); b.text.setAttribute("fill", C.muted); });
      writer.paint(C, { hot: f.hover === "writer", strong: m.at === "the writer" });
      judge.paint(C, { hot: f.hover === "judge", strong: m.at === "the judge" });
      up.paint(C, { active: m.pos[0] === "up" });
      back.paint(C, { alpha: mix, active: m.pos[0] === "back" });
      stub.paint(C, { alpha: 1 - mix });
      input.paint(C, { alpha: 1 - 0.7 * mix, active: m.pos[0] === "input" });
      stub.path.setAttribute("stroke-dasharray", "3 4");
      K.set(cross, { stroke: C.muted, opacity: (1 - mix).toFixed(3) });
      let p;
      if (m.pos[0] === "judge") p = { x: judge.x + judge.w - 12, y: judge.y + judge.h / 2 };
      else if (m.pos[0] === "writer") p = { x: writer.x + writer.w - 12, y: writer.y + writer.h / 2 };
      else p = { up, back, input }[m.pos[0]].at(FS.ease.inOut(m.pos[1]));
      K.set(token, { cx: p.x.toFixed(1), cy: p.y.toFixed(1), fill: C.accent, stroke: C.surface });
      title.setAttribute("fill", C.muted);
      K.set(big, { fill: C.strong }); big.textContent = String(m.levels);
      const first = Math.max(1, m.levels - RUNGS + 1);
      rungs.forEach((r, i) => {
        const lv = first + i, on = lv <= m.levels, top = lv === m.levels;
        K.set(r.rect, { fill: top ? C.accent : on ? C.fg : "none", stroke: on ? "none" : C.lineStrong, opacity: on && !top ? 0.55 : 1 });
        r.t.textContent = String(lv);
        r.t.setAttribute("fill", on ? C.surface : C.muted);
      });
      f.api.out("levels", `Levels climbed: ${m.levels} · now at: ${m.at}`);
      f.api.out("wire", m.text);
    },
  });
})();

/* ================= Fig 2: one question round the loop (SVG steps) ================= */
(() => {
  const id = "fig-sln", K = svgKit(id);
  const tips = {
    prompt: { title: "Your prompt", body: "What you ask. The shared context C, which both models read, starts with this prompt. It is turn 0 in the draft's Figure 2." },
    enc: { title: "Encoder (optional)", body: "A separate encoder can prepare the input before it enters the loop. This example does not use one." },
    check: { title: "Check", body: "Decides whether to go round again. The draft's options: a number of rounds, a confidence score, or the two models agreeing." },
    left: { title: "Writer (left model)", body: "Reads its own system prompt plus the conversation so far and writes a draft. Also called actor, generator or student." },
    right: { title: "Judge (right model)", body: "In this version it returns only a score. Also called critic, reward model, discriminator or teacher." },
    dec: { title: "Decoder (optional)", body: "Turns the agreed result into the final output; the draft likens it to putting a thought into words." },
    out: { title: "Answer", body: "Only the answer leaves the loop. It is turn n + 1 in the draft's Figure 2." },
  };
  const E = {
    inEnc: edge(K), encCheck: edge(K), checkLeft: edge(K, "context C"), leftCheck: edge(K, "draft"),
    checkRight: edge(K, "context C"), rightCheck: edge(K, "score"), checkDec: edge(K), decOut: edge(K),
  };
  const N = {
    out: box(K, "out", { label: "Answer", tip: tips.out, pill: true }),
    dec: box(K, "dec", { label: "Decoder", sub: "optional", tip: tips.dec }),
    check: box(K, "check", { label: "Check", sub: "stop?", tip: tips.check }),
    enc: box(K, "enc", { label: "Encoder", sub: "optional", tip: tips.enc }),
    prompt: box(K, "prompt", { label: "Your prompt", tip: tips.prompt, pill: true }),
    left: box(K, "left", { label: "Writer", sub: "left model", tip: tips.left }),
    right: box(K, "right", { label: "Judge", sub: "right model", tip: tips.right }),
  };
  const token = K.el("circle", { r: 6, "stroke-width": 1.5 });
  const panelTitle = K.el("text", { "font-size": 11, "font-weight": 600, "letter-spacing": "0.06em" }); panelTitle.textContent = "WHAT THE MODELS READ, C";
  const hint = K.el("text", { "font-size": 11 }); hint.textContent = "Empty until you ask. Press Next.";
  const CARDS = [
    { tag: "Your prompt", lines: [EX.prompt] },
    { tag: "Writer · round 1", lines: [EX.draft1] },
    { tag: "Judge · round 1", lines: [`score ${fmt2(EX.score1)}`] },
    { tag: "Writer · round 2", lines: EX.draft2 },
    { tag: "Judge · round 2", lines: [`score ${fmt2(EX.score2)}`] },
    { tag: "Leaves the loop", lines: [EX.answer] },
  ].map((c) => {
    const g = K.el("g");
    const rect = K.el("rect", { rx: 6 }, g), bar = K.el("rect", { width: 3, rx: 1.5 }, g);
    const tag = K.el("text", { "font-size": 10.5, "font-weight": 600, "letter-spacing": "0.04em" }, g); tag.textContent = c.tag.toUpperCase();
    const lines = c.lines.map((s) => { const t = K.el("text", { "font-size": 12.5 }, g); t.textContent = s; return t; });
    return { ...c, g, rect, bar, tagEl: tag, lineEls: lines, alpha: 0 };
  });
  const LAYOUTS = {
    wide: { box: [960, 420], panel: [630, 950], panelY: 38,
      at: { out: [245, 12, 110, 32], dec: [240, 64, 120, 40], check: [240, 150, 120, 96], enc: [240, 296, 120, 40], prompt: [222, 362, 156, 34], left: [30, 156, 140, 84], right: [430, 156, 140, 84] },
      d: { inEnc: "M300,362 L300,336", encCheck: "M300,296 L300,246", checkLeft: "M240,228 C200,330 100,330 100,240", leftCheck: "M100,156 C100,70 200,80 240,170",
        checkRight: "M360,228 C400,330 500,330 500,240", rightCheck: "M500,156 C500,70 400,80 360,170", checkDec: "M300,150 L300,104", decOut: "M300,64 L300,44" },
      lab: { checkLeft: [168, 318], leftCheck: [150, 90], checkRight: [432, 318], rightCheck: [450, 90] } },
    narrow: { box: [360, 790], panel: [10, 350], panelY: 418,
      at: { out: [130, 10, 100, 30], dec: [128, 58, 104, 38], check: [134, 140, 92, 92], enc: [128, 282, 104, 38], prompt: [110, 344, 140, 32], left: [6, 146, 96, 80], right: [258, 146, 96, 80] },
      d: { inEnc: "M180,344 L180,320", encCheck: "M180,282 L180,232", checkLeft: "M134,214 C110,300 54,300 54,226", leftCheck: "M54,146 C54,76 108,86 134,160",
        checkRight: "M226,214 C250,300 306,300 306,226", rightCheck: "M306,146 C306,76 252,86 226,160", checkDec: "M180,140 L180,96", decOut: "M180,58 L180,40" },
      lab: { checkLeft: [70, 300], leftCheck: [70, 84], checkRight: [290, 300], rightCheck: [290, 84] } },
  };
  let L = null;
  function layout(name) {
    L = LAYOUTS[name];
    K.svg.setAttribute("viewBox", `0 0 ${L.box[0]} ${L.box[1]}`);
    for (const k in N) N[k].place(...L.at[k]);
    for (const k in E) E[k].place(L.d[k], L.lab[k]);
    const [x0, x1] = L.panel;
    K.set(panelTitle, { x: x0, y: L.panelY - 14 }); K.set(hint, { x: x0, y: L.panelY + 16 });
    let y = L.panelY;
    for (const c of CARDS) {
      const h = 26 + c.lines.length * 17;
      K.set(c.rect, { x: x0, y, width: x1 - x0, height: h }); K.set(c.bar, { x: x0, y: y + 6, height: h - 12 });
      K.set(c.tagEl, { x: x0 + 14, y: y + 17 });
      c.lineEls.forEach((t, i) => K.set(t, { x: x0 + 14, y: y + 35 + i * 17 }));
      y += h + 8;
    }
  }
  const bar = fmt2(EX.bar);
  const steps = [
    { on: Object.keys(N), via: [], cards: 0, check: "stop?", round: "Overview", caption: "The prompt enters at the bottom, the models take turns through the check, and the answer leaves at the top." },
    { on: ["prompt", "enc", "check"], via: ["inEnc", "encCheck"], cards: 1, check: "no score yet", round: "Round 1", caption: "The context C, which both models read, begins with the prompt “What is 2534 × 5423?”" },
    { on: ["check", "left"], via: ["checkLeft"], cards: 2, check: "no score yet", round: "Round 1", caption: `The writer reads its instructions and C, then drafts “${EX.draft1.toLowerCase().replace(".", "")}”.` },
    { on: ["left", "check"], via: ["leftCheck"], cards: 2, check: "no score yet", round: "Round 1", caption: "The draft returns to the check and continues to the judge because no score is available." },
    { on: ["check", "right"], via: ["checkRight"], cards: 3, check: "no score yet", round: "Round 1", caption: `The judge reads the prompt and draft, then returns a score of ${fmt2(EX.score1)}.` },
    { on: ["right", "check"], via: ["rightCheck"], cards: 3, check: `${fmt2(EX.score1)}: again`, round: "Round 1", caption: `${fmt2(EX.score1)} is below the bar of ${bar}, so the draft and score join C for another round.` },
    { on: ["check", "left"], via: ["checkLeft"], cards: 4, check: "no score yet", round: "Round 2", caption: `The writer reads the prompt, its first draft, and the ${fmt2(EX.score1)} score before producing a worked answer.` },
    { on: ["left", "check", "right"], via: ["leftCheck", "checkRight"], cards: 5, check: "no score yet", round: "Round 2", caption: `The worked draft passes through the check, and the judge scores it ${fmt2(EX.score2)}.` },
    { on: ["right", "check", "dec", "out"], via: ["rightCheck", "checkDec", "decOut"], cards: 6, check: `${fmt2(EX.score2)}: stop`, round: "Answered", caption: `${fmt2(EX.score2)} clears the bar, so the loop stops and the decoder returns ${EX.answer}.` },
  ];
  FS.figure(id, {
    height: (w) => { const b = LAYOUTS[w < 560 ? "narrow" : "wide"].box; return (w * b[1]) / b[0]; },
    steps, autoplay: false, stepDuration: 0.9,
    reserve: { round: ["Fig. 2 · answered · illustrative"] },
    resize(f) { const name = f.w < 560 ? "narrow" : "wide"; if (L !== LAYOUTS[name]) layout(name); },
    render(f) {
      const C = f.C, s = steps[f.step], on = new Set(s.on), e = FS.ease.inOut(f.stepT), overview = f.step === 0;
      const via = new Set(s.via);
      N.check.sub(s.check);
      for (const k in N) N[k].paint(C, { alpha: overview || on.has(k) ? 1 : C.dim, hot: f.hover === k, strong: !overview && on.has(k) });
      for (const k in E) {
        const [a, b] = { inEnc: ["prompt", "enc"], encCheck: ["enc", "check"], checkLeft: ["check", "left"], leftCheck: ["left", "check"], checkRight: ["check", "right"], rightCheck: ["right", "check"], checkDec: ["check", "dec"], decOut: ["dec", "out"] }[k];
        const lit = overview || via.has(k), touch = f.hover && (f.hover === a || f.hover === b);
        E[k].paint(C, { alpha: lit || touch ? 1 : 0.22, active: via.has(k) || touch, showLabel: f.w >= 560 ? lit || touch : via.has(k) });
      }
      if (s.via.length) {
        const p = along(s.via.map((k) => E[k]), e);
        K.set(token, { cx: p.x.toFixed(1), cy: p.y.toFixed(1), opacity: 1 });
      } else K.set(token, { opacity: 0 });
      K.set(token, { fill: C.accent, stroke: C.surface });
      panelTitle.setAttribute("fill", C.muted); K.set(hint, { fill: C.muted, opacity: s.cards ? 0 : 1 });
      CARDS.forEach((c, i) => {
        const shown = i < s.cards, wasShown = i < (steps[f.from]?.cards ?? 0), newest = i === s.cards - 1 && !overview;
        const target = shown ? 1 : 0, from = wasShown ? 1 : 0;
        // A card that arrives with this step appears once the token lands.
        const a = target === from ? target : target ? FS.clamp((f.stepT - 0.7) / 0.3) : 1 - FS.clamp(f.stepT / 0.3);
        c.g.setAttribute("opacity", a.toFixed(3));
        K.set(c.rect, { fill: newest ? C.surface2 : C.surface, stroke: C.line });
        K.set(c.bar, { fill: newest ? C.accent : C.lineStrong });
        c.tagEl.setAttribute("fill", C.muted);
        c.lineEls.forEach((t) => t.setAttribute("fill", C.fg));
      });
      f.api.out("round", `Fig. 2 · ${s.round.toLowerCase()} · illustrative`);
    },
  });
})();

/* ================= Fig 3: three shapes of the loop (SVG, tabs in the head) ================= */
(() => {
  const id = "fig-shapes", K = svgKit(id);
  const FACTS = {
    tall: "Both sides are full copies of one pretrained model with separate system prompts, and each returns full replies until a stop token or agreement ends the loop.",
    wide: "A router repeatedly chooses left, right or out, and each side adds the output of a gate and randomly initialized expert layer to the context.",
    lateralized: "Two full model copies have separate roles, with the writer returning a reply and its expected score and the judge returning only a score until that score clears the bar.",
  };
  const T = {
    prompt: { title: "Your prompt", body: "The prompt becomes the shared context for every shape." },
    check: { title: "Check", body: "Decides whether to go round again or answer. The tall shape stops on a stop token (Figure 3)." },
    answer: { title: "Answer", body: "The final output, written once the loop stops." },
    tallL: { title: "Left: a full model", body: "A pretrained model with its whole stack of N attention and feed-forward blocks. Figure 3 suggests “Llama 3 7B”, copied into both seats." },
    tallR: { title: "Right: the same model", body: "A second copy of the same model with a different system prompt. It writes a full reply back." },
    latL: { title: "Writer", body: "A full model copy that outputs its reply and the reward it expects for it (“Left Brain Output + Expected Reward”, Figure 5)." },
    latR: { title: "Judge", body: "A full model copy specialized as a reward model: it outputs a score only (“does it make sense or not?”, Figure 5)." },
    first: { title: "First 3 blocks", body: "The first three transformer blocks of the original model, kept as they were. The draft calls the cut “a lobotomy”." },
    last: { title: "Last 3 blocks", body: "The original model's last three blocks and output layer write the answer once the router picks out." },
    router: { title: "Router", body: "The main gating network sends the context left, right or out on each pass. Its choice decides when the loop stops." },
    gate: { title: "Gate", body: "A gating network that picks which compute to run on this pass." },
    expert: { title: "Expert layer", body: "A mixture-of-experts layer, randomly initialised (“MOE (random)” in Figure 4), that does the compute the gate picked." },
    plus: { title: "Add to context", body: "The expert's result is added to the context as “C += c” and returned to the router." },
  };
  const groups = {};
  const mkShape = (name, build) => { const g = K.el("g"); groups[name] = { g, alpha: name === "tall" ? 1 : 0, ...build(g) }; };
  const lobe = (g, key, label, sub, tip) => {
    const b = box(K, key, { label, sub, tip, parent: g });
    const inner = [0, 1].map((i) => { const r = K.el("rect", { rx: 4 }, b.g), t = K.el("text", { "font-size": 10.5, "text-anchor": "middle" }, b.g); t.textContent = i ? "Feed-forward" : "Attention"; return { r, t }; });
    const nx = K.el("text", { "font-size": 10.5, "font-weight": 600, "text-anchor": "end" }, b.g); nx.textContent = "× N";
    const place = b.place;
    b.place = (x, y, w, h) => {
      place(x, y, w, h);
      K.set(b.t1, { y: y + 20 }); K.set(b.t2, { y: y + 34 });
      inner.forEach((p, i) => { K.set(p.r, { x: x + 8, y: y + 44 + i * 26, width: w - 40, height: 22 }); K.set(p.t, { x: x + 8 + (w - 40) / 2, y: y + 59 + i * 26 }); });
      K.set(nx, { x: x + w - 6, y: y + 72 });
    };
    const paint = b.paint;
    b.paint = (C, o) => { paint(C, o); inner.forEach((p) => { K.set(p.r, { fill: C.surface2, stroke: C.line }); p.t.setAttribute("fill", C.fg); }); nx.setAttribute("fill", C.muted); };
    return b;
  };
  const vbox = (g, key, label, tip) => {
    const b = box(K, key, { label, tip, parent: g });
    const place = b.place;
    b.place = (x, y, w, h) => { place(x, y, w, h); K.set(b.t1, { x: x + w / 2 + 4.5, y: y + h / 2, transform: `rotate(-90 ${x + w / 2 + 4.5} ${y + h / 2})`, "font-size": 12 }); };
    return b;
  };
  const plusNode = (g, key, tip) => {
    const n = K.el("g", { tabindex: "0", role: "img", "aria-label": `${tip.title}. ${tip.body}`, "data-fs-tip": tip.body, "data-fs-tip-title": tip.title }, g);
    const c = K.el("circle", { r: 11 }, n), p = K.el("path", { "stroke-width": 1.5, fill: "none" }, n);
    K.hoverable(n, key);
    return { g: n, c, p, place: (x, y) => { K.set(c, { cx: x, cy: y }); p.setAttribute("d", `M${x - 5},${y} L${x + 5},${y} M${x},${y - 5} L${x},${y + 5}`); },
      paint: (C, hot) => { K.set(c, { fill: C.surface, stroke: hot ? C.accent : C.lineStrong }); p.setAttribute("stroke", C.fg); } };
  };
  for (const name of ["tall", "lateralized"]) mkShape(name, (g) => {
    const lat = name === "lateralized";
    const E = { in: edge(K, "", g), out: edge(K, "", g), toL: edge(K, "context", g), fromL: edge(K, lat ? "reply + expected score" : "full reply", g), toR: edge(K, "context", g), fromR: edge(K, lat ? "score only" : "full reply", g) };
    const N = {
      prompt: box(K, "prompt", { label: "Your prompt", tip: T.prompt, pill: true, parent: g }),
      check: box(K, "check", { label: "Check", sub: "stop?", tip: T.check, parent: g }),
      answer: box(K, "answer", { label: "Answer", tip: T.answer, pill: true, parent: g }),
      L: lobe(g, "L", lat ? "Writer" : "Left model", "full model copy", lat ? T.latL : T.tallL),
      R: lobe(g, "R", lat ? "Judge" : "Right model", lat ? "same model, scores" : "full model copy", lat ? T.latR : T.tallR),
    };
    return { E, N, cycle: ["toL", "fromL", "toR", "fromR"] };
  });
  mkShape("wide", (g) => {
    const E = { in: edge(K, "", g), first: edge(K, "", g), last: edge(K, "", g), out: edge(K, "", g), toGL: edge(K, "", g), gl: edge(K, "", g), el: edge(K, "", g), backL: edge(K, "add to context", g),
      toGR: edge(K, "", g), gr: edge(K, "", g), er: edge(K, "", g), backR: edge(K, "add to context", g) };
    const N = {
      prompt: box(K, "prompt", { label: "Your prompt", tip: T.prompt, pill: true, parent: g }),
      first: box(K, "first", { label: "First 3 blocks", tip: T.first, parent: g }),
      router: box(K, "router", { label: "Router", sub: "left, right or out", tip: T.router, parent: g }),
      last: box(K, "last", { label: "Last 3 blocks", tip: T.last, parent: g }),
      answer: box(K, "answer", { label: "Answer", tip: T.answer, pill: true, parent: g }),
      gateL: vbox(g, "gate", "Gate", T.gate), expL: vbox(g, "expert", "Expert", T.expert),
      gateR: vbox(g, "gate", "Gate", T.gate), expR: vbox(g, "expert", "Expert", T.expert),
    };
    const P = { L: plusNode(g, "plus", T.plus), R: plusNode(g, "plus", T.plus) };
    return { E, N, P, cycle: ["toGL", "gl", "el", "backL", "toGR", "gr", "er", "backR"] };
  });
  const token = K.el("circle", { r: 6, "stroke-width": 1.5 });
  const LAYOUTS = {
    wide: { box: [960, 330],
      tall: { at: { answer: [420, 12, 120, 30], check: [425, 125, 110, 70], prompt: [405, 286, 150, 32], L: [130, 100, 200, 120], R: [630, 100, 200, 120] },
        d: { in: "M480,286 L480,195", out: "M480,125 L480,42", toL: "M425,180 C385,280 230,280 230,220", fromL: "M230,100 C230,40 385,60 425,140", toR: "M535,180 C575,280 730,280 730,220", fromR: "M730,100 C730,40 575,60 535,140" },
        lab: { toL: [330, 268], fromL: [330, 52], toR: [630, 268], fromR: [630, 52] } },
      wide: { at: { answer: [420, 8, 120, 28], last: [410, 48, 140, 36], router: [410, 122, 140, 76], first: [410, 234, 140, 36], prompt: [405, 290, 150, 32],
          gateL: [302, 110, 40, 100], expL: [234, 100, 40, 120], gateR: [618, 110, 40, 100], expR: [686, 100, 40, 120] },
        plus: { L: [180, 160], R: [780, 160] },
        d: { in: "M480,290 L480,270", first: "M480,234 L480,198", last: "M480,122 L480,84", out: "M480,48 L480,36",
          toGL: "M410,185 C380,270 322,270 322,210", gl: "M302,160 L274,160", el: "M234,160 L191,160", backL: "M180,149 C180,60 350,70 410,140",
          toGR: "M550,185 C580,270 638,270 638,210", gr: "M658,160 L686,160", er: "M726,160 L769,160", backR: "M780,149 C780,60 610,70 550,140" },
        lab: { backL: [262, 76], backR: [698, 76] } },
    },
    narrow: { box: [360, 350],
      tall: { at: { answer: [130, 8, 100, 28], check: [138, 140, 84, 64], prompt: [115, 306, 130, 30], L: [4, 110, 116, 112], R: [240, 110, 116, 112] },
        d: { in: "M180,306 L180,204", out: "M180,140 L180,36", toL: "M138,190 C112,290 62,290 62,222", fromL: "M62,110 C62,56 112,66 138,156", toR: "M222,190 C248,290 298,290 298,222", fromR: "M298,110 C298,56 248,66 222,156" },
        lab: {} },
      wide: { at: { answer: [130, 6, 100, 26], last: [122, 44, 116, 32], router: [126, 122, 108, 70], first: [122, 232, 116, 32], prompt: [115, 300, 130, 30],
          gateL: [88, 112, 28, 90], expL: [46, 102, 28, 110], gateR: [244, 112, 28, 90], expR: [286, 102, 28, 110] },
        plus: { L: [18, 157], R: [342, 157] },
        d: { in: "M180,300 L180,264", first: "M180,232 L180,192", last: "M180,122 L180,76", out: "M180,44 L180,32",
          toGL: "M126,180 C112,256 102,256 102,202", gl: "M88,157 L74,157", el: "M46,157 L29,157", backL: "M18,146 C18,80 96,92 126,140",
          toGR: "M234,180 C248,256 258,256 258,202", gr: "M272,157 L286,157", er: "M314,157 L331,157", backR: "M342,146 C342,80 264,92 234,140" },
        lab: {} },
    },
  };
  LAYOUTS.wide.lateralized = LAYOUTS.wide.tall; LAYOUTS.narrow.lateralized = LAYOUTS.narrow.tall;
  let L = null;
  function layout(name) {
    L = LAYOUTS[name];
    K.svg.setAttribute("viewBox", `0 0 ${L.box[0]} ${L.box[1]}`);
    for (const [shape, s] of Object.entries(groups)) {
      const G = L[shape];
      for (const k in s.N) s.N[k].place(...G.at[k]);
      for (const k in s.E) s.E[k].place(G.d[k], G.lab[k]);
      if (s.P) for (const k in s.P) s.P[k].place(...G.plus[k]);
      s.lengths = s.cycle.map((k) => s.E[k].length);
    }
  }
  const SPEED = 230;
  FS.figure(id, {
    height: (w) => { const b = LAYOUTS[w < 560 ? "narrow" : "wide"].box; return (w * b[1]) / b[0]; },
    params: { shape: { value: "tall", label: "Shape", placement: "inline", options: [{ value: "tall", label: "Tall" }, { value: "wide", label: "Wide" }, { value: "lateralized", label: "Lateralized" }] } },
    settle: 1.2,
    init(f) { f.state.clock = 0; f.plate.style.setProperty("--fs-tabs-width", "min(100%, 22rem)"); },
    onParam(f) { f.state.clock = 0; },
    resize(f) { const name = f.w < 560 ? "narrow" : "wide"; if (L !== LAYOUTS[name]) layout(name); },
    update(f, dt) {
      f.state.clock += dt;
      for (const [name, s] of Object.entries(groups)) s.alpha = FS.damp(s.alpha, name === f.params.shape ? 1 : 0, 12, dt);
    },
    render(f) {
      const C = f.C, cur = groups[f.params.shape], narrow = f.w < 560;
      if (!f.playing) for (const [name, s] of Object.entries(groups)) s.alpha = name === f.params.shape ? 1 : 0;
      // where the token is on the active shape's cycle
      const total = cur.lengths.reduce((a, b) => a + b, 0), d = (f.state.clock * SPEED) % total;
      let acc = 0, activeEdge = cur.cycle[0], pt = null;
      for (let i = 0; i < cur.cycle.length; i++) {
        if (d <= acc + cur.lengths[i]) { activeEdge = cur.cycle[i]; pt = cur.E[activeEdge].path.getPointAtLength(d - acc); break; }
        acc += cur.lengths[i];
      }
      for (const [name, s] of Object.entries(groups)) {
        s.g.setAttribute("opacity", s.alpha.toFixed(3));
        s.g.style.pointerEvents = name === f.params.shape ? "" : "none";
        s.g.style.visibility = s.alpha < 0.01 ? "hidden" : "";
        for (const k in s.N) s.N[k].paint(C, { hot: f.hover === s.N[k].key });
        for (const k in s.E) s.E[k].paint(C, { active: s === cur && k === activeEdge, showLabel: !narrow });
        if (s.P) for (const k in s.P) s.P[k].paint(C, f.hover === "plus");
      }
      if (pt) K.set(token, { cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), fill: C.accent, stroke: C.surface, opacity: cur.alpha.toFixed(3) });
      f.api.out("facts", FACTS[f.params.shape]);
    },
  });
})();

/* ================= Fig 4: hard questions earn more rounds (canvas, draggable bar) ================= */
(() => {
  const id = "fig-rounds";
  const PROMPTS = [
    { key: "easy", name: "2 + 2", tokens: 2, scores: Array(12).fill(0.97) },
    { key: "hard", name: "2534 × 5423", tokens: 40, scores: [EX.score1, EX.score2, 0.92, 0.94, 0.95, 0.95, 0.96, 0.96, 0.96, 0.96, 0.96, 0.96] },
  ];
  const tips = {
    bar: { title: "Score bar", body: "The minimum judge score that stops the loop. The draft gives no value, so 0.80 is illustrative. Drag the bar to change it." },
    easy: { title: "2 + 2", body: "The judge accepts this easy prompt's first draft. The scores and 2-token draft are illustrative." },
    hard: { title: "2534 × 5423", body: "In the worked example, the first draft scores 0.20 and the second scores 0.90. The scores and 40-token drafts are illustrative." },
    cost: { title: "Forward passes", body: "Each round costs one pass per draft token for the writer plus one for the judge, which only returns a score (Section 5.2)." },
  };
  const used = (p, bar, limit) => { for (let i = 0; i < limit; i++) if (p.scores[i] >= bar) return { rounds: i + 1, capped: false }; return { rounds: limit, capped: true }; };
  const geo = (f) => {
    const narrow = f.w < 560, x0 = narrow ? 40 : 52, x1 = narrow ? f.w - 18 : Math.round(f.w * 0.6), top = 26, bottom = narrow ? 214 : f.h - 40;
    const bx0 = narrow ? 14 : x1 + 64, bx1 = f.w - 16, by = narrow ? bottom + 86 : 90;
    return { narrow, x0, x1, top, bottom, bx0, bx1, by };
  };
  FS.figure(id, {
    height: (w) => (w < 560 ? 420 : 300),
    params: {
      limit: { value: 8, min: 2, max: 12, step: 1, label: "Round limit", format: (v) => `${Math.round(v)} rounds` },
      bar: { value: EX.bar, min: 0.05, max: 0.99, step: 0.01, label: "Bar", hidden: true },
    },
    reserve: { cost: ["Bar 0.99 · 2 + 2: 36 passes · 2534 × 5423: 492 passes"] },
    autoplay: false,
    tips,
    tipAt: (f, x, y) => f.state.hits?.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)?.key ?? null,
    handles: {
      bar: {
        label: "Score bar: drag up or down, or use the arrow keys",
        radius: () => 16, step: 4,
        get: (f) => { const g = geo(f); return { x: g.x1, y: g.bottom - f.v.bar * (g.bottom - g.top) }; },
        set: (f, x, y) => { const g = geo(f); let v = (g.bottom - y) / (g.bottom - g.top); if (Math.abs(v - EX.bar) < 0.012) v = EX.bar; FS.get(id).set("bar", FS.clamp(v, 0, 1), { instant: true }); },
        bounds: (f) => { const g = geo(f); return { x0: g.x1, x1: g.x1, y0: g.bottom - 0.99 * (g.bottom - g.top), y1: g.bottom - 0.05 * (g.bottom - g.top) }; },
      },
    },
    render(f, c) {
      const C = f.C, g = geo(f), limit = Math.round(f.v.limit), bar = Math.min(0.99, Math.max(0.05, f.v.bar)), hits = (f.state.hits = []);
      const X = (i) => g.x0 + ((i + 0.5) / 12) * (g.x1 - g.x0), Y = (v) => g.bottom - v * (g.bottom - g.top);
      // axes
      c.strokeStyle = C.line; c.lineWidth = 1;
      for (const v of [0, 0.5, 1]) { FS.k.line(c, g.x0, Y(v), g.x1, Y(v)); FS.k.text(f, c, v.toFixed(1), g.x0 - 8, Y(v) + 4, { align: "right", size: 11 }); }
      for (let i = 0; i < 12; i++) FS.k.text(f, c, String(i + 1), X(i), g.bottom + 16, { align: "center", size: 11, alpha: i < limit ? 1 : 0.35 });
      FS.k.text(f, c, "round →", g.x1, g.bottom + 32, { align: "right", size: 11 });
      c.save(); c.translate(8, (g.top + g.bottom) / 2); c.rotate(-Math.PI / 2); FS.k.text(f, c, "judge's score", 0, 0, { align: "center", size: 11 }); c.restore();
      // the round limit
      if (limit < 12) { const xl = (X(limit - 1) + X(limit)) / 2; c.save(); c.setLineDash([3, 4]); c.strokeStyle = C.muted; FS.k.line(c, xl, g.top, xl, g.bottom); c.restore(); FS.k.label(f, c, "round limit", xl + 4, g.bottom - 10, { size: 10.5, color: C.muted }); }
      // the two prompts
      PROMPTS.forEach((p) => {
        const u = used(p, bar, limit), hot = f.hover === p.key, solid = p.key === "hard";
        c.save(); c.strokeStyle = hot ? C.accent : C.fg; c.lineWidth = 1.5; if (!solid) c.setLineDash([4, 3]);
        c.beginPath(); for (let i = 0; i < u.rounds; i++) (i ? c.lineTo : c.moveTo).call(c, X(i), Y(p.scores[i])); c.stroke();
        c.globalAlpha = C.dim; c.beginPath(); for (let i = u.rounds - 1; i < 12; i++) (i > u.rounds - 1 ? c.lineTo : c.moveTo).call(c, X(i), Y(p.scores[i])); c.stroke(); c.restore();
        for (let i = 0; i < 12; i++) {
          const live = i < u.rounds, x = X(i), y = Y(p.scores[i]);
          c.globalAlpha = live ? 1 : C.dim; c.beginPath(); c.arc(x, y, live ? 4 : 3, 0, 7);
          if (solid) { c.fillStyle = hot ? C.accent : C.fg; c.fill(); } else { c.fillStyle = C.surface; c.fill(); c.strokeStyle = hot ? C.accent : C.fg; c.lineWidth = 1.5; c.stroke(); }
          c.globalAlpha = 1;
          if (live) hits.push({ key: p.key, x: x - 8, y: y - 8, w: 16, h: 16 });
        }
        const sx = X(u.rounds - 1), sy = Y(p.scores[u.rounds - 1]);
        const lbl = u.capped ? `${p.name}: hit the limit` : `${p.name} stops, round ${u.rounds}`;
        c.strokeStyle = hot ? C.accent : C.strong; c.lineWidth = 1.25; c.beginPath(); c.arc(sx, sy, 8, 0, 7); c.stroke(); c.lineWidth = 1;
        c.font = FS.k.font(f, 11, 600);
        const lx = Math.min(sx + 12, g.x1 - c.measureText(lbl).width - 4);
        FS.k.label(f, c, lbl, lx, p.key === "hard" ? Math.max(sy + 4, Y(bar) + 14) : sy - 13, { size: 11, weight: 600, color: hot ? C.accent : C.fg });
      });
      // the bar
      const yb = Y(bar), held = f.drag === "bar", near = f.handleHover === "bar" || f.hover === "bar";
      c.strokeStyle = held || near ? C.accent : C.strong; c.lineWidth = held ? 2.25 : near ? 1.75 : 1.25; FS.k.line(c, g.x0, yb, g.x1, yb); c.lineWidth = 1;
      c.fillStyle = C.surface; c.beginPath(); c.arc(g.x1, yb, (held ? 7 : near ? 6 : 4.5) + 2, 0, 7); c.fill();
      c.fillStyle = held || near ? C.accent : C.strong; c.beginPath(); c.arc(g.x1, yb, held ? 7 : near ? 6 : 4.5, 0, 7); c.fill();
      FS.k.label(f, c, `bar ${fmt2(bar)}`, g.x1 - 8, yb + (bar > 0.9 ? 13 : -11), { size: 11, weight: 600, align: "right", color: held || near ? C.accent : C.strong });
      hits.push({ key: "bar", x: g.x0, y: yb - 6, w: g.x1 - g.x0, h: 12 });
      // cost bars
      const max = limit * (PROMPTS[1].tokens + 1), parts = [];
      FS.k.text(f, c, "FORWARD PASSES USED", g.bx0, g.by - 26, { size: 11, weight: 600, color: C.muted });
      PROMPTS.forEach((p, i) => {
        const u = used(p, bar, limit), passes = u.rounds * (p.tokens + 1), y = g.by + i * 58, w = Math.max(2, ((g.bx1 - g.bx0) * passes) / max), hot = f.hover === p.key || f.hover === "cost";
        FS.k.text(f, c, p.name, g.bx0, y, { size: 12, weight: 600, color: C.fg });
        FS.k.rrect(c, g.bx0, y + 8, g.bx1 - g.bx0, 14, 3); c.fillStyle = C.surface2; c.fill();
        FS.k.rrect(c, g.bx0, y + 8, w, 14, 3);
        if (p.key === "hard") { c.fillStyle = hot ? C.accent : C.fg; c.fill(); } else { c.fillStyle = FS.k.hatch(f, c, hot ? C.accent : C.fg, 4); c.fill(); }
        FS.k.text(f, c, `${u.rounds} round${u.rounds > 1 ? "s" : ""} × ${p.tokens + 1} = ${passes} passes`, g.bx0, y + 38, { size: 11 });
        hits.push({ key: "cost", x: g.bx0, y: y - 12, w: g.bx1 - g.bx0, h: 52 });
        parts.push(`${p.name}: ${passes} passes`);
      });
      f.api.out("cost", `Bar ${fmt2(bar)} · ${parts.join(" · ")}`);
    },
  });
})();

/* ================= Fig 5: training with Algorithm 2 (SVG steps) ================= */
(() => {
  const id = "fig-train", K = svgKit(id);
  const judgeLoss = -Math.log(EX.scoreTrue) - Math.log(1 - EX.score2);
  const judgeLossIfWrong = -Math.log(EX.scoreTrue) - Math.log(1 - EX.score1);
  const ROWS = [
    { key: "r1", text: "for each batch of (prompt, true answer):", ref: "l. 1–3", indent: 0, tip: "Sample a minibatch of b pairs (x, y_true) from the data, where x is a prompt and y_true the desired response." },
    { key: "r2", text: "for round 1, 2, … up to the limit:", ref: "l. 4–5", indent: 1, tip: "Start the inner dialogue loop: for i = 1 to IDL_limit." },
    { key: "r3", text: "writer writes a draft, token by token", ref: "l. 6–13", indent: 2, tip: "x_left^j ← Actor(x_left), appended until the end-of-sequence token." },
    { key: "r4", text: "judge scores the draft", ref: "l. 14", indent: 2, tip: "ŷ_right ← Critic(x_left)." },
    { key: "r5", text: "stop if score ≥ bar", ref: "l. 15–16", indent: 2, tip: "if ŷ_right ≥ threshold then break." },
    { key: "r6", text: "otherwise add draft and score to the prompt", ref: "l. 18", indent: 2, tip: "x ← concat(x, x_left, ŷ_right)." },
    { key: "r7", text: "writer's loss uses the score as reward", ref: "l. 20–21", indent: 2, tip: "L_actor = L^CLIP(ŷ_left, y_true, ŷ_right), then backward. L^CLIP is PPO's clipped objective with the judge's score in place of the advantage (Eq. 8)." },
    { key: "r8", text: "judge scores the true answer", ref: "l. 23", indent: 1, tip: "ŷ_right_true ← Critic(x + y_true)." },
    { key: "r9", text: "judge's loss favors true over draft", ref: "l. 24–25", indent: 1, tip: "L_critic = −log(ŷ_right_true) − log(1 − ŷ_right) (Eq. 7), then backward." },
    { key: "r10", text: "step both optimizers", ref: "l. 27–28", indent: 0, tip: "optimizer_critic.step(); optimizer_actor.step()." },
  ];
  const tips = {
    data: { title: "Training example", body: "A prompt and the answer we want. The judge sees the true answer only when it is being trained, never in the loop." },
    writer: { title: "Writer (actor)", body: "Writes drafts. It is trained to make the judge's score go up." },
    judge: { title: "Judge (critic)", body: "Scores text from 0 to 1. It is trained to give the true answer a high score and the writer's draft a low one." },
    wloss: { title: "Writer's loss", body: "PPO's clipped objective with the judge's score as the reward (Eq. 8). Higher score, smaller loss." },
    jloss: { title: "Judge's loss", body: "Binary cross-entropy uses −log of the true answer's score minus log of one minus the draft's score (Eq. 7)." },
  };
  const N = {
    data: box(K, "data", { label: "One training example", sub: "prompt 2534 × 5423 · true answer 13,741,882", tip: tips.data }),
    writer: box(K, "writer", { label: "Writer", sub: "writes drafts", tip: tips.writer }),
    judge: box(K, "judge", { label: "Judge", sub: "scores text", tip: tips.judge }),
    wloss: box(K, "wloss", { label: "Writer's loss", sub: "—", tip: tips.wloss }),
    jloss: box(K, "jloss", { label: "Judge's loss", sub: "—", tip: tips.jloss }),
  };
  const E = { prompt: edge(K, "prompt"), truth: edge(K, "true answer"), draft: edge(K, "draft"), score: edge(K, "score"), wl: edge(K), jl: edge(K) };
  const token = K.el("circle", { r: 6, "stroke-width": 1.5 });
  const scoreText = K.el("text", { "font-size": 11.5 });
  const algoTitle = K.el("text", { "font-size": 11, "font-weight": 600, "letter-spacing": "0.06em" }); algoTitle.textContent = "ALGORITHM 2, IN PLAIN WORDS";
  const R = ROWS.map((r) => {
    const g = K.el("g", { tabindex: "0", role: "img", "aria-label": `${r.text}, ${r.ref}. ${r.tip}`, "data-fs-tip": r.tip, "data-fs-tip-title": `Algorithm 2, ${r.ref}` });
    const bg = K.el("rect", { rx: 5 }, g), t = K.el("text", { "font-size": 12.5 }, g), ref = K.el("text", { "font-size": 10.5, "text-anchor": "end" }, g);
    t.textContent = r.text; ref.textContent = r.ref;
    K.hoverable(g, r.key);
    return { ...r, g, bg, t, refEl: ref };
  });
  const LAYOUTS = {
    wide: { box: [960, 400], at: { data: [20, 14, 420, 52], writer: [40, 150, 150, 52], judge: [270, 150, 150, 52], wloss: [20, 272, 200, 52], jloss: [240, 272, 200, 52] },
      d: { prompt: "M115,66 L115,150", truth: "M345,66 L345,150", draft: "M190,166 L270,166", score: "M270,190 L190,190", wl: "M115,202 L115,272", jl: "M345,202 L345,272" },
      lab: { prompt: [86, 112], truth: [380, 112], draft: [230, 158], score: [230, 208] }, score: [20, 360], algo: [490, 950, 40, 33] },
    narrow: { box: [360, 790], at: { data: [6, 10, 348, 52], writer: [16, 130, 140, 52], judge: [204, 130, 140, 52], wloss: [6, 246, 170, 52], jloss: [184, 246, 170, 52] },
      d: { prompt: "M86,62 L86,130", truth: "M274,62 L274,130", draft: "M156,146 L204,146", score: "M204,170 L156,170", wl: "M86,182 L86,246", jl: "M274,182 L274,246" },
      lab: { prompt: [50, 100], truth: [312, 100], draft: [180, 138], score: [180, 188] }, score: [8, 330], algo: [6, 354, 390, 38] },
  };
  let L = null;
  function layout(name) {
    L = LAYOUTS[name];
    K.svg.setAttribute("viewBox", `0 0 ${L.box[0]} ${L.box[1]}`);
    for (const k in N) N[k].place(...L.at[k]);
    for (const k in E) E[k].place(L.d[k], L.lab[k]);
    K.set(scoreText, { x: L.score[0], y: L.score[1] });
    const [x0, x1, y0, rh] = L.algo, narrow = name === "narrow";
    K.set(algoTitle, { x: x0, y: y0 - 14 });
    R.forEach((r, i) => {
      const y = y0 + i * rh;
      K.set(r.bg, { x: x0, y, width: x1 - x0, height: rh - 5 });
      K.set(r.t, { x: x0 + 12 + r.indent * (narrow ? 14 : 22), y: y + rh / 2 + 2, "font-size": narrow ? 12 : 12.5 });
      K.set(r.refEl, { x: x1 - 10, y: y + rh / 2 + 2 });
    });
  }
  const scores = (n) => [`draft 1 → ${fmt2(EX.score1)}`, `draft 2 → ${fmt2(EX.score2)}`, `true answer → ${fmt2(EX.scoreTrue)}`].slice(0, n).join(" · ");
  const steps = [
    { rows: [], on: ["data", "writer", "judge", "wloss", "jloss"], via: [], scores: 0, wl: "—", jl: "—", caption: "Step through one pass of the draft's Algorithm 2 with one training example and two models." },
    { rows: ["r1"], on: ["data"], via: [], scores: 0, wl: "—", jl: "—", caption: "The training example contains the prompt 2534 × 5423 and the target answer 13,741,882." },
    { rows: ["r2", "r3"], on: ["data", "writer"], via: ["prompt"], scores: 0, wl: "—", jl: "—", caption: "In round 1, the writer reads the prompt and produces “about 13.7 million” one token at a time." },
    { rows: ["r4"], on: ["writer", "judge"], via: ["draft"], scores: 1, wl: "—", jl: "—", caption: `The judge gives the draft a score of ${fmt2(EX.score1)}.` },
    { rows: ["r5", "r6"], on: ["judge", "writer"], via: ["score"], scores: 2, wl: "—", jl: "—", caption: `Because the score is below the bar, the draft and score are added to the prompt before round 2 reaches ${fmt2(EX.score2)} and stops the loop.` },
    { rows: ["r7"], on: ["writer", "wloss"], via: ["wl"], scores: 2, wl: `reward = score ${fmt2(EX.score2)}`, jl: "—", caption: "Each round uses the judge's score as the writer's PPO-style clipped reward, so a higher score produces a smaller loss." },
    { rows: ["r8"], on: ["data", "judge"], via: ["truth"], scores: 3, wl: `reward = score ${fmt2(EX.score2)}`, jl: "—", caption: `After the loop, the judge is shown the true answer and scores it ${fmt2(EX.scoreTrue)}.` },
    { rows: ["r9"], on: ["judge", "jloss"], via: ["jl"], scores: 3, wl: `reward = score ${fmt2(EX.score2)}`, jl: `−ln ${fmt2(EX.scoreTrue)} − ln ${fmt2(1 - EX.score2)} = ${judgeLoss.toFixed(2)}`,
      caption: `The judge's loss is ${judgeLoss.toFixed(2)} because it scored the last draft high, so training pushes its score down even though the draft was correct.` },
    { rows: ["r10"], on: ["writer", "judge", "wloss", "jloss"], via: [], scores: 3, wl: `reward = score ${fmt2(EX.score2)}`, jl: `−ln ${fmt2(EX.scoreTrue)} − ln ${fmt2(1 - EX.score2)} = ${judgeLoss.toFixed(2)}`,
      caption: `Both models take an optimizer step. Had the last draft scored ${fmt2(EX.score1)}, the judge's loss would be ${judgeLossIfWrong.toFixed(2)}.` },
  ];
  FS.figure(id, {
    height: (w) => { const b = LAYOUTS[w < 560 ? "narrow" : "wide"].box; return (w * b[1]) / b[0]; },
    steps, autoplay: false, stepDuration: 0.7,
    resize(f) { const name = f.w < 560 ? "narrow" : "wide"; if (L !== LAYOUTS[name]) layout(name); },
    render(f) {
      const C = f.C, s = steps[f.step], on = new Set(s.on), rows = new Set(s.rows), overview = f.step === 0;
      N.wloss.sub(s.wl); N.jloss.sub(s.jl);
      for (const k in N) N[k].paint(C, { alpha: overview || on.has(k) ? 1 : C.dim, hot: f.hover === k, strong: !overview && on.has(k) });
      const ends = { prompt: ["data", "writer"], truth: ["data", "judge"], draft: ["writer", "judge"], score: ["judge", "writer"], wl: ["writer", "wloss"], jl: ["judge", "jloss"] };
      for (const k in E) { const lit = s.via.includes(k), touch = f.hover && ends[k].includes(f.hover); E[k].paint(C, { alpha: overview || lit || touch ? 1 : 0.22, active: lit || touch }); }
      if (s.via.length) { const p = along(s.via.map((k) => E[k]), FS.ease.inOut(f.stepT)); K.set(token, { cx: p.x.toFixed(1), cy: p.y.toFixed(1), opacity: 1 }); }
      else K.set(token, { opacity: 0 });
      K.set(token, { fill: C.accent, stroke: C.surface });
      scoreText.textContent = s.scores ? `Scores: ${scores(s.scores)}` : "";
      scoreText.setAttribute("fill", C.fg);
      algoTitle.setAttribute("fill", C.muted);
      R.forEach((r) => {
        const lit = rows.has(r.key), hot = f.hover === r.key;
        r.g.setAttribute("opacity", overview || lit || hot ? 1 : 0.45);
        K.set(r.bg, { fill: lit ? C.surface2 : "none", stroke: hot ? C.accent : lit ? C.lineStrong : "none" });
        K.set(r.t, { fill: C.fg, "font-weight": lit ? 600 : 400 }); r.refEl.setAttribute("fill", C.muted);
      });
    },
  });
})();

/* ================= Fig 6: Pavlovian gradient decay (canvas, λ inline) ================= */
(() => {
  const id = "fig-decay", C0 = 1;
  const tips = {
    pos: { title: "True answer, cut short", body: "A positive example is the true answer stopped early. Its value is C₀ · e^(−λΔT), so the full answer gets C₀ and shorter prefixes get less." },
    neg: { title: "Writer's draft", body: "A negative example is the writer's draft from one round. Its value is 1 − C₀ · e^(−λΔT), so the last draft gets 0 and early drafts get almost 1." },
    lambda: { title: "Decay rate", body: "How quickly values fall with the number of rounds before the end. The draft gives 0.1 to 0.5 as typical in human conditioning." },
  };
  FS.figure(id, {
    height: (w) => (w < 560 ? 330 : 290),
    params: {
      lambda: { value: 0.3, min: 0, max: 1, step: 0.01, label: "λ", placement: "inline", marks: [{ value: 0.1, label: "0.1" }, { value: 0.3, label: "default" }, { value: 0.5, label: "0.5" }], format: (v) => v.toFixed(2) },
      n: { value: 5, min: 2, max: 8, step: 1, label: "Rounds", format: (v) => `${Math.round(v)}` },
    },
    reserve: { readout: ["λ 0.00 · first draft 0.00 · last draft 0.00 · shortest true prefix 0.00"] },
    autoplay: false,
    tips,
    tipAt: (f, x, y) => f.state.hits?.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)?.key ?? null,
    render(f, c) {
      const C = f.C, narrow = f.w < 560, lam = f.v.lambda, n = Math.round(f.v.n), hits = (f.state.hits = []);
      const x0 = narrow ? 34 : 52, x1 = f.w - 16, top = narrow ? 58 : 46, bottom = f.h - (narrow ? 54 : 50);
      const Y = (v) => bottom - v * (bottom - top), G = (x1 - x0) / (n + 1), bw = Math.min(26, G * 0.32);
      // legend
      const lg = (x, y, hatch, text, key) => {
        FS.k.rrect(c, x, y - 9, 14, 10, 2);
        if (hatch) { c.fillStyle = C.surface2; c.fill(); FS.k.rrect(c, x, y - 9, 14, 10, 2); c.fillStyle = FS.k.hatch(f, c, f.hover === key ? C.accent : C.fg, 3.5); c.fill(); } else { c.fillStyle = f.hover === key ? C.accent : C.fg; c.fill(); }
        FS.k.text(f, c, text, x + 20, y, { size: 11.5, color: C.fg });
        hits.push({ key, x, y: y - 12, w: 200, h: 16 });
      };
      lg(x0, 16, false, "true answer, cut short (positive)", "pos");
      if (narrow) lg(x0, 34, true, "writer's draft from that round (negative)", "neg"); else lg(x0 + 260, 16, true, "writer's draft from that round (negative)", "neg");
      c.strokeStyle = C.line; c.lineWidth = 1;
      for (const v of [0, 0.5, 1]) { FS.k.line(c, x0, Y(v), x1, Y(v)); FS.k.text(f, c, v.toFixed(1), x0 - 8, Y(v) + 4, { align: "right", size: 11 }); }
      // the curve C0·e^(−λΔT), through the positives
      c.save(); c.strokeStyle = f.hover === "lambda" ? C.accent : C.muted; c.lineWidth = f.hover === "lambda" ? 1.75 : 1; c.setLineDash([3, 3]); c.beginPath();
      for (let i = 0; i <= 60; i++) { const k = (i / 60) * n, x = x0 + (k + 0.5) * G - bw / 2 - 1, v = C0 * Math.exp(-lam * (n - k)); i ? c.lineTo(x, Y(v)) : c.moveTo(x, Y(v)); }
      c.stroke(); c.restore();
      for (let k = 0; k <= n; k++) {
        const dT = n - k, pos = C0 * Math.exp(-lam * dT), neg = 1 - pos, cx = x0 + (k + 0.5) * G;
        const px = cx - bw - 1, nx = cx + 1;
        FS.k.rrect(c, px, Y(pos), bw, Math.max(1, Y(0) - Y(pos)), 2); c.fillStyle = f.hover === "pos" ? C.accent : C.fg; c.fill();
        hits.push({ key: "pos", x: px, y: top, w: bw, h: bottom - top });
        if (neg > 0.002) { FS.k.rrect(c, nx, Y(neg), bw, Y(0) - Y(neg), 2); c.fillStyle = C.surface2; c.fill(); FS.k.rrect(c, nx, Y(neg), bw, Y(0) - Y(neg), 2); c.fillStyle = FS.k.hatch(f, c, f.hover === "neg" ? C.accent : C.fg, 3.5); c.fill(); c.strokeStyle = f.hover === "neg" ? C.accent : C.fg; c.stroke(); }
        else { c.strokeStyle = C.fg; FS.k.line(c, nx, Y(0) - 0.5, nx + bw, Y(0) - 0.5); }
        hits.push({ key: "neg", x: nx, y: top, w: bw, h: bottom - top });
        if (!narrow || k === 0 || k === n) {
          FS.k.label(f, c, fmt2(pos), px + bw / 2, Y(pos) - 8, { size: 10.5, align: "center", color: C.fg });
          FS.k.label(f, c, fmt2(neg), nx + bw / 2, Y(neg) - 8, { size: 10.5, align: "center", color: C.fg });
        }
        FS.k.text(f, c, narrow ? `${dT}` : `ΔT = ${dT}`, cx, bottom + 16, { align: "center", size: 11, color: C.fg });
      }
      if (!narrow) { FS.k.text(f, c, "← first round", x0, bottom + 34, { size: 11 }); FS.k.text(f, c, "end of the loop →", x1, bottom + 34, { align: "right", size: 11 }); }
      FS.k.text(f, c, narrow ? "ΔT = rounds before the end of the loop" : "ΔT = rounds before the end", (x0 + x1) / 2, bottom + 34, { align: "center", size: 11 });
      const first = 1 - C0 * Math.exp(-lam * n);
      f.api.out("readout", `λ ${lam.toFixed(2)} · first draft ${fmt2(first)} · last draft ${fmt2(1 - C0)} · shortest true prefix ${fmt2(C0 * Math.exp(-lam * n))}`);
    },
  });
})();

/* ================= Fig 7: memory of backpropagating through the loop (canvas) ================= */
(() => {
  const id = "fig-memory", TOK = 12;
  const BARS = [
    { key: "measured", name: "Pythia-70M, batch 1", note: "measured, “a 30x increase” over the model", gb: 3.9 },
    { key: "projected", name: "8-billion-weight model", note: "the author's projection", gb: 240 },
  ];
  const tips = {
    tok: { title: "Writer token step", body: "One forward pass of the writer, producing one soft token. Its activations must be kept for the backward pass." },
    judge: { title: "Judge step", body: "The judge's single pass that scores the round's draft." },
    measured: { title: "Measured", body: "3.9 GB of GPU memory for Pythia-70M at batch size 1, which the draft calls 30× the model's size (Section 5.1)." },
    projected: { title: "Projected", body: "The draft estimates 240 GB for a “small” 8B model and calls it “prohibitive”. This was not measured (Section 5.1)." },
    dropped: { title: "Dropped", body: "With truncated backpropagation, these rounds are not kept and receive no gradient. Only the last round learns." },
  };
  FS.figure(id, {
    height: (w) => (w < 560 ? 440 : 250),
    params: {
      keep: { value: "all", label: "Keep", placement: "inline", options: [{ value: "all", label: "Every round" }, { value: "last", label: "Last round only" }] },
      rounds: { value: 6, min: 1, max: 8, step: 1, label: "Rounds", format: (v) => `${Math.round(v)}` },
    },
    reserve: { kept: ["Kept for the backward pass: 104 of 104 steps (8 rounds × 13)", "Kept: 13 of 104 steps; rounds 1 to 7 get no gradient"] },
    tips,
    tipAt: (f, x, y) => f.state.hits?.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)?.key ?? null,
    settle: 1,
    init(f) { f.state.mix = 0; },
    update(f, dt) { f.state.mix = FS.damp(f.state.mix, f.params.keep === "last" ? 1 : 0, 10, dt); },
    render(f, c) {
      const C = f.C, narrow = f.w < 560, d = Math.round(f.v.rounds), hits = (f.state.hits = []);
      if (!f.playing) f.state.mix = f.params.keep === "last" ? 1 : 0;
      const mix = f.state.mix;
      // the unrolled loop
      const gx0 = 8, gx1 = narrow ? f.w - 8 : Math.round(f.w * 0.52), gy0 = 34, labelW = 64;
      const cell = Math.min(18, (gx1 - gx0 - labelW - 12) / (TOK + 1.8)), rowH = Math.min(cell + 6, (narrow ? 200 : f.h - 70) / Math.max(d, 6));
      FS.k.text(f, c, "THE LOOP, UNROLLED", gx0, 16, { size: 11, weight: 600, color: C.muted });
      for (let r = 0; r < d; r++) {
        const y = gy0 + r * rowH, last = r === d - 1, kept = last ? 1 : 1 - mix;
        FS.k.text(f, c, `Round ${r + 1}`, gx0, y + cell / 2 + 4, { size: 11, color: C.fg });
        for (let i = 0; i <= TOK; i++) {
          const judge = i === TOK, x = gx0 + labelW + i * (cell + 2) + (judge ? 10 : 0);
          c.globalAlpha = 1;
          if (judge) { c.beginPath(); c.arc(x + cell / 2, y + cell / 2, cell / 2 - 1, 0, 7); } else FS.k.rrect(c, x, y, cell, cell, 3);
          c.fillStyle = C.surface; c.fill(); c.strokeStyle = C.lineStrong; c.lineWidth = 1; c.stroke();
          if (kept > 0.01) {
            c.globalAlpha = kept;
            if (judge) { c.beginPath(); c.arc(x + cell / 2, y + cell / 2, cell / 2 - 1, 0, 7); } else FS.k.rrect(c, x, y, cell, cell, 3);
            c.fillStyle = f.hover === (judge ? "judge" : "tok") ? C.accent : C.fg; c.fill(); c.globalAlpha = 1;
          }
          hits.push({ key: !last && mix > 0.5 ? "dropped" : judge ? "judge" : "tok", x, y, w: cell, h: cell });
        }
      }
      const ly = gy0 + d * rowH + 8;
      FS.k.text(f, c, "■ writer token  ● judge  filled = kept", gx0, ly + 10, { size: 11 });
      // the draft's two numbers
      const bx0 = narrow ? 8 : gx1 + 48, bx1 = f.w - 16, by0 = narrow ? ly + 54 : 34, span = bx1 - bx0;
      FS.k.text(f, c, "GPU MEMORY, FULL BACKPROPAGATION", bx0, by0 - 18, { size: 11, weight: 600, color: C.muted });
      BARS.forEach((b, i) => {
        const y = by0 + i * 70, w = Math.max(3, (span * b.gb) / 240), hot = f.hover === b.key, a = 1 - mix * (1 - C.dim);
        c.globalAlpha = a;
        FS.k.text(f, c, b.name, bx0, y + 10, { size: 12, weight: 600, color: C.fg });
        FS.k.rrect(c, bx0, y + 18, span, 16, 3); c.fillStyle = C.surface2; c.fill();
        FS.k.rrect(c, bx0, y + 18, w, 16, 3);
        if (b.key === "measured") { c.fillStyle = hot ? C.accent : C.fg; c.fill(); } else { c.fillStyle = FS.k.hatch(f, c, hot ? C.accent : C.fg, 4); c.fill(); c.strokeStyle = hot ? C.accent : C.fg; c.stroke(); }
        FS.k.text(f, c, `${b.gb} GB · ${b.note}`, bx0, y + 50, { size: 11.5, color: C.fg });
        c.globalAlpha = 1;
        hits.push({ key: b.key, x: bx0, y, w: span, h: 56 });
      });
      if (mix > 0.02) FS.k.label(f, c, "No number in the draft for truncation", bx0 + span / 2, by0 + 2 * 70 + 2, { align: "center", size: 12, weight: 600, alpha: mix, color: C.strong });
      const all = d * (TOK + 1);
      f.api.out("kept", f.params.keep === "last" ? (d > 1 ? `Kept: ${TOK + 1} of ${all} steps; rounds 1 to ${d - 1} get no gradient` : `Kept: ${TOK + 1} of ${all} steps; with one round nothing is dropped`)
        : `Kept for the backward pass: ${all} of ${all} steps (${d} round${d > 1 ? "s" : ""} × ${TOK + 1})`);
    },
  });
})();

/* ================= Fig 8: the draft, page by page (SVG steps) ================= */
(() => {
  const id = "fig-draft", K = svgKit(id);
  const KINDS = {
    arg: { name: "Argument and motivation" },
    arch: { name: "Architecture figures" },
    train: { name: "Training methods" },
    end: { name: "Results and end matter" },
  };
  const PAGES = [
    ["arg", ["Title,", "abstract"], "Title, date, and the abstract's three configurations: tall, wide and lateralized."],
    ["arg", ["Abstract,", "motivation"], "The abstract ends with improvements “of XX%”; then the motivation: hallucinations, specialization, adaptive compute.", "XX%"],
    ["arg", ["Brain", "growth"], "Figure 1, brain size over time, self-play, and the evolution argument with the brain sizes."],
    ["arg", ["Hemi-", "spheres"], "The corpus callosum, the Hofstadter quote, and the AI view; the adaptive-computation citation reads “[insert]”.", "[insert]"],
    ["arg", ["Two-model", "precedents"], "Self-play history, hide-and-seek “(insert paper)”, and RLHF, GANs and actor-critic as two-model precedents.", "(insert paper)"],
    ["arg", ["Contri-", "butions"], "Section 1.4 is “TODO”; the contributions end “[NEED TO GO PROVE!]”; Related Work is “(TODO)”.", "TODO"],
    ["arg", ["Method:", "the brain"], "Section 3: how the two hemispheres might split the work, and the start of an eight-step account of learning."],
    ["arch", ["Figure 2", "template"], "Figure 2: the template loop, two lobes, a stop check, an optional encoder and decoder."],
    ["arch", ["Figure 3", "tall"], "Figure 3: the tall shape, one pretrained model copied into both lobes."],
    ["arch", ["Figure 4", "wide"], "Figure 4: the wide shape, the first and last 3 blocks, a main gating network, thin gated experts."],
    ["train", ["Steps,", "datasets"], "The rest of the eight steps, then the training sets: games, code and logic."],
    ["arch", ["Figure 5", "lateral."], "Figure 5: the lateralized shape, where the right lobe outputs a reward only."],
    ["train", ["Test sets,", "cost"], "Test sets, several with question marks (“Gridworld?”); the cost of a round; the lateralized setup.", "?"],
    ["train", ["RLHF,", "soft tokens"], "Equations 1 to 3: fine-tuning, RLHF, and soft tokens for training straight through the loop."],
    ["train", ["Memory,", "GAN"], "The only measurement: 3.9 GB for Pythia-70M at batch size 1. Then the GAN method, Algorithm 1.", null, true],
    ["train", ["Actor-", "critic"], "Section 5.3: the writer as actor, the judge as critic, Equations 7 and 8."],
    ["train", ["Algo-", "rithm 2"], "Algorithm 2, the actor-critic training loop."],
    ["train", ["Self-", "play"], "Section 5.4, self-play, and the start of 5.5."],
    ["train", ["Pavlovian", "decay"], "Equation 9 and the decayed positives and negatives."],
    ["train", ["SPIN,", "results"], "“TODO Describe LLaMAC”, Algorithm 3 (SPIN), then Section 6, Results: “TODO :)”.", "TODO :)"],
    ["end", ["Tables,", "appendix"], "Table 1 blank; Table 2 “Widgets 42, Gadgets 13”; Analysis “(TODO)”; Discussion blank; the Overleaf appendix.", "blank"],
    ["end", ["Refer-", "ences"], "One reference: Greenwade 1993, the Overleaf template's sample citation.", "1 ref"],
  ].map(([kind, label, body, mark, measured], i) => ({ n: i + 1, kind, label, body, mark, measured: !!measured }));
  const withMarks = PAGES.filter((p) => p.mark).length;
  const count = (k) => PAGES.filter((p) => p.kind === k).length;
  const T = PAGES.map((p) => {
    const g = K.el("g", { tabindex: "0", role: "img", "aria-label": `Page ${p.n}: ${p.body}`, "data-fs-tip": p.body, "data-fs-tip-title": `Page ${p.n}` });
    const rect = K.el("rect", { rx: 5 }, g), hatch = K.el("rect", { rx: 5, fill: "url(#draft-hatch)" }, g);
    const num = K.el("text", { "font-size": 12, "font-weight": 600 }, g); num.textContent = String(p.n);
    const l1 = K.el("text", { "font-size": 10.5 }, g), l2 = K.el("text", { "font-size": 10.5 }, g); l1.textContent = p.label[0]; l2.textContent = p.label[1];
    const dot = K.el("circle", { r: 4.5, "stroke-width": 1.75 }, g), star = K.el("text", { "font-size": 10.5, "font-weight": 600, "text-anchor": "end" }, g);
    star.textContent = p.measured ? "3.9 GB" : "";
    K.hoverable(g, `p${p.n}`);
    return { ...p, g, rect, hatch, num, l1, l2, dot, star };
  });
  const defs = K.el("defs"), pat = K.el("pattern", { id: "draft-hatch", width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  const hatchLine = K.el("line", { x1: 0, y1: 0, x2: 0, y2: 5, "stroke-width": 1.2 }, pat);
  const legend = Object.entries(KINDS).map(([k, v]) => { const g = K.el("g"); const sw = K.el("rect", { width: 16, height: 12, rx: 3 }, g), sh = K.el("rect", { width: 16, height: 12, rx: 3, fill: "url(#draft-hatch)" }, g), t = K.el("text", { "font-size": 11.5 }, g); t.textContent = `${v.name} (${count(k)})`; return { k, g, sw, sh, t }; });
  const lgMark = K.el("g"), lgDot = K.el("circle", { r: 4.5 }, lgMark), lgText = K.el("text", { "font-size": 11.5 }, lgMark); lgText.textContent = "holds a placeholder";
  const lgMeas = K.el("g"), lgRing = K.el("circle", { r: 4.5, fill: "none", "stroke-width": 1.75 }, lgMeas), lgMText = K.el("text", { "font-size": 11.5 }, lgMeas); lgMText.textContent = "the one measurement";
  const LAYOUTS = {
    wide: { box: [960, 300], cols: 11, tw: 66, th: 84, gap: 14, x0: 47, y0: 18, labels: true, legend: (i) => [47 + (i % 3) * 300, 236 + Math.floor(i / 3) * 24] },
    narrow: { box: [360, 434], cols: 6, tw: 48, th: 56, gap: 10, x0: 11, y0: 12, labels: false, legend: (i) => [11, 290 + i * 24] },
  };
  let L = null;
  function layout(name) {
    L = LAYOUTS[name];
    K.svg.setAttribute("viewBox", `0 0 ${L.box[0]} ${L.box[1]}`);
    T.forEach((p, i) => {
      const x = L.x0 + (i % L.cols) * (L.tw + L.gap), y = L.y0 + Math.floor(i / L.cols) * (L.th + L.gap + (L.labels ? 6 : 0));
      p.box = [x, y];
      K.set(p.rect, { x, y, width: L.tw, height: L.th }); K.set(p.hatch, { x, y, width: L.tw, height: L.th });
      K.set(p.num, { x: x + 8, y: y + 17 });
      K.set(p.l1, { x: x + 8, y: y + L.th - 24, opacity: L.labels ? 1 : 0 }); K.set(p.l2, { x: x + 8, y: y + L.th - 10, opacity: L.labels ? 1 : 0 });
      K.set(p.dot, { cx: x + L.tw - 10, cy: y + 12 });
      K.set(p.star, { x: x + L.tw - 6, y: y + 34, opacity: L.labels ? 1 : 0 });
    });
    const items = [...legend.map((l) => l.g), lgMark, lgMeas];
    items.forEach((g, i) => g.setAttribute("transform", `translate(${L.legend(i).join(",")})`));
    legend.forEach((l) => { K.set(l.sw, { x: 0, y: -10 }); K.set(l.sh, { x: 0, y: -10 }); K.set(l.t, { x: 24, y: 0 }); });
    K.set(lgDot, { cx: 8, cy: -4 }); K.set(lgText, { x: 24, y: 0 }); K.set(lgRing, { cx: 8, cy: -4 }); K.set(lgMText, { x: 24, y: 0 });
  }
  const steps = [
    { lit: null, caption: `The ${PAGES.length} pages contain ${count("arg")} pages of argument, ${count("arch")} of architecture figures, ${count("train")} of training methods, and ${count("end")} of results and end matter.` },
    { lit: [2], caption: "On page 2, the abstract promises “remarkable improvements on many common benchmarks of XX%”." },
    { lit: [4, 5], caption: "Pages 4 and 5 contain two unfilled citations, “[insert]” and “(insert paper)”." },
    { lit: [6], caption: "On page 6, Section 1.4 is “TODO”, the last contribution ends “[NEED TO GO PROVE!]”, and Related Work is “(TODO)”." },
    { lit: [13], caption: "On page 13, the planned test sets include “Gridworld?” and “Stockfish for chess?”, including the question marks." },
    { lit: [15], caption: "Page 15 contains the only number the author measured, 3.9 GB of GPU memory for Pythia-70M at batch size 1." },
    { lit: [20], caption: "Page 20 says “TODO Describe LLaMAC”, and Section 6, Results, reads “TODO :)”." },
    { lit: [21], caption: "On page 21, Table 1 is blank, Table 2 contains the template's “Widgets 42, Gadgets 13”, and the appendix contains Overleaf's help text." },
    { lit: [22], caption: "Page 22 contains one reference, the template's Greenwade 1993 sample, while the works named in the text are absent from the list." },
  ];
  FS.figure(id, {
    height: (w) => { const b = LAYOUTS[w < 560 ? "narrow" : "wide"].box; return (w * b[1]) / b[0]; },
    steps, autoplay: false,
    reserve: { count: [`Fig. 8 · placeholders on ${withMarks} of ${PAGES.length} pages`] },
    resize(f) { const name = f.w < 560 ? "narrow" : "wide"; if (L !== LAYOUTS[name]) layout(name); },
    render(f) {
      const C = f.C, s = steps[f.step], lit = s.lit && new Set(s.lit);
      hatchLine.setAttribute("stroke", C.muted);
      T.forEach((p) => {
        const on = !lit || lit.has(p.n), hot = f.hover === `p${p.n}`, focus = lit && lit.has(p.n);
        p.g.setAttribute("opacity", hot || on ? 1 : C.dim);
        const fill = p.kind === "arg" ? C.surface2 : C.surface;
        K.set(p.rect, { fill, stroke: hot ? C.accent : focus ? C.fg : p.kind === "arch" ? C.fg : C.lineStrong, "stroke-width": hot || focus ? 1.75 : 1, "stroke-dasharray": p.kind === "end" ? "4 3" : "none" });
        p.hatch.setAttribute("opacity", p.kind === "train" ? 0.55 : 0);
        p.num.setAttribute("fill", C.fg); p.l1.setAttribute("fill", C.muted); p.l2.setAttribute("fill", C.muted);
        K.set(p.dot, { fill: p.mark ? C.accent : "none", stroke: p.measured ? C.strong : "none", opacity: p.mark || p.measured ? 1 : 0 });
        p.star.setAttribute("fill", C.strong);
      });
      legend.forEach((l) => {
        K.set(l.sw, { fill: l.k === "arg" ? C.surface2 : C.surface, stroke: l.k === "arch" ? C.fg : C.lineStrong, "stroke-dasharray": l.k === "end" ? "4 3" : "none" });
        l.sh.setAttribute("opacity", l.k === "train" ? 0.55 : 0); l.t.setAttribute("fill", C.fg);
      });
      lgDot.setAttribute("fill", C.accent); lgText.setAttribute("fill", C.fg); lgRing.setAttribute("stroke", C.strong); lgMText.setAttribute("fill", C.fg);
      f.api.out("count", `Fig. 8 · placeholders on ${withMarks} of ${PAGES.length} pages`);
    },
  });
})();
