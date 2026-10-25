/* Themes page: one plate per theme, pinned with data-fs-theme, each with live token swatches and a small
   live figure, filtered by search and mode; plus the Harbor example. All figures share one seeded dataset so themes compare fairly. */
(() => {
  const THEMES = window.AV_THEMES || [];
  const TOKENS = ["bg", "surface", "surface-2", "line", "line-strong", "faint", "muted", "fg", "strong", "accent", "c1", "c2", "c3", "c4", "c5", "c6", "good", "bad"];
  const FAMILY = { default: "Default", notebook: "Notebook", omarchy: "Omarchy" };

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
    plate.dataset.id = t.id;
    plate.dataset.mode = t.mode;
    plate.dataset.search = `${t.name} ${t.id}`.toLowerCase();
    const id = `spec-${t.id}`;
    plate.setAttribute("aria-labelledby", `${id}-title`);
    plate.innerHTML = `<header class="fs-head"><h3 class="fs-title" id="${id}-title">${t.name}</h3><span class="fs-status">${t.mode} · ${FAMILY[t.family]}</span></header><div class="fs-stage"><canvas id="${id}" role="img" aria-label="${t.name}: three lines drawn up to a playhead, with a hatched forecast band"></canvas></div><div></div><div class="fs-toolbar"><span class="fs-position"><code>${t.id}</code></span><button type="button" class="use-btn" data-theme="${t.id}" aria-pressed="false" aria-label="Use ${t.name} for this site">Use</button></div>`;
    strip(plate.children[2]);
    return plate;
  }

  const grid = document.getElementById("theme-grid");
  const cards = THEMES.map(card);
  grid?.append(...cards);
  document.querySelectorAll(".specimen .tokens-strip").forEach(strip);
  document.querySelectorAll(".fs-plate canvas[id^='spec-']").forEach((canvas) => specimen(canvas.id));

  // ---------- search and filters ----------
  // State lives in the URL (?q=&mode=) so a filtered view can be shared or reloaded.
  const form = document.querySelector("[data-theme-filters]");
  if (form && grid) {
    const input = form.querySelector('input[name="q"]');
    const clear = form.querySelector(".search-clear");
    const radios = [...form.querySelectorAll('[role="radio"]')];
    const indicator = form.querySelector(".segmented-indicator");
    const count = form.querySelector(".filter-count");
    const empty = document.querySelector(".filter-empty");
    const state = { q: "", mode: "all" };

    const params = new URLSearchParams(location.search);
    state.q = params.get("q") || "";
    if (["dark", "light"].includes(params.get("mode"))) state.mode = params.get("mode");
    input.value = state.q;

    function placeIndicator() {
      const on = radios.find((r) => r.dataset.value === state.mode);
      indicator.style.width = `${on.offsetWidth}px`;
      indicator.style.transform = `translateX(${on.offsetLeft - radios[0].offsetLeft}px)`;
    }

    function render() {
      const words = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      for (const c of cards) {
        const match =
          words.every((w) => c.dataset.search.includes(w)) &&
          (state.mode === "all" || c.dataset.mode === state.mode);
        c.hidden = !match;
        if (match) shown += 1;
      }
      for (const r of radios) {
        const on = r.dataset.value === state.mode;
        r.setAttribute("aria-checked", String(on));
        r.tabIndex = on ? 0 : -1;
      }
      placeIndicator();
      clear.hidden = !state.q;
      count.textContent = shown === cards.length ? `${cards.length} themes` : `${shown} of ${cards.length} themes`;
      empty.hidden = shown > 0;
      if (!shown) {
        const mode = state.mode === "all" ? "" : `${state.mode} `;
        empty.querySelector(".filter-empty-title").textContent = state.q.trim()
          ? `No ${mode}themes match “${state.q.trim()}”.` : `No ${mode}themes match the current filters.`;
      }
      const next = new URLSearchParams();
      if (state.q.trim()) next.set("q", state.q.trim());
      if (state.mode !== "all") next.set("mode", state.mode);
      const query = next.toString();
      history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
    }

    function setMode(value, focus) {
      state.mode = value;
      render();
      if (focus) radios.find((r) => r.dataset.value === value).focus();
    }
    function reset() {
      state.q = "";
      state.mode = "all";
      input.value = "";
      render();
      input.focus();
    }

    form.addEventListener("submit", (e) => e.preventDefault());
    input.addEventListener("input", () => { state.q = input.value; render(); });
    input.addEventListener("keydown", (e) => { if (e.key === "Escape" && input.value) { e.preventDefault(); input.value = ""; state.q = ""; render(); } });
    clear.addEventListener("click", () => { input.value = ""; state.q = ""; render(); input.focus(); });
    radios.forEach((r, i) => {
      r.addEventListener("click", () => setMode(r.dataset.value, false));
      // A radio group: arrows move and select, Home and End jump.
      r.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        let j = null;
        if (step) j = (i + step + radios.length) % radios.length;
        else if (e.key === "Home") j = 0;
        else if (e.key === "End") j = radios.length - 1;
        if (j == null) return;
        e.preventDefault();
        setMode(radios[j].dataset.value, true);
      });
    });
    document.querySelector("[data-clear-filters]")?.addEventListener("click", reset);
    addEventListener("resize", placeIndicator);
    document.fonts?.ready.then(placeIndicator);
    render();
    // The indicator is placed without a transition first, then slides from there on.
    requestAnimationFrame(() => form.querySelector(".segmented").classList.add("is-ready"));
  }

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
