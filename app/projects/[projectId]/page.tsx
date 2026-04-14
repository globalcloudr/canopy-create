import Link from "next/link";
import { AppSurface, Badge, BodyText, Button, Input } from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";
import MilestoneChecklist from "@/app/_components/milestone-checklist";
import ItemStatusSelect from "@/app/_components/item-status-select";
import {
  getProject,
  listMilestones,
  listProjectItems,
} from "@/lib/create-data";
import {
  addItemAction,
  addMilestoneAction,
  changeProjectStatus,
} from "@/app/projects/actions";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
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

const PROJECT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
] as const;

const ITEM_STATUSES = ["pending", "in_progress", "in_review", "completed"] as const;

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspaceParam = resolvedSearchParams.workspace;
  const workspaceId =
    typeof workspaceParam === "string"
      ? workspaceParam
      : Array.isArray(workspaceParam)
        ? workspaceParam[0] ?? ""
        : "";

  if (!workspaceId) {
    return (
      <ClientShell activeNav="projects">
        <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
          <BodyText muted>Select a workspace to view this project.</BodyText>
        </AppSurface>
      </ClientShell>
    );
  }

  const [project, milestones, items] = await Promise.all([
    getProject(workspaceId, projectId),
    listMilestones(workspaceId, projectId),
    listProjectItems(workspaceId, projectId),
  ]);

  const originRequestHref = project.origin_request_id
    ? `/requests/${project.origin_request_id}?workspace=${encodeURIComponent(workspaceId)}`
    : null;

  const addMilestoneForProject = addMilestoneAction.bind(null, workspaceId, project.id);
  const addItemForProject = addItemAction.bind(null, workspaceId, project.id, items.length);

  const completedMilestones = milestones.filter((m) => m.status === "completed").length;

  return (
    <ClientShell activeNav="projects">
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={`/projects?workspace=${encodeURIComponent(workspaceId)}`}
              className="text-[12px] text-[var(--text-muted)] hover:text-[var(--foreground)]"
            >
              ← Projects
            </Link>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              {project.title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Badge>{formatLabel(project.status)}</Badge>
              <span className="text-[13px] text-[var(--text-muted)]">
                {formatLabel(project.workflow_family)}
              </span>
              <span className="text-[13px] text-[var(--text-muted)]">
                Started {formatDate(project.created_at)}
              </span>
              {originRequestHref ? (
                <Link
                  href={originRequestHref}
                  className="text-[13px] text-[var(--primary)] hover:underline"
                >
                  View origin request
                </Link>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {PROJECT_STATUS_OPTIONS.map(({ value, label }) => {
              const action = changeProjectStatus.bind(null, workspaceId, project.id, value);
              return (
                <form key={value} action={action}>
                  <Button
                    type="submit"
                    variant={project.status === value ? "primary" : "secondary"}
                  >
                    {label}
                  </Button>
                </form>
              );
            })}
          </div>
        </div>

        {/* Production steps */}
        <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              Production Steps
            </p>
            {milestones.length > 0 && (
              <span className="text-[13px] text-[var(--text-muted)]">
                {completedMilestones} / {milestones.length} complete
              </span>
            )}
          </div>

          {milestones.length > 0 && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-all"
                style={{
                  width: `${Math.round((completedMilestones / milestones.length) * 100)}%`,
                }}
              />
            </div>
          )}

          <div className="mt-5">
            <MilestoneChecklist
              workspaceId={workspaceId}
              projectId={project.id}
              milestones={milestones}
            />
          </div>

          <form action={addMilestoneForProject} className="mt-4 flex gap-3">
            <Input name="title" placeholder="Add a step…" className="flex-1 text-sm" />
            <Button type="submit" variant="secondary">Add</Button>
          </form>
        </AppSurface>

        {/* Deliverables */}
        <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            Deliverables
          </p>
          <BodyText muted className="mt-0.5">
            Track each piece being produced, revised, and approved.
          </BodyText>

          {items.length === 0 ? (
            <BodyText muted className="mt-5">No deliverables added yet.</BodyText>
          ) : (
            <div className="mt-4 divide-y divide-[var(--border)]">
              {items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-4 py-3.5">
                  <span className="w-5 shrink-0 text-[13px] text-[var(--text-muted)]">
                    {index + 1}
                  </span>
                  <p className="min-w-0 flex-1 text-[14px] font-medium text-[var(--foreground)]">
                    {item.title}
                  </p>
                  <ItemStatusSelect
                    workspaceId={workspaceId}
                    projectId={project.id}
                    itemId={item.id}
                    currentStatus={item.status}
                    statuses={[...ITEM_STATUSES]}
                  />
                </div>
              ))}
            </div>
          )}

          <form action={addItemForProject} className="mt-4 flex gap-3">
            <Input name="title" placeholder="Add a deliverable…" className="flex-1 text-sm" />
            <Button type="submit" variant="secondary">Add</Button>
          </form>
        </AppSurface>

      </div>
    </ClientShell>
  );
}
