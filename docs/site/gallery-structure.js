/* Gallery, structure types: architecture, high-level stack, IT current-state, layer stack, nested, medallion.
   Synthetic, seeded, laid out in CSS pixels; everything drawn from FS state. */
(() => {
  const { box, edge, at, dot, packets, link, hit, mix, mixBox, K } = GK;
  const NARROW = 560;

  /* ---------- Architecture: one checkout request, stepped ---------- */
  {
    const NODES = {
      browser: ["Browser", "the shopper"],
      gateway: ["Gateway", "checks the session"],
      orders: ["Orders", "service"],
      db: ["Orders DB", "Postgres"],
      inventory: ["Inventory", "service"],
      payments: ["Payments", "service"],
      card: ["Card network", "external"],
    };
    const EDGES = [["browser", "gateway"], ["gateway", "orders"], ["orders", "db"], ["orders", "inventory"], ["orders", "payments"], ["payments", "card"]];
    const steps = [
      { edges: ["browser-gateway"], caption: "The shopper presses Pay. The request enters through the gateway, the only door into our network." },
      { edges: ["gateway-orders"], caption: "The gateway checks the session and hands the order to the Orders service." },
      { edges: ["orders-inventory", "orders-db"], caption: "Orders reserves the items in Inventory and writes the order to its own database." },
      { edges: ["orders-payments", "payments-card"], caption: "Payments is the only service that talks to the card network, which sits outside our network." },
      { edges: ["browser-gateway", "gateway-orders"], back: true, caption: "The answer travels back the way it came: five services touched, one of them outside." },
    ];
    let L = null;
    let F = null;
    function layout(w) {
      if (w >= NARROW) {
        const bw = Math.min(124, w * 0.15);
        const h = 300;
        const col = (u) => 1 + u * (w - bw - 2);
        const b = (u, cy) => ({ x: col(u), y: cy - 22, w: bw, h: 44 });
        return {
          h,
          n: { browser: b(0, 150), gateway: b(0.24, 150), orders: b(0.48, 150), db: b(0.48, 248), inventory: b(0.72, 62), payments: b(0.72, 150), card: b(1, 150) },
          wall: { x: col(0.24) - 16, y: 18, w: col(0.72) + bw - col(0.24) + 32, h: h - 30 },
        };
      }
      const bw = (w - 32) / 3;
      const cx = (i) => 8 + i * (bw + 8);
      const b = (i, y) => ({ x: cx(i), y, w: bw, h: 46 });
      return {
        h: 470,
        n: { browser: b(1, 8), gateway: b(1, 98), orders: b(1, 188), db: b(0, 188), inventory: b(0, 288), payments: b(2, 288), card: b(2, 412) },
        wall: { x: 2, y: 82, w: w - 4, h: 280 },
      };
    }
    const paths = () => Object.fromEntries(EDGES.map(([a, b]) => [`${a}-${b}`, link(L.n[a], L.n[b])]));
    FS.figure("fig-architecture", {
      height: (w) => layout(w).h,
      steps,
      stepDuration: 0.6,
      tips: {
        gateway: { title: "Gateway", body: "Checks the session and the rate limit before any service runs." },
        payments: { title: "Payments", body: "The only service allowed to reach the card network. It never stores card numbers." },
        card: { title: "Card network", body: "Outside our network, so its answer is the slowest and least predictable hop." },
        wall: { title: "Our network", body: "Everything inside the dashed line is ours. Only the gateway faces the internet." },
        browser: { title: "Browser", body: "Sends one request and waits for one answer." },
        orders: { title: "Orders", body: "Owns the order: reserves stock, stores it, asks for payment." },
        db: { title: "Orders DB", body: "Only Orders reads or writes it." },
        inventory: { title: "Inventory", body: "Holds the items for 15 minutes while payment runs." },
      },
      tipAt: (f, x, y) => hit(L.n, x, y) || (GK.inside(L.wall, x, y) && !GK.inside(L.wall, x, y, -10) ? "wall" : null),
      resize(f) { F = f; L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        const P = paths();
        const live = new Set(steps[f.step].edges);
        const was = new Set(steps[f.from].edges);
        const e = FS.ease.smooth(f.stepT);
        const touched = new Set([...live].flatMap((k) => k.split("-")));
        // The trust boundary is context: dashed, labelled, never animated.
        c.save();
        c.setLineDash([4, 4]);
        c.strokeStyle = f.hover === "wall" ? C.accent : C.lineStrong;
        K.rrect(c, L.wall.x, L.wall.y, L.wall.w, L.wall.h, 10);
        c.stroke();
        c.restore();
        K.text(f, c, "Our network", L.wall.x + 10, L.wall.y + 16, { size: 11, color: C.muted });
        for (const [a, b] of EDGES) {
          const key = `${a}-${b}`;
          const hovered = f.hover === a || f.hover === b;
          const on = live.has(key) ? e : was.has(key) ? 1 - e : 0;
          const alpha = hovered ? 1 : FS.lerp(0.18, 1, on);
          edge(f, c, P[key], { color: hovered || on > 0.5 ? C.fg : C.muted, alpha, width: on > 0.5 ? 1.4 : C.edge });
          if (live.has(key)) {
            const pts = steps[f.step].back ? [...P[key]].reverse() : P[key];
            packets(f, c, pts, (f.t * 0.45) % 1, 3, { alpha: e });
          }
        }
        for (const k in L.n) {
          const on = touched.has(k) || f.hover === k;
          box(f, c, L.n[k], { title: NODES[k][0], sub: L.n[k].w > 124 ? NODES[k][1] : null, alpha: on ? 1 : C.dim, active: touched.has(k), hot: f.hover === k, dash: k === "card" ? [3, 3] : null });
        }
      },
    });
  }

  /* ---------- High-level stack: one record climbing ingest -> store -> query -> show ---------- */
  {
    const LAYERS = [
      { key: "ingest", name: "Ingest", ms: 40, body: "Takes the event off the queue and validates it." },
      { key: "store", name: "Store", ms: 90, body: "Writes it to the column store and updates the indexes." },
      { key: "query", name: "Query", ms: 860, body: "Scans and aggregates 90 days of events for the chart. This is the slow layer." },
      { key: "show", name: "Show", ms: 210, body: "Formats the numbers and draws the chart in the browser." },
    ];
    const TOTAL = LAYERS.reduce((s, l) => s + l.ms, 0);
    const DUR = 6;
    let acc = 0;
    for (const l of LAYERS) { l.t0 = (acc / TOTAL) * DUR; acc += l.ms; l.t1 = (acc / TOTAL) * DUR; }
    let L = null;
    function layout(w) {
      if (w >= NARROW) {
        const sw = Math.min(300, w * 0.36);
        const band = (i) => ({ x: 1, y: 24 + (3 - i) * 52, w: sw - 2, h: 44 });
        return { h: 260, band, bar: { x: sw + 48, y: 120, w: w - sw - 64, h: 26 } };
      }
      const band = (i) => ({ x: 1, y: 8 + (3 - i) * 48, w: w - 2, h: 40 });
      return { h: 330, band, bar: { x: 8, y: 238, w: w - 24, h: 24 } };
    }
    const xOf = (t) => L.bar.x + (L.bar.w * t) / DUR;
    const ms = (t) => Math.round((FS.clamp(t / DUR) * TOTAL));
    FS.figure("fig-stack", {
      height: (w) => layout(w).h,
      duration: DUR,
      chapters: LAYERS.map((l) => ({ t: l.t1, label: l.name })),
      formatTime: (t) => `${ms(t)} ms`,
      timeAxis: () => ({ x0: L.bar.x, x1: L.bar.x + L.bar.w }),
      reserve: { now: ["1200 ms · Query"] },
      tips: Object.fromEntries(LAYERS.map((l) => [l.key, { title: `${l.name} · ${l.ms} ms`, body: l.body }])),
      tipAt: (f, x, y) => { for (let i = 0; i < 4; i++) if (GK.inside(L.band(i), x, y)) return LAYERS[i].key; return null; },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        const cur = LAYERS.findIndex((l) => f.t < l.t1);
        const now = cur < 0 ? 3 : cur;
        LAYERS.forEach((l, i) => {
          const b = L.band(i);
          const done = f.t >= l.t1;
          const active = i === now && f.t < DUR;
          box(f, c, b, { title: l.name, align: "left", alpha: i <= now || done ? 1 : C.dim, active: active || f.hover === l.key, hot: f.hover === l.key });
          const spent = FS.clamp((f.t - l.t0) / (l.t1 - l.t0)) * l.ms;
          if (f.t > l.t0) K.text(f, c, `+${Math.round(spent)} ms`, b.x + b.w - 10, b.y + b.h / 2 + 4, { size: 11, align: "right", color: active ? C.fg : C.muted });
        });
        // The record: a dot climbing the stack, eased between layers.
        const prog = FS.clamp((f.t - LAYERS[now].t0) / (LAYERS[now].t1 - LAYERS[now].t0));
        const li = cur < 0 ? 3 : now === 0 ? 0 : now - 1 + FS.ease.smooth(FS.clamp(prog * 4));
        const lo = Math.floor(li);
        const y = FS.lerp(L.band(lo).y + 22, L.band(Math.min(3, lo + 1)).y + 22, li - lo);
        const xr = L.band(0).x + L.band(0).w * 0.62;
        dot(c, [xr, y], 5, C.accent);
        // The time bar: each layer's share of the 1.2 s, filled as the clock passes.
        const { bar } = L;
        K.text(f, c, "Time, end to end", bar.x, bar.y - 12, { size: 11 });
        LAYERS.forEach((l, i) => {
          const x0 = xOf(l.t0);
          const x1 = xOf(l.t1);
          c.fillStyle = C.line;
          c.fillRect(x0, bar.y, x1 - x0 - 1, bar.h);
          const fill = FS.clamp((f.t - l.t0) / (l.t1 - l.t0));
          c.fillStyle = l.key === "query" ? C.accent : C.fg;
          c.globalAlpha = l.key === "query" ? 1 : 0.55;
          c.fillRect(x0, bar.y, (x1 - x0 - 1) * fill, bar.h);
          c.globalAlpha = 1;
          if (x1 - x0 > 44) K.text(f, c, l.name, (x0 + x1) / 2, bar.y + bar.h + 16, { size: 11, align: "center" });
        });
        K.text(f, c, `${TOTAL} ms`, bar.x + bar.w, bar.y - 12, { size: 11, align: "right" });
        FS.k.hoverTime(f, c, bar.y - 4, bar.y + bar.h, xOf, (t) => `${ms(t)} ms`);
        FS.k.playhead(f, c, xOf(f.t), bar.y - 6, bar.y + bar.h + 2);
        const label = `${ms(f.t)} ms · ${LAYERS[now].name}`;
        if (label !== f.state.label) { f.state.label = label; f.api.out("now", label); }
      },
    });
  }

  /* ---------- IT current-state: the same four nodes, before and after ---------- */
  {
    const NAMES = {
      shop: [["Web shop", "takes the order"], ["Web shop", "takes the order"]],
      mid: [["Shared folder", "CSV files"], ["Order API", "POST /orders"]],
      erp: [["ERP", "books the order"], ["ERP", "books the order"]],
      wh: [["Warehouse", "packs it"], ["Warehouse", "packs it"]],
    };
    const LINKS = [
      ["shop", "mid", "exported by hand", "sent at checkout"],
      ["mid", "erp", "imported at 02:00", "event, in seconds"],
      ["erp", "wh", "emailed, retyped", "webhook"],
    ];
    let L = null;
    function layout(w) {
      if (w >= NARROW) {
        const bw = Math.min(140, w * 0.18);
        const gap = (w - 2 - 4 * bw) / 3;
        const x = (i) => 1 + i * (bw + gap);
        return {
          h: 250,
          before: { shop: { x: x(0), y: 40, w: bw, h: 48 }, mid: { x: x(1), y: 150, w: bw, h: 48 }, erp: { x: x(2), y: 40, w: bw, h: 48 }, wh: { x: x(3), y: 150, w: bw, h: 48 } },
          after: { shop: { x: x(0), y: 96, w: bw, h: 48 }, mid: { x: x(1), y: 96, w: bw, h: 48 }, erp: { x: x(2), y: 96, w: bw, h: 48 }, wh: { x: x(3), y: 96, w: bw, h: 48 } },
        };
      }
      const bw = Math.min(170, w * 0.5);
      return {
        h: 430,
        before: { shop: { x: 8, y: 10, w: bw, h: 46 }, mid: { x: w - bw - 8, y: 116, w: bw, h: 46 }, erp: { x: 8, y: 222, w: bw, h: 46 }, wh: { x: w - bw - 8, y: 328, w: bw, h: 46 } },
        after: { shop: { x: (w - bw) / 2, y: 10, w: bw, h: 46 }, mid: { x: (w - bw) / 2, y: 116, w: bw, h: 46 }, erp: { x: (w - bw) / 2, y: 222, w: bw, h: 46 }, wh: { x: (w - bw) / 2, y: 328, w: bw, h: 46 } },
      };
    }
    FS.figure("fig-current", {
      height: (w) => layout(w).h,
      params: {
        view: { value: "before", label: "View", placement: "inline", options: [{ value: "before", label: "Today" }, { value: "after", label: "Target" }] },
        m: { value: 0, min: 0, max: 1, hidden: true },
      },
      reserve: { trip: ["about 14 hours"] },
      tips: {
        mid: { title: "The hand-off", body: "Today a person exports a CSV into a shared folder; the target posts the order to an API the moment it is placed." },
        wait: { title: "Waiting", body: "Orders sit in the folder until the nightly import at 02:00: up to 14 hours." },
        retype: { title: "Retyping", body: "The warehouse gets an email and types the order in again, where mistakes creep in." },
      },
      tipAt: (f, x, y) => {
        const m = f.v.m;
        const n = Object.fromEntries(Object.keys(L.before).map((k) => [k, mixBox(L.before[k], L.after[k], m)]));
        if (m < 0.5 && f.state.badges) for (const b of f.state.badges) if (GK.inside(b.r, x, y)) return b.key;
        return GK.inside(n.mid, x, y) ? "mid" : null;
      },
      onParam(f, name, value) {
        if (name === "view") { f.api.set("m", value === "after" ? 1 : 0); f.api.out("trip", value === "after" ? "about 2 minutes" : "about 14 hours"); }
      },
      init(f) { f.api.out("trip", "about 14 hours"); },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        const m = FS.ease.smooth(f.v.m);
        const n = Object.fromEntries(Object.keys(L.before).map((k) => [k, mixBox(L.before[k], L.after[k], m)]));
        const badges = [];
        LINKS.forEach(([a, b, before, after], i) => {
          const pts = link(n[a], n[b]);
          edge(f, c, pts, { arrow: true, dash: m < 0.5 ? [3, 4] : null, color: m < 0.5 ? C.muted : C.fg });
          const mid = at(pts, 0.5);
          const text = m < 0.5 ? before : after;
          K.label(f, c, text, mid[0], mid[1] - 10, { size: 11, align: "center", color: C.muted, weight: 400, alpha: Math.abs(m - 0.5) * 2 });
          // Today: jobs crawl and stop in the folder. Target: they flow.
          const speed = m < 0.5 ? 0.12 : 0.6;
          if (m >= 0.5 || i !== 1) packets(f, c, pts, (f.t * speed + i * 0.3) % 1, m < 0.5 ? 1 : 3, { alpha: Math.abs(m - 0.5) * 2 });
        });
        for (const k in n) box(f, c, n[k], { title: NAMES[k][m < 0.5 ? 0 : 1][0], sub: NAMES[k][m < 0.5 ? 0 : 1][1], active: k === "mid", hot: f.hover === "mid" && k === "mid" });
        if (m < 0.5) {
          const a = 1 - m * 2;
          // Friction: orders piling up in the folder, and the retyping step.
          for (let i = 0; i < 4; i++) dot(c, [n.mid.x + n.mid.w - 16 - i * 9, n.mid.y + n.mid.h - 10], 3, C.accent, a);
          // On phones the badges sit beside their box, clear of the edge labels below it.
          const side = L.h > 300;
          const wb = side ? { x: n.mid.x - 136, y: n.mid.y + 12, w: 128, h: 22 } : { x: n.mid.x, y: n.mid.y + n.mid.h + 8, w: 128, h: 22 };
          const rb = side ? { x: n.wh.x - 98, y: n.wh.y + 12, w: 90, h: 22 } : { x: n.wh.x, y: n.wh.y + n.wh.h + 8, w: 90, h: 22 };
          for (const [b, text, key] of [[wb, "waits up to 14 h", "wait"], [rb, "retyped", "retype"]]) {
            c.save();
            c.globalAlpha = a;
            c.fillStyle = FS.k.hatch(f, c, C.lineStrong, 5);
            K.rrect(c, b.x, b.y, b.w, b.h, 4);
            c.fill();
            c.strokeStyle = f.hover === key ? C.accent : C.lineStrong;
            c.stroke();
            c.restore();
            K.label(f, c, text, b.x + 8, b.y + b.h / 2, { size: 11, alpha: a });
            badges.push({ r: b, key });
          }
        }
        f.state.badges = badges;
      },
    });
  }

  /* ---------- Layer stack: a file read going down and coming back up ---------- */
  {
    const LAYERS = [
      { name: "App", down: 0.02, up: 0.02, body: "Your code calls read() for one line of a file." },
      { name: "Standard library", down: 0.01, up: 0.01, body: "Buffers the call and asks the kernel for a block." },
      { name: "Kernel", down: 0.03, up: 0.02, body: "Switches to kernel mode and finds the file's pages." },
      { name: "File system", down: 0.05, up: 0.04, body: "Maps the file offset to a block on the disk. Not in the cache this time." },
      { name: "Disk", down: 4.1, up: 0, body: "Seeks and reads the block. Everything above waits for it." },
    ];
    const total = LAYERS.reduce((s, l) => s + l.down + l.up, 0);
    // The trace's clock is piecewise: every hop gets the same width, so the fast layers stay visible.
    const HOPS = [0, 1, 2, 3, 4, 4, 3, 2, 1, 0];
    const DUR = 9;
    let L = null;
    function layout(w) {
      const narrow = w < NARROW;
      const label = narrow ? 92 : 136;
      const rows = 5;
      const rh = narrow ? 36 : 40;
      const top = narrow ? 24 : 16;
      const side = narrow ? 0 : 168;
      return { h: top + rows * rh + (narrow ? 150 : 34), narrow, rh, top, x0: label + 8, x1: w - side - 12, bars: narrow ? { x: 8, y: top + rows * rh + 30, w: w - 16 } : { x: w - side + 16, y: top, w: side - 16 } };
    }
    const yOf = (i) => L.top + i * L.rh + L.rh / 2;
    const xOf = (t) => L.x0 + ((L.x1 - L.x0) * t) / DUR;
    function where(t) {
      const k = FS.clamp(t, 0, DUR - 1e-6);
      const i = Math.floor(k);
      const u = FS.ease.inOut(k - i);
      return FS.lerp(HOPS[i], HOPS[Math.min(HOPS.length - 1, i + 1)], u);
    }
    FS.figure("fig-layers", {
      height: (w) => layout(w).h,
      duration: DUR,
      formatTime: (t) => `hop ${Math.min(9, Math.floor(t) + 1)} of 9`,
      chapters: [{ t: 4, label: "Disk" }, { t: 5, label: "Back up" }],
      timeAxis: () => ({ x0: L.x0, x1: L.x1 }),
      tips: Object.fromEntries(LAYERS.map((l, i) => [`l${i}`, { title: `${l.name} · ${(l.down + l.up).toFixed(2)} ms`, body: l.body }])),
      tipAt: (f, x, y) => { const i = Math.floor((y - L.top) / L.rh); return i >= 0 && i < 5 && x < L.x1 + 8 ? `l${i}` : null; },
      init(f) { f.api.out("disk", `${Math.round((LAYERS[4].down / total) * 100)}%`); f.api.out("total", `${total.toFixed(2)} ms`); },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        LAYERS.forEach((l, i) => {
          const y = L.top + i * L.rh;
          c.fillStyle = f.hover === `l${i}` ? C.surface2 : i % 2 ? "transparent" : C.surface2;
          c.globalAlpha = f.hover === `l${i}` ? 1 : 0.5;
          c.fillRect(0, y + 2, L.x1 + 8, L.rh - 4);
          c.globalAlpha = 1;
          K.text(f, c, l.name, 8, y + L.rh / 2 + 4, { size: L.narrow ? 11 : 12, weight: 600, color: C.fg });
        });
        // The trace so far: x is the hop clock, y is the layer the call is in.
        c.strokeStyle = C.fg;
        c.lineWidth = C.series;
        c.lineJoin = "round";
        c.beginPath();
        const steps = 120;
        for (let s = 0; s <= steps; s++) {
          const t = (f.t * s) / steps;
          const p = [xOf(t), yOf(where(t))];
          s ? c.lineTo(...p) : c.moveTo(...p);
        }
        c.stroke();
        // The disk wait is the long part: hatched where the trace sits at the bottom.
        const dx0 = xOf(4);
        const dx1 = xOf(5);
        c.fillStyle = FS.k.hatch(f, c, C.accent, 5);
        c.globalAlpha = 0.7;
        c.fillRect(dx0, L.top + 4 * L.rh + 6, (dx1 - dx0) * FS.clamp(f.t - 4), L.rh - 12);
        c.globalAlpha = 1;
        dot(c, [xOf(f.t), yOf(where(f.t))], 5, C.accent);
        // Real time per layer, as bars: the disk dwarfs the rest.
        const B = L.bars;
        K.text(f, c, "Real time per layer", B.x, B.y + (L.narrow ? -8 : 2), { size: 11 });
        LAYERS.forEach((l, i) => {
          const y = L.narrow ? B.y + 4 + i * 22 : yOf(i) - 6;
          const msl = l.down + l.up;
          const wbar = Math.max(2, ((B.w - (L.narrow ? 150 : 56)) * msl) / LAYERS[4].down);
          const x = L.narrow ? B.x + 100 : B.x;
          if (L.narrow) K.text(f, c, l.name, B.x, y + 9, { size: 11 });
          c.fillStyle = i === 4 ? C.accent : C.fg;
          c.globalAlpha = f.t >= HOPS.indexOf(i) ? 1 : 0.25;
          c.fillRect(x, y, wbar, 10);
          c.globalAlpha = 1;
          K.text(f, c, `${msl < 0.1 ? msl.toFixed(2) : msl.toFixed(1)} ms`, x + wbar + 6, y + 9, { size: 11 });
        });
        FS.k.hoverTime(f, c, L.top - 2, L.top + 5 * L.rh, xOf, (t) => `hop ${Math.min(9, Math.floor(t) + 1)}`);
      },
    });
  }

  /* ---------- Nested: cluster > node > pod > container, one level per step ---------- */
  {
    // World coordinates; the camera fits the focused rect into the stage.
    const R = {
      cluster: { x: 0, y: 0, w: 1000, h: 600, name: "Cluster", sub: "eu-west, 3 nodes" },
      n1: { x: 30, y: 90, w: 280, h: 490, name: "Node 1" },
      node: { x: 340, y: 90, w: 320, h: 490, name: "Node 2", sub: "a VM with 8 cores" },
      n3: { x: 690, y: 90, w: 280, h: 490, name: "Node 3" },
      p1: { x: 360, y: 160, w: 280, h: 90, name: "Pod a" },
      pod: { x: 360, y: 265, w: 280, h: 175, name: "Pod b", sub: "shares one network address" },
      p3: { x: 360, y: 455, w: 280, h: 110, name: "Pod c" },
      c2: { x: 376, y: 315, w: 120, h: 110, name: "Sidecar" },
      container: { x: 508, y: 315, w: 120, h: 110, name: "Container", sub: "your app" },
    };
    const LEVELS = ["cluster", "node", "pod", "container"];
    const PARENT = { n1: "cluster", node: "cluster", n3: "cluster", p1: "node", pod: "node", p3: "node", c2: "pod", container: "pod" };
    const depth = (k) => (k === "cluster" ? 0 : 1 + depth(PARENT[k]));
    const steps = [
      { caption: "A cluster is a group of machines that run your work. This one has three nodes." },
      { caption: "A node is one machine. Node 2 runs three pods." },
      { caption: "A pod is the smallest thing the cluster schedules. Pod b holds two containers that share its network address." },
      { caption: "The container is your app's process. Its parent's labels stay pinned at the top as you zoom." },
    ];
    let F = null;
    let screen = {};
    const cam = (k, w, h) => {
      const r = R[k];
      const pad = 18;
      const s = Math.min((w - 2 * pad) / r.w, (h - 2 * pad - 24) / r.h);
      return { s, x: r.x + r.w / 2, y: r.y + r.h / 2 };
    };
    FS.figure("fig-nested", {
      height: (w) => (w >= NARROW ? 360 : 320),
      steps,
      stepDuration: 0.8,
      tips: {
        cluster: { title: "Cluster", body: "Every machine the scheduler can place work on." },
        node: { title: "Node", body: "One machine, real or virtual." },
        pod: { title: "Pod", body: "Containers that are always scheduled together and share a network address." },
        container: { title: "Container", body: "One process with its own file system." },
      },
      tipAt: (f, x, y) => {
        let best = null;
        for (const k of LEVELS) if (screen[k] && GK.inside(screen[k], x, y)) best = k;
        return best;
      },
      resize(f) { F = f; },
      render(f, c) {
        const C = f.C;
        const a = cam(LEVELS[f.from], f.w, f.h);
        const b = cam(LEVELS[f.step], f.w, f.h);
        const e = FS.ease.inOut(f.stepT);
        // Interpolate the scale geometrically so the zoom feels even.
        const s = Math.exp(FS.lerp(Math.log(a.s), Math.log(b.s), e));
        const cx = FS.lerp(a.x, b.x, e);
        const cy = FS.lerp(a.y, b.y, e);
        const T = (r) => ({ x: (r.x - cx) * s + f.w / 2, y: (r.y - cy) * s + (f.h + 24) / 2, w: r.w * s, h: r.h * s });
        const focus = LEVELS[f.step];
        screen = {};
        for (const k in R) {
          const r = T(R[k]);
          screen[k] = r;
          if (r.x > f.w || r.y > f.h || r.x + r.w < 0 || r.y + r.h < 0) continue;
          const onPath = LEVELS.includes(k);
          // Label the focused box and its direct children; deeper boxes are too small to read yet.
          const labelled = k === focus || PARENT[k] === focus || (onPath && depth(k) < f.step);
          c.save();
          c.globalAlpha = onPath ? 1 : depth(k) === f.step + 1 && PARENT[k] === focus ? 0.7 : C.dim;
          K.rrect(c, r.x, r.y, r.w, r.h, Math.min(10, r.w / 10));
          c.fillStyle = k === focus ? C.surface2 : C.surface;
          c.fill();
          c.strokeStyle = f.hover === k ? C.accent : k === focus ? C.fg : C.lineStrong;
          c.lineWidth = k === focus || f.hover === k ? 1.5 : 1;
          c.stroke();
          c.restore();
          // Labels only where they fit; never scaled.
          if (r.w > 70 && r.h > 34 && r.y > 26 && labelled) {
            K.text(f, c, R[k].name, r.x + 10, r.y + 18, { size: 12, weight: 600, color: onPath ? C.fg : C.muted, alpha: onPath ? 1 : 0.6 });
            // The subline only where the children leave room under the title.
            const room = Math.min(...Object.keys(PARENT).filter((ch) => PARENT[ch] === k).map((ch) => (R[ch].y - R[k].y) * s));
            if (R[k].sub && k === focus && r.w > 150 && room > 42) K.text(f, c, R[k].sub, r.x + 10, r.y + 34, { size: 11 });
          }
        }
        // Pinned breadcrumb: where you are, always readable.
        const trail = LEVELS.slice(0, f.step + 1).map((k) => R[k].name).join("  ›  ");
        K.label(f, c, trail, 10, 14, { size: 11, color: C.muted, weight: 500 });
      },
    });
    // Click a box on the path to zoom into it; Escape zooms out.
    GK.onClick("fig-nested", () => F, (x, y) => {
      const api = FS.get("fig-nested");
      const next = LEVELS[api.step + 1];
      if (next && screen[next] && GK.inside(screen[next], x, y)) api.next();
    });
    document.getElementById("fig-nested").closest(".fs-stage").addEventListener("keydown", (e) => {
      if (e.key === "Escape" && FS.get("fig-nested").step > 0) { e.preventDefault(); FS.get("fig-nested").prev(); }
    });
  }

  /* ---------- Medallion: raw rows thin into clean rows, then into daily totals ---------- */
  {
    const r = FS.rng(31);
    const N = 120;
    const ROWS = 12480;
    const DROPPED = 578;
    const DAYS = 31;
    const per = ROWS / N;
    // Each dot stands for about 104 raw rows; about 5% of them are duplicates or broken.
    const dots = Array.from({ length: N }, (_, i) => ({ day: Math.floor(r() * DAYS), valid: i % 21 !== 5 }));
    const FOLLOW = 17;
    dots[FOLLOW].valid = true;
    const validIdx = dots.map((d, i) => (d.valid ? i : -1)).filter((i) => i >= 0);
    const byDay = Array.from({ length: DAYS }, (_, d) => dots.filter((x) => x.valid && x.day === d).length);
    const maxDay = Math.max(...byDay);
    const counts = [ROWS, ROWS - DROPPED, DAYS];
    const steps = [
      { caption: "Bronze keeps every raw event exactly as it arrived: 12,480 rows, duplicates and all." },
      { caption: "Silver drops duplicates and broken rows: 578 go, 11,902 stay, now with clean types." },
      { caption: "Gold sums them into one row per day: 31 rows for the month, ready for a dashboard." },
    ];
    let L = null;
    function layout(w) {
      if (w >= NARROW) {
        const cw = (w - 34) / 3;
        const col = (i) => ({ x: 1 + i * (cw + 16), y: 34, w: cw, h: 150 });
        return { h: 206, col, narrow: false };
      }
      const col = (i) => ({ x: 1, y: 30 + i * 150, w: w - 2, h: 116 });
      return { h: 476, col, narrow: true };
    }
    function grid(b, i, n) {
      const cols = Math.max(8, Math.floor((b.w - 24) / 12));
      return [b.x + 14 + (i % cols) * 12, b.y + 22 + Math.floor(i / cols) * 12 + (L.narrow ? 0 : 6)];
    }
    function place(s, j) {
      const d = dots[j];
      if (s === 0) return { p: grid(L.col(0), j, N), a: 1 };
      const k = validIdx.indexOf(j);
      if (s === 1) return k < 0 ? { p: [grid(L.col(0), j, N)[0], L.col(0).y + L.col(0).h + 20], a: 0 } : { p: grid(L.col(1), k, validIdx.length), a: 1 };
      if (k < 0) return { p: [grid(L.col(0), j, N)[0], L.col(0).y + L.col(0).h + 20], a: 0 };
      const g = L.col(2);
      const bw = (g.w - 28) / DAYS;
      return { p: [g.x + 14 + d.day * bw + bw / 2, g.y + g.h - 14], a: 0 };
    }
    const fmt = (n) => Math.round(n).toLocaleString("en-US");
    FS.figure("fig-medallion", {
      height: (w) => layout(w).h,
      steps,
      stepDuration: 1.1,
      tips: {
        t0: { title: "Bronze", body: "Raw events as they landed. Nothing is fixed here, so you can always replay." },
        t1: { title: "Silver", body: "Deduplicated, typed and validated. One row per real event." },
        t2: { title: "Gold", body: "Aggregated for one use: here, sales per day." },
      },
      tipAt: (f, x, y) => { for (let i = 0; i < 3; i++) if (GK.inside(L.col(i), x, y)) return `t${i}`; return null; },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        const e = FS.ease.smooth(f.stepT);
        ["Bronze · raw", "Silver · clean", "Gold · daily totals"].forEach((name, i) => {
          const b = L.col(i);
          const on = i <= f.step;
          box(f, c, b, { alpha: on ? 1 : C.dim, active: i === f.step, hot: f.hover === `t${i}` });
          K.text(f, c, name, b.x, b.y - 10, { size: 12, weight: 600, color: on ? C.fg : C.muted });
          // Counts tick while the step plays.
          let n = 0;
          if (i < f.step || (i === f.step && f.step === f.from)) n = counts[i];
          else if (i === f.step) n = FS.lerp(i === 2 ? counts[1] : counts[0], counts[i], e);
          else if (i === f.from && f.from > f.step) n = counts[i] * (1 - e);
          if (on || n) K.text(f, c, `${fmt(n)} rows`, b.x + b.w, b.y - 10, { size: 11, align: "right", color: C.muted });
        });
        // Gold bars grow as the dots arrive.
        const g = L.col(2);
        const bw = (g.w - 28) / DAYS;
        const grow = f.step === 2 ? (f.from === 2 ? 1 : e) : f.from === 2 ? 1 - e : 0;
        for (let d = 0; d < DAYS; d++) {
          const h = ((g.h - 44) * byDay[d]) / maxDay * grow;
          c.fillStyle = d === dots[FOLLOW].day ? C.accent : C.fg;
          c.globalAlpha = d === dots[FOLLOW].day ? 1 : 0.6;
          c.fillRect(g.x + 14 + d * bw + 1, g.y + g.h - 14 - h, Math.max(1, bw - 2), h);
        }
        c.globalAlpha = 1;
        for (let j = 0; j < N; j++) {
          const A = place(f.from, j);
          const B = place(f.step, j);
          const p = mix(A.p, B.p, e);
          const a = FS.lerp(A.a, B.a, e);
          if (a < 0.02) continue;
          dot(c, p, j === FOLLOW ? 4 : 3, j === FOLLOW ? C.accent : dots[j].valid ? C.fg : C.muted, a * (j === FOLLOW ? 1 : 0.75));
        }
        if (f.step >= 1) K.text(f, c, `${fmt(DROPPED)} dropped`, L.col(0).x + 14, L.col(0).y + L.col(0).h - 10, { size: 11, alpha: f.from >= 1 ? 1 : e });
      },
    });
  }
})();
