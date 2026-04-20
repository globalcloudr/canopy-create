"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppSurface, BodyText, Button, SectionTitle } from "@globalcloudr/canopy-ui";

import ClientShell from "@/app/_components/client-shell";
import SchoolShell from "@/app/_components/school-shell";
import DesignProjectForm from "@/app/_components/design-project-form";
import NewsletterBriefForm from "@/app/_components/newsletter-brief-form";
import RequestTypePicker, { type RequestTypeSelection } from "@/app/_components/request-type-picker";
import SocialRequestForm from "@/app/_components/social-request-form";
import WebsiteUpdateForm from "@/app/_components/website-update-form";
import type { RequestFamily, RequestType } from "@/lib/create-request-types";

// Maps a ?type= param to its family + requestType so the type picker can be skipped
const TYPE_TO_SELECTION: Record<string, RequestTypeSelection> = {
  catalog_project:       { family: "design_production",       requestType: "catalog_project" },
  brochure_project:      { family: "design_production",       requestType: "brochure_project" },
  flyer_project:         { family: "design_production",       requestType: "flyer_project" },
  postcard_project:      { family: "design_production",       requestType: "postcard_project" },
  newsletter_request:    { family: "managed_communications",  requestType: "newsletter_request" },
  social_media_request:  { family: "managed_communications",  requestType: "social_media_request" },
  website_update:        { family: "website_update",          requestType: "website_update" },
};

export default function NewRequestClient({
  workspaceId,
  isSchoolUser,
  preselectedType,
  suggestedTitle,
  suggestedDeliveryDate,
}: {
  workspaceId: string;
  isSchoolUser: boolean;
  preselectedType?: string | null;
  suggestedTitle?: string | null;
  suggestedDeliveryDate?: string | null;
}) {
  const initialSelection = preselectedType
    ? (TYPE_TO_SELECTION[preselectedType] ?? null)
    : null;

  const [selection, setSelection] = useState<RequestTypeSelection | null>(initialSelection);

  const backHref = workspaceId
    ? isSchoolUser
      ? `/?workspace=${encodeURIComponent(workspaceId)}`
      : `/requests?workspace=${encodeURIComponent(workspaceId)}`
    : "/";

  const successRedirect = workspaceId
    ? isSchoolUser
      ? `/?workspace=${encodeURIComponent(workspaceId)}`
      : `/requests?workspace=${encodeURIComponent(workspaceId)}`
    : "/";

  const selectedForm = useMemo(() => {
    if (!selection) return null;

    if (selection.family === "design_production") {
      return (
        <DesignProjectForm
          workspaceId={workspaceId}
          family={selection.family}
          requestType={selection.requestType}
          successRedirect={successRedirect}
          defaultTitle={suggestedTitle ?? undefined}
          defaultDeliveryDate={suggestedDeliveryDate ?? undefined}
        />
      );
    }
    if (selection.family === "website_update") {
      return (
        <WebsiteUpdateForm
          workspaceId={workspaceId}
          family={selection.family}
          requestType={selection.requestType}
          successRedirect={successRedirect}
          defaultTitle={suggestedTitle ?? undefined}
        />
      );
    }
    if (selection.requestType === "newsletter_request") {
      return (
        <NewsletterBriefForm
          workspaceId={workspaceId}
          family={selection.family}
          requestType={selection.requestType}
          successRedirect={successRedirect}
          defaultTitle={suggestedTitle ?? undefined}
          defaultDeliveryDate={suggestedDeliveryDate ?? undefined}
        />
      );
    }
    return (
      <SocialRequestForm
        workspaceId={workspaceId}
        family={selection.family}
        requestType={selection.requestType}
        successRedirect={successRedirect}
        defaultTitle={suggestedTitle ?? undefined}
      />
    );
  }, [selection, workspaceId, successRedirect, suggestedTitle, suggestedDeliveryDate]);

  const Shell = isSchoolUser ? SchoolShell : ClientShell;
  const activeNav = isSchoolUser ? "home" : "requests";

  return (
    <Shell activeNav={activeNav}>
      <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionTitle>{isSchoolUser ? "New Job" : "New Request"}</SectionTitle>
            <BodyText muted className="mt-2">
              {isSchoolUser
                ? "Tell us what you need and we'll get to work."
                : "Start by choosing the kind of request you want to submit for this workspace."}
            </BodyText>
          </div>
          <div className="flex gap-3">
            {selection && (
              <Button variant="secondary" onClick={() => setSelection(null)}>
                Change Type
              </Button>
            )}
            <Button variant="secondary" asChild>
              <Link href={backHref}>{isSchoolUser ? "← My Work" : "Back to Requests"}</Link>
            </Button>
          </div>
        </div>

        {!workspaceId ? (
          <BodyText muted className="mt-6">
            Select a workspace before submitting a job.
          </BodyText>
        ) : !selection ? (
          <div className="mt-6">
            <RequestTypePicker onSelect={setSelection} />
          </div>
        ) : (
          <div className="mt-8">{selectedForm}</div>
        )}
      </AppSurface>
    </Shell>
  );
}
