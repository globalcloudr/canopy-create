import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { AppSurface, Badge, BodyText, Button, Input } from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";
import MilestoneChecklist from "@/app/_components/milestone-checklist";
import ItemStatusSelect from "@/app/_components/item-status-select";
import ActivityFeed from "@/app/_components/activity-feed";
import {
  getProject,
  listMilestones,
  listProjectItems,
  listProjectActivity,
} from "@/lib/create-data";
import {
  addItemAction,
  addMilestoneAction,
  changeProjectStatus,
} from "@/app/projects/actions";
import { getServerActionAccess } from "@/lib/server-auth";
import { canManageProjects, canUpdateDeliverables } from "@/lib/create-roles";

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

  const [{ role, isPlatformOperator }, project, milestones, items, activityEvents] = await Promise.all([
    getServerActionAccess(workspaceId),
    getProject(workspaceId, projectId),
    listMilestones(workspaceId, projectId),
    listProjectItems(workspaceId, projectId),
    listProjectActivity(workspaceId, projectId),
  ]);

  const canManage = canManageProjects(role, isPlatformOperator);
  const canUpdateStatus = canUpdateDeliverables(role, isPlatformOperator);

  // Build delivered files list for client view
  const deliveredItems = items.filter((item) => !!item.delivered_at);
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const deliveredFiles = await Promise.all(
    deliveredItems.map(async (item) => {
      if (!item.final_version_id) return { item, signedUrl: null, filename: null };
      const { data: version } = await serviceClient
        .from("create_item_versions")
        .select("file_url, version_label")
        .eq("id", item.final_version_id)
        .maybeSingle();
      if (!version?.file_url) return { item, signedUrl: null, filename: null };
      const { data } = await serviceClient.storage
        .from("originals")
        .createSignedUrl(version.file_url, 3600);
      return {
        item,
        signedUrl: data?.signedUrl ?? null,
        filename: version.file_url.split("/").pop() ?? null,
        versionLabel: version.version_label,
      };
    })
  );

  // Resolve actor display names for activity feed
  const actorIds = [...new Set(activityEvents.map((e) => e.actor_user_id))];
  const activityNameMap: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("user_id,full_name,display_name")
      .in("user_id", actorIds);
    for (const p of profiles ?? []) {
      activityNameMap[p.user_id] = p.display_name ?? p.full_name ?? "Team member";
    }
  }

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

          {canManage && (
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
          )}
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
              canToggle={canManage}
            />
          </div>

          {canManage && (
            <form action={addMilestoneForProject} className="mt-4 flex gap-3">
              <Input name="title" placeholder="Add a step…" className="flex-1 text-sm" />
              <Button type="submit" variant="secondary">Add</Button>
            </form>
          )}
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
                  <Link
                    href={`/items/${item.id}?workspace=${encodeURIComponent(workspaceId)}&project=${project.id}`}
                    className="min-w-0 flex-1 text-[14px] font-medium text-[var(--foreground)] hover:text-[var(--primary)] hover:underline"
                  >
                    {item.title}
                  </Link>
                  {item.delivered_at ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                      Delivered
                    </span>
                  ) : canUpdateStatus ? (
                    <ItemStatusSelect
                      workspaceId={workspaceId}
                      projectId={project.id}
                      itemId={item.id}
                      currentStatus={item.status}
                      statuses={[...ITEM_STATUSES]}
                    />
                  ) : (
                    <span className="text-[13px] font-medium text-[var(--text-muted)]">
                      {formatLabel(item.status)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {canManage && (
            <form action={addItemForProject} className="mt-4 flex gap-3">
              <Input name="title" placeholder="Add a deliverable…" className="flex-1 text-sm" />
              <Button type="submit" variant="secondary">Add</Button>
            </form>
          )}
        </AppSurface>

        {/* Delivered Files — shown when at least one deliverable is delivered */}
        {deliveredFiles.length > 0 && (
          <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              Delivered Files
            </p>
            <BodyText muted className="mt-0.5">
              Final files ready for download.
            </BodyText>
            <div className="mt-4 divide-y divide-[var(--border)]">
              {deliveredFiles.map(({ item, signedUrl, versionLabel }) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[var(--foreground)]">{item.title}</p>
                    {versionLabel && (
                      <p className="text-[12px] text-[var(--text-muted)]">{versionLabel}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                      Delivered
                    </span>
                    {signedUrl ? (
                      <a
                        href={signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--border)] transition"
                      >
                        Download
                      </a>
                    ) : (
                      <Link
                        href={`/items/${item.id}?workspace=${encodeURIComponent(workspaceId)}&project=${project.id}`}
                        className="text-[12px] text-[var(--primary)] hover:underline"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AppSurface>
        )}

        {/* Activity feed */}
        <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            Activity
          </p>
          <BodyText muted className="mt-0.5">
            A timeline of actions taken on this project.
          </BodyText>
          <div className="mt-5">
            <ActivityFeed events={activityEvents} nameMap={activityNameMap} />
          </div>
        </AppSurface>

      </div>
    </ClientShell>
  );
}
