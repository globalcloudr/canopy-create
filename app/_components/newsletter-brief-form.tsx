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
  newsletterBriefSchema,
  type NewsletterBriefInput,
} from "@/lib/create-validators";
import type { RequestFamily, RequestType } from "@/lib/create-request-types";

type NewsletterBriefField =
  | "title"
  | "audienceSegment"
  | "targetSendDate"
  | "subjectLineIdea"
  | "keyTopics"
  | "featuredEvents";

type NewsletterBriefErrors = Partial<Record<NewsletterBriefField, string>>;

const AUDIENCE_OPTIONS = [
  { value: "all_families", label: "All families" },
  { value: "prospective_families", label: "Prospective families" },
  { value: "staff", label: "Staff" },
  { value: "alumni", label: "Alumni" },
  { value: "all", label: "All segments" },
];

export default function NewsletterBriefForm({
  workspaceId,
  family,
  requestType,
}: {
  workspaceId: string;
  family: RequestFamily;
  requestType: RequestType;
}) {
  const [title, setTitle] = useState("");
  const [audienceSegment, setAudienceSegment] =
    useState<NewsletterBriefInput["audienceSegment"]>(undefined);
  const [targetSendDate, setTargetSendDate] = useState("");
  const [subjectLineIdea, setSubjectLineIdea] = useState("");
  const [keyTopics, setKeyTopics] = useState("");
  const [featuredEvents, setFeaturedEvents] = useState("");
  const [errors, setErrors] = useState<NewsletterBriefErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildPayload(): NewsletterBriefInput {
    return {
      formType: "newsletter_brief",
      title,
      workflowFamily: "managed_communications",
      requestType: "newsletter_request",
      audienceSegment,
      targetSendDate,
      subjectLineIdea: subjectLineIdea || undefined,
      keyTopics,
      featuredEvents: featuredEvents || undefined,
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = newsletterBriefSchema.safeParse(buildPayload());
    if (!parsed.success) {
      const nextErrors: NewsletterBriefErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in nextErrors)) {
          nextErrors[field as NewsletterBriefField] = issue.message;
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
        Managed Newsletter Request
      </p>
      <BodyText muted className="mt-1">
        Capture the brief, audience, and priority content for this newsletter.
      </BodyText>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="May enrollment newsletter"
          />
          {errors.title ? (
            <BodyText className="text-sm text-red-600">{errors.title}</BodyText>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select
              value={audienceSegment ?? ""}
              onValueChange={(v) =>
                setAudienceSegment(
                  v as NewsletterBriefInput["audienceSegment"] ?? undefined
                )
              }
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Who receives this?" />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Target Send Date</Label>
            <Input
              type="date"
              value={targetSendDate}
              onChange={(e) => setTargetSendDate(e.target.value)}
            />
            {errors.targetSendDate ? (
              <BodyText className="text-sm text-red-600">{errors.targetSendDate}</BodyText>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Subject Line Idea</Label>
          <Input
            value={subjectLineIdea}
            onChange={(e) => setSubjectLineIdea(e.target.value)}
            placeholder="Enrollment is open — don't miss your spot"
          />
        </div>

        <div className="space-y-2">
          <Label>Key Topics</Label>
          <Textarea
            value={keyTopics}
            onChange={(e) => setKeyTopics(e.target.value)}
            placeholder="Summarize the featured announcements, deadlines, and enrollment messaging for this issue."
            rows={5}
          />
          {errors.keyTopics ? (
            <BodyText className="text-sm text-red-600">{errors.keyTopics}</BodyText>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Events & Key Dates to Include</Label>
          <Textarea
            value={featuredEvents}
            onChange={(e) => setFeaturedEvents(e.target.value)}
            placeholder="Open House — May 14&#10;Enrollment deadline — May 31&#10;Summer orientation — June 10"
            rows={4}
          />
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
