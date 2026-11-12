"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatUsdc, type CreditReviewInfo, type CreditReviewResponse } from "@waybil/shared";
import { useInvalidate } from "@/hooks/useInvalidate";
import { qk } from "@/lib/queryKeys";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { ProofLink } from "@/components/elements/ProofLink";
import { Skeleton, SkeletonGroup } from "@/components/elements/Skeleton";
import { api } from "@/lib/api";
import type { LiveShipperData } from "../../data/live";
import { Alert, failure, Meter } from "./shared";

const POLL_MS = 3000;

/* P7. */
export function Credit({ data }: { data: LiveShipperData }) {
  const shipper = data.shipper!;
  const account = data.account;
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  /* When the review was asked for, while its check is still running. */
  const [waitingSince, setWaitingSince] = useState<number | null>(null);

  /* The private check runs on the server. Its review is read every 3 seconds until complete. */
  const reviews = useQuery({
    queryKey: qk.creditReviews(account),
    queryFn: () =>
      api<CreditReviewResponse | null>("/credit/reviews/me").then((r) => r?.review ?? null),
    refetchInterval: waitingSince ? POLL_MS : false,
  });
  /* A failed first read shows that no review was asked for yet. */
  const review: CreditReviewInfo | null | undefined =
    reviews.data !== undefined ? reviews.data : reviews.isError ? null : undefined;
  const { dataUpdatedAt, errorUpdatedAt } = reviews;
  useEffect(() => {
    if (!waitingSince) return;
    const complete = review?.state === "complete" && dataUpdatedAt > waitingSince;
    if (!complete && Date.now() - waitingSince < POLL_MS * 60) return;
    setWaitingSince(null);
    void invalidate(qk.shipper(account));
  }, [waitingSince, review, dataUpdatedAt, errorUpdatedAt, account, invalidate]);

  const request = useMutation({
    mutationFn: () => api("/credit/review", { body: {} }),
    onSuccess: () => {
      setWaitingSince(Date.now());
      void invalidate(qk.creditReviews(account));
    },
    onError: (e) => setError(failure(e)),
  });
  const asking = request.isPending || waitingSince !== null;
  function ask() {
    setError(null);
    request.mutate();
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
          <Button disabled={!!running} loading={asking} loadingLabel="Checking" onClick={ask}>
            Ask for a review
          </Button>
        </Panel>
      </div>
    </>
  );
}
