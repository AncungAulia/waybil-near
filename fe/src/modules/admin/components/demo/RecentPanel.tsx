import { Panel } from "@/components/layout/Panel";
import { CONTRACT_RECORD_URL } from "@/lib/env";
import type { AdminState } from "../../data/fixtures";

const ACCOUNT = CONTRACT_RECORD_URL;

/** M1. Changes the team approved lately. */
export function RecentPanel({ state }: { state: AdminState }) {
  return (
    <Panel title="Recently approved" className="approval-recent">
      {/* Sample approvals have no transaction, so the panel says where the links go. */}
      <p className="text-caption text-ds-muted">
        These are sample approvals. Each link opens the demo account, not a real transaction.
      </p>
      <div>
        {[
          ...(state === "M1.3"
            ? [
                "Northwind’s limit 3,000.00 → 5,000.00 USDC",
                "Meridian Shipping’s limit 0 → 2,000.00 USDC",
              ]
            : []),
          "Northwind’s limit 0 → 2,500.00 USDC",
          "Advance rate cap set to 97.5%",
        ].map((t, i, rows) => (
          <div
            key={t}
            className="approval-recent-row flex items-center justify-between gap-12 py-12"
          >
            <div className="min-w-0">
              <p className="text-label font-medium">{t}</p>
              <p className="text-caption text-ds-muted">
                {i === rows.length - 1 ? "3 of 3 approved" : "2 of 3 approved"}{" "}
                {i === rows.length - 1
                  ? "on Oct 28."
                  : i === rows.length - 2
                    ? "on Oct 21."
                    : "today."}
              </p>
              <a
                href={ACCOUNT}
                target="_blank"
                rel="noreferrer"
                aria-label={`See the sample record on NearBlocks for ${t}`}
                className="link focus-ring mt-2 inline-block text-caption"
              >
                See the record on NearBlocks ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
