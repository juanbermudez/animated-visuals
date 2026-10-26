/* Customize page: the prose-driven chart (adapted from the starter template) and the API buttons. */

/* An explorable chart: the smoothing lives in the sentence, and every number in it is computed. */
(() => {
  const r = FS.rng(42);
  const N = 300;
  const PEAK = 0.62;
  const base = (x) => 0.24 + 0.95 * Math.exp(-6 * x);
  const bump = (x) => 0.09 * Math.exp(-((x - PEAK) ** 2) / 0.0018);
  const xs = Array.from({ length: N }, (_, i) => i / (N - 1));
  const clean = xs.map((x) => base(x) + bump(x));
  const raw = clean.map((v) => v + 0.03 * FS.gauss(r));
  const ema = (arr, a) => { const out = []; let s = arr[0]; for (const v of arr) { s = a * s + (1 - a) * v; out.push(s); } return out; };
  const argmax = (arr) => arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0);
  const rawPeak = argmax(clean.map((v, i) => v - base(xs[i])));
  // The claim is measured on the noiseless signal, so it does not depend on the noise draw.
  function measure(a) {
    const smoothedBase = ema(xs.map(base), a);
    const diff = ema(clean, a).map((v, i) => v - smoothedBase[i]);
    const at = argmax(diff);
    return { height: diff[at], lag: at - rawPeak };
  }
  let hoverX = null;
  const fig = FS.figure("demo-curve", {
    height: (w) => (w < 560 ? 220 : 260),
    autoplay: false,
    params: {
      smooth: { value: 0.9, min: 0, max: 0.98, step: 0.01, label: "Smoothing", hidden: true, format: (v) => v.toFixed(2) },
      showRaw: { value: true, label: "Show raw series" },
    },
    onParam(f) {
      const m = measure(f.params.smooth);
      f.api.out("bump", m.height.toFixed(3));
      f.api.out("lag", String(m.lag));
    },
    resize(f) {
      f.el.onpointermove = (e) => { const b = f.el.getBoundingClientRect(); hoverX = (e.clientX - b.left) / b.width; f.api.redraw(); };
      f.el.onpointerleave = () => { hoverX = null; f.api.redraw(); };
    },
    render(f, c) {
      const C = f.C;
      const L = 40;
      const Rm = f.w - (f.w < 560 ? 64 : 104);
      const T = 14;
      const B = f.h - 26;
      const X = (i) => L + (Rm - L) * (i / (N - 1));
      const Y = (v) => B - (B - T) * (v / 1.3);
      c.strokeStyle = C.line;
      c.lineWidth = 1;
      for (const v of [0, 0.4, 0.8, 1.2]) { FS.k.line(c, L, Y(v), Rm, Y(v)); FS.k.text(f, c, v.toFixed(1), L - 8, Y(v) + 4, { align: "right", size: 11 }); }
      FS.k.text(f, c, "step", Rm, f.h - 6, { align: "right", size: 11 });
      const lit = f.hover === "plateau";
      c.fillStyle = lit ? C.lineStrong : C.surface2;
      c.fillRect(X(rawPeak - 22), T, X(rawPeak + 22) - X(rawPeak - 22), B - T);
      FS.k.text(f, c, "plateau", X(rawPeak), f.h - 6, { align: "center", size: 11, color: lit ? C.fg : C.muted });
      const s = ema(raw, f.v.smooth);
      c.lineJoin = "round";
      if (f.params.showRaw) {
        c.strokeStyle = C.muted;
        c.globalAlpha = 0.5;
        c.lineWidth = 1;
        c.beginPath();
        raw.forEach((v, i) => (i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v))));
        c.stroke();
        c.globalAlpha = 1;
      }
      c.strokeStyle = C.fg;
      c.lineWidth = C.series;
      c.beginPath();
      s.forEach((v, i) => (i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v))));
      c.stroke();
      const m = measure(f.v.smooth);
      const at = rawPeak + m.lag;
      c.fillStyle = C.muted; c.beginPath(); c.arc(X(rawPeak), Y(clean[rawPeak]), 3, 0, 7); c.fill();
      c.fillStyle = C.accent; c.beginPath(); c.arc(X(at), Y(s[at]), 3.5, 0, 7); c.fill();
      const ends = [{ text: f.w < 560 ? s[N - 1].toFixed(2) : `smoothed ${s[N - 1].toFixed(2)}`, y: Y(s[N - 1]), color: C.fg }, { text: "raw", y: Y(raw[N - 1]), color: C.muted }].sort((a, b) => a.y - b.y);
      if (ends[1].y - ends[0].y < 14) ends[1].y = ends[0].y + 14;
      for (const e of ends) if (e.text !== "raw" || f.params.showRaw) FS.k.label(f, c, e.text, Rm + 8, e.y, { size: 11, color: e.color });
      if (hoverX !== null) {
        const i = Math.round(FS.clamp((hoverX * f.w - L) / (Rm - L)) * (N - 1));
        c.strokeStyle = C.lineStrong;
        c.setLineDash([3, 3]);
        FS.k.line(c, X(i), T, X(i), B);
        c.setLineDash([]);
        c.fillStyle = C.fg; c.beginPath(); c.arc(X(i), Y(s[i]), 3.5, 0, 7); c.fill();
        const text = `step ${i} · smoothed ${s[i].toFixed(3)}`;
        const right = X(i) + 8 + 170 < f.w;
        FS.k.label(f, c, text, right ? X(i) + 8 : X(i) - 8, T + 8, { size: 11, align: right ? "left" : "right" });
      }
    },
  });
  fig.out("rawBump", (clean[rawPeak] - base(xs[rawPeak])).toFixed(3));
  fig.set("smooth", 0.9, { instant: true });
})();

/* Each button runs the line of code written on it. */
(() => {
  const out = document.getElementById("api-result");
  document.querySelectorAll("[data-api] button").forEach((b) => {
    b.addEventListener("click", () => {
      const code = b.textContent.trim();
      try {
        const result = new Function(`return (${code});`)();
        const shown = result === undefined ? "done" : JSON.stringify(result, (k, v) => (typeof v === "number" ? +v.toFixed(3) : v));
        out.textContent = `> ${code}\n${shown}`;
      } catch (error) {
        out.textContent = `> ${code}\n${error.message}`;
      }
    });
  });
})();
