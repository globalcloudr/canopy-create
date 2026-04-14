"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitApprovalAction } from "@/app/items/actions";
import type { ApprovalDecision } from "@/lib/create-status";

type Version = {
  id: string;
  versionLabel: string;
  signedUrl: string | null;
  filename: string | null;
  notes: string | null;
  createdAt: string;
};

type ExistingApproval = {
  decision: ApprovalDecision;
  note: string | null;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export default function ClientProofReview({
  workspaceId,
  itemId,
  projectId,
  latestVersion,
  existingApproval,
  isDelivered,
}: {
  workspaceId: string;
  itemId: string;
  projectId: string;
  latestVersion: Version | null;
  existingApproval: ExistingApproval | null;
  isDelivered: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState<ApprovalDecision | null>(null);
  const [done, setDone] = useState(false);

  if (!latestVersion) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-8 text-center">
        <p className="text-[14px] text-[var(--text-muted)]">
          No proof uploaded yet. We'll notify you when it's ready.
        </p>
      </div>
    );
  }

  async function handleDecision(decision: ApprovalDecision) {
    setSubmitting(decision);
    await submitApprovalAction(
      workspaceId,
      itemId,
      projectId,
      latestVersion!.id,
      decision,
      note.trim() || null
    );
    setDone(true);
    setSubmitting(null);
    startTransition(() => router.refresh());
  }

  // Already decided
  if (isDelivered) {
    return (
      <div className="space-y-4">
        {latestVersion.signedUrl && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <div>
              <p className="text-[14px] font-medium text-[var(--foreground)]">
                {latestVersion.versionLabel}
              </p>
              <p className="text-[12px] text-[var(--text-muted)]">{formatDate(latestVersion.createdAt)}</p>
            </div>
            <a
              href={latestVersion.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-xl border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--border)] transition"
            >
              Download
            </a>
          </div>
        )}
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4">
          <p className="text-[14px] font-semibold text-emerald-700">Delivered</p>
          <p className="mt-0.5 text-[13px] text-emerald-600">This file has been delivered. Download it above.</p>
        </div>
      </div>
    );
  }

  if (existingApproval && !done) {
    const isApproved = existingApproval.decision === "approved" || existingApproval.decision === "approved_with_changes";
    return (
      <div className="space-y-4">
        {latestVersion.signedUrl && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <div>
              <p className="text-[14px] font-medium text-[var(--foreground)]">
                {latestVersion.versionLabel}
              </p>
              <p className="text-[12px] text-[var(--text-muted)]">Uploaded {formatDate(latestVersion.createdAt)}</p>
            </div>
            <a
              href={latestVersion.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-xl border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--border)] transition"
            >
              View proof
            </a>
          </div>
        )}
        <div className={`rounded-2xl border px-5 py-4 ${isApproved ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <p className={`text-[14px] font-semibold ${isApproved ? "text-emerald-700" : "text-amber-700"}`}>
            {isApproved ? "You approved this proof" : "You requested changes"}
          </p>
          {existingApproval.note && (
            <p className={`mt-1 text-[13px] ${isApproved ? "text-emerald-600" : "text-amber-600"}`}>
              "{existingApproval.note}"
            </p>
          )}
          <p className={`mt-2 text-[12px] ${isApproved ? "text-emerald-500" : "text-amber-500"}`}>
            We've received your feedback.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5">
        <p className="text-[14px] font-semibold text-emerald-700">Feedback received</p>
        <p className="mt-0.5 text-[13px] text-emerald-600">Thanks — we'll take it from here.</p>
      </div>
    );
  }

  // Ready to review
  return (
    <div className="space-y-4">
      {/* Proof download */}
      {latestVersion.signedUrl && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <div>
            <p className="text-[14px] font-medium text-[var(--foreground)]">
              {latestVersion.versionLabel}
            </p>
            <p className="text-[12px] text-[var(--text-muted)]">Uploaded {formatDate(latestVersion.createdAt)}</p>
          </div>
          <a
            href={latestVersion.signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-xl bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 transition"
          >
            Open proof
          </a>
        </div>
      )}

      {/* Feedback note */}
      <div>
        <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1.5">
          Leave a note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="E.g. 'The colors look great, but please adjust the font on the cover.'"
          rows={3}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[14px] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
        />
      </div>

      {/* Decision buttons */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={isPending}
          onClick={() => void handleDecision("approved")}
          className="flex-1 rounded-2xl bg-emerald-600 px-5 py-3 text-[14px] font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
        >
          {submitting === "approved" ? "Submitting…" : "Approve — looks great!"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => void handleDecision("changes_requested")}
          className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-[14px] font-semibold text-[var(--foreground)] hover:bg-[var(--border)] transition disabled:opacity-50"
        >
          {submitting === "changes_requested" ? "Submitting…" : "Request changes"}
        </button>
      </div>
    </div>
  );
}
