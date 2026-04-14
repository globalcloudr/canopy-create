import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { AppSurface, Badge, BodyText } from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";
import {
  listProjects,
  listRequests,
  listMilestonesForProjects,
  listItemsForProjects,
} from "@/lib/create-data";
import { getServerActionAccess } from "@/lib/server-auth";
import { isInternalRole, isClientRole } from "@/lib/create-roles";

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

  const { role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  const isClient = isClientRole(role) && !isPlatformOperator;
  const isInternal = isInternalRole(role) || isPlatformOperator;

  const [activeProjects, openRequests] = await Promise.all([
    listProjects(workspaceId, [...ACTIVE_PROJECT_STATUSES]),
    listRequests(workspaceId, [...OPEN_REQUEST_STATUSES]),
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

  // ─── Client dashboard ─────────────────────────────────────────────────────────
  if (isClient) {
    return (
      <ClientShell activeNav="home">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Your Work
          </p>
          <Link
            href={newRequestHref}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90"
          >
            New Request
          </Link>
        </div>

        {activeProjects.length === 0 && openRequests.length === 0 ? (
          <AppSurface className="px-8 py-14 text-center">
            <p className="text-base font-medium text-[var(--foreground)]">No active work yet</p>
            <BodyText muted className="mt-1 mb-6">Submit your first request to get started.</BodyText>
            <Link
              href={newRequestHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90"
            >
              Submit a request
            </Link>
          </AppSurface>
        ) : (
          <div className="space-y-5">

            {/* Needs review */}
            {pendingApproval.length > 0 && (
              <AppSurface className="px-6 py-6 sm:px-8">
                <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-amber-600">
                  Awaiting your review
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
                        <Badge>Review proof</Badge>
                      </Link>
                    );
                  })}
                </div>
              </AppSurface>
            )}

            {/* Active projects with progress */}
            {activeProjects.length > 0 && (
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
                <div className="mt-3 divide-y divide-[var(--border)]">
                  {activeProjects.map((project) => {
                    const milestones = milestonesByProject[project.id] ?? [];
                    const items = itemsByProject[project.id] ?? [];
                    const completed = milestones.filter((m) => m.status === "completed").length;
                    const total = milestones.length;
                    const deliveredCount = items.filter((i) => !!i.delivered_at).length;
                    const inReviewCount = items.filter((i) => i.status === "in_review" && !i.delivered_at).length;

                    return (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}?workspace=${encodeURIComponent(workspaceId)}`}
                        className="group block py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                              {project.title}
                            </p>
                            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                              {formatLabel(project.workflow_family)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            {inReviewCount > 0 && (
                              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                                {inReviewCount} for review
                              </span>
                            )}
                            {deliveredCount > 0 && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                                {deliveredCount} delivered
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Milestone progress */}
                        {total > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                              <span>Production progress</span>
                              <span>{completed} / {total} steps</span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                              <div
                                className="h-full rounded-full bg-[var(--primary)] transition-all"
                                style={{ width: `${Math.round((completed / total) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </AppSurface>
            )}

            {/* Open requests */}
            {openRequests.length > 0 && (
              <AppSurface className="px-6 py-6 sm:px-8">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                    Your Requests
                  </p>
                  <Link
                    href={`/requests?workspace=${encodeURIComponent(workspaceId)}`}
                    className="text-[13px] text-[var(--primary)] hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <div className="mt-3 divide-y divide-[var(--border)]">
                  {openRequests.slice(0, 5).map((request) => (
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
              </AppSurface>
            )}

            {/* Delivered files */}
            {deliveredFiles.length > 0 && (
              <AppSurface className="px-6 py-6 sm:px-8">
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  Delivered Files
                </p>
                <BodyText muted className="mt-0.5">Ready to download.</BodyText>
                <div className="mt-3 divide-y divide-[var(--border)]">
                  {deliveredFiles.map((f) => f && (
                    <div key={f.item.id} className="flex items-center justify-between gap-4 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-[var(--foreground)]">
                          {f.item.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                          {f.project?.title} · {f.item.delivered_at ? formatDate(f.item.delivered_at) : ""}
                        </p>
                      </div>
                      {f.signedUrl ? (
                        <a
                          href={f.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--border)] transition"
                        >
                          Download
                        </a>
                      ) : (
                        <Link
                          href={`/items/${f.item.id}?workspace=${encodeURIComponent(workspaceId)}&project=${f.item.project_id}`}
                          className="shrink-0 text-[12px] text-[var(--primary)] hover:underline"
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
      </ClientShell>
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
