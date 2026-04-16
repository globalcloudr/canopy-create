"use client";

import { useState } from "react";

/**
 * Inline proof viewer for image and PDF files.
 * Infers the file type from the filename extension.
 * For unsupported types, renders nothing (caller should show a download link).
 *
 * Props:
 *  - signedUrl: pre-signed Supabase storage URL (1-hour expiry)
 *  - filename: used to detect the file type
 *  - defaultOpen: whether to show the preview immediately (default false)
 */

type FileType = "image" | "pdf" | "other";

function inferFileType(filename: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "other";
}

export default function ProofViewer({
  signedUrl,
  filename,
  defaultOpen = false,
}: {
  signedUrl: string;
  filename: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const type = inferFileType(filename);
  if (type === "other") return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) {
            setLoaded(false);
            setErrored(false);
          }
        }}
        className="text-[12px] font-medium text-[var(--primary)] hover:underline"
      >
        {open ? "Hide preview" : "Preview inline"}
      </button>

      {open && (
        <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {/* Loading placeholder */}
          {!loaded && !errored && (
            <div className="flex h-40 items-center justify-center">
              <span className="text-[13px] text-[var(--text-muted)]">Loading preview…</span>
            </div>
          )}

          {/* Error state */}
          {errored && (
            <div className="flex h-24 items-center justify-center px-6 text-center">
              <p className="text-[13px] text-[var(--text-muted)]">
                Preview unavailable.{" "}
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--primary)] hover:underline"
                >
                  Download the file instead
                </a>
                .
              </p>
            </div>
          )}

          {/* Image viewer */}
          {type === "image" && (
            <img
              src={signedUrl}
              alt={filename}
              onLoad={() => setLoaded(true)}
              onError={() => {
                setLoaded(false);
                setErrored(true);
              }}
              className={`w-full object-contain ${loaded ? "block" : "hidden"}`}
              style={{ maxHeight: "700px" }}
            />
          )}

          {/* PDF viewer */}
          {type === "pdf" && (
            <iframe
              src={signedUrl}
              title={filename}
              onLoad={() => setLoaded(true)}
              onError={() => {
                setLoaded(false);
                setErrored(true);
              }}
              className={`w-full ${loaded ? "block" : "hidden"}`}
              style={{ height: "700px", border: "none" }}
            />
          )}
        </div>
      )}
    </div>
  );
}
