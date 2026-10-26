#!/usr/bin/env node
// Prints every quoted running-example value from the shared data module.
import { data as EX } from "./data.js";

const f2 = (v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
const pair = (p) => `(${f2(p[0])}, ${f2(p[1])})`;

const base = EX.run();
const long = EX.run({ steps: 30 });
const flat = EX.run({ steps: 30, lambda: 0 });
const C = 2;
const D = 3;
const s0 = base[0].parts[C];
const s1 = base[1].parts[C];
const lip = EX.settings.beta / 2 * 4 + 1 + 2 * EX.settings.lambda * 2;

const lines = [
  ["settings", JSON.stringify(EX.settings)],
  ["degrees A B C D", EX.degree.join(" ")],
  ["step 0, C weights camera / lens", `${f2(s0.w[0])} / ${f2(s0.w[1])}`],
  ["step 0, C blend (retrieval)", pair(s0.r)],
  ["step 0, -(L X)_C", pair(EX.laplacian(base[0].X, C).map((v) => -v))],
  ["step 0, graph pull on C", pair(s0.g)],
  ["step 0, neighbour shares A B D", [0, 1, 3].map((v) => pair(EX.neighbourPull(base[0].X, C, v, 0.3))).join(" ")],
  ["step 1, C", pair(base[1].X[C])],
  ["step 1->2, C keep", pair(s1.keep)],
  ["step 1->2, C blend, alpha*blend", `${pair(s1.r)} ${pair(s1.r.map((v) => 0.3 * v))}`],
  ["step 1->2, C neighbour pull, alpha*pull", `${pair(s1.g)} ${pair(s1.g.map((v) => 0.3 * v))}`],
  ["step 2, C", pair(base[2].X[C])],
  ["C camera weight, steps 0..4", base.map((s) => f2(s.parts[C].w[0])).join(" ")],
  ["C position, steps 0..4", base.map((s) => pair(s.X[C])).join(" ")],
  ["energy total, steps 0..4", base.map((s) => f2(s.energy.total)).join(" ")],
  ["energy memory part, steps 0..4", base.map((s) => f2(s.energy.memory)).join(" ")],
  ["energy graph part, steps 0..4", base.map((s) => f2(s.energy.graph)).join(" ")],
  ["energy monotone over 30 steps", String(long.every((s, i) => i === 0 || s.energy.total <= long[i - 1].energy.total + 1e-12))],
  ["lambda 0: C camera weight, steps 0..4", flat.slice(0, 5).map((s) => f2(s.parts[C].w[0])).join(" ")],
  ["lambda 0: C position, step 4", pair(flat[4].X[C])],
  ["D camera weight at step 4", f2(long[4].parts[D].w[0])],
  ["first step D camera weight > 0.5", String(long.findIndex((s) => s.parts[D].w[0] > 0.5))],
  ["D camera weight at steps 15, 16", `${f2(long[15].parts[D].w[0])} ${f2(long[16].parts[D].w[0])}`],
  ["D, C camera weight at step 30", `${f2(long[30].parts[D].w[0])} ${f2(long[30].parts[C].w[0])}`],
  ["energy at step 30", f2(long[30].energy.total)],
  ["lambda 0: D camera weight at step 30", f2(flat[30].parts[D].w[0])],
  ["L_lip bound (beta=1, ||M||^2=4, ||L||<=2)", `${lip.toFixed(1)}; 2/L_lip = ${(2 / lip).toFixed(2)}`],
];
for (const [label, value] of lines) console.log(`${label.padEnd(44)} ${value}`);
