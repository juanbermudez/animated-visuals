"use client";

import type { LineCustomSvgLayerProps } from "@nivo/line";

import { ResponsiveLine } from "@nivo/line";
import { useId, useMemo, useState } from "react";

import { FigurePlate } from "./FigurePlate";
import { chartMargin, chartTheme, useReducedMotion } from "./nivo-theme";

type Point = { x: number; y: number };

/**
 * A nivo line chart as an explorable: one parameter (smoothing) in the toolbar, the claim's
 * numbers computed from the data, direct end labels instead of a legend, Voronoi hover.
 * Load lazily (next/dynamic inside a client component): @nivo/line is ~96 KB gzip.
 */
export function ExplorableLine({
  title,
  raw,
  caption,
}: {
  title: string;
  raw: Point[];
  caption?: string;
}) {
  const id = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const [smooth, setSmooth] = useState(0.9);
  const smoothed = useMemo(() => {
    let s = raw[0]?.y ?? 0;
    return raw.map((p) => ({ x: p.x, y: (s = smooth * s + (1 - smooth) * p.y) }));
  }, [raw, smooth]);
  const data = useMemo(
    () => [
      { id: "raw", data: raw },
      { id: "smoothed", data: smoothed },
    ],
    [raw, smoothed],
  );
  const last = smoothed[smoothed.length - 1];

  // Direct labels at line ends replace a legend.
  const EndLabels = ({ series, xScale, yScale }: LineCustomSvgLayerProps<(typeof data)[number]>) => (
    <g>
      {series.map((s) => {
        const end = s.data[s.data.length - 1];
        const x = (xScale as (v: number) => number)(end.data.x as number);
        const y = (yScale as (v: number) => number)(end.data.y as number) + (s.id === "raw" ? 12 : 0);
        return (
          <text key={s.id} x={x + 8} y={y} dy="0.32em" style={{ fontSize: 11, fontWeight: s.id === "raw" ? 400 : 500, fill: s.id === "raw" ? "var(--fs-muted)" : "var(--fs-fg)" }}>
            {s.id === "raw" ? "raw" : `smoothed ${(end.data.y as number).toFixed(2)}`}
          </text>
        );
      })}
    </g>
  );

  return (
    <FigurePlate id={id} title={title} status="simulated" caption={caption}>
      <div style={{ height: 300 }} role="img" aria-label={`${title}: smoothed final value ${last?.y.toFixed(3)}`}>
        <ResponsiveLine
          data={data}
          theme={chartTheme}
          margin={chartMargin}
          xScale={{ type: "linear" }}
          yScale={{ type: "linear", min: 0, max: "auto" }}
          curve="linear"
          colors={({ id: series }) => (series === "raw" ? "var(--fs-muted)" : "var(--fs-fg)")}
          lineWidth={1.5}
          enablePoints={false}
          enableGridX={false}
          gridYValues={4}
          axisLeft={{ tickValues: 4, tickSize: 0, tickPadding: 8 }}
          axisBottom={{ tickValues: 5, tickSize: 0, tickPadding: 8 }}
          useMesh
          animate={!reduced}
          motionConfig="gentle"
          layers={["grid", "axes", "lines", "crosshair", "mesh", EndLabels]}
        />
      </div>
      <div className="fs-toolbar">
        <span className="fs-position">Hover for values</span>
        <div className="fs-controls">
          <label className="fs-param">
            Smoothing
            <input type="range" min={0} max={0.98} step={0.01} value={smooth} onChange={(e) => setSmooth(Number(e.target.value))} />
            <output>{smooth.toFixed(2)}</output>
          </label>
        </div>
      </div>
    </FigurePlate>
  );
}
