import type { CreateActivityEvent } from "@/lib/create-types";

// ─── Event description ────────────────────────────────────────────────────────

function formatLabel(value: string) {
  return value
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function describeEvent(event: CreateActivityEvent): string {
  const m = event.metadata ?? {};
  switch (event.event_type) {
    case "project_status_changed":
      return `changed project status from ${formatLabel(String(m.from ?? ""))} to ${formatLabel(String(m.to ?? ""))}`;
    case "milestone_completed":
      return `completed step "${m.title}"`;
    case "milestone_uncompleted":
      return `unchecked step "${m.title}"`;
    case "item_status_changed": {
      const to = formatLabel(String(m.to ?? ""));
      return `updated "${m.item_title}" to ${to}`;
    }
    case "version_uploaded":
      return `uploaded ${m.version_label} of "${m.item_title}"`;
    case "comment_added":
      return `commented on "${m.item_title}"${m.preview ? `: "${m.preview}"` : ""}`;
    case "item_approved": {
      const decisionLabel =
        m.decision === "approved"
          ? "approved"
          : m.decision === "approved_with_changes"
            ? "approved with changes"
            : "requested changes on";
      return `${decisionLabel} "${m.item_title}"`;
    }
    case "item_delivered":
      return `delivered "${m.item_title}"`;
    default:
      return "performed an action";
  }
}

// ─── Timestamp ────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActivityFeed({
  events,
  nameMap,
}: {
  events: CreateActivityEvent[];
  nameMap: Record<string, string>;
}) {
  if (events.length === 0) {
    return (
      <p className="text-[13px] text-[var(--text-muted)]">
        No activity yet. Actions taken on this project will appear here.
      </p>
    );
  }

  return (
    <ol className="space-y-0">
      {events.map((event, idx) => {
        const name = nameMap[event.actor_user_id] ?? "Team member";
        const isLast = idx === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3">
            {/* Vertical connector line */}
            {!isLast && (
              <span
                className="absolute left-[15px] top-8 bottom-0 w-px bg-[var(--border)]"
                aria-hidden="true"
              />
            )}

            {/* Avatar */}
            <span className="relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)] text-[11px] font-semibold text-[var(--text-muted)]">
              {initials(name)}
            </span>

            {/* Content */}
            <div className="min-w-0 flex-1 pb-5">
              <p className="text-[13px] text-[var(--foreground)] leading-snug">
                <span className="font-medium">{name}</span>{" "}
                {describeEvent(event)}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {formatRelativeTime(event.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
