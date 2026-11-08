"use client";
import { Check, Plus } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { Stat } from "@/components/elements/Stat";
import { FanMeter } from "@/components/elements/FanMeter";
import { DemoMap } from "@/components/elements/DemoMap";
import { ShipmentList } from "./ShipmentList";
import { SHIPMENTS, type ShipperState } from "../data/fixtures";

export function ShipperHome({
  state,
  go,
  open,
  usedBefore = 2400000000n,
}: {
  state: ShipperState;
  go: (s: ShipperState) => void;
  open: (id: number, pay?: boolean) => void;
  usedBefore?: bigint;
}) {
  const first = state === "P1.2",
    late = state === "P1.4",
    near = state === "P1.3";
  const used = first ? 0n : near ? 2790000000n : usedBefore;
  const left = (3000000000n - used).toString();
  const bill = (
    <Panel className="bill-card bg-ds-ink text-ds-bg">
      <p className="text-label text-ds-brand">{late ? "3 days late" : "Due in 2 days"}</p>
      <p className="text-label text-ds-on-night">
        Bill for #{late ? 1036 : 1039} · Eastport to {late ? "Riverton" : "Millbrook"}
      </p>
      <Money amount={late ? "300000000" : "120000000"} className="text-amount" />
      <Button
        variant="moment"
        className="w-full justify-between"
        onClick={() => open(late ? 1036 : 1039, true)}
      >
        {late ? "Pay now" : "Pay early"}
      </Button>
    </Panel>
  );
  return (
    <div className="flex flex-col gap-24">
      <div className="flex flex-wrap items-end justify-between gap-16">
        <div>
          <h1 className="text-title md:text-amount">
            {first ? "Welcome" : "Good morning"}, Northwind
          </h1>
          <p className="mt-6 text-label text-ds-muted">Thursday, Nov 12</p>
        </div>
        <div className="flex w-full gap-12 md:w-auto">
          <Button variant="secondary" className="hidden md:inline-flex" onClick={() => go("P5.3")}>
            Invite driver
          </Button>
          <Button
            className="w-full justify-between md:w-auto"
            disabled={late}
            onClick={() => go("P2.1")}
          >
            New shipment
          </Button>
        </div>
      </div>
      {late && (
        <p className="rounded-row bg-ds-danger-soft p-16 text-label text-ds-danger">
          Bill for #1036 is 3 days late. New shipments are paused until it is paid.{" "}
          <button className="focus-ring underline" onClick={() => open(1036)}>
            Pay now
          </button>
        </p>
      )}
      <div className="hidden gap-16 md:grid md:grid-cols-3">
        <Stat
          className="w-full"
          label="Your open bills"
          value={<Money amount={used.toString()} />}
          context={first ? "Nothing yet" : "4 trips paid early"}
        />
        <Stat
          className="w-full"
          label="Due this week"
          value={<Money amount={first ? "0" : late ? "300000000" : "120000000"} />}
          context={first ? "No bills" : "1 bill"}
        />
        <Stat
          className="w-full"
          label="Paid on time"
          value={first ? "New" : late ? "90%" : "100%"}
          context={first ? "Builds as you pay" : "9 of 9 bills"}
        />
      </div>
      {!first && <div className="md:hidden">{bill}</div>}
      {first && (
        <Panel
          title="Get set up"
          action={<span className="text-caption text-ds-muted">1 of 3 done</span>}
        >
          {[
            ["Invite a driver", "Sam joined", "P5.3"],
            ["Add a destination", "Where your goods go", "P5.4"],
            ["Create your first shipment", "Approve a trip before the truck leaves", "P2.1"],
          ].map(([title, note, next], i) => (
            <button
              key={title}
              className="press focus-ring flex items-center gap-16 rounded-small p-12 text-left"
              onClick={() => go(next as ShipperState)}
            >
              <span className="grid size-32 shrink-0 place-items-center rounded-full bg-ds-canvas">
                {i === 0 ? <Check size={18} /> : <Plus size={18} />}
              </span>
              <span>
                <span className="block text-body">{title}</span>
                <span className="block text-caption text-ds-muted">{note}</span>
              </span>
            </button>
          ))}
        </Panel>
      )}
      <div className="grid items-stretch gap-16 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel
          title="On the road"
          action={
            <button
              className="focus-ring text-caption text-ds-brand-deep"
              onClick={() => open(1041)}
            >
              Open map
            </button>
          }
          className="p-18"
        >
          <DemoMap
            controls
            empty={first}
            label={first ? "No trucks on the road yet" : "2 trucks moving"}
            twoTrucks={!first}
            className="h-340 md:h-500 lg:h-full lg:min-h-600"
          />
        </Panel>
        <div className="flex flex-col gap-16">
          <Panel
            title="Credit limit"
            action={
              <span className="text-caption text-ds-muted">
                {Math.round(Number(used) / 30000000)}% used
              </span>
            }
          >
            <Money amount={left} className="text-amount" />
            <p className="text-caption text-ds-muted">
              You have this much left from your 3,000.00 USDC limit.
            </p>
            <FanMeter
              className="w-full"
              value={Number(used) / 3000000000}
              label="Credit limit used"
            />
            <div className="flex justify-between text-caption text-ds-muted">
              <span>0</span>
              <span>1,000</span>
              <span>2,000</span>
              <span>3,000</span>
            </div>
            <div className="border-t border-ds-line pt-16">
              <h3 className="mb-12 text-label">What is using it</h3>
              {first ? (
                <p className="text-caption text-ds-muted">
                  Each shipment you approve uses part of your limit until you pay its bill.
                </p>
              ) : (
                [1039, 1041, 1043]
                  .map((id) => SHIPMENTS.find((r) => r.shipment.id === id)!)
                  .map((r) => (
                    <button
                      key={r.shipment.id}
                      className="focus-ring mb-12 flex w-full items-center justify-between gap-12 text-left text-caption"
                      onClick={() => open(r.shipment.id)}
                    >
                      <span>
                        #{r.shipment.id} Eastport to {r.city}
                        <span className="block text-ds-muted">{r.due}</span>
                      </span>
                      <Money amount={r.shipment.bill} />
                    </button>
                  ))
              )}
            </div>
            <button className="focus-ring self-start text-label" onClick={() => go("P7.1")}>
              View credit details ↗
            </button>
          </Panel>
          {!first && <div className="hidden md:block">{bill}</div>}
        </div>
      </div>
      {!first && (
        <Panel title="Shipments">
          <ShipmentList
            rows={[1041, 1043, 1039].map((id) => SHIPMENTS.find((r) => r.shipment.id === id)!)}
            onOpen={open}
          />
        </Panel>
      )}
    </div>
  );
}
