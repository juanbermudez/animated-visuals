function flowFigure(id, { meta, layouts, edges, returns = [], steps, params, H = 46, pill = false, narrowBelow = 560, regions = [] }) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById(id);
  const el = (tag, attrs, parent = svg) => { const n = document.createElementNS(NS, tag); for (const a in attrs) n.setAttribute(a, attrs[a]); parent.append(n); return n; };
  const zones = regions.map((r) => ({ ...r, rect: el("rect", { rx: 12 }), text: el("text", { "font-size": 11, "font-weight": 600, "letter-spacing": "0.08em" }) }));
  for (const z of zones) z.text.textContent = z.label.toUpperCase();
  const norm = (e, ret) => (Array.isArray(e) ? { a: e[0], b: e[1], wide: ret ? "top" : "x", narrow: ret ? "left" : "y" } : e);
  const all = [...edges.map((e) => norm(e, false)), ...returns.map((e) => norm(e, true))];
  const paths = all.map((e) => ({ ...e, path: el("path", { fill: "none" }), length: 1, dots: [0, 1, 2].map(() => el("circle", { r: 3 })), alpha: 1 }));
  const nodes = {};
  for (const key in meta) {
    const n = (nodes[key] = { ...meta[key], alpha: 1 });
    n.g = el("g", { "data-key": key, tabindex: "0", role: "img", "aria-label": `${n.label}: ${n.tip.body}` });
    if (n.tip) { n.g.setAttribute("data-fs-tip", n.tip.body); n.g.setAttribute("data-fs-tip-title", n.tip.title); }
    n.rect = el("rect", { height: H, rx: pill ? H / 2 : 6 }, n.g);
    n.t1 = el("text", { "font-size": 13, "font-weight": 600 }, n.g); n.t1.textContent = n.label;
    n.t2 = el("text", { "font-size": 10.5 }, n.g); n.t2.textContent = n.sub || "";
    n.g.addEventListener("pointerenter", () => FS.get(id).hover(key));
    n.g.addEventListener("pointerleave", () => FS.get(id).hover(null));
    n.g.addEventListener("focus", () => FS.get(id).hover(key));
    n.g.addEventListener("blur", () => FS.get(id).hover(null));
  }
  let L = null;
  function layout(name) {
    L = layouts[name];
    svg.setAttribute("viewBox", `0 0 ${L.box[0]} ${L.box[1]}`);
    for (const key in nodes) {
      const [x, y, w] = L.at[key], n = nodes[key];
      Object.assign(n, { x, y, w });
      n.rect.setAttribute("x", x); n.rect.setAttribute("y", y); n.rect.setAttribute("width", w);
      const pad = pill ? 18 : 14;
      n.t1.setAttribute("x", x + pad); n.t1.setAttribute("y", y + (n.sub ? 20 : 28));
      n.t2.setAttribute("x", x + pad); n.t2.setAttribute("y", y + 35);
    }
    const lanes = { top: 0, left: 0, right: 0 };
    for (const p of paths) {
      const A = nodes[p.a], B = nodes[p.b], mode = name === "wide" ? p.wide : p.narrow;
      let d;
      if (mode === "x") { const p0 = [A.x + A.w, A.y + H / 2], p1 = [B.x, B.y + H / 2], m = (p0[0] + p1[0]) / 2; d = `M${p0} C${m},${p0[1]} ${m},${p1[1]} ${p1}`; }
      else if (mode === "back") { const p0 = [A.x, A.y + H / 2], p1 = [B.x + B.w, B.y + H / 2], m = (p0[0] + p1[0]) / 2; d = `M${p0} C${m},${p0[1]} ${m},${p1[1]} ${p1}`; }
      else if (mode === "y" || mode === "v") {
        const down = B.y >= A.y, cl = (v, n) => Math.min(Math.max(v, n.x + 20), n.x + n.w - 20);
        const ax = A.w > B.w ? cl(B.x + B.w / 2, A) : A.x + A.w / 2, bx = B.w > A.w ? cl(A.x + A.w / 2, B) : B.x + B.w / 2;
        const p0 = [ax, down ? A.y + H : A.y], p1 = [bx, down ? B.y : B.y + H], m = (p0[1] + p1[1]) / 2;
        d = `M${p0} C${p0[0]},${m} ${p1[0]},${m} ${p1}`;
      } else if (mode === "up") {
        const p0 = [A.x + A.w / 2, A.y], p1 = [B.x, B.y + H / 2];
        d = `M${p0} C${p0[0]},${p1[1]} ${p0[0]},${p1[1]} ${p1}`;
      } else if (mode === "top") {
        const y = 10 + 8 * lanes.top++, p0 = [A.x + A.w / 2, A.y], p1 = [B.x + B.w / 2, B.y];
        d = `M${p0} C${p0[0]},${y} ${p0[0]},${y} ${p0[0] - 30},${y} L${p1[0] + 30},${y} C${p1[0]},${y} ${p1[0]},${y} ${p1}`;
      } else {
        const left = mode === "left", x = left ? 6 + 8 * lanes.left++ : L.box[0] - 6 - 8 * lanes.right++;
        const p0 = [left ? A.x : A.x + A.w, A.y + H / 2], p1 = [left ? B.x : B.x + B.w, B.y + H / 2], dir = p1[1] > p0[1] ? 1 : -1;
        d = `M${p0} C${x},${p0[1]} ${x},${p0[1]} ${x},${p0[1] + 30 * dir} L${x},${p1[1] - 30 * dir} C${x},${p1[1]} ${x},${p1[1]} ${p1}`;
      }
      p.path.setAttribute("d", d);
      p.length = p.path.getTotalLength();
    }
  }
  function placeZones(f) {
    for (const z of zones) {
      const keys = typeof z.keys === "function" ? z.keys(f) : z.keys;
      const ns = keys.map((k) => nodes[k]), pad = 14, x0 = Math.min(...ns.map((n) => n.x)) - pad, y0 = Math.min(...ns.map((n) => n.y)) - pad;
      const x1 = Math.max(...ns.map((n) => n.x + n.w)) + pad, y1 = Math.max(...ns.map((n) => n.y + H)) + 30;
      const t = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, e = FS.ease.out(f.stepT);
      z.cur = z.cur ? { x: FS.damp(z.cur.x, t.x, 10, f.dt || 0.016), y: FS.damp(z.cur.y, t.y, 10, f.dt || 0.016), w: FS.damp(z.cur.w, t.w, 10, f.dt || 0.016), h: FS.damp(z.cur.h, t.h, 10, f.dt || 0.016) } : t;
      const c = z.cur;
      z.rect.setAttribute("x", c.x); z.rect.setAttribute("y", c.y); z.rect.setAttribute("width", c.w); z.rect.setAttribute("height", c.h);
      z.text.setAttribute("x", c.x + c.w - 12); z.text.setAttribute("y", c.y + c.h - 10); z.text.setAttribute("text-anchor", "end");
    }
  }
  let phase = 0, current = "";
  const onOf = (f) => { const s = steps[f.step].on; return new Set(typeof s === "function" ? s(f) : s); };
  const shown = (f, n) => !n.when || n.when(f);
  return FS.figure(id, {
    height: (w) => { const Lx = w < narrowBelow ? layouts.narrow : layouts.wide; return (w * Lx.box[1]) / Lx.box[0]; },
    steps, params,
    resize(f) { const name = f.w < narrowBelow ? "narrow" : "wide"; if (name !== current) { current = name; layout(name); } },
    update(f, dt) { phase = (phase + dt * 0.3) % 1; f.dt = dt; },
    render(f) {
      const C = f.C, on = onOf(f), e = FS.ease.out(f.stepT);
      placeZones(f);
      for (const z of zones) { z.rect.setAttribute("fill", C.surface2); z.rect.setAttribute("stroke", C.line); z.rect.setAttribute("opacity", "0.9"); z.text.setAttribute("fill", C.muted); }
      for (const key in nodes) {
        const n = nodes[key], hovered = f.hover === key, lit = on.has(key), vis = shown(f, n);
        const target = !vis ? 0 : lit ? 1 : C.dim;
        n.alpha = f.stepT < 1 ? FS.lerp(n.alpha, target, e) : target;
        n.g.setAttribute("opacity", hovered && vis ? 1 : n.alpha.toFixed(3));
        n.g.style.pointerEvents = vis ? "" : "none";
        n.rect.setAttribute("fill", pill && lit && f.step ? C.fg : C.surface);
        n.rect.setAttribute("stroke", hovered ? C.accent : lit && f.step ? C.fg : C.lineStrong);
        n.rect.setAttribute("stroke-width", hovered ? 1.5 : 1);
        const ink = pill && lit && f.step ? C.surface : C.fg;
        n.t1.setAttribute("fill", ink); n.t2.setAttribute("fill", pill && lit && f.step ? C.surface : C.muted);
      }
      paths.forEach((p, i) => {
        const vis = (!p.when || p.when(f)) && shown(f, nodes[p.a]) && shown(f, nodes[p.b]);
        const active = vis && on.has(p.a) && on.has(p.b);
        const target = !vis ? 0 : active ? 1 : 0.18;
        p.alpha = f.stepT < 1 ? FS.lerp(p.alpha, target, e) : target;
        p.path.setAttribute("stroke", C.muted); p.path.setAttribute("stroke-width", C.edge); p.path.setAttribute("opacity", p.alpha.toFixed(3));
        p.dots.forEach((dot, j) => {
          const u = (phase + j / 3 + i * 0.13) % 1, pt = p.path.getPointAtLength(u * p.length);
          dot.setAttribute("cx", pt.x.toFixed(1)); dot.setAttribute("cy", pt.y.toFixed(1));
          dot.setAttribute("fill", active && f.step ? C.accent : C.fg);
          dot.setAttribute("opacity", (p.alpha * Math.sin(Math.PI * u) * (active ? 1 : 0.5)).toFixed(3));
        });
      });
    },
  });
}

/* ================= Fig 1: one turn on one clock (canvas, real) ================= */
