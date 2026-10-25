/* Conscious micro-epochs: thirteen figures on the runtime. Every animation is a seeded simulation built from numbers
   the paper reports (figure numbers in the captions); none shows recorded data. Faces are drawn glyphs standing in
   for points in the paper's face space. State 1 = the flashed face, the one that is seen (solid). State 2 = the
   primed face, still on screen but suppressed (hatched or dashed). */
(() => {
  // ---------- shared helpers ----------
  const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = (r) => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const poisson = (r, lam) => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };
  const lsSlope = (xs, ys) => { let mx = 0, my = 0; const n = xs.length; for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; } mx /= n; my /= n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; } return { b: sxy / sxx, a: my - (sxy / sxx) * mx }; };
  const DWELL = 67;   // ms, the paper's mean dwell from the autocorrelation fit (Fig. 2d, Methods)
  /** A run of one state: solid for state 1, hatched over the raised surface for state 2. */
  function fillState(f, c, x, y, w, h, s) {
    if (w <= 0) return;
    const C = f.C;
    if (s === 1) { c.fillStyle = C.fg; c.fillRect(x, y, w, h); }
    else { c.fillStyle = C.surface2; c.fillRect(x, y, w, h); c.fillStyle = FS.k.hatch(f, c, C.muted, 5); c.fillRect(x, y, w, h); }
  }
  function runs(f, c, states, xOf, cw, y, h, upto) {
    const n = upto == null ? states.length : Math.min(upto, states.length);
    let k = 0;
    while (k < n) { let j = k; while (j + 1 < n && states[j + 1] === states[k]) j++; fillState(f, c, xOf(k), y, (j - k + 1) * cw + 0.6, h, states[k]); k = j + 1; }
  }
  const text = (f, c, s, x, y, o = {}) => FS.k.text(f, c, s, x, y, { size: 11, ...o });
  const vtext = (f, c, s, x, y, o = {}) => { c.save(); c.translate(x, y); c.rotate(-Math.PI / 2); FS.k.text(f, c, s, 0, 0, { align: "center", size: 10.5, ...o }); c.restore(); };
  function wrap(f, c, s, x, y, maxW, lh, o = {}) {
    c.font = `${o.weight || 400} ${o.size || 13}px ${f.C.font}`;
    const words = s.split(" "); let line = "";
    for (const w of words) { const t = line ? `${line} ${w}` : w; if (c.measureText(t).width > maxW && line) { text(f, c, line, x, y, o); y += lh; line = w; } else line = t; }
    if (line) { text(f, c, line, x, y, o); y += lh; }
    return y;
  }
  const line = (c, x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
  // drawn faces: ten parameters standing in for a point in face space
  const FACE_A = [0.7, -0.3, 0.6, 0.8, -0.4, 0.7, -0.6, 0.7, -0.7, 0.3];     // primed, suppressed
  const FACE_B = [-0.6, 0.6, -0.5, -0.5, 0.7, -0.6, 0.7, -0.5, 0.8, -0.4];   // flashed, seen
  const mixFace = (a, b, t) => a.map((v, i) => FS.lerp(v, b[i], t));
  const dashFor = (s) => [Math.max(2, s * 0.05), Math.max(2, s * 0.04)];
  function drawFace(f, c, cx, cy, s, p, o = {}) {
    const C = f.C;
    c.save();
    c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.strokeStyle = o.color || C.fg; c.fillStyle = o.color || C.fg;
    c.lineWidth = o.lw || Math.max(1.2, s / 55); c.lineCap = "round"; c.lineJoin = "round";
    c.setLineDash(o.dash || []);
    const rx = s * (0.34 + 0.05 * p[0]), ry = s * (0.44 + 0.04 * p[1]), jaw = 0.16 + 0.12 * p[2];
    c.beginPath();
    for (let k = 0; k <= 72; k++) { const a = (k / 72) * Math.PI * 2, sn = Math.sin(a), lo = Math.max(0, sn); const x = cx + rx * Math.cos(a) * (1 - jaw * lo * lo), y = cy + ry * sn; k ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.closePath(); c.stroke();
    const ey = cy - s * (0.07 + 0.035 * p[9]), ex = s * (0.13 + 0.03 * p[3]), er = s * (0.04 + 0.014 * p[4]);
    for (const sg of [-1, 1]) {
      c.beginPath(); c.ellipse(cx + sg * ex, ey, er * 1.35, er * 0.85, 0, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]); c.beginPath(); c.arc(cx + sg * ex, ey, Math.max(0.8, er * 0.38), 0, Math.PI * 2); c.fill(); c.setLineDash(o.dash || []);
      const by = ey - er * 2.2, bl = s * 0.085, tilt = 0.32 * p[5];
      line(c, cx + sg * (ex - bl * 0.9), by + tilt * bl, cx + sg * (ex + bl * 0.9), by - tilt * bl);
    }
    const ny = cy + s * (0.08 + 0.04 * p[6]);
    c.beginPath(); c.moveTo(cx, ey + er); c.lineTo(cx - s * 0.03, ny); c.lineTo(cx + s * 0.025, ny + s * 0.01); c.stroke();
    const my = cy + s * (0.21 + 0.025 * p[6]), mw = s * (0.1 + 0.035 * p[7]), cu = s * 0.06 * p[8];
    c.beginPath(); c.moveTo(cx - mw, my); c.quadraticCurveTo(cx, my + cu, cx + mw, my); c.stroke();
    c.restore();
  }
  const hit = (f, x, y) => f.state.hits?.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)?.kind ?? null;

  /* ================= Fig 0: the hero raster (process) ================= */
  (() => {
    function push(S) {
      if (S.r() < S.bin / DWELL) { S.s = 3 - S.s; S.flips++; }
      const sp = new Uint8Array(S.N);
      for (let i = 0; i < S.N; i++) { const pref = i < S.N / 2 ? 1 : 2; const rate = (pref === S.s ? 72 : 9) * S.mul[i]; sp[i] = S.r() < (rate * S.bin) / 1000 ? 1 : 0; }
      S.cols.push({ s: S.s, sp }); if (S.cols.length > S.win / S.bin) S.cols.shift();
      S.ms += S.bin;
    }
    const tips = {
      seen: { title: "Cells that prefer the seen face", body: "Simulated cells that fire more for the flashed face. They are busy while the population carries it and quiet otherwise." },
      supp: { title: "Cells that prefer the suppressed face", body: "The other half. In the recordings, cells like these fire for a face the animal is not seeing (Fig. 2e–g)." },
      carried: { title: "Which face the population carries", body: "Solid: the seen face (state 1). Hatched: the suppressed face (state 2). The flips come about 15 times a second (Fig. 2d, Fig. 5)." },
      face: { title: "The two faces", body: "Both stay on screen the whole time. Only one is seen; the lit face follows what the population carries." },
    };
    FS.figure("fig-hero", {
      height: (w) => (w < 640 ? 350 : 310),
      params: { slow: { value: 10, min: 2, max: 40, step: 1, label: "Slowed down by", format: (v) => `${Math.round(v)}×` } },
      reserve: { state: ["carrying the suppressed face"], flips: ["999 flips in 99.9 s of brain time"] },
      tips, tipAt: hit, settle: 2,
      init(f) { const S = f.state; S.r = mulberry(7); S.N = 36; S.bin = 5; S.win = 600; S.cols = []; S.acc = 0; S.s = 1; S.flips = 0; S.ms = 0; S.mul = []; for (let i = 0; i < S.N; i++) S.mul.push(0.6 + 0.8 * S.r()); for (let k = 0; k < S.win / S.bin; k++) push(S); S.flips = 0; S.ms = 0; S.alpha = [1, 0.2]; },
      update(f, dt) { const S = f.state; S.acc += (dt * 1000) / f.v.slow; while (S.acc >= S.bin) { S.acc -= S.bin; push(S); } const tg = S.s === 1 ? [1, 0.2] : [0.2, 1]; for (let i = 0; i < 2; i++) S.alpha[i] += (tg[i] - S.alpha[i]) * Math.min(1, dt * 5); },
      render(f, c) {
        const S = f.state, C = f.C, W = f.w, H = f.h, nar = W < 640, hits = (f.state.hits = []);
        let rx0, ry0;
        if (nar) {
          const fs = 62, fy = 40;
          drawFace(f, c, W * 0.27, fy, fs, FACE_B, { alpha: S.alpha[0] }); drawFace(f, c, W * 0.73, fy, fs, FACE_A, { alpha: S.alpha[1], dash: dashFor(fs) });
          text(f, c, "flashed · seen", W * 0.27, fy + 46, { align: "center", size: 10, color: S.s === 1 ? C.fg : C.muted }); text(f, c, "primed · suppressed", W * 0.73, fy + 46, { align: "center", size: 10, color: S.s === 2 ? C.fg : C.muted });
          hits.push({ kind: "face", x: 0, y: 0, w: W, h: 90 }); rx0 = 22; ry0 = 108;
        } else {
          const fs = 86;
          drawFace(f, c, 80, H * 0.25, fs, FACE_B, { alpha: S.alpha[0] }); drawFace(f, c, 80, H * 0.64, fs, FACE_A, { alpha: S.alpha[1], dash: dashFor(fs) });
          text(f, c, "flashed face · seen", 80, H * 0.25 + 58, { align: "center", size: 10, color: S.s === 1 ? C.fg : C.muted }); text(f, c, "primed face · suppressed", 80, H * 0.64 + 58, { align: "center", size: 10, color: S.s === 2 ? C.fg : C.muted });
          hits.push({ kind: "face", x: 0, y: 0, w: 170, h: H }); rx0 = 200; ry0 = 16;
        }
        const rx1 = W - 2, ry1 = H - 58, n = S.cols.length, cw = (rx1 - rx0) / n, off = (S.acc / S.bin) * cw, rh = (ry1 - ry0) / S.N, xOf = (k) => rx1 - (n - k) * cw - off;
        if (nar) { vtext(f, c, "prefer seen", 9, ry0 + (ry1 - ry0) * 0.25, { size: 9 }); vtext(f, c, "prefer supp.", 9, ry0 + (ry1 - ry0) * 0.75, { size: 9 }); }
        else { vtext(f, c, "prefer the seen face", rx0 - 12, ry0 + (ry1 - ry0) * 0.25, { size: 9.5 }); vtext(f, c, "prefer the suppressed", rx0 - 12, ry0 + (ry1 - ry0) * 0.75, { size: 9.5 }); text(f, c, "carried", rx0 - 8, ry1 + 21, { align: "right", size: 9.5 }); }
        hits.push({ kind: "seen", x: rx0, y: ry0, w: rx1 - rx0, h: (ry1 - ry0) / 2 }, { kind: "supp", x: rx0, y: ry0 + (ry1 - ry0) / 2, w: rx1 - rx0, h: (ry1 - ry0) / 2 }, { kind: "carried", x: rx0, y: ry1 + 8, w: rx1 - rx0, h: 20 });
        c.save(); c.beginPath(); c.rect(rx0, 0, rx1 - rx0, H); c.clip();
        c.fillStyle = C.fg; c.globalAlpha = 0.05; for (let k = 0; k < n; k++) if (S.cols[k].s === 1) c.fillRect(xOf(k), ry0, cw + 0.6, ry1 - ry0); c.globalAlpha = 1;
        c.strokeStyle = C.line; c.setLineDash([3, 4]); line(c, rx0, ry0 + (rh * S.N) / 2, rx1, ry0 + (rh * S.N) / 2); c.setLineDash([]);
        c.strokeStyle = C.fg; c.lineWidth = 1; c.beginPath();
        for (let k = 0; k < n; k++) { const x = Math.round(xOf(k) + cw / 2) + 0.5, sp = S.cols[k].sp; for (let i = 0; i < S.N; i++) if (sp[i]) { const y = ry0 + i * rh; c.moveTo(x, y + 1); c.lineTo(x, y + rh - 1); } }
        c.stroke();
        runs(f, c, S.cols.map((o) => o.s), xOf, cw, ry1 + 10, 15);
        c.restore();
        const px = rx1 - off; c.strokeStyle = C.strong; c.lineWidth = 1; line(c, px, ry0, px, ry1 + 25);
        const sb = (100 / S.bin) * cw; c.strokeStyle = C.muted; line(c, rx1 - sb, H - 12, rx1, H - 12); line(c, rx1 - sb, H - 16, rx1 - sb, H - 8); line(c, rx1, H - 16, rx1, H - 8);
        text(f, c, "100 ms", rx1 - sb - 8, H - 8, { align: "right", size: 10 }); text(f, c, `simulated · slowed ${Math.round(f.v.slow)}×`, rx0, H - 8, { size: 10 });
        f.api.out("state", S.s === 1 ? "carrying the seen face" : "carrying the suppressed face");
        f.api.out("flips", `${S.flips} ${S.flips === 1 ? "flip" : "flips"} in ${(S.ms / 1000).toFixed(1)} s of brain time`);
      },
    });
  })();

  /* ================= Fig 1: the puzzle scatter (two steps) ================= */
  (() => {
    const steps = [
      { caption: "If face cells tracked perception, selectivity during rivalry would equal selectivity when the faces are shown alone: every dot on the diagonal." },
      { caption: "What the recordings show: selectivity collapses to about a quarter (slope 0.23). Nearly every strongly selective cell falls below the line. 5,550 cell–stimulus pairs, p = 8×10⁻¹³³ (Fig. 1h)." },
    ];
    FS.figure("fig-puzzle", {
      height: (w) => (w < 640 ? w - 56 + 62 : 400),
      steps,
      tips: { dots: { title: "One dot, one cell and stimulus pair", body: "Its selectivity for a pair of faces, measured when the faces are shown alone (across) and during rivalry (up). Illustrative dots; the slope is the paper's." } },
      tipAt: hit,
      init(f) { const r = mulberry(11), P = []; while (P.length < 440) { const x = 0.22 + 0.36 * gauss(r); if (Math.abs(x) < 0.08 || Math.abs(x) > 0.97) continue; P.push({ x, z: gauss(r) }); } f.state.P = P; },
      render(f, c) {
        const S = f.state, C = f.C, W = f.w, H = f.h, nar = W < 640, k = f.step === 1 ? FS.ease.inOut(f.stepT) : 1 - FS.ease.inOut(f.stepT);
        const px = nar ? 40 : 66, py = 10, side = nar ? W - 56 : H - 66, X = (v) => px + ((v + 1) / 2) * side, Y = (v) => py + (1 - (v + 1) / 2) * side;
        f.state.hits = [{ kind: "dots", x: px, y: py, w: side, h: side }];
        c.strokeStyle = C.line; c.lineWidth = 1; c.strokeRect(px + 0.5, py + 0.5, side, side);
        c.setLineDash([2, 4]); line(c, X(0), py, X(0), py + side); line(c, px, Y(0), px + side, Y(0)); c.setLineDash([]);
        for (const v of [-1, 0, 1]) { text(f, c, String(v).replace("-", "−"), X(v), py + side + 16, { align: "center", size: 10 }); text(f, c, String(v).replace("-", "−"), px - 8, Y(v) + 4, { align: "right", size: 10 }); }
        text(f, c, "selectivity when the faces are shown alone", X(0), py + side + 38, { align: "center", size: 10 }); vtext(f, c, "selectivity during rivalry", px - 28, Y(0), { size: 10 });
        c.strokeStyle = C.muted; c.lineWidth = 1.4; c.setLineDash([6, 5]); line(c, X(-1), Y(-1), X(1), Y(1)); c.setLineDash([]);
        c.fillStyle = C.fg; c.globalAlpha = 0.55;
        for (const p of S.P) { const y = FS.clamp(FS.lerp(p.x, 0.23 * p.x + 0.13 * p.z, k), -0.98, 0.98); c.beginPath(); c.arc(X(p.x), Y(y), 1.8, 0, 6.2832); c.fill(); }
        c.globalAlpha = 1;
        text(f, c, "slope 1", X(0.62), Y(0.8), { color: C.muted });
        c.globalAlpha = k; c.strokeStyle = C.strong; c.lineWidth = 2.2; line(c, X(-1), Y(-0.23), X(1), Y(0.23)); c.globalAlpha = 1;
        FS.k.label(f, c, "slope 0.23", X(0.98), Y(0.23) - 10, { align: "right", size: 11, weight: 600, color: C.strong, alpha: k });
        if (!nar) { const ax = px + side + 40, on = k >= 0.5; text(f, c, on ? "what the recordings show" : "if cells tracked perception", ax, py + 30, { size: 11, color: C.fg, weight: 600 }); text(f, c, on ? "slope 0.23" : "slope 1", ax, py + 64, { size: 26, weight: 600, color: C.fg }); text(f, c, on ? "5,550 cell–stimulus pairs" : "every dot on the diagonal", ax, py + 90, { size: 11, color: C.fg }); text(f, c, on ? "p = 8×10⁻¹³³" : "the null hypothesis", ax, py + 108, { size: 11 }); text(f, c, "Fig. 1h", ax, py + side - 4, { size: 10 }); }
      },
    });
  })();

  /* ================= Fig 2: binocular flash suppression (timeline, brain seconds −1 to +1) ================= */
  (() => {
    const tips = {
      left: { title: "Left eye", body: "The primed face, shown alone for 1 to 2 s before the flash and still shown after it." },
      right: { title: "Right eye", body: "Blank until the flash, then the second face. Anaglyph goggles send each eye its own image." },
      percept: { title: "What is seen", body: "The primed face before the flash; after it, only the flashed face. In 14 people this held on 82% of trials against 87% for an image with no competitor (Fig. 1b, Methods)." },
      window: { title: "Analysis window", body: "300 to 1000 ms after the flash: every neural analysis in the paper uses this window, when the flashed face dominates." },
    };
    FS.figure("fig-flash", {
      height: (w) => (w < 640 ? 520 : 330),
      duration: 2.0, keyframe: 1.6,
      chapters: [{ t: 0.2, label: "priming" }, { t: 1.0, label: "the flash" }, { t: 1.3, label: "window opens" }, { t: 2.0, label: "+1 s" }],
      formatTime: (t) => { const s = t - 1; return `${s < 0 ? "−" : "+"}${Math.abs(s).toFixed(2)} s from the flash`; },
      timeAxis: (f) => ({ x0: f.w < 640 ? 76 : 136, x1: f.w - (f.w < 640 ? 12 : 40), t1: 2.0 }),
      tips, tipAt: hit,
      init(f) { f.rate = 0.5; },
      render(f, c) {
        const C = f.C, W = f.w, H = f.h, nar = W < 640, tt = f.t - 1, xf = FS.clamp(tt / 0.12, 0, 1), hits = (f.state.hits = []);
        const panel = (x, y, s, lab, sub, thick, kind) => { c.fillStyle = C.bg; FS.k.rrect(c, x, y, s, s, 4); c.fill(); c.strokeStyle = thick ? C.fg : C.line; c.lineWidth = thick ? 1.6 : 1; FS.k.rrect(c, x, y, s, s, 4); c.stroke(); text(f, c, lab, x + s / 2, y + s + 17, { align: "center", size: 10, color: C.fg }); text(f, c, sub, x + s / 2, y + s + 31, { align: "center", size: 10 }); hits.push({ kind, x, y, w: s, h: s + 32 }); };
        let P, L, R, Pc, PcS, ey;
        if (nar) { P = Math.min(130, (W - 30) / 2); ey = 6; L = [W / 2 - P - 10, ey]; R = [W / 2 + 10, ey]; PcS = Math.min(140, P * 1.05); Pc = [W / 2 - PcS / 2, ey + P + 66]; }
        else { P = Math.min(128, (W - 260) / 3.4); ey = 8; L = [40, ey]; R = [40 + P + 26, ey]; PcS = P * 1.12; Pc = [W - 40 - PcS, ey - 2]; }
        panel(L[0], L[1], P, "left eye", tt < 0 ? "primed face" : "primed face, still shown", false, "left");
        drawFace(f, c, L[0] + P / 2, L[1] + P / 2, P * 0.82, FACE_A, { dash: dashFor(P * 0.82) });
        panel(R[0], R[1], P, "right eye", tt < 0 ? "blank" : "flashed face", false, "right");
        if (tt >= 0) drawFace(f, c, R[0] + P / 2, R[1] + P / 2, P * 0.82, FACE_B, { alpha: xf });
        panel(Pc[0], Pc[1], PcS, "what is seen", tt < 0 ? "the primed face" : "only the flashed face", true, "percept");
        const fs = PcS * 0.82;
        if (xf < 1) drawFace(f, c, Pc[0] + PcS / 2, Pc[1] + PcS / 2, fs, FACE_A, { dash: dashFor(fs), alpha: 1 - xf });
        if (xf > 0) drawFace(f, c, Pc[0] + PcS / 2, Pc[1] + PcS / 2, fs, FACE_B, { alpha: xf });
        if (nar) FS.k.arrow(c, W / 2, ey + P + 38, W / 2, Pc[1] - 8, C.muted);
        else { const ax0 = R[0] + P + 18, ax1 = Pc[0] - 16, ay = ey + P / 2; FS.k.arrow(c, ax0, ay, ax1, ay, C.muted); text(f, c, "brain", (ax0 + ax1) / 2, ay - 9, { align: "center", size: 10 }); }
        const x0 = nar ? 76 : 136, x1 = W - (nar ? 12 : 40), tx = (s) => x0 + ((s + 1) / 2) * (x1 - x0), base = H - 104, rowsY = [base, base + 20, base + 40], labs = ["left eye", "right eye", "seen"];
        c.save(); c.globalAlpha = 0.5; c.fillStyle = FS.k.hatch(f, c, C.faint, 7); c.fillRect(tx(0.3), base - 22, tx(1) - tx(0.3), 82); c.restore();
        hits.push({ kind: "window", x: tx(0.3), y: base - 34, w: tx(1) - tx(0.3), h: 94 });
        text(f, c, nar ? "300–1000 ms" : "analysis window · 300–1000 ms", tx(0.65), base - 28, { align: "center", size: 10, color: C.fg });
        for (let i = 0; i < 3; i++) text(f, c, labs[i], x0 - 10, rowsY[i] + 10, { align: "right", size: 10, color: i === 2 ? C.fg : C.muted });
        const tc = Math.min(tt, 1);
        fillState(f, c, tx(-1), rowsY[0], tx(tc) - tx(-1), 12, 2);
        if (tc > 0) fillState(f, c, tx(0), rowsY[1], tx(tc) - tx(0), 12, 1);
        fillState(f, c, tx(-1), rowsY[2], tx(Math.min(tc, 0)) - tx(-1), 12, 2);
        if (tc > 0) fillState(f, c, tx(0), rowsY[2], tx(tc) - tx(0), 12, 1);
        const ay = base + 70; c.strokeStyle = C.line; c.lineWidth = 1; line(c, x0, ay, x1, ay);
        for (const v of [-1, -0.5, 0, 0.5, 1]) { line(c, tx(v), ay, tx(v), ay + 5); text(f, c, (v === 0 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v)) + (Math.abs(v) === 1 ? " s" : ""), tx(v), ay + 18, { align: "center", size: 10 }); }
        c.strokeStyle = C.fg; c.setLineDash([3, 3]); line(c, tx(0), base - 14, tx(0), ay); c.setLineDash([]);
        text(f, c, "flash", tx(0), base - 18, { align: "center", size: 10, color: C.fg });
        FS.k.hoverTime(f, c, base - 22, ay, (s) => tx(s - 1), (s) => `${s - 1 < 0 ? "−" : "+"}${Math.abs(s - 1).toFixed(2)} s`);
        FS.k.playhead(f, c, tx(tc), base - 6, ay);
        f.api.out("phase", tt < 0 ? "the primed face alone, seen" : tt < 0.3 ? "the flash: the new face takes over" : "the flashed face is seen, the primed face suppressed");
      },
    });
  })();

  /* ================= Fig 3: where the probes went (flow) ================= */
  (() => {
    const meta = {
      eye: { label: "Eyes", sub: "one face each", tip: { title: "Eyes", body: "Anaglyph goggles: the left eye sees the primed face, the right eye the flashed one." } },
      early: { label: "V1 to V4", sub: "not recorded", tip: { title: "Early visual cortex", body: "Not recorded in this study; the probes sat higher in the hierarchy." } },
      ML: { label: "ML", sub: "middle lateral face patch", tip: { title: "ML", body: "A face patch in inferotemporal cortex, found with fMRI. 91% of visually responsive cells were face-selective in the example session (Fig. 1f)." } },
      AM: { label: "AM", sub: "anterior medial face patch", tip: { title: "AM", body: "The most anterior face patch; 71% face-selective cells in the example session (Fig. 1f). ML and AM were recorded at once: 429 cells in one trial (Fig. 1g)." } },
      PVL: { label: "PVL", sub: "ventrolateral prefrontal", tip: { title: "PVL", body: "A prefrontal region near the infraprincipal dimple. 661 prefrontal neurons in all, with PO (Methods)." } },
      PO: { label: "PO", sub: "orbitofrontal", tip: { title: "PO", body: "The lateral orbitofrontal sulcus. Prefrontal cortex is where front-of-brain theories expect a pure signal of what is seen." } },
    };
    const layouts = {
      wide: { box: [960, 300], at: { eye: [20, 120, 130], early: [200, 120, 140], ML: [390, 120, 130], AM: [560, 120, 130], PVL: [760, 36, 160], PO: [760, 204, 160] } },
      narrow: { box: [360, 520], at: { eye: [100, 10, 160], early: [100, 90, 160], ML: [100, 170, 160], AM: [100, 250, 160], PVL: [100, 340, 160], PO: [100, 420, 160] } },
    };
    const edges = [["eye", "early"], ["early", "ML"], ["ML", "AM"], { a: "AM", b: "PVL", wide: "x", narrow: "y" }, { a: "AM", b: "PO", wide: "x", narrow: "right" }];
    const steps = [
      { on: Object.keys(meta), caption: "Four regions were recorded in two macaques with Neuropixels NHP probes: a 45 mm shaft, 384 of its 4,416 contacts recording at once. Step through them." },
      { on: ["eye", "early"], caption: "Each eye gets its own face. Early visual areas were not recorded." },
      { on: ["ML", "AM"], caption: "Two face patches in inferotemporal cortex, located first with fMRI. In one example trial 429 cells were recorded together (Fig. 1g)." },
      { on: ["PVL", "PO"], caption: "Two prefrontal regions, recorded in a separate set of experiments: 661 neurons in all (Methods)." },
      { on: ["ML", "AM", "PVL", "PO"], caption: "The faces: 1,500 synthetic faces in 750 rival pairs, each a point in a 50-dimensional face space (20 shape and 30 appearance features)." },
    ];
    flowFigure("fig-rig", { meta, layouts, edges, steps, regions: [{ label: "inferotemporal", keys: ["ML", "AM"] }, { label: "prefrontal", keys: ["PVL", "PO"] }] });
  })();

  /* ================= Fig 4: the decoder at work (process) ================= */
  (() => {
    const STEP = 0.22;
    function bin(S) {
      if (S.r() < S.dt / DWELL) S.hidden = 3 - S.hidden;
      const n = new Uint8Array(S.N), contrib = new Float32Array(S.N); let L = 0;
      for (let i = 0; i < S.N; i++) { const lam = ((S.hidden === 1 ? S.lc[i] : S.ls[i]) * S.dt) / 1000; n[i] = poisson(S.r, lam); contrib[i] = n[i] * S.w[i] - S.b[i]; L += contrib[i]; }
      const dec = L > 0 ? 1 : 2; S.correct += dec === S.hidden ? 1 : 0; S.total++;
      const pos = S.disp.map((i) => { const a = []; for (let q = 0; q < n[i]; q++) a.push(0.12 + 0.76 * S.r()); return a; });
      S.bins.push({ h: S.hidden, L, dec, contrib, pos }); if (S.bins.length > 41) S.bins.shift();
    }
    const tips = {
      templates: { title: "Templates, from priming", body: "Each neuron's average rate for the face that will be seen (solid) and the one that will be suppressed (hatched), measured when each face is shown alone." },
      raster: { title: "Spikes in 10 ms bins", body: "14 of 60 simulated neurons. Each tick is a spike. Even rows prefer the seen face, odd rows the suppressed one." },
      trace: { title: "ℓ(t), the evidence", body: "Positive: the bin looks like the seen face. Negative: like the suppressed face. The sum of every neuron's weighted vote." },
      decoded: { title: "Decoded state", body: "The sign of ℓ: state 1 above zero, state 2 below." },
      truth: { title: "Hidden truth", body: "Known only because this is a simulation. In the brain nobody knows it, which is why the controls in step 07 matter." },
      evidence: { title: "Who voted how, newest bin", body: "A spike from a cell that strongly prefers the seen face pushes ℓ up a lot; silence from that cell pulls it down a little." },
    };
    FS.figure("fig-llr", {
      height: (w) => (w < 760 ? 368 : 380),
      reserve: { readout: ["ℓ = −99.9 · state 2 · agrees with the truth 100%"] },
      tips, tipAt: hit, settle: 3,
      init(f) {
        const S = f.state; S.r = mulberry(23); S.N = 60; S.dt = 10; S.lc = []; S.ls = [];
        for (let i = 0; i < S.N; i++) { const base = 6 + 18 * S.r(), sel = 1.6 + 1.6 * S.r(), prefC = i % 2 === 0; S.lc.push(prefC ? base * sel : base); S.ls.push(prefC ? base : base * sel); }
        S.disp = [0, 2, 4, 6, 8, 10, 12, 1, 3, 5, 7, 9, 11, 13]; S.w = S.lc.map((v, i) => Math.log(v / S.ls[i])); S.b = S.lc.map((v, i) => ((v - S.ls[i]) * S.dt) / 1000);
        S.bins = []; S.hidden = 1; S.acc = 0; S.correct = 0; S.total = 0; for (let k = 0; k < 41; k++) bin(S);
      },
      update(f, dt) { const S = f.state; S.acc += dt; while (S.acc >= STEP) { S.acc -= STEP; bin(S); } },
      render(f, c) {
        const S = f.state, C = f.C, W = f.w, H = f.h, nar = W < 760, hits = (f.state.hits = []);
        const tplW = nar ? 62 : 150, rx0 = tplW + (nar ? 8 : 20), evW = nar ? 0 : 196, rx1 = W - evW - (nar ? 0 : 22);
        const y0 = 26, rowH = nar ? 13 : 15, nR = S.disp.length, y1 = y0 + rowH * nR, ncol = 40, cw = (rx1 - rx0) / ncol, off = (S.acc / STEP) * cw, n = S.bins.length, xOf = (k) => rx1 - (n - k) * cw - off;
        text(f, c, nar ? "templates" : "templates, from priming", 0, 12, { size: 10, color: C.fg }); text(f, c, "spikes in 10 ms bins", rx0, 12, { size: 10, color: C.fg }); if (!nar) text(f, c, "evidence, newest bin", W - evW, 12, { size: 10, color: C.fg });
        hits.push({ kind: "templates", x: 0, y: y0, w: tplW, h: y1 - y0 }, { kind: "raster", x: rx0, y: y0, w: rx1 - rx0, h: y1 - y0 });
        let maxR = 0; for (const i of S.disp) maxR = Math.max(maxR, S.lc[i], S.ls[i]);
        S.disp.forEach((i, r) => { const y = y0 + r * rowH; fillState(f, c, 0, y + rowH * 0.1, (S.lc[i] / maxR) * (tplW - 6), rowH * 0.36, 1); fillState(f, c, 0, y + rowH * 0.52, (S.ls[i] / maxR) * (tplW - 6), rowH * 0.36, 2); });
        c.strokeStyle = C.line; c.setLineDash([3, 4]); line(c, 0, y0 + rowH * 7, W, y0 + rowH * 7); c.setLineDash([]);
        const ty0 = y1 + 16, tH = 64, tz = ty0 + tH / 2, dy = ty0 + tH + 10, hy = dy + 20;
        hits.push({ kind: "trace", x: rx0, y: ty0, w: rx1 - rx0, h: tH }, { kind: "decoded", x: rx0, y: dy, w: rx1 - rx0, h: 12 }, { kind: "truth", x: rx0, y: hy, w: rx1 - rx0, h: 12 });
        c.save(); c.beginPath(); c.rect(rx0, 0, rx1 - rx0, H); c.clip();
        c.strokeStyle = C.fg; c.lineWidth = 1; c.beginPath();
        for (let k = 0; k < n; k++) { const x = xOf(k), b = S.bins[k]; for (let r = 0; r < nR; r++) for (const p of b.pos[r]) { const xx = Math.round(x + p * cw) + 0.5, y = y0 + r * rowH; c.moveTo(xx, y + 2); c.lineTo(xx, y + rowH - 2); } }
        c.stroke();
        c.strokeStyle = C.line; c.setLineDash([2, 3]); line(c, rx0, tz, rx1, tz); c.setLineDash([]);
        for (let k = 0; k < n; k++) { const x = xOf(k), L = FS.clamp(S.bins[k].L * 2.6, -tH / 2, tH / 2); if (L > 0) fillState(f, c, x + 1, tz - L, cw - 2, L, 1); else fillState(f, c, x + 1, tz, cw - 2, -L, 2); }
        runs(f, c, S.bins.map((b) => b.dec), xOf, cw, dy, 12); runs(f, c, S.bins.map((b) => b.h), xOf, cw, hy, 12);
        const xn = xOf(n - 1); c.strokeStyle = C.strong; c.lineWidth = 1.4; c.strokeRect(xn + 0.5, y0 - 4, cw - 1, hy + 16 - y0);
        c.restore();
        text(f, c, nar ? "ℓ(t)" : "ℓ(t)  + seen", 0, tz - 6, { size: 10, color: C.fg }); if (!nar) text(f, c, "      − suppressed", 0, tz + 10, { size: 10 });
        text(f, c, nar ? "decoded" : "decoded state", 0, dy + 10, { size: 10, color: C.fg }); text(f, c, nar ? "truth" : "hidden truth (sim)", 0, hy + 10, { size: 10 });
        const nb = S.bins[n - 1], acc = Math.round((100 * S.correct) / Math.max(1, S.total)), Ls = (nb.L >= 0 ? "+" : "−") + Math.abs(nb.L).toFixed(1);
        if (!nar) {
          const ex0 = W - evW, cx = ex0 + evW / 2, half = evW / 2 - 8; hits.push({ kind: "evidence", x: ex0, y: y0, w: evW, h: y1 - y0 });
          c.strokeStyle = C.muted; c.lineWidth = 1; line(c, cx + 0.5, y0 - 2, cx + 0.5, y1 + 2);
          S.disp.forEach((i, r) => { const v = nb.contrib[i], len = FS.clamp(v * 16, -half, half), y = y0 + r * rowH; if (len >= 0) fillState(f, c, cx + 1, y + 3, len, rowH - 6, 1); else fillState(f, c, cx + len, y + 3, -len, rowH - 6, 2); });
          text(f, c, "← suppressed", cx - 6, y1 + 14, { align: "right", size: 10 }); text(f, c, "seen →", cx + 6, y1 + 14, { size: 10 });
          text(f, c, `ℓ = ${Ls}`, ex0 + 4, y1 + 52, { size: 26, weight: 600, color: C.fg }); text(f, c, nb.dec === 1 ? "state 1 · the flashed face" : "state 2 · the primed face", ex0 + 4, y1 + 74, { size: 11, color: C.fg });
          text(f, c, "sum over all 60 neurons", ex0 + 4, y1 + 92, { size: 10 }); text(f, c, `agrees with the truth ${acc}%`, ex0 + 4, y1 + 116, { size: 11, color: C.fg });
        }
        f.api.out("readout", `ℓ = ${Ls} · state ${nb.dec} · agrees with the truth ${acc}%`);
      },
    });
  })();

  /* ================= Fig 5: one percept, many flips (timeline at real speed) ================= */
  (() => {
    const tips = {
      percept: { title: "What is seen", body: "From the human reports: the primed face before the flash, the flashed face after it. In flash suppression the percept does not switch inside the window." },
      pop: { title: "What the population carries", body: "Decoded state in 5 ms steps, simulated with the paper's 67 ms mean dwell after the flash and a slower, primed-face-dominated pattern before it (Fig. 2c)." },
      auto: { title: "Autocorrelation of ℓ(t)", body: "Recorded: fades over tens of milliseconds, fit by a two-state model with a 67 ms mean dwell. Shuffled: gone after one 10 ms bin (Fig. 2d)." },
      rates: { title: "Switches per second", body: "About 15 neural flips a second against about one perceptual switch every two seconds in classic rivalry (Discussion)." },
    };
    FS.figure("fig-time", {
      height: (w) => (w < 640 ? 460 : 340),
      duration: 2.0, keyframe: 2.0,
      chapters: [{ t: 0.5, label: "priming" }, { t: 1.0, label: "the flash" }, { t: 2.0, label: "+1 s" }],
      formatTime: (t) => { const s = t - 1; return `${s < 0 ? "−" : "+"}${Math.abs(s).toFixed(2)} s`; },
      timeAxis: (f) => ({ x0: f.w < 640 ? 0 : 200, x1: f.w - 4, t1: 2.0 }),
      tips, tipAt: hit,
      init(f) { const r = mulberry(5); f.state.seq = []; let s = 2; for (let t = -1000; t < 1000; t += 5) { const D = t < 0 ? (s === 2 ? 150 : 50) : DWELL; if (r() < 5 / D) s = 3 - s; f.state.seq.push(s); } f.rate = 1; },
      render(f, c) {
        const S = f.state, C = f.C, W = f.w, H = f.h, nar = W < 640, tp = -1000 + 2000 * (f.t / 2), hits = (f.state.hits = []);
        const x0 = nar ? 14 : 200, x1 = W - 4, tx = (t) => x0 + ((t + 1000) / 2000) * (x1 - x0);
        let y = 6;
        if (nar) { text(f, c, "what is seen, from human reports", 0, y + 8, { size: 10, color: C.fg }); y += 16; } else { text(f, c, "what is seen", 0, y + 11, { size: 10.5, color: C.fg }); text(f, c, "from human reports", 0, y + 25, { size: 10 }); }
        hits.push({ kind: "percept", x: x0, y, w: x1 - x0, h: 16 });
        fillState(f, c, tx(-1000), y, tx(Math.min(0, tp)) - tx(-1000), 16, 2); if (tp > 0) fillState(f, c, tx(0), y, tx(tp) - tx(0), 16, 1);
        y += 16 + (nar ? 20 : 26);
        if (nar) { text(f, c, "what the population carries", 0, y + 8, { size: 10, color: C.fg }); y += 16; } else { text(f, c, "the population", 0, y + 13, { size: 10.5, color: C.fg }); text(f, c, "decoded state, 5 ms steps", 0, y + 27, { size: 10 }); }
        hits.push({ kind: "pop", x: x0, y, w: x1 - x0, h: 28 });
        const cw = (x1 - x0) / S.seq.length; runs(f, c, S.seq, (k) => x0 + k * cw, cw, y, 28, Math.floor((tp + 1000) / 5));
        const sy0 = 6, sy1 = y + 28; y += 28 + 8;
        c.strokeStyle = C.line; c.lineWidth = 1; line(c, x0, y, x1, y);
        for (const v of [-1000, -500, 0, 500, 1000]) { line(c, tx(v), y, tx(v), y + 5); text(f, c, v === 0 ? "flash" : (v > 0 ? "+" : "−") + Math.abs(v / 1000) + (Math.abs(v) === 1000 ? " s" : ""), tx(v), y + 18, { align: nar && v === -1000 ? "left" : nar && v === 1000 ? "right" : "center", size: 10, color: v === 0 ? C.fg : C.muted }); }
        c.strokeStyle = C.fg; c.setLineDash([3, 3]); line(c, tx(0), sy0, tx(0), y); c.setLineDash([]);
        FS.k.hoverTime(f, c, sy0, y, (s) => tx(-1000 + 1000 * s), (s) => `${s - 1 < 0 ? "−" : "+"}${Math.abs(s - 1).toFixed(2)} s`);
        FS.k.playhead(f, c, tx(tp), sy0 - 2, sy1 + 2);
        if (!nar) text(f, c, "drawn at real speed", x1, y + 34, { align: "right", size: 10 });
        y += 52;
        const ax0 = nar ? 30 : 40, aw = nar ? W - 40 : (W - 40) * 0.5 - 30, ay0 = y + 12, ah = nar ? 128 : H - ay0 - 34, X = (l) => ax0 + (l / 200) * aw, Y = (v) => ay0 + (1 - v) * ah;
        hits.push({ kind: "auto", x: ax0 - 10, y: ay0 - 14, w: aw + 20, h: ah + 34 });
        text(f, c, "autocorrelation of ℓ(t)", ax0, ay0 - 8, { size: 10, color: C.fg });
        c.strokeStyle = C.line; c.lineWidth = 1; line(c, ax0, ay0 + ah, ax0 + aw, ay0 + ah); line(c, ax0, ay0, ax0, ay0 + ah);
        for (const l of [0, 50, 100, 150, 200]) { line(c, X(l), ay0 + ah, X(l), ay0 + ah + 4); text(f, c, String(l), X(l), ay0 + ah + 16, { align: "center", size: 10 }); }
        text(f, c, "lag, ms", ax0 + aw, ay0 + ah + 30, { align: "right", size: 10 }); text(f, c, "1", ax0 - 6, Y(1) + 4, { align: "right", size: 10 }); text(f, c, "0", ax0 - 6, Y(0) + 4, { align: "right", size: 10 });
        const real = (l) => (l < 10 ? FS.lerp(1, 0.5 * Math.exp(-20 / DWELL), l / 10) : 0.5 * Math.exp((-2 * l) / DWELL)), shuf = (l) => (l < 10 ? 1 - l / 10 : 0);
        c.strokeStyle = C.muted; c.lineWidth = 1.4; c.setLineDash([5, 4]); c.beginPath(); for (let l = 0; l <= 200; l++) { l ? c.lineTo(X(l), Y(shuf(l))) : c.moveTo(X(l), Y(shuf(l))); } c.stroke(); c.setLineDash([]);
        c.strokeStyle = C.strong; c.lineWidth = 2; c.beginPath(); for (let l = 0; l <= 200; l++) { l ? c.lineTo(X(l), Y(real(l))) : c.moveTo(X(l), Y(real(l))); } c.stroke();
        FS.k.label(f, c, "recorded: fades over tens of ms", X(30), Y(real(30)) - 12, { size: 10, color: C.fg }); text(f, c, "shuffled: gone after one bin", X(100), Y(0.16), { size: 10 }); FS.k.label(f, c, "two-state fit: mean dwell 67 ms", X(70), Y(0.48), { size: 10, color: C.fg });
        const bx0 = nar ? 0 : ax0 + aw + 70, bw = nar ? W - 10 : W - bx0 - 10, by = nar ? ay0 + ah + 56 : ay0 + 4;
        hits.push({ kind: "rates", x: bx0, y: by - 10, w: bw, h: 100 });
        text(f, c, "switches per second", bx0, by, { size: 10, color: C.fg }); text(f, c, "the population  ≈15", bx0, by + 24, { color: C.fg }); fillState(f, c, bx0, by + 32, bw, 14, 1);
        text(f, c, "perception in rivalry  ≈0.5", bx0, by + 68, {}); fillState(f, c, bx0, by + 76, Math.max(3, (bw * 0.5) / 15), 14, 2);
        if (!nar) wrap(f, c, "About 30 flips of the population for every switch of perception in classic rivalry. In flash suppression the percept does not switch at all inside the window.", bx0, by + 122, bw, 19, { size: 13, color: C.fg });
        f.api.out("note", tp < 0 ? "before the flash: the primed face is seen and mostly carried" : "after the flash: about 15 flips a second while the percept stays put");
      },
    });
  })();

  /* ================= Fig 6: reconstructing a face from each state (three steps) ================= */
  (() => {
    const rows = [
      { lab: "all moments, averaged", target: mixFace(FACE_A, FACE_B, 0.5), dash: [1.5, 3.2], out: "a blend of the two" },
      { lab: "state 1 moments only", target: FACE_B, dash: null, out: "the seen face" },
      { lab: "state 2 moments only", target: FACE_A, dash: "d", out: "the suppressed face" },
    ];
    const steps = [
      { caption: "Average every moment and the decoder returns a blend that matches neither face (Extended Data Fig. 2)." },
      { caption: "Average state 1 moments only: the seen face comes back, some features above 80% explained variance against a 90% ceiling (Fig. 2h–i)." },
      { caption: "Average state 2 moments only: the suppressed face comes back in detail, though the animal is not seeing it (p = 3×10⁻²⁹, Fig. 2i)." },
    ];
    const tips = {
      tape: { title: "Population activity, sorted", body: "The same stream of moments three ways: all of them, only the state 1 moments, only the state 2 moments." },
      decoder: { title: "The decoder W", body: "A linear map from population activity to the 50 face features, trained only on priming, when each face is shown alone. The same W every time." },
      recon: { title: "Reconstruction", body: "The features W returns, drawn as a face. Schematic glyphs; the paper reconstructs its synthetic macaque faces (Fig. 2h)." },
      truth: { title: "Ground truth", body: "The face that was actually shown to that eye." },
    };
    FS.figure("fig-recon", {
      height: (w) => (w < 640 ? 420 : 410),
      steps, tips, tipAt: hit,
      init(f) { const S = f.state; S.r = mulberry(31); S.seq = []; let s = 1; for (let k = 0; k < 400; k++) { if (S.r() < 10 / DWELL) s = 3 - s; S.seq.push(s); } S.noise = [0, 1, 2].map(() => FACE_A.map(() => gauss(S.r) * 0.32)); S.tight = [0, 1, 2].map(() => FACE_A.map(() => gauss(S.r) * 0.08)); S.pos = 0; },
      update(f, dt) { f.state.pos += dt * 6; },
      render(f, c) {
        const S = f.state, C = f.C, W = f.w, H = f.h, nar = W < 640, hits = (f.state.hits = []);
        const top = 30, rowH = (H - top) / 3, tapeR = W * (nar ? 0.3 : 0.33), boxX = W * (nar ? 0.335 : 0.38), boxW = W * 0.075, rcx = W * (nar ? 0.6 : 0.62), tcx = W * (nar ? 0.86 : 0.85), fs = Math.min(rowH * 0.74, W * (nar ? 0.2 : 0.14));
        text(f, c, nar ? "activity" : "population activity, sorted", 0, 12, { size: 10, color: C.fg }); text(f, c, nar ? "W" : "decoder", boxX + boxW / 2, 12, { align: "center", size: 10, color: C.fg }); text(f, c, nar ? "recon." : "reconstruction", rcx, 12, { align: "center", size: 10, color: C.fg }); text(f, c, nar ? "truth" : "ground truth", tcx, 12, { align: "center", size: 10, color: C.fg });
        hits.push({ kind: "tape", x: 0, y: top, w: tapeR, h: H - top }, { kind: "decoder", x: boxX, y: top, w: boxW, h: H - top }, { kind: "recon", x: rcx - fs / 2, y: top, w: fs, h: H - top }, { kind: "truth", x: tcx - fs / 2, y: top, w: fs, h: H - top });
        const nb = 26, bw = tapeR / nb, idx0 = Math.floor(S.pos), frac = S.pos - idx0;
        rows.forEach((row, j) => {
          const cy = top + rowH * (j + 0.5), lit = j === f.step, prog = lit ? FS.ease.out(f.stepT) : 0.15;
          c.globalAlpha = lit ? 1 : 0.45;
          text(f, c, row.lab, 0, cy - 18, { size: 10, color: lit ? C.fg : C.muted });
          c.save(); c.beginPath(); c.rect(0, cy - 10, tapeR, 20); c.clip();
          for (let q = -1; q < nb; q++) { const s = S.seq[(((idx0 - q) % 400) + 400) % 400], x = tapeR - (q + 1) * bw + frac * bw; if (j === 0 || s === j) fillState(f, c, x + 0.5, cy - 7, bw - 1, 14, s); else { c.strokeStyle = C.line; c.lineWidth = 1; c.strokeRect(x + 1, cy - 6.5, bw - 2, 13); } }
          c.restore();
          c.strokeStyle = C.fg; c.lineWidth = 1.2; c.strokeRect(boxX + 0.5, cy - 18 + 0.5, boxW, 36); text(f, c, "W", boxX + boxW / 2, cy + 5, { align: "center", size: 15, weight: 600, color: C.fg });
          FS.k.arrow(c, tapeR + 4, cy, boxX - 4, cy, C.muted); FS.k.arrow(c, boxX + boxW + 4, cy, rcx - fs * 0.45, cy, C.muted);
          const p = row.target.map((v, i) => v + FS.lerp(S.noise[j][i], S.tight[j][i], prog)), dash = row.dash === "d" ? dashFor(fs) : row.dash || [];
          drawFace(f, c, rcx, cy, fs, p, { alpha: 0.15 + 0.85 * prog, dash }); text(f, c, row.out, rcx, cy + fs * 0.5 + 10, { align: "center", size: 10, color: C.fg, alpha: 0.3 + 0.7 * prog });
          if (j === 0) { drawFace(f, c, tcx - fs * 0.26, cy - 2, fs * 0.5, FACE_B, { alpha: 0.6 }); drawFace(f, c, tcx + fs * 0.26, cy - 2, fs * 0.5, FACE_A, { alpha: 0.6, dash: dashFor(fs * 0.5) }); text(f, c, "matches neither", tcx, cy + fs * 0.5 + 10, { align: "center", size: 10 }); }
          else { drawFace(f, c, tcx, cy, fs, j === 1 ? FACE_B : FACE_A, { dash: j === 2 ? dashFor(fs) : [] }); text(f, c, j === 1 ? "flashed face" : "primed face", tcx, cy + fs * 0.5 + 10, { align: "center", size: 10 }); }
          c.globalAlpha = 1;
          if (j < 2) { c.strokeStyle = C.line; c.lineWidth = 1; line(c, 0, top + rowH * (j + 1), W, top + rowH * (j + 1)); }
        });
      },
    });
  })();

  /* ================= Fig 6b: single-trial decoding (bars, the paper's numbers) ================= */
  (() => {
    const groups = [
      { name: "all moments", sub: "averaged", seen: 40, supp: 34, exact: true },
      { name: "state 1 only", sub: "p = 2×10⁻⁶", seen: 61, supp: 4, exact: true },
      { name: "state 2 only", sub: "p = 3×10⁻⁷", seen: 5, supp: 60, exact: false },
    ];
    const tips = { seen: { title: "Decoding the seen face", body: "How often a decoder trained on priming picked the right one of 10 faces for the face that was seen. Chance is 10%." }, supp: { title: "Decoding the suppressed face", body: "The same decoder, asked for the face that was suppressed." }, chance: { title: "Chance, 10%", body: "Ten faces, one right answer." } };
    FS.figure("fig-decode", {
      height: (w) => (w < 560 ? 250 : 220),
      tips, tipAt: hit,
      render(f, c) {
        const C = f.C, W = f.w, H = f.h, hits = (f.state.hits = []), padL = 40, top = 22, bottom = H - 44, gw = (W - padL - 16) / 3, Y = (v) => bottom - (v / 70) * (bottom - top);
        c.strokeStyle = C.line; c.lineWidth = 1; for (const v of [0, 20, 40, 60]) { line(c, padL, Y(v), W - 16, Y(v)); text(f, c, `${v}%`, padL - 6, Y(v) + 4, { align: "right", size: 10 }); }
        c.strokeStyle = C.muted; c.setLineDash([4, 4]); line(c, padL, Y(10), W - 16, Y(10)); c.setLineDash([]); FS.k.label(f, c, "chance 10%", W - 18, Y(10) - 8, { align: "right", size: 10, color: C.muted }); hits.push({ kind: "chance", x: padL, y: Y(10) - 6, w: W - padL - 16, h: 12 });
        groups.forEach((g, i) => {
          const x0 = padL + i * gw + gw * 0.18, bw = gw * 0.26;
          fillState(f, c, x0, Y(g.seen), bw, bottom - Y(g.seen), 1); fillState(f, c, x0 + bw + 6, Y(g.supp), bw, bottom - Y(g.supp), 2);
          hits.push({ kind: "seen", x: x0, y: top, w: bw, h: bottom - top }, { kind: "supp", x: x0 + bw + 6, y: top, w: bw, h: bottom - top });
          FS.k.label(f, c, `${g.exact ? "" : "≈"}${g.seen}%`, x0 + bw / 2, Y(g.seen) - 9, { align: "center", size: 11, weight: 600 }); FS.k.label(f, c, `${g.exact ? "" : "≈"}${g.supp}%`, x0 + bw + 6 + bw / 2, Y(g.supp) - 9, { align: "center", size: 11, weight: 600 });
          text(f, c, g.name, x0 + bw + 3, bottom + 16, { align: "center", size: 11, weight: 600, color: C.fg }); text(f, c, g.sub, x0 + bw + 3, bottom + 30, { align: "center", size: 10 });
        });
        fillState(f, c, padL, 4, 14, 10, 1); text(f, c, "the seen face", padL + 20, 13, { size: 10, color: C.fg }); fillState(f, c, padL + 110, 4, 14, 10, 2); text(f, c, "the suppressed face", padL + 130, 13, { size: 10, color: C.fg });
      },
    });
  })();

  /* ================= Fig 7: how noise can sort itself (process, decider in the toolbar) ================= */
  (() => {
    function push(S) { const b = { own: gauss(S.r), other: gauss(S.r) }; S.bins.push(b); if (S.bins.length > 66) S.bins.shift(); S.hist.push(b); if (S.hist.length > 900) S.hist.shift(); }
    FS.figure("fig-circ", {
      height: (w) => (w < 640 ? 300 : 250),
      params: { decider: { value: "same", label: "Who decides the state", options: [{ value: "same", label: "The same neuron" }, { value: "other", label: "Other neurons" }], placement: "inline" } },
      reserve: { gap: ["gap between the state averages: 9.99 SD"] },
      tips: { bars: { title: "One neuron, one bar per 10 ms slice", body: "Its true rate never changes; only noise moves it. Each slice is labelled state 1 or 2 by whichever rule is selected." }, avg: { title: "The two state averages", body: "When the neuron's own noise picks the label, high slices go one way and low slices the other, and a gap opens from nothing." } },
      tipAt: hit, settle: 3,
      init(f) { const S = f.state; S.r = mulberry(41); S.bins = []; S.hist = []; S.acc = 0; for (let k = 0; k < 400; k++) push(S); },
      update(f, dt) { const S = f.state; S.acc += dt; while (S.acc >= 0.16) { S.acc -= 0.16; push(S); } },
      render(f, c) {
        const S = f.state, C = f.C, W = f.w, H = f.h, nar = W < 640, same = f.params.decider === "same", label = (b) => ((same ? b.own : b.other) > 0 ? 1 : 2), hits = (f.state.hits = []);
        const pw = nar ? W : W - 250, mid = nar ? H * 0.42 : H * 0.5, sc = nar ? 24 : 30, ncol = 64, cw = pw / ncol, off = (S.acc / 0.16) * cw, n = S.bins.length;
        hits.push({ kind: "bars", x: 0, y: 0, w: pw, h: H });
        c.save(); c.beginPath(); c.rect(0, 0, pw, H); c.clip();
        for (let k = 0; k < n; k++) { const b = S.bins[k], x = pw - (n - k) * cw - off, v = FS.clamp(b.own * sc, -mid + 18, mid - 18); if (v >= 0) fillState(f, c, x + 1, mid - v, cw - 2, v, label(b)); else fillState(f, c, x + 1, mid, cw - 2, -v, label(b)); }
        c.restore();
        c.strokeStyle = C.muted; c.lineWidth = 1; c.setLineDash([4, 4]); line(c, 0, mid, pw, mid); c.setLineDash([]);
        text(f, c, "true rate: constant, never switches", 0, 12, { size: 10, color: C.fg });
        let s1 = 0, n1 = 0, s2 = 0, n2 = 0; for (const b of S.hist) { if (label(b) === 1) { s1 += b.own; n1++; } else { s2 += b.own; n2++; } }
        const m1 = n1 ? s1 / n1 : 0, m2 = n2 ? s2 / n2 : 0, gap = m1 - m2;
        c.strokeStyle = C.strong; c.lineWidth = 2; line(c, 0, mid - m1 * sc, pw, mid - m1 * sc); c.setLineDash([7, 4]); line(c, 0, mid - m2 * sc, pw, mid - m2 * sc); c.setLineDash([]);
        const verdict = same ? "Looks like switching. It is only noise, sorted by itself." : "No gap. When other neurons decide, this neuron's noise cannot sort itself.";
        if (!nar) { const ex = pw + 26; hits.push({ kind: "avg", x: ex, y: 0, w: W - ex, h: H }); text(f, c, "average of state 1 slices", ex, mid - m1 * sc - 5, { size: 10, color: C.fg }); text(f, c, "average of state 2 slices", ex, mid - m2 * sc + 14, { size: 10 }); text(f, c, `gap ${gap.toFixed(2)} SD`, ex, 40, { size: 24, weight: 600, color: C.fg }); wrap(f, c, verdict, ex, H - 52, W - ex - 4, 18, { size: 13, color: C.fg }); }
        else { text(f, c, `gap between state averages  ${gap.toFixed(2)} SD`, 0, H - 40, { size: 10.5, color: C.fg }); wrap(f, c, verdict, 0, H - 20, W - 4, 16, { size: 12.5, color: C.fg }); }
        f.api.out("gap", `gap between the state averages: ${gap.toFixed(2)} SD`);
      },
    });
  })();

  /* ================= Fig 8: one cell, two faces (state in the toolbar) ================= */
  (() => {
    FS.figure("fig-tune", {
      height: (w) => (w < 640 ? 560 : 330),
      params: { state: { value: "1", label: "The population is carrying", options: [{ value: "1", label: "State 1 · the seen face" }, { value: "2", label: "State 2 · the suppressed face" }], placement: "inline" } },
      tips: { seen: { title: "Ordered by the seen face", body: "Each dot is one rival pair, placed by where its seen face falls on this cell's preferred axis in face space." }, supp: { title: "Ordered by the suppressed face", body: "The same pairs, placed by their suppressed face instead." } },
      tipAt: hit,
      init(f) { const S = f.state; S.r = mulberry(53); S.P = []; for (let i = 0; i < 160; i++) S.P.push({ xb: FS.clamp(0.42 * gauss(S.r), -0.98, 0.98), xa: FS.clamp(0.42 * gauss(S.r), -0.98, 0.98), z: gauss(S.r) }); S.k = 0; },
      update(f, dt) { const S = f.state, target = f.params.state === "2" ? 1 : 0; S.k += (target - S.k) * Math.min(1, dt * 3.2); },
      render(f, c) {
        const S = f.state, C = f.C, W = f.w, H = f.h, nar = W < 640, hits = (f.state.hits = []), st = S.k < 0.5 ? 1 : 2;
        fillState(f, c, 0, 4, 22, 12, st); text(f, c, st === 1 ? "state 1 · the population carries the flashed, seen face" : "state 2 · the population carries the primed, suppressed face", 32, 14, { size: nar ? 9.5 : 10.5, color: C.fg });
        const resp = (p) => FS.lerp(1.21 * p.xb + 0.28 * p.z, 0.15 + 1.0 * p.xa + 0.28 * p.z, S.k);
        const panels = [{ title: "ordered by the seen face", key: "xb", kind: "seen" }, { title: "ordered by the suppressed face", key: "xa", kind: "supp" }];
        const gap = 40, pw = nar ? W - 36 : (W - 36 - gap) / 2, ph = nar ? (H - 40 - 70) / 2 : H - 92;
        panels.forEach((pn, j) => {
          const ox = 36 + (nar ? 0 : j * (pw + gap)), oy = 40 + (nar ? j * (ph + 64) : 0), X = (v) => ox + ((v + 1) / 2) * pw, Y = (v) => oy + (1 - (v + 1.9) / 3.8) * ph;
          hits.push({ kind: pn.kind, x: ox, y: oy, w: pw, h: ph });
          text(f, c, pn.title, ox, oy - 8, { size: 10, color: C.fg }); c.strokeStyle = C.line; c.lineWidth = 1; c.strokeRect(ox + 0.5, oy + 0.5, pw, ph); c.setLineDash([2, 4]); line(c, ox, Y(0), ox + pw, Y(0)); c.setLineDash([]);
          text(f, c, "position on the cell's preferred axis →", ox + pw, oy + ph + 16, { align: "right", size: 10 }); vtext(f, c, "response", ox - 14, oy + ph / 2, { size: 10 });
          const xs = [], ys = []; c.fillStyle = C.fg; c.globalAlpha = 0.7;
          for (const p of S.P) { const x = p[pn.key], y = FS.clamp(resp(p), -1.85, 1.85); xs.push(x); ys.push(y); c.beginPath(); c.arc(X(x), Y(y), 2.1, 0, 6.2832); c.fill(); }
          c.globalAlpha = 1;
          const fit = lsSlope(xs, ys), steep = Math.abs(fit.b) > 0.55;
          c.strokeStyle = C.strong; c.lineWidth = 2; c.setLineDash(j === 0 ? [] : [7, 4]); line(c, X(-1), Y(fit.a - fit.b), X(1), Y(fit.a + fit.b)); c.setLineDash([]);
          FS.k.label(f, c, `${steep ? "ramp" : "flat"} · slope ${fit.b.toFixed(2)}`, ox + 8, oy + 18, { size: 11, color: steep ? C.fg : C.muted, weight: steep ? 600 : 400 });
        });
      },
    });
  })();

  /* ================= Fig 9: selectivity split by state (four steps) ================= */
  (() => {
    const CONF = [
      { s: 0.25, sd: 0.17, line: false, name: "all moments", stat: "r = 0.45" },
      { s: 0.93, sd: 0.34, line: true, name: "state 1 only", stat: "slope 0.93 · r = 0.66" },
      { s: -0.76, sd: 0.4, line: true, name: "state 2 only", stat: "slope −0.76 · r = −0.44" },
      { s: 0.07, sd: 0.2, line: true, name: "gain-equalized average", stat: "slope 0.07 · r = −0.02" },
    ];
    const steps = [
      { caption: "Averaged over time, the seen and suppressed epochs cancel most of each other out: the weak smear everyone found (r = 0.45)." },
      { caption: "State 1 moments only: cells act as if the seen face were shown alone. The dots return to the diagonal (slope 0.93, r = 0.66)." },
      { caption: "State 2 moments only: cells act as if the suppressed face were shown alone. The dots tip onto the anti-diagonal (slope −0.76, r = −0.44)." },
      { caption: "Equalize the tuning gain of the two states, then average: the leftover positive tilt disappears (slope 0.07, r = −0.02, p = 0.31)." },
    ];
    FS.figure("fig-mi", {
      height: (w) => (w < 640 ? w - 56 + 62 : 420),
      steps,
      tips: { dots: { title: "One dot, one cell and stimulus pair", body: "2,885 pairs in the paper, with states inferred from the other half of the neurons (Fig. 4g). Illustrative dots built to the paper's slopes and correlations." } },
      tipAt: hit,
      init(f) { const S = f.state; S.r = mulberry(61); S.P = []; while (S.P.length < 480) { const x = 0.12 + 0.4 * gauss(S.r); if (Math.abs(x) < 0.05 || Math.abs(x) > 0.97) continue; S.P.push({ x, z: gauss(S.r) }); } },
      render(f, c) {
        const S = f.state, C = f.C, W = f.w, H = f.h, nar = W < 640, px = nar ? 40 : 66, py = 10, side = nar ? W - 56 : H - 66, X = (v) => px + ((v + 1) / 2) * side, Y = (v) => py + (1 - (v + 1) / 2) * side;
        f.state.hits = [{ kind: "dots", x: px, y: py, w: side, h: side }];
        const A = CONF[f.from ?? f.step], B = CONF[f.step], m = FS.ease.inOut(f.stepT);
        c.strokeStyle = C.line; c.lineWidth = 1; c.strokeRect(px + 0.5, py + 0.5, side, side); c.setLineDash([2, 4]); line(c, X(0), py, X(0), py + side); line(c, px, Y(0), px + side, Y(0)); c.setLineDash([]);
        c.strokeStyle = C.faint; c.setLineDash([6, 5]); line(c, X(-1), Y(-1), X(1), Y(1)); line(c, X(-1), Y(1), X(1), Y(-1)); c.setLineDash([]);
        for (const v of [-1, 0, 1]) { text(f, c, String(v).replace("-", "−"), X(v), py + side + 16, { align: "center", size: 10 }); text(f, c, String(v).replace("-", "−"), px - 8, Y(v) + 4, { align: "right", size: 10 }); }
        text(f, c, "selectivity when the faces are shown alone", X(0), py + side + 38, { align: "center", size: 10 }); vtext(f, c, "selectivity during rivalry", px - 28, Y(0), { size: 10 });
        c.fillStyle = C.fg; c.globalAlpha = 0.55;
        for (const p of S.P) { const ya = FS.clamp(A.s * p.x + A.sd * p.z, -0.98, 0.98), yb = FS.clamp(B.s * p.x + B.sd * p.z, -0.98, 0.98); c.beginPath(); c.arc(X(p.x), Y(FS.lerp(ya, yb, m)), 1.8, 0, 6.2832); c.fill(); }
        c.globalAlpha = 1; c.strokeStyle = C.strong; c.lineWidth = 2.2;
        if (A.line && m < 1) { c.globalAlpha = 1 - m; line(c, X(-1), Y(-A.s), X(1), Y(A.s)); }
        if (B.line) { c.globalAlpha = m; line(c, X(-1), Y(-B.s), X(1), Y(B.s)); }
        c.globalAlpha = 1;
        if (nar) { text(f, c, B.name, px + 8, py + 18, { size: 10, color: C.fg }); text(f, c, B.stat, px + 8, py + 33, { size: 10 }); }
        else { const ax = px + side + 40; text(f, c, B.name, ax, py + 30, { size: 11, color: C.fg, weight: 600 }); text(f, c, B.stat, ax, py + 62, { size: 22, weight: 600, color: C.fg }); CONF.forEach((o, i) => { const yy = py + 110 + i * 26, on = i === f.step; c.fillStyle = on ? C.fg : C.line; c.fillRect(ax, yy - 8, 8, 8); text(f, c, `${o.name}  ${o.stat}`, ax + 18, yy, { size: 11, color: on ? C.fg : C.muted }); }); text(f, c, "Fig. 4g", ax, py + side - 4, { size: 10 }); }
      },
    });
  })();

  /* ================= Fig 10: two patches, loosely in step (process) ================= */
  (() => {
    function push(S) { if (S.r() < 5 / DWELL) S.a = 3 - S.a; if (S.r() < 5 / DWELL) S.b = 3 - S.b; if (S.a !== S.b && S.r() < 0.025) S.b = S.a; S.ml.push(S.a); S.am.push(S.b); if (S.ml.length > 160) { S.ml.shift(); S.am.shift(); } }
    FS.figure("fig-patch", {
      height: () => 118,
      tips: { ML: { title: "ML's state", body: "Which face the ML population carries, moment by moment. Schematic: the paper reports weak but significant prediction across patches, not an agreement rate (Fig. 5e)." }, AM: { title: "AM's state", body: "AM on its own clock, nudged toward ML now and then. ML→AM p = 3×10⁻⁴, AM→ML p = 9×10⁻⁶." } },
      tipAt: hit, settle: 2,
      init(f) { const S = f.state; S.r = mulberry(71); S.ml = []; S.am = []; S.a = 1; S.b = 1; S.acc = 0; for (let k = 0; k < 160; k++) push(S); },
      update(f, dt) { const S = f.state; S.acc += dt * 100; while (S.acc >= 5) { S.acc -= 5; push(S); } },
      render(f, c) {
        const S = f.state, C = f.C, W = f.w, H = f.h, nar = W < 640, x0 = nar ? 44 : 120, x1 = W - 2, n = S.ml.length, cw = (x1 - x0) / n, off = (S.acc / 5) * cw, xOf = (k) => x1 - (n - k) * cw - off;
        f.state.hits = [{ kind: "ML", x: 0, y: 6, w: W, h: 32 }, { kind: "AM", x: 0, y: 46, w: W, h: 32 }];
        text(f, c, "ML", 0, 26, { size: 13, weight: 600, color: C.fg }); text(f, c, "AM", 0, 66, { size: 13, weight: 600, color: C.fg });
        if (!nar) { text(f, c, "middle lateral", 30, 26, { size: 10 }); text(f, c, "anterior medial", 30, 66, { size: 10 }); }
        c.save(); c.beginPath(); c.rect(x0, 0, x1 - x0, H); c.clip(); runs(f, c, S.ml, xOf, cw, 10, 24); runs(f, c, S.am, xOf, cw, 50, 24); c.restore();
        const sb = (100 / 5) * cw; c.strokeStyle = C.muted; c.lineWidth = 1; line(c, x1 - sb, H - 12, x1, H - 12); text(f, c, "100 ms", x1 - sb - 8, H - 8, { align: "right", size: 10 }); text(f, c, "schematic · slowed 10×", x0, H - 8, { size: 10 });
      },
    });
  })();

  /* ================= Fig 11: one possible answer, speculative (process) ================= */
  (() => {
    function spawn(S, s0) { let d = -DWELL * Math.log(1 - S.r()); d = FS.clamp(d, 12, 220); S.state = 3 - S.state; S.tiles.push({ s: s0 == null ? 0 : s0, w: d * 0.42, st: S.state }); }
    FS.figure("fig-route", {
      height: (w) => (w < 640 ? 300 : 250),
      tips: { gate: { title: "Routing?", body: "The authors' speculation: something, perhaps feedback from parietal cortex or the pulvinar, may decide which epochs are sent on. The two states are linearly separable (66%, Fig. 4f), so the activity may carry such a tag." }, up: { title: "Broadcast", body: "State 1 epochs may reach circuits for report, introspection and action." }, down: { title: "Not broadcast", body: "State 2 epochs may let the brain try the other interpretation without acting on it." } },
      tipAt: hit, settle: 4,
      init(f) { const S = f.state; S.r = mulberry(83); S.tiles = []; S.state = 2; let s = 900; while (s > 0) { spawn(S, s); s -= S.tiles[S.tiles.length - 1].w; } S.tiles.reverse(); },
      update(f, dt) { const S = f.state; for (const t of S.tiles) t.s += 36 * dt; const last = S.tiles[S.tiles.length - 1]; if (!last || last.s >= last.w) spawn(S, last ? last.s - last.w : 0); S.tiles = S.tiles.filter((t) => t.s < 1600); },
      render(f, c) {
        const S = f.state, C = f.C, W = f.w, H = f.h, nar = W < 640, my = H * 0.5, xg = W * (nar ? 0.42 : 0.46), boxW = nar ? 116 : 220, boxH = nar ? 58 : 54, bx = W - boxW - 2, up = [bx, H * 0.2], dn = [bx, H * 0.8];
        f.state.hits = [{ kind: "gate", x: xg - 30, y: my - 50, w: 60, h: 100 }, { kind: "up", x: bx, y: up[1] - boxH / 2, w: boxW, h: boxH }, { kind: "down", x: bx, y: dn[1] - boxH / 2, w: boxW, h: boxH }];
        text(f, c, "micro-epochs in IT", 0, my - 22, { size: 10, color: C.fg });
        c.strokeStyle = C.fg; c.lineWidth = 1.4; c.strokeRect(xg - 4 + 0.5, my - 30 + 0.5, 8, 60); text(f, c, "routing?", xg, my - 40, { align: "center", size: 10, color: C.fg }); if (!nar) text(f, c, "feedback from parietal cortex or the pulvinar?", xg, my + 50, { align: "center", size: 10 });
        const bez = (P, t) => { const cx = xg + 70, cy = my, a = (1 - t) ** 2, b = 2 * (1 - t) * t, d = t * t; return [a * xg + b * cx + d * P[0], a * my + b * cy + d * P[1]]; };
        c.strokeStyle = C.line; c.lineWidth = 1; c.setLineDash([2, 4]); for (const P of [up, dn]) { c.beginPath(); for (let i = 0; i <= 30; i++) { const q = bez(P, i / 30); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.stroke(); } c.setLineDash([]);
        c.save(); c.beginPath(); c.rect(0, 0, xg - 6, H); c.clip(); for (const t of S.tiles) { const x = t.s - t.w; if (t.s > 0 && x < xg) fillState(f, c, x + 0.5, my - 8, t.w - 1, 16, t.st); } c.restore();
        const len = Math.hypot(up[0] - xg, up[1] - my) + 40;
        for (const t of S.tiles) { const past = t.s - xg; if (past <= 0) continue; const u = past / len; if (u >= 1) continue; const q = bez(t.st === 1 ? up : dn, u); c.globalAlpha = u > 0.8 ? (1 - u) / 0.2 : 1; if (t.st === 1) { c.fillStyle = C.fg; c.beginPath(); c.arc(q[0], q[1], 5, 0, 6.2832); c.fill(); } else { c.fillStyle = FS.k.hatch(f, c, C.muted, 4); c.beginPath(); c.arc(q[0], q[1], 5, 0, 6.2832); c.fill(); c.strokeStyle = C.muted; c.lineWidth = 1; c.stroke(); } c.globalAlpha = 1; }
        const box = (P, title, sub, solid) => { const x = P[0], y = P[1] - boxH / 2; c.fillStyle = C.bg; c.fillRect(x, y, boxW, boxH); c.strokeStyle = solid ? C.fg : C.muted; c.lineWidth = 1.2; c.setLineDash(solid ? [] : [4, 3]); c.strokeRect(x + 0.5, y + 0.5, boxW - 1, boxH - 1); c.setLineDash([]); wrap(f, c, title, x + 10, y + 20, boxW - 18, 15, { size: nar ? 12 : 13, weight: 600, color: C.fg }); if (!nar) text(f, c, sub, x + 10, y + boxH - 10, { size: 10 }); };
        box(up, nar ? "Report, introspection" : "Report · introspection · action", "state 1 epochs, broadcast", true); box(dn, "Not broadcast", nar ? "" : "state 2 epochs: the alternative, kept quietly", false);
      },
    });
  })();
})();
