/** Types for assets/runtime/fs-runtime.js (copy both next to these components). */
export type FsColors = {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  lineStrong: string;
  faint: string;
  muted: string;
  fg: string;
  strong: string;
  accent: string;
  good: string;
  bad: string;
  c: string[];
  font: string;
  mono: string;
  dim: number;
  edge: number;
  series: number;
};

export type FsParam = {
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  format?: (value: number) => string;
  /** "settings" (default): lives in the figure's settings popover. "inline": the control IS the interaction. */
  placement?: "settings" | "inline";
  /** Magnet marks on the slider (default: the authored value). */
  marks?: { value: number; label?: string }[];
  markDefault?: boolean;
  options?: { value: string; label?: string }[];
  hidden?: boolean;
};

export type FsHandle = {
  label: string;
  description?: string;
  /** Hit radius in CSS px, or a function (e.g. a draggable disc). */
  radius?: number | ((f: FsFigureState) => number);
  get: (f: FsFigureState) => { x: number; y: number };
  set: (
    f: FsFigureState,
    x: number,
    y: number,
    phase: "drag" | "settle" | "key",
  ) => void;
  /** Rubber-band region; return null to constrain inside set() instead. */
  bounds?: (
    f: FsFigureState,
  ) => { x0: number; y0: number; x1: number; y1: number } | null;
  /** Where to spring to on release (default: clamp to bounds). */
  release?: (f: FsFigureState) => { x: number; y: number } | null;
  hidden?: (f: FsFigureState) => boolean;
  step?: number;
};

export type FsFigureState = {
  id: string;
  el: Element;
  plate: Element;
  stage: Element;
  ctx: CanvasRenderingContext2D | null;
  w: number;
  h: number;
  dpr: number;
  t: number;
  duration: number;
  rate: number;
  playing: boolean;
  step: number;
  from: number;
  stepT: number;
  params: Record<string, number>;
  v: Record<string, number>;
  hover: string | null;
  state: Record<string, unknown>;
  /** Time under the pointer while hovering a scrub surface (timeAxis), else null. */
  hoverT: number | null;
  /** "time" while the scrub surface is held, a handle key while one is dragged, else null. */
  drag: string | null;
  handleHover: string | null;
  C: FsColors;
  api: FsController;
};

export type FsSpec = {
  height?: (width: number) => number;
  duration?: number;
  loop?: boolean;
  autoplay?: boolean;
  keyframe?: number;
  settle?: number;
  chapters?: { t: number; label?: string }[];
  steps?: { caption: string; [key: string]: unknown }[];
  stepDuration?: number;
  params?: Record<string, FsParam>;
  handles?: Record<string, FsHandle>;
  formatTime?: (t: number) => string;
  /** Timelines: map time onto the drawing so the whole surface scrubs (hover, drag, click, flick). */
  timeAxis?: (f: FsFigureState) => {
    x0: number;
    x1: number;
    t0?: number;
    t1?: number;
    area?: { x: number; y: number; w: number; h: number };
  };
  /** Explanations for drawn parts, shown after a hover delay. */
  tips?: Record<string, { title?: string; body?: string }>;
  /** Hit test in CSS px of the figure: a tip key, a key with an anchor point, or null. */
  tipAt?: (
    f: FsFigureState,
    x: number,
    y: number,
  ) => string | { key: string; x?: number; y?: number } | null;
  /** Set false to keep f.hover unchanged while tips are hovered. */
  tipHover?: boolean;
  /** Widest texts each changing output can show, so the layout never shifts. */
  reserve?: Record<string, string[] | ((f: FsFigureState) => string[])>;
  /** Set false to remove the expand button. */
  expand?: boolean;
  init?: (f: FsFigureState) => void;
  update?: (f: FsFigureState, dt: number) => void;
  render: (f: FsFigureState, ctx: CanvasRenderingContext2D | null) => void;
  resize?: (f: FsFigureState) => void;
  onParam?: (f: FsFigureState, name: string, value: unknown) => void;
  onStep?: (f: FsFigureState, step: number) => void;
};

export type FsSnapshot = {
  t: number;
  step: number;
  params: Record<string, unknown>;
  playing: boolean;
};

export type FsController = {
  readonly id: string;
  readonly t: number;
  readonly step: number;
  readonly playing: boolean;
  readonly params: Record<string, unknown>;
  play(): void;
  pause(): void;
  toggle(): void;
  /** Jump, or glide with { animate: true, smooth } (seconds of smoothing). */
  seek(t: number, options?: { animate?: boolean; smooth?: number }): void;
  chapter(direction: 1 | -1): void;
  goto(step: number): void;
  next(): void;
  prev(): void;
  set(name: string, value: unknown, options?: { instant?: boolean }): void;
  set(values: Record<string, unknown>, options?: { instant?: boolean }): void;
  reset(): void;
  state(): FsSnapshot;
  apply(state: Partial<FsSnapshot>): void;
  on(
    event:
      | "play"
      | "pause"
      | "seek"
      | "step"
      | "param"
      | "end"
      | "hover"
      | "reset"
      | "scrub"
      | "expand"
      | "drag"
      | "dragstart"
      | "dragend",
    fn: (detail: unknown, api: FsController) => void,
  ): () => void;
  out(name: string, text: string | number): void;
  hover(key: string | null): void;
  redraw(): void;
  dispose(): void;
  openSettings(): void;
  closeSettings(): void;
  /** Open or close the plate's near full screen view. */
  expand(): void;
  collapse(): void;
};

export type FsKit = {
  text(
    f: FsFigureState,
    c: CanvasRenderingContext2D,
    s: string,
    x: number,
    y: number,
    o?: Record<string, unknown>,
  ): void;
  label(
    f: FsFigureState,
    c: CanvasRenderingContext2D,
    s: string,
    x: number,
    y: number,
    o?: Record<string, unknown>,
  ): void;
  line(
    c: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): void;
  arrow(
    c: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width?: number,
  ): void;
  rrect(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void;
  hatch(
    f: FsFigureState,
    c: CanvasRenderingContext2D,
    color: string,
    gap?: number,
  ): CanvasPattern;
  bracket(
    f: FsFigureState,
    c: CanvasRenderingContext2D,
    x0: number,
    x1: number,
    y: number,
    text?: string,
    o?: Record<string, unknown>,
  ): void;
  /** The timeline's now: a line with a knob that grows while the surface is held. */
  playhead(
    f: FsFigureState,
    c: CanvasRenderingContext2D,
    x: number,
    y0: number,
    y1: number,
  ): void;
  /** Hover preview on a scrub surface: a faint line and the time. */
  hoverTime(
    f: FsFigureState,
    c: CanvasRenderingContext2D,
    y0: number,
    y1: number,
    toX: (t: number) => number,
    format: (t: number) => string,
  ): void;
};

export type FsRuntime = {
  figure(id: string, spec: FsSpec): FsController;
  get(id: string): FsController | undefined;
  list(): string[];
  setTheme(name: string | null, scope?: HTMLElement): void;
  setMode(mode: "light" | "dark" | null, scope?: HTMLElement): void;
  wake(): void;
  k: FsKit;
  ease: {
    smooth(t: number): number;
    out(t: number): number;
    inOut(t: number): number;
  };
  window(t: number, t0: number, t1: number, fn?: (t: number) => number): number;
  damp(current: number, target: number, lambda: number, dt: number): number;
  spring(
    state: { value: number; velocity: number },
    target: number,
    smoothTime: number,
    dt: number,
  ): { value: number; velocity: number };
  clamp(x: number, a?: number, b?: number): number;
  lerp(a: number, b: number, t: number): number;
  remap(x: number, a: number, b: number, c: number, d: number): number;
  rng(seed: number): () => number;
  gauss(r: () => number): number;
  reduced(): boolean;
  /** Rubber band: distance past [min, max] is compressed toward dim. */
  rubber(x: number, min: number, max: number, dim: number, c?: number): number;
  /** Damped spring step (stiffness k, damping ratio z); returns true when settled. */
  springTo(
    state: { value: number; velocity: number },
    target: number,
    dt: number,
    k?: number,
    z?: number,
  ): boolean;
  /** Run fn(dt) each frame until it returns true; returns a cancel function. */
  animate(fn: (dt: number) => boolean): () => void;
  /** Build a physics slider into any element. */
  slider(
    root: HTMLElement,
    o: {
      label?: string;
      min: number;
      max: number;
      step?: number;
      marks?: { value: number; label?: string }[];
      get(): number;
      set(value: number, phase: string): void;
      format?: (v: number) => string;
    },
  ): { root: HTMLElement; sync(immediate?: boolean): void };
  /** Build tabs (a tablist with a sliding pill) into any element. */
  tabs(
    root: HTMLElement,
    o: {
      label?: string;
      options: { value: string; label?: string }[];
      get(): string;
      set(value: string): void;
    },
  ): { root: HTMLElement; sync(): void };
  /** Reserve an element's width for the widest of these texts. */
  reserve(el: HTMLElement, samples: string[]): void;
  /** Show a tip at a client rect, or hide it with null. */
  tip(
    content: { title?: string; body?: string } | null,
    anchor?: { left: number; top: number; width: number; bottom: number },
  ): void;
};

declare global {
  interface Window {
    FS?: FsRuntime;
  }
}
