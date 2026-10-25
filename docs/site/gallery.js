/* Gallery figures. Every one is synthetic and seeded, laid out in CSS pixels (no scaled-down text), and
   drawn only from FS state, so play, scrub, step, drag and code all reach the same picture. */

const NS = "http://www.w3.org/2000/svg";
function svgMaker(svg) {
  return (tag, attrs = {}, parent = svg) => {
    const n = document.createElementNS(NS, tag);
    for (const a in attrs) n.setAttribute(a, attrs[a]);
    parent.append(n);
    return n;
  };
}
const inRect = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

/* ================= 1. Data flow: a queue in front of workers (canvas) ================= */
(() => {
  const WORK = 1.8; // seconds a worker spends on one job
  const HOP_IN = 0.8;
  const HOP_WORK = 0.45;
  const HOP_OUT = 0.6;
  const SETTLE_IN = 0.3; // a new job slides into its place in the line
  const r = FS.rng(11);
  const departs = [[0.2, 2.2, 7], [5.0, 5.8, 4], [8.4, 10.2, 7]]
    .flatMap(([a, b, n]) => Array.from({ length: n }, () => a + r() * (b - a)))
    .sort((a, b) => a - b);
  const TOTAL = departs.length;

  function schedule(k) {
    const free = new Array(k).fill(0);
    const jobs = departs.map((depart) => {
      const queued = depart + HOP_IN;
      let w = 0;
      for (let j = 1; j < k; j++) if (free[j] < free[w]) w = j;
      const start = Math.max(queued, free[w]);
      const work = start + HOP_WORK;
      const done = work + WORK;
      free[w] = done;
      return { depart, queued, start, work, done, stored: done + HOP_OUT, worker: w };
    });
    const wait = Math.max(...jobs.map((j) => j.start - j.queued));
    const end = Math.max(...jobs.map((j) => j.stored));
    return { jobs, wait, end, period: Math.max(14, end + 1.6) };
  }
  const plans = [1, 2, 3, 4].map(schedule);
  const fmt = (s) => `${s.toFixed(1)} s`;

  let L = null;
  function layout(w) {
    if (w >= 640) {
      const cy = 140;
      const queue = { x: w * 0.2, y: cy - 36, w: Math.max(160, w * 0.25), h: 72 };
      const ww = 118;
      const wx = Math.max(queue.x + queue.w + 70, w * 0.64 - ww / 2);
      return {
        h: 280, dir: "x",
        prod: { x: 0, y: cy - 28, w: 112, h: 56 },
        queue,
        workers: [0, 1, 2, 3].map((i) => ({ x: wx, y: cy - 98 + i * 52, w: ww, h: 40 })),
        store: { x: w - 104, y: cy - 28, w: 104, h: 56 },
      };
    }
    const cx = w / 2;
    const gap = 8;
    const ww = (w - 3 * gap) / 4;
    const qw = Math.min(300, w - 16);
    return {
      h: 400, dir: "y",
      prod: { x: cx - 90, y: 6, w: 180, h: 48 },
      queue: { x: cx - qw / 2, y: 100, w: qw, h: 66 },
      workers: [0, 1, 2, 3].map((i) => ({ x: i * (ww + gap), y: 226, w: ww, h: 48 })),
      store: { x: cx - 90, y: 340, w: 180, h: 48 },
    };
  }
  const bez = (p0, p1, dir) => {
    if (dir === "x") { const m = (p0[0] + p1[0]) / 2; return [p0, [m, p0[1]], [m, p1[1]], p1]; }
    const m = (p0[1] + p1[1]) / 2;
    return [p0, [p0[0], m], [p1[0], m], p1];
  };
  const point = (b, u) => {
    const v = 1 - u;
    const a = v * v * v, c = 3 * v * v * u, d = 3 * v * u * u, e = u * u * u;
    return [a * b[0][0] + c * b[1][0] + d * b[2][0] + e * b[3][0], a * b[0][1] + c * b[1][1] + d * b[2][1] + e * b[3][1]];
  };
  const strokeBez = (c, b) => { c.beginPath(); c.moveTo(...b[0]); c.bezierCurveTo(...b[1], ...b[2], ...b[3]); c.stroke(); };
  const out = (n, dir) => (dir === "x" ? [n.x + n.w, n.y + n.h / 2] : [n.x + n.w / 2, n.y + n.h]);
  const into = (n, dir) => (dir === "x" ? [n.x, n.y + n.h / 2] : [n.x + n.w / 2, n.y]);
  // Waiting jobs line up from the queue's exit (right) backwards, in two rows.
  const PER_ROW = () => Math.max(6, Math.floor((L.queue.w - 28) / 11));
  const slot = (i) => {
    const per = PER_ROW();
    const row = Math.floor(i / per) % 2;
    return [L.queue.x + L.queue.w - 14 - (i % per) * 11, L.queue.y + L.queue.h - 24 + row * 11];
  };

  const tips = {
    prod: { title: "Producers", body: "Send jobs in bursts, the way real traffic arrives: a lot at once, then quiet." },
    queue: { title: "Queue", body: "Holds jobs until a worker is free. While it grows, people are waiting." },
    worker: { title: "Worker", body: "Takes one job at a time; here every job takes 1.8 s. The bar shows progress." },
    store: { title: "Done", body: "Finished jobs. The cycle starts again once all 18 are done." },
  };
  let k = 2;
  let lastStatus = "";
  function report(f) {
    const plan = plans[k - 1];
    f.api.out("wait", fmt(plan.wait));
    f.api.out("done", fmt(plan.end - departs[0]));
  }

  FS.figure("fig-queue", {
    height: (w) => layout(w).h,
    settle: 6.5,
    params: {
      workers: { value: 2, min: 1, max: 4, step: 1, label: "Workers", placement: "inline", format: (v) => String(Math.round(v)) },
    },
    // Only the toolbar line reserves width: the readouts sit in their own cells, and prose should flow.
    reserve: { status: ["18 waiting · 4 busy"] },
    tips,
    tipAt: (f, x, y) => {
      if (!L) return null;
      if (inRect(L.prod, x, y)) return "prod";
      if (inRect(L.queue, x, y)) return "queue";
      if (inRect(L.store, x, y)) return "store";
      if (L.workers.some((b) => inRect(b, x, y))) return "worker";
      return null;
    },
    init: report,
    onParam(f, name, value) {
      const next = Math.round(value);
      if (next !== k) { k = next; f.api.seek(0); }
      report(f);
    },
    resize(f) { L = layout(f.w); },
    update() {},
    render(f, c) {
      const C = f.C;
      const plan = plans[k - 1];
      const tl = f.t % plan.period;
      const dir = L.dir;
      const edgeIn = bez(out(L.prod, dir), into(L.queue, dir), dir);
      const toWorker = L.workers.map((b) => bez(out(L.queue, dir), into(b, dir), dir));
      const toStore = L.workers.map((b) => bez(out(b, dir), into(L.store, dir), dir));

      // Edges: workers beyond the current count are context, dimmed but kept.
      c.lineWidth = C.edge;
      c.strokeStyle = C.muted;
      strokeBez(c, edgeIn);
      L.workers.forEach((_, i) => {
        c.globalAlpha = i < k ? 1 : 0.18;
        strokeBez(c, toWorker[i]);
        strokeBez(c, toStore[i]);
      });
      c.globalAlpha = 1;

      // Where every job is at this moment.
      const waiting = plan.jobs.filter((j) => tl >= j.queued && tl < j.start);
      const busy = new Array(4).fill(null);
      let stored = 0;
      const dots = [];
      for (const j of plan.jobs) {
        if (tl < j.depart) continue;
        if (tl < j.queued) { dots.push({ p: point(edgeIn, (tl - j.depart) / HOP_IN), wait: false }); continue; }
        if (tl < j.start) {
          // Its place in line, sliding forward as the ones ahead leave.
          let ahead = 0;
          for (const o of plan.jobs) {
            if (o === j || o.queued > j.queued) continue;
            if (tl < o.start) ahead += 1;
            else if (tl - o.start < 0.25) ahead += 1 - FS.ease.out((tl - o.start) / 0.25);
          }
          const lo = Math.floor(ahead);
          const a = slot(lo);
          const b = slot(lo + 1);
          let p = [FS.lerp(a[0], b[0], ahead - lo), FS.lerp(a[1], b[1], ahead - lo)];
          const u = (tl - j.queued) / SETTLE_IN;
          if (u < 1) { const e = into(L.queue, dir); const s = FS.ease.out(u); p = [FS.lerp(e[0], p[0], s), FS.lerp(e[1], p[1], s)]; }
          dots.push({ p, wait: true });
          continue;
        }
        if (tl < j.work) {
          const from = slot(0);
          const b = bez(from, into(L.workers[j.worker], dir), dir);
          dots.push({ p: point(b, (tl - j.start) / HOP_WORK), wait: false });
          continue;
        }
        if (tl < j.done) { busy[j.worker] = (tl - j.work) / WORK; continue; }
        if (tl < j.stored) { dots.push({ p: point(toStore[j.worker], (tl - j.done) / HOP_OUT), wait: false }); continue; }
        stored += 1;
      }

      // Nodes.
      const node = (b, title, sub, o = {}) => {
        c.globalAlpha = o.alpha ?? 1;
        FS.k.rrect(c, b.x, b.y, b.w, b.h, 6);
        c.fillStyle = C.surface;
        c.fill();
        c.strokeStyle = f.hover === o.key ? C.accent : o.active ? C.fg : C.lineStrong;
        c.lineWidth = f.hover === o.key ? 1.5 : 1;
        c.stroke();
        const size = o.size || 13;
        FS.k.text(f, c, title, o.center ? b.x + b.w / 2 : b.x + 12, b.y + (sub ? 21 : b.h / 2 + size / 3), { size, weight: 600, color: C.fg, align: o.center ? "center" : "left" });
        if (sub) FS.k.text(f, c, sub, b.x + 12, b.y + 37, { size: 11 });
        c.globalAlpha = 1;
      };
      node(L.prod, "Producers", "jobs in bursts", { key: "prod" });
      node(L.queue, "Queue", `${waiting.length} waiting`, { key: "queue", active: waiting.length > 0 });
      L.workers.forEach((b, i) => {
        const on = i < k;
        node(b, `Worker ${i + 1}`, null, { key: "worker", alpha: on ? 1 : C.dim, active: busy[i] !== null, size: dir === "x" ? 13 : 11, center: dir !== "x" });
        if (on && busy[i] !== null) {
          c.fillStyle = C.lineStrong;
          c.fillRect(b.x + 8, b.y + b.h - 7, b.w - 16, 2);
          c.fillStyle = C.fg;
          c.fillRect(b.x + 8, b.y + b.h - 7, (b.w - 16) * busy[i], 2);
          if (dir === "x") { c.beginPath(); c.arc(b.x + b.w - 14, b.y + b.h / 2 - 1, 3.5, 0, 7); c.fill(); }
        }
      });
      node(L.store, "Done", `${stored} of ${TOTAL}`, { key: "store" });

      // Jobs on the move in ink; jobs waiting in the accent, because waiting is the point.
      for (const d of dots) {
        c.fillStyle = d.wait ? C.accent : C.fg;
        c.beginPath();
        c.arc(d.p[0], d.p[1], d.wait ? 3.5 : 3, 0, 7);
        c.fill();
      }
      const status = `${waiting.length} waiting · ${busy.filter((b) => b !== null).length} busy`;
      if (status !== lastStatus) { lastStatus = status; f.api.out("status", status); }
    },
  });
})();

/* ================= 2. Stepped mechanism: a token bucket (SVG) ================= */
(() => {
  const svg = document.getElementById("fig-bucket");
  const make = svgMaker(svg);
  const REQUESTS = 6;
  const PW = 54;
  const PH = 26;
  const steps = [
    { allowed: 0, rejected: false, refill: 0, caption: "The bucket holds up to 5 tokens. Every request has to spend one to get through." },
    { allowed: 1, rejected: false, refill: 0, caption: "Request #1 arrives, takes a token and goes through." },
    { allowed: 5, rejected: false, refill: 0, caption: "A burst of four more requests takes the last four tokens." },
    { allowed: 5, rejected: true, refill: 0, caption: "Request #6 finds the bucket empty, so it is turned away." },
    { allowed: 5, rejected: true, refill: 2, caption: "Tokens drip back at one per second. Two seconds later, two more requests could pass." },
  ];

  const labels = make("g");
  const bucketG = make("g", { tabindex: "0", "data-fs-tip-title": "Bucket", "data-fs-tip": "Holds up to 5 tokens. A request that finds one goes through; one that doesn't is turned away." });
  const bucket = make("path", { fill: "none", "stroke-width": 1.5, "stroke-linejoin": "round" }, bucketG);
  const bucketText = make("text", { "font-size": 11, "text-anchor": "middle" }, bucketG);
  bucketText.textContent = "Bucket · up to 5 tokens";
  const dripG = make("g", { tabindex: "0", "data-fs-tip-title": "Refill", "data-fs-tip": "Adds one token per second, up to 5. Short bursts pass; a steady flood doesn't." });
  const dripLine = make("line", { "stroke-dasharray": "2 3" }, dripG);
  const dripText = make("text", { "font-size": 11, "text-anchor": "middle" }, dripG);
  dripText.textContent = "+1 token per second";
  const bins = ["allowed", "rejected"].map((key) => {
    const g = make("g", key === "rejected" ? { tabindex: "0", "data-fs-tip-title": "Turned away", "data-fs-tip": "The server answers 429 Too Many Requests. A good client waits and tries again." } : {});
    const rect = make("rect", { rx: 8, fill: "none", "stroke-dasharray": "3 3" }, g);
    const text = make("text", { "font-size": 11, "font-weight": 500 }, g);
    return { key, g, rect, text };
  });
  const reqLabel = make("text", { "font-size": 11, "font-weight": 500 }, labels);
  reqLabel.textContent = "Requests";
  const pills = Array.from({ length: REQUESTS }, (_, i) => {
    const g = make("g");
    const rect = make("rect", { width: PW, height: PH, rx: PH / 2 }, g);
    const socket = make("circle", { r: 6, fill: "none", "stroke-dasharray": "2 2" }, g);
    const text = make("text", { "font-size": 11, "font-weight": 600, "text-anchor": "middle" }, g);
    text.textContent = `#${i + 1}`;
    return { g, rect, socket, text, x: 0, y: 0 };
  });
  // Tokens 0-4 start in the bucket; 5 and 6 are the refill.
  const tokens = Array.from({ length: 7 }, () => make("circle", { r: 9 }));

  let L = null;
  function layout(w) {
    if (w >= 620) {
      const cx = w * 0.4;
      const x0 = Math.max(cx + 110, w * 0.62);
      return {
        h: 300, cx, top: 118, bottom: 246, drip: 62,
        lane: (i) => [0, 34 + i * 40],
        reqLabel: [0, 18],
        allowed: { x: x0, y: 24, w: w - 4 - x0, h: 136 },
        rejected: { x: x0, y: 176, w: w - 4 - x0, h: 86 },
      };
    }
    const cx = w / 2;
    return {
      h: 540, cx, top: 172, bottom: 296, drip: 128,
      lane: (i) => [cx + ((i % 3) - 1) * (PW + 12) - PW / 2, 28 + Math.floor(i / 3) * 36],
      reqLabel: [cx - 1.5 * PW - 12, 18],
      allowed: { x: 8, y: 334, w: w - 16, h: 104 },
      rejected: { x: 8, y: 450, w: w - 16, h: 80 },
    };
  }
  const tokenSlot = (j) => {
    const by = L.bottom - 19;
    return j < 3 ? [L.cx + (j - 1) * 26, by] : [L.cx + (j === 3 ? -13 : 13), by - 24];
  };
  const binSlot = (bin, i) => [bin.x + 12 + (i % 3) * (PW + 10), bin.y + 32 + Math.floor(i / 3) * 34];

  /** Where everything sits once step s has happened. */
  function stateOf(s) {
    const st = steps[s];
    const req = Array.from({ length: REQUESTS }, (_, i) => {
      if (i < st.allowed) return { at: binSlot(L.allowed, i), kind: "allowed" };
      if (i === 5 && st.rejected) return { at: binSlot(L.rejected, 0), kind: "rejected" };
      return { at: L.lane(i), kind: "waiting" };
    });
    // Request #n spends the top-most token left: #1 takes token 4, #5 takes token 0.
    const tok = Array.from({ length: 7 }, (_, j) => {
      if (j < 5) {
        const spender = 4 - j;
        if (spender < st.allowed) { const p = req[spender].at; return { at: [p[0] + 14, p[1] + PH / 2], r: 6, o: 1 }; }
        return { at: tokenSlot(j), r: 9, o: 1 };
      }
      const k = j - 5;
      return k < st.refill ? { at: tokenSlot(k), r: 9, o: 1 } : { at: [L.cx, L.drip + 14], r: 9, o: 0 };
    });
    return { req, tok };
  }

  FS.figure("fig-bucket", {
    height: (w) => layout(w).h,
    steps,
    stepDuration: 0.9,
    resize(f) {
      L = layout(f.w);
      svg.setAttribute("viewBox", `0 0 ${f.w} ${f.h}`);
      const { cx, top, bottom } = L;
      bucket.setAttribute("d", `M${cx - 78},${top} L${cx - 68},${bottom - 10} Q${cx - 67},${bottom} ${cx - 56},${bottom} L${cx + 56},${bottom} Q${cx + 67},${bottom} ${cx + 68},${bottom - 10} L${cx + 78},${top}`);
      bucketText.setAttribute("x", cx);
      bucketText.setAttribute("y", bottom + 22);
      dripText.setAttribute("x", cx);
      dripText.setAttribute("y", L.drip);
      dripLine.setAttribute("x1", cx); dripLine.setAttribute("x2", cx);
      dripLine.setAttribute("y1", L.drip + 8); dripLine.setAttribute("y2", top - 6);
      for (const b of bins) {
        const box = L[b.key];
        b.rect.setAttribute("x", box.x); b.rect.setAttribute("y", box.y);
        b.rect.setAttribute("width", box.w); b.rect.setAttribute("height", box.h);
        b.text.setAttribute("x", box.x + 12); b.text.setAttribute("y", box.y + 20);
      }
      reqLabel.setAttribute("x", L.reqLabel[0]);
      reqLabel.setAttribute("y", L.reqLabel[1]);
    },
    render(f) {
      const C = f.C;
      const A = stateOf(f.from);
      const B = stateOf(f.step);
      // Things that change in this step move one after another, 80 ms apart.
      const D = 0.9;
      const movers = [];
      B.req.forEach((r, i) => { if (r.kind !== A.req[i].kind) movers.push(`r${i}`); });
      B.tok.forEach((t, j) => { if (t.at[0] !== A.tok[j].at[0] || t.at[1] !== A.tok[j].at[1] || t.o !== A.tok[j].o) movers.push(`t${j}`); });
      const gap = Math.min(0.08, movers.length > 1 ? (D * 0.45) / (movers.length - 1) : 0);
      const progress = (key) => {
        const n = Math.max(0, movers.indexOf(key));
        return FS.ease.smooth(FS.clamp((f.stepT * D - n * gap) / (D - (movers.length - 1) * gap)));
      };
      const mix = (a, b, e) => [FS.lerp(a[0], b[0], e), FS.lerp(a[1], b[1], e)];

      bucket.setAttribute("stroke", f.hover === "bucket" ? C.accent : C.fg);
      bucketText.setAttribute("fill", C.muted);
      dripText.setAttribute("fill", C.muted);
      dripLine.setAttribute("stroke", C.muted);
      reqLabel.setAttribute("fill", C.muted);
      const counts = { allowed: B.req.filter((r) => r.kind === "allowed").length, rejected: B.req.filter((r) => r.kind === "rejected").length };
      for (const b of bins) {
        b.rect.setAttribute("stroke", C.lineStrong);
        b.text.setAttribute("fill", C.fg);
        b.text.textContent = b.key === "allowed" ? `Allowed · ${counts.allowed}` : `Turned away (429) · ${counts.rejected}`;
      }
      pills.forEach((p, i) => {
        const e = progress(`r${i}`);
        const [x, y] = mix(A.req[i].at, B.req[i].at, e);
        const kind = e < 0.5 ? A.req[i].kind : B.req[i].kind;
        const moving = e > 0 && e < 1;
        p.g.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
        p.rect.setAttribute("fill", C.surface);
        p.rect.setAttribute("stroke", moving ? C.accent : kind === "rejected" ? C.muted : C.lineStrong);
        p.rect.setAttribute("stroke-dasharray", kind === "rejected" ? "3 3" : "none");
        p.socket.setAttribute("cx", 14); p.socket.setAttribute("cy", PH / 2);
        p.socket.setAttribute("stroke", C.faint);
        p.socket.setAttribute("opacity", kind === "allowed" ? 0 : 1);
        p.text.setAttribute("x", PW / 2 + 7); p.text.setAttribute("y", PH / 2 + 4);
        p.text.setAttribute("fill", kind === "rejected" ? C.muted : C.fg);
      });
      tokens.forEach((t, j) => {
        const e = progress(`t${j}`);
        const a = A.tok[j];
        const b = B.tok[j];
        const [x, y] = mix(a.at, b.at, e);
        t.setAttribute("cx", x.toFixed(1));
        t.setAttribute("cy", y.toFixed(1));
        t.setAttribute("r", FS.lerp(a.r, b.r, e).toFixed(2));
        t.setAttribute("opacity", FS.lerp(a.o, b.o, e).toFixed(3));
        t.setAttribute("fill", C.accent);
      });
    },
  });
  bucketG.addEventListener("pointerenter", () => FS.get("fig-bucket").hover("bucket"));
  bucketG.addEventListener("pointerleave", () => FS.get("fig-bucket").hover(null));
})();

/* ================= 3. Timeline: one clock, two lanes, the drawing is the scrubber (canvas) ================= */
(() => {
  const lanes = [
    { name: "Sequential", segs: [["think", 0, 1.6], ["search", 1.6, 4.2], ["think", 4.2, 5.4], ["fetch", 5.4, 8.6], ["answer", 8.6, 9.8]] },
    { name: "Overlapped", segs: [["think", 0, 1.6], ["search", 1.6, 4.2], ["fetch", 2.0, 4.8], ["think", 4.8, 5.6], ["answer", 5.6, 6.8]] },
  ];
  const end = (lane) => Math.max(...lane.segs.map((s) => s[2]));
  const seqEnd = end(lanes[0]);
  const overlapEnd = end(lanes[1]);
  const left = (f) => (f.w < 560 ? 84 : 100);
  const fig = FS.figure("fig-time", {
    height: () => 214,
    duration: 10.6,
    chapters: [{ t: 1.6, label: "first tool call" }, { t: overlapEnd, label: "overlapped answers" }, { t: seqEnd, label: "sequential answers" }],
    formatTime: (t) => `t = ${Math.min(t, seqEnd).toFixed(1)} s`,
    timeAxis: (f) => ({ x0: left(f), x1: f.w - 16, t1: seqEnd }),
    reserve: { phase: ["search + fetch", "answered", "think", "idle"] },
    tips: {
      think: { title: "Think", body: "The model reads what it has and picks the next step. Nothing else runs." },
      search: { title: "Search", body: "A tool call. The run waits for its result unless something else can start." },
      fetch: { title: "Fetch", body: "A second tool call. Overlapped, it starts before the search returns." },
      answer: { title: "Answer", body: "The reply is written. This is the moment the reader cares about." },
    },
    tipAt: (f, x, y) => f.state.hits?.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)?.kind ?? null,
    init(f) { f.rate = 1.35; },
    render(f, c) {
      const C = f.C;
      const t = f.t;
      const L = left(f);
      const R = f.w - 16;
      const X = (s) => L + (R - L) * (s / seqEnd);
      const hits = (f.state.hits = []);
      const laneY = [28, 92];
      const lh = 38;
      c.strokeStyle = C.line;
      c.lineWidth = 1;
      for (let s = 0; s <= seqEnd; s += 2) {
        FS.k.line(c, X(s), 18, X(s), 152);
        FS.k.text(f, c, `${s} s`, X(s), 172, { align: "center", size: 11 });
      }
      lanes.forEach((lane, li) => {
        FS.k.text(f, c, lane.name, 0, laneY[li] + lh / 2 + 4, { color: C.fg, size: 12, weight: 600 });
        // The overlapped lane splits its height while two calls run at once.
        lane.segs.forEach(([kind, t0, t1], si) => {
          const grow = FS.clamp((t - t0) / (t1 - t0));
          if (grow <= 0) return;
          let y = laneY[li];
          let h = lh;
          if (li === 1 && (si === 1 || si === 2)) { h = lh / 2 - 1; y += si === 2 ? lh / 2 + 1 : 0; }
          const x0 = X(t0);
          const w = (X(t1) - x0) * grow;
          hits.push({ kind, x: x0, y, w, h });
          FS.k.rrect(c, x0, y, Math.max(1, w - 2), h, 4);
          if (kind === "answer") c.fillStyle = C.accent;
          else if (kind === "think") c.fillStyle = C.lineStrong;
          else {
            c.fillStyle = C.surface2;
            c.fill();
            FS.k.rrect(c, x0, y, Math.max(1, w - 2), h, 4);
            c.fillStyle = FS.k.hatch(f, c, C.muted, 5);
          }
          c.fill();
          const hot = (t > t0 && t < t1) || f.hover === kind;
          c.strokeStyle = hot ? C.fg : C.line;
          c.lineWidth = hot ? 1.5 : 1;
          c.stroke();
          if (w > 46 && grow === 1 && h > 30) {
            if (kind === "answer") FS.k.text(f, c, kind, x0 + 7, y + h / 2 + 4, { size: 11, color: C.surface, weight: 600 });
            else FS.k.label(f, c, kind, x0 + 7, y + h / 2, { size: 11, weight: 500, halo: kind === "think" ? C.lineStrong : C.surface2 });
          }
        });
      });
      FS.k.hoverTime(f, c, 16, 154, X, (s) => `${Math.min(s, seqEnd).toFixed(1)} s`);
      FS.k.playhead(f, c, X(Math.min(t, seqEnd)), 16, 154);
      // The saving is computed from the same numbers, and shown once the slower lane finishes.
      const reveal = FS.window(t, seqEnd, seqEnd + 0.5, FS.ease.out);
      if (reveal > 0) FS.k.bracket(f, c, X(overlapEnd), X(seqEnd), 146, `${(seqEnd / overlapEnd).toFixed(2)}× sooner`, { alpha: reveal });
      const now = lanes[1].segs.filter(([, t0, t1]) => t >= t0 && t < t1).map((s) => s[0]);
      const label = t >= overlapEnd ? "answered" : now.length ? now.join(" + ") : "idle";
      f.api.out("phase", label);
      document.getElementById("fig-time-chip").dataset.pulse = t >= overlapEnd ? "" : now.length > 1 ? "fast" : "slow";
    },
  });
  fig.out("seqEnd", `${seqEnd.toFixed(1)} s`);
  fig.out("overlapEnd", `${overlapEnd.toFixed(1)} s`);
})();

/* ================= 4. Chart with a draggable threshold (canvas) ================= */
(() => {
  const r = FS.rng(23);
  const N = 120;
  const make = (mu) => Array.from({ length: N }, () => ({ mu, z: FS.gauss(r), j: r() }));
  const real = make(0.64);
  const normal = make(0.37);
  const score = (d, overlap) => FS.clamp(d.mu + 0.115 * overlap * d.z, 0.01, 0.99);
  const DEFAULT = 0.5;
  const MIN = 0.05;
  const MAX = 0.95;
  const G = { rowA: 64, rowB: 164, band: 22, knobY: 106, top: 36, bottom: 190, axis: 206, h: 236 };
  const X = (f, s) => 16 + (f.w - 32) * s;
  const S = (f, x) => (x - 16) / (f.w - 32);
  let raw = null; // where the line is drawn while it is held or settling (it may rubber-band past the range)
  let fromHandle = false;

  function counts(cut, overlap) {
    const caught = real.filter((d) => score(d, overlap) >= cut).length;
    const alarms = normal.filter((d) => score(d, overlap) >= cut).length;
    return { caught, alarms, precision: caught + alarms ? caught / (caught + alarms) : 1 };
  }
  function report(f) {
    const n = counts(f.params.cut, f.params.overlap);
    f.api.out("caught", `${n.caught} of ${N}`);
    f.api.out("alarms", String(n.alarms));
    f.api.out("precision", `${Math.round(n.precision * 100)}%`);
  }
  const dotY = (d, row) => row + (d.j - 0.5) * 2 * (G.band - 4);

  FS.figure("fig-cut", {
    height: () => G.h,
    autoplay: false,
    params: {
      cut: { value: DEFAULT, min: MIN, max: MAX, step: 0.01, label: "Threshold", hidden: true, format: (v) => v.toFixed(2) },
      overlap: { value: 1, min: 0.4, max: 1.8, step: 0.05, label: "Overlap", format: (v) => `${v.toFixed(2)}×` },
    },
    handles: {
      cut: {
        label: "Threshold: drag sideways or use the arrow keys",
        radius: 20,
        get: (f) => ({ x: X(f, raw ?? f.v.cut), y: G.knobY }),
        set: (f, x, y, phase) => {
          raw = S(f, x);
          fromHandle = true;
          f.api.set("cut", Math.round(FS.clamp(raw, MIN, MAX) * 100) / 100, { instant: phase !== "key" });
          fromHandle = false;
          if (phase === "key") raw = null;
        },
        bounds: (f) => ({ x0: X(f, MIN), y0: G.knobY, x1: X(f, MAX), y1: G.knobY }),
        // Let go within a few pixels of the default and it springs back to it.
        release: (f) => {
          const v = FS.clamp(raw ?? f.params.cut, MIN, MAX);
          return { x: X(f, Math.abs(X(f, v) - X(f, DEFAULT)) < 6 ? DEFAULT : v), y: G.knobY };
        },
        step: 8.6,
      },
    },
    tips: {
      cut: { title: "Threshold", body: "Scores at or above it get flagged. 0.50 here is a starting point, not a tuned value." },
      missed: { title: "Missed", body: "A real problem that scored below the line, so nobody looks at it." },
      caught: { title: "Caught", body: "A real problem at or above the line. It gets flagged." },
      alarm: { title: "False alarm", body: "A normal case at or above the line. Someone checks it for nothing." },
      clear: { title: "Cleared", body: "A normal case below the line. Correctly left alone." },
    },
    tipAt(f, x, y) {
      const cut = f.params.cut;
      if (Math.abs(x - X(f, raw ?? f.v.cut)) < 8 && y > G.top && y < G.bottom) return "cut";
      let best = null;
      let bestD = 49;
      for (const [rows, row, isReal] of [[real, G.rowA, true], [normal, G.rowB, false]]) {
        for (const d of rows) {
          const s = score(d, f.v.overlap);
          const dx = X(f, s) - x;
          const dy = dotY(d, row) - y;
          const dd = dx * dx + dy * dy;
          if (dd < bestD) { bestD = dd; best = isReal ? (s >= cut ? "caught" : "missed") : s >= cut ? "alarm" : "clear"; }
        }
      }
      return best;
    },
    init: report,
    onParam(f) { if (!fromHandle) raw = null; report(f); },
    render(f, c) {
      const C = f.C;
      const cut = f.params.cut;
      const lineX = X(f, raw ?? f.v.cut);
      const R = X(f, 1);
      // Everything right of the line is flagged.
      c.fillStyle = C.surface2;
      c.fillRect(lineX, G.top, Math.max(0, R - lineX), G.bottom - G.top);
      FS.k.text(f, c, "Real problems", 16, G.rowA - G.band - 10, { size: 11, weight: 500, color: C.fg });
      FS.k.text(f, c, "Normal cases", 16, G.rowB - G.band - 10, { size: 11, weight: 500, color: C.fg });
      // Axis.
      c.strokeStyle = C.lineStrong;
      c.lineWidth = 1;
      FS.k.line(c, X(f, 0), G.axis, R, G.axis);
      for (const s of [0, 0.25, 0.5, 0.75, 1]) {
        FS.k.line(c, X(f, s), G.axis, X(f, s), G.axis + 4);
        FS.k.text(f, c, s.toFixed(2), X(f, s), G.axis + 18, { size: 11, align: s === 0 ? "left" : s === 1 ? "right" : "center" });
      }
      FS.k.text(f, c, "flagged", R, G.axis - 6, { size: 11, align: "right" });
      // Dots: real problems filled, normal cases hollow. Mistakes in full ink, the rest quiet.
      const rad = f.w < 560 ? 2.6 : 3.1;
      for (const [rows, row, isReal] of [[real, G.rowA, true], [normal, G.rowB, false]]) {
        for (const d of rows) {
          const s = score(d, f.v.overlap);
          const wrong = isReal ? s < cut : s >= cut;
          const x = X(f, s);
          const y = dotY(d, row);
          c.globalAlpha = wrong ? 1 : 0.42;
          c.beginPath();
          c.arc(x, y, rad, 0, 7);
          if (isReal) { c.fillStyle = wrong ? C.fg : C.muted; c.fill(); }
          else { c.strokeStyle = wrong ? C.fg : C.muted; c.lineWidth = 1.2; c.stroke(); }
        }
      }
      c.globalAlpha = 1;
      // The line and its knob: thicker while hovered or held.
      const held = f.drag === "cut";
      const hot = held || f.handleHover === "cut" || f.hover === "cut";
      c.strokeStyle = C.accent;
      c.lineWidth = held ? 2.25 : hot ? 1.75 : 1.25;
      FS.k.line(c, lineX, G.top, lineX, G.bottom);
      const knob = held ? 7 : hot ? 6 : 4.5;
      c.fillStyle = C.surface;
      c.beginPath(); c.arc(lineX, G.knobY, knob + 2, 0, 7); c.fill();
      c.fillStyle = C.accent;
      c.beginPath(); c.arc(lineX, G.knobY, knob, 0, 7); c.fill();
      const text = `threshold ${cut.toFixed(2)}`;
      const right = lineX + 12 + 92 < R;
      FS.k.label(f, c, text, right ? lineX + 12 : lineX - 12, G.knobY, { align: right ? "left" : "right", color: C.accent, halo: C.surface });
    },
  });
})();

/* ================= 5. State machine driven by events (SVG) ================= */
(() => {
  const svg = document.getElementById("fig-state");
  const make = svgMaker(svg);
  const MOVE = 0.7;
  const TRIES = 3;
  const NAMES = { idle: "Idle", sending: "Sending", waiting: "Waiting", done: "Done", failed: "Failed" };
  const TIPS = {
    idle: "Nothing in flight yet.",
    sending: "The request is out and the client is waiting for a reply, with a timer running.",
    waiting: "A short pause before trying again, so a struggling server gets room to recover.",
    done: "A reply arrived. Reset to run it again.",
    failed: "Three tries used. The client stops and reports the error.",
  };
  // Each edge: from, to, the event that fires it, and the guard that must hold.
  const EDGES = {
    send: { from: "idle", to: "sending", label: "send" },
    reply: { from: "sending", to: "done", label: "reply arrives" },
    timeout: { from: "sending", to: "waiting", label: "timeout" },
    retry: { from: "waiting", to: "sending", label: "backoff ends", guard: "[tries left]" },
    giveup: { from: "waiting", to: "failed", label: "backoff ends", guard: "[3 tries used]" },
  };
  const edgeLayer = make("g");
  const edges = {};
  for (const [key, e] of Object.entries(EDGES)) {
    const g = make("g", {}, edgeLayer);
    edges[key] = {
      ...e,
      g,
      path: make("path", { fill: "none" }, g),
      head: make("path", {}, g),
      text: make("text", { "font-size": 11 }, g),
      guard: e.guard ? make("text", { "font-size": 11 }, g) : null,
      length: 1,
    };
    edges[key].text.textContent = e.label;
    if (e.guard) edges[key].guard.textContent = e.guard;
  }
  const states = {};
  for (const key of Object.keys(NAMES)) {
    const g = make("g", { tabindex: "0", "data-fs-tip-title": NAMES[key], "data-fs-tip": TIPS[key] });
    states[key] = { g, rect: make("rect", { rx: 18, height: 36 }, g), text: make("text", { "font-size": 13, "font-weight": 600, "text-anchor": "middle" }, g) };
    states[key].text.textContent = NAMES[key];
  }
  const histLabel = make("text", { "font-size": 11 });
  histLabel.textContent = "Recent";
  const hist = Array.from({ length: 5 }, () => {
    const g = make("g");
    return { g, rect: make("rect", { rx: 4, height: 22 }, g), text: make("text", { "font-size": 11, "text-anchor": "middle" }, g) };
  });
  const token = make("circle", { r: 5 });

  let L = null;
  function layout(w) {
    if (w >= 760) {
      const pw = 112;
      const y = 56;
      return {
        h: 228, pw,
        at: { idle: [w * 0.08, y], sending: [w * 0.37, y], waiting: [w * 0.64, y], failed: [w * 0.92 - 4, y], done: [w * 0.37, 186] },
        hist: { x: w * 0.56, y: 186, cw: Math.min(72, (w - (w * 0.56 + 52) - 8 - 24) / 5) },
        wide: true,
      };
    }
    const pw = Math.min(104, w * 0.31);
    const A = w * 0.27;
    const B = w * 0.73;
    return {
      h: 372, pw,
      at: { idle: [A, 30], sending: [A, 140], waiting: [B, 140], done: [A, 262], failed: [B, 262] },
      hist: { x: 8, y: 346, cw: (w - 16 - 4 * 6) / 5, labelAbove: true },
      wide: false,
    };
  }
  const box = (key) => { const [x, y] = L.at[key]; return { x: x - L.pw / 2, y: y - 18, w: L.pw, h: 36, cx: x, cy: y }; };
  function edgeGeometry(key) {
    const a = box(EDGES[key].from);
    const b = box(EDGES[key].to);
    const label = (x, y, anchor = "middle") => ({ x, y, anchor });
    if (L.wide) {
      switch (key) {
        case "send": return { d: `M${a.x + a.w},${a.cy} L${b.x},${b.cy}`, t: label((a.x + a.w + b.x) / 2, a.cy - 8) };
        case "timeout": return { d: `M${a.x + a.w},${a.cy - 6} L${b.x},${b.cy - 6}`, t: label((a.x + a.w + b.x) / 2, a.cy - 14) };
        case "retry": return { d: `M${a.x},${a.cy + 6} L${b.x + b.w},${b.cy + 6}`, t: label((a.x + b.x + b.w) / 2, a.cy + 24), g: label((a.x + b.x + b.w) / 2, a.cy + 38) };
        case "giveup": return { d: `M${a.x + a.w},${a.cy} L${b.x},${b.cy}`, t: label((a.x + a.w + b.x) / 2, a.cy - 8), g: label((a.x + a.w + b.x) / 2, a.cy + 18) };
        case "reply": return { d: `M${a.cx},${a.y + a.h} L${b.cx},${b.y}`, t: label(a.cx + 8, (a.y + a.h + b.y) / 2 + 4, "start") };
      }
    }
    switch (key) {
      case "send": return { d: `M${a.cx},${a.y + a.h} L${b.cx},${b.y}`, t: label(a.cx + 8, (a.y + a.h + b.y) / 2 + 4, "start") };
      case "timeout": return { d: `M${a.x + a.w},${a.cy - 7} L${b.x},${b.cy - 7}`, t: label((a.x + a.w + b.x) / 2, a.y - 6) };
      case "retry": return { d: `M${a.x},${a.cy + 7} L${b.x + b.w},${b.cy + 7}`, t: label((a.x + b.x + b.w) / 2, a.y + a.h + 16), g: label((a.x + b.x + b.w) / 2, a.y + a.h + 30) };
      case "giveup": return { d: `M${a.cx},${a.y + a.h} L${b.cx},${b.y}`, t: label(a.cx - 8, (a.y + a.h + b.y) / 2 + 12, "end"), g: label(a.cx - 8, (a.y + a.h + b.y) / 2 + 26, "end") };
      case "reply": return { d: `M${a.cx},${a.y + a.h} L${b.cx},${b.y}`, t: label(a.cx - 8, (a.y + a.h + b.y) / 2 + 4, "end") };
    }
    return null;
  }

  const m = { state: "idle", tries: 0, history: ["idle"], move: null };
  const script = [[0.6, "send"], [2.0, "timeout"], [3.4, "backoff"], [4.8, "reply"]];
  let scripted = true;
  let fig = null;

  function edgeFor(ev) {
    const s = m.state;
    if (ev === "send" && s === "idle") return "send";
    if (ev === "reply" && s === "sending") return "reply";
    if (ev === "timeout" && s === "sending") return "timeout";
    if (ev === "backoff" && s === "waiting") return m.tries < TRIES ? "retry" : "giveup";
    return null;
  }
  function finishMove() {
    if (!m.move) return;
    const e = EDGES[m.move.edge];
    m.state = e.to;
    if (e.to === "sending") m.tries += 1;
    m.history.push(e.to);
    m.move = null;
    sync();
  }
  function fire(ev, f) {
    if (ev === "reset") {
      m.move = null;
      Object.assign(m, { state: "idle", tries: 0, history: ["idle"] });
      sync();
      f.api.redraw();
      return;
    }
    finishMove();
    const key = edgeFor(ev);
    if (!key) return;
    m.move = { edge: key, t0: f.t };
    if (FS.reduced()) finishMove();
    else if (!f.api.playing) f.api.play();
    sync();
    f.api.redraw();
  }
  const buttons = [...svg.closest(".fs-plate").querySelectorAll(".event-row button")];
  function sync() {
    const s = m.state;
    const can = { send: s === "idle", reply: s === "sending", timeout: s === "sending", backoff: s === "waiting", reset: s !== "idle" || m.history.length > 1 };
    for (const b of buttons) b.disabled = !!m.move ? b.dataset.event !== "reset" : !can[b.dataset.event];
    const tries = m.tries ? ` · try ${m.tries} of ${TRIES}` : "";
    fig?.out("now", `${NAMES[s]}${s === "sending" || s === "waiting" ? tries : ""}`);
  }

  fig = FS.figure("fig-state", {
    height: (w) => layout(w).h,
    reserve: { now: ["Waiting · try 3 of 3"] },
    resize(f) {
      L = layout(f.w);
      svg.setAttribute("viewBox", `0 0 ${f.w} ${f.h}`);
      for (const [key, s] of Object.entries(states)) {
        const b = box(key);
        s.rect.setAttribute("x", b.x); s.rect.setAttribute("y", b.y); s.rect.setAttribute("width", b.w);
        s.text.setAttribute("x", b.cx); s.text.setAttribute("y", b.cy + 4.5);
      }
      for (const [key, e] of Object.entries(edges)) {
        const geo = edgeGeometry(key);
        e.path.setAttribute("d", geo.d);
        e.length = e.path.getTotalLength();
        const p1 = e.path.getPointAtLength(e.length);
        const p0 = e.path.getPointAtLength(Math.max(0, e.length - 2));
        const a = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        e.head.setAttribute("d", `M${p1.x},${p1.y} L${p1.x - 7 * Math.cos(a - 0.42)},${p1.y - 7 * Math.sin(a - 0.42)} L${p1.x - 7 * Math.cos(a + 0.42)},${p1.y - 7 * Math.sin(a + 0.42)} Z`);
        e.text.setAttribute("x", geo.t.x); e.text.setAttribute("y", geo.t.y); e.text.setAttribute("text-anchor", geo.t.anchor);
        if (e.guard) { e.guard.setAttribute("x", geo.g.x); e.guard.setAttribute("y", geo.g.y); e.guard.setAttribute("text-anchor", geo.g.anchor); }
      }
      const H = L.hist;
      histLabel.setAttribute("x", H.x);
      histLabel.setAttribute("y", H.labelAbove ? H.y - 18 : H.y + 4);
      const x0 = H.labelAbove ? H.x : H.x + 52;
      hist.forEach((c, i) => {
        c.rect.setAttribute("x", x0 + i * (H.cw + 6)); c.rect.setAttribute("y", H.y - 11); c.rect.setAttribute("width", H.cw);
        c.text.setAttribute("x", x0 + i * (H.cw + 6) + H.cw / 2); c.text.setAttribute("y", H.y + 4);
      });
    },
    update(f) {
      if (scripted) {
        const next = script.find(([t]) => t > (f.state.lastScript ?? -1) && f.t >= t);
        if (next) { f.state.lastScript = next[0]; finishMove(); const key = edgeFor(next[1]); if (key) m.move = { edge: key, t0: next[0] }; sync(); }
        if (f.t > script[script.length - 1][0] + MOVE + 0.1) scripted = false;
      }
      if (m.move && f.t - m.move.t0 >= MOVE) finishMove();
      if (!scripted && !m.move) f.api.pause();
    },
    render(f) {
      const C = f.C;
      const active = m.move?.edge;
      for (const [key, e] of Object.entries(edges)) {
        const on = key === active;
        const color = on ? C.accent : C.muted;
        e.path.setAttribute("stroke", color);
        e.path.setAttribute("stroke-width", on ? 1.75 : C.edge);
        e.head.setAttribute("fill", color);
        e.text.setAttribute("fill", on ? C.fg : C.muted);
        if (e.guard) e.guard.setAttribute("fill", on ? C.fg : C.muted);
      }
      for (const [key, s] of Object.entries(states)) {
        const current = key === m.state;
        const hovered = f.hover === key;
        s.rect.setAttribute("fill", current ? C.fg : C.surface);
        s.rect.setAttribute("stroke", hovered ? C.accent : current ? C.fg : C.lineStrong);
        s.rect.setAttribute("stroke-width", hovered ? 1.5 : 1);
        s.text.setAttribute("fill", current ? C.surface : C.fg);
      }
      const recent = m.history.slice(-5);
      histLabel.setAttribute("fill", C.muted);
      hist.forEach((c, i) => {
        const name = recent[i];
        c.rect.setAttribute("fill", name && i === recent.length - 1 ? C.surface2 : "none");
        c.rect.setAttribute("stroke", name ? C.lineStrong : C.line);
        c.rect.setAttribute("stroke-dasharray", name ? "none" : "2 3");
        c.text.textContent = name ? NAMES[name] : "";
        c.text.setAttribute("fill", i === recent.length - 1 ? C.fg : C.muted);
      });
      if (m.move) {
        const e = edges[m.move.edge];
        const u = FS.ease.inOut(FS.clamp((f.t - m.move.t0) / MOVE));
        const p = e.path.getPointAtLength(u * e.length);
        token.setAttribute("cx", p.x.toFixed(1));
        token.setAttribute("cy", p.y.toFixed(1));
        token.setAttribute("opacity", 1);
      } else token.setAttribute("opacity", 0);
      token.setAttribute("fill", C.accent);
    },
  });
  for (const [key, s] of Object.entries(states)) {
    s.g.addEventListener("pointerenter", () => fig.hover(key));
    s.g.addEventListener("pointerleave", () => fig.hover(null));
  }
  for (const b of buttons) b.addEventListener("click", () => { scripted = false; fire(b.dataset.event, { t: fig.t, api: fig }); });
  sync();
})();

/* ================= 6. Sequence diagram with a draggable playhead (SVG) ================= */
(() => {
  const svg = document.getElementById("fig-seq");
  const make = svgMaker(svg);
  const PEOPLE = [
    { name: "Browser", tip: "The page that wants the profile." },
    { name: "API", tip: "Answers the browser. Checks the cache before doing real work." },
    { name: "Cache", tip: "Fast memory for recent answers. Empty for this profile, this time." },
    { name: "Database", tip: "The source of truth. Accurate, but the slowest stop." },
  ];
  const DRAW = 0.5;
  const DURATION = 8;
  const MSGS = [
    { from: 0, to: 1, label: "GET /profile", t: 0.4, row: 0, tip: "The browser asks for the signed-in user's profile." },
    { from: 1, to: 2, label: "lookup", t: 1.2, row: 1, tip: "Is a recent copy of this profile in the cache?" },
    { from: 2, to: 1, label: "miss", t: 2.0, row: 2, reply: true, tip: "No copy. The API has to ask the database." },
    { from: 1, to: 3, label: "query", t: 2.8, row: 3, tip: "One SELECT by user id." },
    { from: 3, to: 1, label: "1 row", t: 5.4, row: 6, reply: true, tip: "The profile, 30 ms later. Most of the request's time went here." },
    { from: 1, to: 2, label: "save, 60 s", t: 6.2, row: 7, tip: "Keep a copy for a minute, so the next request is a hit." },
    { from: 1, to: 0, label: "200 OK", t: 7.0, row: 8, reply: true, tip: "The profile goes back to the browser, 44 ms after it asked." },
  ];
  // Request time in ms at figure times, for the readout.
  const MS = [[0, 0], [0.4, 0], [1.2, 4], [2.0, 6], [2.8, 8], [5.4, 38], [6.2, 40], [7.0, 42], [7.5, 44], [8, 44]];
  const msAt = (t) => { for (let i = 1; i < MS.length; i++) if (t <= MS[i][0]) return FS.lerp(MS[i - 1][1], MS[i][1], (t - MS[i - 1][0]) / (MS[i][0] - MS[i - 1][0] || 1)); return 44; };
  // Bars: who is busy when. API waits (hatched) while the database works.
  const BARS = [
    { who: 1, t0: 0.4 + DRAW, t1: 7.0, waitFrom: 2.8 + DRAW, waitTo: 5.4 },
    { who: 2, t0: 1.2 + DRAW, t1: 2.0 },
    { who: 3, t0: 2.8 + DRAW, t1: 5.4 },
    { who: 2, t0: 6.2 + DRAW, t1: 6.6 },
  ];

  // A hatch pattern for waiting time, colored per theme in render.
  const defs = make("defs");
  const pattern = make("pattern", { id: "seq-hatch", width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  const hatchBg = make("rect", { width: 5, height: 5 }, pattern);
  const hatchLine = make("line", { x1: 0, y1: 0, x2: 0, y2: 5, "stroke-width": 1.4 }, pattern);
  svg.prepend(defs);
  const lifeLayer = make("g");
  const barLayer = make("g");
  const msgLayer = make("g");
  const heads = PEOPLE.map((p) => {
    const g = make("g", { tabindex: "0", "data-fs-tip-title": p.name, "data-fs-tip": p.tip });
    const rect = make("rect", { rx: 6, height: 30 }, g);
    const text = make("text", { "font-size": 12, "font-weight": 600, "text-anchor": "middle" }, g);
    text.textContent = p.name;
    return { g, rect, text, line: make("line", { "stroke-dasharray": "2 4" }, lifeLayer) };
  });
  const bars = BARS.map(() => ({ ghost: make("rect", { width: 8 }, barLayer), fill: make("rect", { width: 8 }, barLayer), wait: make("rect", { width: 8 }, barLayer) }));
  const msgs = MSGS.map((m) => ({ ...m, line: make("line", {}, msgLayer), head: make("path", {}, msgLayer), text: make("text", { "font-size": 11, "text-anchor": "middle" }, msgLayer) }));
  msgs.forEach((m) => { m.text.textContent = m.label; });
  const bracket = make("path", { fill: "none" });
  const bracketText = make("text", { "font-size": 11, "text-anchor": "end" });
  bracketText.textContent = "30 ms";
  const playLine = make("line", { "stroke-dasharray": "3 3" });
  const knob = make("circle", { r: 4.5 });

  let L = null;
  const ROWS = 9;
  function layout(w) {
    const pad = 4;
    const col = (w - 2 * pad - 16) / 4;
    return {
      h: 352, xs: PEOPLE.map((_, i) => pad + 16 + col * (i + 0.5)), boxW: Math.min(108, col - 10),
      y0: 72, rowH: 30, knobX: 10,
    };
  }
  const rowY = (row) => L.y0 + row * L.rowH;
  // The playhead's height for a time, through each message's row.
  const KEYS = () => [[0, L.y0 - 22], ...MSGS.map((m) => [m.t, rowY(m.row)]), [7.5, rowY(ROWS - 1) + 14], [DURATION, rowY(ROWS - 1) + 22]];
  const yAt = (t) => { const k = KEYS(); for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return FS.lerp(k[i - 1][1], k[i][1], (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])); return k[k.length - 1][1]; };
  const tAt = (y) => { const k = KEYS(); if (y <= k[0][1]) return 0; for (let i = 1; i < k.length; i++) if (y <= k[i][1]) return FS.lerp(k[i - 1][0], k[i][0], (y - k[i - 1][1]) / (k[i][1] - k[i - 1][1] || 1)); return DURATION; };
  const progress = (m, t) => FS.clamp((t - m.t) / DRAW);

  const tips = Object.fromEntries(MSGS.map((m, i) => [`m${i}`, { title: m.label, body: m.tip }]));
  FS.figure("fig-seq", {
    height: (w) => layout(w).h,
    duration: DURATION,
    chapters: MSGS.map((m) => ({ t: m.t + DRAW, label: m.label })),
    formatTime: (t) => `${Math.round(msAt(t))} ms`,
    tips,
    tipAt(f, x, y) {
      for (let i = 0; i < msgs.length; i++) {
        const m = msgs[i];
        const a = L.xs[m.from];
        const b = L.xs[m.to];
        if (Math.abs(y - (rowY(m.row) - 6)) < 12 && x >= Math.min(a, b) - 4 && x <= Math.max(a, b) + 4) return { key: `m${i}`, x: (a + b) / 2, y: rowY(m.row) - 14 };
      }
      return null;
    },
    handles: {
      playhead: {
        label: "Playhead: drag up or down, or use the arrow keys",
        radius: 16,
        get: (f) => ({ x: L.knobX, y: yAt(f.t) }),
        set: (f, x, y, phase) => {
          if (phase === "settle") return;
          f.api.pause();
          f.api.seek(tAt(y), { animate: true, smooth: phase === "drag" ? 0.07 : 0.2 });
        },
        bounds: () => ({ x0: L.knobX, y0: yAt(0), x1: L.knobX, y1: yAt(DURATION) }),
        release: (f) => ({ x: L.knobX, y: yAt(f.api.state().t) }),
        step: 15,
      },
    },
    resize(f) {
      L = layout(f.w);
      svg.setAttribute("viewBox", `0 0 ${f.w} ${f.h}`);
      heads.forEach((h, i) => {
        const x = L.xs[i];
        h.rect.setAttribute("x", x - L.boxW / 2); h.rect.setAttribute("y", 8); h.rect.setAttribute("width", L.boxW);
        h.text.setAttribute("x", x); h.text.setAttribute("y", 27);
        h.line.setAttribute("x1", x); h.line.setAttribute("x2", x);
        h.line.setAttribute("y1", 38); h.line.setAttribute("y2", f.h - 6);
      });
    },
    render(f) {
      const C = f.C;
      const t = f.t;
      heads.forEach((h, i) => {
        h.rect.setAttribute("fill", C.surface);
        h.rect.setAttribute("stroke", f.hover === `p${i}` ? C.accent : C.lineStrong);
        h.text.setAttribute("fill", C.fg);
        h.line.setAttribute("stroke", C.lineStrong);
      });
      BARS.forEach((b, i) => {
        const x = L.xs[b.who] - 4;
        const y0 = yAt(b.t0);
        const y1 = yAt(b.t1);
        const now = yAt(FS.clamp(t, b.t0, b.t1));
        const el = bars[i];
        el.ghost.setAttribute("x", x); el.ghost.setAttribute("y", y0); el.ghost.setAttribute("height", Math.max(0, y1 - y0));
        el.ghost.setAttribute("fill", "none"); el.ghost.setAttribute("stroke", C.line);
        el.fill.setAttribute("x", x); el.fill.setAttribute("y", y0); el.fill.setAttribute("height", Math.max(0, now - y0));
        el.fill.setAttribute("fill", b.who === 3 ? C.fg : C.lineStrong);
        el.fill.setAttribute("opacity", t > b.t0 ? 1 : 0);
        if (b.waitFrom) {
          const w0 = yAt(b.waitFrom);
          const w1 = yAt(FS.clamp(t, b.waitFrom, b.waitTo));
          el.wait.setAttribute("x", x); el.wait.setAttribute("y", w0); el.wait.setAttribute("height", Math.max(0, w1 - w0));
          el.wait.setAttribute("fill", "url(#seq-hatch)");
          el.wait.setAttribute("opacity", t > b.waitFrom ? 1 : 0);
        } else el.wait.setAttribute("height", 0);
      });
      hatchLine.setAttribute("stroke", C.muted);
      hatchBg.setAttribute("fill", C.surface);
      msgs.forEach((m, i) => {
        const p = progress(m, t);
        const a = L.xs[m.from];
        const b = L.xs[m.to];
        const dir = Math.sign(b - a);
        const y = rowY(m.row);
        const xa = a + dir * (m.from === 1 || m.from === 2 || m.from === 3 ? 4 : 0);
        const xb = b - dir * (m.to === 1 || m.to === 2 || m.to === 3 ? 4 : 0);
        const tip = FS.lerp(xa, xb, p);
        const live = p > 0 && p < 1;
        const hot = live || f.hover === `m${i}`;
        const color = hot ? C.accent : p > 0 ? C.fg : C.faint;
        const ghost = p === 0;
        m.line.setAttribute("x1", xa); m.line.setAttribute("y1", y);
        m.line.setAttribute("x2", ghost ? xb : tip); m.line.setAttribute("y2", y);
        m.line.setAttribute("stroke", color);
        m.line.setAttribute("stroke-width", hot ? 1.5 : 1.1);
        m.line.setAttribute("stroke-dasharray", m.reply ? "4 3" : "none");
        m.line.setAttribute("opacity", ghost ? 0.5 : 1);
        const hx = ghost ? xb : tip;
        m.head.setAttribute("d", `M${hx},${y} L${hx - dir * 7},${y - 3.5} L${hx - dir * 7},${y + 3.5} Z`);
        m.head.setAttribute("fill", color);
        m.head.setAttribute("opacity", ghost ? 0.5 : 1);
        m.text.setAttribute("x", (xa + xb) / 2); m.text.setAttribute("y", y - 7);
        m.text.setAttribute("fill", hot ? C.fg : p > 0 ? C.fg : C.muted);
        m.text.setAttribute("opacity", ghost ? 0.6 : 1);
        m.text.setAttribute("paint-order", "stroke");
        m.text.setAttribute("stroke", C.surface);
        m.text.setAttribute("stroke-width", 4);
        m.text.setAttribute("stroke-linejoin", "round");
      });
      // The database's 30 ms, measured beside its bar once the row comes back.
      const db = L.xs[3] - 12;
      const y3 = rowY(3) + 4;
      const y6 = rowY(6) - 4;
      const show = FS.window(t, 5.4, 5.9);
      bracket.setAttribute("d", `M${db + 4},${y3} H${db} V${y6} H${db + 4}`);
      bracket.setAttribute("stroke", C.fg);
      bracket.setAttribute("opacity", show);
      bracketText.setAttribute("x", db - 6); bracketText.setAttribute("y", (y3 + y6) / 2 + 4);
      bracketText.setAttribute("fill", C.fg);
      bracketText.setAttribute("opacity", show);
      // Playhead across the lifelines, knob on the left.
      const py = yAt(t);
      const held = f.drag === "playhead";
      const hot = held || f.handleHover === "playhead";
      playLine.setAttribute("x1", L.knobX); playLine.setAttribute("x2", f.w - 4);
      playLine.setAttribute("y1", py); playLine.setAttribute("y2", py);
      playLine.setAttribute("stroke", C.strong);
      playLine.setAttribute("stroke-width", held ? 1.5 : 1);
      playLine.setAttribute("opacity", 0.55);
      knob.setAttribute("cx", L.knobX); knob.setAttribute("cy", py);
      knob.setAttribute("r", held ? 7 : hot ? 6 : 4.5);
      knob.setAttribute("fill", C.accent);
      knob.setAttribute("stroke", C.surface);
      knob.setAttribute("stroke-width", 2);
    },
  });
  heads.forEach((h, i) => {
    h.g.addEventListener("pointerenter", () => FS.get("fig-seq").hover(`p${i}`));
    h.g.addEventListener("pointerleave", () => FS.get("fig-seq").hover(null));
  });
  FS.get("fig-seq").redraw();
})();

/* ================= 7. Particle field with a draggable, resizable focus (canvas) ================= */
(() => {
  const r = FS.rng(7);
  const COUNT = 900;
  const psi = (x, y, t, k) => Math.sin(x * 2.1 * k + t * 0.21) * Math.cos(y * 1.7 * k - t * 0.17) + 0.5 * Math.sin((x + y) * 3.3 * k + t * 0.29);
  const curl = (x, y, t, k, e = 0.002) => [(psi(x, y + e, t, k) - psi(x, y - e, t, k)) / (2 * e), -(psi(x + e, y, t, k) - psi(x - e, y, t, k)) / (2 * e)];
  const P = Array.from({ length: COUNT }, () => { const x = r() * 2; const y = r(); return { x, y, px: x, py: y, age: r() * 6 }; });
  // The focus lives in field units (x 0..2, y 0..1); handles convert to figure pixels.
  const focus = { x: 1.35, y: 0.5, r: 0.3 };
  const R_MIN = 0.1;
  const R_MAX = 0.45;
  const DIAG = Math.SQRT1_2;
  const unit = (f) => f.w / 2;
  let inside = 0;
  FS.figure("fig-field", {
    height: (w) => Math.round(w / 2),
    settle: 3,
    params: {
      strength: { value: 1, min: 0, max: 2, step: 0.05, label: "Strength", format: (v) => `${v.toFixed(2)}×` },
      scale: { value: 1, min: 0.5, max: 2.5, step: 0.05, label: "Field scale", format: (v) => `${v.toFixed(2)}×` },
    },
    reserve: { recruited: ["900 of 900 particles inside the ring"] },
    handles: {
      center: {
        label: "Focus: drag or use arrow keys to move it",
        radius: (f) => focus.r * unit(f),
        get: (f) => ({ x: focus.x * unit(f), y: focus.y * unit(f) }),
        set: (f, x, y) => { focus.x = x / unit(f); focus.y = y / unit(f); },
        bounds: (f) => ({ x0: 0, y0: 0, x1: f.w, y1: f.h }),
        step: 12,
      },
      edge: {
        label: "Focus radius: drag or use arrow keys to resize",
        radius: 14,
        get: (f) => ({ x: (focus.x + focus.r * DIAG) * unit(f), y: (focus.y - focus.r * DIAG) * unit(f) }),
        set: (f, x, y) => { focus.r = FS.rubber(Math.hypot(x / unit(f) - focus.x, y / unit(f) - focus.y), R_MIN, R_MAX, 0.08); },
        bounds: () => null,
        release: (f) => { const rr = FS.clamp(focus.r, R_MIN, R_MAX); return { x: (focus.x + rr * DIAG) * unit(f), y: (focus.y - rr * DIAG) * unit(f) }; },
        step: 6,
      },
    },
    update(f, dt) {
      const strength = f.v.strength;
      const k = f.v.scale;
      const r2 = focus.r * focus.r;
      inside = 0;
      for (const p of P) {
        const [vx, vy] = curl(p.x, p.y, f.t, k);
        const dx = focus.x - p.x;
        const dy = focus.y - p.y;
        const d2 = dx * dx + dy * dy;
        const pull = d2 < r2 ? strength * (1 - d2 / r2) * 1.6 : 0;
        if (d2 < r2) inside++;
        p.px = p.x; p.py = p.y;
        p.x += ((vx * 0.09) / k + dx * pull * 0.6) * dt;
        p.y += ((vy * 0.09) / k + dy * pull * 0.6) * dt;
        p.age += dt;
        if (p.x < 0 || p.x > 2 || p.y < 0 || p.y > 1 || p.age > 7) { p.x = p.px = r() * 2; p.y = p.py = r(); p.age = 0; }
      }
      f.api.out("recruited", `${inside} of ${COUNT} particles inside the ring`);
    },
    render(f, c) {
      const C = f.C;
      const s = unit(f);
      const r2 = focus.r * focus.r;
      const active = f.drag !== null || f.handleHover !== null;
      c.lineCap = "round";
      c.strokeStyle = C.fg;
      for (const pass of [0, 1]) {
        c.beginPath();
        for (const p of P) {
          const near = (p.x - focus.x) ** 2 + (p.y - focus.y) ** 2 < r2;
          if ((pass === 1) !== near) continue;
          if (Math.min(p.age * 2, (7 - p.age) * 2) <= 0.05) continue;
          c.moveTo((p.x - (p.x - p.px) * 6) * s, (p.y - (p.y - p.py) * 6) * s);
          c.lineTo(p.x * s, p.y * s);
        }
        c.globalAlpha = pass ? 0.95 : 0.4;
        c.lineWidth = pass ? 1.6 : 1.1;
        c.stroke();
      }
      c.globalAlpha = 1;
      const cx = focus.x * s;
      const cy = focus.y * s;
      const rr = focus.r * s;
      c.strokeStyle = C.accent;
      c.lineWidth = f.drag === "center" ? 2.25 : active ? 1.75 : 1.25;
      c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.stroke();
      if (f.drag === "edge") { c.setLineDash([3, 3]); c.globalAlpha = 0.6; FS.k.line(c, cx, cy, cx + rr * DIAG, cy - rr * DIAG); c.setLineDash([]); c.globalAlpha = 1; }
      const knob = f.drag === "edge" ? 7 : f.handleHover === "edge" ? 6 : 4.5;
      c.fillStyle = C.surface; c.beginPath(); c.arc(cx + rr * DIAG, cy - rr * DIAG, knob + 2, 0, 7); c.fill();
      c.fillStyle = C.accent; c.beginPath(); c.arc(cx + rr * DIAG, cy - rr * DIAG, knob, 0, 7); c.fill();
      const ly = cy - rr - 12 < 10 ? cy + rr + 14 : cy - rr - 12;
      FS.k.label(f, c, f.drag === "edge" ? `radius ${focus.r.toFixed(2)}` : "focus", cx, ly, { align: "center", color: C.accent });
    },
  });
})();
