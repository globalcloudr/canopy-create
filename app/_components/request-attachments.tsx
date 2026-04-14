"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { uploadAttachmentAction, deleteAttachmentAction } from "@/app/requests/actions";

type Attachment = {
  id: string;
  filename: string;
  signedUrl: string;
  storagePath: string;
  createdAt: string;
};

type Props = {
  workspaceId: string;
  requestId: string;
  attachments: Attachment[];
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export default function RequestAttachments({
  workspaceId,
  requestId,
  attachments,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadAttachmentAction(workspaceId, requestId, formData);

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (result.error) {
      setUploadError(result.error);
    } else {
      startTransition(() => router.refresh());
    }
  }

  async function handleDelete(attachment: Attachment) {
    setDeletingId(attachment.id);
    await deleteAttachmentAction(
      workspaceId,
      requestId,
      attachment.id,
      attachment.storagePath
    );
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
          Attachments
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isPending}
          className="rounded-lg px-2.5 py-1 text-[12px] font-medium text-[var(--primary)] hover:bg-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {uploading ? "Uploading…" : "+ Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="*/*"
        />
      </div>

      {uploadError && (
        <p className="mt-2 text-[12px] text-red-600">{uploadError}</p>
      )}

      {attachments.length === 0 ? (
        <div
          className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-5 text-center transition hover:border-[var(--primary)]"
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-[12px] text-[var(--text-muted)]">No attachments yet</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center gap-2.5 rounded-xl bg-[var(--surface)] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={att.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-[13px] font-medium text-[var(--foreground)] hover:text-[var(--primary)] hover:underline"
                >
                  {att.filename}
                </a>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {formatDate(att.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(att)}
                disabled={deletingId === att.id || isPending}
                className="shrink-0 rounded p-0.5 text-[var(--text-muted)] hover:text-red-600 disabled:opacity-40 transition"
                aria-label="Delete attachment"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
