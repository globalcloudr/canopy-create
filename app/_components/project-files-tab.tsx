import Link from "next/link";
import { AppSurface } from "@canopy/ui";
import type { CreateItem, CreateRequestAttachment } from "@/lib/create-types";

interface VersionWithUrl {
  id: string;
  item_id: string;
  version_label: string;
  notes: string | null;
  created_at: string;
  signedUrl: string | null;
}

interface DeliveredFile {
  item: CreateItem;
  signedUrl: string | null;
  filename: string | null;
  versionLabel?: string;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

const ITEM_STATUS_LABEL: Record<string, string> = {
  pending: "Not started",
  in_progress: "In production",
  in_review: "Ready for review",
  completed: "Complete",
};

export default function ProjectFilesTab({
  items,
  versionsByItem,
  requestAttachments,
  deliveredFiles,
  workspaceId,
  projectId,
}: {
  items: CreateItem[];
  versionsByItem: Record<string, VersionWithUrl[]>;
  requestAttachments: (CreateRequestAttachment & { signedUrl?: string | null })[];
  deliveredFiles: DeliveredFile[];
  workspaceId: string;
  projectId: string;
}) {
  const hasAttachments = requestAttachments.length > 0;
  const hasVersions = Object.values(versionsByItem).some((v) => v.length > 0);
  const hasDelivered = deliveredFiles.length > 0;

  if (!hasAttachments && !hasVersions && !hasDelivered && items.length === 0) {
    return (
      <AppSurface className="px-6 py-6 sm:px-8">
        <p className="text-[13px] text-[var(--text-muted)]">
          No files yet. Files will appear here as work progresses.
        </p>
      </AppSurface>
    );
  }

  return (
    <div className="space-y-4">
      {/* Delivered files */}
      {hasDelivered && (
        <AppSurface className="px-6 py-6 sm:px-8">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            Your files
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            Final delivered files ready to download.
          </p>
          <div className="mt-4 divide-y divide-[var(--border)]">
            {deliveredFiles.map(({ item, signedUrl, versionLabel }) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[var(--foreground)]">{item.title}</p>
                  {versionLabel && (
                    <p className="text-[12px] text-[var(--text-muted)]">{versionLabel}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                    Delivered
                  </span>
                  {signedUrl && (
                    <a
                      href={signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--border)] transition"
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AppSurface>
      )}

      {/* Proof versions by deliverable */}
      {items.length > 0 && (
        <AppSurface className="px-6 py-6 sm:px-8">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            Proofs
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            Drafts and versions uploaded for review.
          </p>
          <div className="mt-4 space-y-5">
            {items.map((item) => {
              const versions = versionsByItem[item.id] ?? [];
              const isDelivered = !!item.delivered_at;
              return (
                <div key={item.id}>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium text-[var(--foreground)]">{item.title}</p>
                    <span className={`text-[11px] font-medium ${
                      isDelivered ? "text-emerald-600"
                      : item.status === "in_review" ? "text-amber-600"
                      : item.status === "in_progress" ? "text-blue-600"
                      : "text-[var(--text-muted)]"
                    }`}>
                      {isDelivered ? "Delivered" : ITEM_STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </div>
                  {versions.length === 0 ? (
                    <p className="mt-2 text-[12px] text-[var(--text-muted)]">No versions uploaded yet.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {versions.map((v) => (
                        <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[var(--foreground)]">{v.version_label}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">{formatDate(v.created_at)}</p>
                            {v.notes && <p className="mt-1 text-[12px] text-[var(--text-muted)]">{v.notes}</p>}
                          </div>
                          {v.signedUrl && (
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
                      ))}
                    </div>
                  )}
                  {!isDelivered && item.status === "in_review" && (
                    <Link
                      href={`/items/${item.id}?workspace=${encodeURIComponent(workspaceId)}&project=${projectId}`}
                      className="mt-2 inline-block rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-100 transition"
                    >
                      Review & give feedback →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </AppSurface>
      )}

      {/* Reference files from the original request */}
      {hasAttachments && (
        <AppSurface className="px-6 py-6 sm:px-8">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            Reference files
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            Files you included with your original request.
          </p>
          <div className="mt-4 divide-y divide-[var(--border)]">
            {requestAttachments.map((att) => (
              <div key={att.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{att.filename}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{formatDate(att.created_at)}</p>
                </div>
                {att.signedUrl && (
                  <a
                    href={att.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--border)] transition"
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </AppSurface>
      )}
    </div>
  );
}
