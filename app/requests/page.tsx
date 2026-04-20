import Link from "next/link";
import {
  AppSurface,
  Badge,
  BodyText,
  Button,
  SectionTitle,
} from "@globalcloudr/canopy-ui";

import ClientShell from "@/app/_components/client-shell";
import { listRequests } from "@/lib/create-data";

type RequestsPageProps = {
  searchParams: Promise<{ workspace?: string | string[]; filter?: string | string[] }>;
};

const OPEN_REQUEST_STATUSES = [
  "submitted",
  "in_progress",
  "client_review",
] as const;

function getFilterValue(filterParam: string | string[] | undefined) {
  const rawValue =
    typeof filterParam === "string"
      ? filterParam
      : Array.isArray(filterParam)
        ? filterParam[0] ?? "active"
        : "active";

  return rawValue === "all" ? "all" : "active";
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function RequestsPage({
  searchParams,
}: RequestsPageProps) {
  const params = await searchParams;
  const workspaceParam = params.workspace;
  const currentFilter = getFilterValue(params.filter);
  const workspaceId =
    typeof workspaceParam === "string"
      ? workspaceParam
      : Array.isArray(workspaceParam)
        ? workspaceParam[0] ?? ""
        : "";

  const requests = workspaceId
    ? await listRequests(
        workspaceId,
        currentFilter === "active" ? [...OPEN_REQUEST_STATUSES] : undefined
      )
    : [];

  const newRequestHref = workspaceId
    ? `/requests/new?workspace=${encodeURIComponent(workspaceId)}`
    : "/requests/new";
  const activeHref = workspaceId
    ? `/requests?workspace=${encodeURIComponent(workspaceId)}&filter=active`
    : "/requests?filter=active";
  const allHref = workspaceId
    ? `/requests?workspace=${encodeURIComponent(workspaceId)}&filter=all`
    : "/requests?filter=all";

  return (
    <ClientShell activeNav="requests">
      <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionTitle>Requests</SectionTitle>
            <BodyText muted className="mt-1">
              Review incoming work, track progress, and move requests toward
              delivery.
            </BodyText>
          </div>
          <Button asChild variant="accent">
            <Link href={newRequestHref}>New Request</Link>
          </Button>
        </div>

        <div className="mt-5 flex gap-1">
          <Button
            asChild
            variant={currentFilter === "active" ? "accent" : "secondary"}
          >
            <Link href={activeHref}>Active</Link>
          </Button>
          <Button
            asChild
            variant={currentFilter === "all" ? "accent" : "secondary"}
          >
            <Link href={allHref}>All</Link>
          </Button>
        </div>

        <div className="mt-6">
          {!workspaceId ? (
            <BodyText muted>Select a workspace to view requests.</BodyText>
          ) : requests.length === 0 ? (
            <BodyText muted>
              {currentFilter === "active"
                ? "No open requests for this workspace."
                : "No requests found for this workspace."}
            </BodyText>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}?workspace=${encodeURIComponent(workspaceId)}`}
                  className="group flex items-center gap-4 py-4 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)] group-hover:text-[var(--primary)]">
                      {request.title}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
                      {formatLabel(request.request_type)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Badge>{formatLabel(request.status)}</Badge>
                  </div>
                  <p className="hidden shrink-0 text-[13px] text-[var(--text-muted)] sm:block">
                    {formatDate(request.created_at)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </AppSurface>
    </ClientShell>
  );
}
