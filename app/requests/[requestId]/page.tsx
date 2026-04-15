import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { AppSurface, Badge, BodyText, Button } from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";
import SchoolShell from "@/app/_components/school-shell";
import RequestAttachments from "@/app/_components/request-attachments";
import { convertRequestToProject } from "@/app/requests/actions";
import { getRequest, listRequestAttachments } from "@/lib/create-data";
import { getServerActionAccess } from "@/lib/server-auth";
import { canManageProjects, isClientRole } from "@/lib/create-roles";


type RequestDetailPageProps = {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ workspace?: string | string[] }>;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// ─── Per-type field definitions ────────────────────────────────────────────────

type FieldDef = { label: string; hint?: "url" | "date" | "multiline" };

const DESIGN_PROJECT_FIELDS: Record<string, FieldDef> = {
  description:   { label: "Description", hint: "multiline" },
  audience:      { label: "Audience" },
  format:        { label: "Format" },
  quantity:      { label: "Print Quantity" },
  delivery_date: { label: "Delivery Date", hint: "date" },
};

const BRIEF_FIELDS: Record<string, Record<string, FieldDef>> = {
  // All design_production subtypes share the same brief fields
  catalog_project:    DESIGN_PROJECT_FIELDS,
  brochure_project:   DESIGN_PROJECT_FIELDS,
  flyer_project:      DESIGN_PROJECT_FIELDS,
  postcard_project:   DESIGN_PROJECT_FIELDS,
  banner_project:     DESIGN_PROJECT_FIELDS,
  fact_sheet_project: DESIGN_PROJECT_FIELDS,
  design_project:     DESIGN_PROJECT_FIELDS,
  other:              DESIGN_PROJECT_FIELDS,
  website_update: {
    target_url:           { label: "Target URL", hint: "url" },
    update_details:       { label: "Update Details", hint: "multiline" },
    priority:             { label: "Priority" },
    desired_go_live_date: { label: "Desired Go-live Date", hint: "date" },
  },
  newsletter_request: {
    audience_segment:  { label: "Audience" },
    target_send_date:  { label: "Target Send Date", hint: "date" },
    subject_line_idea: { label: "Subject Line Idea" },
    key_topics:        { label: "Key Topics", hint: "multiline" },
    featured_events:   { label: "Events & Key Dates", hint: "multiline" },
  },
  social_media_request: {
    target_platforms:  { label: "Target Platforms" },
    tone:              { label: "Tone" },
    campaign_goals:    { label: "Campaign Goals", hint: "multiline" },
    call_to_action:    { label: "Call to Action" },
    desired_post_date: { label: "Desired Post Date", hint: "date" },
  },
  campaign_support_request: {
    target_platforms:  { label: "Target Platforms" },
    tone:              { label: "Tone" },
    campaign_goals:    { label: "Campaign Goals", hint: "multiline" },
    call_to_action:    { label: "Call to Action" },
    desired_post_date: { label: "Desired Post Date", hint: "date" },
  },
};

function BriefField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: FieldDef["hint"];
}) {
  return (
    <div className="py-4">
      <dt className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-1.5">
        {hint === "url" ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] text-[var(--primary)] underline underline-offset-2"
          >
            {value}
          </a>
        ) : hint === "multiline" ? (
          <p className="whitespace-pre-wrap text-[15px] leading-6 text-[var(--foreground)]">
            {value}
          </p>
        ) : (
          <p className="text-[15px] text-[var(--foreground)]">{formatLabel(value)}</p>
        )}
      </dd>
    </div>
  );
}


export default async function RequestDetailPage({
  params,
  searchParams,
}: RequestDetailPageProps) {
  const { requestId } = await params;
  const resolved = await searchParams;
  const workspaceParam = resolved.workspace;
  const workspaceId =
    typeof workspaceParam === "string"
      ? workspaceParam
      : Array.isArray(workspaceParam)
        ? workspaceParam[0] ?? ""
        : "";

  if (!workspaceId) {
    return (
      <ClientShell activeNav="requests">
        <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
          <BodyText muted>Select a workspace to view this request.</BodyText>
        </AppSurface>
      </ClientShell>
    );
  }

  let role: string | null = null;
  let isPlatformOperator = false;
  try {
    ({ role, isPlatformOperator } = await getServerActionAccess(workspaceId));
  } catch {
    return <ClientShell activeNav="requests"><div /></ClientShell>;
  }

  let request: Awaited<ReturnType<typeof getRequest>>;
  let rawAttachments: Awaited<ReturnType<typeof listRequestAttachments>>;
  try {
    [request, rawAttachments] = await Promise.all([
      getRequest(workspaceId, requestId),
      listRequestAttachments(workspaceId, requestId),
    ]);
  } catch {
    const Shell = isClientRole(role) && !isPlatformOperator ? SchoolShell : ClientShell;
    const nav = isClientRole(role) && !isPlatformOperator ? "home" : "requests";
    return (
      <Shell activeNav={nav}>
        <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
          <BodyText muted>This request wasn't found in the current workspace.</BodyText>
        </AppSurface>
      </Shell>
    );
  }

  const canManage = canManageProjects(role, isPlatformOperator);
  const schoolUser = isClientRole(role) && !isPlatformOperator;

  // Generate short-lived signed URLs for each attachment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const storageClient = createClient(supabaseUrl, serviceKey).storage.from("originals");

  const attachments = await Promise.all(
    rawAttachments.map(async (att) => {
      const { data } = await storageClient.createSignedUrl(att.file_url, 3600);
      return {
        id: att.id,
        filename: att.filename,
        signedUrl: data?.signedUrl ?? "#",
        storagePath: att.file_url,
        createdAt: att.created_at,
      };
    })
  );

  const details = (request.details ?? {}) as Record<string, string | null>;
  const fieldDefs = BRIEF_FIELDS[request.request_type] ?? {};
  const briefFields = Object.entries(fieldDefs)
    .map(([key, def]) => ({ key, def, value: details[key] }))
    .filter((f): f is { key: string; def: FieldDef; value: string } =>
      typeof f.value === "string" && f.value.trim() !== ""
    );

  const convertedProjectHref = request.converted_project_id
    ? `/projects/${request.converted_project_id}?workspace=${encodeURIComponent(workspaceId)}`
    : null;
  const isConverted = request.status === "converted" && !!convertedProjectHref;

  // ─── School (client) view ─────────────────────────────────────────────────────
  if (schoolUser) {
    const statusMessage: Record<string, string> = {
      submitted:    "We've received your job and we'll be in touch soon.",
      in_progress:  "We're working on this now.",
      client_review: "We're waiting on your feedback.",
      completed:    "This job is complete.",
      converted:    "We're working on this now.",
    };

    return (
      <SchoolShell activeNav="home">
        <div className="space-y-5">
          {/* Header */}
          <div>
            <Link
              href={`/?workspace=${encodeURIComponent(workspaceId)}`}
              className="text-[12px] text-[var(--text-muted)] hover:text-[var(--foreground)]"
            >
              ← My Work
            </Link>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              {request.title}
            </p>
            <p className="mt-1.5 text-[14px] text-[var(--text-muted)]">
              {statusMessage[request.status] ?? "We've received your job."}
            </p>
          </div>

          {isConverted && convertedProjectHref && (
            <AppSurface className="px-6 py-5 sm:px-8">
              <p className="text-[15px] font-medium text-[var(--foreground)]">
                Your job is in progress.{" "}
                <Link
                  href={convertedProjectHref}
                  className="text-[var(--primary)] hover:underline"
                >
                  View details →
                </Link>
              </p>
            </AppSurface>
          )}

          {/* Two-column: brief left, sidebar right */}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            {/* Left — brief */}
            {briefFields.length > 0 ? (
              <AppSurface className="px-6 py-6 sm:px-8">
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)] mb-2">
                  What you submitted
                </p>
                <dl className="divide-y divide-[var(--border)]">
                  {briefFields.map(({ key, def, value }) => (
                    <BriefField key={key} label={def.label} value={value} hint={def.hint} />
                  ))}
                </dl>
              </AppSurface>
            ) : (
              <AppSurface className="px-6 py-6 sm:px-8">
                <p className="text-[13px] text-[var(--text-muted)]">
                  No brief details were submitted.
                </p>
              </AppSurface>
            )}

            {/* Right — details + attachments */}
            <div className="space-y-5">
              <AppSurface className="px-6 py-6 sm:px-8">
                <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Details
                </p>
                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-[12px] text-[var(--text-muted)]">Type</dt>
                    <dd className="mt-0.5 text-[14px] text-[var(--foreground)]">
                      {formatLabel(request.request_type)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-[var(--text-muted)]">Submitted</dt>
                    <dd className="mt-0.5 text-[14px] text-[var(--foreground)]">
                      {formatDate(request.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-[var(--text-muted)]">Status</dt>
                    <dd className="mt-0.5 text-[14px] text-[var(--foreground)]">
                      {statusMessage[request.status] ?? formatLabel(request.status)}
                    </dd>
                  </div>
                </dl>
              </AppSurface>

              {attachments.length > 0 && (
                <AppSurface className="px-6 py-6 sm:px-8">
                  <RequestAttachments
                    workspaceId={workspaceId}
                    requestId={requestId}
                    attachments={attachments}
                  />
                </AppSurface>
              )}
            </div>
          </div>
        </div>
      </SchoolShell>
    );
  }

  // ─── Internal view ─────────────────────────────────────────────────────────────
  return (
    <ClientShell activeNav="requests">
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={`/requests?workspace=${encodeURIComponent(workspaceId)}`}
              className="text-[12px] text-[var(--text-muted)] hover:text-[var(--foreground)]"
            >
              ← Requests
            </Link>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              {request.title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Badge>{formatLabel(request.status)}</Badge>
              <span className="text-[13px] text-[var(--text-muted)]">
                {formatLabel(request.request_type)}
              </span>
              <span className="text-[13px] text-[var(--text-muted)]">
                Submitted {formatDate(request.created_at)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {isConverted ? (
              <Button asChild>
                <Link href={convertedProjectHref}>Open Project</Link>
              </Button>
            ) : canManage ? (
              <form
                action={async () => {
                  "use server";
                  await convertRequestToProject(workspaceId, request.id);
                }}
              >
                <Button type="submit">Convert to Project</Button>
              </form>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">

          {/* Brief */}
          <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              Brief
            </p>

            {briefFields.length === 0 ? (
              <BodyText muted className="mt-5">No brief details were submitted.</BodyText>
            ) : (
              <dl className="mt-2 divide-y divide-[var(--border)]">
                {briefFields.map(({ key, def, value }) => (
                  <BriefField key={key} label={def.label} value={value} hint={def.hint} />
                ))}
              </dl>
            )}
          </AppSurface>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Details */}
            <AppSurface className="px-6 py-6 sm:px-8">
              <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Details
              </p>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-[12px] text-[var(--text-muted)]">Workflow</dt>
                  <dd className="mt-0.5 text-[14px] text-[var(--foreground)]">
                    {formatLabel(request.workflow_family)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--text-muted)]">Type</dt>
                  <dd className="mt-0.5 text-[14px] text-[var(--foreground)]">
                    {formatLabel(request.request_type)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--text-muted)]">Submitted</dt>
                  <dd className="mt-0.5 text-[14px] text-[var(--foreground)]">
                    {formatDate(request.created_at)}
                  </dd>
                </div>
                {isConverted && convertedProjectHref && (
                  <div>
                    <dt className="text-[12px] text-[var(--text-muted)]">Project</dt>
                    <dd className="mt-1">
                      <Link
                        href={convertedProjectHref}
                        className="text-[14px] text-[var(--primary)] hover:underline"
                      >
                        Open project →
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </AppSurface>

            {/* Attachments */}
            <AppSurface className="px-6 py-6 sm:px-8">
              <RequestAttachments
                workspaceId={workspaceId}
                requestId={requestId}
                attachments={attachments}
              />
            </AppSurface>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
