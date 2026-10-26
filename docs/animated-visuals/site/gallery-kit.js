/* Drawing helpers shared by the gallery's diagram-type figures (canvas, CSS pixels, colors from f.C only).
   Boxes are { x, y, w, h }; paths are arrays of [x, y] points. */
window.GK = (() => {
  const K = FS.k;

  /** A node: rounded box, optional title and subline. o: alpha, active, hot (hover), dash, fill, r, align, size */
  function box(f, c, b, o = {}) {
    const C = f.C;
    c.save();
    c.globalAlpha *= o.alpha ?? 1;
    K.rrect(c, b.x, b.y, b.w, b.h, o.r ?? 6);
    c.fillStyle = o.fill || C.node;
    c.fill();
    if (o.dash) c.setLineDash(o.dash);
    c.strokeStyle = o.hot ? C.accent : o.active ? C.fg : C.lineStrong;
    c.lineWidth = o.lw ?? (o.hot ? 1.5 : o.active ? 1.25 : 1);
    c.stroke();
    c.setLineDash([]);
    const size = o.size || 12;
    const left = o.align === "left";
    const tx = left ? b.x + 10 : b.x + b.w / 2;
    if (o.title) {
      const ty = o.sub ? b.y + b.h / 2 - 3 : b.y + b.h / 2 + size * 0.36;
      K.text(f, c, o.title, tx, ty, { size, weight: 600, color: o.titleColor || C.fg, align: left ? "left" : "center" });
    }
    if (o.sub) K.text(f, c, o.sub, tx, b.y + b.h / 2 + 12, { size: 11, color: C.muted, align: left ? "left" : "center" });
    c.restore();
  }

  function path(c, pts) {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  }

  /** A connector. o: color, width, alpha, dash, arrow (head at the end) */
  function edge(f, c, pts, o = {}) {
    c.save();
    c.globalAlpha *= o.alpha ?? 1;
    c.strokeStyle = o.color || f.C.muted;
    c.lineWidth = o.width || f.C.edge;
    c.lineJoin = "round";
    if (o.dash) c.setLineDash(o.dash);
    // Thin lines land on pixel centers so they stay crisp instead of smearing across two pixels.
    const snap = (v) => Math.round(v - 0.5) + 0.5;
    path(c, c.lineWidth <= 1.5 ? pts.map(([x, y]) => [snap(x), snap(y)]) : pts);
    c.stroke();
    c.setLineDash([]);
    if (o.arrow) {
      const [x2, y2] = pts[pts.length - 1];
      const [x1, y1] = pts[pts.length - 2];
      const a = Math.atan2(y2 - y1, x2 - x1);
      c.fillStyle = o.color || f.C.muted;
      c.beginPath();
      c.moveTo(x2, y2);
      c.lineTo(x2 - 7 * Math.cos(a - 0.42), y2 - 7 * Math.sin(a - 0.42));
      c.lineTo(x2 - 7 * Math.cos(a + 0.42), y2 - 7 * Math.sin(a + 0.42));
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  const length = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  /** The point a fraction u (0..1) of the way along a path. */
  function at(pts, u) {
    let d = FS.clamp(u) * length(pts);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const s = Math.hypot(x1 - x0, y1 - y0);
      if (d <= s || i === pts.length - 1) {
        const k = s ? Math.min(1, d / s) : 0;
        return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
      }
      d -= s;
    }
    return pts[pts.length - 1];
  }

  function dot(c, p, r, color, alpha = 1) {
    c.save();
    c.globalAlpha *= alpha;
    c.fillStyle = color;
    c.beginPath();
    c.arc(p[0], p[1], r, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /** n packets on one path, sharing one hop duration and separated by fixed phase offsets. */
  function packets(f, c, pts, phase, n = 3, o = {}) {
    for (let i = 0; i < n; i++) {
      const travel = FS.travel(f.t, phase + i / n);
      dot(c, at(pts, travel.u), o.r || 3, o.color || f.C.accent, travel.alpha);
    }
  }

  /** An elbow connector between two boxes, leaving and entering at side midpoints. */
  function link(a, b, dir) {
    const horizontal = dir ? dir === "x" : Math.abs(b.x + b.w / 2 - (a.x + a.w / 2)) > Math.abs(b.y + b.h / 2 - (a.y + a.h / 2));
    if (horizontal) {
      const right = b.x > a.x;
      const p0 = [right ? a.x + a.w : a.x, a.y + a.h / 2];
      const p1 = [right ? b.x : b.x + b.w, b.y + b.h / 2];
      if (Math.abs(p0[1] - p1[1]) < 0.5) return [p0, p1];
      const m = (p0[0] + p1[0]) / 2;
      return [p0, [m, p0[1]], [m, p1[1]], p1];
    }
    const down = b.y > a.y;
    const p0 = [a.x + a.w / 2, down ? a.y + a.h : a.y];
    const p1 = [b.x + b.w / 2, down ? b.y : b.y + b.h];
    if (Math.abs(p0[0] - p1[0]) < 0.5) return [p0, p1];
    const m = (p0[1] + p1[1]) / 2;
    return [p0, [p0[0], m], [p1[0], m], p1];
  }

  const inside = (b, x, y, pad = 0) => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
  /** The first key in a { key: box } map whose box contains the point. */
  function hit(boxes, x, y) {
    for (const key in boxes) if (boxes[key] && inside(boxes[key], x, y)) return key;
    return null;
  }

  /** Clicks on a canvas, in the figure's CSS pixels; divides out the expanded view's scale. getF returns the
      figure state (keep it from resize). Keyboard paths are separate controls. */
  function onClick(id, getF, fn) {
    const el = document.getElementById(id);
    el.addEventListener("click", (e) => {
      const f = getF();
      if (!f || f.drag) return;
      const r = el.getBoundingClientRect();
      const z = f.w ? r.width / f.w : 1;
      fn((e.clientX - r.left) / z, (e.clientY - r.top) / z);
    });
  }

  /** Mix two numbers or two points. */
  const mix = (a, b, t) => (Array.isArray(a) ? [FS.lerp(a[0], b[0], t), FS.lerp(a[1], b[1], t)] : FS.lerp(a, b, t));
  const mixBox = (a, b, t) => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), w: mix(a.w, b.w, t), h: mix(a.h, b.h, t) });

  /** Toggle buttons in an .event-row that set a figure's params; keeps aria-pressed in sync. */
  function toggles(id, onChange) {
    const row = document.querySelector(`[data-toggles="${id}"]`);
    const buttons = [...row.querySelectorAll("button")];
    const sync = (state) => buttons.forEach((b) => b.setAttribute("aria-pressed", String(!!state[b.dataset.key])));
    buttons.forEach((b) => b.addEventListener("click", () => onChange(b.dataset.key, sync)));
    return sync;
  }

  return { box, edge, path, at, dot, packets, link, hit, inside, onClick, mix, mixBox, length, toggles, K };
})();
