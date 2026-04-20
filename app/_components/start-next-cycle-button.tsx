"use client";

import Link from "next/link";

type StartNextCycleButtonProps = {
  workspaceId: string;
  /** The request_type to pre-select (e.g. "catalog_project", "newsletter_request") */
  requestType: string;
  /** Suggested title for the next cycle (e.g. "Fall 2027 Catalog") */
  suggestedTitle?: string;
};

/**
 * Button that opens a pre-filled new request form for the next production cycle.
 * Placed on completed/archived project pages so the school or operator can
 * kick off the next cycle in one click.
 */
export default function StartNextCycleButton({
  workspaceId,
  requestType,
  suggestedTitle,
}: StartNextCycleButtonProps) {
  const params = new URLSearchParams({ workspace: workspaceId, type: requestType });
  if (suggestedTitle) params.set("suggest_title", suggestedTitle);
  const href = `/requests/new?${params.toString()}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--primary)] px-4 py-2 text-[13px] font-semibold text-[var(--primary)] hover:bg-[var(--accent-soft)] transition"
    >
      ↻ Start next cycle
    </Link>
  );
}
