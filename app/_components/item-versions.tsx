"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { uploadVersionAction, submitApprovalAction } from "@/app/items/actions";
import type { ApprovalDecision } from "@/lib/create-status";

type Version = {
  id: string;
  versionLabel: string;
  signedUrl: string | null;
  filename: string | null;
  notes: string | null;
  createdAt: string;
};

type Approval = {
  id: string;
  versionId: string | null;
  decision: ApprovalDecision;
  note: string | null;
  decidedBy: string;
  decidedAt: string;
};

type Props = {
  workspaceId: string;
  itemId: string;
  projectId: string;
  versions: Version[];
  approvals: Approval[];
  latestVersionId: string | null;
  canUpload: boolean;
};

const DECISION_LABELS: Record<ApprovalDecision, string> = {
  approved: "Approved",
  approved_with_changes: "Approved with changes",
  changes_requested: "Changes requested",
};

const DECISION_COLORS: Record<ApprovalDecision, string> = {
  approved: "text-emerald-700 bg-emerald-50",
  approved_with_changes: "text-amber-700 bg-amber-50",
  changes_requested: "text-red-700 bg-red-50",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export default function ItemVersions({
  workspaceId,
  itemId,
  projectId,
  versions,
  approvals,
  latestVersionId,
  canUpload,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState<ApprovalDecision | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleUpload(formData: FormData) {
    setUploadError(null);
    setUploading(true);
    const result = await uploadVersionAction(workspaceId, itemId, projectId, formData);
    setUploading(false);
    if (result.error) {
      setUploadError(result.error);
    } else {
      setShowUploadForm(false);
      formRef.current?.reset();
      startTransition(() => router.refresh());
    }
  }

  async function handleApproval(decision: ApprovalDecision) {
    setSubmittingDecision(decision);
    await submitApprovalAction(
      workspaceId,
      itemId,
      latestVersionId,
      decision,
      approvalNote.trim() || null
    );
    setApprovalNote("");
    setSubmittingDecision(null);
    startTransition(() => router.refresh());
  }

  const approvalsByVersion = approvals.reduce<Record<string, Approval[]>>((acc, a) => {
    const key = a.versionId ?? "__none__";
    (acc[key] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">

      {/* Version list */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Versions
          </p>
          {canUpload && (
            <button
              type="button"
              onClick={() => setShowUploadForm((v) => !v)}
              className="rounded-lg px-2.5 py-1 text-[12px] font-medium text-[var(--primary)] hover:bg-[var(--border)] transition"
            >
              {showUploadForm ? "Cancel" : "+ Upload version"}
            </button>
          )}
        </div>

        {canUpload && showUploadForm && (
          <form ref={formRef} action={handleUpload} className="mt-3 space-y-3 rounded-xl border border-[var(--border)] p-4">
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">
                Version label <span className="text-red-500">*</span>
              </label>
              <input
                name="version_label"
                type="text"
                placeholder="e.g. v1, Draft 2, Final"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">
                File <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                name="file"
                type="file"
                className="w-full text-[13px] text-[var(--foreground)]"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={2}
                placeholder="What changed in this version?"
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            {uploadError && (
              <p className="text-[12px] text-red-600">{uploadError}</p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploading || isPending}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </form>
        )}

        {versions.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--text-muted)]">No versions uploaded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {versions.map((v) => {
              const vApprovals = approvalsByVersion[v.id] ?? [];
              return (
                <li key={v.id} className="rounded-xl border border-[var(--border)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--foreground)]">
                          {v.versionLabel}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {formatDate(v.createdAt)}
                        </span>
                      </div>
                      {v.notes && (
                        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{v.notes}</p>
                      )}
                    </div>
                    {v.signedUrl && v.filename && (
                      <a
                        href={v.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--border)] transition"
                      >
                        Download
                      </a>
                    )}
                  </div>
                  {vApprovals.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-[var(--border)] pt-3">
                      {vApprovals.map((a) => (
                        <li key={a.id} className="flex items-start gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DECISION_COLORS[a.decision]}`}>
                            {DECISION_LABELS[a.decision]}
                          </span>
                          {a.note && (
                            <span className="text-[12px] text-[var(--foreground)]">{a.note}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Approval action */}
      {versions.length > 0 && (
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Submit review
          </p>
          <div className="mt-3 space-y-3">
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              rows={2}
              placeholder="Optional note…"
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <div className="flex flex-wrap gap-2">
              {(["approved", "approved_with_changes", "changes_requested"] as ApprovalDecision[]).map(
                (decision) => (
                  <button
                    key={decision}
                    type="button"
                    onClick={() => handleApproval(decision)}
                    disabled={submittingDecision !== null || isPending}
                    className={`rounded-xl px-4 py-2 text-[13px] font-medium transition disabled:opacity-50 ${
                      decision === "approved"
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : decision === "approved_with_changes"
                          ? "bg-amber-500 text-white hover:bg-amber-600"
                          : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    {submittingDecision === decision ? "Submitting…" : DECISION_LABELS[decision]}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
