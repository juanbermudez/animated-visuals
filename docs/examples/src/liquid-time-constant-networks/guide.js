/* Liquid time-constant networks: six figures. One illustrative neuron runs through the first four:
   tau = 1 s, a gate of strength W = 4 and a target A = 1, with a sigmoid gate f(I) = W * sigmoid(8 (I - 0.5))
   that depends only on the input. Eq. 1 of the paper: dx/dt = -(1/tau + f) x + f A, so the time constant the
   system has is tau / (1 + tau f). Eq. 3, the fused step: x' = (x + dt f A) / (1 + dt (1/tau + f)).
   Figs. 5 and 6 draw the paper's own numbers (Fig. 2; Tables 3, 4, 6). */
const LTC = { tau: 1, W: 4, A: 1, k: 8, mid: 0.5, substeps: 6 };
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const gate = (I, W = LTC.W) => W * sigmoid(LTC.k * (I - LTC.mid));
const tauSys = (F, tau = LTC.tau) => tau / (1 + tau * F);
const fusedStep = (x, F, dt, A = LTC.A, tau = LTC.tau) => (x + dt * F * A) / (1 + dt * (1 / tau + F));
const restingState = (F, A = LTC.A, tau = LTC.tau) => (tau * F * A) / (1 + tau * F);
const narrowOf = (f) => f.w < 560;
const inRect = (h, x, y) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;

/* Lanes stacked down the stage: [{ y0, y1 }] with a label column on the left. */
function laneBoxes(top, heights, gap) {
  let y = top;
  return heights.map((h) => { const box = { y0: y, y1: y + h }; y += h + gap; return box; });
}
function polyline(c, pts) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
}
function dashed(c, x0, y0, x1, y1, dash = [3, 3]) {
  c.save(); c.setLineDash(dash); FS.k.line(c, x0, y0, x1, y1); c.restore();
}
function laneLabel(f, c, lane, text, sub, hot) {
  const mid = (lane.y0 + lane.y1) / 2;
  FS.k.text(f, c, text, 0, mid + (sub ? -2 : 4), { color: hot ? f.C.accent : f.C.fg, size: narrowOf(f) ? 11.5 : 12, weight: 600 });
  if (sub) FS.k.text(f, c, sub, 0, mid + 12, { size: 10.5 });
}
function knob(f, c, x, y, key) {
  const C = f.C, held = f.drag === key, hot = held || f.handleHover === key || f.hover === key, r = held ? 7 : hot ? 6 : 5;
  c.fillStyle = C.surface; c.beginPath(); c.arc(x, y, r + 3, 0, 7); c.fill();
  c.fillStyle = C.accent; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  return hot;
}

/* ================= Fig 1: one neuron, the input sets its speed (live process) ================= */
(() => {
  const WINDOW = 8, PERIOD = 6, PRESS = [1.5, 3.5];
  const loopInput = (t) => { const p = t % PERIOD; return p >= PRESS[0] && p < PRESS[1] ? 1 : 0; };
  const tips = {
    input: { title: "Input", body: "The touch sensor's reading, 0 for nothing, 1 for a firm press. Drag the knob at the right edge to press it yourself." },
    tau: { title: "Time constant", body: "τ/(1 + τf) from Eq. 1: about the seconds the state needs to cover two thirds of the way. Strong input, short time constant." },
    state: { title: "State", body: "The neuron's internal value, x in Eq. 1. It heads for τfA/(1 + τf): 0.07 at rest, 0.80 while pressed." },
  };
  const geo = (f) => {
    const narrow = narrowOf(f), Lx = narrow ? 96 : 118, R = f.w - (narrow ? 58 : 72);
    const lanes = laneBoxes(14, narrow ? [62, 72, 72] : [58, 70, 70], narrow ? 18 : 16);
    const Y = (lane, v, lo, hi) => lane.y1 - ((v - lo) / (hi - lo)) * (lane.y1 - lane.y0);
    return { narrow, Lx, R, lanes, yIn: (v) => Y(lanes[0], v, -0.08, 1.08), yTau: (v) => Y(lanes[1], v, 0, 1.12), yX: (v) => Y(lanes[2], v, -0.06, 1.12) };
  };
  const advance = (s, dt, input) => {
    s.t += dt; s.I = input;
    const F = gate(input), h = dt / LTC.substeps;
    for (let i = 0; i < LTC.substeps; i++) s.x = fusedStep(s.x, F, h);
    s.hist.push({ t: s.t, I: input, tau: tauSys(F), x: s.x });
    while (s.hist.length && s.hist[0].t < s.t - WINDOW - 0.5) s.hist.shift();
  };
  const prefill = (f) => {
    const s = f.state;
    s.t = 0; s.x = restingState(gate(0)); s.hist = []; s.hand = s.hand ?? 0;
    for (let i = 0; i < WINDOW * 60; i++) advance(s, 1 / 60, loopInput(s.t));
  };
  FS.figure("fig-neuron", {
    height: (w) => (w < 560 ? 296 : 270),
    params: { source: { value: "loop", label: "Input", placement: "inline", options: [{ value: "loop", label: "Press loop" }, { value: "hand", label: "Your hand" }] } },
    reserve: { read: ["input 1.00 · gate f 3.93 · time constant 0.93 s · state 0.80"] },
    tips,
    tipAt: (f, x, y) => { const g = geo(f); if (x > g.Lx) return null; const i = g.lanes.findIndex((l) => y >= l.y0 - 6 && y <= l.y1 + 6); return ["input", "tau", "state"][i] ?? null; },
    handles: {
      input: {
        label: "Input level: drag up or down, or use the arrow keys",
        radius: 16, step: 6,
        get: (f) => { const g = geo(f); return { x: g.R, y: f.state.dragY ?? g.yIn(f.state.I ?? 0) }; },
        set: (f, x, y, phase) => {
          const g = geo(f), lane = g.lanes[0], v = ((lane.y1 - y) / (lane.y1 - lane.y0)) * 1.16 - 0.08;
          f.state.hand = Math.min(1, Math.max(0, v));
          f.state.dragY = phase === "drag" || phase === "settle" ? y : null;
          if (f.params.source !== "hand") f.api.set("source", "hand");
        },
        bounds: (f) => { const g = geo(f); return { x0: g.R, x1: g.R, y0: g.yIn(1), y1: g.yIn(0) }; },
        release: (f) => { const g = geo(f); return { x: g.R, y: g.yIn(f.state.hand) }; },
      },
    },
    init(f) { prefill(f); },
    onParam(f, name, value) { if (name === "source" && value === "hand") f.state.hand = f.state.I ?? 0; },
    update(f, dt) {
      const s = f.state;
      if (!s.hist) prefill(f);
      if (s.dragY != null && f.drag !== "input" && !s.settling) s.dragY = null;
      advance(s, Math.min(dt, 0.05), f.params.source === "hand" ? s.hand : loopInput(s.t));
    },
    render(f, c) {
      const C = f.C, s = f.state, g = geo(f), { Lx, R, lanes } = g;
      if (!s.hist) prefill(f);
      const X = (t) => R - ((s.t - t) / WINDOW) * (R - Lx);
      const pts = s.hist.filter((p) => p.t >= s.t - WINDOW);
      laneLabel(f, c, lanes[0], "Input", "the sensor", f.hover === "input");
      laneLabel(f, c, lanes[1], "Time constant", "seconds", f.hover === "tau");
      laneLabel(f, c, lanes[2], "State", "x", f.hover === "state");
      c.lineWidth = 1;
      // time-constant envelope (Theorem 1)
      const lo = tauSys(gate(1e9)), y1s = g.yTau(LTC.tau), y0s = g.yTau(lo);
      c.fillStyle = C.surface2; c.fillRect(Lx, y1s, R - Lx, y0s - y1s);
      c.strokeStyle = C.lineStrong; dashed(c, Lx, y1s, R, y1s); dashed(c, Lx, y0s, R, y0s);
      FS.k.label(f, c, "τ = 1 s", Lx + 6, y1s - 7, { size: 10.5, color: C.muted, weight: 500 });
      FS.k.label(f, c, `fastest possible ${lo.toFixed(2)} s`, Lx + 6, y0s + 9, { size: 10.5, color: C.muted, weight: 500 });
      // state scaffolding: rest 0 and the target A
      c.strokeStyle = C.line; FS.k.line(c, Lx, g.yX(0), R, g.yX(0));
      c.strokeStyle = C.lineStrong; dashed(c, Lx, g.yX(LTC.A), R, g.yX(LTC.A));
      FS.k.label(f, c, "target A = 1", Lx + 6, g.yX(LTC.A) - 7, { size: 10.5, color: C.muted, weight: 500 });
      c.strokeStyle = C.line; FS.k.line(c, Lx, g.yIn(0), R, g.yIn(0));
      const trace = (key, sel, yOf) => {
        c.strokeStyle = f.hover === key ? C.accent : C.fg; c.lineWidth = f.hover === key ? 2.25 : C.series;
        c.lineJoin = "round"; polyline(c, pts.map((p) => [X(p.t), yOf(sel(p))])); c.lineWidth = 1;
      };
      trace("input", (p) => p.I, g.yIn);
      trace("tau", (p) => p.tau, g.yTau);
      trace("state", (p) => p.x, g.yX);
      // now: a hairline across the lanes, dots and values at the right edge
      c.strokeStyle = C.line; FS.k.line(c, R, lanes[0].y0 - 6, R, lanes[2].y1 + 4);
      const now = pts[pts.length - 1] ?? { I: 0, tau: 1, x: 0 };
      const dot = (y) => { c.fillStyle = C.fg; c.beginPath(); c.arc(R, y, 3.5, 0, 7); c.fill(); };
      dot(g.yTau(now.tau)); dot(g.yX(now.x));
      FS.k.label(f, c, `${now.tau.toFixed(2)} s`, R + 8, g.yTau(now.tau), { size: 11, weight: 600 });
      FS.k.label(f, c, now.x.toFixed(2), R + 8, g.yX(now.x), { size: 11, weight: 600 });
      const ky = s.dragY ?? g.yIn(now.I);
      const hot = knob(f, c, R, ky, "input");
      FS.k.label(f, c, now.I.toFixed(2), R + 12, ky, { size: 11, weight: 600 });
      if (f.params.source === "loop" && !hot) FS.k.label(f, c, "drag ↕", R + 12, ky + (now.I < 0.5 ? -16 : 16), { size: 10.5, color: C.muted, weight: 500 });
      for (let k = 0; k <= WINDOW; k += 2) FS.k.text(f, c, k === 0 ? "now" : `−${k} s`, X(s.t - k), lanes[2].y1 + 16, { align: k === 0 ? "right" : "center", size: 10.5 });
      f.api.out("read", `input ${now.I.toFixed(2)} · gate f ${gate(now.I).toFixed(2)} · time constant ${now.tau.toFixed(2)} s · state ${now.x.toFixed(2)}`);
    },
  });
})();

/* ================= Fig 2: three model families on one press (steps) ================= */
(() => {
  const END = 8, PRESS = [1, 3], DT = 0.002;
  const input = (t) => (t >= PRESS[0] && t < PRESS[1] ? 1 : 0);
  // Each model is linear in x for a fixed input, dx/dt = -a x + b, so every slice is stepped exactly.
  const MODELS = [
    { key: "node", name: "Neural ODE", eq: "dx/dt = f·A", coef: (F) => [0, F * LTC.A], x0: 0 },
    { key: "ctrnn", name: "CT-RNN", eq: "dx/dt = −x/τ + f·A", coef: (F) => [1 / LTC.tau, F * LTC.A], x0: LTC.tau * gate(0) * LTC.A },
    { key: "ltc", name: "LTC", eq: "dx/dt = −(1/τ + f)·x + f·A", coef: (F) => [1 / LTC.tau + F, F * LTC.A], x0: restingState(gate(0)) },
  ];
  for (const m of MODELS) {
    let x = m.x0; m.pts = [[0, x]];
    for (let i = 0; i < Math.round(END / DT); i++) {
      const t = i * DT, [a, b] = m.coef(gate(input(t + DT / 2)));
      x = a === 0 ? x + b * DT : b / a + (x - b / a) * Math.exp(-a * DT);
      m.pts.push([t + DT, x]);
    }
    m.max = Math.max(...m.pts.map((p) => p[1]));
    m.at = (t) => m.pts[Math.min(m.pts.length - 1, Math.round(t / DT))][1];
    // seconds to cover 63.2% of the gap to the new resting value, measured on the curve
    const crossing = (t0, target) => { const x0 = m.at(t0), goal = x0 + 0.632 * (target - x0); for (const [t, v] of m.pts) if (t >= t0 && (target > x0 ? v >= goal : v <= goal)) return t - t0; return null; };
    if (m.key !== "node") {
      const [aOn, bOn] = m.coef(gate(1)), [aOff, bOff] = m.coef(gate(0));
      m.rise = crossing(PRESS[0], bOn / aOn); m.fall = crossing(PRESS[1], bOff / aOff);
    }
  }
  const [node, ctrnn, ltc] = MODELS;
  const ratio = ctrnn.rise / ltc.rise;
  const steps = [
    { lanes: 1, caption: "The touch sensor: nothing, then a press from 1 s to 3 s, then nothing. All three models get exactly this input." },
    { lanes: 2, caption: `Neural ODE: the input sets the slope directly. Nothing pulls the state back, so it climbs while pressed and stays at ${node.at(END).toFixed(1)}.` },
    { lanes: 3, caption: `CT-RNN: a leak pulls the state back with a fixed τ = 1 s. It rises in ${ctrnn.rise.toFixed(2)} s and falls in ${ctrnn.fall.toFixed(2)} s: one speed both ways.` },
    { lanes: 4, caption: `LTC: the gate sits beside the leak. It rises in ${ltc.rise.toFixed(2)} s while pressed and falls in ${ltc.fall.toFixed(2)} s after release.` },
    { lanes: 4, compare: true, caption: `Same input, same τ: the LTC answers the press ${ratio.toFixed(1)}× faster than the CT-RNN, and lets go almost as slowly.` },
  ];
  const tips = {
    lane0: { title: "Input", body: "The press: 0, then 1 from 1 s to 3 s, then 0. Every model below gets it through the same gate f." },
    lane1: { title: "Neural ODE", body: "The network sets the rate of change directly. No leak, so nothing returns the state to rest." },
    lane2: { title: "CT-RNN", body: "Adds a leak −x/τ. Its time constant is τ, the same whatever the input does." },
    lane3: { title: "LTC", body: "Eq. 1: the gate f joins the leak, so the time constant is τ/(1 + τf) and moves with the input." },
  };
  FS.figure("fig-family", {
    height: (w) => (w < 560 ? 350 : 300),
    steps,
    tips,
    tipAt: (f, x, y) => f.state.hits?.find((h) => inRect(h, x, y))?.key ?? null,
    render(f, c) {
      const C = f.C, narrow = narrowOf(f), s = steps[f.step], Lx = narrow ? 76 : 118, R = f.w - 14;
      const lanes = laneBoxes(narrow ? 10 : 10, narrow ? [36, 60, 60, 60] : [34, 50, 50, 50], narrow ? 20 : 16);
      const X = (t) => Lx + (t / END) * (R - Lx), hits = (f.state.hits = []);
      const grow = (i) => (i === s.lanes - 1 && f.from < f.step && !s.compare ? FS.ease.inOut(Math.min(1, f.stepT * 1.4)) : 1);
      c.fillStyle = C.surface2; c.fillRect(X(PRESS[0]), lanes[0].y0 - 4, X(PRESS[1]) - X(PRESS[0]), lanes[3].y1 - lanes[0].y0 + 8);
      FS.k.text(f, c, "pressed", (X(PRESS[0]) + X(PRESS[1])) / 2, lanes[3].y1 + 32, { align: "center", size: 10.5 });
      const names = ["Input", ...MODELS.map((m) => m.name)];
      lanes.forEach((lane, i) => {
        const on = i < s.lanes;
        c.globalAlpha = on ? 1 : C.dim;
        laneLabel(f, c, lane, names[i], null, f.hover === `lane${i}`);
        hits.push({ key: `lane${i}`, x: 0, y: lane.y0 - 4, w: Lx - 6, h: lane.y1 - lane.y0 + 8 });
        c.strokeStyle = C.line; c.lineWidth = 1; FS.k.line(c, Lx, lane.y1, R, lane.y1);
        c.globalAlpha = 1;
        if (!on) return;
        const p = grow(i);
        if (i === 0) {
          const Y = (v) => lane.y1 - v * (lane.y1 - lane.y0);
          c.strokeStyle = C.fg; c.lineWidth = C.series;
          polyline(c, [[X(0), Y(0)], [X(PRESS[0]), Y(0)], [X(PRESS[0]), Y(1)], [X(PRESS[1]), Y(1)], [X(PRESS[1]), Y(0)], [X(END), Y(0)]]);
          return;
        }
        const m = MODELS[i - 1], top = m.max * 1.08, Y = (v) => lane.y1 - (v / top) * (lane.y1 - lane.y0);
        const tEnd = p * END, pts = m.pts.filter((q, j) => j % 5 === 0 && q[0] <= tEnd + 1e-9).map(([t, v]) => [X(t), Y(v)]);
        c.strokeStyle = C.line; dashed(c, Lx, Y(m.max), R, Y(m.max), [2, 4]);
        FS.k.text(f, c, m.max.toFixed(m.max >= 2 ? 1 : 2), Lx - 6, Y(m.max) + 4, { align: "right", size: 10 });
        c.strokeStyle = f.hover === `lane${i}` ? C.accent : C.fg; c.lineWidth = C.series; c.lineJoin = "round"; polyline(c, pts); c.lineWidth = 1;
        if (!narrow) FS.k.label(f, c, m.eq, R - 4, Y(m.max) + 10, { align: "right", size: 10.5, mono: true, color: C.muted, weight: 400 });
        if (s.compare && m.rise) {
          // each bar runs at the 63% level it measures, from the event to where the curve crosses it
          const yr = Y(m.at(PRESS[0] + m.rise)), yf = Y(m.at(PRESS[1] + m.fall));
          c.strokeStyle = C.accent; c.lineWidth = 1.5;
          FS.k.line(c, X(PRESS[0]), yr, X(PRESS[0] + m.rise), yr); FS.k.line(c, X(PRESS[0]), yr - 4, X(PRESS[0]), yr + 4);
          FS.k.line(c, X(PRESS[1]), yf, X(PRESS[1] + m.fall), yf); FS.k.line(c, X(PRESS[1]), yf - 4, X(PRESS[1]), yf + 4);
          c.lineWidth = 1;
          FS.k.label(f, c, `${narrow ? "" : "rise "}${m.rise.toFixed(2)} s`, X(PRESS[0]) - 6, yr, { align: "right", size: 10.5, weight: 600, color: C.accent });
          FS.k.label(f, c, `${narrow ? "" : "fall "}${m.fall.toFixed(2)} s`, X(PRESS[1]) + 6, yf + 11, { size: 10.5, weight: 600, color: C.accent });
        }
      });
      for (let t = 0; t <= END; t += narrow ? 2 : 1) FS.k.text(f, c, `${t} s`, X(t), lanes[3].y1 + 16, { align: "center", size: 10.5 });
    },
  });
})();

/* ================= Fig 3: the envelopes of Theorems 1 and 2 under a rough input ================= */
(() => {
  const END = 10, DT = 1 / 60;
  // A seeded rough signal in [-1, 1]: a few slow waves plus held random steps.
  const rnd = FS.rng(2006);
  const waves = [0, 1, 2].map(() => ({ fr: 0.15 + rnd() * 0.6, ph: rnd() * 6.28, a: 0.3 + rnd() * 0.4 }));
  const holds = Array.from({ length: 24 }, () => rnd() * 2 - 1);
  const raw = Array.from({ length: Math.round(END / DT) + 1 }, (_, i) => { const t = i * DT; return waves.reduce((s, w) => s + w.a * Math.sin(2 * Math.PI * w.fr * t + w.ph), 0) + 0.5 * holds[Math.min(holds.length - 1, Math.floor(t / (END / holds.length)))]; });
  const peak = Math.max(...raw.map(Math.abs));
  const U = raw.map((v) => v / peak);
  const fmtX = (v) => { const s = 10 ** v; return s >= 100 ? `×${Math.round(s / 10) * 10}` : s >= 10 ? `×${Math.round(s)}` : `×${s.toFixed(1)}`; };
  const simulate = (strength, W, A) => {
    let x = 0, xmin = 0, xmax = 0, tmin = Infinity, tmax = 0;
    const xs = [], ts = [];
    for (const u of U) {
      const F = gate(strength * u, W), h = DT / LTC.substeps;
      for (let i = 0; i < LTC.substeps; i++) x = fusedStep(x, F, h, A);
      const ta = tauSys(F);
      xs.push(x); ts.push(ta);
      xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); tmin = Math.min(tmin, ta); tmax = Math.max(tmax, ta);
    }
    return { xs, ts, xmin, xmax, tmin, tmax };
  };
  const geo = (f) => {
    const narrow = narrowOf(f), Lx = narrow ? 96 : 118, R = f.w - (narrow ? 26 : 32);
    const lanes = laneBoxes(12, narrow ? [52, 76, 96] : [46, 72, 92], narrow ? 18 : 16);
    const Y = (lane, v, lo, hi) => lane.y1 - ((v - lo) / (hi - lo)) * (lane.y1 - lane.y0);
    return { narrow, Lx, R, lanes, yIn: (v) => Y(lanes[0], v, -1.1, 1.1), yTau: (v) => Y(lanes[1], v, 0, 1.12), yX: (v) => Y(lanes[2], v, -1.15, 1.15) };
  };
  const tips = {
    input: { title: "Input", body: "A seeded random signal between −1 and 1, times the strength. At ×1000 the gate flips between fully off and fully on." },
    tau: { title: "Time constant", body: "Theorem 1 (Eq. 4): between τ/(1 + τW) and τ, because the gate f stays between 0 and W." },
    state: { title: "State", body: "Theorem 2 (Eq. 5): between min(0, A) and max(0, A), because the leak pulls toward 0 and the gate toward A." },
    target: { title: "Target A", body: "Where the gate pulls the state, like a synapse's reversal potential. Drag it; below zero the gate pulls the state down." },
  };
  FS.figure("fig-bounds", {
    height: (w) => (w < 560 ? 300 : 278),
    params: {
      strength: { value: 1, min: 0, max: 3, step: 0.05, label: "Input strength", placement: "inline", format: fmtX },
      W: { value: 4, min: 1, max: 20, step: 0.5, label: "Gate strength W", format: (v) => v.toFixed(1) },
      A: { value: 1, min: -1, max: 1, step: 0.01, label: "Target A", hidden: true },
    },
    reserve: { read: (f) => (narrowOf(f) ? ["state −0.80 to 0 · τ 0.05 to 0.98 s · inside"] : ["state −0.80 to 0, inside [−1.00, 0] · time constant 0.05 to 0.98 s, inside [0.05, 1] s"]), strengthText: ["×1000"] },
    tips,
    tipAt: (f, x, y) => { const g = geo(f); if (x > g.Lx) return null; const i = g.lanes.findIndex((l) => y >= l.y0 - 6 && y <= l.y1 + 6); return ["input", "tau", "state"][i] ?? null; },
    handles: {
      target: {
        label: "Target A: drag up or down, or use the arrow keys",
        radius: 16, step: 4,
        get: (f) => { const g = geo(f); return { x: g.R, y: f.state.dragY ?? g.yX(f.params.A) }; },
        set: (f, x, y, phase) => {
          const g = geo(f), lane = g.lanes[2], v = 1.15 - ((y - lane.y0) / (lane.y1 - lane.y0)) * 2.3;
          f.state.dragY = phase === "drag" || phase === "settle" ? y : null;
          f.api.set("A", Math.round(Math.max(-1, Math.min(1, v)) * 100) / 100, { instant: true });
        },
        bounds: (f) => { const g = geo(f); return { x0: g.R, x1: g.R, y0: g.yX(1), y1: g.yX(-1) }; },
        release: (f) => { const g = geo(f); return { x: g.R, y: g.yX(f.params.A) }; },
      },
    },
    resize(f) { const el = document.querySelector('[data-fs-out="fig-bounds:read"]'); if (el) FS.reserve(el, narrowOf(f) ? ["state −0.80 to 0 · τ 0.05 to 0.98 s · inside"] : ["state −0.80 to 0, inside [−1.00, 0] · time constant 0.05 to 0.98 s, inside [0.05, 1] s"]); },
    update(f) { if (f.state.dragY != null && f.drag !== "target" && Math.abs(f.state.dragY - geo(f).yX(f.params.A)) < 0.5) f.state.dragY = null; },
    render(f, c) {
      const C = f.C, g = geo(f), { Lx, R, lanes } = g, A = f.v.A, W = f.v.W, strength = 10 ** f.v.strength;
      const sim = simulate(strength, W, A), n = U.length, X = (i) => Lx + (i / (n - 1)) * (R - Lx);
      laneLabel(f, c, lanes[0], "Input", `${fmtX(f.v.strength)} strength`, f.hover === "input");
      laneLabel(f, c, lanes[1], "Time constant", "seconds", f.hover === "tau");
      laneLabel(f, c, lanes[2], "State", "x", f.hover === "state");
      c.strokeStyle = C.line; c.lineWidth = 1; FS.k.line(c, Lx, g.yIn(0), R, g.yIn(0));
      c.strokeStyle = f.hover === "input" ? C.accent : C.muted; c.lineWidth = 1.25;
      polyline(c, U.map((u, i) => [X(i), g.yIn(u)]).filter((_, i) => i % 2 === 0));
      // Theorem 1 envelope
      const tLo = tauSys(W), yHi = g.yTau(LTC.tau), yLo = g.yTau(tLo);
      c.fillStyle = C.surface2; c.fillRect(Lx, yHi, R - Lx, yLo - yHi);
      c.strokeStyle = C.lineStrong; c.lineWidth = 1; dashed(c, Lx, yHi, R, yHi); dashed(c, Lx, yLo, R, yLo);
      c.strokeStyle = f.hover === "tau" ? C.accent : C.fg; c.lineWidth = C.series; c.lineJoin = "round";
      polyline(c, sim.ts.map((v, i) => [X(i), g.yTau(v)]));
      FS.k.label(f, c, "τ = 1 s", Lx + 6, yHi - 7, { size: 10.5, color: C.muted, weight: 500 });
      FS.k.label(f, c, `τ/(1 + τW) = ${tLo.toFixed(2)} s`, Lx + 6, yLo + 9, { size: 10.5, color: C.muted, weight: 500 });
      // Theorem 2 envelope [min(0, A), max(0, A)]
      const top = Math.max(0, A), bot = Math.min(0, A), yT = g.yX(top), yB = g.yX(bot);
      c.fillStyle = C.surface2; c.fillRect(Lx, yT, R - Lx, Math.max(1, yB - yT));
      c.strokeStyle = C.line; c.lineWidth = 1; FS.k.line(c, Lx, g.yX(0), R, g.yX(0));
      const hotA = f.hover === "target" || f.handleHover === "target" || f.drag === "target";
      const yA = f.state.dragY ?? g.yX(A);
      c.strokeStyle = hotA ? C.accent : C.lineStrong; c.lineWidth = hotA ? 1.5 : 1; dashed(c, Lx, yA, R, yA, [5, 3]);
      c.strokeStyle = f.hover === "state" ? C.accent : C.fg; c.lineWidth = C.series;
      polyline(c, sim.xs.map((v, i) => [X(i), g.yX(v)]));
      c.lineWidth = 1;
      const up = A >= 0;
      const env = g.narrow ? "" : ` · envelope [min(0, A), max(0, A)] = [${bot.toFixed(2)}, ${top.toFixed(2)}]`;
      FS.k.label(f, c, `target A = ${A.toFixed(2)}${env}`, Lx + 6, yA + (up ? -8 : 9), { size: 10.5, color: hotA ? C.accent : C.muted, weight: 600 });
      knob(f, c, R, yA, "target");
      for (let t = 0; t <= END; t += 2) FS.k.text(f, c, `${t} s`, Lx + (t / END) * (R - Lx), lanes[2].y1 + 16, { align: "center", size: 10.5 });
      const inside = sim.xmin >= bot - 1e-9 && sim.xmax <= top + 1e-9;
      const r2 = (v) => (Math.abs(v) < 0.005 ? "0" : v.toFixed(2));
      f.api.out("read", g.narrow ? `state ${r2(sim.xmin)} to ${r2(sim.xmax)} · τ ${sim.tmin.toFixed(2)} to ${sim.tmax.toFixed(2)} s · ${inside ? "inside" : "outside"}`
        : `state ${r2(sim.xmin)} to ${r2(sim.xmax)}, ${inside ? "inside" : "outside"} [${r2(bot)}, ${r2(top)}] · time constant ${sim.tmin.toFixed(2)} to ${sim.tmax.toFixed(2)} s, inside [${tLo.toFixed(2)}, 1] s`);
      f.api.out("strengthText", fmtX(f.params.strength));
    },
  });
})();

/* ================= Fig 4: explicit Euler against the fused step (steps + a step-size handle) ================= */
(() => {
  const END = 2;
  const run = (dt, W) => {
    const F = gate(1, W), rest = restingState(F), ts = tauSys(F), euler = [[0, 0]], fused = [[0, 0]];
    let xe = 0, xf = 0;
    for (let i = 1; (i - 1) * dt <= END; i++) {
      xe = xe + dt * (-(1 / LTC.tau + F) * xe + F * LTC.A);
      xf = fusedStep(xf, F, dt);
      euler.push([i * dt, xe]); fused.push([i * dt, xf]);
    }
    const D = 1 + dt * (1 / LTC.tau + F);
    return { F, rest, ts, euler, fused, exact: (t) => rest * (1 - Math.exp(-t / ts)), weights: [1 / D, (dt * F) / D, dt / LTC.tau / D] };
  };
  const at = (f) => run(f.params.dt, f.params.W);
  const first = (r) => ({ e: r.euler[1][1], u: r.fused[1][1], x: r.exact(r.euler[1][0]) });
  const steps = [
    { show: ["exact"], caption: (f) => { const r = at(f); return `Pressed at t = 0, the state heads for ${r.rest.toFixed(2)} with a time constant of ${r.ts.toFixed(2)} s. This curve is the exact answer.`; } },
    { show: ["exact", "euler"], caption: (f) => { const r = at(f), p = first(r), dt = f.params.dt; return p.e > LTC.A ? `Euler follows the starting slope for a whole Δt = ${dt.toFixed(2)} s: its first step lands at ${p.e.toFixed(2)}, above the ceiling A = 1.` : dt > r.ts ? `At Δt = ${dt.toFixed(2)} s Euler's first step lands at ${p.e.toFixed(2)}, past the resting value ${r.rest.toFixed(2)}, and swings back.` : `With Δt = ${dt.toFixed(2)} s Euler tracks the curve. Drag the step past ${r.ts.toFixed(2)} s and watch it overshoot.`; } },
    { show: ["exact", "euler", "fused"], caption: (f) => { const r = at(f), p = first(r); return `The fused step's first move lands at ${p.u.toFixed(2)} (exact: ${p.x.toFixed(2)}). It creeps up from below and never passes ${r.rest.toFixed(2)}, at any Δt.`; } },
    { show: ["exact", "euler", "fused", "mix"], caption: (f) => { const w = at(f).weights.map((v) => Math.round(v * 100)); return `One fused step is a weighted average: ${w[0]}% the current state, ${w[1]}% the target A, ${w[2]}% rest at 0. It can't leave [0, A].`; } },
  ];
  const geo = (f) => {
    const narrow = narrowOf(f), L = narrow ? 34 : 52, R = f.w - (narrow ? 14 : 110), T = narrow ? 30 : 16, B = f.h - (narrow ? 104 : 96);
    return { narrow, L, R, T, B, X: (t) => L + (t / END) * (R - L), Y: (v) => B - ((v + 0.4) / 2.0) * (B - T) };
  };
  const tips = {
    exact: { title: "Exact", body: "The closed-form answer for a constant gate, rest·(1 − e^(−t/τsys)). What both step rules try to follow." },
    euler: { title: "Explicit Euler", body: "x + Δt·slope at the start of the step. Cheap, but with a strong gate it overshoots and can blow up." },
    fused: { title: "Fused step", body: "The paper's Eq. 3: the x outside f is taken at the end of the step. One division, no overshoot." },
  };
  FS.figure("fig-solver", {
    height: (w) => (w < 560 ? 380 : 340),
    steps,
    params: {
      dt: { value: 0.3, min: 0.03, max: 0.8, step: 0.01, label: "Step size Δt", hidden: true },
      W: { value: 4, min: 1, max: 20, step: 0.5, label: "Gate strength W", format: (v) => v.toFixed(1) },
    },
    tips,
    tipAt: (f, x, y) => f.state.hits?.find((h) => inRect(h, x, y))?.key ?? null,
    handles: {
      dt: {
        label: "Step size: drag left or right, or use the arrow keys",
        radius: 16, step: 4,
        get: (f) => { const g = geo(f); return { x: f.state.dragX ?? g.X(f.params.dt), y: g.B }; },
        set: (f, x, y, phase) => {
          const g = geo(f);
          f.state.dragX = phase === "drag" || phase === "settle" ? x : null;
          f.api.set("dt", Math.round(((x - g.L) / (g.R - g.L)) * END * 100) / 100, { instant: true });
        },
        bounds: (f) => { const g = geo(f); return { x0: g.X(0.03), x1: g.X(0.8), y0: g.B, y1: g.B }; },
        release: (f) => { const g = geo(f); return { x: g.X(f.params.dt), y: g.B }; },
      },
    },
    update(f) { if (f.state.dragX != null && f.drag !== "dt" && Math.abs(f.state.dragX - geo(f).X(f.params.dt)) < 0.5) f.state.dragX = null; },
    render(f, c) {
      const C = f.C, g = geo(f), { L, R, T, B, X, Y } = g, s = steps[f.step], show = new Set(s.show);
      const r = run(f.v.dt, f.v.W), hits = (f.state.hits = []), e = FS.ease.out(f.stepT);
      const fresh = (k) => (steps[f.from]?.show.includes(k) ? 1 : e);
      for (const v of [0, 0.5, 1, 1.5]) { c.strokeStyle = C.line; c.lineWidth = 1; FS.k.line(c, L, Y(v), R, Y(v)); FS.k.text(f, c, v.toFixed(1), L - 8, Y(v) + 4, { align: "right", size: 10.5 }); }
      for (let t = 0; t <= END; t += 0.5) FS.k.text(f, c, `${t} s`, X(t), B + 36, { align: "center", size: 10.5 });
      c.strokeStyle = C.lineStrong; dashed(c, L, Y(LTC.A), R, Y(LTC.A), [5, 3]);
      FS.k.label(f, c, "ceiling A = 1", g.narrow ? R - 4 : R + 6, Y(LTC.A) + (g.narrow ? -8 : 0), { size: 10.5, color: C.muted, weight: 500, align: g.narrow ? "right" : "left" });
      c.strokeStyle = C.line; dashed(c, L, Y(r.rest), R, Y(r.rest), [2, 4]);
      c.strokeStyle = C.lineStrong; FS.k.line(c, L, B, R, B);
      c.save(); c.beginPath(); c.rect(L - 6, T - 8, R - L + 12, B - T + 16); c.clip();
      c.strokeStyle = f.hover === "exact" ? C.accent : C.muted; c.lineWidth = 1.25;
      polyline(c, Array.from({ length: 121 }, (_, i) => [X((i / 120) * END), Y(r.exact((i / 120) * END))]));
      const drawSeries = (pts, key, solid, alpha) => {
        c.globalAlpha = alpha;
        const hot = f.hover === key, vis = pts.filter(([t]) => t <= END + 1e-6);
        c.strokeStyle = hot ? C.accent : solid ? C.fg : C.muted; c.lineWidth = solid ? C.series : 1.25;
        if (!solid) c.setLineDash([4, 3]);
        polyline(c, pts.map(([t, v]) => [X(t), Y(Math.max(-2, Math.min(4, v)))])); c.setLineDash([]);
        for (const [t, v] of vis) {
          c.beginPath(); c.arc(X(t), Y(v), solid ? 3.5 : 3.25, 0, 7);
          if (solid) { c.fillStyle = hot ? C.accent : C.fg; c.fill(); } else { c.fillStyle = C.surface; c.fill(); c.strokeStyle = hot ? C.accent : C.muted; c.lineWidth = 1.25; c.stroke(); }
        }
        c.globalAlpha = 1;
      };
      if (show.has("euler")) drawSeries(r.euler, "euler", false, (show.has("fused") ? 0.55 : 1) * fresh("euler"));
      if (show.has("fused")) drawSeries(r.fused, "fused", true, fresh("fused"));
      c.restore();
      if (show.has("euler")) {
        const off = r.euler.find(([t, v]) => t <= END && (v > 1.6 || v < -0.4));
        if (off) { const up = off[1] > 0, x = X(off[0]); c.globalAlpha = fresh("euler"); FS.k.arrow(c, x, up ? T + 16 : B - 16, x, up ? T - 4 : B + 4, C.muted); FS.k.label(f, c, `Euler: ${off[1].toFixed(1)}`, x + 8, up ? T + 4 : B - 6, { size: 10.5, color: C.muted, weight: 600 }); c.globalAlpha = 1; }
      }
      // direct labels (wide) or a key (narrow) for the series
      const lastIn = (pts) => pts.filter((p) => p[0] <= END).at(-1)[1];
      if (!g.narrow) {
        const lab = [{ key: "rest", text: `rests at ${r.rest.toFixed(2)}`, y: Y(r.rest) }, { key: "exact", text: "exact", y: Y(r.exact(END)) }];
        if (show.has("fused")) lab.push({ key: "fused", text: "fused", y: Y(lastIn(r.fused)) });
        if (show.has("euler")) { const v = lastIn(r.euler); if (v < 1.6 && v > -0.4) lab.push({ key: "euler", text: "Euler", y: Y(v) }); }
        lab.sort((a, b) => a.y - b.y);
        for (let i = 1; i < lab.length; i++) lab[i].y = Math.max(lab[i].y, lab[i - 1].y + 14);
        const ceil = Y(LTC.A) + 14;   // the ceiling's own label sits on its line
        for (const l of lab) l.y = Math.max(l.y, ceil);
        for (let i = 1; i < lab.length; i++) lab[i].y = Math.max(lab[i].y, lab[i - 1].y + 14);
        for (const l of lab) {
          const rest = l.key === "rest";
          FS.k.label(f, c, l.text, R + 6, l.y, { size: rest ? 10.5 : 11, weight: rest ? 500 : 600, color: f.hover === l.key ? C.accent : l.key === "fused" ? C.fg : C.muted });
          if (!rest) hits.push({ key: l.key, x: R + 2, y: l.y - 8, w: 60, h: 16 });
        }
      } else {
        [["exact", "exact", false], ["euler", "Euler", false], ["fused", "fused", true]].filter(([k]) => show.has(k)).forEach(([k, t, solid], i) => {
          const x = L + i * 76; c.strokeStyle = solid ? C.fg : C.muted; c.lineWidth = solid ? 2 : 1.25; if (k === "euler") c.setLineDash([4, 3]);
          FS.k.line(c, x, 10, x + 16, 10); c.setLineDash([]); FS.k.text(f, c, t, x + 20, 14, { size: 10.5, color: C.fg }); hits.push({ key: k, x, y: 2, w: 70, h: 16 });
        });
      }
      // the step-size marker: a bracket from 0 to dt on the axis, and its knob
      const xdt = f.state.dragX ?? X(f.v.dt), hotDt = f.hover === "dt" || f.handleHover === "dt" || f.drag === "dt";
      FS.k.bracket(f, c, X(0), xdt, B + 14, "", { color: hotDt ? C.accent : C.lineStrong });
      FS.k.label(f, c, `Δt = ${f.v.dt.toFixed(2)} s · drag`, Math.min(xdt + 18, R - 80), B + 14, { size: 10.5, weight: 600, color: hotDt ? C.accent : C.fg });
      knob(f, c, xdt, B, "dt");
      if (show.has("mix")) {
        c.globalAlpha = fresh("mix");
        const y = f.h - (g.narrow ? 40 : 34), h = 12, w = r.weights, parts = [["current state", C.lineStrong], ["target A", C.fg], ["rest at 0", C.muted]];
        FS.k.text(f, c, `new x = ${w[0].toFixed(2)}·x + ${w[1].toFixed(2)}·A + ${w[2].toFixed(2)}·0`, L, y - 8, { size: g.narrow ? 10.5 : 11, mono: true, color: C.fg });
        let x = L; const labels = [];
        w.forEach((v, i) => { const ww = v * (R - L); FS.k.rrect(c, x + 1, y, Math.max(1, ww - 2), h, 3); c.fillStyle = parts[i][1]; c.fill(); labels.push({ x: x + 2, text: `${parts[i][0]} · ${Math.round(v * 100)}%` }); x += ww; });
        c.font = FS.k.font(f, 10.5);
        for (let i = 1; i < labels.length; i++) labels[i].x = Math.max(labels[i].x, labels[i - 1].x + c.measureText(labels[i - 1].text).width + 10);
        const over = labels.at(-1).x + c.measureText(labels.at(-1).text).width - R;
        if (over > 0) for (let i = labels.length - 1; i >= 0; i--) { labels[i].x -= over; if (i && labels[i].x < labels[i - 1].x + c.measureText(labels[i - 1].text).width + 10) labels[i - 1].x = labels[i].x - c.measureText(labels[i - 1].text).width - 10; }
        labels.forEach((l) => FS.k.text(f, c, l.text, Math.max(L, l.x), y + h + 14, { size: 10.5 }));
        c.globalAlpha = 1;
      }
    },
  });
})();

/* ================= Fig 5: trajectory length, the paper's Fig. 2 values ================= */
(() => {
  const PANELS = {
    A: { tab: "A · layers", axis: "layer", xs: ["1", "2", "3"], setting: "Fig. 2A: Hard-tanh · 3 layers · width 100 · σw² = 2 · σb² = 1 · RK45",
      node: [108.245, 5407.3963, 255299.3159], ct: [90.5486, 1210.7898, 15949.0123], ltc: [12481.0242, 15332.7607, 17707.2484] },
    B: { tab: "B · weights", axis: "σw², the spread of the weights", xs: ["1", "2", "4"], setting: "Fig. 2B: Hard-tanh · 1 layer · width 100 · σb² = 1 · RK45",
      node: [76.8928, 105.3978, 227.3078], ct: [28.807, 84.3868, 208.133], ltc: [3052.0265, 16889.202, 276980.4953] },
    C: { tab: "C · width (ReLU)", axis: "width, neurons", xs: ["100", "200"], setting: "Fig. 2C: ReLU · 1 layer · σw² = 2 · σb² = 1 · RK45",
      node: [81.0841, 110.943], ct: [39.9081, 54.5492], ltc: [266.2873, 527.0816] },
    D: { tab: "D · layers (tanh)", axis: "layer", xs: ["1", "2", "3", "4", "5"], setting: "Fig. 2D: tanh (caption: logistic-sigmoid) · 5 layers · width 100 · σw² = 2 · σb² = 1",
      node: [37.1075, 55.8477, 56.8841, 57.0224, 57.6322], ct: [29.4344, 24.4596, 25.1329, 21.2794, 21.7574], ltc: [438.7242, 366.6077, 406.2259, 357.9859, 329.3917] },
    E: { tab: "E · width", axis: "width, neurons", xs: ["100", "200"], setting: "Fig. 2E: Hard-tanh · 1 layer · σw² = 2 · σb² = 1 · RK45",
      node: [104.5981, 138.4056], ct: [87.9204, 120.58], ltc: [18339.8985, 53858.6441] },
  };
  const SERIES = [{ key: "ltc", name: "LTC" }, { key: "node", name: "Neural ODE" }, { key: "ct", name: "CT-RNN" }];
  const tips = {};
  for (const [p, d] of Object.entries(PANELS)) for (const s of SERIES) d[s.key].forEach((v, i) => {
    tips[`${p}:${s.key}:${i}`] = { title: `${s.name} · ${d.axis.split(",")[0]} ${d.xs[i]}`, body: `Trajectory length ${v.toLocaleString("en-US", { maximumFractionDigits: 4 })}, printed above Fig. 2${p}.` };
  });
  const LOG1 = 6;
  const fmtV = (v) => (v >= 1e4 ? `${(v / 1000).toFixed(v >= 1e5 ? 0 : 1)}k` : v >= 100 ? v.toFixed(0) : v.toFixed(1));
  FS.figure("fig-length", {
    height: (w) => (w < 560 ? 350 : 316),
    params: { panel: { value: "A", label: "Panel", placement: "inline", options: Object.entries(PANELS).map(([value, d]) => ({ value, label: d.tab })) } },
    reserve: { read: ["Longest path: LTC in 3 of 3 settings · up to 1,331× the next longest"] },
    tips,
    tipAt: (f, x, y) => { const h = f.state.hits?.find((p) => Math.hypot(p.x - x, p.y - y) < 12); return h ? { key: h.key, x: h.x, y: h.y } : null; },
    init(f) { f.state.from = null; f.state.fade = 1; },
    onParam(f, name) { if (name === "panel") { f.state.from = f.state.shown ?? null; f.state.fade = 0; } },
    update(f, dt) { if (f.state.fade < 1) { f.state.fade = Math.min(1, f.state.fade + dt / 0.3); f.dirty = true; } },
    render(f, c) {
      const C = f.C, narrow = narrowOf(f), L = narrow ? 40 : 56, R = f.w - (narrow ? 16 : 120), T = narrow ? 34 : 18, B = f.h - (narrow ? 76 : 62);
      const Y = (v) => B - (Math.log10(v) / LOG1) * (B - T);
      const hits = (f.state.hits = []);
      for (let e = 0; e <= LOG1; e++) { c.strokeStyle = C.line; c.lineWidth = 1; FS.k.line(c, L, Y(10 ** e), R, Y(10 ** e)); FS.k.text(f, c, ["1", "10", "100", "1k", "10k", "100k", "1M"][e], L - 8, Y(10 ** e) + 4, { align: "right", size: 10.5 }); }
      c.strokeStyle = C.lineStrong; dashed(c, L, Y(2 * Math.PI), R, Y(2 * Math.PI), [5, 3]);
      FS.k.label(f, c, "input circle, 2π", narrow ? R - 4 : R + 6, Y(2 * Math.PI) + (narrow ? -8 : 0), { size: 10.5, color: C.muted, weight: 500, align: narrow ? "right" : "left" });
      const draw = (key, alpha) => {
        const d = PANELS[key], n = d.xs.length, X = (i) => L + ((i + 0.5) / n) * (R - L);
        c.globalAlpha = alpha;
        d.xs.forEach((x, i) => FS.k.text(f, c, x, X(i), B + 16, { align: "center", size: 11, color: C.fg }));
        FS.k.text(f, c, `${d.axis} →`, (L + R) / 2, B + 34, { align: "center", size: 10.5 });
        const ends = [];
        for (const s of SERIES) {
          const vals = d[s.key], hero = s.key === "ltc";
          c.strokeStyle = hero ? C.fg : C.muted; c.lineWidth = hero ? C.series : 1.25;
          if (s.key === "ct") c.setLineDash([4, 3]);
          polyline(c, vals.map((v, i) => [X(i), Y(v)])); c.setLineDash([]);
          vals.forEach((v, i) => {
            const k = `${key}:${s.key}:${i}`, hot = f.hover === k;
            c.beginPath(); c.arc(X(i), Y(v), hot ? 5 : hero ? 4 : 3.5, 0, 7);
            if (hero) { c.fillStyle = hot ? C.accent : C.fg; c.fill(); } else { c.fillStyle = C.surface; c.fill(); c.strokeStyle = hot ? C.accent : C.muted; c.lineWidth = 1.25; c.stroke(); }
            if (key === f.params.panel) hits.push({ key: k, x: X(i), y: Y(v) });
            if (hero) {
              // keep the value off the line: above-right, above-left if the line climbs to the right, below in a dip
              const up = (j) => j >= 0 && j < n && vals[j] > v, side = up(i + 1) && up(i - 1) ? "below" : up(i + 1) ? "left" : "right";
              FS.k.label(f, c, fmtV(v), X(i) + (side === "left" ? -8 : 8), Y(v) + (side === "below" ? 14 : -10), { size: 10.5, weight: 600, align: side === "left" ? "right" : "left" });
            }
          });
          ends.push({ name: s.name, y: Y(vals[n - 1]), hero });
        }
        if (!narrow) {
          ends.sort((a, b) => a.y - b.y);
          for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 14);
          for (const e of ends) FS.k.label(f, c, e.name, R + 8, e.y, { size: 11, weight: 600, color: e.hero ? C.fg : C.muted });
        }
        c.globalAlpha = 1;
      };
      const fade = FS.ease.out(f.state.fade), switching = f.state.from && f.state.from !== f.params.panel && fade < 1;
      if (switching) draw(f.state.from, 1 - fade);
      draw(f.params.panel, switching ? fade : 1);
      f.state.shown = f.params.panel;
      if (narrow) {
        [["LTC", true, false], ["Neural ODE", false, false], ["CT-RNN", false, true]].forEach(([name, hero, dash], i) => {
          const x = L + i * 96, y = 12; c.strokeStyle = hero ? C.fg : C.muted; c.lineWidth = hero ? 2 : 1.25; if (dash) c.setLineDash([4, 3]); FS.k.line(c, x, y, x + 16, y); c.setLineDash([]); FS.k.text(f, c, name, x + 20, y + 4, { size: 10.5, color: C.fg });
        });
      }
      const d = PANELS[f.params.panel];
      let wins = 0, best = 0;
      d.ltc.forEach((v, i) => { const other = Math.max(d.node[i], d.ct[i]); if (v > other) { wins++; best = Math.max(best, v / other); } });
      f.api.out("read", `Longest path: LTC in ${wins} of ${d.xs.length} settings${wins ? ` · up to ${Math.round(best).toLocaleString("en-US")}× the next longest` : ""}`);
      // the panel's settings, as printed beside it in the paper, under the axis
      c.font = FS.k.font(f, 10.5);
      const words = d.setting.split(" · "), lines = [""];
      for (const w of words) { const next = lines.at(-1) ? `${lines.at(-1)} · ${w}` : w; if (c.measureText(next).width > f.w - 8 && lines.at(-1)) lines.push(w); else lines[lines.length - 1] = next; }
      lines.forEach((t, i) => FS.k.text(f, c, t, 0, B + 56 + i * 14, { size: 10.5 }));
    },
  });
})();

/* ================= Fig 6: benchmarks, Tables 3, 4 and 6 (dots per method) ================= */
(() => {
  const METHODS = [{ key: "lstm", name: "LSTM" }, { key: "ctrnn", name: "CT-RNN" }, { key: "node", name: "Neural ODE" }, { key: "ctgru", name: "CT-GRU" }, { key: "ltc", name: "LTC" }];
  // [mean, sd] per method, in METHODS order. dir: +1 higher is better, -1 lower is better.
  const ROWS = [
    { task: "Gesture", metric: "accuracy, %", src: "Table 3", dir: 1, v: [[64.57, 0.59], [59.01, 1.22], [46.97, 3.03], [68.31, 1.78], [69.55, 1.13]] },
    { task: "Occupancy", metric: "accuracy, %", src: "Table 3", dir: 1, v: [[93.18, 1.66], [94.54, 0.54], [90.15, 1.71], [91.44, 1.67], [94.63, 0.17]] },
    { task: "Activity recognition", metric: "accuracy, %", src: "Table 3", dir: 1, v: [[95.85, 0.29], [95.73, 0.47], [97.26, 0.1], [96.16, 0.39], [95.67, 0.575]] },
    { task: "Sequential MNIST", metric: "accuracy, %", src: "Table 3", dir: 1, v: [[98.41, 0.12], [96.73, 0.19], [97.61, 0.14], [98.27, 0.14], [97.57, 0.18]] },
    { task: "Traffic", metric: "squared error", src: "Table 3", dir: -1, v: [[0.169, 0.004], [0.224, 0.008], [1.512, 0.179], [0.389, 0.076], [0.099, 0.0095]] },
    { task: "Power", metric: "squared error", src: "Table 3", dir: -1, v: [[0.628, 0.003], [0.742, 0.005], [1.254, 0.149], [0.586, 0.003], [0.642, 0.021]] },
    { task: "Ozone", metric: "F1 score", src: "Table 3", dir: 1, v: [[0.284, 0.025], [0.236, 0.011], [0.168, 0.006], [0.26, 0.024], [0.302, 0.0155]] },
    { task: "Person activity", metric: "accuracy, %", src: "Table 4", dir: 1, nodeName: "Latent ODE", v: [[83.59, 0.4], [81.54, 0.33], [76.48, 0.56], [85.27, 0.39], [85.48, 0.4]] },
    { task: "Half-Cheetah", metric: "squared error", src: "Table 6", dir: -1, v: [[2.5, 0.14], [2.838, 0.112], [3.805, 0.313], [3.014, 0.134], [2.308, 0.015]] },
  ];
  const LTC_I = 4;
  const nameOf = (row, i) => (i === 2 && row.nodeName ? row.nodeName : METHODS[i].name);
  const versusIndex = (row, vs) => {
    if (vs !== "best") return METHODS.findIndex((m) => m.key === vs);
    let best = 0; for (let i = 1; i < LTC_I; i++) if (row.dir * row.v[i][0] > row.dir * row.v[best][0]) best = i; return best;
  };
  const diffText = (row, j) => {
    const a = row.v[LTC_I][0], b = row.v[j][0];
    if (row.metric.endsWith("%")) { const d = a - b; return `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(2)} pts`; }
    const rel = ((a - b) / b) * 100;
    return row.dir < 0 ? `${Math.abs(rel).toFixed(1)}% ${rel <= 0 ? "less" : "more"} error` : `${rel >= 0 ? "+" : "−"}${Math.abs(rel).toFixed(1)}%`;
  };
  const tips = {};
  ROWS.forEach((row, r) => row.v.forEach(([m, s], i) => { tips[`${r}:${i}`] = { title: `${nameOf(row, i)} · ${row.task}`, body: `${m}${row.metric.endsWith("%") ? "%" : ""} ± ${s}, ${row.metric} (${row.dir > 0 ? "higher" : "lower"} is better), ${row.src}.` }; }));
  FS.figure("fig-bench", {
    height: (w) => (w < 560 ? 30 + ROWS.length * 58 : 30 + ROWS.length * 40),
    params: { versus: { value: "best", label: "Compare with", placement: "inline", options: [{ value: "best", label: "Best other" }, { value: "lstm", label: "LSTM" }, { value: "ctrnn", label: "CT-RNN" }, { value: "node", label: "Neural ODE" }, { value: "ctgru", label: "CT-GRU" }] } },
    reserve: { read: ["LTC ahead of the best other on 4 of 7 Table 3 tasks, 6 of 9 overall"] },
    tips,
    tipAt: (f, x, y) => { const h = f.state.hits?.find((p) => Math.abs(p.x - x) < 8 && Math.abs(p.y - y) < 9); return h ? { key: h.key, x: h.x, y: h.y } : null; },
    render(f, c) {
      const C = f.C, narrow = narrowOf(f), vs = f.params.versus, hits = (f.state.hits = []);
      const L = narrow ? 8 : 184, R = f.w - (narrow ? 8 : 150), rowH = narrow ? 58 : 40, top = 28;
      // key: filled LTC, a bold ring for the method compared, thin rings for the rest
      { let x = 4; const y = 10;
        const item = (kind, text) => {
          c.beginPath(); c.arc(x, y, kind === "ltc" ? 5 : 4, 0, 7);
          if (kind === "ltc") { c.fillStyle = C.fg; c.fill(); } else { c.fillStyle = C.surface; c.fill(); c.strokeStyle = kind === "picked" ? C.fg : C.muted; c.lineWidth = kind === "picked" ? 1.75 : 1.25; c.stroke(); }
          FS.k.text(f, c, text, x + 9, y + 4, { size: 10.5, color: C.fg }); c.font = FS.k.font(f, 10.5); x += 9 + c.measureText(text).width + 16;
        };
        item("ltc", "LTC"); item("picked", "compared"); item("other", narrow ? "others" : "others (hover to name)"); }
      FS.k.text(f, c, "better →", R, 14, { size: 10.5, align: "right" });
      let wins3 = 0, winsAll = 0;
      ROWS.forEach((row, r) => {
        const y0 = top + r * rowH, yDot = y0 + (narrow ? 38 : 20);
        const lo = Math.min(...row.v.map(([m, s]) => m - s)), hi = Math.max(...row.v.map(([m, s]) => m + s)), pad = (hi - lo) * 0.05;
        const u = (v) => (v - (lo - pad)) / (hi - lo + 2 * pad);
        const X = (v) => (row.dir > 0 ? L + u(v) * (R - L) : R - u(v) * (R - L));   // better is always to the right
        if (r > 0) { c.strokeStyle = C.line; c.lineWidth = 1; FS.k.line(c, 0, y0 - 4, f.w, y0 - 4); }
        const j = versusIndex(row, vs), ahead = row.dir * (row.v[LTC_I][0] - row.v[j][0]) > 0;
        if (ahead) { winsAll++; if (row.src === "Table 3") wins3++; }
        const diff = `${diffText(row, j)} vs ${nameOf(row, j)}`;
        if (narrow) {
          FS.k.text(f, c, row.task, 0, y0 + 12, { size: 11.5, weight: 600, color: C.fg });
          FS.k.text(f, c, `${row.metric} · ${row.src}`, 0, y0 + 25, { size: 10 });
          FS.k.text(f, c, diff, f.w, y0 + 12, { size: 10.5, align: "right", color: ahead ? C.fg : C.muted, weight: 600 });
        } else {
          FS.k.text(f, c, row.task, 0, yDot - 2, { size: 12, weight: 600, color: C.fg });
          FS.k.text(f, c, `${row.metric} · ${row.src}`, 0, yDot + 12, { size: 10.5 });
          FS.k.text(f, c, diff, R + 14, yDot + 4, { size: 10.5, color: ahead ? C.fg : C.muted, weight: 600 });
        }
        c.strokeStyle = C.line; c.lineWidth = 1; FS.k.line(c, L, yDot, R, yDot);
        const xa = X(row.v[j][0]), xb = X(row.v[LTC_I][0]), yb = yDot - 10;
        c.strokeStyle = ahead ? C.accent : C.muted; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(xa, yb + 4); c.lineTo(xa, yb); c.lineTo(xb, yb); c.lineTo(xb, yb + 4); c.stroke();
        row.v.forEach(([m, s], i) => {
          const x = X(m), hero = i === LTC_I, picked = i === j, k = `${r}:${i}`, hot = f.hover === k;
          c.strokeStyle = hero || picked ? C.fg : C.muted; c.lineWidth = 1.25;
          FS.k.line(c, X(m - s), yDot, X(m + s), yDot); FS.k.line(c, X(m - s), yDot - 3, X(m - s), yDot + 3); FS.k.line(c, X(m + s), yDot - 3, X(m + s), yDot + 3);
          c.beginPath(); c.arc(x, yDot, hero ? 5 : 4, 0, 7);
          if (hero) { c.fillStyle = hot ? C.accent : C.fg; c.fill(); }
          else { c.fillStyle = C.surface; c.fill(); c.strokeStyle = hot ? C.accent : picked ? C.fg : C.muted; c.lineWidth = picked ? 1.75 : 1.25; c.stroke(); }
          hits.push({ key: k, x, y: yDot });
        });
      });
      const what = vs === "best" ? "the best other" : METHODS.find((m) => m.key === vs).name;
      f.api.out("read", `LTC ahead of ${what} on ${wins3} of 7 Table 3 tasks, ${winsAll} of 9 overall`);
    },
  });
})();
