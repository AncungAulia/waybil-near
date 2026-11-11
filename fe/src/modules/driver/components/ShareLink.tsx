"use client";

import { useState } from "react";
import { Copy, Link as LinkIcon, PaperPlaneTilt } from "@phosphor-icons/react";
import { ButtonLink } from "@/components/ui/Button";
import { useOrigin } from "@/hooks/useOrigin";
import { cn } from "@/lib/cn";

export function ShareLink({ row = false }: { row?: boolean }) {
  const url = `${useOrigin()}/c/sam`;
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    /* The companies screen sets the link and the button side by side, the empty state stacks them. */
    <div className={cn("flex flex-col gap-12", row && "md:flex-row md:items-center")}>
      <div
        className={cn(
          "flex items-center gap-10 rounded-full bg-ds-canvas py-6 pr-6 pl-16",
          row && "md:flex-1",
        )}
      >
        <LinkIcon size={16} className="shrink-0 text-ds-muted" />
        <span className="min-w-0 flex-1 truncate text-label">{url}</span>
        <button
          type="button"
          className="press focus-ring relative grid size-34 shrink-0 place-items-center rounded-full bg-ds-bg before:absolute before:-inset-4"
          aria-label="Copy your link"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setFailed(false);
            } catch {
              setFailed(true);
            }
          }}
        >
          <Copy size={15} />
        </button>
      </div>
      {copied && (
        <p role="status" className="text-caption text-ds-success">
          Your link is copied.
        </p>
      )}
      {failed && (
        <p role="status" className="text-caption text-ds-muted">
          Select the link above to copy it.
        </p>
      )}
      <ButtonLink
        className="justify-between"
        icon={<PaperPlaneTilt size={17} />}
        href={`https://wa.me/?text=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Share my link on WhatsApp
      </ButtonLink>
    </div>
  );
}
