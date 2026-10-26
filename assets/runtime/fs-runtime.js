/* Animated Visuals runtime. Global `FS` (from the project's first name, Figure Studio). No dependencies.
 *
 * A figure is a pure function of its state: one clock `t` (a timeline or a running process),
 * a discrete `step`, and named `params` that ease toward their targets. Play, scrub, step,
 * parameter changes, prose links and agents all go through one controller, so any state can
 * be shown, linked to and verified.
 *
 *   const fig = FS.figure('fig-id', { height, duration, loop, chapters, steps, params,
 *                                     init, update, render, settle });
 *   fig.play() .pause() .seek(t) .chapter(±1) .goto(n) .next() .prev()
 *      .set(name, value) .reset() .state() .apply(state) .on(event, fn) .out(name, text) .redraw()
 *   FS.get(id), FS.list(), FS.setTheme(name, scope?), FS.setMode('light' | 'dark' | null)
 *
 * Declarative bindings (any element on the page):
 *   data-fs="id play|next|prev|reset|chapter-next|chapter-prev"   buttons
 *   data-fs-param="id:name"   range/number/select/checkbox, two-way
 *   data-fs-seek="id"         range input over the timeline
 *   data-fs-out="id:name"     text output: a param, or t, step, caption, or anything set by fig.out()
 *   data-fs-dots="id"         step dots
 *   data-fs-scrub="id:name"   a number in prose that can be dragged or arrowed
 *   data-fs-ref="id:key"      a word in prose linked to part `key` of the figure (hover/focus both ways)
 *   data-fs-tip="text"        a short explanation shown after a hover delay (title in data-fs-tip-title)
 *
 * Timelines: spec.timeAxis(f) -> { x0, x1 } makes the whole drawing a scrub surface (drag, click, flick);
 * the clock glides to every target (seek(t, { animate: true })). spec.tips + spec.tipAt(f, x, y) explain
 * drawn parts on hover. Every plate gets an expand button that opens it nearly full screen.
 */
((global) => {
  
  const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const figures = new Map();
  let raf = 0;
  let last = 0;

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const remap = (x, a, b, c, d) => c + (d - c) * clamp((x - a) / (b - a));
  /** Frame-rate independent approach to a target. lambda ≈ 4 soft … 14 snappy. */
  const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));
  const POINTER_FOLLOW_TAU = 0.085;
  const POINTER_FOLLOW_EPSILON = 0.3;
  /**
   * Advance a point toward a moving target with a frame-rate independent exponential approach.
   * Returns true once both axes are within `epsilon` px and snaps to the exact target. The state
   * retains both the drawn position and latest target so a new target redirects it mid-flight.
   */
  function follow(state, target, dt, options = {}) {
    const tau = Math.max(1e-4, options.tau ?? POINTER_FOLLOW_TAU);
    const epsilon = Math.max(0, options.epsilon ?? POINTER_FOLLOW_EPSILON);
    state.target = { x: target.x, y: target.y };
    if (!Number.isFinite(state.x) || !Number.isFinite(state.y)) {
      state.x = target.x;
      state.y = target.y;
      return true;
    }
    if (options.snap ?? reducedQuery.matches) {
      state.x = target.x;
      state.y = target.y;
      return true;
    }
    const lambda = 1 / tau;
    state.x = damp(state.x, target.x, lambda, dt);
    state.y = damp(state.y, target.y, lambda, dt);
    if (Math.hypot(state.x - target.x, state.y - target.y) > epsilon) return false;
    state.x = target.x;
    state.y = target.y;
    return true;
  }
  /** Critically damped spring (smooth damp); keeps velocity across target changes. */
  function spring(s, target, smoothTime, dt) {
    const omega = 2 / Math.max(1e-4, smoothTime);
    const x = omega * dt;
    const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = s.value - target;
    const temp = (s.velocity + omega * change) * dt;
    s.velocity = (s.velocity - omega * temp) * decay;
    s.value = target + (change + temp) * decay;
    return s;
  }
  const ease = {
    smooth: (t) => t * t * t * (t * (6 * t - 15) + 10),
    out: (t) => 1 - (1 - t) ** 3,
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  };
  /** Ease one hop from node to node. Linear single-speed travel is intentionally not exposed. */
  const hop = (u) => ease.inOut(clamp(u));
  /**
   * Repeating packet travel on the figure clock. A hop takes 1.25 s, then dwells for 0.15 s at
   * the destination while fading out. `phase` offsets packets on the same edge without changing speed.
   */
  function travel(t, phase = 0, duration = 1.25, dwell = 0.15) {
    const cycle = Math.max(1e-6, duration + dwell);
    const cycles = t / cycle + phase;
    const index = Math.floor(cycles);
    const elapsed = ((cycles % 1) + 1) % 1 * cycle;
    const p = clamp(elapsed / Math.max(1e-6, duration));
    const dwelling = elapsed >= duration;
    const alpha = dwelling
      ? 1 - ease.out(clamp((elapsed - duration) / Math.max(1e-6, dwell)))
      : ease.out(clamp(p / 0.08));
    return { u: hop(p), alpha, dwelling, index };
  }
  /** Progress of t through [t0, t1], eased; the building block of declared timelines. */
  const window_ = (t, t0, t1, fn = ease.smooth) => fn(clamp((t - t0) / Math.max(1e-6, t1 - t0)));
  function rng(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

  // ---------- theme tokens ----------
  const COLOR_TOKENS = ["bg", "surface", "surface-2", "node", "line", "line-strong", "faint", "muted", "fg", "strong", "accent", "good", "bad", "c1", "c2", "c3", "c4", "c5", "c6"];
  const camel = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());
  function readTheme(f) {
    // Resolve through a probe inside the figure so per-figure themes and var() chains work in canvas.
    // One probe per token: reading them all costs one style pass, cheap enough to repeat every frame of a theme tween.
    if (!f.probes) {
      const box = document.createElement("span");
      box.hidden = true;
      f.probes = COLOR_TOKENS.map((token) => {
        const probe = document.createElement("span");
        probe.style.color = token === "node" ? "var(--fs-node, var(--fs-surface-2))" : `var(--fs-${token})`;
        box.append(probe);
        return probe;
      });
      f.plate.append(box);
    }
    const C = { c: [] };
    COLOR_TOKENS.forEach((token, i) => {
      const value = getComputedStyle(f.probes[i]).color;
      if (/^c\d$/.test(token)) C.c.push(value);
      else C[camel(token)] = value;
    });
    const cs = getComputedStyle(f.plate);
    C.font = cs.getPropertyValue("--fs-font-figure").trim() || "system-ui, sans-serif";
    C.mono = cs.getPropertyValue("--fs-font-mono").trim() || "ui-monospace, monospace";
    C.dim = parseFloat(cs.getPropertyValue("--fs-dim")) || 0.28;
    C.edge = parseFloat(cs.getPropertyValue("--fs-stroke-edge")) || 1.1;
    C.series = parseFloat(cs.getPropertyValue("--fs-stroke-series")) || 1.75;
    f.C = C;
    f.patterns = {};
    f.dirty = true;
  }

  // ---------- canvas kit ----------
  const k = {
    font: (f, size = 11, weight = 400, mono = false) => `${weight} ${size}px ${mono ? f.C.mono : f.C.font}`,
    text(f, c, s, x, y, o = {}) {
      c.font = k.font(f, o.size || 11, o.weight || 400, o.mono);
      c.fillStyle = o.color || f.C.muted;
      c.textAlign = o.align || "left";
      c.textBaseline = o.base || "alphabetic";
      // Multiplies with the caller's alpha and restores it, so faded groups stay faded.
      const prev = c.globalAlpha;
      c.globalAlpha = prev * (o.alpha == null ? 1 : o.alpha);
      c.fillText(s, x, y);
      c.globalAlpha = prev;
    },
    /** Text with a halo in the stage color so it stays legible over marks. */
    label(f, c, s, x, y, o = {}) {
      c.save();
      c.font = k.font(f, o.size || 11, o.weight || 500, o.mono);
      c.textAlign = o.align || "left";
      c.textBaseline = o.base || "middle";
      c.lineJoin = "round";
      c.lineWidth = 4;
      c.strokeStyle = o.halo || f.C.surface;
      c.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      c.strokeText(s, x, y);
      c.fillStyle = o.color || f.C.fg;
      c.fillText(s, x, y);
      c.restore();
    },
    line(c, x1, y1, x2, y2) {
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
    },
    arrow(c, x1, y1, x2, y2, color, width = 1.1) {
      c.strokeStyle = color;
      c.fillStyle = color;
      c.lineWidth = width;
      k.line(c, x1, y1, x2, y2);
      const a = Math.atan2(y2 - y1, x2 - x1);
      c.beginPath();
      c.moveTo(x2, y2);
      c.lineTo(x2 - 7 * Math.cos(a - 0.42), y2 - 7 * Math.sin(a - 0.42));
      c.lineTo(x2 - 7 * Math.cos(a + 0.42), y2 - 7 * Math.sin(a + 0.42));
      c.closePath();
      c.fill();
    },
    rrect(c, x, y, w, h, r) {
      c.beginPath();
      c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h);
    },
    /** Diagonal hatch: a second state that reads without hue. */
    hatch(f, c, color, gap = 5) {
      const key = color + gap + f.dpr;
      if (!f.patterns[key]) {
        const s = Math.max(2, Math.round(gap * f.dpr));
        const tile = document.createElement("canvas");
        tile.width = tile.height = s;
        const g = tile.getContext("2d");
        g.strokeStyle = color;
        g.lineWidth = Math.max(1, 1.1 * f.dpr);
        g.beginPath();
        g.moveTo(-1, s + 1); g.lineTo(s + 1, -1);
        g.moveTo(-1, 1); g.lineTo(1, -1);
        g.moveTo(s - 1, s + 1); g.lineTo(s + 1, s - 1);
        g.stroke();
        const p = c.createPattern(tile, "repeat");
        p.setTransform?.(new DOMMatrix().scale(1 / f.dpr));
        f.patterns[key] = p;
      }
      return f.patterns[key];
    },
    /** A bracket between x0 and x1 with end ticks and a centered label (e.g. a computed saving). */
    bracket(f, c, x0, x1, y, text, o = {}) {
      c.strokeStyle = o.color || f.C.fg;
      c.lineWidth = 1.2;
      c.globalAlpha = o.alpha == null ? 1 : o.alpha;
      c.beginPath();
      c.moveTo(x0, y - 6); c.lineTo(x0, y + 6);
      c.moveTo(x0, y); c.lineTo(x1, y);
      c.moveTo(x1, y - 6); c.lineTo(x1, y + 6);
      c.stroke();
      c.globalAlpha = 1;
      if (text) k.label(f, c, text, (x0 + x1) / 2, y - 12, { align: "center", alpha: o.alpha, color: o.color });
    },
    /** The timeline's "now": a line with a knob that grows while the surface is held. */
    playhead(f, c, x, y0, y1) {
      const held = f.drag === "time";
      c.strokeStyle = f.C.strong;
      c.lineWidth = held ? 1.75 : 1;
      k.line(c, x, y0, x, y1);
      const r = held ? 6 : 4.5;
      c.fillStyle = f.C.surface;
      c.beginPath(); c.arc(x, y1, r + 2, 0, 7); c.fill();
      c.fillStyle = f.C.accent;
      c.beginPath(); c.arc(x, y1, r, 0, 7); c.fill();
    },
    /** Where a click would go: a faint dashed line and the time, only while hovering a scrub surface. */
    hoverTime(f, c, y0, y1, toX, format) {
      if (f.hoverT == null || f.drag) return;
      const t = f.hoverTSmooth ?? f.hoverT;
      const x = toX(t);
      c.save();
      c.strokeStyle = f.C.muted;
      c.globalAlpha *= 0.55;
      c.setLineDash([2, 3]);
      k.line(c, x, y0, x, y1);
      c.restore();
      k.label(f, c, format(t), x, y0 - 2, { size: 11, align: "center", base: "bottom", color: f.C.muted, weight: 500 });
    },
  };


  // ---------- physics, handles, sliders, settings ----------
  /** Rubber band (iOS-style): travel beyond a bound is compressed, never unbounded. */
  function rubber(x, min, max, dim, c = 0.55) {
    if (x < min) return min - (1 - 1 / (((min - x) * c) / dim + 1)) * dim;
    if (x > max) return max + (1 - 1 / (((x - max) * c) / dim + 1)) * dim;
    return x;
  }
  /** Damped spring toward target (stiffness k, damping ratio z; z < 1 overshoots). Returns true when settled. */
  function springTo(s, target, dt, k = 420, z = 0.62) {
    const c = 2 * z * Math.sqrt(k);
    for (let left = dt; left > 0; left -= 1 / 240) {
      const h = Math.min(left, 1 / 240);
      s.velocity += (-k * (s.value - target) - c * s.velocity) * h;
      s.value += s.velocity * h;
    }
    if (Math.abs(s.value - target) < 0.05 && Math.abs(s.velocity) < 0.5) { s.value = target; s.velocity = 0; return true; }
    return false;
  }
  /** Track a drag on the window (pointer capture is best-effort: it throws for synthetic input). */
  function trackDrag(el, e, move, end) {
    try { el.setPointerCapture(e.pointerId); } catch { /* window listeners still follow the pointer */ }
    const id = e.pointerId;
    const onMove = (ev) => { if (ev.pointerId === id) move(ev); };
    const onEnd = (ev) => {
      if (ev.pointerId !== id) return;
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onEnd);
      removeEventListener("pointercancel", onEnd);
      end(ev);
    };
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onEnd);
    addEventListener("pointercancel", onEnd);
  }
  const animations = new Set();
  /** Run fn(dt) every frame until it returns true. */
  function animate(fn) { animations.add(fn); wake(); return () => animations.delete(fn); }

  /* Direct manipulation: spec.handles = { key: { label, get(f) -> {x, y}, set(f, x, y, phase), bounds(f) -> {x0, y0, x1, y1}, radius, step } }
     Coordinates are CSS px of the figure element. Handles are real focusable elements over the figure, so they
     work with keyboard and touch while the canvas keeps page scrolling. Past the bounds they rubber-band and
     spring back on release. */
  function bindHandles(f) {
    const specs = f.spec.handles;
    if (!specs) return;
    const layer = document.createElement("div");
    layer.className = "fs-handles";
    f.stage.append(layer);
    f.handleLayer = layer;
    f.handles = {};
    f.drag = null;
    f.handleHover = null;
    for (const [key, h] of Object.entries(specs)) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "fs-handle";
      el.dataset.key = key;
      el.setAttribute("aria-label", h.label || key);
      if (h.description) el.title = h.description;
      layer.append(el);
      const state = { key, el, h, grab: null, settle: null };
      f.handles[key] = state;
      // bounds(f) may return null: the handle applies its own constraint (e.g. a radius) in set().
      const bounds = () => (h.bounds ? h.bounds(f) : { x0: 0, y0: 0, x1: f.w, y1: f.h });
      const move = (e) => {
        if (!state.grab) return;
        const b = bounds();
        const z = zoomOf(f);
        let x = state.grab.x + (e.clientX - state.grab.px) / z;
        let y = state.grab.y + (e.clientY - state.grab.py) / z;
        if (b) {
          const dim = Math.max(36, Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.22);
          x = rubber(x, b.x0, b.x1, dim);
          y = rubber(y, b.y0, b.y1, dim);
        }
        h.set(f, x, y, "drag");
        f.emit("drag", { key, x, y });
        f.dirty = true; wake();
      };
      const release = () => {
        if (!state.grab) return;
        state.grab = null;
        f.drag = null;
        delete el.dataset.dragging;
        const b = bounds();
        const p = h.get(f);
        // release(f) may choose the resting point (e.g. the ring at its clamped radius).
        const target = h.release?.(f) ?? (b ? { x: clamp(p.x, b.x0, b.x1), y: clamp(p.y, b.y0, b.y1) } : p);
        const sx = { value: p.x, velocity: 0 };
        const sy = { value: p.y, velocity: 0 };
        if (reducedQuery.matches || (sx.value === target.x && sy.value === target.y)) h.set(f, target.x, target.y, "settle");
        else state.settle = animate((dt) => {
          const done = springTo(sx, target.x, dt) & springTo(sy, target.y, dt);
          h.set(f, sx.value, sy.value, "settle");
          f.dirty = true;
          return done;
        });
        f.emit("dragend", { key, ...target });
        f.dirty = true; wake();
      };
      el.addEventListener("pointerdown", (e) => {
        if (e.button > 0) return;
        e.preventDefault();
        state.settle?.();
        const p = h.get(f);
        state.grab = { px: e.clientX, py: e.clientY, x: p.x, y: p.y };
        f.drag = key;
        el.dataset.dragging = "";
        f.emit("dragstart", { key });
        f.dirty = true; wake();
        trackDrag(el, e, move, release);
      });
      el.addEventListener("pointerenter", () => { f.handleHover = key; f.dirty = true; wake(); });
      el.addEventListener("pointerleave", () => { if (f.handleHover === key) f.handleHover = null; f.dirty = true; wake(); });
      el.addEventListener("focus", () => { f.handleHover = key; f.dirty = true; wake(); });
      el.addEventListener("blur", () => { if (f.handleHover === key) f.handleHover = null; f.dirty = true; wake(); });
      el.addEventListener("keydown", (e) => {
        const step = (h.step || 8) * (e.shiftKey ? 4 : 1);
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!d) return;
        e.preventDefault();
        e.stopPropagation();
        const b = bounds() || { x0: -Infinity, y0: -Infinity, x1: Infinity, y1: Infinity };
        const p = h.get(f);
        h.set(f, clamp(p.x + d[0], b.x0, b.x1), clamp(p.y + d[1], b.y0, b.y1), "key");
        const rest = h.release?.(f);
        if (rest) h.set(f, rest.x, rest.y, "key");
        f.dirty = true; wake();
      });
    }
    f.cleanup.push(() => layer.remove());
  }
  function positionHandles(f) {
    if (!f.handles) return;
    const layer = f.handleLayer;
    layer.style.left = `${f.el.offsetLeft}px`;
    layer.style.top = `${f.el.offsetTop}px`;
    layer.style.width = `${f.w}px`;
    layer.style.height = `${f.h}px`;
    for (const state of Object.values(f.handles)) {
      const p = state.h.get(f);
      const r = typeof state.h.radius === "function" ? state.h.radius(f) : state.h.radius || 18;
      const hidden = state.h.hidden?.(f);
      state.el.hidden = !!hidden;
      state.el.style.width = state.el.style.height = `${r * 2}px`;
      state.el.style.transform = `translate(${(p.x - r).toFixed(1)}px, ${(p.y - r).toFixed(1)}px)`;
    }
  }

  /* Physics slider: vertical bar handle, value bubble, rubber band past both ends with a springy settle,
     magnet to marks. o = { label, min, max, step, marks: [{ value, label }], get(), set(value, phase), format(value) }. */
  function buildSlider(root, o) {
    root.classList.add("fs-slider");
    root.innerHTML = '<span class="fs-slider-label"></span><span class="fs-slider-track"><span class="fs-slider-fill"></span><span class="fs-slider-thumb"><span class="fs-slider-bubble"></span></span></span><output class="fs-slider-value"></output>';
    const [label, track, fill, thumb, bubble, out] = [".fs-slider-label", ".fs-slider-track", ".fs-slider-fill", ".fs-slider-thumb", ".fs-slider-bubble", ".fs-slider-value"].map((q) => root.querySelector(q));
    label.textContent = o.label || "";
    if (!o.label) label.remove();
    root.setAttribute("role", "slider");
    root.tabIndex = 0;
    root.setAttribute("aria-label", o.label || "Value");
    root.setAttribute("aria-valuemin", o.min);
    root.setAttribute("aria-valuemax", o.max);
    for (const mark of o.marks || []) {
      const m = document.createElement("span");
      m.className = "fs-slider-mark";
      m.style.left = `${((mark.value - o.min) / (o.max - o.min)) * 100}%`;
      if (mark.label) m.title = mark.label;
      track.append(m);
    }
    const fmt = o.format || ((v) => String(+v.toFixed(3)));
    const width = () => track.clientWidth || 1;
    const toPos = (v) => ((v - o.min) / (o.max - o.min)) * width();
    const quantize = (v) => {
      v = clamp(v, o.min, o.max);
      // Magnet: values near a mark snap to it.
      for (const mark of o.marks || []) if (Math.abs(toPos(v) - toPos(mark.value)) < 6) return mark.value;
      return o.step ? clamp(Math.round((v - o.min) / o.step) * o.step + o.min, o.min, o.max) : v;
    };
    const display = { value: 0, velocity: 0 };
    let dragging = false;
    let grabOffset = 0;
    let stop = null;
    function paint() {
      const w = width();
      const p = display.value;
      thumb.style.transform = `translateX(${p.toFixed(2)}px)`;
      fill.style.width = `${clamp(p, 0, w).toFixed(2)}px`;
      // The track stretches with the thumb past either end, then springs back with it.
      root.style.setProperty("--fs-over-left", `${Math.max(0, -p).toFixed(2)}px`);
      root.style.setProperty("--fs-over-right", `${Math.max(0, p - w).toFixed(2)}px`);
      const v = o.get();
      const text = fmt(v);
      out.textContent = text;
      bubble.textContent = text;
      root.setAttribute("aria-valuenow", v);
      root.setAttribute("aria-valuetext", text);
    }
    function settleTo(target) {
      stop?.();
      if (reducedQuery.matches) { display.value = target; display.velocity = 0; paint(); return; }
      stop = animate((dt) => { const done = springTo(display, target, dt); paint(); return done; });
    }
    function sync(immediate = false) {
      if (dragging) return;
      if (immediate) { stop?.(); display.value = toPos(o.get()); display.velocity = 0; paint(); }
      else settleTo(toPos(o.get()));
    }
    const xOf = (e) => e.clientX - track.getBoundingClientRect().left;
    track.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      root.focus({ preventScroll: true });
      stop?.();
      dragging = true;
      root.dataset.active = "";
      const x = xOf(e);
      const onThumb = Math.abs(x - display.value) < 10;
      grabOffset = onThumb ? x - display.value : 0;
      if (!onThumb) {
        // Jump to the pointer with a spring, then follow it.
        o.set(quantize(o.min + (x / width()) * (o.max - o.min)), "drag");
        const target = x;
        stop = animate((dt) => { const done = springTo(display, target, dt, 900, 0.8); paint(); return done || !dragging; });
      }
      trackDrag(track, e, follow, release);
    });
    const follow = (e) => {
      if (!dragging) return;
      stop?.();
      const w = width();
      const x = rubber(xOf(e) - grabOffset, 0, w, Math.max(28, w * 0.18));
      display.value = x;
      o.set(quantize(o.min + (clamp(x, 0, w) / w) * (o.max - o.min)), "drag");
      paint();
    };
    const release = () => {
      if (!dragging) return;
      dragging = false;
      delete root.dataset.active;
      settleTo(toPos(o.get()));
    };
    root.addEventListener("keydown", (e) => {
      const unit = o.step || (o.max - o.min) / 100;
      const d = { ArrowRight: unit, ArrowUp: unit, ArrowLeft: -unit, ArrowDown: -unit, PageUp: unit * 10, PageDown: -unit * 10 }[e.key];
      let next;
      if (d !== undefined) next = o.get() + d * (e.shiftKey ? 10 : 1);
      else if (e.key === "Home") next = o.min;
      else if (e.key === "End") next = o.max;
      else return;
      e.preventDefault();
      e.stopPropagation();
      o.set(quantize(next), "key");
      sync();
    });
    new ResizeObserver(() => { display.value = toPos(o.get()); paint(); }).observe(track);
    display.value = toPos(o.get());
    paint();
    return { root, sync };
  }

  function paramSlider(f, name, root) {
    const p = f.spec.params?.[name];
    return buildSlider(root, {
      label: root.dataset.label ?? p.label ?? name,
      min: p.min ?? 0,
      max: p.max ?? 1,
      step: p.step,
      marks: p.marks || (p.markDefault === false ? [] : [{ value: p.value, label: "default" }]),
      get: () => f.params[name],
      set: (v) => f.api.set(name, v),
      format: p.format,
    });
  }

  /* Tabs: switch between examples of the same idea (an inline param with `options`). A pill slides to the
     active tab on a soft spring; ←/→, Home and End move between tabs; the tabs are a real tablist. */
  function buildTabs(root, o) {
    root.classList.add("fs-tabs");
    root.setAttribute("role", "tablist");
    root.setAttribute("aria-label", o.label || "Examples");
    root.textContent = "";
    const ink = document.createElement("span");
    ink.className = "fs-tabs-ink";
    ink.setAttribute("aria-hidden", "true");
    root.append(ink);
    const buttons = o.options.map((option) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.textContent = option.label ?? String(option.value);
      b.addEventListener("click", () => { o.set(option.value); sync(); });
      root.append(b);
      return [b, option.value];
    });
    let placed = false;
    function sync() {
      const value = o.get();
      for (const [b, v] of buttons) {
        const on = v === value;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        if (on && b.offsetWidth) {
          if (!placed) ink.style.transition = "none";
          ink.style.width = `${b.offsetWidth}px`;
          ink.style.transform = `translateX(${b.offsetLeft}px)`;
          if (!placed) { void ink.offsetWidth; ink.style.transition = ""; placed = true; }
        }
      }
    }
    root.addEventListener("keydown", (e) => {
      const i = buttons.findIndex(([, v]) => v === o.get());
      const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: buttons.length - 1 }[e.key];
      if (n === undefined) return;
      e.preventDefault();
      const next = (n + buttons.length) % buttons.length;
      o.set(buttons[next][1]);
      sync();
      buttons[next][0].focus();
    });
    new ResizeObserver(() => sync()).observe(root);
    sync();
    return { root, sync };
  }
  function paramTabs(f, name, root) {
    const p = f.spec.params?.[name];
    return buildTabs(root, {
      label: root.dataset.label ?? p.label ?? name,
      options: p.options,
      get: () => f.params[name],
      set: (v) => f.api.set(name, v),
    });
  }

  const SETTINGS_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';

  /* Settings popover: every param that is not the figure's own interaction lives here (placement
     defaults to "settings"; use placement: "inline" for the control the reader is meant to play with). */
  function buildSettings(f) {
    const entries = Object.entries(f.spec.params || {}).filter(([, p]) => (p.placement ?? "settings") === "settings" && !p.hidden);
    if (!entries.length) return;
    const group = headActions(f);
    if (!group) return;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "fs-iconbtn fs-settings";
    trigger.innerHTML = SETTINGS_ICON;
    trigger.setAttribute("aria-label", "Figure settings");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-haspopup", "dialog");
    const pop = document.createElement("div");
    pop.className = "fs-popover";
    pop.id = `${f.id}-settings`;
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "Figure settings");
    trigger.setAttribute("aria-controls", pop.id);
    const native = typeof pop.showPopover === "function";
    if (native) pop.popover = "auto";
    else pop.hidden = true;
    pop.innerHTML = '<div class="fs-popover-head"><span>Settings</span><button type="button" class="fs-popover-reset">Reset</button></div><div class="fs-popover-body"></div>';
    const body = pop.querySelector(".fs-popover-body");
    const controls = [];
    for (const [name, p] of entries) {
      if (typeof p.value === "number") {
        const row = document.createElement("div");
        body.append(row);
        controls.push(paramSlider(f, name, row));
      } else if (typeof p.value === "boolean") {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "fs-switch";
        row.setAttribute("role", "switch");
        row.innerHTML = `<span>${p.label || name}</span><i aria-hidden="true"></i>`;
        const syncSwitch = () => row.setAttribute("aria-checked", String(!!f.params[name]));
        row.addEventListener("click", () => { f.api.set(name, !f.params[name]); syncSwitch(); });
        syncSwitch();
        body.append(row);
        controls.push({ sync: syncSwitch });
      } else if (Array.isArray(p.options)) {
        const row = document.createElement("div");
        row.className = "fs-segmented";
        row.setAttribute("role", "group");
        row.setAttribute("aria-label", p.label || name);
        row.innerHTML = `<span>${p.label || name}</span>`;
        const buttons = p.options.map((option) => {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = option.label ?? option.value;
          b.addEventListener("click", () => { f.api.set(name, option.value); sync(); });
          row.append(b);
          return [b, option.value];
        });
        const sync = () => { for (const [b, value] of buttons) b.setAttribute("aria-pressed", String(f.params[name] === value)); };
        sync();
        body.append(row);
        controls.push({ sync });
      }
    }
    pop.querySelector(".fs-popover-reset").addEventListener("click", () => {
      for (const [name, p] of entries) f.api.set(name, p.value);
      for (const c of controls) c.sync();
    });
    group.append(trigger);
    f.plate.append(pop);
    const place = () => {
      const r = trigger.getBoundingClientRect();
      const w = pop.offsetWidth || 272;
      pop.style.top = `${Math.round(r.bottom + 8)}px`;
      pop.style.left = `${Math.round(clamp(r.right - w, 12, innerWidth - w - 12))}px`;
    };
    const isOpen = () => (native ? pop.matches(":popover-open") : !pop.hidden);
    const open = () => {
      if (native) pop.showPopover();
      else pop.hidden = false;
      place();
      for (const c of controls) c.sync();
      trigger.setAttribute("aria-expanded", "true");
      pop.querySelector(".fs-slider, .fs-switch, .fs-segmented button")?.focus({ preventScroll: true });
      addEventListener("scroll", place, { passive: true });
      addEventListener("resize", place);
    };
    const closed = () => {
      trigger.setAttribute("aria-expanded", "false");
      removeEventListener("scroll", place);
      removeEventListener("resize", place);
    };
    const close = (returnFocus) => {
      if (native) pop.hidePopover();
      else pop.hidden = true;
      closed();
      if (returnFocus) trigger.focus({ preventScroll: true });
    };
    if (native) pop.addEventListener("toggle", (e) => { if (e.newState === "closed") closed(); });
    trigger.addEventListener("click", () => (isOpen() ? close(false) : open()));
    pop.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); close(true); } });
    if (!native) {
      const outside = (e) => { if (isOpen() && !pop.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) close(false); };
      document.addEventListener("pointerdown", outside);
      f.cleanup.push(() => document.removeEventListener("pointerdown", outside));
    }
    f.settings = { open, close, controls };
    f.sliders.push(...controls);
    f.cleanup.push(() => { trigger.remove(); pop.remove(); closed(); });
  }


  /** How much a drawing is scaled on screen (1 unless its plate is expanded): pointer math divides by it. */
  const zoomOf = (f) => {
    const w = f.el.getBoundingClientRect().width;
    return f.w && w ? w / f.w : 1;
  };

  /* Raw pointer coordinates stay exact in f.pointer. Positional hover drawings use f.hoverSmooth,
     which follows the same target on the shared frame loop and lets that loop sleep after settling. */
  function setPointer(f, x, y) {
    f.pointer = { x, y };
    if (!f.pointerFollow) f.pointerFollow = { x, y, target: { x, y } };
    else f.pointerFollow.target = { x, y };
    f.hoverSmooth = f.pointerFollow;
    if (f.hoverT != null && f.pointerToT && f.hoverTSmooth == null) f.hoverTSmooth = f.pointerToT(x);
    f.dirty = true;
    wake();
  }
  function clearPointer(f) {
    f.pointer = null;
    f.pointerFollow = null;
    f.hoverSmooth = null;
    f.hoverTSmooth = null;
    f.dirty = true;
    wake();
  }
  function bindPointer(f) {
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      const r = f.el.getBoundingClientRect();
      const z = zoomOf(f);
      setPointer(f, (e.clientX - r.left) / z, (e.clientY - r.top) / z);
    };
    const onLeave = () => clearPointer(f);
    f.el.addEventListener("pointermove", onMove);
    f.el.addEventListener("pointerleave", onLeave);
    f.cleanup.push(() => {
      f.el.removeEventListener("pointermove", onMove);
      f.el.removeEventListener("pointerleave", onLeave);
    });
  }

  // ---------- head actions, stable outputs, timeline surface, tips, expand ----------
  /** Settings and expand share one right-aligned group in the plate head. */
  function headActions(f) {
    const head = f.plate.querySelector(".fs-head");
    if (!head) return null;
    let group = head.querySelector(":scope > .fs-head-actions");
    if (!group) {
      group = document.createElement("span");
      group.className = "fs-head-actions";
      head.append(group);
      f.cleanup.push(() => group.remove());
    }
    return group;
  }

  /* Values that change must not move the layout: an output reserves the width of its widest possible
     text (measured when it is visible, otherwise estimated in ch with tabular figures). */
  function reserve(el, samples) {
    const texts = samples.map(String).filter(Boolean);
    if (!texts.length) return;
    el.classList.add("fs-reserve");
    if (!el.isConnected || !el.getClientRects().length) {
      el.style.minWidth = `${Math.max(...texts.map((t) => t.length))}ch`;
      return;
    }
    const probe = el.cloneNode(false);
    probe.removeAttribute("id");
    probe.removeAttribute("data-fs-out");
    probe.style.cssText += ";position:absolute;visibility:hidden;left:-9999px;top:0;width:auto;min-width:0;max-width:none;white-space:nowrap";
    el.parentElement.append(probe);
    let width = 0;
    for (const t of texts) { probe.textContent = t; width = Math.max(width, probe.getBoundingClientRect().width); }
    const cs = getComputedStyle(probe);
    if (cs.boxSizing === "content-box") width -= parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    probe.remove();
    el.style.minWidth = `${Math.ceil(width)}px`;
  }
  function reserveOutputs(f) {
    const auto = {};
    if (Number.isFinite(f.duration)) {
      const fmt = f.spec.formatTime || ((t) => `${t.toFixed(1)} s`);
      auto.t = [fmt(0), fmt(f.duration), fmt(f.duration * 0.888)];
    }
    const steps = (f.spec.steps || []).length;
    if (steps) auto.step = [`${steps} / ${steps}`];
    const specs = { ...auto, ...(f.spec.reserve || {}) };
    document.querySelectorAll(`[data-fs-out^="${f.id}:"]`).forEach((out) => {
      const name = out.dataset.fsOut.slice(f.id.length + 1);
      const samples = typeof specs[name] === "function" ? specs[name](f) : specs[name];
      if (samples?.length) reserve(out, samples);
    });
  }

  /* A step's caption may be a function of the figure (its params or outputs), so it can change with a setting. */
  const captionOf = (f, s) => (typeof s?.caption === "function" ? s.caption(f) : s?.caption ?? "");
  /* Step captions are stacked in one grid cell, so the box always has the height of the longest
     caption and swapping steps is a crossfade, never a jump. A hidden twin carries the live text. */
  function stackCaptions(f, out) {
    const steps = f.spec.steps || [];
    if (!out.fsStack) {
      out.textContent = "";
      out.classList.add("fs-stack");
      out.removeAttribute("aria-live");
      const items = steps.map((s) => {
        const span = document.createElement("span");
        span.textContent = captionOf(f, s);
        span.setAttribute("aria-hidden", "true");
        out.append(span);
        return span;
      });
      const live = document.createElement("span");
      live.className = "fs-sr";
      live.setAttribute("aria-live", "polite");
      out.append(live);
      out.fsStack = { items, live };
    }
    out.fsStack.items.forEach((span, i) => { span.toggleAttribute("data-on", i === f.step); const c = captionOf(f, steps[i]); if (span.textContent !== c) span.textContent = c; });
    const text = captionOf(f, steps[f.step]);
    if (out.fsStack.live.textContent !== text) out.fsStack.live.textContent = text;
  }

  /* Timeline surface: spec.timeAxis(f) -> { x0, x1, t0?, t1?, area? } maps time onto the drawing (CSS px of the figure);
     `area: { x, y, w, h }` limits where the surface responds (e.g. the chart half of a split figure).
     Hover previews the time under the pointer; press and drag sideways scrubs (the clock glides to the
     pointer); a click jumps there; a flick coasts a little further. Vertical touch drags still scroll the page. */
  function bindScrub(f) {
    const axis = f.spec.timeAxis;
    if (!axis || !Number.isFinite(f.duration)) return;
    const el = f.el;
    f.stage.classList.add("fs-scrubbable");
    const pointerToT = (x) => {
      const a = axis(f);
      const t0 = a.t0 ?? 0;
      const t1 = a.t1 ?? f.duration;
      return clamp(t0 + ((x - a.x0) / (a.x1 - a.x0)) * (t1 - t0), 0, f.duration);
    };
    const toT = (clientX) => pointerToT((clientX - el.getBoundingClientRect().left) / zoomOf(f));
    f.pointerToT = pointerToT;
    f.timeToX = (t) => {
      const a = axis(f);
      const t0 = a.t0 ?? 0;
      const t1 = a.t1 ?? f.duration;
      return a.x0 + ((t - t0) / (t1 - t0)) * (a.x1 - a.x0);
    };
    let press = null;
    const inArea = (e) => {
      const area = axis(f).area;
      if (!area) return true;
      const r = el.getBoundingClientRect();
      const z = zoomOf(f);
      const x = (e.clientX - r.left) / z;
      const y = (e.clientY - r.top) / z;
      return x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h;
    };
    const onHover = (e) => {
      if (press || e.pointerType === "touch") return;
      const inside = inArea(e);
      el.classList.toggle("fs-scrub-off", !inside);
      const next = inside ? toT(e.clientX) : null;
      if (next === f.hoverT) return;
      f.hoverT = next;
      if (next == null) f.hoverTSmooth = null;
      else if (f.hoverTSmooth == null) f.hoverTSmooth = next;
      f.dirty = true; wake();
    };
    const onLeave = () => { if (!press) { f.hoverT = f.hoverTSmooth = null; f.dirty = true; wake(); } };
    const onDown = (e) => {
      if (e.button > 0 || !inArea(e)) return;
      if (e.pointerType === "mouse") e.preventDefault();
      press = { x: e.clientX, y: e.clientY, moved: false, samples: [] };
      trackDrag(el, e, (ev) => {
        if (!press) return;
        const dx = ev.clientX - press.x;
        const dy = ev.clientY - press.y;
        if (!press.moved) {
          if (Math.hypot(dx, dy) < 4) return;
          if (ev.pointerType !== "mouse" && Math.abs(dy) > Math.abs(dx)) { press = null; return; }
          press.moved = true;
          f.api.pause();
          f.drag = "time";
          hideTip();
          document.documentElement.classList.add("fs-grabbing");
        }
        const t = toT(ev.clientX);
        press.samples.push({ t, at: ev.timeStamp });
        if (press.samples.length > 5) press.samples.shift();
        f.hoverT = t;
        f.api.seek(t, { animate: true, smooth: 0.07 });
        f.emit("scrub", t);
      }, (ev) => {
        const p = press;
        press = null;
        document.documentElement.classList.remove("fs-grabbing");
        if (!p) return;
        f.drag = null;
        if (!p.moved) {
          if (ev.type === "pointerup") { f.api.pause(); f.api.seek(toT(ev.clientX), { animate: true }); }
        } else {
          // Projected landing: a fast release keeps a little of its speed, then settles.
          const a = p.samples[0];
          const b = p.samples[p.samples.length - 1];
          const v = a && b && b.at > a.at ? (b.t - a.t) / ((b.at - a.at) / 1000) : 0;
          if (Math.abs(v) > f.duration * 0.6) f.api.seek(b.t + v * 0.12, { animate: true, smooth: 0.3 });
        }
        if (ev.pointerType === "touch") f.hoverT = f.hoverTSmooth = null;
        f.dirty = true; wake();
      });
    };
    el.addEventListener("pointermove", onHover);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    f.cleanup.push(() => {
      el.removeEventListener("pointermove", onHover);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
    });
  }

  /* Explanations: a title and one or two plain sentences. They open after a hover delay; once one is
     open, neighbours open at once and the tip keeps its current drawn position while its pointer target changes.
     Keyboard focus opens immediately at the focused part, a tap toggles on touch, Escape closes. */
  const TIP_DELAY = 500;
  const TIP_WARM = 450;
  const TIP_GRACE = 100;
  const tip = {
    el: null, timer: 0, closeTimer: 0, hiddenAt: -1e9, open: false,
    source: null, pendingSource: null, target: null, radiusY: 6, follower: {},
  };
  function tipElement() {
    if (tip.el) return tip.el;
    const el = document.createElement("div");
    el.className = "fs-tip";
    el.id = "fs-tip";
    el.setAttribute("role", "tooltip");
    if (typeof el.showPopover === "function") el.popover = "manual";
    else el.hidden = true;
    el.innerHTML = "<b></b><span></span>";
    document.body.append(el);
    tip.el = el;
    return el;
  }
  function tipBounds() {
    const plate = tip.source?.closest?.(".fs-plate") || tip.pendingSource?.closest?.(".fs-plate");
    const r = plate?.getBoundingClientRect();
    return r || { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
  }
  function setTipTarget(anchor, source) {
    const a = typeof anchor === "function" ? anchor() : anchor;
    if (!a) return;
    tip.target = "x" in a && "y" in a
      ? { x: a.x, y: a.y }
      : { x: a.left + a.width / 2, y: (a.top + a.bottom) / 2 };
    tip.radiusY = "x" in a && "y" in a ? 6 : Math.max(0, (a.bottom - a.top) / 2);
    tip.pendingSource = source;
    if (!tip.open) return;
    if (reducedQuery.matches) {
      follow(tip.follower, tip.target, 0, { snap: true });
      placeTip();
    } else wake();
  }
  function placeTip() {
    const el = tip.el;
    if (!el || !tip.target || !Number.isFinite(tip.follower.x)) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const bounds = tipBounds();
    const left = Math.max(8, bounds.left + 8);
    const right = Math.min(innerWidth - 8, bounds.right - 8);
    const top = Math.max(8, bounds.top + 8);
    const bottom = Math.min(innerHeight - 8, bounds.bottom - 8);
    const maxX = Math.max(left, right - w);
    const above = tip.follower.y - tip.radiusY - h - 10;
    const below = tip.follower.y + tip.radiusY + 10;
    const useBelow = above < top;
    const maxY = Math.max(top, bottom - h);
    const x = clamp(tip.follower.x - w / 2, left, maxX);
    const y = clamp(useBelow ? below : above, top, maxY);
    el.dataset.side = useBelow ? "bottom" : "top";
    // Position is advanced by the runtime follower; the old CSS translate tween would double-ease it.
    el.classList.remove("fs-tip-glide");
    el.style.translate = Math.round(x) + "px " + Math.round(y) + "px";
  }
  function showTip(content, source) {
    const el = tipElement();
    clearTimeout(tip.closeTimer);
    const wasOpen = tip.open;
    const warm = performance.now() - tip.hiddenAt < TIP_WARM;
    el.querySelector("b").textContent = content.title || "";
    el.querySelector("b").hidden = !content.title;
    el.querySelector("span").textContent = content.body || "";
    if (!wasOpen) {
      if (el.popover) { if (!el.matches(":popover-open")) el.showPopover(); }
      else el.hidden = false;
    }
    if (!wasOpen && !warm || !Number.isFinite(tip.follower.x)) {
      tip.follower = { x: tip.target.x, y: tip.target.y, target: { ...tip.target } };
    }
    const previousSource = tip.source;
    tip.source = source;
    tip.pendingSource = source;
    follow(tip.follower, tip.target, 0, { snap: reducedQuery.matches });
    placeTip();
    if (!wasOpen) {
      void el.offsetWidth; // compute the closed style first so the open state transitions
      el.dataset.open = "";
    }
    if (previousSource && previousSource !== source) previousSource.removeAttribute?.("aria-describedby");
    source?.setAttribute?.("aria-describedby", "fs-tip");
    tip.open = true;
    wake();
  }
  function hideTip() {
    clearTimeout(tip.timer);
    clearTimeout(tip.closeTimer);
    tip.pendingSource = null;
    if (!tip.open) return;
    tip.open = false;
    tip.hiddenAt = performance.now();
    tip.source?.removeAttribute?.("aria-describedby");
    tip.source = null;
    const el = tip.el;
    delete el.dataset.open;
    setTimeout(() => {
      if (tip.open) return;
      if (el.popover) { if (el.matches(":popover-open")) el.hidePopover(); }
      else el.hidden = true;
    }, 140);
  }
  function requestTip(content, anchor, source, immediate = false) {
    if (!content || (!content.title && !content.body)) { releaseTip(); return; }
    clearTimeout(tip.timer);
    clearTimeout(tip.closeTimer);
    setTipTarget(anchor, source);
    const warm = tip.open || performance.now() - tip.hiddenAt < TIP_WARM;
    if (immediate || warm) showTip(content, source);
    else tip.timer = setTimeout(() => {
      if (tip.pendingSource === source) showTip(content, source);
    }, TIP_DELAY);
  }
  function moveTip(anchor, source) {
    if (tip.source === source || tip.pendingSource === source) setTipTarget(anchor, source);
  }
  function releaseTip() {
    clearTimeout(tip.timer);
    clearTimeout(tip.closeTimer);
    tip.pendingSource = null;
    tip.closeTimer = setTimeout(hideTip, TIP_GRACE);
  }
  addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(); });
  addEventListener("scroll", () => { if (tip.open) hideTip(); }, { passive: true, capture: true });
  function bindTipElement(node, content) {
    node.dataset.fsTipBound = "";
    const rect = () => node.getBoundingClientRect();
    const point = (e) => ({ x: e.clientX, y: e.clientY });
    node.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") requestTip(content(), point(e), node); });
    node.addEventListener("pointermove", (e) => { if (e.pointerType !== "touch") moveTip(point(e), node); });
    node.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") releaseTip(); });
    node.addEventListener("focus", () => { if (node.matches(":focus-visible")) requestTip(content(), rect, node, true); });
    node.addEventListener("blur", hideTip);
    node.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "touch") return;
      if (tip.open && tip.source === node) hideTip();
      else requestTip(content(), point(e), node, true);
    });
  }
  /** Canvas or SVG parts: spec.tips maps keys to copy; spec.tipAt(f, x, y) returns a key or keyed hit. */
  function bindFigureTips(f) {
    if (!f.spec.tips || !f.spec.tipAt) return;
    const el = f.el;
    let current = null;
    const onMove = (e) => {
      if (e.pointerType === "touch" || f.drag) return;
      const r = el.getBoundingClientRect();
      const z = zoomOf(f);
      const hit = f.spec.tipAt(f, (e.clientX - r.left) / z, (e.clientY - r.top) / z);
      const key = hit && typeof hit === "object" ? hit.key : hit;
      const anchor = { x: e.clientX, y: e.clientY };
      if (key === current) { if (current) moveTip(anchor, el); return; }
      current = key ?? null;
      if (f.spec.tipHover !== false) setHover(f, current);
      if (!current) { releaseTip(); return; }
      requestTip(f.spec.tips[current], anchor, el);
    };
    const onLeave = () => { current = null; if (f.spec.tipHover !== false) setHover(f, null); releaseTip(); };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    f.cleanup.push(() => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); });
  }

  /* Expand: the plate itself rises into the top layer (no DOM move, so canvases, state and framework
     ownership survive), a holder keeps its place in the page, and a FLIP transform carries it from its
     slot to nearly full screen and back. Interruptible both ways; Escape, the close button or a click on
     the backdrop close it; focus stays inside while open and returns to the button. */
  const ICON = (paths, cls) => `<svg class="${cls}" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const EXPAND_ICONS = ICON('<path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5"/>', "fs-ico fs-ico-open") + ICON('<path d="M6 6l12 12M18 6L6 18"/>', "fs-ico fs-ico-close");
  const PLAY_ICONS = ICON('<path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none"/>', "fs-ico fs-ico-play") + ICON('<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="2.2"/>', "fs-ico fs-ico-pause") + ICON('<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 4.5V9H9"/>', "fs-ico fs-ico-replay");
  function bindExpand(f) {
    const plate = f.plate;
    if (plate.fsExpand) { f.expand = plate.fsExpand; return; }
    if (!plate.classList.contains("fs-plate") || f.spec.expand === false || plate.dataset.fsExpand === "false") return;
    const group = headActions(f);
    if (!group) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fs-iconbtn fs-expand";
    btn.innerHTML = EXPAND_ICONS;
    btn.setAttribute("aria-label", "Expand figure");
    btn.setAttribute("aria-expanded", "false");
    group.append(btn);
    const members = () => [...figures.values()].filter((g) => g.plate === plate);
    const relayout = () => { for (const g of members()) { g.resize(); draw(g); } };
    let phase = "closed";
    let holder = null;
    let backdrop = null;
    // Two ways to expand. "fit" (the default) keeps the plate's own layout and scales it until it fills 84% of the
    // viewport's width or height, whichever it reaches first, so its proportions never change; the canvas renders at
    // the scaled resolution. "fill" (spec.expand === "fill", for drawings that reflow well, like Mermaid) lays the
    // plate out again at 84vw, up to 84vh tall. Either way the motion rides a critically damped spring (ω 26, settled in
    // about 0.35 s), every frame is real, both ends match their resting layouts, and a reversal keeps its velocity.
    const OMEGA = 26;
    const fill = f.spec.expand === "fill";
    const box = { x: 0, y: 0, w: 0, s: 1, vx: 0, vy: 0, vw: 0, vs: 0 };
    let rest = null;
    let goal = null;
    let done = null;
    let raf = 0;
    let last = 0;
    const zoom = (z) => { for (const g of members()) g.zoom = z; };
    const place = () => {
      if (fill) {
        plate.style.left = `${box.x}px`;
        plate.style.top = `${box.y}px`;
        plate.style.width = `${box.w}px`;
        relayout();
      } else {
        plate.style.transform = `translate(${box.x - rest.left}px, ${box.y - rest.top}px) scale(${box.s})`;
      }
    };
    const pin = (r) => {
      rest = r;
      plate.style.inset = "auto";
      plate.style.margin = "0";
      plate.style.left = `${r.left}px`;
      plate.style.top = `${r.top}px`;
      plate.style.width = `${r.width}px`;
      plate.style.maxHeight = fill ? "" : "none";
      plate.style.transformOrigin = "0 0";
      Object.assign(box, { x: r.left, y: r.top, w: r.width, s: 1, vx: 0, vy: 0, vw: 0, vs: 0 });
      place();
    };
    const unpin = () => { for (const p of ["inset", "margin", "left", "top", "width", "max-height", "transform", "transform-origin"]) plate.style.removeProperty(p); };
    // Where the expanded plate rests.
    const expandedBox = () => {
      if (!fill) {
        const s = Math.max(1, Math.min((innerWidth * 0.84) / rest.width, (innerHeight * 0.84) / rest.height));
        return { x: (innerWidth - rest.width * s) / 2, y: (innerHeight - rest.height * s) / 2, w: rest.width, s };
      }
      const pinned = plate.getAttribute("style");
      unpin();
      relayout();
      const r = plate.getBoundingClientRect();
      if (pinned !== null) plate.setAttribute("style", pinned);
      place();
      return { x: r.left, y: r.top, w: r.width, s: 1 };
    };
    const step = (now) => {
      const dt = Math.min(1 / 30, (now - last) / 1000 || 1 / 60);
      last = now;
      let moving = false;
      for (const k of ["x", "y", "w", "s"]) {
        const v = `v${k}`;
        box[v] += (-OMEGA * OMEGA * (box[k] - goal[k]) - 2 * OMEGA * box[v]) * dt;
        box[k] += box[v] * dt;
        const tol = k === "s" ? 0.0008 : 0.4;
        if (Math.abs(box[k] - goal[k]) > tol || Math.abs(box[v]) > tol * 10) moving = true;
      }
      if (!moving) Object.assign(box, { x: goal.x, y: goal.y, w: goal.w, s: goal.s, vx: 0, vy: 0, vw: 0, vs: 0 });
      place();
      if (moving) { raf = requestAnimationFrame(step); return; }
      raf = 0;
      const then = done;
      done = null;
      then?.();
    };
    // If frames stall (a background tab or a hidden pane never fires requestAnimationFrame), land at once instead of
    // leaving the plate half open.
    let watch = 0;
    const land = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      Object.assign(box, { x: goal.x, y: goal.y, w: goal.w, s: goal.s, vx: 0, vy: 0, vw: 0, vs: 0 });
      place();
      const then = done;
      done = null;
      then?.();
    };
    const guard = () => {
      clearTimeout(watch);
      watch = setTimeout(() => { if (raf && performance.now() - last > 200) land(); else if (raf) guard(); }, 250);
    };
    const glide = (target, then) => {
      goal = target;
      done = then;
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
      guard();
    };
    const onResize = () => { if (phase === "open") { Object.assign(box, expandedBox()); if (!fill) { zoom(box.s); relayout(); } place(); } };
    const fade = (node, show, duration) => node.animate([{ opacity: show ? 0 : 1 }, { opacity: show ? 1 : 0 }], { duration, easing: "ease-out", fill: "both" });
    const focusables = () => [...plate.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.getClientRects().length);
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (plate.querySelector(".fs-popover:popover-open")) return;
        e.preventDefault();
        close();
      } else if (e.key === "Tab") {
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || !plate.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !plate.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      }
    };
    const onOutside = (e) => {
      if (plate.contains(e.target) || e.target.closest?.(".fs-popover, .fs-tip")) return;
      close();
    };
    const label = (open) => {
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close expanded figure" : "Expand figure");
    };
    function open() {
      if (phase === "open" || phase === "opening") return;
      if (phase === "closing") {
        phase = "opening";
        delete plate.dataset.fsClosing;
        label(true);
        backdrop?.getAnimations().forEach((a) => { a.reverse(); });
        glide(expandedBox(), finishOpen);
        return;
      }
      for (const g of members()) g.settings?.close(false);
      hideTip();
      const from = plate.getBoundingClientRect();
      const cs = getComputedStyle(plate);
      holder = document.createElement("div");
      holder.className = "fs-holder";
      // The placeholder takes the plate's exact box (wide plates break out of the column), so closing lands on it.
      holder.style.width = `${from.width}px`;
      holder.style.maxWidth = "none";
      holder.style.height = `${from.height}px`;
      holder.style.margin = cs.margin;
      plate.before(holder);
      backdrop = document.createElement("div");
      backdrop.className = "fs-backdrop";
      document.body.append(backdrop);
      document.documentElement.classList.add("fs-modal-open");
      if (typeof plate.showPopover === "function") { plate.popover = "manual"; plate.showPopover(); }
      plate.dataset.fsExpanded = "";
      phase = "opening";
      label(true);
      const reduced = reducedQuery.matches;
      fade(backdrop, true, reduced ? 120 : 280);
      pin(from);
      const target = expandedBox();
      if (!fill) { zoom(target.s); relayout(); }
      if (reduced) { Object.assign(box, target); place(); finishOpen(); }
      else glide(target, finishOpen);
      addEventListener("resize", onResize);
      btn.focus({ preventScroll: true });
      document.addEventListener("keydown", onKey, true);
      document.addEventListener("pointerdown", onOutside, true);
      f.emit("expand", true);
    }
    function finishOpen() {
      phase = "open";
      if (fill) { unpin(); relayout(); }
    }
    function close() {
      if (phase === "closed" || phase === "closing") return;
      phase = "closing";
      plate.dataset.fsClosing = "";
      label(false);
      const reduced = reducedQuery.matches;
      backdrop?.getAnimations().forEach((a) => { a.cancel(); });
      if (backdrop) fade(backdrop, false, reduced ? 100 : 260);
      if (reduced) { finishClose(); return; }
      if (fill && !raf) { const r = plate.getBoundingClientRect(); pin(rest); Object.assign(box, { x: r.left, y: r.top, w: r.width }); place(); }
      const h = holder.getBoundingClientRect();
      glide({ x: h.left, y: h.top, w: h.width, s: 1 }, finishClose);
    }
    function finishClose() {
      cancelAnimationFrame(raf);
      clearTimeout(watch);
      raf = 0;
      done = null;
      removeEventListener("resize", onResize);
      unpin();
      zoom(1);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onOutside, true);
      delete plate.dataset.fsExpanded;
      delete plate.dataset.fsClosing;
      if (plate.popover) { if (plate.matches(":popover-open")) plate.hidePopover(); plate.removeAttribute("popover"); }
      holder?.remove();
      holder = null;
      backdrop?.remove();
      backdrop = null;
      document.documentElement.classList.remove("fs-modal-open");
      phase = "closed";
      relayout();
      btn.focus({ preventScroll: true });
      f.emit("expand", false);
    }
    btn.addEventListener("click", () => (phase === "open" || phase === "opening" ? close() : open()));
    plate.fsExpand = { open, close, isOpen: () => phase === "open" || phase === "opening" };
    f.expand = plate.fsExpand;
    f.cleanup.push(() => { if (phase !== "closed") finishClose(); btn.remove(); delete plate.fsExpand; });
  }

  // ---------- figures ----------
  function figure(id, spec) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`FS: no element #${id}`);
    const plate = el.closest(".fs-plate") || el.parentElement;
    const stage = el.closest(".fs-stage") || el.parentElement;
    const isCanvas = el instanceof HTMLCanvasElement;
    const f = {
      id, el, spec, plate, stage,
      ctx: isCanvas ? el.getContext("2d") : null,
      w: 0, h: 0, dpr: 1,
      t: 0, duration: spec.duration ?? Infinity, rate: 1,
      tTarget: null, tState: { value: 0, velocity: 0 }, tSmooth: 0.22,
      pointer: null, pointerFollow: null, hoverSmooth: null, hoverT: null, hoverTSmooth: null, drag: null,
      playing: false, visible: false, dirty: true, started: false,
      step: 0, from: 0, stepT: 1,
      params: {}, v: {}, hover: null, state: {}, outputs: {},
      listeners: {}, C: { c: [] }, patterns: {}, cleanup: [], sliders: [],
    };
    for (const [name, p] of Object.entries(spec.params || {})) f.params[name] = f.v[name] = p.value;
    const emit = (event, detail) => {
      for (const fn of f.listeners[event] || []) fn(detail, api);
      f.el.dispatchEvent(new CustomEvent(`fs:${event}`, { detail, bubbles: true }));
    };
    const finite = Number.isFinite(f.duration);
    const api = {
      id,
      element: el,
      get t() { return f.t; },
      get step() { return f.step; },
      get playing() { return f.playing; },
      get params() { return { ...f.params }; },
      play() {
        if (f.tTarget !== null) { f.t = f.tTarget; f.tTarget = null; }
        if (finite && f.t >= f.duration - 1e-6) f.t = 0;
        f.playing = true; f.started = true; emit("play"); sync(f); wake();
      },
      pause() { f.playing = false; emit("pause"); sync(f); wake(); },
      toggle() { f.playing ? api.pause() : api.play(); },
      /** seek(t) jumps; seek(t, { animate: true, smooth }) glides there (a new target retargets mid-flight). */
      seek(t, options = {}) {
        const to = finite ? clamp(t, 0, f.duration) : Math.max(0, t);
        f.started = true;
        if (options.animate && !reducedQuery.matches) {
          if (f.tTarget === null) f.tState = { value: f.t, velocity: 0 };
          f.tTarget = to;
          f.tSmooth = options.smooth ?? 0.22;
        } else {
          f.tTarget = null;
          f.t = to;
        }
        f.dirty = true; emit("seek", to); sync(f); wake();
      },
      chapter(dir) {
        const now = f.tTarget ?? f.t;
        const marks = [0, ...(spec.chapters || []).map((c) => c.t), ...(finite ? [f.duration] : [])].sort((a, b) => a - b);
        const target = dir > 0 ? marks.find((m) => m > now + 1e-3) : [...marks].reverse().find((m) => m < now - 1e-3);
        if (target !== undefined) { api.pause(); api.seek(target, { animate: true }); }
      },
      goto(n) {
        const steps = spec.steps || [];
        n = clamp(Math.round(n), 0, Math.max(0, steps.length - 1));
        if (n === f.step) return;
        f.from = f.step; f.step = n; f.stepT = reducedQuery.matches ? 1 : 0;
        spec.onStep?.(f, n);
        emit("step", n); sync(f); f.dirty = true; wake();
      },
      next() { api.goto(f.step + 1); },
      prev() { api.goto(f.step - 1); },
      set(name, value, options = {}) {
        if (typeof name === "object") { for (const key in name) api.set(key, name[key], value); return; }
        const p = spec.params?.[name];
        if (!p) throw new Error(`FS: unknown param ${name} on #${id}`);
        if (typeof p.value === "number") value = clamp(Number(value), p.min ?? -Infinity, p.max ?? Infinity);
        f.params[name] = value;
        if (options.instant || reducedQuery.matches || typeof value !== "number") f.v[name] = value;
        spec.onParam?.(f, name, value);
        emit("param", { name, value }); sync(f); f.dirty = true; wake();
      },
      reset() {
        for (const [name, p] of Object.entries(spec.params || {})) api.set(name, p.value);
        api.goto(0); api.seek(0);
        spec.init?.(f);
        emit("reset");
      },
      state: () => ({ t: f.tTarget ?? f.t, step: f.step, params: { ...f.params }, playing: f.playing }),
      apply(s) {
        if (s.params) api.set(s.params, { instant: true });
        if (s.step != null) api.goto(s.step);
        if (s.t != null) api.seek(s.t);
        if (s.playing === true) api.play();
        if (s.playing === false) api.pause();
      },
      on(event, fn) {
        if (!f.listeners[event]) f.listeners[event] = [];
        f.listeners[event].push(fn);
        return () => { f.listeners[event] = f.listeners[event].filter((g) => g !== fn); };
      },
      out(name, text) { f.outputs[name] = String(text); writeOutputs(f); },
      hover(key) { setHover(f, key); },
      openSettings() { f.settings?.open(); },
      closeSettings() { f.settings?.close(false); },
      redraw() { f.dirty = true; wake(); },
      expand() { f.expand?.open(); },
      collapse() { f.expand?.close(); },
      /** Release observers and listeners (call on unmount / route change). */
      dispose() {
        for (const fn of f.cleanup) fn();
        f.probes?.[0]?.parentElement?.remove();
        figures.delete(id);
      },
    };
    f.api = api;
    f.emit = emit;
    figures.set(id, f);
    readTheme(f);
    const plateObserver = new MutationObserver(() => { readTheme(f); wake(); });
    plateObserver.observe(plate, { attributes: true, attributeFilter: ["data-fs-theme", "data-fs-mode"] });
    f.cleanup.push(() => plateObserver.disconnect());
    spec.init?.(f);

    const resize = () => {
      // Layout width, not getBoundingClientRect: a transform (the expand FLIP) must not change the drawing size.
      const cs = getComputedStyle(stage);
      const w = Math.floor(stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
      if (w <= 0) return;
      const h = Math.round(spec.height ? spec.height(w) : w * 0.5);
      // An expanded plate is scaled up, so it renders at its on-screen resolution.
      const dpr = Math.min(4, Math.min(2, devicePixelRatio || 1) * (f.zoom || 1));
      if (w === f.w && h === f.h && dpr === f.dpr) return;
      f.w = w; f.h = h; f.dpr = dpr;
      if (isCanvas) {
        el.style.height = `${h}px`;
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
        f.patterns = {};
      }
      spec.resize?.(f);
      f.dirty = true; wake();
    };
    f.resize = resize;
    const sizes = new ResizeObserver(resize);
    sizes.observe(stage);
    const views = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      f.visible = entry.isIntersecting;
      // Narrative timelines start once, when enough of the figure is in view.
      if (f.visible && !f.started && entry.intersectionRatio >= 0.35 && spec.autoplay !== false && !reducedQuery.matches) api.play();
      f.dirty = true; wake();
    }, { threshold: [0, 0.35, 0.6], rootMargin: "60px" });
    views.observe(el);
    f.cleanup.push(() => { sizes.disconnect(); views.disconnect(); });
    resize();
    applyReduced(f);
    bindKeys(f);
    bindPointer(f);
    bindHandles(f);
    bindScrub(f);
    bindFigureTips(f);
    buildSettings(f);
    bindExpand(f);
    bindAll();
    sync(f);
    reserveOutputs(f);
    return api;
  }

  function applyReduced(f) {
    if (!reducedQuery.matches) return;
    f.playing = false;
    f.stepT = 1;
    for (const name in f.params) f.v[name] = f.params[name];
    // Show the payoff of a timeline, or a representative moment of a process.
    if (Number.isFinite(f.duration)) f.t = f.spec.keyframe ?? f.duration;
    else if (f.spec.update && f.spec.settle) for (let i = 0; i < f.spec.settle * 60; i++) { f.spec.update(f, 1 / 60); f.t += 1 / 60; }
    f.dirty = true;
  }

  function bindKeys(f) {
    const stage = f.stage;
    if (!stage.hasAttribute("tabindex")) stage.tabIndex = 0;
    const onKey = (e) => {
      const steps = (f.spec.steps || []).length;
      const keys = {
        " ": () => f.api.toggle(),
        ArrowRight: () => (steps ? f.api.next() : f.api.chapter(1)),
        ArrowLeft: () => (steps ? f.api.prev() : f.api.chapter(-1)),
        Home: () => (steps ? f.api.goto(0) : f.api.seek(0, { animate: true })),
        End: () => (steps ? f.api.goto(steps - 1) : f.api.seek(f.duration, { animate: true })),
      };
      if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
    };
    stage.addEventListener("keydown", onKey);
    f.cleanup.push(() => stage.removeEventListener("keydown", onKey));
  }

  // ---------- declarative bindings ----------
  const parse = (value) => { const [id, rest] = value.split(/[: ]/); return { f: figures.get(id), rest }; };
  function bindAll() {
    document.querySelectorAll("[data-fs]:not([data-fs-bound])").forEach((el) => {
      const [id, action] = el.dataset.fs.split(" ");
      const f = figures.get(id);
      if (!f) return;
      el.dataset.fsBound = "";
      if (action === "play") { el.classList.add("fs-iconbtn", "fs-play"); el.innerHTML = PLAY_ICONS; }
      el.addEventListener("click", () => {
        const a = f.api;
        ({ play: a.toggle, next: a.next, prev: a.prev, reset: a.reset, "chapter-next": () => a.chapter(1), "chapter-prev": () => a.chapter(-1) })[action]?.();
      });
    });
    document.querySelectorAll("div[data-fs-param]:not([data-fs-bound]), span[data-fs-param]:not([data-fs-bound])").forEach((root) => {
      const { f, rest: name } = parse(root.dataset.fsParam);
      if (!f || !f.spec.params?.[name]) return;
      root.dataset.fsBound = "";
      f.sliders.push(Array.isArray(f.spec.params[name].options) ? paramTabs(f, name, root) : paramSlider(f, name, root));
    });
    document.querySelectorAll("div[data-fs-seek]:not([data-fs-bound])").forEach((root) => {
      const f = figures.get(root.dataset.fsSeek);
      if (!f || !Number.isFinite(f.duration)) return;
      root.dataset.fsBound = "";
      const slider = buildSlider(root, {
        label: root.dataset.label,
        min: 0,
        max: f.duration,
        marks: (f.spec.chapters || []).map((c) => ({ value: c.t, label: c.label })),
        get: () => f.tTarget ?? f.t,
        set: (t, phase) => { if (phase === "drag" || phase === "key") f.api.pause(); f.api.seek(t, { animate: true, smooth: phase === "drag" ? 0.07 : 0.2 }); },
        format: f.spec.formatTime || ((t) => `${t.toFixed(1)} s`),
      });
      f.seekSliders = [...(f.seekSliders || []), slider];
      f.sliders.push(slider);
    });
    document.querySelectorAll("input[data-fs-param]:not([data-fs-bound]), select[data-fs-param]:not([data-fs-bound])").forEach((input) => {
      const { f, rest: name } = parse(input.dataset.fsParam);
      const p = f?.spec.params?.[name];
      if (!p) return;
      input.dataset.fsBound = "";
      if (input.type === "range" || input.type === "number") {
        for (const key of ["min", "max", "step"]) if (p[key] != null && !input.hasAttribute(key)) input[key] = p[key];
      }
      input.addEventListener("input", () => f.api.set(name, input.type === "checkbox" ? input.checked : input.type === "range" || input.type === "number" ? Number(input.value) : input.value));
    });
    document.querySelectorAll("input[data-fs-seek]:not([data-fs-bound])").forEach((input) => {
      const f = figures.get(input.dataset.fsSeek);
      if (!f || !Number.isFinite(f.duration)) return;
      input.dataset.fsBound = "";
      input.min = 0; input.max = f.duration; input.step = "any";
      input.addEventListener("input", () => { f.api.pause(); f.api.seek(Number(input.value)); });
    });
    document.querySelectorAll("[data-fs-scrub]:not([data-fs-bound])").forEach((span) => {
      const { f, rest: name } = parse(span.dataset.fsScrub);
      const p = f?.spec.params?.[name];
      if (!p) return;
      span.dataset.fsBound = "";
      span.classList.add("fs-scrub");
      span.tabIndex = 0;
      span.setAttribute("role", "slider");
      span.setAttribute("aria-label", p.label || name);
      const range = (p.max ?? 1) - (p.min ?? 0);
      const stepSize = p.step || range / 100;
      let start = null;
      span.addEventListener("pointerdown", (e) => { start = { x: e.clientX, v: f.params[name] }; span.setPointerCapture(e.pointerId); span.dataset.active = ""; });
      span.addEventListener("pointermove", (e) => {
        if (!start) return;
        const raw = start.v + ((e.clientX - start.x) / 200) * range;
        f.api.set(name, Math.round(raw / stepSize) * stepSize);
      });
      const end = () => { start = null; delete span.dataset.active; };
      span.addEventListener("pointerup", end);
      span.addEventListener("pointercancel", end);
      span.addEventListener("keydown", (e) => {
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (d) { e.preventDefault(); f.api.set(name, f.params[name] + d * stepSize * (e.shiftKey ? 10 : 1)); }
      });
    });
    document.querySelectorAll("[data-fs-ref]:not([data-fs-bound])").forEach((word) => {
      const { f, rest: key } = parse(word.dataset.fsRef);
      if (!f) return;
      word.dataset.fsBound = "";
      if (!word.hasAttribute("tabindex")) word.tabIndex = 0;
      const on = () => setHover(f, key);
      const off = () => setHover(f, null);
      word.addEventListener("pointerenter", on);
      word.addEventListener("pointerleave", off);
      word.addEventListener("focus", on);
      word.addEventListener("blur", off);
    });
    document.querySelectorAll("[data-fs-tip]:not([data-fs-tip-bound])").forEach((node) => {
      bindTipElement(node, () => ({ title: node.dataset.fsTipTitle, body: node.dataset.fsTip }));
    });
    document.querySelectorAll("[data-fs-dots]").forEach((dots) => {
      const f = figures.get(dots.dataset.fsDots);
      if (f && !dots.children.length) dots.innerHTML = (f.spec.steps || []).map(() => "<i></i>").join("");
    });
    figures.forEach(sync);
  }

  function setHover(f, key) {
    if (f.hover === key) return;
    f.hover = key;
    document.querySelectorAll(`[data-fs-ref^="${f.id}:"]`).forEach((word) => {
      word.toggleAttribute("data-active", key !== null && word.dataset.fsRef === `${f.id}:${key}`);
    });
    f.emit("hover", key);
    f.dirty = true;
    wake();
  }

  function format(f, name) {
    const p = f.spec.params?.[name];
    if (!p) return "";
    const v = f.params[name];
    return p.format ? p.format(v) : typeof v === "number" ? String(+v.toFixed(3)) : String(v);
  }
  function writeOutputs(f) {
    const steps = f.spec.steps || [];
    document.querySelectorAll(`[data-fs-out^="${f.id}:"]`).forEach((out) => {
      const name = out.dataset.fsOut.slice(f.id.length + 1);
      let text;
      if (name === "t") text = f.spec.formatTime ? f.spec.formatTime(f.t) : `${f.t.toFixed(1)} s`;
      else if (name === "step") text = steps.length ? `${f.step + 1} / ${steps.length}` : "";
      else if (name === "caption") { stackCaptions(f, out); return; }
      else if (name in f.outputs) text = f.outputs[name];
      else text = format(f, name);
      if (out.textContent !== text) out.textContent = text;
    });
  }
  function sync(f) {
    const steps = f.spec.steps || [];
    document.querySelectorAll(`[data-fs^="${f.id} "]`).forEach((b) => {
      const action = b.dataset.fs.split(" ")[1];
      if (action === "play") {
        const state = f.playing ? "pause" : finiteDone(f) ? "replay" : "play";
        if (b.dataset.state !== state) {
          b.dataset.state = state;
          b.setAttribute("aria-label", { pause: "Pause", replay: "Replay", play: "Play" }[state]);
        }
      }
      if (action === "prev") b.disabled = f.step <= 0;
      if (action === "next") b.disabled = f.step >= steps.length - 1;
    });
    for (const slider of f.sliders) slider.sync();
    document.querySelectorAll(`input[data-fs-param^="${f.id}:"], select[data-fs-param^="${f.id}:"]`).forEach((input) => {
      const name = input.dataset.fsParam.slice(f.id.length + 1);
      if (input.type === "checkbox") input.checked = !!f.params[name];
      else if (document.activeElement !== input) input.value = f.params[name];
    });
    document.querySelectorAll(`[data-fs-scrub^="${f.id}:"]`).forEach((span) => {
      const name = span.dataset.fsScrub.slice(f.id.length + 1);
      span.textContent = format(f, name);
      span.setAttribute("aria-valuenow", f.params[name]);
    });
    document.querySelectorAll(`[data-fs-dots="${f.id}"] i`).forEach((dot, i) => { dot.toggleAttribute("data-on", i === f.step); });
    writeOutputs(f);
  }
  const finiteDone = (f) => Number.isFinite(f.duration) && f.t >= f.duration - 1e-6;

  // ---------- one loop for every figure; it sleeps when nothing visible is changing ----------
  function wake() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    let busy = false;
    if (tip.open && tip.target) {
      const x = tip.follower.x;
      const y = tip.follower.y;
      const settled = follow(tip.follower, tip.target, dt);
      if (tip.follower.x !== x || tip.follower.y !== y) placeTip();
      if (!settled) busy = true;
    }
    for (const fn of animations) if (fn(dt)) animations.delete(fn);
    if (animations.size) busy = true;
    for (const f of figures.values()) {
      if (!f.w || !f.visible || document.hidden) continue;
      if (f.pointerFollow?.target) {
        const x = f.pointerFollow.x;
        const y = f.pointerFollow.y;
        const settled = follow(f.pointerFollow, f.pointerFollow.target, dt);
        f.hoverSmooth = f.pointerFollow;
        if (f.hoverT != null && f.pointerToT) f.hoverTSmooth = f.pointerToT(f.hoverSmooth.x);
        if (f.pointerFollow.x !== x || f.pointerFollow.y !== y) f.dirty = true;
        if (!settled) busy = true;
      }
      if (f.playing) {
        const step = dt * f.rate;
        f.spec.update?.(f, step);
        f.t += step;
        if (Number.isFinite(f.duration) && f.t >= f.duration) {
          if (f.spec.loop) f.t %= f.duration;
          else { f.t = f.duration; f.playing = false; f.emit("end"); sync(f); }
        }
        f.dirty = true;
        busy = busy || f.playing;
        document.querySelectorAll(`input[data-fs-seek="${f.id}"]`).forEach((s) => { s.value = f.t; });
        for (const slider of f.seekSliders || []) slider.sync(true);
        writeOutputs(f);
      }
      if (f.tTarget !== null && !f.playing) {
        // Target-based clock: a critically damped glide that keeps its velocity when the target moves.
        spring(f.tState, f.tTarget, f.tSmooth, dt);
        f.t = Number.isFinite(f.duration) ? clamp(f.tState.value, 0, f.duration) : f.tState.value;
        if (Math.abs(f.t - f.tTarget) < 1e-3 * (1 + Math.abs(f.tTarget)) && Math.abs(f.tState.velocity) < 1e-2) {
          f.t = f.tTarget;
          f.tTarget = null;
          sync(f);
        }
        f.dirty = busy = true;
        for (const slider of f.seekSliders || []) slider.sync(true);
        writeOutputs(f);
      }
      for (const name in f.params) {
        const target = f.params[name];
        if (typeof target !== "number") continue;
        if (Math.abs(f.v[name] - target) > 1e-4 * (1 + Math.abs(target))) {
          f.v[name] = damp(f.v[name], target, 12, dt);
          f.dirty = busy = true;
        } else f.v[name] = target;
      }
      if (f.stepT < 1) {
        f.stepT = Math.min(1, f.stepT + dt / (f.spec.stepDuration || 0.48));
        f.dirty = busy = true;
      }
      if (f.dirty) draw(f);
    }
    if (busy && !raf) raf = requestAnimationFrame(tick);
  }
  function draw(f) {
    if (!f.w) return;
    f.dirty = false; // cleared first so render may request another frame via fig.redraw()
    if (f.ctx) {
      f.ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
      f.ctx.clearRect(0, 0, f.w, f.h);
      f.ctx.globalAlpha = 1;
      f.ctx.setLineDash([]);
    }
    try { f.spec.render(f, f.ctx); } catch (error) { console.error(`FS #${f.id}`, error); f.playing = false; sync(f); }
    positionHandles(f);
  }

  // ---------- themes ----------
  function setTheme(name, scope = document.documentElement) {
    if (!name || name === "default") delete scope.dataset.fsTheme;
    else scope.dataset.fsTheme = name;
  }
  function setMode(mode, scope = document.documentElement) {
    if (mode) scope.dataset.fsMode = mode;
    else delete scope.dataset.fsMode;
  }
  const rethemeAll = () => { figures.forEach((f) => { readTheme(f); reserveOutputs(f); }); wake(); };
  // A host page may tween its palette on <html> (the site animates every color token at once). While that runs,
  // read the colors again every frame so canvases change with the page instead of snapping at the end.
  let following = 0;
  const followTheme = () => {
    rethemeAll();
    if (following) return;
    const step = () => {
      // Paint in this frame, with the colors the page paints in this frame; waiting for the next tick lags by one.
      figures.forEach((f) => { readTheme(f); draw(f); });
      following = document.documentElement.getAnimations().some((a) => a.playState === "running") ? requestAnimationFrame(step) : 0;
    };
    following = requestAnimationFrame(step);
  };
  // Root-level theme switches (including a host site's .dark/.light class); plates are watched per figure.
  new MutationObserver(followTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-fs-theme", "data-fs-mode", "class", "data-style-palette"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", rethemeAll);
  reducedQuery.addEventListener("change", () => { figures.forEach((f) => { applyReduced(f); sync(f); }); wake(); });
  document.addEventListener("visibilitychange", wake);
  document.fonts?.ready.then(rethemeAll);

  global.FS = {
    figure,
    get: (id) => figures.get(id)?.api,
    list: () => [...figures.keys()],
    setTheme,
    setMode,
    wake,
    k,
    ease,
    hop,
    travel,
    window: window_,
    damp,
    follow,
    spring,
    clamp,
    lerp,
    remap,
    rng,
    gauss,
    reduced: () => reducedQuery.matches,
    rubber,
    springTo,
    animate,
    slider: buildSlider,
    tabs: buildTabs,
    reserve,
    tip: (content, anchor) => (content ? requestTip(content, anchor, null, true) : hideTip()),
  };
})(typeof window !== "undefined" ? window : globalThis);
