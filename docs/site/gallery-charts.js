/* Gallery, data charts: bar, line, scatter. Synthetic, seeded, laid out in CSS pixels. */
(() => {
  const { dot, K } = GK;
  const NARROW = 560;

  /* ---------- Bar: a target line you can drag ---------- */
  {
    const REGIONS = ["North", "South", "East", "West", "Central", "Coast", "Islands"];
    const DATA = { now: [64, 48, 81, 55, 72, 39, 58], last: [58, 52, 70, 61, 60, 44, 41] };
    let target = 56;
    let L = null;
    function layout(w) {
      const narrow = w < NARROW;
      return { narrow, h: narrow ? 300 : 280, x0: narrow ? 30 : 40, x1: w - (narrow ? 4 : 60), top: 18, bottom: narrow ? 300 - 40 : 280 - 36 };
    }
    const MAX = 100;
    const Y = (v) => L.bottom - ((L.bottom - L.top) * v) / MAX;
    const misses = (vals) => vals.filter((v) => v < target).length;
    const report = (f) => {
      const vals = DATA[f.params.year];
      f.api.out("miss", `${misses(vals)} of ${REGIONS.length}`);
      f.api.out("target", `${Math.round(target)}k`);
    };
    FS.figure("fig-bar", {
      height: (w) => layout(w).h,
      duration: 0.9,
      params: {
        year: { value: "now", label: "Year", placement: "inline", options: [{ value: "now", label: "This year" }, { value: "last", label: "Last year" }] },
        ...Object.fromEntries(REGIONS.map((_, i) => [`v${i}`, { value: DATA.now[i], min: 0, max: MAX, hidden: true }])),
      },
      handles: {
        target: {
          label: "Target",
          description: "Drag the target line up or down.",
          radius: 14,
          step: 6,
          get: () => ({ x: L.x1 - 14, y: Y(target) }),
          bounds: () => ({ x0: L.x1 - 14, x1: L.x1 - 14, y0: Y(95), y1: Y(10) }),
          set: (f, x, y) => { target = FS.clamp(((L.bottom - y) / (L.bottom - L.top)) * MAX, 10, 95); report(f); f.api.redraw(); },
        },
      },
      reserve: { miss: ["7 of 7"], target: ["95k"] },
      tips: { miss: { title: "Missed", body: "Hatched bars are below the target line." } },
      tipAt: (f, x, y) => {
        const bw = (L.x1 - L.x0) / REGIONS.length;
        const i = Math.floor((x - L.x0) / bw);
        return i >= 0 && i < REGIONS.length && f.v[`v${i}`] < target && y > Y(f.v[`v${i}`]) && y < L.bottom ? "miss" : null;
      },
      init: report,
      onParam(f, name, value) {
        if (name === "year") { DATA[value].forEach((v, i) => f.api.set(`v${i}`, v)); report(f); }
      },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        // Bars grow once on entry, from zero.
        const grow = FS.ease.out(FS.clamp(f.t / 0.9));
        for (const v of [0, 25, 50, 75, 100]) {
          c.fillStyle = C.line;
          c.fillRect(L.x0, Y(v), L.x1 - L.x0, 1);
          K.text(f, c, `${v}k`, L.x0 - 6, Y(v) + 4, { size: 11, align: "right" });
        }
        const bw = (L.x1 - L.x0) / REGIONS.length;
        REGIONS.forEach((name, i) => {
          const v = f.v[`v${i}`] * grow;
          const x = L.x0 + i * bw + bw * 0.18;
          const w = bw * 0.64;
          const miss = f.v[`v${i}`] < target;
          c.fillStyle = miss ? FS.k.hatch(f, c, C.muted, 5) : C.fg;
          c.fillRect(x, Y(v), w, L.bottom - Y(v));
          if (miss) { c.strokeStyle = C.muted; c.strokeRect(x + 0.5, Y(v) + 0.5, w - 1, L.bottom - Y(v) - 1); }
          K.text(f, c, name, x + w / 2, L.bottom + 16, { size: 11, align: "center", color: miss ? C.muted : C.fg });
        });
        const held = f.drag === "target" || f.handleHover === "target";
        c.fillStyle = C.accent;
        c.fillRect(L.x0, Y(target) - (held ? 1 : 0.5), L.x1 - L.x0, held ? 2 : 1.5);
        dot(c, [L.x1 - 14, Y(target)], held ? 7 : 5.5, C.accent);
        if (!L.narrow) K.label(f, c, `target ${Math.round(target)}k`, L.x1 + 4, Y(target), { size: 11, color: C.accent });
      },
    });
  }

  /* ---------- Line: a playhead reveals the trend; one series emphasized ---------- */
  {
    const r = FS.rng(7);
    const WEEKS = 26;
    const CHANGE = 12;
    const now = Array.from({ length: WEEKS }, (_, i) => Math.round((i < CHANGE ? 380 + i * 4 : 700 + (i - CHANGE) * 14) + (r() - 0.5) * 70));
    const last = Array.from({ length: WEEKS }, (_, i) => Math.round(360 + i * 6 + (r() - 0.5) * 60));
    const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    const before = avg(now.slice(0, CHANGE));
    const after = avg(now.slice(CHANGE));
    const DUR = 6;
    let L = null;
    function layout(w) {
      const narrow = w < NARROW;
      return { narrow, h: narrow ? 280 : 280, x0: narrow ? 36 : 44, x1: w - (narrow ? 56 : 84), top: 18, bottom: 280 - 36 };
    }
    const MAX = 1000;
    const X = (i) => L.x0 + ((L.x1 - L.x0) * i) / (WEEKS - 1);
    const Y = (v) => L.bottom - ((L.bottom - L.top) * v) / MAX;
    const weekAt = (t) => (FS.clamp(t / DUR) * (WEEKS - 1));
    FS.figure("fig-line", {
      height: (w) => layout(w).h,
      duration: DUR,
      chapters: [{ t: (CHANGE / (WEEKS - 1)) * DUR, label: "Price change" }],
      formatTime: (t) => `week ${Math.round(weekAt(t)) + 1}`,
      timeAxis: () => ({ x0: L.x0, x1: L.x1 }),
      tips: { change: { title: "Price change", body: "The cheaper plan launched at the start of week 13." } },
      tipAt: (f, x) => (Math.abs(x - X(CHANGE)) < 8 ? "change" : null),
      init(f) {
        f.api.out("before", `${Math.round(before)}`);
        f.api.out("after", `${Math.round(after)}`);
        f.api.out("ratio", `${(after / before).toFixed(1)}×`);
      },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        for (const v of [0, 250, 500, 750, 1000]) {
          c.fillStyle = C.line;
          c.fillRect(L.x0, Y(v), L.x1 - L.x0, 1);
          K.text(f, c, String(v), L.x0 - 6, Y(v) + 4, { size: 11, align: "right" });
        }
        for (const wk of [1, 13, 26]) K.text(f, c, `week ${wk}`, X(wk - 1), L.bottom + 18, { size: 11, align: wk === 1 ? "left" : wk === 26 ? "right" : "center" });
        c.fillStyle = f.hover === "change" ? C.accent : C.lineStrong;
        c.fillRect(X(CHANGE), L.top, 1, L.bottom - L.top);
        K.label(f, c, "price change", X(CHANGE) + 6, L.top + 8, { size: 11, color: C.muted, weight: 400 });
        const upto = weekAt(f.t);
        const draw = (data, color, width) => {
          c.strokeStyle = color;
          c.lineWidth = width;
          c.lineJoin = "round";
          c.beginPath();
          const lo = Math.floor(upto);
          for (let i = 0; i <= lo; i++) (i ? c.lineTo(X(i), Y(data[i])) : c.moveTo(X(i), Y(data[i])));
          if (lo < WEEKS - 1) c.lineTo(X(upto), Y(FS.lerp(data[lo], data[lo + 1], upto - lo)));
          c.stroke();
          return [X(upto), Y(FS.lerp(data[lo], data[Math.min(WEEKS - 1, lo + 1)], upto - lo))];
        };
        const pl = draw(last, C.muted, 1.25);
        const pn = draw(now, C.fg, C.series);
        // Direct labels at the line ends, kept apart.
        let yn = pn[1];
        let yl = pl[1];
        if (Math.abs(yn - yl) < 14) { if (yn < yl) yl = yn + 14; else yn = yl + 14; }
        K.label(f, c, "this year", pn[0] + 8, yn, { size: 11, weight: 600 });
        K.label(f, c, "last year", pl[0] + 8, yl, { size: 11, color: C.muted, weight: 400 });
        // Hover: the value at the week under the pointer.
        if (f.hoverT != null && !f.drag) {
          const i = Math.round(weekAt(f.hoverT));
          dot(c, [X(i), Y(now[i])], 4, C.accent);
          K.label(f, c, `week ${i + 1}: ${now[i]}`, X(i), Y(now[i]) - 14, { size: 11, align: "center", color: C.fg });
        }
        FS.k.hoverTime(f, c, L.top, L.bottom, (t) => X(weekAt(t)), () => "");
        if (f.t < DUR - 1e-3 || f.drag) FS.k.playhead(f, c, X(upto), L.top, L.bottom);
      },
    });
  }

  /* ---------- Scatter: one outlier tilts the fit ---------- */
  {
    const r = FS.rng(21);
    const PTS = Array.from({ length: 24 }, () => {
      const x = 0.08 + r() * 0.8;
      return [x, FS.clamp(0.18 + 0.42 * x + (r() - 0.5) * 0.16, 0.02, 0.98)];
    });
    const out = [0.9, 0.86];
    function fit(points) {
      const n = points.length;
      const mx = points.reduce((s, p) => s + p[0], 0) / n;
      const my = points.reduce((s, p) => s + p[1], 0) / n;
      let sxy = 0;
      let sxx = 0;
      for (const [x, y] of points) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
      const m = sxy / sxx;
      return { m, b: my - m * mx };
    }
    const base = fit(PTS);
    let L = null;
    function layout(w) {
      const narrow = w < NARROW;
      const s = narrow ? w - 40 : Math.min(w - 200, 560);
      return { narrow, h: Math.min(320, s * 0.62) + 50, x0: 36, x1: 36 + s, top: 12, bottom: 12 + Math.min(320, s * 0.62) };
    }
    const X = (v) => L.x0 + (L.x1 - L.x0) * v;
    const Y = (v) => L.bottom - (L.bottom - L.top) * v;
    const report = (f) => {
      const g = fit([...PTS, out]);
      f.api.out("base", base.m.toFixed(2));
      f.api.out("slope", g.m.toFixed(2));
    };
    FS.figure("fig-scatter", {
      height: (w) => layout(w).h,
      handles: {
        outlier: {
          label: "Outlier",
          description: "Drag the hollow point anywhere to see how far one point moves the fitted line.",
          radius: 14,
          step: 10,
          get: () => ({ x: X(out[0]), y: Y(out[1]) }),
          bounds: () => ({ x0: X(0), y0: Y(1), x1: X(1), y1: Y(0) }),
          set: (f, x, y) => { out[0] = FS.clamp((x - L.x0) / (L.x1 - L.x0)); out[1] = FS.clamp((L.bottom - y) / (L.bottom - L.top)); report(f); f.api.redraw(); },
          release: () => null,
        },
      },
      reserve: { slope: ["-0.00"], base: ["0.00"] },
      tips: { fit: { title: "Least-squares fit", body: "The line that minimizes the squared vertical distances. One far point pulls it hard." } },
      tipAt: (f, x, y) => {
        const g = f.state.fit;
        return g && Math.abs(Y(g.m * ((x - L.x0) / (L.x1 - L.x0)) + g.b) - y) < 6 ? "fit" : null;
      },
      init: report,
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        for (const v of [0, 0.5, 1]) {
          c.fillStyle = C.line;
          c.fillRect(L.x0, Y(v), L.x1 - L.x0, 1);
        }
        K.text(f, c, "hours of practice →", L.x1, L.bottom + 20, { size: 11, align: "right" });
        K.text(f, c, "score ↑", L.x0, L.top + 10, { size: 11 });
        const g = fit([...PTS, out]);
        f.state.fit = g;
        // The fit without the outlier stays as a faint reference.
        c.save();
        c.setLineDash([3, 4]);
        c.strokeStyle = C.muted;
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(X(0), Y(base.b)); c.lineTo(X(1), Y(base.m + base.b)); c.stroke();
        c.restore();
        c.save();
        c.beginPath(); c.rect(L.x0, L.top, L.x1 - L.x0, L.bottom - L.top); c.clip();
        c.strokeStyle = C.accent;
        c.lineWidth = f.hover === "fit" ? 2.25 : 1.75;
        c.beginPath(); c.moveTo(X(0), Y(g.b)); c.lineTo(X(1), Y(g.m + g.b)); c.stroke();
        c.restore();
        for (const p of PTS) dot(c, [X(p[0]), Y(p[1])], 3.5, C.fg, 0.75);
        const held = f.drag === "outlier" || f.handleHover === "outlier";
        c.strokeStyle = C.accent;
        c.lineWidth = 2;
        c.beginPath(); c.arc(X(out[0]), Y(out[1]), held ? 7 : 5.5, 0, Math.PI * 2); c.stroke();
        // The slope, written on the plot.
        const lx = Math.min(X(0.98), L.x1 - 4);
        K.label(f, c, `slope ${g.m.toFixed(2)}`, lx, Y(g.m * 0.98 + g.b) - 12, { size: 11, align: "right", color: C.accent, weight: 600 });
        K.label(f, c, `without it ${base.m.toFixed(2)}`, lx, Y(base.m * 0.98 + base.b) + 14, { size: 11, align: "right", color: C.muted, weight: 400 });
      },
    });
  }
})();
