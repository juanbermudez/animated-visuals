/* Gallery, flow and time types: flowchart, swimlane, DP integration, loop / flywheel, Gantt.
   Synthetic, seeded, laid out in CSS pixels; everything drawn from FS state. */
(() => {
  const { box, edge, at, dot, packets, link, hit, K } = GK;
  const NARROW = 560;

  /* ---------- Flowchart: a refund request takes the branch its inputs choose ---------- */
  {
    const DUR = 4.4;
    let L = null;
    function diamond(f, c, b, text, o = {}) {
      const C = f.C;
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      c.save();
      c.globalAlpha *= o.alpha ?? 1;
      c.beginPath();
      c.moveTo(cx, b.y); c.lineTo(b.x + b.w, cy); c.lineTo(cx, b.y + b.h); c.lineTo(b.x, cy); c.closePath();
      c.fillStyle = C.surface;
      c.fill();
      c.strokeStyle = o.lit ? C.accent : o.active ? C.fg : C.lineStrong;
      c.lineWidth = o.lit ? 1.5 : 1;
      c.stroke();
      K.text(f, c, text, cx, cy + 4, { size: 12, weight: 600, color: C.fg, align: "center" });
      c.restore();
    }
    function layout(w) {
      if (w >= NARROW) {
        const bw = Math.min(130, w * 0.15);
        const dw = Math.min(150, w * 0.18);
        const cy = 70;
        const d1x = bw + (w - 2 * bw - 2 * dw) / 3;
        const d2x = d1x + dw + (w - 2 * bw - 2 * dw) / 3;
        return {
          h: 230,
          n: {
            start: { x: 1, y: cy - 22, w: bw, h: 44 },
            d1: { x: d1x, y: cy - 34, w: dw, h: 68, d: true },
            d2: { x: d2x, y: cy - 34, w: dw, h: 68, d: true },
            refund: { x: w - bw - 1, y: cy - 22, w: bw, h: 44 },
            support: { x: d1x + dw / 2 - bw / 2, y: 170, w: bw, h: 44 },
            manager: { x: d2x + dw / 2 - bw / 2, y: 170, w: bw, h: 44 },
          },
        };
      }
      const bw = Math.min(150, w * 0.42);
      const dw = Math.min(170, w * 0.5);
      const lx = 8;
      return {
        h: 430,
        n: {
          start: { x: lx, y: 8, w: dw, h: 44 },
          d1: { x: lx, y: 96, w: dw, h: 72, d: true },
          d2: { x: lx, y: 216, w: dw, h: 72, d: true },
          refund: { x: lx, y: 340, w: dw, h: 44 },
          support: { x: w - bw - 8, y: 110, w: bw, h: 44 },
          manager: { x: w - bw - 8, y: 230, w: bw, h: 44 },
        },
      };
    }
    // The route for the current inputs, with the time each leg starts.
    function route(p) {
      const young = p.age === "recent";
      const small = p.amount === "small";
      const legs = [["start", "d1"]];
      if (!young) legs.push(["d1", "support"]);
      else { legs.push(["d1", "d2"]); legs.push(["d2", small ? "refund" : "manager"]); }
      return legs;
    }
    const LABEL = { "d1-support": "no", "d1-d2": "yes", "d2-refund": "yes", "d2-manager": "no" };
    const OUTCOME = { refund: "Refunded automatically", manager: "Waits for a manager", support: "Sent to support" };
    FS.figure("fig-flowchart", {
      height: (w) => layout(w).h,
      duration: DUR,
      params: {
        age: { value: "recent", label: "Order age", placement: "inline", options: [{ value: "recent", label: "12 days" }, { value: "old", label: "45 days" }] },
        amount: { value: "small", label: "Amount", placement: "inline", options: [{ value: "small", label: "$40" }, { value: "large", label: "$260" }] },
      },
      reserve: { outcome: ["Refunded automatically"] },
      tips: {
        d1: { title: "Within 30 days?", body: "Older orders always go to a person, whatever the amount." },
        d2: { title: "Under $100?", body: "Small refunds are cheaper to grant than to review." },
      },
      tipAt: (f, x, y) => hit({ d1: L.n.d1, d2: L.n.d2 }, x, y),
      onParam(f) { if (FS.reduced()) f.api.seek(DUR); else { f.api.seek(0); f.api.play(); } },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        const legs = route(f.params);
        const n = L.n;
        const all = [["start", "d1"], ["d1", "support"], ["d1", "d2"], ["d2", "refund"], ["d2", "manager"]];
        // Each leg: 1 s to travel, then a 0.4 s pause at a decision while its condition lights.
        const legT = (i) => i * 1.4;
        const taken = new Map(legs.map((l, i) => [l.join("-"), i]));
        for (const [a, b] of all) {
          const key = `${a}-${b}`;
          const pts = link(n[a], n[b]);
          const i = taken.get(key);
          const drawn = i === undefined ? 0 : FS.clamp((f.t - legT(i) + (i ? -0.4 : 0)) / 1);
          edge(f, c, pts, { alpha: 0.28, arrow: true });
          if (drawn > 0) {
            // The taken branch draws on in ink.
            const part = [];
            for (let s = 0; s <= 20; s++) part.push(at(pts, (drawn * s) / 20));
            edge(f, c, part, { color: C.fg, width: 1.5, arrow: drawn >= 1 });
          }
          if (LABEL[key]) {
            const m = at(pts, 0.5);
            K.label(f, c, LABEL[key], m[0] + 6, m[1] - 8, { size: 11, color: drawn > 0 ? C.fg : C.muted, alpha: drawn > 0 ? 1 : 0.6 });
          }
        }
        const lastLeg = legs[legs.length - 1];
        const TITLES = { start: "Refund request", refund: "Refund now", manager: "Ask a manager", support: "Send to support" };
        for (const k in n) {
          const onRoute = legs.some((l) => l.includes(k));
          if (n[k].d) {
            // A decision lights while the token waits at it.
            const arrive = legT(legs.findIndex((l) => l[1] === k)) + 1;
            const lit = onRoute && f.t >= arrive && f.t < arrive + 0.4;
            diamond(f, c, n[k], k === "d1" ? "Within 30 days?" : "Under $100?", { alpha: onRoute ? 1 : C.dim, active: onRoute, lit: lit || f.hover === k });
          } else {
            const done = k === lastLeg[1] && f.t >= legT(legs.length - 1) + 1.4;
            box(f, c, n[k], { title: TITLES[k], alpha: onRoute ? 1 : C.dim, active: done, hot: done });
          }
        }
        // The token: walks the taken legs, pausing at each decision.
        let p = [n.start.x + n.start.w / 2, n.start.y + n.start.h / 2];
        legs.forEach(([a, b], i) => {
          const start = legT(i) + (i ? 0.4 : 0);
          if (f.t >= start) {
            const pts = link(n[a], n[b]);
            p = at(pts, FS.ease.inOut(FS.clamp((f.t - start) / 1)));
          }
        });
        dot(c, p, 5.5, C.accent);
        const outcome = f.t >= legT(legs.length - 1) + 1.4 ? OUTCOME[lastLeg[1]] : "…";
        if (outcome !== f.state.outcome) { f.state.outcome = outcome; f.api.out("outcome", outcome); }
      },
    });
  }

  /* ---------- Swimlane: a support ticket crossing three teams, mostly waiting ---------- */
  {
    const LANES = ["Customer", "Support", "Engineering"];
    // [lane, start h, end h, kind, label]
    const SPANS = [
      [0, 0, 0.5, "work", "Reports a bug"],
      [1, 0.5, 2, "work", "Triage"],
      [2, 2, 14, "wait", "In the queue"],
      [2, 14, 17, "work", "Investigate"],
      [1, 17, 18, "work", "Ask for logs"],
      [0, 18, 40, "wait", "Customer replies"],
      [2, 40, 44, "work", "Fix"],
      [1, 44, 46, "work", "Reply"],
    ];
    const END = 46;
    const WAIT = SPANS.filter((s) => s[3] === "wait").reduce((sum, s) => sum + s[2] - s[1], 0);
    let L = null;
    function layout(w) {
      const narrow = w < NARROW;
      const label = narrow ? 0 : 108;
      const lh = narrow ? 64 : 56;
      return { narrow, h: 28 + lh * 3 + 30, lh, top: 24, x0: label + 4, x1: w - 8 };
    }
    const xOf = (hrs) => L.x0 + ((L.x1 - L.x0) * hrs) / END;
    const laneY = (i) => L.top + i * L.lh;
    FS.figure("fig-swimlane", {
      height: (w) => layout(w).h,
      duration: 9.2,
      formatTime: (t) => `${Math.round((t / 9.2) * END)} h`,
      chapters: [{ t: (2 / END) * 9.2, label: "To engineering" }, { t: (18 / END) * 9.2, label: "Back to the customer" }, { t: (40 / END) * 9.2, label: "Fix" }],
      timeAxis: () => ({ x0: L.x0, x1: L.x1 }),
      tips: {
        lane0: { title: "Customer", body: "22 of the 46 hours are spent waiting for the customer to send logs." },
        lane1: { title: "Support", body: "Owns the ticket. Its own work adds up to 3.5 hours." },
        lane2: { title: "Engineering", body: "The ticket waits 12 hours in the queue before anyone looks at it." },
      },
      tipAt: (f, x, y) => { const i = Math.floor((y - L.top) / L.lh); return i >= 0 && i < 3 ? `lane${i}` : null; },
      init(f) { f.api.out("wait", `${WAIT} of ${END} h`); },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        const hrs = (f.t / 9.2) * END;
        LANES.forEach((name, i) => {
          const y = laneY(i);
          c.fillStyle = C.line;
          c.fillRect(0, y + L.lh - 1, f.w, 1);
          const on = !f.hover || f.hover === `lane${i}`;
          if (L.narrow) K.text(f, c, name, 0, y + 13, { size: 11, weight: 600, color: C.fg, alpha: on ? 1 : 0.4 });
          else K.text(f, c, name, 0, y + L.lh / 2 + 4, { size: 12, weight: 600, color: C.fg, alpha: on ? 1 : 0.4 });
        });
        c.fillStyle = C.line;
        c.fillRect(0, L.top - 1, f.w, 1);
        // Spans fill as the clock passes; waiting is hatched, work is solid.
        let prev = null;
        for (const [lane, a, b, kind, label] of SPANS) {
          const y = laneY(lane) + (L.narrow ? 22 : 14);
          const h = L.lh - (L.narrow ? 30 : 28);
          const x0 = xOf(a);
          const x1 = xOf(b);
          const on = !f.hover || f.hover === `lane${lane}`;
          c.save();
          c.globalAlpha = on ? 1 : 0.3;
          c.strokeStyle = C.lineStrong;
          c.strokeRect(x0 + 0.5, y + 0.5, Math.max(1, x1 - x0 - 1), h);
          const fill = FS.clamp((hrs - a) / (b - a));
          c.fillStyle = kind === "wait" ? FS.k.hatch(f, c, C.accent, 5) : C.fg;
          c.fillRect(x0 + 0.5, y + 0.5, Math.max(0, (x1 - x0 - 1) * fill), h);
          c.restore();
          if (!L.narrow && x1 - x0 > 70 && hrs >= a) K.label(f, c, label, x0 + 6, y - 7, { size: 11, color: C.muted, weight: 400, alpha: on ? 1 : 0.3 });
          // Hand-offs: a vertical connector where the ticket changes lanes.
          if (prev && prev[0] !== lane && hrs >= a) edge(f, c, [[xOf(a), laneY(prev[0]) + L.lh / 2], [xOf(a), laneY(lane) + L.lh / 2]], { dash: [2, 3], alpha: 0.8 });
          prev = [lane];
        }
        // The ticket: rides the span it is in.
        const cur = SPANS.find((s) => hrs >= s[1] && hrs < s[2]) || SPANS[SPANS.length - 1];
        dot(c, [xOf(Math.min(hrs, END)), laneY(cur[0]) + L.lh / 2 + (L.narrow ? 4 : 0)], 5, C.accent);
        const axisY = L.top + 3 * L.lh + 18;
        for (const hh of [0, 12, 24, 36, 46]) K.text(f, c, `${hh} h`, xOf(hh), axisY, { size: 11, align: hh === 46 ? "right" : hh ? "center" : "left" });
        FS.k.hoverTime(f, c, L.top + 10, L.top + 3 * L.lh, (t) => xOf((t / 9.2) * END), (t) => `${Math.round((t / 9.2) * END)} h`);
        if (f.t < 9.2 - 1e-3 || f.drag) FS.k.playhead(f, c, xOf(hrs), L.top, L.top + 3 * L.lh);
      },
    });
  }

  /* ---------- DP integration: sources -> platform hub -> consumers ---------- */
  {
    const SOURCES = [["crm", "CRM", "REST"], ["shop", "Web shop", "events"], ["erp", "ERP", "SFTP files"]];
    const CONSUMERS = [["bi", "Dashboards", "SQL"], ["app", "Mobile app", "API"], ["partner", "Partners", "file drop"]];
    let L = null;
    function layout(w) {
      if (w >= NARROW) {
        const bw = Math.min(124, w * 0.15);
        const row = (i) => 30 + i * 74;
        return {
          h: 250,
          src: SOURCES.map((_, i) => ({ x: 1, y: row(i), w: bw, h: 44 })),
          dst: CONSUMERS.map((_, i) => ({ x: w - bw - 1, y: row(i), w: bw, h: 44 })),
          hub: { x: w / 2 - Math.min(110, w * 0.13), y: 60, w: 2 * Math.min(110, w * 0.13), h: 132 },
        };
      }
      const bw = (w - 24) / 3;
      const col = (i) => 4 + i * (bw + 8);
      return {
        h: 400,
        src: SOURCES.map((_, i) => ({ x: col(i), y: 8, w: bw, h: 46 })),
        dst: CONSUMERS.map((_, i) => ({ x: col(i), y: 346, w: bw, h: 46 })),
        hub: { x: 24, y: 150, w: w - 48, h: 100 },
      };
    }
    FS.figure("fig-hub", {
      height: (w) => layout(w).h,
      params: {
        source: { value: "all", label: "Source", placement: "inline", options: [{ value: "all", label: "All" }, ...SOURCES.map(([v, l]) => ({ value: v, label: l }))] },
      },
      tips: {
        hub: { title: "Data platform", body: "The only place sources and consumers meet. Each side speaks its own protocol to the platform, never to each other." },
        crm: { title: "CRM", body: "Pulled over its REST API every 15 minutes." },
        shop: { title: "Web shop", body: "Pushes an event for every order, as it happens." },
        erp: { title: "ERP", body: "Drops a file on SFTP once a night." },
      },
      tipAt: (f, x, y) => (GK.inside(L.hub, x, y) ? "hub" : hit(Object.fromEntries(SOURCES.map(([k], i) => [k, L.src[i]])), x, y)),
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        const pick = f.params.source;
        // With "All", the sources take turns, 2.4 s each, so one route is readable at a time.
        const turn = pick === "all" ? SOURCES[Math.floor(f.t / 2.4) % 3][0] : pick;
        const phase = pick === "all" ? (f.t % 2.4) / 2.4 : (f.t * 0.45) % 1;
        const narrow = L.h > 300;
        SOURCES.forEach(([k, name, proto], i) => {
          const pts = link(L.src[i], L.hub, narrow ? "y" : "x");
          const on = k === turn;
          edge(f, c, pts, { alpha: on ? 1 : 0.18, color: on ? C.fg : C.muted });
          if (on) {
            if (pick === "all") { if (phase < 0.5) dot(c, at(pts, FS.ease.inOut(phase * 2)), 3.5, C.accent); }
            else packets(f, c, pts, phase, 2);
            const m = at(pts, narrow ? 0.5 : 0.12);
            K.label(f, c, proto, m[0] + (narrow ? 6 : 0), m[1] - 10, { size: 11, align: "left", color: C.muted, weight: 400 });
          }
          box(f, c, L.src[i], { title: name, alpha: on ? 1 : C.dim, active: on, hot: f.hover === k });
        });
        CONSUMERS.forEach(([k, name, proto], i) => {
          const pts = link(L.hub, L.dst[i], narrow ? "y" : "x");
          edge(f, c, pts, { alpha: 0.9, arrow: true });
          if (pick === "all") { if (phase >= 0.5) dot(c, at(pts, FS.ease.inOut((phase - 0.5) * 2)), 3.5, C.accent); }
          else packets(f, c, pts, (phase + 0.5) % 1, 2);
          const m = at(pts, narrow ? 0.5 : 0.86);
          K.label(f, c, proto, m[0] + (narrow ? 6 : -4), m[1] - (narrow ? 0 : 10), { size: 11, align: narrow ? "left" : "right", color: C.muted, weight: 400 });
          box(f, c, L.dst[i], { title: name });
        });
        // The hub boundary is the claim: the strongest shape on the stage.
        box(f, c, L.hub, { title: "Data platform", sub: "one copy, one schema", active: true, hot: f.hover === "hub", lw: 2.25, fill: C.surface2 });
      },
    });
  }

  /* ---------- Loop / flywheel: each turn returns more than it took, or the loop stalls ---------- */
  {
    const STATIONS = ["Buyers", "Reviews", "Ranking", "Traffic"];
    let L = null;
    const gainOf = (q) => 0.6 + 0.8 * q;
    function layout(w) {
      const narrow = w < NARROW;
      const h = narrow ? 360 : 320;
      const R = Math.min(narrow ? w / 2 - 66 : 120, h / 2 - 44);
      return { h, cx: narrow ? w / 2 : w * 0.38, cy: h / 2, R, narrow };
    }
    const ang = (i) => -Math.PI / 2 + (i * Math.PI) / 2;
    function reportGain(f) {
      const g = gainOf(f.params.quality);
      f.api.out("gain", `×${g.toFixed(2)} per turn, ${g > 1.001 ? "growing" : g < 0.999 ? "stalling" : "flat"}`);
    }
    FS.figure("fig-loop", {
      height: (w) => layout(w).h,
      settle: 8,
      params: {
        quality: { value: 0.65, min: 0.2, max: 1, step: 0.05, label: "Review quality", placement: "inline", format: (v) => `${Math.round(v * 100)}%` },
      },
      reserve: { gain: ["×1.40 per turn, growing"] },
      tips: {
        hub: { title: "Catalog trust", body: "What every turn writes back. It decays when reviews stop being useful." },
        s1: { title: "Reviews", body: "More buyers write more reviews. Their quality decides how much each one helps ranking." },
      },
      tipAt: (f, x, y) => {
        if (Math.hypot(x - L.cx, y - L.cy) < L.R * 0.42) return "hub";
        const p = [L.cx + L.R * Math.cos(ang(1)), L.cy + L.R * Math.sin(ang(1))];
        return Math.hypot(x - p[0], y - p[1]) < 40 ? "s1" : null;
      },
      init(f) { f.state.level = 0.5; f.state.spin = 0; reportGain(f); },
      update(f, dt) {
        const g = gainOf(f.v.quality);
        f.state.level = FS.clamp(f.state.level + (g - 1) * dt * 0.25, 0.04, 1);
        f.state.spin += dt * 0.5 * f.state.level * Math.min(1.6, g);
      },
      onParam: reportGain,
      resize(f) { L = layout(f.w); if (f.state.level == null) { f.state.level = 0.5; f.state.spin = 0; } },
      render(f, c) {
        const C = f.C;
        const { cx, cy, R } = L;
        const level = f.state.level ?? 0.5;
        const g = gainOf(f.v.quality);
        c.strokeStyle = C.lineStrong;
        c.lineWidth = 1.25;
        c.beginPath();
        c.arc(cx, cy, R, 0, Math.PI * 2);
        c.stroke();
        // Packets around the loop: as many as the trust level allows, moving as fast as the loop turns.
        const n = 2 + Math.round(level * 10);
        for (let i = 0; i < n; i++) {
          const a = ang(0) + ((f.state.spin ?? 0) + i / n) * Math.PI * 2;
          dot(c, [cx + R * Math.cos(a), cy + R * Math.sin(a)], 3, C.accent, 0.35 + 0.65 * level);
        }
        // Hub: fills with what the loop writes back (dashed write-back from Reviews).
        const hr = R * 0.42;
        const s1 = [cx + R * Math.cos(ang(1)), cy + R * Math.sin(ang(1))];
        edge(f, c, [[s1[0] - 40, s1[1]], [cx + hr + 4, cy]], { dash: [3, 4], arrow: true });
        c.save();
        c.beginPath();
        c.arc(cx, cy, hr, 0, Math.PI * 2);
        c.fillStyle = C.surface;
        c.fill();
        c.clip();
        c.fillStyle = C.fg;
        c.globalAlpha = 0.18;
        c.fillRect(cx - hr, cy + hr - 2 * hr * level, 2 * hr, 2 * hr * level);
        c.restore();
        c.beginPath();
        c.arc(cx, cy, hr, 0, Math.PI * 2);
        c.strokeStyle = f.hover === "hub" ? C.accent : C.fg;
        c.lineWidth = 1.25;
        c.stroke();
        K.text(f, c, "Catalog trust", cx, cy - 2, { size: 12, weight: 600, color: C.fg, align: "center" });
        K.text(f, c, `${Math.round(level * 100)}%`, cx, cy + 14, { size: 11, align: "center" });
        STATIONS.forEach((name, i) => {
          const p = [cx + R * Math.cos(ang(i)), cy + R * Math.sin(ang(i))];
          const bw = 92;
          box(f, c, { x: p[0] - bw / 2, y: p[1] - 17, w: bw, h: 34 }, { title: name, active: i === 1, hot: f.hover === "s1" && i === 1 });
        });
        if (!L.narrow) {
          const x = cx + R + 90;
          K.text(f, c, "Each turn returns", x, cy - 26, { size: 11 });
          K.text(f, c, `×${g.toFixed(2)}`, x, cy + 2, { size: 22, weight: 600, color: g >= 1 ? C.fg : C.muted });
          K.text(f, c, g > 1.001 ? "of what it took: the loop speeds up" : g < 0.999 ? "of what it took: the loop runs down" : "of what it took: the loop holds", x, cy + 24, { size: 11 });
        }
      },
    });
  }

  /* ---------- Gantt: durations, dependencies and the critical path ---------- */
  {
    const TASKS = [
      { key: "design", name: "Design", dur: 3, deps: [] },
      { key: "api", name: "Build API", dur: 5, deps: ["design"] },
      { key: "ui", name: "Build UI", dur: 4, deps: ["design"] },
      { key: "test", name: "Test", dur: 2, deps: ["api", "ui"] },
      { key: "launch", name: "Launch", dur: 1, deps: ["test"] },
    ];
    let L = null;
    let S = null;
    function schedule(p) {
      const dur = { design: 3, api: p.api, ui: p.ui, test: 2, launch: 1 };
      const deps = { design: [], api: ["design"], ui: p.order === "serial" ? ["api"] : ["design"], test: ["api", "ui"], launch: ["test"] };
      const start = {};
      const end = {};
      for (const t of TASKS) {
        start[t.key] = Math.max(0, ...deps[t.key].map((d) => end[d]));
        end[t.key] = start[t.key] + dur[t.key];
      }
      // Critical: walk back from the end through the dependency that finishes last.
      const crit = new Set(["launch"]);
      let k = "launch";
      while (deps[k].length) { k = deps[k].reduce((a, b) => (end[a] >= end[b] ? a : b)); crit.add(k); }
      return { start, end, crit, total: end.launch, dur };
    }
    function layout(w) {
      const narrow = w < NARROW;
      const label = narrow ? 76 : 104;
      return { h: 36 + TASKS.length * 40 + 2, x0: label, x1: w - 40, top: 30, rh: 40 };
    }
    const DAYS = 20;
    S = schedule({ order: "parallel", api: 5, ui: 4 });
    const xOf = (d) => L.x0 + ((L.x1 - L.x0) * d) / DAYS;
    const dOf = (x) => ((x - L.x0) / (L.x1 - L.x0)) * DAYS;
    const rowY = (i) => L.top + i * L.rh;
    const handle = (key) => ({
      label: `${key === "api" ? "Build API" : "Build UI"} duration`,
      description: "Drag the end of the bar to change how long it takes.",
      radius: 14,
      step: 1,
      get: () => ({ x: xOf(S.end[key]), y: rowY(TASKS.findIndex((t) => t.key === key)) + 14 }),
      set: (f, x, y, phase) => {
        // Keys move a whole day; drags are continuous and snap to a day on release.
        let d = phase === "key" ? S.dur[key] + Math.sign(x - xOf(S.end[key])) : dOf(x) - S.start[key];
        d = FS.clamp(d, 1, 9);
        if (phase !== "drag") d = Math.round(d);
        f.api.set(key, d, { instant: true });
      },
      release: () => ({ x: xOf(S.start[key] + Math.round(S.dur[key])), y: rowY(TASKS.findIndex((t) => t.key === key)) + 14 }),
    });
    FS.figure("fig-gantt", {
      height: (w) => layout(w).h,
      params: {
        order: { value: "parallel", label: "Builds", placement: "inline", options: [{ value: "parallel", label: "In parallel" }, { value: "serial", label: "One after the other" }] },
        api: { value: 5, min: 1, max: 9, step: 1, hidden: true },
        ui: { value: 4, min: 1, max: 9, step: 1, hidden: true },
      },
      handles: { api: handle("api"), ui: handle("ui") },
      reserve: { launch: ["day 20"] },
      tips: {
        crit: { title: "Critical path", body: "The chain of tasks with no slack: any day added here moves the launch." },
        slack: { title: "Slack", body: "Hatched: the task is done and waits for the slower build. Shortening it changes nothing." },
      },
      tipAt: (f, x, y) => (f.state.slack && GK.inside(f.state.slack, x, y) ? "slack" : (f.state.bars || []).some((b) => GK.inside(b, x, y)) ? "crit" : null),
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        S = schedule({ order: f.params.order, api: f.params.api, ui: f.params.ui });
        // Day grid.
        for (let d = 0; d <= DAYS; d += f.w < NARROW ? 10 : 5) {
          c.fillStyle = C.line;
          c.fillRect(xOf(d), L.top - 6, 1, TASKS.length * L.rh);
          K.text(f, c, `day ${d}`, xOf(d), L.top - 12, { size: 11, align: d === DAYS ? "right" : d ? "center" : "left" });
        }
        f.state.slack = null;
        f.state.bars = [];
        TASKS.forEach((t, i) => {
          const y = rowY(i) + 6;
          const h = 16;
          const x0 = xOf(S.start[t.key]);
          const x1 = xOf(S.end[t.key]);
          const crit = S.crit.has(t.key);
          K.text(f, c, t.name, 0, y + 12, { size: 12, weight: 600, color: C.fg });
          // Slack: the time a non-critical task waits for its successor.
          if (!crit && t.key !== "launch") {
            const succ = TASKS.filter((s) => s.key === "test")[0];
            const slackEnd = xOf(S.start[succ.key]);
            if (slackEnd > x1 + 1) {
              c.fillStyle = FS.k.hatch(f, c, C.lineStrong, 5);
              c.fillRect(x1, y, slackEnd - x1, h);
              f.state.slack = { x: x1, y, w: slackEnd - x1, h };
            }
          }
          if (crit) f.state.bars.push({ x: x0, y, w: x1 - x0, h });
          c.fillStyle = crit ? C.accent : C.fg;
          c.globalAlpha = crit ? 1 : 0.55;
          K.rrect(c, x0, y, Math.max(2, x1 - x0 - 1), h, 3);
          c.fill();
          c.globalAlpha = 1;
          if (t.key === "api" || t.key === "ui") {
            c.fillStyle = C.surface;
            c.fillRect(x1 - 4, y + 4, 2, h - 8);
          }
          const after = f.state.slack && f.state.slack.y === y ? f.state.slack.x + f.state.slack.w : x1;
          K.text(f, c, `${Math.round(S.dur[t.key] * 10) / 10} d`, after + 6, y + 12, { size: 11 });
        });
        // Dependencies as thin elbows from each end to the dependent's start.
        const deps = { api: ["design"], ui: [f.params.order === "serial" ? "api" : "design"], test: ["api", "ui"], launch: ["test"] };
        for (const k in deps) for (const d of deps[k]) {
          const i = TASKS.findIndex((t) => t.key === d);
          const j = TASKS.findIndex((t) => t.key === k);
          const x = xOf(S.end[d]);
          edge(f, c, [[x, rowY(i) + 22], [x + 6, rowY(i) + 22], [x + 6, rowY(j) + 14], [xOf(S.start[k]), rowY(j) + 14]], { alpha: 0.45, width: 1 });
        }
        const day = `day ${Math.round(S.total)}`;
        if (day !== f.state.day) { f.state.day = day; f.api.out("launch", day); }
      },
    });
  }
})();
