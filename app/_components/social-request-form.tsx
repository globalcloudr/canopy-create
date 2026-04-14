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
  socialRequestSchema,
  type SocialRequestInput,
} from "@/lib/create-validators";
import type { RequestFamily, RequestType } from "@/lib/create-request-types";

type SocialRequestField =
  | "title"
  | "targetPlatforms"
  | "tone"
  | "campaignGoals"
  | "callToAction"
  | "desiredPostDate";

type SocialRequestErrors = Partial<Record<SocialRequestField, string>>;

const SOCIAL_PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "multi_platform", label: "Multi-platform" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual & friendly" },
  { value: "inspiring", label: "Inspiring" },
  { value: "urgent", label: "Urgent / time-sensitive" },
];

export default function SocialRequestForm({
  workspaceId,
  family,
  requestType,
  successRedirect,
}: {
  workspaceId: string;
  family: RequestFamily;
  requestType: RequestType;
  successRedirect: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [targetPlatforms, setTargetPlatforms] = useState("");
  const [tone, setTone] = useState<SocialRequestInput["tone"]>(undefined);
  const [campaignGoals, setCampaignGoals] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [desiredPostDate, setDesiredPostDate] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<SocialRequestErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildPayload(): SocialRequestInput {
    return {
      formType: "social_request",
      title,
      workflowFamily: "managed_communications",
      requestType: "social_media_request",
      targetPlatforms,
      tone,
      campaignGoals,
      callToAction: callToAction || undefined,
      desiredPostDate: desiredPostDate || undefined,
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = socialRequestSchema.safeParse(buildPayload());
    if (!parsed.success) {
      const nextErrors: SocialRequestErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in nextErrors)) {
          nextErrors[field as SocialRequestField] = issue.message;
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
        Social Media Request
      </p>
      <BodyText muted className="mt-1">
        Capture the platforms, goals, and tone for a social support request.
      </BodyText>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summer enrollment social campaign"
          />
          {errors.title ? (
            <BodyText className="text-sm text-red-600">{errors.title}</BodyText>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Target Platforms</Label>
            <Select value={targetPlatforms} onValueChange={setTargetPlatforms}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select platforms" />
              </SelectTrigger>
              <SelectContent>
                {SOCIAL_PLATFORM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.targetPlatforms ? (
              <BodyText className="text-sm text-red-600">{errors.targetPlatforms}</BodyText>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Tone</Label>
            <Select
              value={tone ?? ""}
              onValueChange={(v) =>
                setTone(v as SocialRequestInput["tone"] ?? undefined)
              }
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Campaign Goals</Label>
          <Textarea
            value={campaignGoals}
            onChange={(e) => setCampaignGoals(e.target.value)}
            placeholder="Describe the audience, objective, and desired outcome for this campaign."
            rows={5}
          />
          {errors.campaignGoals ? (
            <BodyText className="text-sm text-red-600">{errors.campaignGoals}</BodyText>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Call to Action</Label>
            <Input
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              placeholder="Register now at schoolname.org"
            />
          </div>

          <div className="space-y-2">
            <Label>Desired Post Date</Label>
            <Input
              type="date"
              value={desiredPostDate}
              onChange={(e) => setDesiredPostDate(e.target.value)}
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
