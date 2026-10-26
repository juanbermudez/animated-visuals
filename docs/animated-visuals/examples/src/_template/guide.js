/* The template's one figure: a process on the runtime, so a new guide starts from something that runs.
   Replace it. Every figure: one claim in its title, computed readouts, tips for the non-obvious parts,
   seeded randomness, and nothing that moves only to decorate. */
(() => {
  const tips = { dot: { title: "A unit", body: "One of the things the claim is about. Replace this tip with what it is and why it matters here." } };
  FS.figure("fig-one", {
    height: (w) => (w < 560 ? 220 : 200),
    params: { rate: { value: 1, min: 0.2, max: 3, step: 0.1, label: "Rate", placement: "inline", format: (v) => `${v.toFixed(1)}×` } },
    reserve: { readout: ["t = 999.9 s · 99 events"] },
    tips,
    tipAt: (f, x, y) => (f.state.hits?.find((h) => Math.hypot(h.x - x, h.y - y) < 10) ? "dot" : null),
    settle: 3,
    init(f) { f.state.events = []; f.state.acc = 0; },
    update(f, dt) {
      f.state.acc += dt * f.v.rate;
      while (f.state.acc >= 1) { f.state.acc -= 1; f.state.events.push(f.t); }
      f.state.events = f.state.events.filter((t) => f.t - t < 8);
    },
    render(f, c) {
      const C = f.C, hits = (f.state.hits = []), X = (t) => 24 + (f.w - 48) * ((f.t - t) / 8);
      c.strokeStyle = C.line; c.lineWidth = 1; c.beginPath(); c.moveTo(24, f.h / 2); c.lineTo(f.w - 24, f.h / 2); c.stroke();
      for (const t of f.state.events) { const x = f.w - X(t), y = f.h / 2; hits.push({ x, y }); c.fillStyle = C.fg; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
      FS.k.text(f, c, "← older · newer →", f.w / 2, f.h - 10, { align: "center", size: 11 });
      f.api.out("readout", `t = ${f.t.toFixed(1)} s · ${f.state.events.length} events`);
    },
  });
})();
