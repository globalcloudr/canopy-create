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
  // Build a flat list of all version files, newest first
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const allVersions = Object.values(versionsByItem)
    .flat()
    .filter((v) => v.signedUrl)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Track which items have a delivered final file so we can badge the latest
  const deliveredItemIds = new Set(deliveredFiles.filter((d) => d.signedUrl).map((d) => d.item.id));

  // Find the latest version per item (for "Latest" badge)
  const latestVersionByItem = new Map<string, string>();
  for (const v of allVersions) {
    if (!latestVersionByItem.has(v.item_id)) {
      latestVersionByItem.set(v.item_id, v.id);
    }
  }

  const hasFiles = allVersions.length > 0 || deliveredFiles.some((d) => d.signedUrl);
  const hasAttachments = requestAttachments.length > 0;

  if (!hasFiles && !hasAttachments) {
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
      {/* All files — flat list, newest first */}
      <AppSurface className="px-6 py-6 sm:px-8">
        <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
          Files
        </p>

        {!hasFiles ? (
          <p className="mt-3 text-[13px] text-[var(--text-muted)]">
            No files uploaded yet. They'll appear here as work progresses.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-[var(--border)]">
            {allVersions.map((v) => {
              const item = itemMap.get(v.item_id);
              const isLatest = latestVersionByItem.get(v.item_id) === v.id;
              const isDelivered = deliveredItemIds.has(v.item_id) && isLatest;

              return (
                <div key={v.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-[var(--foreground)] truncate">
                        {item?.title ?? "File"}
                      </p>
                      {isDelivered ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Final
                        </span>
                      ) : isLatest ? (
                        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          Latest
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                      {v.version_label} · {formatDate(v.created_at)}
                    </p>
                    {v.notes && (
                      <p className="mt-0.5 text-[12px] text-[var(--text-muted)] italic">{v.notes}</p>
                    )}
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
              );
            })}
          </div>
        )}
      </AppSurface>

      {/* Reference files from the original request */}
      {hasAttachments && (
        <AppSurface className="px-6 py-6 sm:px-8">
          <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Reference files
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            Files from your original request.
          </p>
          <div className="mt-3 divide-y divide-[var(--border)]">
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
