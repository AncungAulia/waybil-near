import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * tailwind-merge only knows Tailwind's own scales. Without this it reads `text-caption` and
 * `text-ds-muted` as two font sizes and throws the first one away, so the text silently
 * falls back to 16px. Every scale we add in globals.css has to be listed here too.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "amount", "title", "heading", "body", "label", "caption"],
      radius: ["small", "row", "card"],
      ease: ["base", "drawer"],
    },
  },
});

/** Joins class names and lets a later Tailwind class win over an earlier one. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
