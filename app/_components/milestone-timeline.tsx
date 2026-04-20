"use client";

import { useState, useRef, useTransition } from "react";
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
    color: "text-[var(--accent)]",
    bg: "bg-[var(--accent-soft)]",
    border: "border-[var(--accent-soft)]",
    label: "In Progress",
  },
  completed: {
    icon: "✓",
    color: "text-[var(--success)]",
    bg: "bg-[var(--surface-muted)]",
    border: "border-[var(--rule)]",
    label: "Completed",
  },
  blocked: {
    icon: "✕",
    color: "text-[var(--destructive)]",
    bg: "bg-[var(--destructive-surface)]",
    border: "border-[var(--destructive-surface)]",
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

function isOverdue(milestone: Milestone): boolean {
  if (!milestone.due_date) return false;
  if (milestone.milestone_status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(milestone.due_date + "T12:00:00");
  due.setHours(0, 0, 0, 0);
  return due < today;
}

// ─── Editable row ────────────────────────────────────────────────────────────

function MilestoneRow({
  milestone,
  isLast,
  canEdit,
  nameMap,
  onSave,
  isPending,
}: {
  milestone: Milestone;
  isLast: boolean;
  canEdit: boolean;
  nameMap: Record<string, string>;
  onSave: (milestoneId: string, field: string, value: string) => void;
  isPending: boolean;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const config = STATUS_CONFIG[milestone.milestone_status];
  const overdue = isOverdue(milestone);
  const assigneeName = milestone.assignee_id
    ? nameMap[milestone.assignee_id] ?? null
    : null;

  function startEdit(field: string, currentValue: string) {
    if (!canEdit) return;
    setEditingField(field);
    setEditValue(currentValue);
    // Focus the input after render
    setTimeout(() => {
      inputRef.current?.focus();
      textareaRef.current?.focus();
    }, 0);
  }

  function commitEdit(field: string) {
    setEditingField(null);
    const trimmed = editValue.trim();
    // Don't save if unchanged or empty title
    if (field === "title" && !trimmed) return;
    onSave(milestone.id, field, field === "title" ? trimmed : editValue);
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue("");
  }

  return (
    <li className="relative flex gap-4 pb-1">
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

            {/* Title */}
            {editingField === "title" ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit("title")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit("title");
                  if (e.key === "Escape") cancelEdit();
                }}
                className="w-full rounded border border-[var(--primary)] bg-white px-2 py-0.5 text-[14px] font-medium text-[var(--foreground)] outline-none"
              />
            ) : (
              <p
                onClick={() => startEdit("title", milestone.title)}
                className={`text-[14px] font-medium leading-snug ${
                  milestone.milestone_status === "completed"
                    ? "text-[var(--text-muted)] line-through"
                    : "text-[var(--foreground)]"
                } ${canEdit ? "cursor-pointer hover:text-[var(--primary)]" : ""}`}
              >
                {milestone.title}
              </p>
            )}

            {/* Meta line: date + assignee + visibility */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {/* Date — click to edit */}
              {canEdit ? (
                editingField === "due_date" ? (
                  <input
                    ref={inputRef}
                    type="date"
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      // Auto-commit on date pick
                      setEditingField(null);
                      onSave(milestone.id, "due_date", e.target.value);
                    }}
                    onBlur={() => commitEdit("due_date")}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="rounded border border-[var(--primary)] bg-white px-1.5 py-0.5 text-[12px] text-[var(--foreground)] outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit("due_date", milestone.due_date ?? "")}
                    className={`text-[12px] hover:text-[var(--primary)] hover:underline ${
                      overdue
                        ? "font-semibold text-red-600"
                        : milestone.due_date
                          ? "text-[var(--text-muted)]"
                          : "text-[var(--text-muted)] italic"
                    }`}
                  >
                    {milestone.due_date
                      ? `${overdue ? "Overdue — " : ""}${formatDate(milestone.due_date)}`
                      : "Set date"}
                  </button>
                )
              ) : milestone.due_date ? (
                <span
                  className={`text-[12px] ${
                    overdue ? "font-semibold text-red-600" : "text-[var(--text-muted)]"
                  }`}
                >
                  {overdue ? "Overdue — " : ""}
                  {formatDate(milestone.due_date)}
                </span>
              ) : null}

              {assigneeName && (
                <span className="text-[12px] text-[var(--text-muted)]">
                  {assigneeName}
                </span>
              )}

              {/* Visibility toggle */}
              {canEdit ? (
                <button
                  type="button"
                  onClick={() =>
                    onSave(
                      milestone.id,
                      "visibility",
                      milestone.visibility === "all" ? "internal" : "all"
                    )
                  }
                  className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--primary)] hover:underline"
                >
                  {milestone.visibility === "internal" ? "Internal" : "Client-visible"}
                </button>
              ) : milestone.visibility === "internal" ? (
                <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Internal
                </span>
              ) : null}
            </div>

            {/* Description — click to edit */}
            {editingField === "description" ? (
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit("description")}
                onKeyDown={(e) => {
                  if (e.key === "Escape") cancelEdit();
                }}
                rows={2}
                className="mt-1.5 w-full rounded border border-[var(--primary)] bg-white px-2 py-1 text-[13px] leading-relaxed text-[var(--foreground)] outline-none resize-none"
              />
            ) : milestone.description ? (
              <p
                onClick={() => startEdit("description", milestone.description ?? "")}
                className={`mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)] ${
                  canEdit ? "cursor-pointer hover:text-[var(--foreground)]" : ""
                }`}
              >
                {milestone.description}
              </p>
            ) : canEdit ? (
              <button
                type="button"
                onClick={() => startEdit("description", "")}
                className="mt-1 text-[12px] italic text-[var(--text-muted)] hover:text-[var(--primary)] hover:underline"
              >
                Add description
              </button>
            ) : null}
          </div>

          {/* Status control */}
          {canEdit ? (
            <select
              value={milestone.milestone_status}
              disabled={isPending}
              onChange={(e) =>
                onSave(milestone.id, "milestone_status", e.target.value)
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
}

// ─── Main component ──────────────────────────────────────────────────────────

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

  function handleFieldSave(milestoneId: string, field: string, value: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set(field, value);
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
        {milestones.map((milestone, idx) => (
          <MilestoneRow
            key={milestone.id}
            milestone={milestone}
            isLast={idx === milestones.length - 1}
            canEdit={canEdit}
            nameMap={nameMap}
            onSave={handleFieldSave}
            isPending={isPending}
          />
        ))}
      </ol>
    </div>
  );
}
