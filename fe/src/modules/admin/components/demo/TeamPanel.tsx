import { User } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { cn } from "@/lib/cn";
import { PEOPLE, type AdminState } from "../../data/fixtures";

/** M1. The three team members and how each one voted. */
export function TeamPanel({ state }: { state: AdminState }) {
  return (
    <Panel className="approval-team">
      <div className="flex flex-col gap-4">
        <h2 className="text-[17px] leading-21 font-semibold">Team approval</h2>
        <p className="text-label text-ds-muted">
          A change goes through when 2 of the 3 team members approve it.
        </p>
      </div>
      <div>
        {PEOPLE.map((p, i) => (
          <div key={p.account} className="approval-member flex items-center gap-10 py-12">
            <span
              className={cn(
                "grid size-36 shrink-0 place-content-center rounded-full border-2 bg-ds-canvas text-ds-ink-2",
                i === 0
                  ? state === "M1.2"
                    ? "border-ds-success"
                    : "border-ds-brand"
                  : i === 1 && state !== "M1.3"
                    ? "border-ds-success"
                    : "border-ds-line",
              )}
              aria-hidden
            >
              <User size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label font-medium">{p.name}</p>
              <p className="break-all text-caption text-ds-muted">{p.account}</p>
            </div>
            <span
              className={cn(
                "text-caption",
                (i === 1 && state !== "M1.3") || (i === 0 && state === "M1.2")
                  ? "text-ds-success"
                  : (i === 0 && ["M1.5", "M1.6"].includes(state)) || (i === 2 && state === "M1.6")
                    ? "text-ds-danger"
                    : "text-ds-muted",
              )}
            >
              {i === 0
                ? state === "M1.2"
                  ? "Approved"
                  : ["M1.5", "M1.6"].includes(state)
                    ? "Rejected"
                    : "You"
                : state === "M1.3"
                  ? "—"
                  : i === 1
                    ? "Approved"
                    : state === "M1.6"
                      ? "Rejected"
                      : state === "M1.7"
                        ? "Didn’t vote"
                        : "Waiting"}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
