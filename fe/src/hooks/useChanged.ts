"use client";

import { useState } from "react";

/**
 * True once `value` has changed after the first render, and from then on.
 *
 * A swap or status crossfade must not run on first load (fe/AGENTS.md "Motion"), only when
 * the value really changes. Pair it with a `key` on the value so the animation replays on
 * every later change. This uses React's "store information from previous renders" pattern,
 * so no ref is read during render.
 */
export function useChanged(value: unknown): boolean {
  const [previous, setPrevious] = useState(value);
  const [changed, setChanged] = useState(false);
  if (!Object.is(previous, value)) {
    setPrevious(value);
    if (!changed) setChanged(true);
  }
  return changed;
}
