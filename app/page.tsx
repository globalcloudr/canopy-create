import Link from "next/link";
import { AppSurface, Badge, BodyText } from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";
import { listProjects, listRequests } from "@/lib/create-data";

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

  const [activeProjects, openRequests] = workspaceId
    ? await Promise.all([
        listProjects(workspaceId, [...ACTIVE_PROJECT_STATUSES]),
        listRequests(workspaceId, [...OPEN_REQUEST_STATUSES]),
      ])
    : [[], []];

  const needsAttention = openRequests.filter(
    (r) => r.status === "client_review"
  );
  const inProgress = openRequests.filter(
    (r) => r.status === "in_progress" || r.status === "submitted"
  );

  const newRequestHref = workspaceId
    ? `/requests/new?workspace=${encodeURIComponent(workspaceId)}`
    : "/requests/new";

  return (
    <ClientShell activeNav="home">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Overview
          </p>
          {workspaceId && (
            <BodyText muted className="mt-0.5">
              {openRequests.length} open{" "}
              {openRequests.length === 1 ? "request" : "requests"},{" "}
              {activeProjects.length} active{" "}
              {activeProjects.length === 1 ? "project" : "projects"}
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

      {!workspaceId ? (
        <AppSurface className="px-8 py-12 text-center">
          <p className="text-base font-medium text-[var(--foreground)]">
            No workspace selected
          </p>
          <BodyText muted className="mt-1">
            Select a workspace from the sidebar to get started.
          </BodyText>
        </AppSurface>
      ) : openRequests.length === 0 && activeProjects.length === 0 ? (
        /* Empty state */
        <AppSurface className="px-8 py-14 text-center">
          <p className="text-base font-medium text-[var(--foreground)]">
            No active work yet
          </p>
          <BodyText muted className="mt-1 mb-6">
            Submit your first request to get started.
          </BodyText>
          <Link
            href={newRequestHref}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90"
          >
            Submit a request
          </Link>
        </AppSurface>
      ) : (
        <div className="space-y-5">
          {/* Needs your attention */}
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
                <BodyText muted className="mt-4">
                  No requests in progress.
                </BodyText>
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
                <BodyText muted className="mt-4">
                  No projects in production yet.
                </BodyText>
              ) : (
                <div className="mt-3 divide-y divide-[var(--border)]">
                  {activeProjects.slice(0, 6).map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}?workspace=${encodeURIComponent(workspaceId)}`}
                      className="group flex items-center gap-4 py-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                          {project.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                          {formatLabel(project.workflow_family)}
                        </p>
                      </div>
                      <Badge>{formatLabel(project.status)}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </AppSurface>
          </div>
        </div>
      )}
    </ClientShell>
  );
}
