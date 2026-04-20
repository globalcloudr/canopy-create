"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@globalcloudr/canopy-ui";

import { addMilestoneAction } from "@/app/projects/actions";

export default function MilestoneAddForm({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-2 text-[13px] font-medium text-[var(--primary)] hover:underline"
      >
        + Add a step
      </button>
    );
  }

  return (
    <form
      className="mt-3 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      action={(formData) => {
        startTransition(async () => {
          await addMilestoneAction(workspaceId, projectId, formData);
          router.refresh();
        });
      }}
    >
      <Input
        name="title"
        placeholder="Step title"
        className="text-sm"
        required
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] text-[var(--text-muted)] mb-1">
            Due date
          </label>
          <input
            type="date"
            name="due_date"
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[13px] text-[var(--foreground)]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-[var(--text-muted)] mb-1">
            Visibility
          </label>
          <select
            name="visibility"
            defaultValue="all"
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[13px] text-[var(--foreground)]"
          >
            <option value="all">Visible to client</option>
            <option value="internal">Internal only</option>
          </select>
        </div>
      </div>
      <textarea
        name="description"
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--text-muted)] resize-none"
      />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Adding..." : "Add step"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setExpanded(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
