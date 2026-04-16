import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { AppSurface, Badge, BodyText } from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";
import SchoolShell from "@/app/_components/school-shell";
import {
  listProjects,
  listRequests,
  listMilestonesForProjects,
  listItemsForProjects,
} from "@/lib/create-data";
import {
  listWorkspaceSubscriptions,
  getCatalogKickoffDate,
  SUBSCRIPTION_LABELS,
  monthName,
  nextMonthName,
  type ProductionSubscription,
} from "@/lib/create-subscriptions";
import { getServerActionAccess } from "@/lib/server-auth";
import { isInternalRole, isClientRole } from "@/lib/create-roles";
import type { CreateItem, CreateProject, CreateRequest, Milestone } from "@/lib/create-types";

const ACTIVE_PROJECT_STATUSES = ["draft", "active"] as const;
const OPEN_REQUEST_STATUSES = ["submitted", "in_progress", "client_review"] as const;

type DashboardPageProps = {
  searchParams: Promise<{ workspace?: string | string[] }>;
};

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function statusColor(status: string) {
  if (status === "client_review") return "text-amber-600";
  if (status === "submitted") return "text-blue-600";
  return "text-[var(--text-muted)]";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const workspaceParam = params.workspace;
  const workspaceId =
    typeof workspaceParam === "string"
      ? workspaceParam
      : Array.isArray(workspaceParam)
        ? workspaceParam[0] ?? ""
        : "";

  if (!workspaceId) {
    return (
      <ClientShell activeNav="home">
        <AppSurface className="px-8 py-12 text-center">
          <p className="text-base font-medium text-[var(--foreground)]">No workspace selected</p>
          <BodyText muted className="mt-1">Select a workspace from the sidebar to get started.</BodyText>
        </AppSurface>
      </ClientShell>
    );
  }

  // Handoff launch: the portal redirect includes ?launch= before the session is
  // established. The server component runs before ProductShell exchanges the code,
  // so getServerActionAccess may throw "Authentication required." Return an empty
  // shell — ProductShell will exchange the code and trigger a re-render.
  let role: string | null = null;
  let isPlatformOperator = false;
  try {
    ({ role, isPlatformOperator } = await getServerActionAccess(workspaceId));
  } catch {
    return <ClientShell activeNav="home"><div /></ClientShell>;
  }
  const isClient = isClientRole(role) && !isPlatformOperator;
  const isInternal = isInternalRole(role) || isPlatformOperator;

  const [activeProjects, openRequests, subscriptions] = await Promise.all([
    listProjects(workspaceId, [...ACTIVE_PROJECT_STATUSES]),
    listRequests(workspaceId, [...OPEN_REQUEST_STATUSES]),
    isClient ? listWorkspaceSubscriptions(workspaceId).catch(() => []) : Promise.resolve([]),
  ]);

  const projectIds = activeProjects.map((p) => p.id);
  const [allMilestones, allItems] = await Promise.all([
    listMilestonesForProjects(workspaceId, projectIds),
    listItemsForProjects(workspaceId, projectIds),
  ]);

  // Group milestones and items by project
  const milestonesByProject = allMilestones.reduce<Record<string, typeof allMilestones>>(
    (acc, m) => { (acc[m.project_id] ??= []).push(m); return acc; },
    {}
  );
  const itemsByProject = allItems.reduce<Record<string, typeof allItems>>(
    (acc, i) => { if (i.project_id) (acc[i.project_id] ??= []).push(i); return acc; },
    {}
  );

  // Deliverables pending approval (in_review status, not yet delivered)
  const pendingApproval = allItems.filter(
    (i) => i.status === "in_review" && !i.delivered_at
  );

  // Delivered items with final version signed URLs
  const deliveredItems = allItems.filter((i) => !!i.delivered_at && !!i.final_version_id);
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const deliveredFiles = await Promise.all(
    deliveredItems.map(async (item) => {
      const { data: version } = await serviceClient
        .from("create_item_versions")
        .select("file_url, version_label")
        .eq("id", item.final_version_id!)
        .maybeSingle();
      if (!version?.file_url) return null;
      const { data } = await serviceClient.storage
        .from("originals")
        .createSignedUrl(version.file_url, 3600);
      const project = activeProjects.find((p) => p.id === item.project_id);
      return {
        item,
        project,
        signedUrl: data?.signedUrl ?? null,
        versionLabel: version.version_label,
      };
    })
  ).then((results) => results.filter(Boolean));

  const needsAttention = openRequests.filter((r) => r.status === "client_review");
  const inProgress = openRequests.filter(
    (r) => r.status === "in_progress" || r.status === "submitted"
  );

  const newRequestHref = `/requests/new?workspace=${encodeURIComponent(workspaceId)}`;

  // ─── Client (school) dashboard ────────────────────────────────────────────────
  if (isClient) {
    // Compute a simple stage for each project so we can show plain-English status
    function projectStage(items: CreateItem[]): "received" | "production" | "review" | "delivered" {
      if (!items.length) return "received";
      if (items.every((i) => !!i.delivered_at)) return "delivered";
      if (items.some((i) => i.status === "in_review" && !i.delivered_at)) return "review";
      if (items.some((i) => i.status === "in_progress")) return "production";
      return "received";
    }

    /** First upcoming incomplete milestone the school can see, ordered by due date. */
    function nextVisibleMilestone(milestones: Milestone[]): Milestone | null {
      return (
        milestones
          .filter(
            (m) =>
              m.visibility === "all" &&
              m.milestone_status !== "completed" &&
              m.due_date != null
          )
          .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0] ??
        null
      );
    }

    /** Days elapsed since the most recent activity on a project (project or any item). */
    function daysSinceActivity(project: CreateProject, items: CreateItem[]): number {
      const dates = [project.updated_at, ...items.map((i) => i.updated_at)];
      const latest = dates.filter(Boolean).sort().at(-1) ?? project.updated_at;
      return Math.floor((Date.now() - new Date(latest).getTime()) / 86_400_000);
    }

    // Unified status label + color for both request and project cards
    const STATUS_LABEL: Record<string, string> = {
      // request statuses
      submitted: "Received",
      in_progress: "In production",
      client_review: "Your input is needed",
      // project stages
      received: "Received",
      production: "In production",
      review: "Proof ready for review",
      delivered: "Delivered",
    };
    const STATUS_COLOR: Record<string, string> = {
      submitted: "text-[var(--text-muted)]",
      in_progress: "text-blue-600",
      client_review: "text-amber-600",
      received: "text-[var(--text-muted)]",
      production: "text-blue-600",
      review: "text-amber-600",
      delivered: "text-emerald-600",
    };

    // STAGE_LABEL still used in project detail page (not here) — keep for compatibility
    const STAGE_COLOR: Record<string, string> = {
      received: "text-[var(--text-muted)]",
      production: "text-blue-600",
      review: "text-amber-600",
      delivered: "text-emerald-600",
    };

    // Unified job list: pending requests + active projects, newest first
    type ClientJob =
      | { kind: "request"; request: CreateRequest }
      | { kind: "project"; project: CreateProject; items: CreateItem[]; milestones: Milestone[] };

    const jobs: ClientJob[] = [
      ...openRequests.map((r) => ({ kind: "request" as const, request: r })),
      ...activeProjects.map((p) => ({
        kind: "project" as const,
        project: p,
        items: itemsByProject[p.id] ?? [],
        milestones: milestonesByProject[p.id] ?? [],
      })),
    ].sort((a, b) => {
      const dateA = a.kind === "request" ? a.request.created_at : a.project.created_at;
      const dateB = b.kind === "request" ? b.request.created_at : b.project.created_at;
      return dateB.localeCompare(dateA);
    });

    const proofItems = pendingApproval;
    const hasActions = proofItems.length > 0;
    const isEmpty = jobs.length === 0 && deliveredFiles.length === 0;

    return (
      <SchoolShell activeNav="home">
        <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              My Work
            </p>
            <BodyText muted className="mt-0.5">
              {isEmpty ? "You have no active jobs." : `${jobs.length} active job${jobs.length === 1 ? "" : "s"}`}
            </BodyText>
          </div>
          <Link
            href={newRequestHref}
            className="shrink-0 inline-flex items-center rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90"
          >
            + New Job
          </Link>
        </div>

        {isEmpty ? (
          <AppSurface className="px-8 py-16 text-center">
            <p className="text-[16px] font-semibold text-[var(--foreground)]">No jobs yet</p>
            <BodyText muted className="mt-1.5 mb-7 max-w-sm mx-auto">
              Submit your first job request and we'll get to work. You can track progress, review proofs, and download final files — all in one place.
            </BodyText>
            <Link
              href={newRequestHref}
              className="inline-flex items-center rounded-2xl bg-[var(--primary)] px-6 py-3 text-[14px] font-semibold text-white transition hover:opacity-90"
            >
              Submit a job
            </Link>
          </AppSurface>
        ) : (
          <div className="space-y-5">

            {/* Action needed */}
            {hasActions && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-amber-600">
                  Action needed
                </p>
                <div className="mt-3 space-y-3">
                  {proofItems.map((item) => {
                    const project = activeProjects.find((p) => p.id === item.project_id);
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-amber-900 truncate">
                            {item.title}
                          </p>
                          {project && (
                            <p className="mt-0.5 text-[12px] text-amber-700">{project.title}</p>
                          )}
                        </div>
                        <Link
                          href={`/items/${item.id}?workspace=${encodeURIComponent(workspaceId)}&project=${item.project_id}`}
                          className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-amber-700 transition"
                        >
                          Review proof →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Production calendar — upcoming reminders */}
            {subscriptions.filter((s: ProductionSubscription) => s.enabled).length > 0 && (
              <AppSurface className="px-6 py-5 sm:px-8">
                <p className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  Production Calendar
                </p>
                <div className="mt-3 space-y-2">
                  {subscriptions
                    .filter((s: ProductionSubscription) => s.enabled)
                    .map((sub: ProductionSubscription) => {
                      if (sub.subscription_type === "newsletter_monthly") {
                        const today = new Date();
                        const dayOfMonth = today.getDate();
                        const next = nextMonthName(today);
                        const nextReminder =
                          dayOfMonth < 15
                            ? `${monthName(today.getMonth() + 1)} 15 — content gathering`
                            : dayOfMonth < 25
                              ? `${monthName(today.getMonth() + 1)} 25 — content deadline`
                              : `${next} 15 — content gathering`;
                        return (
                          <div key={sub.id} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[13px] text-[var(--text-muted)]">📅</span>
                              <span className="text-[13px] text-[var(--foreground)]">
                                Monthly Newsletter
                              </span>
                            </div>
                            <span className="shrink-0 text-[12px] text-[var(--text-muted)]">
                              Next: {nextReminder}
                            </span>
                          </div>
                        );
                      }

                      if (!sub.delivery_month) return null;
                      const kickoff = getCatalogKickoffDate(
                        sub.delivery_month,
                        sub.delivery_day,
                        sub.kickoff_lead_days
                      );
                      const kickoffLabel = kickoff.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                      const deliveryLabel = monthName(sub.delivery_month);
                      return (
                        <div key={sub.id} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[13px] text-[var(--text-muted)]">📅</span>
                            <span className="text-[13px] text-[var(--foreground)]">
                              {SUBSCRIPTION_LABELS[sub.subscription_type]}
                            </span>
                          </div>
                          <span className="shrink-0 text-[12px] text-[var(--text-muted)]">
                            Kickoff {kickoffLabel} · Delivery {deliveryLabel}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </AppSurface>
            )}

            {/* Job cards — responsive grid */}
            {jobs.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {jobs.map((job) => {
                  if (job.kind === "request") {
                    const statusKey = job.request.status;
                    const label = STATUS_LABEL[statusKey] ?? formatLabel(statusKey);
                    const color = STATUS_COLOR[statusKey] ?? "text-[var(--text-muted)]";
                    const typeLabel = formatLabel(job.request.request_type);
                    const date = formatDate(job.request.created_at);
                    return (
                      <Link
                        key={job.request.id}
                        href={`/requests/${job.request.id}?workspace=${encodeURIComponent(workspaceId)}`}
                        className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-5 hover:border-[var(--primary)] transition"
                      >
                        <p className="truncate text-[15px] font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)]">
                          {job.request.title}
                        </p>
                        <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                          {typeLabel} · Submitted {date}
                        </p>
                        <div className="mt-3 pt-3 border-t border-[var(--border)]">
                          <span className={`text-[12px] font-medium ${color}`}>{label}</span>
                        </div>
                      </Link>
                    );
                  }

                  const stage = projectStage(job.items);
                  const label = STATUS_LABEL[stage] ?? formatLabel(stage);
                  const color = STAGE_COLOR[stage] ?? "text-[var(--text-muted)]";
                  const completed = job.milestones.filter((m) => m.milestone_status === "completed").length;
                  const total = job.milestones.length;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  const typeLabel = formatLabel(job.project.workflow_family);
                  const date = formatDate(job.project.created_at);

                  // Next checkpoint the school is waiting for
                  const nextMilestone = nextVisibleMilestone(job.milestones);

                  // "Last updated" signal — only shown during production (not review/delivered)
                  const daysAgo = daysSinceActivity(job.project, job.items);
                  const showStaleHint = stage === "production" && daysAgo >= 2;

                  return (
                    <Link
                      key={job.project.id}
                      href={`/projects/${job.project.id}?workspace=${encodeURIComponent(workspaceId)}`}
                      className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-5 hover:border-[var(--primary)] transition"
                    >
                      <p className="truncate text-[15px] font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)]">
                        {job.project.title}
                      </p>
                      <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                        {typeLabel} · Started {date}
                      </p>
                      <div className="mt-auto pt-3 border-t border-[var(--border)] mt-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-[12px] font-medium ${color}`}>{label}</span>
                          {total > 0 && (
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {completed}/{total} steps
                            </span>
                          )}
                        </div>
                        {total > 0 && (
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                            <div
                              className="h-full rounded-full bg-[var(--primary)] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                        {/* Next school-visible checkpoint */}
                        {nextMilestone?.due_date && stage !== "delivered" && (
                          <p className="mt-2 text-[11px] text-[var(--text-muted)] truncate">
                            Next: {nextMilestone.title.length > 38
                              ? nextMilestone.title.slice(0, 38) + "…"
                              : nextMilestone.title
                            } · {formatDate(nextMilestone.due_date)}
                          </p>
                        )}
                        {/* Stale project signal — reassures school work is ongoing */}
                        {showStaleHint && (
                          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                            {daysAgo === 1
                              ? "Updated yesterday — still in production"
                              : `Updated ${daysAgo} days ago — still in production`}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Delivered files */}
            {deliveredFiles.length > 0 && (
              <AppSurface className="px-6 py-6 sm:px-8">
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  Your Files
                </p>
                <BodyText muted className="mt-0.5">Completed deliverables ready to download.</BodyText>
                <div className="mt-4 space-y-3">
                  {deliveredFiles.map((f) => f && (
                    <div key={f.item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-emerald-900">
                          {f.item.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-emerald-700">
                          {f.project?.title}{f.item.delivered_at ? ` · Delivered ${formatDate(f.item.delivered_at)}` : ""}
                        </p>
                      </div>
                      {f.signedUrl ? (
                        <a
                          href={f.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          Download
                        </a>
                      ) : (
                        <Link
                          href={`/items/${f.item.id}?workspace=${encodeURIComponent(workspaceId)}&project=${f.item.project_id}`}
                          className="shrink-0 text-[13px] font-medium text-emerald-700 hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </AppSurface>
            )}

          </div>
        )}
        </div>
      </SchoolShell>
    );
  }

  // ─── Internal dashboard ───────────────────────────────────────────────────────
  return (
    <ClientShell activeNav="home">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Overview
          </p>
          {workspaceId && (
            <BodyText muted className="mt-0.5">
              {openRequests.length} open {openRequests.length === 1 ? "request" : "requests"},{" "}
              {activeProjects.length} active {activeProjects.length === 1 ? "project" : "projects"}
            </BodyText>
          )}
        </div>
        <Link
          href={newRequestHref}
          className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90"
        >
          New Request
        </Link>
      </div>

      {openRequests.length === 0 && activeProjects.length === 0 ? (
        <AppSurface className="px-8 py-14 text-center">
          <p className="text-base font-medium text-[var(--foreground)]">No active work yet</p>
          <BodyText muted className="mt-1 mb-6">Submit the first request to get started.</BodyText>
          <Link
            href={newRequestHref}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90"
          >
            Submit a request
          </Link>
        </AppSurface>
      ) : (
        <div className="space-y-5">

          {/* Needs attention — client_review requests */}
          {needsAttention.length > 0 && (
            <AppSurface className="px-6 py-6 sm:px-8">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-amber-600">
                Needs your attention
              </p>
              <div className="mt-3 divide-y divide-[var(--border)]">
                {needsAttention.map((request) => (
                  <Link
                    key={request.id}
                    href={`/requests/${request.id}?workspace=${encodeURIComponent(workspaceId)}`}
                    className="group flex items-center gap-4 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                        {request.title}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                        {formatLabel(request.request_type)}
                      </p>
                    </div>
                    <Badge>Ready for review</Badge>
                  </Link>
                ))}
              </div>
            </AppSurface>
          )}

          {/* Deliverables in review across all projects */}
          {pendingApproval.length > 0 && (
            <AppSurface className="px-6 py-6 sm:px-8">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                Awaiting client approval
              </p>
              <div className="mt-3 divide-y divide-[var(--border)]">
                {pendingApproval.map((item) => {
                  const project = activeProjects.find((p) => p.id === item.project_id);
                  return (
                    <Link
                      key={item.id}
                      href={`/items/${item.id}?workspace=${encodeURIComponent(workspaceId)}&project=${item.project_id}`}
                      className="group flex items-center gap-4 py-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                          {item.title}
                        </p>
                        {project && (
                          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{project.title}</p>
                        )}
                      </div>
                      <Badge>In Review</Badge>
                    </Link>
                  );
                })}
              </div>
            </AppSurface>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            {/* Open requests */}
            <AppSurface className="px-6 py-6 sm:px-8">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  Open Requests
                </p>
                <Link
                  href={`/requests?workspace=${encodeURIComponent(workspaceId)}`}
                  className="text-[13px] text-[var(--primary)] hover:underline"
                >
                  View all
                </Link>
              </div>
              {inProgress.length === 0 ? (
                <BodyText muted className="mt-4">No requests in progress.</BodyText>
              ) : (
                <div className="mt-3 divide-y divide-[var(--border)]">
                  {inProgress.slice(0, 6).map((request) => (
                    <Link
                      key={request.id}
                      href={`/requests/${request.id}?workspace=${encodeURIComponent(workspaceId)}`}
                      className="group flex items-center gap-4 py-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                          {request.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                          {formatLabel(request.request_type)}
                        </p>
                      </div>
                      <span className={`text-[12px] font-medium ${statusColor(request.status)}`}>
                        {formatLabel(request.status)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </AppSurface>

            {/* Active projects */}
            <AppSurface className="px-6 py-6 sm:px-8">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  Active Projects
                </p>
                <Link
                  href={`/projects?workspace=${encodeURIComponent(workspaceId)}`}
                  className="text-[13px] text-[var(--primary)] hover:underline"
                >
                  View all
                </Link>
              </div>
              {activeProjects.length === 0 ? (
                <BodyText muted className="mt-4">No projects in production yet.</BodyText>
              ) : (
                <div className="mt-3 divide-y divide-[var(--border)]">
                  {activeProjects.slice(0, 6).map((project) => {
                    const milestones = milestonesByProject[project.id] ?? [];
                    const completed = milestones.filter((m) => m.status === "completed").length;
                    const total = milestones.length;
                    return (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}?workspace=${encodeURIComponent(workspaceId)}`}
                        className="group block py-3.5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="truncate text-[14px] font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                            {project.title}
                          </p>
                          <Badge>{formatLabel(project.status)}</Badge>
                        </div>
                        {total > 0 && (
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
                            <div
                              className="h-full rounded-full bg-[var(--primary)] transition-all"
                              style={{ width: `${Math.round((completed / total) * 100)}%` }}
                            />
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </AppSurface>
          </div>
        </div>
      )}
    </ClientShell>
  );
}
