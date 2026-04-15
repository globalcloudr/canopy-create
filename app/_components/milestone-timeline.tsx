"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateMilestoneAction } from "@/app/projects/actions";
import type { Milestone } from "@/lib/create-types";
import type { MilestoneStatus } from "@/lib/create-status";

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  MilestoneStatus,
  { icon: string; color: string; bg: string; border: string; label: string }
> = {
  not_started: {
    icon: "○",
    color: "text-[var(--text-muted)]",
    bg: "bg-[var(--surface)]",
    border: "border-[var(--border)]",
    label: "Not Started",
  },
  in_progress: {
    icon: "◐",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    label: "In Progress",
  },
  completed: {
    icon: "✓",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Completed",
  },
  blocked: {
    icon: "✕",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "Blocked",
  },
};

const MILESTONE_STATUSES: MilestoneStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "blocked",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateStr + "T12:00:00"));
}

function formatDateFull(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr + "T12:00:00"));
}

function isOverdue(milestone: Milestone): boolean {
  if (!milestone.due_date) return false;
  if (milestone.milestone_status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(milestone.due_date + "T12:00:00");
  due.setHours(0, 0, 0, 0);
  return due < today;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MilestoneTimeline({
  workspaceId,
  projectId,
  milestones,
  nameMap,
  canEdit = false,
}: {
  workspaceId: string;
  projectId: string;
  milestones: Milestone[];
  nameMap: Record<string, string>;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const completedCount = milestones.filter(
    (m) => m.milestone_status === "completed"
  ).length;
  const totalCount = milestones.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function handleStatusChange(milestoneId: string, newStatus: MilestoneStatus) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("milestone_status", newStatus);
      await updateMilestoneAction(workspaceId, projectId, milestoneId, fd);
      router.refresh();
    });
  }

  if (milestones.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] px-5 py-8 text-center">
        <p className="text-[14px] font-medium text-[var(--foreground)]">
          No timeline steps yet
        </p>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Milestones will appear here when a template is applied or steps are added manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress summary */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <span className="shrink-0 text-[13px] font-medium text-[var(--text-muted)]">
          {completedCount} of {totalCount} steps complete
        </span>
      </div>

      {/* Timeline */}
      <ol className="relative">
        {milestones.map((milestone, idx) => {
          const config = STATUS_CONFIG[milestone.milestone_status];
          const overdue = isOverdue(milestone);
          const isLast = idx === milestones.length - 1;
          const assigneeName = milestone.assignee_id
            ? nameMap[milestone.assignee_id] ?? null
            : null;

          return (
            <li key={milestone.id} className="relative flex gap-4 pb-1">
              {/* Vertical line */}
              {!isLast && (
                <span
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-[var(--border)]"
                  aria-hidden="true"
                />
              )}

              {/* Status icon */}
              <span
                className={`relative mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold ${config.border} ${config.bg} ${config.color}`}
              >
                {config.icon}
              </span>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[14px] font-medium leading-snug ${
                        milestone.milestone_status === "completed"
                          ? "text-[var(--text-muted)] line-through"
                          : "text-[var(--foreground)]"
                      }`}
                    >
                      {milestone.title}
                    </p>

                    {/* Meta line: date + assignee */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {milestone.due_date && (
                        <span
                          className={`text-[12px] ${
                            overdue
                              ? "font-semibold text-red-600"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          {overdue ? "Overdue — " : ""}
                          {formatDate(milestone.due_date)}
                        </span>
                      )}
                      {assigneeName && (
                        <span className="text-[12px] text-[var(--text-muted)]">
                          {assigneeName}
                        </span>
                      )}
                      {milestone.visibility === "internal" && (
                        <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Internal
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {milestone.description && (
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
                        {milestone.description}
                      </p>
                    )}
                  </div>

                  {/* Status control */}
                  {canEdit ? (
                    <select
                      value={milestone.milestone_status}
                      disabled={isPending}
                      onChange={(e) =>
                        handleStatusChange(
                          milestone.id,
                          e.target.value as MilestoneStatus
                        )
                      }
                      className={`shrink-0 rounded-lg border px-2 py-1 text-[12px] font-medium ${config.border} ${config.bg} ${config.color} disabled:opacity-50`}
                    >
                      {MILESTONE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_CONFIG[s].label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-medium ${config.border} ${config.bg} ${config.color}`}
                    >
                      {config.label}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
