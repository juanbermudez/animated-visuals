// Check-yourself behaviour from the guide template: mark the choice, reveal reasons, show the answer after 2 misses.
document.querySelectorAll("[data-guide-check]").forEach((check) => {
  const options = [...check.querySelectorAll(".guide-options > button")];
  let wrong = 0;
  options.forEach((option) => option.addEventListener("click", () => {
    const right = option.hasAttribute("data-correct");
    option.dataset.chosen = "";
    option.dataset.result = right ? "right" : "wrong";
    option.disabled = true;
    if (right) options.forEach((item) => { item.disabled = true; });
    else if (++wrong >= 2) {
      const answer = options.find((item) => item.hasAttribute("data-correct"));
      if (answer) answer.dataset.answer = "";
      options.forEach((item) => { item.disabled = true; });
    }
  }));
});

// The build inlines data.js before this file.


// ---------------------------------------------------------------- shared drawing helpers
const EX = data;
const BASE = EX.run();
const LONG = EX.run({ steps: 30 });
const f2 = (v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
const pair = (p) => `(${f2(p[0])}, ${f2(p[1])})`;
const minus = (s) => s.replace(/-/g, "−");
const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
const NARROW = 560;

// A square 2-D plane for feature space, with a side panel on wide plates and a panel below on narrow ones.
function plane(f, { min = -0.45, max = 2.45, panel = 230 } = {}) {
  const narrow = f.w < NARROW;
  const size = narrow ? f.w - 8 : Math.min(f.h - 16, f.w - panel - 40);
  const left = narrow ? 4 : Math.max(8, (f.w - panel - size - 32) / 2);
  const top = 8;
  const S = (size - 44) / (max - min);
  const ox = left + 40;
  const oy = top;
  const X = (v) => ox + (v - min) * S;
  const Y = (v) => oy + (max - v) * S;
  const panelBox = narrow
    ? { x: 8, y: top + size + 8, w: f.w - 16 }
    : { x: left + size + 32, y: top + 8, w: panel };
  return { X, Y, S, min, max, left: ox, right: X(max), top: oy, bottom: Y(min), size, narrow, panel: panelBox };
}
const planeHeight = (extra) => (w) => (w < NARROW ? w + extra : 400);

function drawAxes(f, c, P) {
  const C = f.C;
  c.lineWidth = 1;
  c.strokeStyle = C.line;
  for (let v = Math.ceil(P.min); v <= Math.floor(P.max); v += 1) {
    FS.k.line(c, P.X(v), P.top, P.X(v), P.bottom);
    FS.k.line(c, P.left, P.Y(v), P.right, P.Y(v));
    FS.k.text(f, c, String(v), P.X(v), P.bottom + 14, { align: "center", size: 11 });
    FS.k.text(f, c, String(v), P.left - 8, P.Y(v) + 4, { align: "right", size: 11 });
  }
  FS.k.text(f, c, "camera direction →", P.right, P.bottom + 30, { align: "right", size: 11 });
  c.save();
  c.translate(P.left - 26, P.top + 4);
  c.rotate(-Math.PI / 2);
  FS.k.text(f, c, "lens direction →", 0, 0, { align: "right", size: 11 });
  c.restore();
}

function drawMemories(f, c, P, alpha = 1) {
  const C = f.C;
  EX.PATTERNS.forEach((p, i) => {
    const x = P.X(p.m[0]);
    const y = P.Y(p.m[1]);
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = C.strong;
    c.beginPath();
    c.rect(x - 6, y - 6, 12, 12);
    c.fill();
    c.restore();
    const label = i === 0 ? { x, y: y + 20, align: "center" } : { x: x + 12, y, align: "left" };
    FS.k.label(f, c, p.name, label.x, label.y, { size: 11, align: label.align, alpha, color: C.fg });
  });
}

function drawEdges(f, c, P, X, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  c.strokeStyle = f.C.lineStrong;
  c.lineWidth = 1;
  c.setLineDash([4, 4]);
  for (const [u, v] of EX.EDGES) FS.k.line(c, P.X(X[u][0]), P.Y(X[u][1]), P.X(X[v][0]), P.Y(X[v][1]));
  c.restore();
}

function drawNode(f, c, x, y, id, { focus = false, alpha = 1, r = 11 } = {}) {
  const C = f.C;
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = C.node;
  c.strokeStyle = focus ? C.accent : C.fg;
  c.lineWidth = focus ? 2 : 1.25;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();
  FS.k.text(f, c, id, x, y + 4, { align: "center", size: 11, weight: 600, color: C.strong, alpha });
}

// Products in feature space: a dot with its letter beside it, so nodes that sit close together stay readable.
const LABEL_OFFSET = { A: [10, 14, "left"], B: [-10, -10, "right"], C: [-10, -12, "right"], D: [10, -10, "left"] };
function drawDot(f, c, x, y, id, { focus = false, alpha = 1 } = {}) {
  const C = f.C;
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = focus ? C.accent : C.fg;
  c.strokeStyle = C.surface;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, focus ? 6 : 5, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();
  const [dx, dy, align] = LABEL_OFFSET[id] || [10, -10, "left"];
  FS.k.label(f, c, id, x + dx, y + dy, { size: 12, weight: 600, align, alpha, color: focus ? C.strong : C.fg });
}

// A two-part bar: solid for the camera share, hatched for the lens share. Reads without hue.
function weightBar(f, c, x, y, w, h, camera, alpha = 1) {
  const C = f.C;
  c.save();
  c.globalAlpha = alpha;
  FS.k.rrect(c, x, y, w, h, 3);
  c.fillStyle = FS.k.hatch(f, c, C.muted, 5);
  c.fill();
  c.save();
  FS.k.rrect(c, x, y, w, h, 3);
  c.clip();
  c.fillStyle = C.fg;
  c.fillRect(x, y, w * camera, h);
  c.restore();
  c.strokeStyle = C.lineStrong;
  c.lineWidth = 1;
  FS.k.rrect(c, x, y, w, h, 3);
  c.stroke();
  c.restore();
}

function arrow(f, c, from, to, { color, width = 1.5, alpha = 1 } = {}) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (length < 2) return;
  c.save();
  c.globalAlpha = alpha;
  FS.k.arrow(c, from[0], from[1], to[0], to[1], color || f.C.fg, width);
  c.restore();
}

function panelRows(f, c, P, rows, { title } = {}) {
  const C = f.C;
  const box = P.panel;
  let y = box.y;
  if (title) {
    FS.k.text(f, c, title, box.x, y + 10, { size: 11, weight: 600, color: C.fg });
    y += 26;
  }
  const columns = P.narrow && rows.length > 1 ? 2 : 1;
  const columnWidth = (box.w - (columns - 1) * 20) / columns;
  rows.forEach((row, i) => {
    const col = i % columns;
    const line = Math.floor(i / columns);
    const x = box.x + col * (columnWidth + 20);
    const yy = y + line * 46;
    FS.k.text(f, c, row.label, x, yy + 10, { size: 11, weight: row.focus ? 600 : 500, color: row.focus ? C.strong : C.fg });
    FS.k.text(f, c, row.value, x + columnWidth, yy + 10, { size: 11, align: "right", color: C.muted, mono: true });
    weightBar(f, c, x, yy + 18, columnWidth, 9, row.camera);
  });
  return y + Math.ceil(rows.length / columns) * 46;
}

// ---------------------------------------------------------------- hero: graph view of the running example
(() => {
  const END = EX.settings.steps;
  const layoutGraph = (f) => {
    const narrow = f.w < NARROW;
    const g = narrow ? { x: 28, y: 18, w: f.w - 56, h: 180 } : { x: 40, y: 22, w: f.w * 0.56 - 40, h: 190 };
    const mem = narrow ? { x: 16, y: g.y + g.h + 50, w: f.w - 32, row: true } : { x: f.w * 0.64, y: 40, w: f.w * 0.36 - 28, row: false };
    const track = { x0: narrow ? 52 : 72, x1: f.w - (narrow ? 24 : 40), y: f.h - 28 };
    const spots = [[0.08, 0.08], [0.08, 0.72], [0.48, 0.4], [0.84, 0.84]].map(([u, v]) => [g.x + u * g.w, g.y + v * g.h]);
    return { narrow, g, mem, track, spots };
  };
  const at = (t) => {
    const i = FS.clamp(Math.floor(t), 0, END - 1);
    const u = FS.ease.inOut(FS.clamp(t - i));
    return BASE[i].parts.map((p, n) => p.w[0] + (BASE[i + 1].parts[n].w[0] - p.w[0]) * u);
  };
  FS.figure("fig-hero", {
    height: (w) => (w < NARROW ? 380 : 300),
    duration: END + 0.6,
    keyframe: END + 0.6,
    formatTime: (t) => `step ${Math.min(END, t).toFixed(1)}`,
    timeAxis: (f) => { const L = layoutGraph(f); return { x0: L.track.x0, x1: L.track.x1, t0: 0, t1: END }; },
    tips: {
      C: { title: "Product C", body: "Its features were masked, so it starts at (0, 0) with no lean either way." },
      edge: { title: "Bought together", body: "An edge joins two products that are bought together. C has three neighbours." },
      memory: { title: "Memory", body: "A stored vector for one kind of product. Every product is compared with both." },
    },
    tipAt: (f, x, y) => f.state.hits?.find((h) => Math.hypot(x - h.x, y - h.y) < h.r)?.key ?? null,
    render(f, c) {
      const C = f.C;
      const L = layoutGraph(f);
      const t = FS.clamp(f.t, 0, END);
      const w = at(t);
      const hits = (f.state.hits = []);
      c.strokeStyle = C.lineStrong;
      c.lineWidth = 1.25;
      for (const [u, v] of EX.EDGES) FS.k.line(c, L.spots[u][0], L.spots[u][1], L.spots[v][0], L.spots[v][1]);
      const mid = lerp2(L.spots[2], L.spots[3], 0.5);
      hits.push({ key: "edge", x: mid[0], y: mid[1], r: 16 });
      const cards = EX.PATTERNS.map((p, i) => {
        const cw = L.mem.row ? (L.mem.w - 12) / 2 : L.mem.w;
        const x = L.mem.row ? L.mem.x + i * (cw + 12) : L.mem.x;
        const y = L.mem.row ? L.mem.y : L.mem.y + i * 92;
        return { x, y, w: cw, h: 54, p };
      });
      // Links from C to each memory, as strong as C's weight on it.
      cards.forEach((card, i) => {
        const share = i === 0 ? w[2] : 1 - w[2];
        c.save();
        c.globalAlpha = 0.2 + 0.8 * share;
        c.strokeStyle = C.accent;
        c.lineWidth = 0.75 + 2.5 * share;
        c.setLineDash([3, 4]);
        const target = L.mem.row ? [card.x + card.w / 2, card.y] : [card.x, card.y + card.h / 2];
        FS.k.line(c, L.spots[2][0], L.spots[2][1], target[0], target[1]);
        c.restore();
      });
      cards.forEach((card) => {
        FS.k.rrect(c, card.x, card.y, card.w, card.h, 6);
        c.fillStyle = C.node;
        c.fill();
        c.strokeStyle = C.lineStrong;
        c.lineWidth = 1;
        c.stroke();
        FS.k.text(f, c, card.p.name, card.x + 12, card.y + 22, { size: 12, weight: 600, color: C.fg });
        FS.k.text(f, c, `(${card.p.m.join(", ")})`, card.x + 12, card.y + 40, { size: 11, mono: true });
        hits.push({ key: "memory", x: card.x + card.w / 2, y: card.y + card.h / 2, r: 30 });
      });
      EX.NODES.forEach((node, n) => {
        const [x, y] = L.spots[n];
        const focus = n === 2;
        drawNode(f, c, x, y, node.id, { focus, r: 14 });
        const bw = L.narrow ? 64 : 84;
        const label = focus ? `camera ${f2(w[n])}` : node.name;
        FS.k.label(f, c, label, x, y + 28, { size: 11, align: "center", color: focus ? C.strong : C.fg, weight: focus ? 600 : 500 });
        weightBar(f, c, x - bw / 2, y + 38, bw, 7, w[n]);
        if (focus) hits.push({ key: "C", x, y, r: 22 });
      });
      const { x0, x1, y } = L.track;
      c.strokeStyle = C.line;
      c.lineWidth = 1;
      FS.k.line(c, x0, y, x1, y);
      for (let s = 0; s <= END; s += 1) {
        const x = x0 + ((x1 - x0) * s) / END;
        FS.k.line(c, x, y - 4, x, y + 4);
        FS.k.text(f, c, String(s), x, y + 18, { align: "center", size: 11 });
      }
      FS.k.text(f, c, "step", x0 - 14, y + 4, { align: "right", size: 11 });
      FS.k.hoverTime(f, c, y - 14, y, (s) => x0 + (x1 - x0) * FS.clamp(s / END), (s) => `step ${Math.min(END, s).toFixed(1)}`);
      FS.k.playhead(f, c, x0 + ((x1 - x0) * t) / END, y - 12, y);
    },
  });
})();

// ---------------------------------------------------------------- worked example: four steps in feature space
(() => {
  const steps = BASE.map((s, t) => ({
    caption: t === 0
      ? `Step 0. C's features were masked, so it starts at ${pair(s.X[2])}, as close to one memory as to the other.`
      : `Step ${t}. C moves to ${pair(s.X[2])}; its camera weight is ${f2(s.parts[2].w[0])}. A, B and D stay near their memories.`,
  }));
  const fig = FS.figure("fig-example", {
    height: planeHeight(140),
    steps,
    autoplay: false,
    reserve: { cpos: ["(0.00, 0.00)"], cw: ["0.00"] },
    onStep(f, n) { f.api.out("cpos", pair(BASE[n].X[2])); f.api.out("cw", f2(BASE[n].parts[2].w[0])); },
    render(f, c) {
      const C = f.C;
      const P = plane(f);
      const u = FS.ease.out(f.stepT);
      const X = BASE[f.step].X.map((x, n) => lerp2(BASE[f.from].X[n], x, u));
      drawAxes(f, c, P);
      drawMemories(f, c, P);
      drawEdges(f, c, P, X, 0.8);
      // Trails: where each product has been so far.
      EX.NODES.forEach((_, n) => {
        c.save();
        c.strokeStyle = n === 2 ? C.accent : C.muted;
        c.fillStyle = c.strokeStyle;
        c.lineWidth = n === 2 ? 1.75 : 1;
        c.globalAlpha = n === 2 ? 1 : 0.6;
        c.beginPath();
        for (let t = 0; t <= f.step; t += 1) {
          const p = t === f.step ? X[n] : BASE[t].X[n];
          if (t === 0) c.moveTo(P.X(p[0]), P.Y(p[1])); else c.lineTo(P.X(p[0]), P.Y(p[1]));
        }
        c.stroke();
        for (let t = 0; t < f.step; t += 1) {
          const p = BASE[t].X[n];
          c.beginPath(); c.arc(P.X(p[0]), P.Y(p[1]), 2.2, 0, 7); c.fill();
        }
        c.restore();
      });
      X.forEach((x, n) => drawDot(f, c, P.X(x[0]), P.Y(x[1]), EX.NODES[n].id, { focus: n === 2 }));
      const w = BASE[f.step].parts.map((p, n) => FS.lerp(BASE[f.from].parts[n].w[0], p.w[0], u));
      panelRows(f, c, P, EX.NODES.map((node, n) => ({ label: node.name, value: `camera ${f2(w[n])}`, camera: w[n], focus: n === 2 })), { title: `Camera weight at step ${f.step}` });
    },
  });
  fig.out("cpos", pair(BASE[0].X[2]));
  fig.out("cw", f2(BASE[0].parts[2].w[0]));
})();

// ---------------------------------------------------------------- retrieval: drag a node, see the blend it is pulled to
(() => {
  const q = { x: 0, y: 0 };
  const fig = FS.figure("fig-retrieval", {
    height: planeHeight(130),
    autoplay: false,
    params: {
      beta: { value: 1, min: 0.1, max: 5, step: 0.1, label: "Sharpness β", format: (v) => v.toFixed(1) },
    },
    reserve: { w: ["0.00 · 0.00"], r: ["(0.00, 0.00)"] },
    handles: {
      query: {
        label: "Node vector: drag or use arrow keys",
        radius: 16,
        get: (f) => { const P = plane(f); return { x: P.X(q.x), y: P.Y(q.y) }; },
        set: (f, x, y) => { const P = plane(f); q.x = P.min + (x - P.left) / P.S; q.y = P.max - (y - P.top) / P.S; f.api.redraw(); },
        bounds: (f) => { const P = plane(f); return { x0: P.X(-0.3), y0: P.Y(2.3), x1: P.X(2.3), y1: P.Y(-0.3) }; },
        step: 8,
      },
    },
    render(f, c) {
      const C = f.C;
      const P = plane(f);
      const beta = f.v.beta;
      const x = [q.x, q.y];
      const w = EX.weights(x, beta);
      const r = EX.retrieve(x, beta);
      drawAxes(f, c, P);
      drawMemories(f, c, P);
      EX.PATTERNS.forEach((p, i) => {
        c.save();
        c.strokeStyle = C.muted;
        c.globalAlpha = 0.35 + 0.65 * w[i];
        c.lineWidth = 0.75 + 3 * w[i];
        c.setLineDash([2, 4]);
        FS.k.line(c, P.X(x[0]), P.Y(x[1]), P.X(p.m[0]), P.Y(p.m[1]));
        c.restore();
        const m = lerp2([P.X(x[0]), P.Y(x[1])], [P.X(p.m[0]), P.Y(p.m[1])], 0.62);
        FS.k.label(f, c, `${p.short} ${f2(w[i])}`, m[0] + (i === 0 ? 0 : 10), m[1] + (i === 0 ? -12 : 0), { size: 11, align: i === 0 ? "center" : "left", color: C.fg });
      });
      arrow(f, c, [P.X(x[0]), P.Y(x[1])], [P.X(r[0]), P.Y(r[1])], { color: C.accent, width: 2 });
      c.strokeStyle = C.accent;
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(P.X(r[0]), P.Y(r[1]), 6, 0, 7); c.stroke();
      FS.k.label(f, c, "blend", P.X(r[0]) + 10, P.Y(r[1]) - 10, { size: 11, color: C.accent });
      const held = f.drag === "query" || f.handleHover === "query";
      drawNode(f, c, P.X(x[0]), P.Y(x[1]), "x", { focus: true, r: held ? 13 : 11 });
      const y = panelRows(f, c, P, [{ label: "Camera · lens", value: `${f2(w[0])} · ${f2(w[1])}`, camera: w[0] }], { title: `Weights at β = ${beta.toFixed(1)}` });
      const box = P.panel;
      FS.k.text(f, c, "Node", box.x, y + 14, { size: 11, color: C.fg });
      FS.k.text(f, c, pair(x), box.x + box.w, y + 14, { size: 11, align: "right", mono: true });
      FS.k.text(f, c, "Blend it is pulled to", box.x, y + 36, { size: 11, color: C.fg });
      FS.k.text(f, c, pair(r), box.x + box.w, y + 36, { size: 11, align: "right", mono: true, color: C.strong });
      f.api.out("w", `${f2(w[0])} · ${f2(w[1])}`);
      f.api.out("r", pair(r));
    },
  });
  fig.on("reset", () => { q.x = 0; q.y = 0; fig.redraw(); });
})();

// ---------------------------------------------------------------- graph term: neighbours pull C, lambda sets strength and sign
(() => {
  const X0 = BASE[0].X;
  const neighbours = [0, 1, 3];
  FS.figure("fig-graph", {
    height: planeHeight(150),
    autoplay: false,
    params: {
      lambda: { value: 0.3, min: -0.3, max: 0.5, step: 0.01, label: "Graph weight λ", placement: "inline", format: (v) => minus(v.toFixed(2)), marks: [{ value: 0, label: "zero" }, { value: 0.3, label: "paper's value" }] },
    },
    reserve: { g: ["(−0.00, −0.00)"] },
    tips: {
      D: { title: "Lens D", body: "D has one neighbour, so its share is divided by √(3·1) instead of √(3·2) and counts for more." },
    },
    tipAt: (f, x, y) => {
      const P = plane(f);
      return Math.hypot(x - P.X(X0[3][0]), y - P.Y(X0[3][1])) < 16 ? "D" : null;
    },
    render(f, c) {
      const C = f.C;
      const P = plane(f);
      const lambda = f.v.lambda;
      const origin = [P.X(X0[2][0]), P.Y(X0[2][1])];
      drawAxes(f, c, P);
      drawMemories(f, c, P, 0.35);
      drawEdges(f, c, P, X0, 0.7);
      neighbours.forEach((v) => {
        const share = EX.neighbourPull(X0, 2, v, lambda);
        arrow(f, c, origin, [P.X(X0[2][0] + share[0]), P.Y(X0[2][1] + share[1])], { color: C.muted, width: 1.25, alpha: 0.9 });
      });
      const g = EX.laplacian(X0, 2).map((v) => -2 * lambda * v);
      const tip = [P.X(X0[2][0] + g[0]), P.Y(X0[2][1] + g[1])];
      arrow(f, c, origin, tip, { color: C.accent, width: 2.25 });
      if (Math.hypot(tip[0] - origin[0], tip[1] - origin[1]) > 12) {
        FS.k.label(f, c, lambda >= 0 ? "pull on C" : "push on C", tip[0] - 8, tip[1] - 12, { size: 11, align: "right", color: C.accent });
      }
      X0.forEach((x, n) => drawDot(f, c, P.X(x[0]), P.Y(x[1]), EX.NODES[n].id, { focus: n === 2 }));
      const box = P.panel;
      const rows = [
        ["Share from A", pair(EX.neighbourPull(X0, 2, 0, lambda))],
        ["Share from B", pair(EX.neighbourPull(X0, 2, 1, lambda))],
        ["Share from D", pair(EX.neighbourPull(X0, 2, 3, lambda))],
        ["Total on C", pair(g)],
      ];
      FS.k.text(f, c, `Pull on C at λ = ${minus(lambda.toFixed(2))}`, box.x, box.y + 10, { size: 11, weight: 600, color: C.fg });
      rows.forEach(([label, value], i) => {
        const y = box.y + 36 + i * 24;
        const last = i === rows.length - 1;
        FS.k.text(f, c, label, box.x, y, { size: 11, color: last ? C.strong : C.fg, weight: last ? 600 : 500 });
        FS.k.text(f, c, minus(value), box.x + box.w, y, { size: 11, align: "right", mono: true, color: last ? C.strong : C.muted });
      });
      f.api.out("g", minus(pair(g)));
    },
  });
})();

// ---------------------------------------------------------------- one update: keep 70%, add 30% of both pulls
(() => {
  const FROM = 1;
  const part = BASE[FROM].parts[2];
  const a = EX.settings.alpha;
  const kept = part.keep;
  const memory = [a * part.r[0], a * part.r[1]];
  const neighbours = [a * part.g[0], a * part.g[1]];
  const next = part.next;
  // The update as a sum of vectors, each drawn from the origin on the same scale: keep + memory + neighbours = new.
  const terms = [
    { label: `keep ${Math.round((1 - a) * 100)}%`, v: kept, ghost: part.x, ghostLabel: "old C" },
    { label: `${Math.round(a * 100)}% of the blend`, v: memory, ghost: part.r, ghostLabel: "blend" },
    { label: `${Math.round(a * 100)}% of the pull`, v: neighbours, ghost: part.g, ghostLabel: "pull" },
    { label: "new C", v: next, result: true },
  ];
  const steps = [
    { caption: `C after step ${FROM} sits at ${pair(part.x)}. The next step starts from here.` },
    { caption: `Keep ${Math.round((1 - a) * 100)}% of the old vector: ${pair(kept)}.` },
    { caption: `Add ${Math.round(a * 100)}% of the memory blend ${pair(part.r)}, which is ${pair(memory)}.` },
    { caption: `Add ${Math.round(a * 100)}% of the neighbour pull ${pair(part.g)}, which is ${pair(neighbours)}. C lands at ${pair(next)}.` },
  ];
  const shown = (step, i) => (i === 3 ? step >= 3 : step >= i + 1);
  FS.figure("fig-update", {
    height: (w) => (w < NARROW ? 470 : 262),
    steps,
    autoplay: false,
    render(f, c) {
      const C = f.C;
      const narrow = f.w < NARROW;
      const cols = narrow ? 2 : 4;
      const gap = narrow ? 28 : 40;
      const size = Math.min((f.w - gap * (cols - 1) - 16) / cols, narrow ? 190 : 200);
      const left = (f.w - (size * cols + gap * (cols - 1))) / 2;
      const u = FS.ease.out(f.stepT);
      terms.forEach((term, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x0 = left + col * (size + gap);
        const y0 = 12 + row * (size + 52);
        const S = (size - 24) / 1.1;
        const ox = x0 + 12;
        const oy = y0 + size - 12;
        const P = (v) => [ox + v[0] * S, oy - v[1] * S];
        const on = shown(f.step, i);
        const fresh = on && f.step === (i === 3 ? 3 : i + 1);
        const alpha = on ? (fresh ? u : 1) : 0.28;
        // Panel frame and axes, same scale in every panel.
        FS.k.rrect(c, x0, y0, size, size, 6);
        c.fillStyle = C.node;
        c.fill();
        c.strokeStyle = term.result && on ? C.fg : C.line;
        c.lineWidth = 1;
        c.stroke();
        c.strokeStyle = C.lineStrong;
        FS.k.line(c, ox, oy, x0 + size - 8, oy);
        FS.k.line(c, ox, oy, ox, y0 + 8);
        if (term.ghost && on) {
          c.save(); c.globalAlpha = 0.5 * alpha; c.setLineDash([3, 3]); c.strokeStyle = C.muted; FS.k.line(c, ox, oy, ...P(term.ghost)); c.restore();
          FS.k.label(f, c, term.ghostLabel, P(term.ghost)[0] - 6, P(term.ghost)[1] - 10, { size: 11, align: "right", color: C.muted, alpha, halo: C.node });
        }
        if (on || i === 0) {
          const v = on ? term.v : [0, 0];
          const tip = lerp2([ox, oy], P(v), on ? (fresh ? u : 1) : 0);
          if (on) arrow(f, c, [ox, oy], tip, { color: term.result ? C.accent : C.fg, width: 2 });
        }
        if (f.step === 0 && i === 0) {
          c.save(); c.setLineDash([3, 3]); c.strokeStyle = C.muted; FS.k.line(c, ox, oy, ...P(part.x)); c.restore();
          drawDot(f, c, ...P(part.x), "C", { focus: true });
        }
        FS.k.text(f, c, term.label, x0 + size / 2, y0 + size + 18, { align: "center", size: 11, color: on ? C.fg : C.muted, weight: term.result ? 600 : 500 });
        FS.k.text(f, c, on ? pair(term.v) : "", x0 + size / 2, y0 + size + 34, { align: "center", size: 11, mono: true, color: C.muted });
        // The operator between panels.
        if (col < cols - 1) FS.k.text(f, c, i === 2 ? "=" : "+", x0 + size + gap / 2, y0 + size / 2 + 6, { align: "center", size: 18, color: C.muted });
      });
    },
  });
})();

// ---------------------------------------------------------------- energy: every step lowers the total
(() => {
  const series = [
    { label: "Total", values: BASE.map((s) => s.energy.total), strong: true },
    { label: "Memory part", values: BASE.map((s) => s.energy.memory) },
    { label: "Graph part", values: BASE.map((s) => s.energy.graph), dash: [4, 4] },
  ];
  let hover = null;
  FS.figure("fig-energy", {
    height: (w) => (w < NARROW ? 260 : 280),
    autoplay: false,
    reserve: { at: ["step 0 · total −0.00 · memory −0.00 · graph 0.00"] },
    resize(f) {
      f.el.onpointermove = (e) => { const b = f.el.getBoundingClientRect(); hover = ((e.clientX - b.left) / b.width) * f.w; f.api.redraw(); };
      f.el.onpointerleave = () => { hover = null; f.api.redraw(); };
    },
    render(f, c) {
      const C = f.C;
      const L = 44;
      const R = f.w - (f.w < NARROW ? 112 : 136);
      const T = 14;
      const B = f.h - 34;
      const n = BASE.length - 1;
      const X = (i) => L + ((R - L) * i) / n;
      const Y = (v) => T + ((2 - v) / 10) * (B - T);
      c.strokeStyle = C.line;
      c.lineWidth = 1;
      for (const v of [2, 0, -2, -4, -6, -8]) {
        FS.k.line(c, L, Y(v), R, Y(v));
        FS.k.text(f, c, minus(String(v)), L - 8, Y(v) + 4, { align: "right", size: 11 });
      }
      for (let i = 0; i <= n; i += 1) FS.k.text(f, c, String(i), X(i), B + 16, { align: "center", size: 11 });
      FS.k.text(f, c, "step →", R, B + 30, { align: "right", size: 11 });
      const i = hover == null ? n : Math.round(FS.clamp((hover - L) / (R - L)) * n);
      if (hover != null) { c.save(); c.strokeStyle = C.lineStrong; c.setLineDash([3, 3]); FS.k.line(c, X(i), T, X(i), B); c.restore(); }
      const ends = [];
      series.forEach((s) => {
        c.save();
        c.strokeStyle = s.strong ? C.fg : C.muted;
        c.lineWidth = s.strong ? C.series : 1.25;
        if (s.dash) c.setLineDash(s.dash);
        c.beginPath();
        s.values.forEach((v, k) => (k ? c.lineTo(X(k), Y(v)) : c.moveTo(X(k), Y(v))));
        c.stroke();
        c.restore();
        s.values.forEach((v, k) => { c.fillStyle = s.strong ? C.fg : C.muted; c.beginPath(); c.arc(X(k), Y(v), k === i ? 4.5 : s.strong ? 3.5 : 2.5, 0, 7); c.fill(); });
        ends.push({ text: `${s.label} ${minus(f2(s.values[i]))}`, y: Y(s.values[i]), color: s.strong ? C.fg : C.muted });
      });
      ends.sort((a, b) => a.y - b.y);
      for (let k = 1; k < ends.length; k += 1) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
      ends.forEach((e) => FS.k.label(f, c, e.text, R + 8, e.y, { size: 11, color: e.color }));
      const e = BASE[i].energy;
      f.api.out("at", minus(`step ${i} · total ${f2(e.total)} · memory ${f2(e.memory)} · graph ${f2(e.graph)}`));
    },
  });
})();

// ---------------------------------------------------------------- results: Table 2, accuracy under 50% corruption on Amazon Photo
(() => {
  // [model, clean, edge drop, feature mask, feature noise, is GHN]; each value [mean, std] in %. Source: Table 2, p. 4.
  const ROWS = [
    ["LSE", [94.4, 0.3], [93.7, 0.4], [89.4, 1.8], [93.9, 0.3], true],
    ["LSR", [94.3, 0.2], [93.7, 0.5], [91.0, 2.4], [94.1, 0.2], true],
    ["Hier(8)", [94.2, 0.2], [93.7, 0.5], [91.9, 1.1], [93.9, 0.1], true],
    ["NoMem", [94.4, 0.3], [94.0, 0.5], [86.9, 3.1], [94.2, 0.3], true],
    ["GCN", [89.7, 0.3], [89.1, 0.5], [81.2, 1.5], [89.7, 0.3], false],
    ["GAT", [92.2, 0.3], [91.2, 0.5], [81.4, 5.0], [92.2, 0.2], false],
    ["GraphSAGE", [93.9, 0.2], [93.0, 0.3], [73.3, 1.8], [93.6, 0.3], false],
    ["APPNP", [92.2, 0.3], [91.7, 0.3], [65.0, 1.8], [91.8, 0.3], false],
    ["GIN", [92.6, 0.4], [89.6, 0.8], [91.1, 0.9], [92.6, 0.5], false],
    ["MLP", [88.5, 0.3], [88.5, 0.3], [70.7, 0.6], [86.6, 0.2], false],
  ];
  const KINDS = { edge: 2, mask: 3, noise: 4 };
  FS.figure("fig-mask", {
    height: (w) => (w < NARROW ? 440 : 400),
    autoplay: false,
    params: {
      kind: { value: "mask", placement: "inline", options: [{ value: "edge", label: "Edge drop" }, { value: "mask", label: "Feature mask" }, { value: "noise", label: "Feature noise" }] },
    },
    reserve: { gap: ["+0.0 points"] },
    render(f, c) {
      const C = f.C;
      const col = KINDS[f.params.kind];
      const narrow = f.w < NARROW;
      const L = narrow ? 82 : 110;
      const R = f.w - (narrow ? 16 : 40);
      const T = 34;
      const rowH = (f.h - T - 48) / ROWS.length;
      const lo = 60;
      const hi = 96;
      const X = (v) => L + ((v - lo) / (hi - lo)) * (R - L);
      const rowY = (i) => T + rowH * (i + 0.5) + (i >= 4 ? 8 : 0);
      const bottom = rowY(ROWS.length - 1) + rowH / 2;
      c.strokeStyle = C.line;
      c.lineWidth = 1;
      for (const v of [60, 70, 80, 90]) {
        FS.k.line(c, X(v), T - 4, X(v), bottom);
        FS.k.text(f, c, `${v}%`, X(v), bottom + 16, { align: "center", size: 11 });
      }
      FS.k.text(f, c, "accuracy →", R, bottom + 32, { align: "right", size: 11 });
      // Legend: hollow = clean, solid = corrupted with its standard deviation.
      c.strokeStyle = C.muted; c.fillStyle = C.surface; c.beginPath(); c.arc(L + 4, 13, 4, 0, 7); c.fill(); c.stroke();
      FS.k.text(f, c, "clean", L + 13, 17, { size: 11 });
      c.fillStyle = C.fg; c.beginPath(); c.arc(L + 64, 13, 4.5, 0, 7); c.fill();
      FS.k.text(f, c, "50% corrupted, ± std", L + 73, 17, { size: 11, color: C.fg });
      ROWS.forEach((row, i) => {
        const y = rowY(i);
        const focus = row[0] === "Hier(8)" || row[0] === "NoMem";
        FS.k.text(f, c, row[0], L - 12, y + 4, { align: "right", size: 11, color: focus ? C.strong : C.fg, weight: focus ? 600 : 500 });
        const clean = row[1][0];
        const [mean, std] = row[col];
        c.strokeStyle = C.lineStrong;
        c.lineWidth = 1;
        FS.k.line(c, X(clean), y, X(mean), y);
        c.strokeStyle = focus ? C.accent : C.fg;
        c.lineWidth = 1.45;
        FS.k.line(c, X(mean - std), y, X(mean + std), y);
        FS.k.line(c, X(mean - std), y - 4, X(mean - std), y + 4);
        FS.k.line(c, X(mean + std), y - 4, X(mean + std), y + 4);
        c.fillStyle = C.surface;
        c.strokeStyle = C.muted;
        c.beginPath(); c.arc(X(clean), y, 4, 0, 7); c.fill(); c.stroke();
        c.fillStyle = focus ? C.accent : C.fg;
        c.beginPath(); c.arc(X(mean), y, 4.5, 0, 7); c.fill();
        // Value label left of the whisker, or right of it when the left side would run into the row label.
        c.font = FS.k.font(f, 11, 500);
        const text = mean.toFixed(1);
        const leftEdge = X(Math.min(mean - std, clean)) - 10;
        const fitsLeft = leftEdge - c.measureText(text).width > L + 4;
        const right = X(mean + std) + 8;
        if (fitsLeft) FS.k.label(f, c, text, leftEdge, y, { size: 11, align: "right", color: focus ? C.strong : C.muted });
        else FS.k.label(f, c, text, right, y, { size: 11, align: "left", color: focus ? C.strong : C.muted });
      });
      const sepY = rowY(3) + rowH / 2 + 4;
      c.strokeStyle = C.line;
      FS.k.line(c, 8, sepY, R, sepY);
      const hier = ROWS[2][col][0];
      const nomem = ROWS[3][col][0];
      const gap = hier - nomem;
      f.api.out("gap", `${gap >= 0 ? "+" : "−"}${Math.abs(gap).toFixed(1)} points`);
    },
  });
})();

// ---------------------------------------------------------------- results: Table 6, accuracy against lambda
(() => {
  const LAMBDAS = [0, 0.01, 0.05, 0.1, 0.2, 0.3, 0.5, 1.0];
  // GHN-LSE test accuracy (%), one default configuration. Source: Table 6, p. 10.
  const DATA = [
    { name: "Cora", citation: true, v: [57.7, 62.7, 71.7, 76.1, 80.2, 81.8, 81.6, 80.6] },
    { name: "CiteSeer", citation: true, v: [55.6, 59.1, 65.1, 67.6, 70.2, 69.6, 68.9, 69.4] },
    { name: "PubMed", citation: true, v: [73.0, 73.2, 74.5, 75.2, 78.2, 77.7, 76.9, 76.7] },
    { name: "Texas", citation: false, v: [74.1, 71.6, 70.0, 64.9, 66.8, 67.0, 66.8, 64.9] },
    { name: "Wisconsin", citation: false, v: [79.8, 80.8, 72.2, 67.1, 60.0, 55.1, 45.3, 44.9] },
    { name: "Cornell", citation: false, v: [73.5, 72.4, 63.8, 46.2, 41.1, 44.3, 42.2, 41.4] },
    { name: "Actor", citation: false, v: [37.5, 37.3, 36.5, 35.5, 30.8, 28.1, 25.5, 25.0] },
  ];
  const at = { i: 5 };
  const geometry = (f) => {
    const narrow = f.w < NARROW;
    const L = 40;
    const R = f.w - (narrow ? 104 : 128);
    const T = 18;
    const B = f.h - 40;
    const X = (i) => L + ((R - L) * i) / (LAMBDAS.length - 1);
    const Y = (v) => B - ((v - 20) / 70) * (B - T);
    return { narrow, L, R, T, B, X, Y };
  };
  FS.figure("fig-lambda", {
    height: (w) => (w < NARROW ? 330 : 340),
    autoplay: false,
    reserve: { at: ["λ = 0.05"] },
    handles: {
      lambda: {
        label: "λ marker: drag or use arrow keys",
        radius: 18,
        get: (f) => { const G = geometry(f); return { x: G.X(at.i), y: G.B }; },
        // A key press moves one snap point; a drag snaps to the nearest one.
        set: (f, x, y, phase) => {
          const G = geometry(f);
          const last = LAMBDAS.length - 1;
          if (phase === "key") at.i = FS.clamp(at.i + Math.sign(x - G.X(at.i)), 0, last);
          else at.i = Math.round(FS.clamp((x - G.L) / (G.R - G.L)) * last);
          f.api.redraw();
        },
        release: (f) => { const G = geometry(f); return { x: G.X(at.i), y: G.B }; },
        bounds: (f) => { const G = geometry(f); return { x0: G.L, y0: G.B, x1: G.R, y1: G.B }; },
        step: 40,
      },
    },
    render(f, c) {
      const C = f.C;
      const G = geometry(f);
      c.strokeStyle = C.line;
      c.lineWidth = 1;
      for (const v of [20, 40, 60, 80]) {
        FS.k.line(c, G.L, G.Y(v), G.R, G.Y(v));
        FS.k.text(f, c, `${v}%`, G.L - 6, G.Y(v) + 4, { align: "right", size: 11 });
      }
      LAMBDAS.forEach((l, i) => { if (!G.narrow || i % 2 === 1 || i === 0) FS.k.text(f, c, String(l), G.X(i), G.B + 18, { align: "center", size: 11 }); });
      FS.k.text(f, c, "graph weight λ →", G.R, G.B + 34, { align: "right", size: 11 });
      const mx = G.X(at.i);
      c.save(); c.strokeStyle = C.accent; c.lineWidth = f.drag === "lambda" ? 1.75 : 1.25; c.setLineDash([3, 3]); FS.k.line(c, mx, G.T, mx, G.B); c.restore();
      c.fillStyle = C.surface; c.beginPath(); c.arc(mx, G.B, 8, 0, 7); c.fill();
      c.fillStyle = C.accent; c.beginPath(); c.arc(mx, G.B, f.drag === "lambda" ? 7 : f.handleHover === "lambda" ? 6 : 4.5, 0, 7); c.fill();
      const ends = [];
      DATA.forEach((d) => {
        c.save();
        c.strokeStyle = d.citation ? C.fg : C.muted;
        c.lineWidth = d.citation ? C.series : 1.25;
        if (!d.citation) c.setLineDash([5, 4]);
        c.beginPath();
        d.v.forEach((v, i) => (i ? c.lineTo(G.X(i), G.Y(v)) : c.moveTo(G.X(i), G.Y(v))));
        c.stroke();
        c.restore();
        c.fillStyle = d.citation ? C.fg : C.muted;
        c.beginPath(); c.arc(mx, G.Y(d.v[at.i]), 3.5, 0, 7); c.fill();
        ends.push({ text: `${d.name} ${d.v[at.i].toFixed(1)}`, y: G.Y(d.v[at.i]), color: d.citation ? C.fg : C.muted });
      });
      ends.sort((a, b) => a.y - b.y);
      for (let i = 1; i < ends.length; i += 1) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
      ends.forEach((e) => FS.k.label(f, c, e.text, G.R + 10, e.y, { size: 11, color: e.color }));
      f.api.out("at", `λ = ${LAMBDAS[at.i]}`);
    },
  });
})();

// ---------------------------------------------------------------- limits: more steps, more smoothing
(() => {
  const MAX = 30;
  const runs = { 0.3: LONG, 0: EX.run({ steps: MAX, lambda: 0 }) };
  const stop = { t: EX.settings.steps };
  const geometry = (f) => {
    const narrow = f.w < NARROW;
    const L = 40;
    const R = f.w - (narrow ? 84 : 104);
    const T = 24;
    const B = f.h - 40;
    return { narrow, L, R, T, B, X: (t) => L + ((R - L) * t) / MAX, Y: (v) => B - v * (B - T) };
  };
  const flip = (states) => states.findIndex((s) => s.parts[3].w[0] > 0.5);
  FS.figure("fig-steps", {
    height: (w) => (w < NARROW ? 300 : 320),
    autoplay: false,
    params: {
      lambda: { value: "0.3", label: "Graph weight λ", options: [{ value: "0.3", label: "0.3" }, { value: "0", label: "0" }] },
    },
    reserve: { at: ["step 30 · D 0.00 · C 0.00 · energy −0.00"] },
    handles: {
      stop: {
        label: "Number of steps: drag or use arrow keys",
        radius: 18,
        get: (f) => { const G = geometry(f); return { x: G.X(stop.t), y: G.B }; },
        // A key press moves one step; a drag snaps to the nearest step.
        set: (f, x, y, phase) => {
          const G = geometry(f);
          if (phase === "key") stop.t = FS.clamp(stop.t + Math.sign(x - G.X(stop.t)), 0, MAX);
          else stop.t = Math.round(FS.clamp((x - G.L) / (G.R - G.L)) * MAX);
          f.api.redraw();
        },
        release: (f) => { const G = geometry(f); return { x: G.X(stop.t), y: G.B }; },
        bounds: (f) => { const G = geometry(f); return { x0: G.L, y0: G.B, x1: G.R, y1: G.B }; },
        step: 12,
      },
    },
    render(f, c) {
      const C = f.C;
      const G = geometry(f);
      const states = runs[f.params.lambda];
      c.strokeStyle = C.line;
      c.lineWidth = 1;
      for (const v of [0, 0.5, 1]) {
        FS.k.line(c, G.L, G.Y(v), G.R, G.Y(v));
        FS.k.text(f, c, v.toFixed(1), G.L - 6, G.Y(v) + 4, { align: "right", size: 11 });
      }
      for (const t of [0, 4, 10, 16, 20, 30]) FS.k.text(f, c, String(t), G.X(t), G.B + 18, { align: "center", size: 11 });
      FS.k.text(f, c, "step →", G.R, G.B + 34, { align: "right", size: 11 });
      FS.k.text(f, c, "camera weight", G.L, G.T - 10, { size: 11 });
      c.save(); c.globalAlpha = 0.65; c.strokeStyle = C.fg; c.setLineDash([2, 3]); FS.k.line(c, G.L, G.Y(0.5), G.R, G.Y(0.5)); c.restore();
      c.save(); c.strokeStyle = C.lineStrong; c.setLineDash([2, 3]); FS.k.line(c, G.X(4), G.T, G.X(4), G.B); c.restore();
      FS.k.label(f, c, G.narrow ? "T = 4" : "paper's T = 4", G.X(4) + 6, G.Y(0.38), { size: 11, color: C.muted });
      EX.NODES.forEach((node, n) => {
        const focus = n === 3 || n === 2;
        c.save();
        c.strokeStyle = n === 3 ? C.accent : n === 2 ? C.fg : C.muted;
        c.lineWidth = focus ? C.series : 1.1;
        c.globalAlpha = focus ? 1 : 0.7;
        c.beginPath();
        states.forEach((s, t) => (t ? c.lineTo(G.X(t), G.Y(s.parts[n].w[0])) : c.moveTo(G.X(t), G.Y(s.parts[n].w[0]))));
        c.stroke();
        c.restore();
      });
      // Direct labels on the two curves the claim is about; the cameras share one label at the right.
      const onCurve = (n, t, dy, text) => FS.k.label(f, c, text, G.X(t), G.Y(states[t].parts[n].w[0]) + dy, { size: 11, align: "center", color: n === 3 ? C.accent : C.fg, weight: 600 });
      const at = G.narrow ? 7 : 9;
      onCurve(2, at, 16, "Product C");
      onCurve(3, at, -14, "Lens D");
      FS.k.label(f, c, "Cameras A, B", G.R + 8, G.Y(states[MAX].parts[0].w[0]), { size: 11, color: C.muted });
      const k = flip(states);
      if (k > 0) {
        const y = G.Y(states[k].parts[3].w[0]);
        c.fillStyle = C.accent;
        c.beginPath(); c.arc(G.X(k), y, 4, 0, 7); c.fill();
        FS.k.label(f, c, `D tips at step ${k}`, G.X(k) + 8, y + 16, { size: 11, color: C.accent });
      }
      const mx = G.X(stop.t);
      c.save(); c.strokeStyle = C.fg; c.lineWidth = f.drag === "stop" ? 1.75 : 1; FS.k.line(c, mx, G.T, mx, G.B); c.restore();
      c.fillStyle = C.surface; c.beginPath(); c.arc(mx, G.B, 8, 0, 7); c.fill();
      c.fillStyle = C.fg; c.beginPath(); c.arc(mx, G.B, f.drag === "stop" ? 7 : f.handleHover === "stop" ? 6 : 4.5, 0, 7); c.fill();
      const s = states[stop.t];
      f.api.out("at", minus(`step ${stop.t} · D ${f2(s.parts[3].w[0])} · C ${f2(s.parts[2].w[0])} · energy ${f2(s.energy.total)}`));
    },
  });
})();
