"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeItemStatusAction } from "@/app/projects/actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Complete",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-[var(--text-muted)]",
  in_progress: "text-blue-600",
  in_review: "text-amber-600",
  completed: "text-emerald-600",
};

const DEFAULT_STATUSES = ["pending", "in_progress", "in_review", "completed"];

export default function ItemStatusSelect({
  workspaceId,
  projectId,
  itemId,
  currentStatus,
  statuses = DEFAULT_STATUSES,
}: {
  workspaceId: string;
  projectId: string;
  itemId: string;
  currentStatus: string;
  statuses?: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = event.target.value;
    startTransition(async () => {
      await changeItemStatusAction(workspaceId, projectId, itemId, newStatus);
      router.refresh();
    });
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className={`cursor-pointer rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-[13px] font-medium transition disabled:opacity-50 ${STATUS_COLORS[currentStatus] ?? "text-[var(--foreground)]"}`}
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s] ?? s}
        </option>
      ))}
    </select>
  );
}
