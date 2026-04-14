"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AppSurface,
  BodyText,
  Button,
  SectionTitle,
} from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";
import DesignProjectForm from "@/app/_components/design-project-form";
import NewsletterBriefForm from "@/app/_components/newsletter-brief-form";
import RequestTypePicker, {
  type RequestTypeSelection,
} from "@/app/_components/request-type-picker";
import SocialRequestForm from "@/app/_components/social-request-form";
import WebsiteUpdateForm from "@/app/_components/website-update-form";

export default function NewRequestPage() {
  const searchParams = useSearchParams();
  const [selection, setSelection] = useState<RequestTypeSelection | null>(null);

  const workspaceId = searchParams.get("workspace")?.trim() ?? "";
  const backHref = workspaceId
    ? `/requests?workspace=${encodeURIComponent(workspaceId)}`
    : "/requests";

  const selectedForm = useMemo(() => {
    if (!selection) {
      return null;
    }

    if (selection.family === "design_production") {
      return (
        <DesignProjectForm
          workspaceId={workspaceId}
          family={selection.family}
          requestType={selection.requestType}
        />
      );
    }

    if (selection.family === "website_update") {
      return (
        <WebsiteUpdateForm
          workspaceId={workspaceId}
          family={selection.family}
          requestType={selection.requestType}
        />
      );
    }

    if (selection.requestType === "newsletter_request") {
      return (
        <NewsletterBriefForm
          workspaceId={workspaceId}
          family={selection.family}
          requestType={selection.requestType}
        />
      );
    }

    return (
      <SocialRequestForm
        workspaceId={workspaceId}
        family={selection.family}
        requestType={selection.requestType}
      />
    );
  }, [selection, workspaceId]);

  return (
    <ClientShell activeNav="requests">
      <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionTitle>New Request</SectionTitle>
            <BodyText muted className="mt-2">
              Start by choosing the kind of request you want to submit for this
              workspace.
            </BodyText>
          </div>

          <div className="flex gap-3">
            {selection ? (
              <Button variant="secondary" onClick={() => setSelection(null)}>
                Change Type
              </Button>
            ) : null}
            <Button variant="secondary" asChild>
              <Link href={backHref}>Back to Requests</Link>
            </Button>
          </div>
        </div>

        {!workspaceId ? (
          <BodyText muted className="mt-6">
            Select a workspace before creating a new request.
          </BodyText>
        ) : !selection ? (
          <div className="mt-6">
            <RequestTypePicker onSelect={setSelection} />
          </div>
        ) : (
          <div className="mt-8">{selectedForm}</div>
        )}
      </AppSurface>
    </ClientShell>
  );
}
