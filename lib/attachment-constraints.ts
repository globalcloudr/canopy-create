// Client-side guardrails for request attachment uploads.
// Keep in sync with any server-side limits in app/requests/actions.ts.

export const ATTACHMENT_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.ppt,.pptx,.ai,.psd,.zip";

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB per file

export const MAX_ATTACHMENT_LABEL = "25MB";

/**
 * Splits a candidate file list into accepted files and the names of files
 * that exceed the per-file size limit.
 */
export function partitionOversizedFiles(files: File[]): {
  accepted: File[];
  oversized: string[];
} {
  const accepted: File[] = [];
  const oversized: string[] = [];
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      oversized.push(file.name);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, oversized };
}

export function oversizedFilesMessage(oversized: string[]): string {
  const names = oversized.join(", ");
  return `${names} ${oversized.length === 1 ? "is" : "are"} larger than the ${MAX_ATTACHMENT_LABEL} per-file limit and ${oversized.length === 1 ? "was" : "were"} not added.`;
}
