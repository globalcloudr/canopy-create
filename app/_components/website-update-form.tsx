"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BodyText,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@canopy/ui";

import { submitCreateRequestAction, uploadAttachmentAction } from "@/app/requests/actions";
import {
  websiteUpdateSchema,
  type WebsiteUpdateInput,
} from "@/lib/create-validators";
import type { RequestFamily, RequestType } from "@/lib/create-request-types";

type WebsiteUpdateField =
  | "title"
  | "scope"
  | "targetUrl"
  | "updateDetails"
  | "priority"
  | "desiredGoLiveDate";

type WebsiteUpdateErrors = Partial<Record<WebsiteUpdateField, string>>;

const SCOPE_OPTIONS = [
  {
    value: "quick_fix",
    label: "Quick Fix",
    description: "Typo correction, image swap, contact info update, or any change under an hour. Typically live within 1–2 days.",
  },
  {
    value: "standard_update",
    label: "Standard Update",
    description: "New page, navigation change, content section, or feature addition. Typically 5–7 days.",
  },
  {
    value: "website_redesign",
    label: "Website Redesign",
    description: "Full site overhaul, new structure, or major visual refresh. Typically 6–8 weeks.",
  },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low — no hard deadline" },
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent — time-sensitive" },
];

export default function WebsiteUpdateForm({
  workspaceId,
  family,
  requestType,
  successRedirect,
  defaultTitle,
}: {
  workspaceId: string;
  family: RequestFamily;
  requestType: RequestType;
  successRedirect: string;
  defaultTitle?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [scope, setScope] = useState<WebsiteUpdateInput["scope"]>(undefined);
  const [targetUrl, setTargetUrl] = useState("");
  const [updateDetails, setUpdateDetails] = useState("");
  const [priority, setPriority] = useState<WebsiteUpdateInput["priority"]>(undefined);
  const [desiredGoLiveDate, setDesiredGoLiveDate] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<WebsiteUpdateErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildPayload(): WebsiteUpdateInput {
    return {
      formType: "website_update",
      title,
      workflowFamily: "website_update",
      requestType: "website_update",
      scope,
      targetUrl,
      updateDetails,
      priority,
      desiredGoLiveDate: desiredGoLiveDate || undefined,
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = websiteUpdateSchema.safeParse(buildPayload());
    if (!parsed.success) {
      const nextErrors: WebsiteUpdateErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in nextErrors)) {
          nextErrors[field as WebsiteUpdateField] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    startTransition(async () => {
      const result = await submitCreateRequestAction(workspaceId, parsed.data);
      if (result.error || !result.requestId) {
        setFormError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      for (const file of selectedFiles) {
        const fd = new FormData();
        fd.append("file", file);
        await uploadAttachmentAction(workspaceId, result.requestId, fd);
      }
      router.push(successRedirect);
    });
  }

  return (
    <div>
      <p className="text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
        Website Update Request
      </p>
      <BodyText muted className="mt-1">
        Capture a web update clearly so it can move into review and production.
      </BodyText>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Homepage headline refresh"
          />
          {errors.title ? (
            <BodyText className="text-sm text-red-600">{errors.title}</BodyText>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Scope</Label>
          <Select
            value={scope ?? ""}
            onValueChange={(v) => setScope(v as WebsiteUpdateInput["scope"] ?? undefined)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="What kind of update is this?" />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {scope && (
            <BodyText muted className="text-xs">
              {SCOPE_OPTIONS.find((o) => o.value === scope)?.description}
            </BodyText>
          )}
          {errors.scope ? (
            <BodyText className="text-sm text-red-600">{errors.scope}</BodyText>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Target URL</Label>
          <Input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.org/programs"
            inputMode="url"
          />
          {errors.targetUrl ? (
            <BodyText className="text-sm text-red-600">{errors.targetUrl}</BodyText>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Update Details</Label>
          <Textarea
            value={updateDetails}
            onChange={(e) => setUpdateDetails(e.target.value)}
            placeholder="Describe the requested changes, content updates, or fixes in detail."
            rows={6}
          />
          {errors.updateDetails ? (
            <BodyText className="text-sm text-red-600">{errors.updateDetails}</BodyText>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={priority ?? ""}
              onValueChange={(v) =>
                setPriority(v as WebsiteUpdateInput["priority"] ?? undefined)
              }
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Desired Go-live Date</Label>
            <Input
              type="date"
              value={desiredGoLiveDate}
              onChange={(e) => setDesiredGoLiveDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Reference Files <span className="text-[var(--text-muted)] font-normal">(optional)</span></Label>
          <BodyText muted className="text-xs">Attach logos, existing materials, or examples to help us get started.</BodyText>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition"
          >
            + Attach files
          </button>
          {selectedFiles.length > 0 && (
            <ul className="mt-1 space-y-1">
              {selectedFiles.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-[13px] text-[var(--foreground)]">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    className="text-[var(--text-muted)] hover:text-red-500"
                    onClick={() => setSelectedFiles((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {formError ? (
          <BodyText className="text-sm text-red-600">{formError}</BodyText>
        ) : null}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending || !workspaceId}>
            {isPending ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
