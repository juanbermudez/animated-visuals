/* Gallery, hierarchy and position types: tree, org chart, pyramid / funnel, quadrant, consultant 2x2, Venn,
   radar, DP security matrix. Synthetic, seeded, laid out in CSS pixels; everything drawn from FS state. */
(() => {
  const { box, edge, at, dot, link, hit, mix, K } = GK;
  const NARROW = 560;

  /* ---------- Tree: collapsing a folder moves nothing else ---------- */
  {
    const NODES = [
      { key: "app", name: "app/", parent: null },
      { key: "src", name: "src/", parent: "app" },
      { key: "components", name: "components/", parent: "src" },
      { key: "Button", name: "Button.tsx", parent: "components" },
      { key: "Card", name: "Card.tsx", parent: "components" },
      { key: "Modal", name: "Modal.tsx", parent: "components" },
      { key: "lib", name: "lib/", parent: "src" },
      { key: "api", name: "api.ts", parent: "lib" },
      { key: "format", name: "format.ts", parent: "lib" },
      { key: "tests", name: "tests/", parent: "app" },
      { key: "docs", name: "docs/", parent: "app" },
    ];
    const FOLDERS = ["src", "components", "lib"];
    const byKey = Object.fromEntries(NODES.map((n) => [n.key, n]));
    const depth = (n) => (n.parent ? 1 + depth(byKey[n.parent]) : 0);
    const leaves = NODES.filter((n) => !NODES.some((m) => m.parent === n.key));
    let L = null;
    let F = null;
    // One fixed layout for the fully open tree; collapsing only retracts children into their parent.
    function layout(w) {
      const narrow = w < NARROW;
      const rh = narrow ? 34 : 30;
      const cols = 4;
      // On phones each depth gets a width that fits its longest name; on wide screens the columns are equal.
      const gapN = 8;
      const share = [0.15, 0.19, 0.34, 0.32];
      const widths = narrow ? share.map((k) => k * (w - 3 * gapN)) : Array(cols).fill(Math.min(140, (w - 3 * 40) / 4));
      const gap = narrow ? gapN : (w - cols * widths[0]) / (cols - 1);
      const colX = (d) => widths.slice(0, d).reduce((sum, x) => sum + x + gap, 0);
      const pos = {};
      leaves.forEach((n, i) => { pos[n.key] = { y: 14 + i * rh }; });
      const place = (n) => {
        const kids = NODES.filter((m) => m.parent === n.key);
        kids.forEach(place);
        if (kids.length) pos[n.key] = { y: (pos[kids[0].key].y + pos[kids[kids.length - 1].key].y) / 2 };
        pos[n.key].x = colX(depth(n));
        pos[n.key].w = widths[depth(n)];
      };
      place(NODES[0]);
      for (const k in pos) pos[k] = { x: pos[k].x, y: pos[k].y, w: pos[k].w, h: 24 };
      return { h: 28 + leaves.length * rh, pos, narrow };
    }
    // How open each node's branch is: the product of its ancestors' eased open values.
    const openness = (f, n) => (n.parent ? (FOLDERS.includes(n.parent) ? f.v[n.parent] : 1) * openness(f, byKey[n.parent]) : 1);
    const anchor = (f, n) => {
      // Where a retracted node sits: its nearest ancestor that is still showing.
      let a = byKey[n.parent];
      while (a && a.parent && openness(f, a) < 0.5) a = byKey[a.parent];
      return L.pos[a.key];
    };
    const syncButtons = (f) => document.querySelectorAll('[data-toggles="fig-tree"] button').forEach((b) => b.setAttribute("aria-pressed", String(f.params[b.dataset.key] > 0.5)));
    FS.figure("fig-tree", {
      height: (w) => layout(w).h,
      duration: 1.2,
      params: Object.fromEntries(FOLDERS.map((k) => [k, { value: 1, min: 0, max: 1, hidden: true }])),
      tips: Object.fromEntries(FOLDERS.map((k) => [k, { title: byKey[k].name, body: "Click to collapse or expand it. Its siblings stay exactly where they are." }])),
      tipAt: (f, x, y) => {
        for (const k of FOLDERS) if (openness(f, byKey[k]) > 0.5 && GK.inside(L.pos[k], x, y)) return k;
        return null;
      },
      onParam: syncButtons,
      init: syncButtons,
      resize(f) { F = f; L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        // On entry the branches grow from the root, once.
        const grow = FS.ease.out(FS.clamp(f.t / 1.2));
        const shown = (n) => FS.clamp((grow * 4 - depth(n)) / 1);
        const P = {};
        for (const n of NODES) {
          const o = openness(f, n);
          const b = L.pos[n.key];
          const a = n.parent ? anchor(f, n) : b;
          const e = FS.ease.smooth(o);
          P[n.key] = { x: mix(a.x, b.x, e), y: mix(a.y, b.y, e), w: b.w, h: b.h, o: o * shown(n) };
        }
        for (const n of NODES) {
          if (!n.parent) continue;
          const a = P[n.parent];
          const b = P[n.key];
          if (b.o < 0.02) continue;
          const x0 = a.x + a.w;
          const xm = x0 + (b.x - x0) / 2;
          edge(f, c, [[x0, a.y + 12], [xm, a.y + 12], [xm, b.y + 12], [b.x, b.y + 12]], { alpha: b.o * 0.9 });
        }
        for (const n of NODES) {
          const p = P[n.key];
          if (p.o < 0.02) continue;
          const folder = FOLDERS.includes(n.key);
          const open = folder ? f.params[n.key] > 0.5 : false;
          box(f, c, p, { title: `${folder && !L.narrow ? (open ? "▾ " : "▸ ") : ""}${n.name}`, align: "left", size: L.narrow ? 11 : 12, alpha: p.o, active: folder, hot: f.hover === n.key, dash: folder || n.key === "app" ? null : [2, 3] });
        }
      },
    });
    const toggle = (key) => { const api = FS.get("fig-tree"); api.set(key, api.params[key] > 0.5 ? 0 : 1); };
    document.querySelectorAll('[data-toggles="fig-tree"] button').forEach((b) => b.addEventListener("click", () => toggle(b.dataset.key)));
    GK.onClick("fig-tree", () => F, (x, y) => {
      for (const k of FOLDERS) if (openness(F, byKey[k]) > 0.5 && GK.inside(L.pos[k], x, y)) { toggle(k); return; }
    });
  }

  /* ---------- Org chart: a question routes across to its owner, not up ---------- */
  {
    const ROLES = {
      ceo: ["CEO", "sets direction"],
      ops: ["VP Operations", "support, logistics"],
      fin: ["VP Finance", "money in and out"],
      lead: ["Support lead", "the support team"],
      agent: ["Support agent", "first reply"],
      billing: ["Billing lead", "invoices, refunds"],
      payroll: ["Payroll lead", "salaries"],
    };
    const PARENT = { ops: "ceo", fin: "ceo", lead: "ops", agent: "lead", billing: "fin", payroll: "fin" };
    const ROUTES = {
      invoice: ["agent", "lead", "billing"],
      salary: ["agent", "lead", "payroll"],
    };
    let L = null;
    function layout(w) {
      if (w >= NARROW) {
        const bw = Math.min(150, w * 0.19);
        const b = (cx, y) => ({ x: cx * w - bw / 2, y, w: bw, h: 44 });
        return { h: 300, n: { ceo: b(0.5, 10), ops: b(0.27, 94), fin: b(0.73, 94), lead: b(0.27, 166), agent: b(0.27, 238), billing: b(0.62, 166), payroll: b(0.86, 166) } };
      }
      const bw = (w - 24) / 2;
      const b = (col, y) => ({ x: 4 + col * (bw + 16), y, w: bw, h: 44 });
      return { h: 360, n: { ceo: { x: (w - bw) / 2, y: 6, w: bw, h: 44 }, ops: b(0, 84), fin: b(1, 84), lead: b(0, 160), agent: b(0, 236), billing: b(1, 160), payroll: b(1, 236) } };
    }
    FS.figure("fig-org", {
      height: (w) => layout(w).h,
      duration: 4,
      loop: true,
      params: { question: { value: "invoice", label: "Question", placement: "inline", options: [{ value: "invoice", label: "An invoice" }, { value: "salary", label: "A salary" }] } },
      tips: {
        ceo: { title: "CEO", body: "Not involved. Routing by ownership keeps questions off the top of the chart." },
        lead: { title: "Support lead", body: "Owns the routing table: which team owns which kind of question." },
        billing: { title: "Billing lead", body: "Owns invoices and refunds. Escalates to the VP Finance." },
        payroll: { title: "Payroll lead", body: "Owns salaries. Escalates to the VP Finance." },
        agent: { title: "Support agent", body: "Takes the first reply and tags the question." },
        ops: { title: "VP Operations", body: "Owns support. Escalates to the CEO." },
        fin: { title: "VP Finance", body: "Owns billing and payroll. Escalates to the CEO." },
      },
      tipAt: (f, x, y) => hit(L.n, x, y),
      onParam(f) { if (FS.reduced()) f.api.seek(4); else { f.api.seek(0); f.api.play(); } },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        const route = ROUTES[f.params.question];
        for (const k in PARENT) edge(f, c, link(L.n[PARENT[k]], L.n[k], "y"), { alpha: 0.75 });
        // The route: up to the lead, then across to the owner (dashed: it is a hand-off, not a reporting line).
        const lead = L.n.lead;
        const to = L.n[route[2]];
        const lx = lead.x + lead.w;
        const ly = lead.y + lead.h / 2;
        let across = [[lx, ly], [to.x, to.y + to.h / 2]];
        if (route[2] === "payroll") {
          // Around Billing, never through it: under the row on wide screens, down the gap on phones.
          const sameRow = Math.abs(to.y - lead.y) < 4;
          const below = lead.y + lead.h + 14;
          across = sameRow
            ? [[lx, ly], [lx + 12, ly], [lx + 12, below], [to.x + to.w / 2, below], [to.x + to.w / 2, to.y + to.h]]
            : [[lx, ly], [lx + 8, ly], [lx + 8, to.y + to.h / 2], [to.x, to.y + to.h / 2]];
        }
        const legs = [link(L.n.agent, lead, "y").reverse(), across];
        edge(f, c, across, { color: C.accent, dash: [4, 4], arrow: true, alpha: 0.9 });
        const u = FS.clamp(f.t / 3);
        const p = u < 0.4 ? at(legs[0], FS.ease.inOut(u / 0.4)) : at(across, FS.ease.inOut((u - 0.4) / 0.6));
        for (const k in L.n) {
          const onRoute = route.includes(k);
          box(f, c, L.n[k], { title: ROLES[k][0], sub: L.n[k].w > 120 ? ROLES[k][1] : null, alpha: onRoute ? 1 : C.dim, active: onRoute, hot: f.hover === k || (k === route[2] && u >= 1) });
        }
        dot(c, p, 5, C.accent);
      },
    });
  }

  /* ---------- Funnel: what leaves at each stage ---------- */
  {
    const STAGES = ["Visit", "Sign up", "Add to cart", "Check out", "Pay"];
    const RATES = (signup) => [1, signup, 0.4, 0.6, 0.83];
    const counts = (signup) => {
      let n = 10000;
      return RATES(signup).map((r) => (n = Math.round(n * r)));
    };
    const r = FS.rng(4);
    const DROPS = Array.from({ length: 160 }, () => ({ u: r(), x: r() - 0.5, phase: r() }));
    let L = null;
    function layout(w) {
      const narrow = w < NARROW;
      const label = narrow ? 0 : 120;
      return { narrow, h: narrow ? 330 : 280, x0: label, x1: w - (narrow ? 0 : 110), top: narrow ? 8 : 14, rh: narrow ? 62 : 52 };
    }
    const fmt = (n) => n.toLocaleString("en-US");
    FS.figure("fig-funnel", {
      height: (w) => layout(w).h,
      params: { signup: { value: 0.5, min: 0.2, max: 0.8, step: 0.05, label: "Sign-up rate", placement: "inline", format: (v) => `${Math.round(v * 100)}%` } },
      reserve: { pay: ["2,656 pay"] },
      tips: { s1: { title: "Sign up", body: "The biggest drop. Drag the rate under the figure to see how much it moves the bottom." } },
      tipAt: (f, x, y) => { const i = Math.floor((y - L.top) / L.rh); return i === 1 ? "s1" : null; },
      onParam(f) { f.api.out("pay", `${fmt(counts(f.params.signup)[4])} pay`); },
      init(f) { f.api.out("pay", `${fmt(counts(f.params.signup)[4])} pay`); },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        const n = counts(f.v.signup);
        const W = L.x1 - L.x0;
        const cx = L.x0 + W / 2;
        const wOf = (k) => (W * k) / 10000;
        STAGES.forEach((name, i) => {
          const y = L.top + i * L.rh;
          const h = L.rh - (L.narrow ? 26 : 16);
          const by = L.narrow ? y + 18 : y;
          const w = Math.max(3, wOf(n[i]));
          c.fillStyle = i === 4 ? C.accent : C.fg;
          c.globalAlpha = i === 4 ? 1 : 0.16 + 0.12 * (4 - i) / 4;
          K.rrect(c, cx - w / 2, by, w, h, 4);
          c.fill();
          c.globalAlpha = 1;
          c.strokeStyle = f.hover === "s1" && i === 1 ? C.accent : C.lineStrong;
          c.stroke();
          if (L.narrow) {
            K.text(f, c, name, 0, y + 12, { size: 11, weight: 600, color: C.fg });
            K.text(f, c, fmt(n[i]), f.w, y + 12, { size: 11, align: "right", color: C.fg });
          } else {
            K.text(f, c, name, 0, y + h / 2 + 4, { size: 12, weight: 600, color: C.fg });
            K.text(f, c, fmt(n[i]), L.x1 + 12, y + h / 2 + 4, { size: 12, color: C.fg });
            if (i) K.text(f, c, `−${fmt(n[i - 1] - n[i])}`, L.x1 + 12, y + h / 2 + 18, { size: 11 });
          }
        });
        // People flowing down; at each stage some leave sideways, in proportion to the drop.
        const rates = RATES(f.v.signup);
        for (const d of DROPS) {
          const s = (f.t * 0.18 + d.phase) % 1;
          const pos = s * 5;
          const stage = Math.floor(pos);
          let alive = 1;
          for (let i = 1; i <= stage && i < 5; i++) alive *= rates[i];
          const leaves = stage < 4 && d.u > alive * rates[stage + 1] && d.u <= alive;
          if (d.u > alive) continue;
          const frac = pos - stage;
          const y0 = L.top + stage * L.rh + (L.narrow ? 18 : 0) + 6;
          let x = cx + d.x * wOf(n[stage]) * 0.8;
          let y = y0 + frac * L.rh;
          let a = 0.8;
          if (leaves && frac > 0.4) {
            const k = (frac - 0.4) / 0.6;
            x += Math.sign(d.x || 1) * k * 60;
            y = y0 + 0.4 * L.rh;
            a = 0.8 * (1 - k);
          }
          if (y > L.top + 5 * L.rh) continue;
          dot(c, [x, y], 2.2, C.fg, a);
        }
      },
    });
  }

  /* ---------- Quadrant: impact x effort, items you can drag ---------- */
  {
    const IDEAS = [
      { key: "search", name: "Fix search", e: 0.25, i: 0.8 },
      { key: "dark", name: "Dark mode", e: 0.3, i: 0.35 },
      { key: "billing", name: "Rewrite billing", e: 0.85, i: 0.75 },
      { key: "tour", name: "Onboarding tour", e: 0.4, i: 0.68 },
      { key: "sso", name: "SSO", e: 0.7, i: 0.6 },
      { key: "logo", name: "New logo", e: 0.62, i: 0.18 },
    ];
    const pos = Object.fromEntries(IDEAS.map((d) => [d.key, { e: d.e, i: d.i }]));
    let L = null;
    function layout(w) {
      const narrow = w < NARROW;
      const size = narrow ? w - 28 : Math.min(w - 220, 400);
      return { narrow, h: size + 44, x: narrow ? 22 : (w - size) / 2, y: 8, s: size };
    }
    const X = (e) => L.x + e * L.s;
    const Y = (i) => L.y + (1 - i) * L.s;
    const quick = () => IDEAS.filter((d) => pos[d.key].e < 0.5 && pos[d.key].i >= 0.5);
    const report = (f) => { const q = quick(); f.api.out("quick", `${q.length} quick ${q.length === 1 ? "win" : "wins"}: ${q.map((d) => d.name).join(", ") || "none"}`); };
    FS.figure("fig-quadrant", {
      height: (w) => layout(w).h,
      handles: Object.fromEntries(IDEAS.map((d) => [d.key, {
        label: d.name,
        description: "Drag to re-score: right is more effort, up is more impact.",
        radius: 14,
        step: 0.05 * 400,
        get: () => ({ x: X(pos[d.key].e), y: Y(pos[d.key].i) }),
        bounds: () => ({ x0: X(0), y0: Y(1), x1: X(1), y1: Y(0) }),
        set: (f, x, y) => {
          pos[d.key] = { e: FS.clamp((x - L.x) / L.s), i: FS.clamp(1 - (y - L.y) / L.s) };
          report(f);
          f.api.redraw();
        },
      }])),
      reserve: { quick: ["3 quick wins: Fix search, Onboarding tour, Dark mode"] },
      tips: { qw: { title: "Quick wins", body: "High impact, low effort. Do these first." }, mp: { title: "Money pits", body: "Low impact, high effort. Drop these." } },
      tipAt: (f, x, y) => (x > X(0) && x < X(0.5) && y > Y(1) && y < Y(0.5) ? "qw" : x > X(0.5) && x < X(1) && y > Y(0.5) && y < Y(0) ? "mp" : null),
      init: report,
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        const names = [["Quick wins", 0, 1], ["Big bets", 0.5, 1], ["Fill-ins", 0, 0.5], ["Money pits", 0.5, 0.5]];
        for (const [name, e, i] of names) {
          const lit = name === "Quick wins";
          c.fillStyle = lit ? C.surface2 : C.surface;
          c.fillRect(X(e), Y(i), L.s / 2, L.s / 2);
          K.text(f, c, name, X(e) + 10, Y(i) + 18, { size: 12, weight: 600, color: lit ? C.fg : C.muted });
        }
        c.strokeStyle = C.lineStrong;
        c.strokeRect(X(0) + 0.5, Y(1) + 0.5, L.s, L.s);
        c.fillStyle = C.lineStrong;
        c.fillRect(X(0.5), Y(1), 1, L.s);
        c.fillRect(X(0), Y(0.5), L.s, 1);
        // One word at each axis end.
        K.text(f, c, "Effort →", X(1), Y(0) + 18, { size: 11, align: "right" });
        c.save();
        c.translate(X(0) - 8, Y(1));
        c.rotate(-Math.PI / 2);
        K.text(f, c, "Impact →", 0, 0, { size: 11, align: "right" });
        c.restore();
        for (const d of IDEAS) {
          const p = [X(pos[d.key].e), Y(pos[d.key].i)];
          const held = f.drag === d.key || f.handleHover === d.key;
          const q = pos[d.key].e < 0.5 && pos[d.key].i >= 0.5;
          dot(c, p, held ? 7 : 5.5, q ? C.accent : C.fg);
          const right = p[0] < X(0.78);
          K.label(f, c, d.name, p[0] + (right ? 11 : -11), p[1], { size: 11, align: right ? "left" : "right" });
        }
      },
    });
  }

  /* ---------- Consultant 2x2: two assumptions move a marker between named scenarios ---------- */
  {
    const CELLS = [
      { name: "Land grab", ax: 1, ay: 0, body: "Fast adoption, loose rules: spend to win share before the rules arrive." },
      { name: "Niche", ax: 0, ay: 0, body: "Slow adoption, loose rules: serve the few who want it, cheaply." },
      { name: "Walled garden", ax: 1, ay: 1, body: "Fast adoption, strict rules: compliance becomes the moat." },
      { name: "Slow burn", ax: 0, ay: 1, body: "Slow adoption, strict rules: wait, and keep costs down." },
    ];
    let L = null;
    function layout(w) {
      const narrow = w < NARROW;
      const s = narrow ? w - 28 : Math.min(380, w - 240);
      return { h: s + 40, x: narrow ? 22 : (w - s) / 2, y: 8, s };
    }
    const cellOf = (a, r) => CELLS.find((c) => c.ax === (a >= 0.5 ? 1 : 0) && c.ay === (r >= 0.5 ? 1 : 0));
    FS.figure("fig-2x2", {
      height: (w) => layout(w).h,
      params: {
        adoption: { value: 0.72, min: 0, max: 1, step: 0.01, label: "Adoption", placement: "inline", format: (v) => (v < 0.5 ? "slow" : "fast") + ` (${Math.round(v * 100)})` },
        regulation: { value: 0.3, min: 0, max: 1, step: 0.01, label: "Regulation", placement: "inline", format: (v) => (v < 0.5 ? "loose" : "strict") + ` (${Math.round(v * 100)})` },
      },
      reserve: { cell: ["Walled garden"] },
      tips: Object.fromEntries(CELLS.map((c) => [c.name, { title: c.name, body: c.body }])),
      tipAt: (f, x, y) => {
        const a = (x - L.x) / L.s;
        const r = (y - L.y) / L.s;
        return a >= 0 && a <= 1 && r >= 0 && r <= 1 ? cellOf(a, r).name : null;
      },
      onParam(f) { f.api.out("cell", cellOf(f.params.adoption, f.params.regulation).name); },
      init(f) { f.api.out("cell", cellOf(f.params.adoption, f.params.regulation).name); },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        const a = f.v.adoption;
        const r = f.v.regulation;
        const here = cellOf(a, r);
        for (const cell of CELLS) {
          const x = L.x + cell.ax * (L.s / 2);
          const y = L.y + cell.ay * (L.s / 2);
          const on = cell === here;
          c.fillStyle = on ? C.surface2 : C.surface;
          c.fillRect(x, y, L.s / 2, L.s / 2);
          c.strokeStyle = on ? C.fg : C.lineStrong;
          c.lineWidth = on ? 1.5 : 1;
          c.strokeRect(x + 0.5, y + 0.5, L.s / 2 - 1, L.s / 2 - 1);
          K.text(f, c, cell.name, x + 12, y + 24, { size: 14, weight: 600, color: on ? C.fg : C.muted, alpha: on ? 1 : 0.7 });
        }
        K.text(f, c, "Adoption: slow → fast", L.x + L.s, L.y + L.s + 18, { size: 11, align: "right" });
        c.save();
        c.translate(L.x - 8, L.y);
        c.rotate(-Math.PI / 2);
        K.text(f, c, "Rules: strict → loose", 0, 0, { size: 11, align: "right" });
        c.restore();
        const p = [L.x + a * L.s, L.y + r * L.s];
        dot(c, p, 7, C.accent);
        K.label(f, c, "We are here", p[0] + 12, p[1], { size: 11, weight: 600 });
      },
    });
  }

  /* ---------- Venn: three groups, members dropping into regions ---------- */
  {
    const r = FS.rng(9);
    const SETS = [["app", "Uses the app"], ["pays", "Pays"], ["review", "Wrote a review"]];
    // 90 customers; membership drawn so that exactly 14 are in all three.
    const members = [];
    const quota = { 7: 14, 3: 12, 5: 6, 6: 9, 1: 22, 2: 10, 4: 17 };
    for (const mask in quota) for (let i = 0; i < quota[mask]; i++) members.push({ mask: Number(mask), seed: [r(), r()], x: 0, y: 0, vx: 0, vy: 0, a: 1 });
    let L = null;
    function layout(w) {
      const narrow = w < NARROW;
      const R = narrow ? Math.min(92, w * 0.24) : 104;
      const cx = w / 2;
      const d = R * 0.62;
      const cy = Math.round(R + d * 0.55 + 28);
      return { h: Math.round(cy + d * 0.8 + R + 30), R, centers: [[cx - d, cy - d * 0.55], [cx + d, cy - d * 0.55], [cx, cy + d * 0.8]] };
    }
    const on = (f, i) => f.params[SETS[i][0]] > 0.5;
    const effective = (f, m) => [0, 1, 2].reduce((s, i) => s | (on(f, i) && m.mask & (1 << i) ? 1 << i : 0), 0);
    // A point inside exactly the circles in `mask` (searched once per mask, then jittered by the seed).
    const homes = {};
    function home(mask) {
      if (homes[mask]) return homes[mask];
      if (!mask) return (homes[0] = { x: L.centers[2][0] + L.R * 1.45, y: L.centers[2][1] + L.R * 0.4, spread: 0.32 });
      let best = null;
      for (let gx = -1.6; gx <= 1.6; gx += 0.05) for (let gy = -1.6; gy <= 1.6; gy += 0.05) {
        const x = (L.centers[0][0] + L.centers[1][0] + L.centers[2][0]) / 3 + gx * L.R;
        const y = (L.centers[0][1] + L.centers[1][1] + L.centers[2][1]) / 3 + gy * L.R;
        const inside = [0, 1, 2].reduce((s, i) => s | (Math.hypot(x - L.centers[i][0], y - L.centers[i][1]) < L.R ? 1 << i : 0), 0);
        if (inside !== mask) continue;
        const margin = Math.min(...[0, 1, 2].map((i) => Math.abs(Math.hypot(x - L.centers[i][0], y - L.centers[i][1]) - L.R)));
        if (!best || margin > best.m) best = { x, y, m: margin };
      }
      return (homes[mask] = { x: best.x, y: best.y, spread: Math.min(0.32, best.m / L.R) });
    }
    const target = (f, m) => {
      const mask = effective(f, m);
      const h = home(mask);
      return [h.x + (m.seed[0] - 0.5) * 2 * h.spread * L.R * 0.8, h.y + (m.seed[1] - 0.5) * 2 * h.spread * L.R * 0.8];
    };
    const countIn = (f, mask) => members.filter((m) => effective(f, m) === mask).length;
    const syncButtons = (f) => document.querySelectorAll('[data-toggles="fig-venn"] button').forEach((b) => b.setAttribute("aria-pressed", String(f.params[b.dataset.key] > 0.5)));
    const tips = { region: { title: "", body: "" } };
    FS.figure("fig-venn", {
      height: (w) => layout(w).h,
      settle: 2,
      params: Object.fromEntries(SETS.map(([k]) => [k, { value: 1, min: 0, max: 1, hidden: true }])),
      tips,
      tipAt: (f, x, y) => {
        const mask = [0, 1, 2].reduce((s, i) => s | (on(f, i) && Math.hypot(x - L.centers[i][0], y - L.centers[i][1]) < L.R ? 1 << i : 0), 0);
        if (!mask) return null;
        const names = [0, 1, 2].filter((i) => mask & (1 << i)).map((i) => SETS[i][1].toLowerCase());
        tips.region.title = `${countIn(f, mask)} people`;
        tips.region.body = `In exactly: ${names.join(" + ")}.`;
        return { key: "region", x, y: y - 6 };
      },
      onParam(f) {
        syncButtons(f);
        // Reduced motion: members jump to their new regions.
        if (FS.reduced()) for (const m of members) [m.x, m.y] = target(f, m);
      },
      init(f) {
        syncButtons(f);
        f.api.out("all", `${countIn(f, 7)} of ${members.length}`);
      },
      update(f, dt) {
        for (const m of members) {
          const [tx, ty] = target(f, m);
          m.x = FS.damp(m.x, tx, 7, dt);
          m.y = FS.damp(m.y, ty, 7, dt);
        }
      },
      resize(f) {
        L = layout(f.w);
        for (const k in homes) delete homes[k];
        for (const m of members) [m.x, m.y] = target(f, m);
      },
      render(f, c) {
        const C = f.C;
        SETS.forEach(([k, name], i) => {
          const [x, y] = L.centers[i];
          const a = 0.25 + 0.75 * f.v[k];
          c.save();
          c.globalAlpha = a;
          c.beginPath();
          c.arc(x, y, L.R, 0, Math.PI * 2);
          c.strokeStyle = C.c[i];
          c.lineWidth = 1.5;
          if (!on(f, i)) c.setLineDash([3, 4]);
          c.stroke();
          c.restore();
          const ly = i === 2 ? y + L.R + 16 : y - L.R - 12;
          K.label(f, c, name, x, ly, { size: 11, weight: 600, color: C.c[i], align: "center", alpha: a });
        });
        if (countIn(f, 0)) K.text(f, c, "in none", home(0).x, home(0).y - home(0).spread * L.R - 8, { size: 11, align: "center" });
        for (const m of members) dot(c, [m.x, m.y], 3, effective(f, m) === 7 ? C.accent : C.fg, effective(f, m) === 7 ? 1 : 0.65);
        f.api.out("all", on(f, 0) && on(f, 1) && on(f, 2) ? `${countIn(f, 7)} of ${members.length}` : "—");
      },
    });
    document.querySelectorAll('[data-toggles="fig-venn"] button').forEach((b) => b.addEventListener("click", () => {
      const api = FS.get("fig-venn");
      api.set(b.dataset.key, api.params[b.dataset.key] > 0.5 ? 0 : 1);
      if (!FS.reduced()) api.play();
    }));
  }

  /* ---------- Radar: two plans on five axes, values at the vertices ---------- */
  {
    const AXES = ["Speed", "Price", "Reliability", "Support", "Security"];
    const PLANS = { a: [8, 4, 8, 7, 8], b: [5, 9, 6, 4, 5], c: [7, 6, 9, 8, 6] };
    const NAMES = { a: "Plan A", b: "Plan B", c: "Plan C" };
    const A = [...PLANS.a];
    let L = null;
    function layout(w) {
      const narrow = w < NARROW;
      const R = narrow ? Math.min(118, w / 2 - 70) : 120;
      return { h: 2 * R + 90, cx: w / 2, cy: R + 40, R };
    }
    const pt = (i, v) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      return [L.cx + Math.cos(a) * L.R * (v / 10), L.cy + Math.sin(a) * L.R * (v / 10)];
    };
    FS.figure("fig-radar", {
      height: (w) => layout(w).h,
      params: {
        other: { value: "b", label: "Compare Plan A with", placement: "inline", options: [{ value: "b", label: "Plan B" }, { value: "c", label: "Plan C" }] },
        ...Object.fromEntries(AXES.map((_, i) => [`o${i}`, { value: PLANS.b[i], min: 0, max: 10, hidden: true }])),
      },
      handles: Object.fromEntries(AXES.map((name, i) => [`a${i}`, {
        label: `Plan A ${name}`,
        description: "Drag along the axis to ask: what if Plan A scored this?",
        radius: 12,
        step: 12,
        get: () => ({ x: pt(i, A[i])[0], y: pt(i, A[i])[1] }),
        set: (f, x, y, phase) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          const v = (((x - L.cx) * Math.cos(a) + (y - L.cy) * Math.sin(a)) / L.R) * 10;
          A[i] = FS.clamp(phase === "drag" ? v : Math.round(v), 0, 10);
          f.api.redraw();
        },
      }])),
      tips: { price: { title: "Price", body: "Higher is cheaper, so bigger is better on every axis." } },
      tipAt: (f, x, y) => { const p = pt(1, 11.5); return Math.hypot(x - p[0], y - p[1]) < 34 ? "price" : null; },
      onParam(f, name, value) {
        if (name === "other") PLANS[value].forEach((v, i) => f.api.set(`o${i}`, v));
      },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        for (const ring of [2.5, 5, 7.5, 10]) {
          c.beginPath();
          AXES.forEach((_, i) => { const p = pt(i, ring); i ? c.lineTo(...p) : c.moveTo(...p); });
          c.closePath();
          c.strokeStyle = C.line;
          c.lineWidth = 1;
          c.stroke();
        }
        AXES.forEach((name, i) => {
          edge(f, c, [pt(i, 0), pt(i, 10)], { color: C.line, width: 1 });
          const p = pt(i, 11.6);
          K.text(f, c, name, p[0], p[1] + 4, { size: 11, weight: 600, color: f.hover === "price" && i === 1 ? C.accent : C.fg, align: Math.abs(p[0] - L.cx) < 4 ? "center" : p[0] > L.cx ? "left" : "right" });
        });
        const other = AXES.map((_, i) => f.v[`o${i}`]);
        const shape = (vals, color, fill, lw) => {
          c.beginPath();
          vals.forEach((v, i) => { const p = pt(i, v); i ? c.lineTo(...p) : c.moveTo(...p); });
          c.closePath();
          c.save();
          c.globalAlpha = fill;
          c.fillStyle = color;
          c.fill();
          c.restore();
          c.strokeStyle = color;
          c.lineWidth = lw;
          c.stroke();
        };
        shape(other, C.muted, 0.08, 1.25);
        shape(A, C.accent, 0.14, 1.75);
        // Values at the vertices: radar hides magnitude otherwise.
        AXES.forEach((_, i) => {
          const p = pt(i, A[i]);
          dot(c, p, f.drag === `a${i}` || f.handleHover === `a${i}` ? 6 : 4.5, C.accent);
          K.label(f, c, A[i].toFixed(A[i] % 1 ? 1 : 0), p[0] + 9, p[1] - 9, { size: 11, color: C.accent });
          const q = pt(i, other[i]);
          K.label(f, c, other[i].toFixed(0), q[0] - 9, q[1] + 10, { size: 11, color: C.muted, align: "right" });
        });
        K.text(f, c, NAMES.a, 0, f.h - 22, { size: 11, weight: 600, color: C.accent });
        K.text(f, c, NAMES[f.params.other], 0, f.h - 6, { size: 11, weight: 600, color: C.muted });
      },
    });
  }

  /* ---------- DP security matrix: who can do what ---------- */
  {
    const ROLES = [["admin", "Admin"], ["analyst", "Analyst"], ["support", "Support"], ["service", "Service account"]];
    const COMPONENTS = ["Customer data", "Billing", "Reports", "Audit log", "Settings"];
    // r = read, w = write, d = delete
    const GRID = {
      admin: ["rwd", "rwd", "rwd", "r", "rwd"],
      analyst: ["r", "r", "r", "", ""],
      support: ["rw", "r", "", "", ""],
      service: ["rw", "", "w", "w", ""],
    };
    let L = null;
    function layout(w) {
      const narrow = w < NARROW;
      const label = narrow ? 96 : 140;
      const cw = (w - label) / ROLES.length;
      return { narrow, h: 40 + COMPONENTS.length * 40 + 8, label, cw, top: 40, rh: 40 };
    }
    const has = (cell, perm) => perm === "any" ? cell.length > 0 : cell.includes(perm);
    FS.figure("fig-matrix", {
      height: (w) => layout(w).h,
      params: {
        role: { value: "all", label: "Role", placement: "inline", options: [{ value: "all", label: "All" }, ...ROLES.map(([v, l]) => ({ value: v, label: v === "service" ? "Service" : l }))] },
        perm: { value: "any", label: "Can", placement: "inline", options: [{ value: "any", label: "Any" }, { value: "w", label: "Write" }, { value: "d", label: "Delete" }] },
        sweep: { value: -1, min: -1, max: 3, hidden: true },
      },
      tips: {
        r: { title: "R: read", body: "Can see the data." },
        w: { title: "W: write", body: "Can change it." },
        d: { title: "D: delete", body: "Can remove it for good. Only admins can." },
      },
      tipAt: (f, x, y) => {
        const col = Math.floor((x - L.label) / L.cw);
        const row = Math.floor((y - L.top) / L.rh);
        if (col < 0 || row < 0 || col >= ROLES.length || row >= COMPONENTS.length) return null;
        const cell = GRID[ROLES[col][0]][row];
        return cell.includes("d") ? "d" : cell.includes("w") ? "w" : cell ? "r" : null;
      },
      onParam(f, name, value) {
        if (name === "role") f.api.set("sweep", value === "all" ? -1 : ROLES.findIndex(([k]) => k === value));
      },
      resize(f) { L = layout(f.w); },
      render(f, c) {
        const C = f.C;
        // The selected role's column: a band that sweeps across to it.
        const s = f.v.sweep;
        if (f.params.role !== "all" || s > -0.98) {
          c.fillStyle = C.surface2;
          c.globalAlpha = FS.clamp(s + 1);
          c.fillRect(L.label + Math.max(0, s) * L.cw, 4, L.cw, L.top + COMPONENTS.length * L.rh - 4);
          c.globalAlpha = 1;
        }
        ROLES.forEach(([k, name], j) => {
          const x = L.label + j * L.cw + L.cw / 2;
          const words = L.narrow && name.includes(" ") ? name.split(" ") : [name];
          words.forEach((wd, n) => K.text(f, c, wd, x, 22 + n * 13 - (words.length - 1) * 6, { size: 11, weight: 600, color: f.params.role === k ? C.fg : C.muted, align: "center" }));
        });
        COMPONENTS.forEach((name, i) => {
          const y = L.top + i * L.rh;
          c.fillStyle = C.line;
          c.fillRect(0, y, f.w, 1);
          K.text(f, c, name, 0, y + L.rh / 2 + 4, { size: L.narrow ? 11 : 12, weight: 600, color: C.fg });
          ROLES.forEach(([k], j) => {
            const cell = GRID[k][i];
            const x = L.label + j * L.cw + L.cw / 2;
            const match = f.params.perm === "any" || has(cell, f.params.perm);
            const roleOn = f.params.role === "all" || f.params.role === k;
            const a = (match ? 1 : 0.18) * (roleOn ? 1 : 0.35);
            if (!cell) { K.text(f, c, "·", x, y + L.rh / 2 + 4, { size: 12, align: "center", alpha: a }); return; }
            const text = cell.toUpperCase().split("").join(" ");
            K.text(f, c, text, x, y + L.rh / 2 + 4, { size: 12, weight: cell.includes("d") ? 700 : 500, color: cell.includes("d") ? C.accent : C.fg, align: "center", alpha: a, mono: true });
          });
        });
        c.fillStyle = C.line;
        c.fillRect(0, L.top + COMPONENTS.length * L.rh, f.w, 1);
      },
    });
  }
})();
