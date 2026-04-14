"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

import { addCommentAction } from "@/app/items/actions";

type Comment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

type Props = {
  workspaceId: string;
  itemId: string;
  projectId: string;
  comments: Comment[];
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function ItemComments({ workspaceId, itemId, projectId, comments }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    await addCommentAction(workspaceId, itemId, projectId, formData);
    formRef.current?.reset();
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
        Comments
      </p>

      {comments.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--text-muted)]">No comments yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--border)] text-[11px] font-semibold text-[var(--foreground)]">
                {c.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-[var(--foreground)]">
                    {c.authorName}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {formatDate(c.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-5 text-[var(--foreground)]">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={handleSubmit} className="mt-4">
        <textarea
          name="body"
          rows={3}
          placeholder="Leave a comment…"
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          required
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {isPending ? "Posting…" : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
