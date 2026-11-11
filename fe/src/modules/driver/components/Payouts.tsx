import { ArrowDown } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Money } from "@/components/elements/Money";
import { Stat } from "@/components/elements/Stat";
import { WALLET_BEFORE, type DriverState } from "../data/fixtures";
import { PayoutRows } from "./PayoutRows";

/** K3.1 and K3.2, the payouts screen. */
export function Payouts({
  state,
  latest,
  latestPaid,
  monthTotal,
  paid1041,
}: {
  state: DriverState;
  latest: string;
  latestPaid: bigint;
  monthTotal: string;
  paid1041: boolean;
}) {
  return (
    <div className="flex flex-col gap-16">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
        <Stat
          className="w-full"
          tone="dark"
          label="This month"
          value={<Money amount={state === "K3.2" ? "0" : monthTotal} />}
          context={
            state === "K3.2"
              ? "Your first payout shows up here."
              : `${paid1041 ? 4 : 3} trips, each paid seconds after arrival.`
          }
        />
        <Stat
          className="w-full"
          label="In your wallet"
          value={
            <Money amount={state === "K3.2" ? "0" : (WALLET_BEFORE + latestPaid).toString()} />
          }
          context="The account you signed up with"
        />
      </div>
      <Panel>
        {state === "K3.2" ? (
          <div className="flex min-h-360 flex-col items-center justify-center gap-12 text-center">
            <ArrowDown size={56} />
            <h2 className="text-heading">No payouts yet</h2>
            <p className="text-body text-ds-muted">
              Finish a trip and you will be paid the moment the warehouse confirms.
            </p>
          </div>
        ) : (
          <PayoutRows latest={latest} paid1041={paid1041} />
        )}
      </Panel>
    </div>
  );
}
