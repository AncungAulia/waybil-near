import type { CSSProperties } from "react";

/** Sets the stagger index read by the `.enter` and `.reveal` classes. */
export const stagger = (i: number) => ({ "--i": i }) as CSSProperties;
