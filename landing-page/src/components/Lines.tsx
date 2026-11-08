import type { CSSProperties } from "react";

/**
 * A headline split into lines that rise from under their own mask, one after another.
 * `load` plays on page load with `delay` ms; otherwise each line plays when it scrolls into
 * view inside a <Reveal>, starting at stagger index `from`. Screen readers get one sentence.
 */
export function Lines({
  lines,
  load = false,
  delay = 0,
  from = 0,
}: {
  lines: string[];
  load?: boolean;
  delay?: number;
  from?: number;
}) {
  return (
    <>
      <span className="sr-only">{lines.join(" ")}</span>
      {lines.map((text, i) => (
        <span key={text} className="line" aria-hidden>
          <span
            className={load ? "rise-load" : "rise-in"}
            style={
              load
                ? ({ "--d": delay + i * 110 } as CSSProperties)
                : ({ "--i": from + i } as CSSProperties)
            }
          >
            {text}
          </span>
        </span>
      ))}
    </>
  );
}
