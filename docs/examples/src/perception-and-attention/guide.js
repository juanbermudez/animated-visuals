/* Perception and attention: seven figures. Every fact, number and route comes from Juan Bermudez's open-source
   guide (github.com/juanbermudez/perception-and-attention): the walkthroughs in src/content/pathways.ts, the region
   guides in src/content/region-guides.ts and the attention model in src/model/attention.ts. Packet speed, line
   thickness and every bar length except the model's are illustrative. */

const tip = (title, body) => ({ title, body });

/* ---------- path helpers for the hand-routed figures (Figs 5 and 6) ---------- */
const P = (p) => `${+p[0].toFixed(1)},${+p[1].toFixed(1)}`;
const hcurve = (a, b) => { const m = (a[0] + b[0]) / 2; return `M${P(a)} C${m},${a[1]} ${m},${b[1]} ${P(b)}`; };
const vcurve = (a, b) => { const m = (a[1] + b[1]) / 2; return `M${P(a)} C${a[0]},${m} ${b[0]},${m} ${P(b)}`; };
const nudge = (p, dy) => [p[0], p[1] + dy];
/* A polyline with rounded corners: lanes that run around the outside of the nodes. */
function ortho(pts, r = 8) {
  let d = `M${P(pts[0])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]), k = Math.min(r, l1 / 2, l2 / 2);
    d += ` L${P([b[0] + ((a[0] - b[0]) * k) / l1, b[1] + ((a[1] - b[1]) * k) / l1])} Q${P(b)} ${P([b[0] + ((c[0] - b[0]) * k) / l2, b[1] + ((c[1] - b[1]) * k) / l2])}`;
  }
  return `${d} L${P(pts[pts.length - 1])}`;
}

/* A stepped node-and-edge figure whose connectors are routed by hand per layout (wide and narrow), for diagrams too
   dense for the shared flow helper. Each step lists the nodes it lights and, optionally, the edges it is about. */
function routedFigure(id, { meta, layouts, edges, steps, narrowBelow = 560, extra }) {
  const NS = "http://www.w3.org/2000/svg", svg = document.getElementById(id);
  const el = (tag, attrs = {}, parent = svg) => { const n = document.createElementNS(NS, tag); for (const a in attrs) n.setAttribute(a, attrs[a]); parent.append(n); return n; };
  const defs = el("defs"), pat = el("pattern", { id: `${id}-hatch`, width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  const patLine = el("line", { x1: 0, y1: 0, x2: 0, y2: 5, "stroke-width": 1.2 }, pat);
  const under = el("g"), edgeG = el("g"), nodeG = el("g"), over = el("g");
  extra?.init?.({ el, under, over, svg });
  const E = edges.map((e, i) => ({
    ...e, alpha: 1, len: 1, ph: (i * 0.137) % 1,
    path: el("path", { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, edgeG),
    head: el("path", { "stroke-linecap": "round" }, edgeG),
    text: e.label ? el("text", { "font-size": 10.5, "font-weight": 500, "text-anchor": "middle", "paint-order": "stroke", "stroke-width": 4, "stroke-linejoin": "round" }, edgeG) : null,
    dots: [0, 1, 2].map(() => el("circle", { r: 2.8 }, edgeG)),
  }));
  for (const e of E) if (e.text) e.text.textContent = e.label;
  const N = {};
  for (const key in meta) {
    const m = meta[key], n = (N[key] = { ...m, key, alpha: 1 });
    n.g = el("g", { "data-key": key, tabindex: "0", role: "img", "aria-label": `${m.label}: ${m.tip.body}`, "data-fs-tip": m.tip.body, "data-fs-tip-title": m.tip.title }, nodeG);
    n.rect = el("rect", { rx: m.band ? 2 : 6 }, n.g);
    if (m.band === "hatch") n.fillRect = el("rect", { rx: 2, fill: `url(#${id}-hatch)` }, n.g);
    n.t1 = el("text", { "font-weight": 600 }, n.g); n.t1.textContent = m.label;
    n.t2 = el("text", {}, n.g); n.t2.textContent = m.sub || "";
    n.badge = el("text", { "font-size": 10.5, "font-weight": 600, "text-anchor": "end" }, n.g);
    n.g.addEventListener("pointerenter", () => FS.get(id).hover(key));
    n.g.addEventListener("pointerleave", () => FS.get(id).hover(null));
    n.g.addEventListener("focus", () => FS.get(id).hover(key));
    n.g.addEventListener("blur", () => FS.get(id).hover(null));
  }
  let L = null, cur = "";
  function layout(name) {
    L = layouts[name]; cur = name;
    svg.setAttribute("viewBox", `0 0 ${L.box[0]} ${L.box[1]}`);
    const [f1, f2] = L.font || [13, 11];
    for (const key in N) {
      const n = N[key], [x, y, w, h = 46] = L.at[key];
      Object.assign(n, { x, y, w, h });
      for (const r of [n.rect, n.fillRect].filter(Boolean)) { r.setAttribute("x", x); r.setAttribute("y", y); r.setAttribute("width", w); r.setAttribute("height", h); }
      if (n.band) {
        n.t1.setAttribute("font-size", f2 + 0.5); n.t1.setAttribute("x", x + 10); n.t1.setAttribute("y", y + h / 2 + 4);
        n.t2.setAttribute("font-size", f2 - 0.5); n.t2.setAttribute("x", x + w - 10); n.t2.setAttribute("y", y + h / 2 + 4); n.t2.setAttribute("text-anchor", "end");
        n.badge.setAttribute("x", x + w - 10); n.badge.setAttribute("y", y + h / 2 + 4);
      } else {
        n.t1.setAttribute("font-size", f1); n.t1.setAttribute("x", x + 14); n.t1.setAttribute("y", y + (n.sub ? 20 : h / 2 + 5));
        n.t2.setAttribute("font-size", f2); n.t2.setAttribute("x", x + 14); n.t2.setAttribute("y", y + 35);
        n.badge.setAttribute("x", x + 2); n.badge.setAttribute("y", y + h + 15); n.badge.setAttribute("text-anchor", "start");
      }
    }
    const A = (key, side, t = 0.5) => { const n = N[key]; return side === "t" ? [n.x + n.w * t, n.y] : side === "b" ? [n.x + n.w * t, n.y + n.h] : side === "l" ? [n.x, n.y + n.h * t] : [n.x + n.w, n.y + n.h * t]; };
    const paths = L.paths(A);
    for (const e of E) {
      const d = paths[e.key];
      if (!d) throw new Error(`${id}: no ${name} path for ${e.key}`);
      e.path.setAttribute("d", d); e.len = e.path.getTotalLength();
      const end = e.path.getPointAtLength(e.len), near = e.path.getPointAtLength(Math.max(0, e.len - 6)), a = Math.atan2(end.y - near.y, end.x - near.x);
      e.head.setAttribute("d", e.kind === "inhib"
        ? `M${P([end.x - 6 * Math.sin(a), end.y + 6 * Math.cos(a)])} L${P([end.x + 6 * Math.sin(a), end.y - 6 * Math.cos(a)])}`
        : `M${P([end.x, end.y])} L${P([end.x - 7 * Math.cos(a - 0.42), end.y - 7 * Math.sin(a - 0.42)])} L${P([end.x - 7 * Math.cos(a + 0.42), end.y - 7 * Math.sin(a + 0.42)])} Z`);
      if (e.text) { const at = L.labels?.[e.key]; const mid = at ? { x: at[0], y: at[1] } : e.path.getPointAtLength(e.len / 2); e.text.setAttribute("x", mid.x); e.text.setAttribute("y", mid.y); }
    }
    extra?.layout?.(name, L, A);
  }
  return FS.figure(id, {
    height: (w) => { const Lx = w < narrowBelow ? layouts.narrow : layouts.wide; return (w * Lx.box[1]) / Lx.box[0]; },
    steps,
    resize(f) { const name = f.w < narrowBelow ? "narrow" : "wide"; if (name !== cur) layout(name); },
    update(f, dt) { const s = steps[f.step]; for (const e of E) e.ph = (e.ph + dt * 0.3 * (s.rates?.[e.key] ?? 1)) % 1; },
    render(f) {
      const C = f.C, s = steps[f.step], on = new Set(s.on), k = FS.ease.out(f.stepT);
      patLine.setAttribute("stroke", C.muted);
      for (const key in N) {
        const n = N[key], hovered = f.hover === key, lit = on.has(key), target = lit ? 1 : C.dim;
        n.alpha = f.stepT < 1 ? FS.lerp(n.alpha, target, k) : target;
        n.g.setAttribute("opacity", hovered ? 1 : n.alpha.toFixed(3));
        n.rect.setAttribute("fill", n.band ? C.surface2 : C.surface);
        n.rect.setAttribute("stroke", hovered ? C.accent : lit && f.step ? C.fg : C.lineStrong);
        n.rect.setAttribute("stroke-width", hovered ? 1.5 : 1);
        n.rect.setAttribute("stroke-dasharray", n.external ? "4 3" : "none");
        if (n.fillRect) n.fillRect.setAttribute("opacity", 0.55);
        n.t1.setAttribute("fill", C.fg);
        const badge = s.badges?.[key] || "";
        n.badge.textContent = badge; n.badge.setAttribute("fill", C.accent);
        n.t2.setAttribute("fill", C.muted); n.t2.setAttribute("opacity", n.band && badge ? 0 : 1);
      }
      for (const e of E) {
        const active = s.edges ? s.edges.includes(e.key) : on.has(e.a) && on.has(e.b);
        const target = active ? 1 : 0.2;
        e.alpha = f.stepT < 1 ? FS.lerp(e.alpha, target, k) : target;
        const ink = active && f.step ? C.fg : C.muted, width = (e.kind === "driver" ? 2.2 : C.edge) * (active && f.step ? 1.15 : 1);
        e.path.setAttribute("stroke", ink); e.path.setAttribute("stroke-width", width); e.path.setAttribute("opacity", e.alpha.toFixed(3));
        e.path.setAttribute("stroke-dasharray", e.kind === "direct" ? "5 4" : e.kind === "branch" ? "2 4" : "none");
        e.head.setAttribute("fill", e.kind === "inhib" ? "none" : ink); e.head.setAttribute("stroke", ink); e.head.setAttribute("stroke-width", e.kind === "inhib" ? 2.2 : 1);
        e.head.setAttribute("opacity", e.alpha.toFixed(3));
        if (e.text) { e.text.setAttribute("fill", active && f.step ? C.fg : C.muted); e.text.setAttribute("stroke", C.surface); e.text.setAttribute("opacity", Math.max(e.alpha, 0.55).toFixed(3)); }
        e.dots.forEach((dot, j) => {
          const u = (e.ph + j / 3) % 1, pt = e.path.getPointAtLength(u * e.len);
          dot.setAttribute("cx", pt.x.toFixed(1)); dot.setAttribute("cy", pt.y.toFixed(1));
          dot.setAttribute("fill", active && f.step ? C.accent : C.fg);
          dot.setAttribute("opacity", (e.alpha * Math.sin(Math.PI * u) * (active ? 1 : 0.4)).toFixed(3));
        });
      }
      extra?.render?.(f, C, s, k);
    },
  });
}

/* ================= Fig 1: vision, from the eyes to two streams (shared flow helper) ================= */
(() => {
  const meta = {
    retinaL: { label: "Left retina", sub: "light to signals", tip: tip("Retina", "A thin layer of neural tissue at the back of the eye. Rods and cones absorb light; ganglion cells send the result to the brain.") },
    retinaR: { label: "Right retina", sub: "the other eye", tip: tip("Right retina", "Its half nearest the nose sends fibres that cross at the chiasm; its outer half sends fibres that stay on the same side.") },
    chiasm: { label: "Optic chiasm", sub: "about half cross", tip: tip("Optic chiasm", "Where the two optic nerves meet, above the pituitary gland. After it, fibres are grouped by side of the visual field rather than by eye.") },
    lgn: { label: "LGN", sub: "thalamus relay", tip: tip("LGN", "The lateral geniculate nucleus, the visual relay of the thalamus. Its layers keep the two eyes and three channels apart.") },
    v1: { label: "V1", sub: "visual cortex", tip: tip("Primary visual cortex", "Receives most of the LGN's output, at the back of the brain along the calcarine sulcus. Many neurons prefer edges at one orientation.") },
    mt: { label: "Area MT", sub: "motion", tip: tip("Area MT (V5)", "A visual area specialized for motion, where the occipital and temporal lobes meet. Most neurons prefer one direction and speed.") },
    parietal: { label: "Parietal cortex", sub: "reach and grasp", tip: tip("Posterior parietal cortex", "Combines several senses to represent the space around the body and to plan actions such as reaching and grasping.") },
    v2v4: { label: "V2 and V4", sub: "contours, shapes", tip: tip("Higher visual areas", "The many visual areas beyond V1. Along the ventral stream, V2 and V4 respond to contours and simple shapes.") },
    it: { label: "IT cortex", sub: "objects", tip: tip("Inferior temporal cortex", "A late stage of the ventral stream. Its neurons respond to objects and object parts, even as they move or change size.") },
    cat: { label: "Category areas", sub: "faces, places, more", tip: tip("Category areas", "Regions that respond most to one kind of image: faces (FFA), places (PPA), bodies (EBA) and written words (VWFA). Each also responds to others.") },
  };
  const layouts = {
    wide: { box: [960, 364], at: { retinaL: [6, 76, 126], retinaR: [6, 190, 126], chiasm: [170, 133, 130], lgn: [344, 133, 100], v1: [490, 133, 100],
      mt: [640, 30, 134], parietal: [806, 30, 140], v2v4: [640, 236, 134], it: [806, 196, 140], cat: [806, 280, 140] } },
    narrow: { box: [360, 596], at: { retinaL: [20, 12, 150], retinaR: [190, 12, 150], chiasm: [100, 92, 160], lgn: [100, 172, 160], v1: [100, 252, 160],
      mt: [16, 350, 148], parietal: [16, 430, 148], v2v4: [196, 350, 144], it: [196, 430, 144], cat: [196, 510, 144] } },
  };
  const edges = [
    ["retinaL", "chiasm"], ["retinaR", "chiasm"], ["chiasm", "lgn"], ["lgn", "v1"], ["v1", "mt"], ["v1", "v2v4"], ["mt", "parietal"], ["v2v4", "it"],
    { a: "v2v4", b: "cat", wide: "x", narrow: "right" },
  ];
  const steps = [
    { on: Object.keys(meta), caption: "Signals from both eyes meet at the optic chiasm, pass through the LGN to V1, then split into two streams that leave V1." },
    { on: ["retinaL", "retinaR"], caption: "In the retina, about 96 million photoreceptors turn light into signals that feed roughly 1 million ganglion cells (0.7 to 1.5 million, depending on the person)." },
    { on: ["retinaL", "retinaR", "chiasm"], caption: "About half the fibres cross at the chiasm (commonly cited as 53%, from one detailed count), so each hemisphere gets the opposite half of the visual field." },
    { on: ["chiasm", "lgn"], caption: "The LGN keeps three channels apart; in monkeys, about 80% of ganglion cells feed its detail-and-colour layers and about 10% feed its motion layers." },
    { on: ["lgn", "v1"], caption: "V1 maps the visual field with far more room for the centre of gaze, and its inverted map places the upper field below the calcarine sulcus." },
    { on: ["v1", "mt", "v2v4"], caption: "Two streams leave V1, a ventral one through V2 and V4 for what things are, and a dorsal one through MT for where they are and how to act." },
    { on: ["v1", "mt"], caption: "MT specializes in motion; a patient with damage to this region on both sides found pouring tea difficult because the liquid appeared frozen." },
    { on: ["mt", "parietal"], caption: "Parietal cortex combines what you see with the position of your eyes and body, and damage here can cause optic ataxia, in which you see an object but reach for it inaccurately." },
    { on: ["v1", "v2v4", "it"], caption: "Features grow more complex along the ventral stream up to objects in IT, and in monkeys, activity from about 100 IT neurons over 12.5 ms identified which object was shown." },
    { on: ["v2v4", "cat"], caption: "Some areas prefer faces, places, bodies or written words; stimulating one patient's face area distorted the faces of people in the room while other objects looked normal." },
  ];
  flowFigure("fig-vision", { meta, layouts, edges, steps, regions: [{ keys: ["mt", "parietal"], label: "Dorsal: where, how" }, { keys: ["v2v4", "it", "cat"], label: "Ventral: what" }] });
})();

/* ================= Fig 2: touch, two routes that cross at different levels ================= */
(() => {
  const meta = {
    dcn: { label: "Medulla relay", sub: "touch crosses here", tip: tip("Dorsal column nuclei", "The first relay in the brain for fine touch and body position, in the lower medulla. Their output crosses to the other side.") },
    dh: { label: "Dorsal horn", sub: "pain crosses here", tip: tip("Dorsal horn", "The back of the spinal cord's grey matter: the first relay for pain, temperature and itch. Its output crosses the cord near where it entered.") },
    vpl: { label: "Thalamus (VPL)", sub: "body relay", tip: tip("VPL", "The thalamic relay for touch and position from the body. Pain fibres also end in neighbouring thalamic nuclei, which share this one box here.") },
    s1: { label: "S1", sub: "body map", tip: tip("Primary somatosensory cortex", "On the postcentral gyrus: a map of the opposite side of the body, made of four strips (areas 3a, 3b, 1 and 2).") },
    parietal: { label: "Parietal cortex", sub: "touch guides action", tip: tip("Posterior parietal cortex", "Combines touch with vision and body position to track where objects are relative to the body, for reaching and grasping.") },
    s2: { label: "S2", sub: "both hands, pain too", tip: tip("Secondary somatosensory cortex", "On the upper bank of the lateral sulcus, below S1. It processes touch from both sides of the body and responds to pain.") },
    pi: { label: "Posterior insula", sub: "pain, temperature", tip: tip("Posterior insula", "Deep in the lateral sulcus: a main cortical target of the pain and temperature route, with a rough map of the body.") },
    cing: { label: "Cingulate cortex", sub: "how bad it feels", tip: tip("Anterior cingulate cortex", "On the inner surface of the frontal lobe. Its activity follows how unpleasant pain feels, and rises with conflict and errors.") },
  };
  const layouts = {
    wide: { box: [960, 322], at: { dcn: [16, 40, 170], dh: [16, 236, 170], vpl: [270, 138, 170], s1: [520, 20, 150], s2: [520, 98, 150], pi: [520, 176, 150], cing: [520, 254, 150], parietal: [770, 20, 170] } },
    narrow: { box: [360, 392], at: { dh: [20, 12, 150], dcn: [190, 12, 150], vpl: [100, 92, 160], pi: [20, 172, 150], s1: [190, 172, 150], cing: [20, 252, 150], parietal: [190, 252, 150], s2: [100, 332, 160] } },
  };
  const edges = [
    ["dcn", "vpl"], ["dh", "vpl"], ["vpl", "s1"], ["s1", "parietal"],
    { a: "vpl", b: "s2", wide: "x", narrow: "right" },
    { a: "s1", b: "s2", wide: "v", narrow: "right" },
    ["vpl", "pi"],
    { a: "vpl", b: "cing", wide: "x", narrow: "left" },
  ];
  const steps = [
    { on: Object.keys(meta), caption: "Touch and position cross in the medulla while pain and temperature cross in the spinal cord, and both then pass through the thalamus so each hemisphere feels mainly the opposite side of the body." },
    { on: ["dcn"], caption: "Touch and position fibres rise on the same side and cross in the medulla, conducting at about 35–75 m/s, while the thin fibres for burning pain conduct at about 0.4–1.4 m/s." },
    { on: ["dcn", "vpl"], caption: "The crossed fibres reach the VPL, the thalamus's relay for touch from the body, so your right hand is represented in the left thalamus and left cortex." },
    { on: ["vpl", "s1"], caption: "S1 maps the opposite side of the body, with far more room for the hands, lips and tongue, as Penfield showed by stimulating awake patients during epilepsy surgery." },
    { on: ["s1", "parietal"], caption: "Parietal cortex combines touch with vision and body position to track where objects are relative to the body, for reaching and grasping." },
    { on: ["s1", "s2"], caption: "S2 responds to touch on both hands; in macaques, removing part of S1 left the matching part of S2 silent to touch, while removing S2 left S1 unchanged." },
    { on: ["dh"], caption: "Pain and temperature cross in the spinal cord near where they enter, so damage to one half of the cord removes fine touch on that side and pain on the other." },
    { on: ["dh", "vpl", "s1", "s2", "pi"], caption: "Pain signals reach S1, S2 and the posterior insula; of 4,160 cortical stimulations in 164 patients, only 1.4% evoked pain, all in the posterior insula or next to it." },
    { on: ["vpl", "cing"], caption: "Cingulate activity follows how unpleasant pain feels, and when hypnosis changed unpleasantness but not intensity, the cingulate cortex changed while S1 did not." },
  ];
  flowFigure("fig-touch", { meta, layouts, edges, steps });
})();

/* ================= Fig 3: hearing, both ears compared in the brainstem ================= */
(() => {
  const meta = {
    cochL: { label: "Left cochlea", sub: "sorts by pitch", tip: tip("Cochlea", "The spiral hearing organ of the inner ear. High frequencies vibrate near its base, low ones near its tip; inner hair cells turn that into signals.") },
    cochR: { label: "Right cochlea", sub: "the other ear", tip: tip("Right cochlea", "The same organ in the right ear. Each ear's nerve first goes to its own side of the brainstem.") },
    cnL: { label: "Cochlear nuclei", sub: "left side", tip: tip("Cochlear nuclei", "The first stop in the brain for the auditory nerve, where the pons meets the medulla. Cell types here pull out timing, loudness and frequency.") },
    cnR: { label: "Cochlear nuclei", sub: "right side", tip: tip("Cochlear nuclei (right)", "The first stop for the right auditory nerve. From the next stage on, both hemispheres get input from both ears.") },
    olive: { label: "Superior olive", sub: "the ears meet", tip: tip("Superior olivary complex", "Brainstem nuclei where the two ears are first combined. It also holds the neurons that send feedback to the cochleae.") },
    ic: { label: "Inferior colliculus", sub: "midbrain", tip: tip("Inferior colliculus", "The main hearing centre of the midbrain. Nearly all rising hearing routes stop here before the thalamus.") },
    mgn: { label: "MGN", sub: "thalamus relay", tip: tip("MGN", "The medial geniculate nucleus, the hearing relay of the thalamus, next to the visual LGN.") },
    a1: { label: "Auditory cortex", sub: "A1, the core", tip: tip("Primary auditory cortex", "On Heschl's gyrus, inside the lateral sulcus. Like the cochlea, it is laid out by frequency.") },
    belt: { label: "Belt, parabelt", sub: "complex sounds", tip: tip("Belt and parabelt", "A ring of areas around the core, and a strip just outside it on the superior temporal gyrus: the second and third stages of auditory cortex.") },
    what: { label: "What stream", sub: "identify the sound", tip: tip("“What” stream", "Runs forward along the superior temporal gyrus to ventrolateral prefrontal cortex. It helps identify sounds, including spoken words.") },
    where: { label: "Where stream", sub: "locate the sound", tip: tip("“Where” stream", "Runs back to posterior parietal cortex and dorsolateral prefrontal cortex. It helps locate sounds; it is also used for speech.") },
  };
  const layouts = {
    wide: { box: [960, 310], at: { cochL: [16, 60, 128], cochR: [16, 172, 128], cnL: [164, 60, 136], cnR: [164, 172, 136], olive: [328, 116, 130], ic: [484, 116, 160], mgn: [670, 116, 104], a1: [800, 116, 150],
      what: [470, 244, 140], belt: [636, 244, 140], where: [804, 244, 146] } },
    narrow: { box: [360, 564], at: { cochL: [40, 14, 136], cochR: [184, 14, 136], cnL: [40, 84, 136], cnR: [184, 84, 136], olive: [100, 154, 160], ic: [100, 224, 160], mgn: [100, 294, 160], a1: [100, 364, 160],
      belt: [100, 434, 160], what: [40, 504, 136], where: [184, 504, 136] } },
  };
  const edges = [
    ["cochL", "cnL"], ["cochR", "cnR"], ["cnL", "olive"], ["cnR", "olive"], ["olive", "ic"], ["ic", "mgn"], ["mgn", "a1"],
    { a: "a1", b: "belt", wide: "y", narrow: "y" },
    { a: "belt", b: "what", wide: "back", narrow: "y" },
    { a: "belt", b: "where", wide: "x", narrow: "y" },
  ];
  // Signals back down to the ears: auditory cortex to the colliculus, the colliculus to the olive, the olive to both cochleae.
  const returns = [
    { a: "a1", b: "ic", wide: "top", narrow: "left" },
    { a: "ic", b: "olive", wide: "top", narrow: "left" },
    { a: "olive", b: "cochL", wide: "top", narrow: "left" },
    { a: "olive", b: "cochR", wide: "left", narrow: "right" },
  ];
  const steps = [
    { on: Object.keys(meta), caption: "Both ears feed brainstem relays that compare them before the MGN relays to auditory cortex, and the outer curves show signals returning to the ears." },
    { on: ["cochL", "cochR"], caption: "Each cochlea sorts high frequencies near its base and low frequencies near its tip, has about 3,500 inner hair cells, and does not regrow lost hair cells in humans." },
    { on: ["cochL", "cochR", "cnL", "cnR"], caption: "Each auditory nerve ends in the cochlear nuclei on its own side, where different cell types pick out timing, loudness and frequency content." },
    { on: ["cnL", "cnR", "olive"], caption: "The superior olive is the first place the two ears meet, comparing arrival time and loudness while people can detect timing differences of about 10 microseconds." },
    { on: ["olive", "ic"], caption: "Nearly every rising route stops at the inferior colliculus, which combines timing, loudness and frequency and helps turn the eyes and head toward a sound." },
    { on: ["ic", "mgn"], caption: "The MGN is the hearing relay of the thalamus and, like the LGN, receives large feedback projections from the cortex it sends to." },
    { on: ["mgn", "a1"], caption: "Auditory cortex keeps the cochlea's frequency map, and because routes cross at several levels, damage to one side rarely causes deafness in one ear." },
    { on: ["a1", "belt"], caption: "The belt and parabelt prefer complex sounds such as noise bands, sweeps and calls, and in monkeys, the core feeds eight proposed belt areas." },
    { on: ["belt", "what", "where"], caption: "A front stream helps identify sounds while a back stream helps locate them; of 15 patients with right-side damage, four recognized sounds but could not locate them, and three did the reverse." },
    { on: ["a1", "ic", "olive", "cochL", "cochR"], caption: "Fibres from the olive reduce the cochleae's amplification; in chinchillas watching lights, responses to ignored clicks fell by up to 4 dB, while in people the evidence is mixed." },
  ];
  flowFigure("fig-hearing", { meta, layouts, edges, returns, steps });
})();

/* ================= Fig 4: speech, one stream to meaning and one to movement ================= */
(() => {
  const meta = {
    a1: { label: "Auditory cortex", sub: "hears the word", tip: tip("Primary auditory cortex", "Speech arrives here like any other sound. In one study, stimulating it caused sound hallucinations but did not affect word perception.") },
    stg: { label: "Speech-sound area", sub: "superior temporal gyrus", tip: tip("Superior temporal gyrus", "Along the top of the temporal lobe; a key area for recognizing speech sounds, such as whether a consonant uses the lips or the tongue.") },
    meaning: { label: "Meaning", sub: "ventral, both sides", tip: tip("Meaning networks", "Word meaning is represented across large parts of both hemispheres; studies of brain damage point to a larger role for the left side.") },
    spt: { label: "Area Spt", sub: "dorsal: sound to move", tip: tip("Area Spt", "At the back end of the Sylvian fissure; thought to link a word's sound with the movements that say it. Active when hearing and silently rehearsing.") },
    broca: { label: "Broca's area", sub: "plans speech", tip: tip("Broca's area", "In the left inferior frontal gyrus, involved in planning speech. Its exact role is debated.") },
    motor: { label: "Motor cortex", sub: "lips, jaw, tongue", tip: tip("Speech motor cortex", "The lower end of the precentral gyrus. It controls the lips, jaw, tongue and larynx through the brainstem.") },
  };
  const layouts = {
    wide: { box: [960, 250], at: { a1: [16, 110, 150], stg: [206, 110, 176], spt: [424, 40, 150], broca: [612, 40, 150], motor: [800, 40, 150], meaning: [424, 180, 150] } },
    narrow: { box: [360, 392], at: { a1: [100, 14, 160], stg: [92, 90, 176], meaning: [16, 180, 150], spt: [194, 180, 150], broca: [194, 256, 150], motor: [194, 332, 150] } },
  };
  const edges = [["a1", "stg"], ["stg", "meaning"], ["stg", "spt"], ["spt", "broca"], ["broca", "motor"]];
  const returns = [{ a: "motor", b: "a1", wide: "top", narrow: "right" }];
  const steps = [
    { on: Object.keys(meta), caption: "A ventral stream links speech sounds to meaning, while a dorsal stream, mainly on the left, links them to the movements that say them in the order used to repeat a word." },
    { on: ["a1"], caption: "Speech reaches auditory cortex like any sound, and the nearby superior temporal gyrus starts responding almost as early, so the two work partly in parallel." },
    { on: ["a1", "stg", "meaning"], caption: "The superior temporal gyrus responds to features of speech sounds, and when two people speak at once, its activity mainly follows the one you attend to." },
    { on: ["stg", "spt"], caption: "Area Spt links a word's sound to the movements that say it, and damage around it is associated with conduction aphasia, with fluent speech but trouble repeating what is heard." },
    { on: ["spt", "broca"], caption: "In seven patients repeating words, Broca's area became active soon after the word was heard, well before speaking, and went largely quiet once speaking began." },
    { on: ["broca", "motor", "a1"], caption: "Motor cortex moves the lips, jaw, tongue and larynx while hearing your own voice helps correct errors; a 0.2 s delay made 17 fluent speakers stumble two to three times as often." },
  ];
  flowFigure("fig-speech", { meta, layouts, edges, returns, steps });
})();

/* ================= Fig 5: the cortex adjusts its own input at the thalamus (mechanism) ================= */
(() => {
  const meta = {
    retina: { label: "Retina", sub: "the driver input", tip: tip("Retina", "Its inputs are drivers: they carry the visual information the relay passes on, and largely decide what each relay cell responds to.") },
    lgn: { label: "LGN relay cell", sub: "passes input on", tip: tip("LGN relay cell", "Receives the retina's signal and passes it to the cortex. Most of its synapses come from elsewhere: cortex, brainstem and inhibitory cells.") },
    trn: { label: "TRN", sub: "inhibitory shell", band: "hatch", tip: tip("Thalamic reticular nucleus", "A thin layer of inhibitory neurons around the thalamus. It receives branches of the connections between thalamus and cortex, both ways, and inhibits relay cells.") },
    pulvinar: { label: "Pulvinar", sub: "relays cortex", tip: tip("Pulvinar", "The largest nucleus of the primate thalamus. Its main input comes from the cortex rather than the sense organs.") },
    l1: { label: "Layer 1", sub: "", band: true, tip: tip("Layer 1", "The outermost layer of the cortex. V1 has six layers; activity entering layer 4 spreads to the other five.") },
    l23: { label: "Layers 2–3", sub: "to other areas", band: true, tip: tip("Layers 2–3", "In general, these layers connect to other cortical areas, such as the direct route from V1 to higher visual areas.") },
    l4: { label: "Layer 4", sub: "main input", band: true, tip: tip("Layer 4", "The main input layer of the cortex. LGN axons arrive mainly here.") },
    l5: { label: "Layer 5", sub: "drives a relay", band: true, tip: tip("Layer 5", "Large neurons here send output to higher-order thalamus, such as the pulvinar, and to brainstem centres that control movement.") },
    l6: { label: "Layer 6", sub: "adjusts the relay", band: true, tip: tip("Layer 6", "The deepest layer. Its neurons project back to the LGN, exciting relay cells and, through branches, the inhibitory TRN.") },
    higher: { label: "Higher areas", sub: "visual, beyond V1", tip: tip("Higher visual areas", "The many visual areas beyond V1, specialized for features such as shape, colour, motion, faces and places.") },
    brain: { label: "Brainstem", sub: "e.g. colliculus", external: true, tip: tip("Brainstem centres", "Many layer 5 axons also branch to brainstem centres that control movement, such as the superior colliculus.") },
  };
  const edges = [
    { key: "eye", a: "retina", b: "lgn", kind: "driver", label: "driver" },
    { key: "up", a: "lgn", b: "l4" },
    { key: "spreadUp", a: "l4", b: "l23" },
    { key: "spreadDown", a: "l4", b: "l6" },
    { key: "l6lgn", a: "l6", b: "lgn", label: "modulator" },
    { key: "l6trn", a: "l6", b: "trn" },
    { key: "trnlgn", a: "trn", b: "lgn", kind: "inhib", label: "inhibits" },
    { key: "l5pul", a: "l5", b: "pulvinar", kind: "driver", label: "driver" },
    { key: "pulhigh", a: "pulvinar", b: "higher" },
    { key: "direct", a: "l23", b: "higher", kind: "direct", label: "direct" },
    { key: "l5brain", a: "l5", b: "brain", kind: "branch" },
  ];
  const layouts = {
    wide: {
      box: [960, 410],
      at: { retina: [16, 332, 120], lgn: [180, 332, 140], pulvinar: [404, 332, 126], trn: [170, 292, 310, 18],
        l1: [580, 44, 210, 18], l23: [580, 62, 210, 50], l4: [580, 112, 210, 46], l5: [580, 158, 210, 46], l6: [580, 204, 210, 46],
        higher: [830, 63, 124], brain: [830, 158, 124] },
      inset: { x: 16, y: 34, w: 500 }, column: { x: 580, y: 34, label: "V1 · PRIMARY VISUAL CORTEX" }, zone: { x: 150, y: 280, w: 410, h: 122 }, branch: [372, 225],
      paths: (A) => ({
        eye: hcurve(A("retina", "r"), A("lgn", "l")),
        up: ortho([A("lgn", "t", 0.32), [225, 135], A("l4", "l")]),
        spreadUp: vcurve(A("l4", "t", 0.45), nudge(A("l23", "b", 0.45), -22)),
        spreadDown: vcurve(A("l4", "b", 0.45), nudge(A("l6", "t", 0.45), 14)),
        l6lgn: ortho([A("l6", "l", 0.45), [278, 225], A("lgn", "t", 0.7)]),
        l6trn: ortho([[372, 225], [372, 292]]),
        trnlgn: vcurve([200, 310], [200, 332]),
        l5pul: ortho([A("l5", "l"), [500, 181], [500, 332]]),
        pulhigh: ortho([A("pulvinar", "r"), [810, 355], [810, 98], A("higher", "l", 0.76)]),
        direct: hcurve(A("l23", "r", 0.32), A("higher", "l", 0.32)),
        l5brain: hcurve(A("l5", "r"), A("brain", "l")),
      }),
      labels: { eye: [158, 345], l6lgn: [330, 218], trnlgn: [176, 326], l5pul: [540, 172], direct: [810, 70] },
    },
    narrow: {
      box: [360, 656],
      at: { higher: [190, 112, 150], brain: [20, 112, 150], l1: [62, 212, 238, 16], l23: [62, 228, 238, 44], l4: [62, 272, 238, 40], l5: [62, 312, 238, 40], l6: [62, 352, 238, 40],
        trn: [24, 438, 286, 16], lgn: [24, 474, 150], pulvinar: [196, 474, 140], retina: [24, 596, 150] },
      inset: { x: 12, y: 18, w: 336 }, column: { x: 62, y: 202, label: "V1 · PRIMARY VISUAL CORTEX" }, zone: { x: 12, y: 424, w: 336, h: 120 }, branch: [119, 412],
      paths: (A) => ({
        eye: vcurve(A("retina", "t"), A("lgn", "b")),
        up: ortho([[40, 474], [40, 292], A("l4", "l")], 6),
        spreadUp: vcurve(A("l4", "t", 0.42), nudge(A("l23", "b", 0.42), -22)),
        spreadDown: vcurve(A("l4", "b", 0.42), nudge(A("l6", "t", 0.42), 12)),
        l6lgn: vcurve(A("l6", "b", 0.24), [119, 474]),
        l6trn: ortho([[119, 412], [160, 412], [160, 438]], 6),
        trnlgn: vcurve([150, 454], [150, 474]),
        l5pul: ortho([A("l5", "r"), [322, 332], [322, 474]], 6),
        pulhigh: ortho([A("pulvinar", "r"), [350, 497], [350, 135], A("higher", "r")], 6),
        direct: ortho([A("l23", "r", 0.4), [312, 246], [312, 158]], 6),
        l5brain: ortho([A("l5", "l"), [50, 332], [50, 158]], 6),
      }),
      labels: { eye: [128, 562], l6lgn: [80, 420], trnlgn: [190, 468], l5pul: [300, 420], direct: [286, 196] },
    },
  };
  // Synapses onto one LGN relay cell in cats (Van Horn, Erişir & Sherman 2000): retina 7%, then about 30% each from
  // cortex, brainstem and inhibitory cells. The three "about 30%" shares are drawn equal, at 31%, so the bar sums to 100.
  const SHARES = [{ key: "eye", label: "Eye 7%", v: 7 }, { key: "cortex", label: "Cortex ≈30%", v: 31 }, { key: "stem", label: "Brainstem ≈30%", v: 31 }, { key: "inhib", label: "Inhibitory ≈30%", v: 31 }];
  const parts = {};
  const extra = {
    init({ el, under }) {
      parts.zone = el("rect", { rx: 12 }, under);
      parts.zoneLabel = el("text", { "font-size": 11, "font-weight": 600, "letter-spacing": "0.08em", "text-anchor": "end" }, under);
      parts.zoneLabel.textContent = "THALAMUS";
      parts.colLabel = el("text", { "font-size": 11, "font-weight": 600, "letter-spacing": "0.08em" }, under);
      parts.title = el("text", { "font-size": 11.5, "font-weight": 600 }, under);
      parts.title.textContent = "Synapses on one LGN relay cell (cats)";
      parts.segs = SHARES.map((s) => ({ ...s, rect: el("rect", { height: 16, rx: 2 }, under), text: el("text", { "font-size": 11 }, under) }));
      for (const s of parts.segs) s.text.textContent = s.label;
      parts.branch = el("circle", { r: 3 }, under);
    },
    layout(name, L) {
      const z = L.zone, c = L.column, i = L.inset;
      Object.entries({ x: z.x, y: z.y, width: z.w, height: z.h }).forEach(([a, v]) => parts.zone.setAttribute(a, v));
      parts.zoneLabel.setAttribute("x", z.x + z.w - 12); parts.zoneLabel.setAttribute("y", z.y + z.h - 10);
      parts.colLabel.textContent = c.label; parts.colLabel.setAttribute("x", c.x); parts.colLabel.setAttribute("y", c.y);
      parts.title.setAttribute("x", i.x); parts.title.setAttribute("y", i.y - 6);
      const total = SHARES.reduce((a, s) => a + s.v, 0), barY = i.y + 24;
      let x = i.x;
      parts.segs.forEach((s, j) => {
        const w = (i.w * s.v) / total;
        s.rect.setAttribute("x", x + 0.5); s.rect.setAttribute("y", barY); s.rect.setAttribute("width", Math.max(1, w - 1));
        // The eye's sliver is too narrow for its label, so that label sits above the bar; the rest sit below.
        s.text.setAttribute("x", j ? x + 3 : x); s.text.setAttribute("y", j ? barY + 30 : barY - 5);
        x += w;
      });
      parts.branch.setAttribute("cx", L.branch[0]); parts.branch.setAttribute("cy", L.branch[1]);
    },
    render(f, C, s) {
      parts.zone.setAttribute("fill", C.surface2); parts.zone.setAttribute("stroke", C.line); parts.zone.setAttribute("opacity", 0.9);
      parts.zoneLabel.setAttribute("fill", C.muted); parts.colLabel.setAttribute("fill", C.muted); parts.title.setAttribute("fill", C.fg);
      for (const seg of parts.segs) {
        const hot = s.share === seg.key;
        seg.rect.setAttribute("fill", hot ? C.accent : seg.key === "eye" ? C.fg : C.lineStrong);
        seg.rect.setAttribute("opacity", !s.share || hot ? 1 : 0.45);
        seg.text.setAttribute("fill", hot ? C.fg : C.muted); seg.text.setAttribute("font-weight", hot ? 600 : 400);
      }
      const branchOn = !f.step || s.edges?.includes("l6trn");
      parts.branch.setAttribute("fill", branchOn && f.step ? C.fg : C.muted); parts.branch.setAttribute("opacity", branchOn ? 1 : 0.3);
    },
  };
  const steps = [
    { on: Object.keys(meta), caption: "Two kinds of output return from V1, with layer 6 adjusting how much the LGN passes on and layer 5 driving the pulvinar, a second relay." },
    { on: ["retina", "lgn"], edges: ["eye"], share: "eye", caption: "The retina's inputs are drivers that carry the picture the relay passes on, although in cats only about 7% of a relay cell's synapses come from the retina." },
    { on: ["lgn", "l4", "l23", "l5", "l6"], edges: ["up", "spreadUp", "spreadDown"], caption: "LGN axons arrive mainly in layer 4 of V1, the main input layer, before activity spreads to the other layers and layers 5 and 6 send output back down." },
    { on: ["l6", "lgn"], edges: ["l6lgn"], share: "cortex", caption: "Layer 6 excites the relay cells and changes how strongly they respond to the retina, while supplying about 30% of their synapses, four times the retina's share (cats)." },
    { on: ["l6", "trn", "lgn"], edges: ["l6lgn", "l6trn", "trnlgn"], share: "inhib", rates: { l6lgn: 0.35, l6trn: 0.35, trnlgn: 0.35 }, badges: { l6: "slow", lgn: "relay output down" },
      caption: "The same axons branch to the TRN, which inhibits the relay, and in slices of mouse touch thalamus, slow layer 6 activity mainly reduced relay activity." },
    { on: ["l6", "trn", "lgn"], edges: ["l6lgn", "l6trn", "trnlgn"], share: "inhib", rates: { l6lgn: 2.4, l6trn: 2.4, trnlgn: 2.4 }, badges: { l6: "≈10 pulses/s", lgn: "relay output up" },
      caption: "At around 10 pulses per second, the same feedback increased relay activity, and a 2024 study in awake mice found a similar switch as layer 6 activity rose." },
    { on: ["l5", "pulvinar", "higher", "brain", "l23"], edges: ["l5pul", "pulhigh", "direct", "l5brain"], caption: "Layer 5 drives the pulvinar, which relays to higher visual areas beside V1's direct route, and in mice, blocking this route impaired a whisker texture task." },
  ];
  routedFigure("fig-loop", { meta, layouts, edges, steps, extra });
})();

/* ================= Fig 6: attention, the networks that set priorities ================= */
(() => {
  const meta = {
    pfc: { label: "Prefrontal cortex", sub: "holds the goal", tip: tip("Prefrontal cortex", "At the front of the brain; keeps goals and rules active and uses them to guide behaviour.") },
    fef: { label: "Frontal eye fields", sub: "aim eyes, attention", tip: tip("Frontal eye fields", "Frontal areas that move the eyes and help direct attention, even without moving the eyes (covert attention).") },
    parietal: { label: "Parietal cortex", sub: "priority map", tip: tip("Parietal cortex", "Around the intraparietal sulcus: where things are and how much each matters now. With the eye fields, the dorsal attention network.") },
    tpj: { label: "TPJ (right)", sub: "turns to surprises", tip: tip("Temporoparietal junction", "Where the temporal and parietal lobes meet. The right TPJ is core to the ventral attention network, which redirects attention to unexpected events.") },
    insula: { label: "Anterior insula", sub: "flags what matters", tip: tip("Anterior insula", "With the cingulate cortex, the core of the salience network: it responds to events that matter now. It also processes signals from inside the body.") },
    cingulate: { label: "Cingulate cortex", sub: "conflict, errors", tip: tip("Anterior cingulate cortex", "Active when responses conflict or after errors. In monkeys it also sends direct input to the locus coeruleus.") },
    lc: { label: "Locus coeruleus", sub: "noradrenaline", tip: tip("Locus coeruleus", "A small nucleus in the upper pons; the main source of noradrenaline (norepinephrine) for the cortex.") },
    sc: { label: "Superior colliculus", sub: "midbrain map", tip: tip("Superior colliculus", "On the roof of the midbrain: turns the eyes and head toward things and helps select which location to attend.") },
    pulvinar: { label: "Pulvinar", sub: "links visual areas", tip: tip("Pulvinar", "The largest nucleus of the primate thalamus. Some of its neurons relay superior colliculus input to area MT.") },
    sensory: { label: "Sensory cortex", sub: "vision, hearing, touch", tip: tip("Sensory cortex", "Where attention's effects are measured: responses to the attended item go up, responses to others go down.") },
  };
  const edges = [
    { key: "pfc-fef", a: "pfc", b: "fef" }, { key: "fef-par", a: "fef", b: "parietal" },
    { key: "sen-par", a: "sensory", b: "parietal" }, { key: "par-sen", a: "parietal", b: "sensory" }, { key: "fef-sen", a: "fef", b: "sensory" },
    { key: "sen-tpj", a: "sensory", b: "tpj" }, { key: "tpj-fef", a: "tpj", b: "fef" },
    { key: "ins-cin", a: "insula", b: "cingulate" }, { key: "cin-pfc", a: "cingulate", b: "pfc" }, { key: "cin-lc", a: "cingulate", b: "lc" },
    { key: "lc-pfc", a: "lc", b: "pfc" }, { key: "lc-sen", a: "lc", b: "sensory" },
    { key: "fef-sc", a: "fef", b: "sc" }, { key: "par-sc", a: "parietal", b: "sc" }, { key: "par-pul", a: "parietal", b: "pulvinar" },
    { key: "sc-pul", a: "sc", b: "pulvinar" }, { key: "pul-sen", a: "pulvinar", b: "sensory" },
  ];
  const layouts = {
    wide: {
      box: [960, 372],
      at: { pfc: [20, 40, 172], fef: [222, 40, 172], parietal: [424, 40, 172], insula: [20, 160, 172], cingulate: [222, 160, 172], tpj: [424, 160, 172],
        lc: [20, 280, 172], sc: [424, 280, 172], sensory: [700, 160, 190], pulvinar: [700, 280, 190] },
      paths: (A) => ({
        "pfc-fef": hcurve(A("pfc", "r"), A("fef", "l")),
        "fef-par": hcurve(A("fef", "r"), A("parietal", "l")),
        "sen-par": ortho([A("sensory", "t", 0.63), [820, 52], A("parietal", "r", 0.26)], 24),
        "par-sen": ortho([A("parietal", "r", 0.7), [780, 72], A("sensory", "t", 0.42)], 24),
        "fef-sen": ortho([A("fef", "t"), [308, 16], [860, 16], A("sensory", "t", 0.84)], 10),
        "sen-tpj": hcurve(A("sensory", "l"), A("tpj", "r")),
        "tpj-fef": vcurve(A("tpj", "t", 0.16), A("fef", "b", 0.84)),
        "ins-cin": hcurve(A("insula", "r"), A("cingulate", "l")),
        "cin-pfc": vcurve(A("cingulate", "t", 0.16), A("pfc", "b", 0.75)),
        "cin-lc": vcurve(A("cingulate", "b", 0.16), A("lc", "t", 0.75)),
        "lc-pfc": ortho([A("lc", "l"), [8, 303], [8, 63], A("pfc", "l")], 8),
        "lc-sen": ortho([A("lc", "b"), [106, 354], [930, 354], [930, 183], A("sensory", "r")], 12),
        "fef-sc": ortho([A("fef", "b", 0.92), [380, 104], [409, 104], [409, 303], A("sc", "l")], 8),
        "par-sc": ortho([A("parietal", "b", 0.9), [579, 104], [645, 104], [645, 292], A("sc", "r", 0.26)], 8),
        "par-pul": ortho([A("parietal", "b", 0.9), [579, 104], [645, 104], [645, 292], A("pulvinar", "l", 0.26)], 8),
        "sc-pul": hcurve(A("sc", "r", 0.7), A("pulvinar", "l", 0.7)),
        "pul-sen": vcurve(A("pulvinar", "t"), A("sensory", "b")),
      }),
    },
    narrow: {
      box: [374, 500], font: [12, 11],
      at: { pfc: [28, 20, 150], fef: [194, 20, 150], tpj: [28, 104, 150], parietal: [194, 104, 150], insula: [28, 188, 150], sc: [194, 188, 150],
        cingulate: [28, 272, 150], pulvinar: [194, 272, 150], lc: [28, 356, 150], sensory: [28, 440, 316] },
      paths: (A) => {
        const parSen = [A("parietal", "r", 0.74), [366, 138], [366, 463], A("sensory", "r")];
        return {
          "pfc-fef": hcurve(A("pfc", "r"), A("fef", "l")),
          "fef-par": vcurve(A("fef", "b"), A("parietal", "t")),
          "par-sen": ortho(parSen, 4), "sen-par": ortho([...parSen].reverse(), 4),
          "fef-sen": ortho([A("fef", "b", 0.1), [209, 76], [186, 76], [186, 440]], 4),
          "sen-tpj": ortho([A("sensory", "l"), [6, 463], [6, 127], A("tpj", "l")], 4),
          "tpj-fef": vcurve(A("tpj", "t", 0.88), A("fef", "b", 0.24)),
          "ins-cin": vcurve(A("insula", "b"), A("cingulate", "t")),
          "cin-pfc": ortho([A("cingulate", "l"), [13, 295], [13, 43], A("pfc", "l")], 4),
          "cin-lc": vcurve(A("cingulate", "b"), A("lc", "t")),
          "lc-pfc": ortho([A("lc", "l"), [20, 379], [20, 52], A("pfc", "l", 0.7)], 4),
          "lc-sen": vcurve(A("lc", "b"), A("sensory", "t", 0.24)),
          "fef-sc": ortho([A("fef", "r", 0.66), [359, 50], [359, 211], A("sc", "r")], 4),
          "par-sc": vcurve(A("parietal", "b"), A("sc", "t")),
          "par-pul": ortho([A("parietal", "r", 0.5), [352, 127], [352, 295], A("pulvinar", "r")], 4),
          "sc-pul": vcurve(A("sc", "b"), A("pulvinar", "t")),
          "pul-sen": vcurve(A("pulvinar", "b"), A("sensory", "t", 0.76)),
        };
      },
    },
  };
  const steps = [
    { on: Object.keys(meta), caption: (f) => (f.w < 560
      ? "Goal-driven areas, areas that respond to surprise and importance, and areas for arousal and routing all act on sensory cortex; the links show interaction rather than an order."
      : "Goal-driven areas (top row), areas that respond to surprise and importance (middle), and arousal and routing areas (bottom) all act on sensory cortex; the links show interaction rather than an order.") },
    { on: ["pfc"], edges: [], caption: "Prefrontal cortex holds a goal such as finding a friend in a crowd, and visual areas become more active while people wait at an attended spot before anything appears." },
    { on: ["pfc", "fef"], edges: ["pfc-fef"], caption: "The frontal eye fields move the eyes and can shift attention without moving them, and in monkeys, weak stimulation here improved attention only at the matching location." },
    { on: ["fef", "parietal", "sensory"], edges: ["fef-par", "sen-par"], caption: "Parietal cortex keeps a priority map of where things are and how much each matters right now, and with the eye fields, it forms the dorsal attention network." },
    { on: ["sensory", "tpj", "fef"], edges: ["sen-tpj", "tpj-fef"], caption: "Something unexpected but relevant engages the TPJ and frontal areas, mainly on the right, to move attention, although whether it triggers the shift or updates afterwards is debated." },
    { on: ["insula"], edges: [], caption: "The anterior insula and the cingulate cortex form the salience network, which responds to events that matter now: a sudden change in a sound, sight or touch, or pain." },
    { on: ["insula", "cingulate", "pfc"], edges: ["ins-cin", "cin-pfc"], caption: "The cingulate cortex is active during conflicting trials, such as naming the ink colour of RED printed in blue, and may signal prefrontal cortex to increase control next time." },
    { on: ["cingulate", "lc", "pfc", "sensory"], edges: ["cin-lc", "lc-pfc", "lc-sen"], caption: "The locus coeruleus supplies noradrenaline to the cortex, and in monkeys, its neurons burst about 90 ms after a rare target, roughly 200 ms before the response." },
    { on: ["fef", "parietal", "sc"], edges: ["fef-sc", "par-sc"], caption: "The superior colliculus holds a map of space, and in monkeys, silencing part of it made them largely ignore that part of the field when a conflicting distractor appeared elsewhere." },
    { on: ["sc", "parietal", "pulvinar"], edges: ["sc-pul", "par-pul"], caption: "The pulvinar links visual areas, and in monkeys, its activity synchronized connected visual areas according to where the animal was attending." },
    { on: ["pulvinar", "fef", "parietal", "sensory"], edges: ["pul-sen", "fef-sen", "par-sen"], caption: "In sensory cortex, attention raises responses to the attended item and lowers others; in monkeys with one stimulus in view, responses rose by about 26% in V4 and 8% in V1." },
  ];
  routedFigure("fig-networks", { meta, layouts, edges, steps });
})();

/* ================= Fig 7: giving one sense priority (the repo's normalization model, explorable) ================= */
(() => {
  // src/model/attention.ts: R_i = A_i·E_i / (σ + Σ_j A_j·E_j), σ = 1, attention gain A up to 3 for the prioritized
  // stream and 1 for the others, E = 1 while a stream is shown. Pooling across senses is the repo's illustration.
  const SIGMA = 1, MAX_GAIN = 3, BAR_MAX = MAX_GAIN / (SIGMA + MAX_GAIN);
  const SENSES = [{ id: "vision", name: "Vision" }, { id: "touch", name: "Touch" }, { id: "hearing", name: "Sound" }];
  const model = (priority, gain, shown) => {
    const drive = {};
    let pool = SIGMA;
    for (const s of SENSES) { drive[s.id] = (priority === s.id ? gain : 1) * (shown[s.id] ? 1 : 0); pool += drive[s.id]; }
    const R = {};
    for (const s of SENSES) R[s.id] = drive[s.id] / pool;
    return { drive, pool, R, base: 1 / (SIGMA + SENSES.filter((s) => shown[s.id]).length) };
  };
  const fmt = (v) => v.toFixed(2), gx = (g) => `${g.toFixed(1)}×`;
  const shownOf = (f) => ({ vision: f.params.vision, touch: f.params.touch, hearing: f.params.hearing });
  const rowOf = (f) => Math.max(0, SENSES.findIndex((s) => s.id === f.params.priority));
  const geo = (f) => {
    if (f.w < 560) return { narrow: true, rows: SENSES.map((_, i) => 46 + i * 74), g0: 74, g1: f.w - 22, r0: 74, r1: f.w - 52, rOff: 30, poolY: 286, eqY: 346 };
    return { narrow: false, rows: SENSES.map((_, i) => 58 + i * 54), g0: 108, g1: 318, r0: 380, r1: f.w - 64, rOff: 0, poolY: 236, eqY: 290 };
  };
  const tips = {
    gain: tip("Attention gain", "How much this sense's input is multiplied (A). Only the sense you give priority gets more than 1×; the model caps it at 3×."),
    response: tip("Response", "R = A·E divided by the shared total. The dashed tick is each sense's response when nothing has priority."),
    pool: tip("Shared total", "σ plus every sense's A·E. Each response is its share of this total, so growing one share shrinks the others."),
    sigma: tip("σ = 1", "A constant in the denominator. It is why no response can reach 1, even for a sense shown alone."),
  };
  FS.figure("fig-norm", {
    height: (w) => (w < 560 ? 372 : 304),
    params: {
      priority: { value: "vision", label: "Give priority to", placement: "inline", options: [{ value: "none", label: "None" }, ...SENSES.map((s) => ({ value: s.id, label: s.name }))] },
      gain: { value: 2.3, min: 1, max: MAX_GAIN, step: 0.1, label: "Attention gain", format: gx },
      vision: { value: true, label: "Vision shown" },
      touch: { value: true, label: "Touch shown" },
      hearing: { value: true, label: "Sound shown" },
    },
    reserve: { summary: ["Vision 0.75 · Touch 0.00 · Sound 0.00 · total 4.0"], prio: ["0.75"], other: ["0.25"], base: ["0.50"], name: ["vision's"] },
    tips,
    tipAt: (f, x, y) => f.state.hits?.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)?.key ?? null,
    handles: {
      gain: {
        label: "Attention gain: drag or use the arrow keys",
        radius: 16, step: 10,
        hidden: (f) => f.params.priority === "none" || !f.params[f.params.priority],
        get: (f) => { const G = geo(f); return { x: f.state.dragX ?? G.g0 + ((f.v.gain - 1) / (MAX_GAIN - 1)) * (G.g1 - G.g0), y: G.rows[rowOf(f)] }; },
        set: (f, x, y, phase) => {
          const G = geo(f);
          // Keep the raw (rubber-banded) position only while the pointer holds it; keys and the settle land on the value.
          f.state.dragX = phase === "drag" ? x : null;
          const g = 1 + ((x - G.g0) / (G.g1 - G.g0)) * (MAX_GAIN - 1);
          FS.get("fig-norm").set("gain", Math.round(FS.clamp(g, 1, MAX_GAIN) * 10) / 10, { instant: true });
        },
        bounds: (f) => { const G = geo(f), y = G.rows[rowOf(f)]; return { x0: G.g0, x1: G.g1, y0: y, y1: y }; },
      },
    },
    onParam(f, name) {
      if (name === "gain" && f.params.priority === "none") FS.get("fig-norm").set("priority", "vision");
      if (name === "priority" && f.params.priority !== "none" && !f.params[f.params.priority]) FS.get("fig-norm").set(f.params.priority, true);
    },
    render(f, c) {
      const C = f.C, G = geo(f), hits = (f.state.hits = []), prio = f.params.priority, shown = shownOf(f);
      const M = model(prio, f.v.gain, shown), Mt = model(prio, f.params.gain, shown);
      const GX = (g) => G.g0 + ((g - 1) / (MAX_GAIN - 1)) * (G.g1 - G.g0), RX = (r) => G.r0 + (r / BAR_MAX) * (G.r1 - G.r0);
      FS.k.text(f, c, "Attention gain (A)", G.g0, 18, { size: 11, weight: 600, color: C.muted });
      if (!G.narrow) FS.k.text(f, c, "Response (R)", G.r0, 18, { size: 11, weight: 600, color: C.muted });
      SENSES.forEach((s, i) => {
        const y = G.rows[i], on = shown[s.id], isP = prio === s.id, ry = y + G.rOff;
        c.globalAlpha = on ? 1 : C.dim;
        FS.k.text(f, c, s.name, 0, y + 4, { size: 13, weight: 600, color: C.fg });
        if (isP && on) FS.k.text(f, c, "priority", 0, y + 18, { size: 10.5, weight: 600, color: C.accent });
        if (!on) FS.k.text(f, c, "not shown", 0, y + 18, { size: 10.5, color: C.muted });
        // gain track, 1× to 3×
        c.strokeStyle = C.lineStrong; c.lineWidth = 2; FS.k.line(c, G.g0, y, G.g1, y);
        c.lineWidth = 1;
        for (const g of [1, 2, 3]) { FS.k.line(c, GX(g), y - 4, GX(g), y + 4); if (i === SENSES.length - 1 || G.narrow) FS.k.text(f, c, `${g}×`, GX(g), y + 18, { size: 10.5, align: "center" }); }
        hits.push({ key: "gain", x: G.g0 - 6, y: y - 12, w: G.g1 - G.g0 + 12, h: 24 });
        if (isP && on) {
          const held = f.drag === "gain", hov = f.handleHover === "gain", kx = f.state.dragX ?? GX(f.v.gain), r = held ? 7 : hov ? 6 : 4.5;
          c.strokeStyle = C.fg; c.lineWidth = 2; FS.k.line(c, G.g0, y, Math.min(kx, G.g1), y);
          c.fillStyle = C.surface; c.beginPath(); c.arc(kx, y, r + 3, 0, 7); c.fill();
          c.fillStyle = C.accent; c.beginPath(); c.arc(kx, y, r, 0, 7); c.fill();
          FS.k.label(f, c, gx(f.v.gain), kx, y - 14, { size: 11, weight: 600, align: "center", color: C.fg });
        } else {
          c.strokeStyle = C.muted; c.lineWidth = 1.25; c.fillStyle = C.surface; c.beginPath(); c.arc(GX(1), y, 3.5, 0, 7); c.fill(); c.stroke();
        }
        // response bar
        const r = M.R[s.id], bh = 14, by = ry - bh / 2;
        FS.k.rrect(c, G.r0, by, G.r1 - G.r0, bh, 3); c.fillStyle = C.surface2; c.fill();
        if (r > 0) { FS.k.rrect(c, G.r0, by, Math.max(2, RX(r) - G.r0), bh, 3); c.fillStyle = isP ? C.accent : C.muted; c.fill(); }
        hits.push({ key: "response", x: G.r0, y: by - 4, w: G.r1 - G.r0, h: bh + 8 });
        if (on && prio !== "none") { const bx = RX(M.base); c.strokeStyle = C.strong; c.lineWidth = 1.25; c.setLineDash([3, 3]); FS.k.line(c, bx, by - 5, bx, by + bh + 5); c.setLineDash([]); }
        FS.k.text(f, c, fmt(r), G.r1 + 8, ry + 4, { size: 12, weight: 600, color: C.fg, mono: true });
        if (G.narrow) FS.k.text(f, c, "R", G.r0 - 14, ry + 4, { size: 10.5, color: C.muted });
        c.globalAlpha = 1;
      });
      if (prio !== "none") FS.k.text(f, c, `dashed: no priority (${fmt(M.base)})`, G.r0, G.rows[SENSES.length - 1] + G.rOff + 26, { size: 10.5, color: C.muted });
      // the shared total in the model's own units, on a scale that fits the largest possible total (1 + 3 + 1 + 1)
      const maxPool = SIGMA + MAX_GAIN + (SENSES.length - 1), x1 = f.w - 58, PX = (v) => (v / maxPool) * x1, py = G.poolY, ph = 22;
      FS.k.text(f, c, "Shared total (σ + every A·E)", 0, py - 10, { size: 11, weight: 600, color: C.muted });
      let x = 0;
      for (const seg of [{ key: "sigma", name: "σ", v: SIGMA }, ...SENSES.map((s) => ({ key: s.id, name: s.name, v: M.drive[s.id] }))]) {
        const w = PX(seg.v);
        if (w <= 0) continue;
        FS.k.rrect(c, x + 1, py, Math.max(1, w - 2), ph, 3);
        if (seg.key === "sigma") { c.fillStyle = C.surface2; c.fill(); FS.k.rrect(c, x + 1, py, w - 2, ph, 3); c.fillStyle = FS.k.hatch(f, c, C.muted, 4); c.fill(); }
        else { c.fillStyle = seg.key === prio ? C.accent : C.muted; c.fill(); }
        const num = seg.key === "sigma" ? "1" : seg.v.toFixed(1), label = w > 70 ? `${seg.name} ${num}` : w > 26 ? num : "";
        if (label) FS.k.label(f, c, label, x + 7, py + ph / 2, { size: 10.5, weight: 600, color: seg.key === "sigma" ? C.fg : C.surface, halo: seg.key === "sigma" ? C.surface2 : seg.key === prio ? C.accent : C.muted });
        hits.push({ key: seg.key === "sigma" ? "sigma" : "pool", x, y: py, w, h: ph });
        x += w;
      }
      FS.k.text(f, c, `= ${M.pool.toFixed(1)}`, x + 8, py + ph / 2 + 4, { size: 12, weight: 600, color: C.fg, mono: true });
      // the worked division for the prioritized sense (vision when nothing has priority)
      const who = prio === "none" ? "vision" : prio, name = SENSES.find((s) => s.id === who).name;
      FS.k.text(f, c, shown[who] ? `${name}: R = ${M.drive[who].toFixed(1)} ÷ ${M.pool.toFixed(1)} = ${fmt(M.R[who])}` : `${name} is not shown, so its response is 0`, 0, G.eqY, { size: 12, weight: 600, color: C.fg, mono: true });
      // outputs come from the target values, so the prose never lags behind a drag
      const others = SENSES.filter((s) => s.id !== who && shown[s.id]);
      f.api.out("summary", `${SENSES.map((s) => `${s.name} ${fmt(Mt.R[s.id])}`).join(" · ")} · total ${Mt.pool.toFixed(1)}`);
      f.api.out("prio", fmt(Mt.R[who]));
      f.api.out("other", others.length ? fmt(Mt.R[others[0].id]) : "none");
      f.api.out("base", fmt(Mt.base));
      f.api.out("name", `${name.toLowerCase()}'s`);
    },
  });
})();
