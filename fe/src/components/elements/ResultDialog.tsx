"use client";
import { SealCheck } from "@phosphor-icons/react";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { nearblocksUrl } from "@/lib/env";

/*
 * The dialog for a result that matters: money moved or a milestone reached. Routine results
 * get a toast instead (lib/notify). It shows a short title, the amount, one or two sentences,
 * the record on NearBlocks and a Close button.
 */
export function ResultDialog({
  title,
  amount,
  children,
  tx,
  onClose,
}: {
  title: string;
  /** USDC in base units, shown large under the title. */
  amount?: string;
  /** One or two plain sentences about what changed. */
  children: React.ReactNode;
  tx?: string;
  onClose: () => void;
}) {
  return (
    <ActionSheet title={title} stamp={<SealCheck size={34} />} stampTone="brand" onClose={onClose}>
      {amount && <Money amount={amount} className="text-amount" />}
      <p className="text-label text-ds-muted">{children}</p>
      {tx && (
        <ButtonLink
          href={nearblocksUrl(`/txns/${tx}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full justify-between"
        >
          See the record on NearBlocks
        </ButtonLink>
      )}
      <Button variant="quiet" className="w-full" onClick={onClose}>
        Close
      </Button>
    </ActionSheet>
  );
}
