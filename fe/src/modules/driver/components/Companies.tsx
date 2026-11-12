import { X } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/elements/Avatar";
import { cn } from "@/lib/cn";
import { CONNECTED_COMPANIES, type DriverState } from "../data/fixtures";
import { ShareLink } from "./ShareLink";

/** K3.3 and K3.4, the companies screen with Atlas Cargo's invite. */
export function Companies({
  state,
  accepted,
  onAccept,
  go,
}: {
  state: DriverState;
  accepted: boolean;
  onAccept: () => void;
  go: (s: DriverState) => void;
}) {
  return (
    <div className="flex flex-col gap-16">
      <>
        {state === "K3.4" && !accepted && (
          <Panel className="bg-ds-brand-soft">
            <div className="flex items-center gap-12">
              <Avatar name="Atlas Cargo" />
              <span className="min-w-0">
                <span className="block text-body">Atlas Cargo wants to work with you</span>
                <span className="block text-caption text-ds-muted">
                  A verified company that always pays on time.
                </span>
              </span>
            </div>
            <div className="flex flex-wrap gap-10">
              <Button onClick={onAccept}>Accept</Button>
              <Button variant="secondary" icon={<X size={17} />} onClick={() => go("K3.3")}>
                Not now
              </Button>
            </div>
          </Panel>
        )}
        <Panel title="Connected">
          {[...CONNECTED_COMPANIES, ...(accepted ? ["Atlas Cargo"] : [])].map((name, i) => (
            <div
              key={name}
              className="flex items-center gap-12 border-b border-ds-line py-16 last:border-0"
            >
              <Avatar name={name} />
              <div className="flex-1">
                <h3 className="text-body">{name}</h3>
                <p className="text-caption text-ds-muted">
                  {i === 0 ? "Eastport. 3 trips with you." : "Millbrook. 1 trip with you."}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-6 rounded-full bg-ds-canvas py-6 pr-14 pl-11 text-caption">
                <span
                  className={cn(
                    "size-7 rounded-full",
                    i === 0 ? "bg-ds-info" : "bg-ds-line-strong",
                  )}
                />
                {i === 0 ? "1 trip now" : "No trips now"}
              </span>
            </div>
          ))}
        </Panel>
      </>
      <Panel title="Work with a new company" gap={12}>
        <p className="text-label text-ds-muted">
          Send them your link. When they connect, their trips show up here.
        </p>
        <ShareLink row />
      </Panel>
    </div>
  );
}
