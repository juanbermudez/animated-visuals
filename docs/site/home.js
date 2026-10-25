/* Home hero: a stepped architecture flow with packets, linked to words in the page. Synthetic timings.
   The SVG is laid out in CSS pixels (viewBox = its own size), so text stays at its real size: two layouts
   instead of shrinking, picked by width. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("fig-hero");
  const make = (tag, attrs, parent = svg) => {
    const n = document.createElementNS(NS, tag);
    for (const a in attrs) n.setAttribute(a, attrs[a]);
    parent.append(n);
    return n;
  };
  const H = 46;
  const meta = {
    input: { label: "Input", sub: "event stream", tip: "Events arriving from outside: a message, a click, a sensor reading." },
    router: { label: "Router", sub: "decides · 4 ms", tip: "Looks at each event and picks a path. It is cheap, so everything goes through it." },
    model: { label: "Model", sub: "slow · 900 ms", tip: "The expensive path. Only events the system has not seen before need it." },
    memory: { label: "Memory", sub: "fast · 20 ms", tip: "Answers from what it already knows. Most events end here." },
    output: { label: "Output", sub: "response", tip: "Where the answer leaves the system." },
  };
  const edges = [["input", "router"], ["router", "model"], ["router", "memory"], ["model", "output"], ["memory", "output"]];
  const steps = [
    { on: Object.keys(meta), caption: "The whole path. Packets flow from input to output." },
    { on: ["input", "router"], caption: "Every event reaches the router first, and that costs a few milliseconds." },
    { on: ["router", "memory", "output"], caption: "Most events are answered from memory, without the model." },
    { on: ["router", "model", "output"], caption: "Only new kinds of events take the slow path through the model." },
  ];
  const edgeLayer = make("g", {});
  const nodeLayer = make("g", {});
  const paths = edges.map(([a, b]) => ({ a, b, path: make("path", { fill: "none" }, edgeLayer), length: 1, alpha: 1, dots: [0, 1, 2].map(() => make("circle", { r: 3 }, edgeLayer)) }));
  const nodes = {};
  for (const key in meta) {
    const n = (nodes[key] = { ...meta[key], alpha: 1 });
    n.g = make("g", { tabindex: "0", role: "img", "aria-label": `${n.label}, ${n.sub}`, "data-fs-tip": n.tip, "data-fs-tip-title": n.label }, nodeLayer);
    n.rect = make("rect", { height: H, rx: 6 }, n.g);
    n.t1 = make("text", { "font-size": 13, "font-weight": 600 }, n.g);
    n.t1.textContent = n.label;
    n.t2 = make("text", { "font-size": 11 }, n.g);
    n.t2.textContent = n.sub;
    const on = () => FS.get("fig-hero")?.hover(key);
    const off = () => FS.get("fig-hero")?.hover(null);
    n.g.addEventListener("pointerenter", on);
    n.g.addEventListener("pointerleave", off);
    n.g.addEventListener("focus", on);
    n.g.addEventListener("blur", off);
  }

  function layoutFor(w) {
    if (w >= 700) {
      const nw = Math.min(150, Math.max(120, w * 0.16));
      const s = (w - 16 - nw) / 3;
      const mid = 130 - H / 2;
      return { h: 260, dir: "x", at: { input: [8, mid, nw], router: [8 + s, mid, nw], model: [8 + 2 * s, mid - 82, nw], memory: [8 + 2 * s, mid + 82, nw], output: [8 + 3 * s, mid, nw] } };
    }
    const cw = Math.min(220, w - 40);
    const bw = Math.min(170, (w - 28) / 2);
    const cx = w / 2;
    return { h: 372, dir: "y", at: { input: [cx - cw / 2, 8, cw], router: [cx - cw / 2, 104, cw], model: [cx - 6 - bw, 210, bw], memory: [cx + 6, 210, bw], output: [cx - cw / 2, 316, cw] } };
  }
  function layout(f) {
    const L = layoutFor(f.w);
    svg.setAttribute("viewBox", `0 0 ${f.w} ${f.h}`);
    for (const key in nodes) {
      const [x, y, w] = L.at[key];
      const n = nodes[key];
      Object.assign(n, { x, y, w });
      n.rect.setAttribute("x", x);
      n.rect.setAttribute("y", y);
      n.rect.setAttribute("width", w);
      n.t1.setAttribute("x", x + 14);
      n.t1.setAttribute("y", y + 20);
      n.t2.setAttribute("x", x + 14);
      n.t2.setAttribute("y", y + 36);
    }
    for (const p of paths) {
      const A = nodes[p.a];
      const B = nodes[p.b];
      let d;
      if (L.dir === "x") {
        const p0 = [A.x + A.w, A.y + H / 2];
        const p1 = [B.x, B.y + H / 2];
        const m = (p0[0] + p1[0]) / 2;
        d = `M${p0} C${m},${p0[1]} ${m},${p1[1]} ${p1}`;
      } else {
        const p0 = [A.x + A.w / 2, A.y + H];
        const p1 = [B.x + B.w / 2, B.y];
        const m = (p0[1] + p1[1]) / 2;
        d = `M${p0} C${p0[0]},${m} ${p1[0]},${m} ${p1}`;
      }
      p.path.setAttribute("d", d);
      p.length = p.path.getTotalLength();
    }
  }

  let phase = 0;
  FS.figure("fig-hero", {
    height: (w) => layoutFor(w).h,
    steps,
    resize: layout,
    update(f, dt) { phase = (phase + dt * 0.3) % 1; },
    render(f) {
      const C = f.C;
      const on = new Set(steps[f.step].on);
      const e = FS.ease.out(f.stepT);
      for (const key in nodes) {
        const n = nodes[key];
        const hovered = f.hover === key;
        const target = on.has(key) ? 1 : C.dim;
        n.alpha = f.stepT < 1 ? FS.lerp(n.alpha, target, e) : target;
        n.g.setAttribute("opacity", hovered ? 1 : n.alpha.toFixed(3));
        n.rect.setAttribute("fill", C.surface);
        n.rect.setAttribute("stroke", hovered ? C.accent : on.has(key) && f.step ? C.fg : C.lineStrong);
        n.rect.setAttribute("stroke-width", hovered ? 1.5 : 1);
        n.t1.setAttribute("fill", C.fg);
        n.t2.setAttribute("fill", C.muted);
      }
      paths.forEach((p, i) => {
        const active = on.has(p.a) && on.has(p.b);
        p.alpha = f.stepT < 1 ? FS.lerp(p.alpha, active ? 1 : 0.18, e) : active ? 1 : 0.18;
        p.path.setAttribute("stroke", C.muted);
        p.path.setAttribute("stroke-width", C.edge);
        p.path.setAttribute("opacity", p.alpha.toFixed(3));
        p.dots.forEach((dot, j) => {
          const u = (phase + j / 3 + i * 0.13) % 1;
          const pt = p.path.getPointAtLength(u * p.length);
          dot.setAttribute("cx", pt.x.toFixed(1));
          dot.setAttribute("cy", pt.y.toFixed(1));
          dot.setAttribute("fill", active && f.step ? C.accent : C.fg);
          dot.setAttribute("opacity", (p.alpha * Math.sin(Math.PI * u)).toFixed(3));
        });
      });
    },
  });
})();
