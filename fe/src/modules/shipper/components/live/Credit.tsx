"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatUsdc, type CreditReviewInfo, type CreditReviewResponse } from "@waybil/shared";
import { useInvalidate } from "@/hooks/useInvalidate";
import { qk } from "@/lib/queryKeys";
import { CalendarCheck, FileText, ShieldCheck, UsersThree } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { ProofLink } from "@/components/elements/ProofLink";
import { Skeleton, SkeletonGroup } from "@/components/elements/Skeleton";
import { api } from "@/lib/api";
import type { LiveShipperData } from "../../data/live";
import { Alert, failure, Meter } from "./shared";

const POLL_MS = 3000;
const STUCK_MS = 10 * 60 * 1000;

/* How a limit grows, shown under the meter so the card reads as a guide, not a number. */
const GROWS = [
  { icon: <CalendarCheck size={18} />, text: "Pay each bill by its due date." },
  { icon: <FileText size={18} />, text: "Ask the credit assistant to check fresh papers." },
  { icon: <UsersThree size={18} />, text: "Big changes need two team members to approve." },
];

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
  /* A check still queued after 10 minutes is waiting for the assistant, not running. */
  const stuck =
    !asking &&
    review?.state === "queued" &&
    Date.now() - new Date(review.createdAt).getTime() > STUCK_MS;
  return (
    <>
      <header>
        <h1 className="text-title">Credit</h1>
        <p className="mt-6 text-label text-ds-muted">Your limit grows as you pay bills on time.</p>
      </header>
      {/* Both cards fill the window and end level. */}
      <div className="grid gap-16 lg:min-h-[calc(100dvh-260px)] lg:grid-cols-2">
        <Panel title="Your limit" className="h-full">
          <Money amount={shipper.limit} className="text-amount" />
          <Meter data={data} />
          <p className="text-label text-ds-muted">
            {shipper.late_bills
              ? `${shipper.late_bills} ${shipper.late_bills === 1 ? "bill is" : "bills are"} late.`
              : "No bill is late."}
          </p>
          <div className="mt-auto flex flex-col gap-10 pt-8">
            <p className="text-label font-medium">How your limit grows</p>
            {GROWS.map((g) => (
              <div key={g.text} className="flex items-center gap-12 rounded-row bg-ds-canvas p-12">
                <span className="grid size-36 shrink-0 place-items-center rounded-full bg-ds-bg">
                  {g.icon}
                </span>
                <p className="text-label">{g.text}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Credit assistant"
          className="h-full"
          action={
            <span className="inline-flex items-center gap-6 rounded-full bg-ds-success-soft px-10 py-5 text-[12px] leading-15 font-semibold text-ds-success">
              <ShieldCheck size={14} />
              Private check
            </span>
          }
        >
          <p className="text-label text-ds-muted">
            It reads your papers in a private check and suggests a new limit. Small raises apply at
            once. Bigger ones go to the team.
          </p>
          {/* The latest check, in its own box, so its state is easy to spot. */}
          <div className="flex flex-col gap-8 rounded-row bg-ds-canvas p-16">
            {review === undefined ? (
              <SkeletonGroup
                label="Loading your last credit check."
                className="flex flex-col gap-12 py-4"
              >
                <Skeleton className="w-4/5" />
                <Skeleton className="h-10 w-3/5" />
              </SkeletonGroup>
            ) : stuck ? (
              <>
                <p className="text-label font-medium">Your review is waiting in line.</p>
                <p className="text-caption text-ds-muted">
                  The credit assistant has not started it yet. Your limit stays the same until it
                  does.
                </p>
              </>
            ) : running ? (
              <p className="flex items-center gap-10 text-label">
                <span className="size-8 shrink-0 animate-pulse rounded-full bg-ds-brand" />
                The credit assistant is checking your record privately. This takes a minute.
              </p>
            ) : review ? (
              <>
                <p className="text-label font-medium">
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
          </div>
          {error && <Alert>{error}</Alert>}
          <Button
            className="mt-auto w-full md:w-fit md:self-end"
            disabled={!!running}
            loading={asking}
            loadingLabel="Checking"
            onClick={ask}
          >
            Ask for a review
          </Button>
        </Panel>
      </div>
    </>
  );
}
