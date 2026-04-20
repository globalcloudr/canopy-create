import Link from "next/link";
import {
  AppSurface,
  Badge,
  BodyText,
  Button,
  SectionTitle,
} from "@globalcloudr/canopy-ui";

import ClientShell from "@/app/_components/client-shell";
import { listProjects } from "@/lib/create-data";

type ProjectsPageProps = {
  searchParams: Promise<{ workspace?: string | string[]; filter?: string | string[] }>;
};

const ACTIVE_PROJECT_STATUSES = ["draft", "active"] as const;
const ARCHIVED_PROJECT_STATUSES = ["archived"] as const;
const COMPLETED_PROJECT_STATUSES = ["completed"] as const;

type FilterValue = "active" | "archived" | "all";

function getFilterValue(filterParam: string | string[] | undefined): FilterValue {
  const rawValue =
    typeof filterParam === "string"
      ? filterParam
      : Array.isArray(filterParam)
        ? filterParam[0] ?? "active"
        : "active";

  if (rawValue === "archived") return "archived";
  if (rawValue === "all") return "all";
  return "active";
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

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const params = await searchParams;
  const workspaceParam = params.workspace;
  const currentFilter = getFilterValue(params.filter);
  const workspaceId =
    typeof workspaceParam === "string"
      ? workspaceParam
      : Array.isArray(workspaceParam)
        ? workspaceParam[0] ?? ""
        : "";

  const statusFilter =
    currentFilter === "active"
      ? [...ACTIVE_PROJECT_STATUSES]
      : currentFilter === "archived"
        ? [...ARCHIVED_PROJECT_STATUSES, ...COMPLETED_PROJECT_STATUSES]
        : undefined;

  const projects = workspaceId
    ? await listProjects(workspaceId, statusFilter)
    : [];

  const baseHref = workspaceId
    ? `/projects?workspace=${encodeURIComponent(workspaceId)}`
    : "/projects";
  const FILTER_TABS: { value: FilterValue; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "archived", label: "Archived" },
    { value: "all", label: "All" },
  ];

  return (
    <ClientShell activeNav="projects">
      <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
        <SectionTitle>Projects</SectionTitle>
        <BodyText muted className="mt-1">
          Active production work from intake through delivery.
        </BodyText>

        <div className="mt-5 flex gap-1">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.value}
              asChild
              variant={currentFilter === tab.value ? "primary" : "secondary"}
            >
              <Link href={`${baseHref}&filter=${tab.value}`}>{tab.label}</Link>
            </Button>
          ))}
        </div>

        <div className="mt-6">
          {!workspaceId ? (
            <BodyText muted>Select a workspace to view projects.</BodyText>
          ) : projects.length === 0 ? (
            <BodyText muted>
              {currentFilter === "active"
                ? "No active projects for this workspace."
                : currentFilter === "archived"
                  ? "No archived projects."
                  : "No projects found for this workspace."}
            </BodyText>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}?workspace=${encodeURIComponent(workspaceId)}`}
                  className="group flex items-center gap-4 py-4 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)] group-hover:text-[var(--primary)]">
                      {project.title}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
                      {formatLabel(project.workflow_family)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Badge>{formatLabel(project.status)}</Badge>
                  </div>
                  <p className="hidden shrink-0 text-[13px] text-[var(--text-muted)] sm:block">
                    {formatDate(project.created_at)}
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
