"use client";
import { useEffect, useRef, useState } from "react";
import { formatUsdc, type CreditReviewInfo, type CreditReviewResponse } from "@waybil/shared";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { ProofLink } from "@/components/elements/ProofLink";
import { Skeleton, SkeletonGroup } from "@/components/elements/Skeleton";
import { api } from "@/lib/api";
import type { LiveShipperData } from "../../data/live";
import { Alert, failure, Meter } from "./shared";

/* P7. */
export function Credit({ data, refresh }: { data: LiveShipperData; refresh: () => void }) {
  const shipper = data.shipper!;
  const [review, setReview] = useState<CreditReviewInfo | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const timer = useRef<number | null>(null);

  async function read() {
    const result = await api<CreditReviewResponse | null>("/credit/reviews/me");
    setReview(result?.review ?? null);
    return result?.review ?? null;
  }
  useEffect(() => {
    read().catch(() => setReview(null));
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);
  async function ask() {
    setAsking(true);
    setError(null);
    try {
      await api("/credit/review", { body: {} });
      /* The private check runs on the server. Read it again until it is complete. */
      const poll = async (tries: number) => {
        const latest = await read().catch(() => null);
        if (latest?.state === "complete" || tries <= 0) {
          setAsking(false);
          refresh();
          return;
        }
        timer.current = window.setTimeout(() => void poll(tries - 1), 3000);
      };
      await poll(60);
    } catch (e) {
      setError(failure(e));
      setAsking(false);
    }
  }

  const running = asking || (review && review.state !== "complete");
  return (
    <>
      <header>
        <h1 className="text-title">Credit</h1>
        <p className="mt-6 text-label text-ds-muted">Your limit grows as you pay bills on time.</p>
      </header>
      <div className="grid items-start gap-16 lg:grid-cols-2">
        <Panel title="Your limit">
          <Money amount={shipper.limit} className="text-amount" />
          <Meter data={data} />
          <p className="text-label text-ds-muted">
            {shipper.late_bills
              ? `${shipper.late_bills} ${shipper.late_bills === 1 ? "bill is" : "bills are"} late.`
              : "No bill is late."}
          </p>
        </Panel>
        <Panel title="Credit assistant">
          {review === undefined ? (
            <SkeletonGroup
              label="Loading your last credit check."
              className="flex flex-col gap-12 py-4"
            >
              <Skeleton className="w-4/5" />
              <Skeleton className="h-10 w-3/5" />
              <Skeleton className="h-10 w-2/5" />
            </SkeletonGroup>
          ) : running ? (
            <p className="text-label">
              The credit assistant is checking your record privately. This takes a minute.
            </p>
          ) : review ? (
            <>
              <p className="text-label">
                {review.result === "raised"
                  ? `Your limit went up to ${review.suggestedLimit ? formatUsdc(BigInt(review.suggestedLimit)) : formatUsdc(BigInt(shipper.limit))} USDC.`
                  : review.result === "proposed"
                    ? `The assistant suggested ${review.suggestedLimit ? formatUsdc(BigInt(review.suggestedLimit)) : "a new"} USDC. The team decides next.`
                    : review.result === "no_change"
                      ? "Your limit stays the same for now."
                      : "The last check could not finish."}
              </p>
              {review.reasons.map((r) => (
                <p key={r} className="text-caption text-ds-ink-2">
                  {r}
                </p>
              ))}
              <p className="text-caption text-ds-muted">
                Checked{" "}
                {new Date(review.completedAt ?? review.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                .
              </p>
              {review.txHash && <ProofLink tx={review.txHash} />}
            </>
          ) : (
            <p className="text-label text-ds-muted">You have not asked for a review yet.</p>
          )}
          {error && <Alert>{error}</Alert>}
          <Button
            disabled={!!running}
            loading={asking}
            loadingLabel="Checking"
            onClick={() => void ask()}
          >
            Ask for a review
          </Button>
        </Panel>
      </div>
    </>
  );
}
