/** What every figure declares about itself. Konsistent checks that it exists; TypeScript checks what is in it. */
type Common = {
  /** A plain title, no codenames. */
  title: string;
  /** The one sentence the figure proves. */
  claim: string;
};

export type FigureMeta = Common &
  (
    | {
        /** Values come from recorded data: name where. */
        status: "measured";
        sources: [string, ...string[]];
      }
    | {
        /** Drawn or generated to explain; say so in the caption. */
        status: "illustration" | "simulation" | "arithmetic";
        sources?: string[];
      }
  );

/** Plain explanations for the parts a stranger might not know, keyed by the part's hit key. */
export type FigureTips = Record<string, { title: string; body: string }>;
