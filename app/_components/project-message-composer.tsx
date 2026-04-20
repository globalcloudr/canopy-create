"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@globalcloudr/canopy-ui";

import { addProjectMessageAction } from "@/app/projects/actions";

export default function ProjectMessageComposer({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await addProjectMessageAction(workspaceId, projectId, formData);
    formRef.current?.reset();
    startTransition(() => router.refresh());
  }

  return (
    <form ref={formRef} action={handleSubmit} className="mb-5">
      <textarea
        name="body"
        placeholder="Share an update or ask a question..."
        required
        rows={2}
        className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[14px] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      <div className="mt-2 flex justify-end">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    </form>
  );
}
