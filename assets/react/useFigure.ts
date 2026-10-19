"use client";

import type { FsController, FsRuntime, FsSpec } from "./fs-runtime";

import { useEffect, useRef, useState } from "react";

let runtime: Promise<FsRuntime> | null = null;
/** Loads the shared runtime once, in the browser only (it reads matchMedia at load). */
export function loadFigureRuntime() {
  runtime ??= import("./fs-runtime.js").then(() => {
    if (!window.FS) throw new Error("Figure runtime failed to load");
    return window.FS;
  });
  return runtime;
}

/**
 * Mounts a runtime figure on the element with `id` and disposes it on unmount.
 * The spec is read once at mount; change state through the returned controller
 * (set, goto, seek, play), never by re-rendering React state per frame.
 */
export function useFigure(id: string, spec: FsSpec) {
  const specRef = useRef(spec);
  const [controller, setController] = useState<FsController | null>(null);
  useEffect(() => {
    let disposed = false;
    let created: FsController | null = null;
    void loadFigureRuntime().then((FS) => {
      if (disposed) return;
      created = FS.figure(id, specRef.current);
      setController(created);
    });
    return () => {
      disposed = true;
      created?.dispose();
      setController(null);
    };
  }, [id]);
  return controller;
}
