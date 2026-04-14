"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BodyText } from "@canopy/ui";

import { toggleMilestoneStatusAction } from "@/app/projects/actions";
import type { Milestone } from "@/lib/create-types";

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" />
    </svg>
  );
}

export default function MilestoneChecklist({
  workspaceId,
  projectId,
  milestones,
  canToggle = false,
}: {
  workspaceId: string;
  projectId: string;
  milestones: Milestone[];
  canToggle?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (milestones.length === 0) {
    return (
      <BodyText muted>
        No milestones yet. Add the first one above to start tracking this project.
      </BodyText>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {milestones.map((milestone) => {
        const done = milestone.status === "completed";

        const icon = done ? (
          <CheckCircleIcon className="h-5 w-5 shrink-0 text-[var(--primary)]" />
        ) : (
          <CircleIcon className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
        );

        const label = (
          <span
            className={
              done
                ? "text-[15px] text-[var(--text-muted)] line-through"
                : "text-[15px] text-[var(--foreground)]"
            }
          >
            {milestone.title}
          </span>
        );

        if (!canToggle) {
          return (
            <div key={milestone.id} className="flex items-center gap-3 py-3.5">
              {icon}
              {label}
            </div>
          );
        }

        return (
          <button
            key={milestone.id}
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await toggleMilestoneStatusAction(
                  workspaceId,
                  projectId,
                  milestone.id,
                  milestone.status
                );
                router.refresh();
              });
            }}
            className="group flex w-full items-center gap-3 py-3.5 text-left transition hover:opacity-80 disabled:opacity-50"
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
