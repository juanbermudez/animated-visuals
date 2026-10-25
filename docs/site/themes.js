/* Themes page: one plate per theme, pinned with data-fs-theme, each with live token swatches and a small
   live figure; plus the Harbor example. All figures share one seeded dataset so themes compare fairly. */
(() => {
  const THEMES = window.AV_THEMES || [];
  const TOKENS = ["bg", "surface", "surface-2", "line", "line-strong", "faint", "muted", "fg", "strong", "accent", "c1", "c2", "c3", "c4", "c5", "c6", "good", "bad"];
  const FAMILY = { zef: "Zef", register: "Register", omarchy: "Omarchy" };

  const r = FS.rng(5);
  const N = 36;
  const series = [0, 1, 2].map((s) => {
    let v = 0.3 + s * 0.18;
    return Array.from({ length: N }, (_, i) => {
      v = FS.clamp(v + (r() - 0.5) * 0.08 + Math.sin(i / 5 + s * 2) * 0.018, 0.1, 0.9);
      return v;
    });
  });
  const NAMES = ["North", "East", "South"];
  const DURATION = 2.4;
  const FORECAST = 0.72;

  function strip(el) {
    el.className = "tokens-strip";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = TOKENS.map((t) => `<i style="background:var(--fs-${t})" title="--fs-${t}"></i>`).join("");
  }

  function specimen(id) {
    return FS.figure(id, {
      height: () => 148,
      duration: DURATION,
      expand: false,
      timeAxis: (f) => ({ x0: 10, x1: f.w - 56 }),
      render(f, c) {
        const C = f.C;
        const L = 10;
        const R = f.w - 56;
        const T = 10;
        const B = f.h - 24;
        const X = (i) => L + (R - L) * (i / (N - 1));
        const Y = (v) => B - (B - T) * v;
        const now = FS.clamp(f.t / DURATION) * (N - 1);
        c.strokeStyle = C.line;
        c.lineWidth = 1;
        for (const v of [0.25, 0.5, 0.75]) FS.k.line(c, L, Y(v), R, Y(v));
        // Two kinds of time without hue: the forecast is hatched.
        const fx = X(FORECAST * (N - 1));
        c.fillStyle = FS.k.hatch(f, c, C.lineStrong, 6);
        c.fillRect(fx, T, R - fx, B - T);
        FS.k.text(f, c, "measured", L, f.h - 6, { size: 11 });
        FS.k.text(f, c, "forecast", R, f.h - 6, { size: 11, align: "right" });
        c.lineJoin = "round";
        c.lineCap = "round";
        series.forEach((s, k) => {
          const last = Math.floor(now);
          const frac = now - last;
          c.strokeStyle = C.c[k];
          c.lineWidth = k === 0 ? C.series : 1.25;
          c.beginPath();
          for (let i = 0; i <= last; i++) (i ? c.lineTo(X(i), Y(s[i])) : c.moveTo(X(i), Y(s[i])));
          if (last < N - 1) c.lineTo(X(now), Y(FS.lerp(s[last], s[last + 1], frac)));
          c.stroke();
        });
        // Direct labels at the line ends, pushed apart so they never touch.
        const ends = series
          .map((s, k) => {
            const last = Math.min(N - 2, Math.floor(now));
            return { k, y: Y(FS.lerp(s[last], s[last + 1], Math.min(1, now - last))) };
          })
          .sort((a, b) => a.y - b.y);
        for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
        for (const e of ends) FS.k.label(f, c, NAMES[e.k], Math.min(X(now), R) + 8, e.y, { size: 11, color: C.c[e.k], weight: 500 });
        FS.k.hoverTime(f, c, T + 12, B, (t) => L + (R - L) * (t / DURATION), (t) => `${Math.round((t / DURATION) * 100)}%`);
        if (f.t < DURATION - 1e-3 || f.drag) FS.k.playhead(f, c, X(now), T, B);
      },
    });
  }

  function card(t) {
    const plate = document.createElement("figure");
    plate.className = "fs-plate";
    plate.dataset.fsTheme = t.attr;
    const id = `spec-${t.id}`;
    plate.setAttribute("aria-labelledby", `${id}-title`);
    plate.innerHTML = `<header class="fs-head"><h3 class="fs-title" id="${id}-title">${t.name}</h3><span class="fs-status">${t.mode} · ${FAMILY[t.family]}</span></header><div class="fs-stage"><canvas id="${id}" role="img" aria-label="${t.name}: three lines drawn up to a playhead, with a hatched forecast band"></canvas></div><div></div><div class="fs-toolbar"><span class="fs-position">Drag to replay</span><button type="button" class="use-btn" data-theme="${t.id}" aria-pressed="false" aria-label="Use ${t.name} for this site">Use</button></div>`;
    strip(plate.children[2]);
    return plate;
  }

  document.querySelectorAll(".theme-grid").forEach((grid) => {
    const families = grid.dataset.family.split(" ");
    const mode = grid.dataset.mode;
    for (const t of THEMES) if (families.includes(t.family) && (!mode || t.mode === mode)) grid.append(card(t));
  });
  document.querySelectorAll(".specimen .tokens-strip").forEach(strip);
  document.querySelectorAll(".fs-plate canvas[id^='spec-']").forEach((canvas) => specimen(canvas.id));

  function syncUse() {
    const id = window.AV?.currentTheme();
    document.querySelectorAll(".use-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.theme === id)));
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.(".use-btn");
    if (b) window.AV?.applyTheme(b.dataset.theme);
  });
  document.addEventListener("av:theme", syncUse);
  // site.js is deferred, so window.AV exists once the page has parsed.
  addEventListener("DOMContentLoaded", syncUse);
})();
