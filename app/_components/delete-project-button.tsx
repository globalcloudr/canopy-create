"use client";

import { useState, useTransition } from "react";
import { Button } from "@canopy/ui";

import { deleteProjectAction } from "@/app/projects/actions";

export default function DeleteProjectButton({
  workspaceId,
  projectId,
  projectTitle,
}: {
  workspaceId: string;
  projectId: string;
  projectTitle: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="secondary"
        onClick={() => setConfirming(true)}
      >
        Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] text-red-600 font-medium">
        Delete "{projectTitle}"?
      </span>
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await deleteProjectAction(workspaceId, projectId);
          });
        }}
        className="!border-red-300 !text-red-600 hover:!bg-red-50"
      >
        {isPending ? "Deleting..." : "Yes, delete"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </div>
  );
}
