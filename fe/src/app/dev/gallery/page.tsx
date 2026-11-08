import { SHIPPER_STATES } from "@/modules/shipper/data/fixtures";
import { notFound } from "next/navigation";
import { cn } from "@/lib/cn";
import { SECTIONS } from "./registry";
import Link from "next/link";
import { DRIVER_STATES } from "@/modules/driver/data/fixtures";
import { WAREHOUSE_STATES } from "@/modules/warehouse/data/fixtures";

/*
 * Every component state on one page, so a batch can be checked by scrolling instead of
 * clicking through the real flows to reach each state. Screenshots for a PR come from here.
 * Development only.
 */

export const metadata = { title: "Waybil · Gallery" };

export default function GalleryPage() {
  /*
   * Off unless asked for, so it never shows on the deployed app. A flag rather than a
   * NODE_ENV check, because the gallery has to be openable against a production build:
   * that is the only output whose CSS is certain to be current.
   */
  if (process.env.NEXT_PUBLIC_GALLERY !== "on") notFound();

  const total = SECTIONS.reduce(
    (sum, s) => sum + s.entries.reduce((n, e) => n + e.states.length, 0),
    0,
  );

  return (
    <main className="mx-auto max-w-1200 overflow-x-hidden px-24 py-48">
      <h1 className="text-title">Gallery</h1>
      <p className="mt-8 text-body text-ds-muted">
        {total} states from the design board. Hover, focus and press are checked on the real
        component with a mouse and the Tab key.
      </p>

      <section className="mt-32 rounded-card bg-ds-bg p-24">
        <h2 className="text-heading">Role screens</h2>
        <p className="mt-8 text-label text-ds-muted">
          Each screen opens at the full browser width. Review every state at 1440, 834 and 390
          pixels.
        </p>
        <div className="mt-16 grid gap-24 md:grid-cols-2">
          {[DRIVER_STATES, WAREHOUSE_STATES, SHIPPER_STATES].map((states, index) => (
            <div key={index} className="flex flex-col gap-10">
              {Object.entries(states).map(([code, title]) => (
                <Link
                  key={code}
                  href={`/dev/gallery/screens/${code}`}
                  className="focus-ring text-label text-ds-brand-deep"
                >
                  {code} · {title} ↗
                </Link>
              ))}
            </div>
          ))}
        </div>
      </section>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-48">
          <h2 className="text-heading">{section.title}</h2>

          <div className="mt-16 flex flex-col gap-16">
            {section.entries.map((entry) => (
              <article key={entry.name} className="rounded-card bg-ds-bg p-24">
                <h3 className="text-label text-ds-ink">{entry.name}</h3>
                {entry.note && (
                  <p className="mt-4 max-w-640 text-caption text-ds-muted">{entry.note}</p>
                )}

                <div className="mt-20 flex flex-wrap items-start gap-x-32 gap-y-24">
                  {entry.states.map((state) => (
                    <div
                      key={state.label}
                      /* Most components carry their own width. Only the ones that stretch
                         need the cell to set one. */
                      className={cn(
                        "flex flex-col items-start gap-10",
                        entry.cell === "wide" && "w-320 shrink-0",
                        entry.cell === "full" && "w-full",
                      )}
                    >
                      {state.node}
                      <span className="text-caption text-ds-muted">{state.label}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
