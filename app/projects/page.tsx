import Link from "next/link";
import {
  AppSurface,
  Badge,
  BodyText,
  Button,
  SectionTitle,
} from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";
import { listProjects } from "@/lib/create-data";

type ProjectsPageProps = {
  searchParams: Promise<{ workspace?: string | string[]; filter?: string | string[] }>;
};

const ACTIVE_PROJECT_STATUSES = ["draft", "active"] as const;

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

  const projects = workspaceId
    ? await listProjects(
        workspaceId,
        currentFilter === "active" ? [...ACTIVE_PROJECT_STATUSES] : undefined
      )
    : [];

  const activeHref = workspaceId
    ? `/projects?workspace=${encodeURIComponent(workspaceId)}&filter=active`
    : "/projects?filter=active";
  const allHref = workspaceId
    ? `/projects?workspace=${encodeURIComponent(workspaceId)}&filter=all`
    : "/projects?filter=all";

  return (
    <ClientShell activeNav="projects">
      <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
        <SectionTitle>Projects</SectionTitle>
        <BodyText muted className="mt-1">
          Active production work from intake through delivery.
        </BodyText>

        <div className="mt-5 flex gap-1">
          <Button
            asChild
            variant={currentFilter === "active" ? "primary" : "secondary"}
          >
            <Link href={activeHref}>Active</Link>
          </Button>
          <Button
            asChild
            variant={currentFilter === "all" ? "primary" : "secondary"}
          >
            <Link href={allHref}>All</Link>
          </Button>
        </div>

        <div className="mt-6">
          {!workspaceId ? (
            <BodyText muted>Select a workspace to view projects.</BodyText>
          ) : projects.length === 0 ? (
            <BodyText muted>
              {currentFilter === "active"
                ? "No active projects for this workspace."
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
