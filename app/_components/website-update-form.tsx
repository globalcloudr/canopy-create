"use client";

import { useState, useTransition } from "react";
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

import { submitCreateRequestAction } from "@/app/requests/actions";
import {
  websiteUpdateSchema,
  type WebsiteUpdateInput,
} from "@/lib/create-validators";
import type { RequestFamily, RequestType } from "@/lib/create-request-types";

type WebsiteUpdateField =
  | "title"
  | "targetUrl"
  | "updateDetails"
  | "priority"
  | "desiredGoLiveDate";

type WebsiteUpdateErrors = Partial<Record<WebsiteUpdateField, string>>;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low — no hard deadline" },
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent — time-sensitive" },
];

export default function WebsiteUpdateForm({
  workspaceId,
  family,
  requestType,
}: {
  workspaceId: string;
  family: RequestFamily;
  requestType: RequestType;
}) {
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [updateDetails, setUpdateDetails] = useState("");
  const [priority, setPriority] = useState<WebsiteUpdateInput["priority"]>(undefined);
  const [desiredGoLiveDate, setDesiredGoLiveDate] = useState("");
  const [errors, setErrors] = useState<WebsiteUpdateErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildPayload(): WebsiteUpdateInput {
    return {
      formType: "website_update",
      title,
      workflowFamily: "website_update",
      requestType: "website_update",
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
      if (result.error) {
        setFormError(result.error);
      }
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
