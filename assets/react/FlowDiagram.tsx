"use client";

import type { FsFigureState } from "./fs-runtime";

import { useRef, useState } from "react";

import { FigurePlate } from "./FigurePlate";
import { useFigure } from "./useFigure";

export type FlowNode = { id: string; label: string; sub?: string };
export type FlowStep = { on: string[]; caption: string };
type Layout = { box: [number, number]; dir: "x" | "y"; at: Record<string, [number, number, number]> };

const NODE_H = 46;
const PACKETS = 3;

/**
 * Stepped architecture diagram with packets on Bézier connectors. Two layouts (wide, narrow)
 * so text never shrinks below ~11px on phones. Discrete layout is React state; everything that
 * moves is mutated by the runtime in render().
 */
export function FlowDiagram({
  id,
  title,
  status,
  caption,
  nodes,
  edges,
  steps,
  layouts,
}: {
  id: string;
  title: string;
  status?: string;
  caption?: string;
  nodes: FlowNode[];
  edges: [string, string][];
  steps: FlowStep[];
  layouts: { wide: Layout; narrow: Layout };
}) {
  const [layoutName, setLayoutName] = useState<"wide" | "narrow">("wide");
  const layout = layouts[layoutName];
  const groups = useRef(new Map<string, SVGGElement>());
  const rects = useRef(new Map<string, SVGRectElement>());
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const alpha = useRef(new Map<string, number>());

  const controller = useFigure(id, {
    height: (w) => (w < 560 ? (w * layouts.narrow.box[1]) / layouts.narrow.box[0] : (w * layouts.wide.box[1]) / layouts.wide.box[0]),
    steps,
    resize(f) {
      setLayoutName(f.w < 560 ? "narrow" : "wide");
    },
    render(f: FsFigureState) {
      const C = f.C;
      const on = new Set(steps[f.step]?.on ?? []);
      const e = 1 - (1 - f.stepT) ** 3;
      for (const node of nodes) {
        const g = groups.current.get(node.id);
        const rect = rects.current.get(node.id);
        if (!g || !rect) continue;
        const hovered = f.hover === node.id;
        const target = on.has(node.id) ? 1 : C.dim;
        const current = alpha.current.get(node.id) ?? 1;
        const next = f.stepT < 1 ? current + (target - current) * e : target;
        alpha.current.set(node.id, next);
        g.setAttribute("opacity", hovered ? "1" : next.toFixed(3));
        rect.setAttribute("stroke", hovered ? C.accent : on.has(node.id) && f.step ? C.fg : C.lineStrong);
        rect.setAttribute("stroke-width", hovered ? "1.5" : "1");
      }
      edges.forEach(([a, b], i) => {
        const path = paths.current[i];
        if (!path) return;
        const active = on.has(a) && on.has(b);
        const key = `${a}>${b}`;
        const current = alpha.current.get(key) ?? 1;
        const target = active ? 1 : 0.18;
        const next = f.stepT < 1 ? current + (target - current) * e : target;
        alpha.current.set(key, next);
        path.setAttribute("opacity", next.toFixed(3));
        const length = path.getTotalLength();
        for (let k = 0; k < PACKETS; k++) {
          const dot = dots.current[i * PACKETS + k];
          if (!dot) continue;
          const travel = window.FS!.travel(f.t, k / PACKETS + i * 0.13);
          const point = path.getPointAtLength(travel.u * length);
          dot.setAttribute("cx", point.x.toFixed(1));
          dot.setAttribute("cy", point.y.toFixed(1));
          dot.setAttribute("fill", active && f.step ? C.accent : C.fg);
          dot.setAttribute("opacity", (next * travel.alpha).toFixed(3));
        }
      });
    },
  });

  const curve = (a: string, b: string) => {
    const [ax, ay, aw] = layout.at[a];
    const [bx, by, bw] = layout.at[b];
    if (layout.dir === "x") {
      const p0 = [ax + aw, ay + NODE_H / 2];
      const p1 = [bx, by + NODE_H / 2];
      const m = (p0[0] + p1[0]) / 2;
      return `M${p0} C${m},${p0[1]} ${m},${p1[1]} ${p1}`;
    }
    const p0 = [ax + aw / 2, ay + NODE_H];
    const p1 = [bx + bw / 2, by];
    const m = (p0[1] + p1[1]) / 2;
    return `M${p0} C${p0[0]},${m} ${p1[0]},${m} ${p1}`;
  };

  return (
    <FigurePlate id={id} title={title} status={status} caption={caption} steps play position="step">
      <svg id={id} viewBox={`0 0 ${layout.box[0]} ${layout.box[1]}`} role="img" aria-label={title}>
        {edges.map(([a, b], i) => (
          <g key={`${a}>${b}`}>
            <path
              ref={(el) => {
                paths.current[i] = el;
              }}
              d={curve(a, b)}
              fill="none"
              stroke="var(--fs-muted)"
              strokeWidth="var(--fs-stroke-edge)"
            />
            {Array.from({ length: PACKETS }, (_, k) => (
              <circle
                key={k}
                r={3}
                ref={(el) => {
                  dots.current[i * PACKETS + k] = el;
                }}
              />
            ))}
          </g>
        ))}
        {nodes.map((node) => {
          const [x, y, w] = layout.at[node.id];
          return (
            <g
              key={node.id}
              ref={(el) => {
                if (el) groups.current.set(node.id, el);
              }}
              onPointerEnter={() => controller?.hover(node.id)}
              onPointerLeave={() => controller?.hover(null)}
            >
              <rect
                ref={(el) => {
                  if (el) rects.current.set(node.id, el);
                }}
                x={x}
                y={y}
                width={w}
                height={NODE_H}
                rx={6}
                fill="var(--fs-node, var(--fs-surface-2))"
              />
              <text x={x + 14} y={y + 20} fontSize={13} fontWeight={600} fill="var(--fs-fg)">
                {node.label}
              </text>
              {node.sub && (
                <text x={x + 14} y={y + 35} fontSize={10.5} fill="var(--fs-muted)">
                  {node.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </FigurePlate>
  );
}
