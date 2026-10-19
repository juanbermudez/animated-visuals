"use client";

import type { ReactNode } from "react";

export type Readout = { id: string; label: ReactNode };

/**
 * The plate from themes/base.css: head / stage / toolbar / step text / caption / readouts.
 * Controls use the runtime's declarative bindings (data-fs*), so they work the same in
 * React and in standalone pages. Import themes/base.css and a token layer once, globally.
 */
export function FigurePlate({
  id,
  title,
  status,
  caption,
  steps = false,
  play = false,
  seek = false,
  chapters = false,
  params = [],
  position,
  readouts = [],
  wide = true,
  children,
}: {
  /** The figure element's id (canvas or svg inside children). */
  id: string;
  title: string;
  status?: ReactNode;
  caption?: ReactNode;
  steps?: boolean;
  play?: boolean;
  seek?: boolean;
  chapters?: boolean;
  params?: { name: string; label: string }[];
  /** What the toolbar's left side reads: "step", "t", or a custom output name. */
  position?: string;
  readouts?: Readout[];
  wide?: boolean;
  children: ReactNode;
}) {
  const toolbar = steps || play || seek || params.length > 0 || position;
  return (
    <figure
      className={wide ? "fs-plate wide" : "fs-plate"}
      aria-labelledby={`${id}-title`}
    >
      <header className="fs-head">
        <h3 className="fs-title" id={`${id}-title`}>
          {title}
        </h3>
        {status && <span className="fs-status">{status}</span>}
      </header>
      <div className="fs-stage">{children}</div>
      {toolbar && (
        <div className="fs-toolbar">
          <span
            className="fs-position"
            data-fs-out={position ? `${id}:${position}` : undefined}
          />
          <div className="fs-controls">
            {/* Inline params only (placement: "inline"): the control IS the interaction.
                Every other param is generated into the settings popover by the runtime. */}
            {params.map((p) => (
              <div
                key={p.name}
                data-fs-param={`${id}:${p.name}`}
                data-label={p.label}
              />
            ))}
            {steps && (
              <span className="fs-dots" data-fs-dots={id} aria-hidden="true" />
            )}
            {steps && (
              <button
                type="button"
                data-fs={`${id} prev`}
                aria-label="Previous step"
              >
                Prev
              </button>
            )}
            {steps && (
              <button
                type="button"
                data-fs={`${id} next`}
                aria-label="Next step"
              >
                Next
              </button>
            )}
            {chapters && (
              <button
                type="button"
                data-fs={`${id} chapter-prev`}
                aria-label="Previous event"
              >
                ←
              </button>
            )}
            {seek && <div data-fs-seek={id} data-label="Time" />}
            {chapters && (
              <button
                type="button"
                data-fs={`${id} chapter-next`}
                aria-label="Next event"
              >
                →
              </button>
            )}
            {play && (
              // The runtime fills this with play / pause / replay icons.
              <button type="button" data-fs={`${id} play`} aria-label="Play" />
            )}
          </div>
        </div>
      )}
      {steps && (
        // The runtime stacks every caption here (tallest height wins) with a live twin for screen readers.
        <p className="fs-step-text" data-fs-out={`${id}:caption`} />
      )}
      {caption && <p className="fs-caption">{caption}</p>}
      {readouts.length > 0 && (
        <div className="fs-readouts">
          {readouts.map((r) => (
            <div key={r.id} className="fs-readout">
              <b data-fs-out={`${id}:${r.id}`} />
              <span>{r.label}</span>
            </div>
          ))}
        </div>
      )}
    </figure>
  );
}
