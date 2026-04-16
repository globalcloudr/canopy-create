import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { AppSurface, Badge, BodyText, Button, Input } from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";
import SchoolShell from "@/app/_components/school-shell";
import ItemStatusSelect from "@/app/_components/item-status-select";
import ActivityFeed from "@/app/_components/activity-feed";
import ProjectTabs from "@/app/_components/project-tabs";
import ProjectMessageComposer from "@/app/_components/project-message-composer";
import ProjectBriefTab from "@/app/_components/project-brief-tab";
import ProjectFilesTab from "@/app/_components/project-files-tab";
import {
  getProject,
  getRequest,
  listProjectItems,
  listProjectActivity,
  listMilestones,
  listVersionsForItems,
  listApprovalsForItems,
  listRequestAttachments,
} from "@/lib/create-data";
import MilestoneTimeline from "@/app/_components/milestone-timeline";
import MilestoneAddForm from "@/app/_components/milestone-add-form";
import DeleteProjectButton from "@/app/_components/delete-project-button";
import StartNextCycleButton from "@/app/_components/start-next-cycle-button";
import {
  addItemAction,
  changeProjectStatus,
  deleteProjectAction,
} from "@/app/projects/actions";
import { getServerActionAccess } from "@/lib/server-auth";
import { canManageProjects, canUpdateDeliverables, isClientRole } from "@/lib/create-roles";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ workspace?: string | string[]; tab?: string | string[] }>;
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

  const tabParam = resolvedSearchParams.tab;
  const rawTab = typeof tabParam === "string" ? tabParam : Array.isArray(tabParam) ? tabParam[0] : undefined;

  if (!workspaceId) {
    return (
      <ClientShell activeNav="projects">
        <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
          <BodyText muted>Select a workspace to view this project.</BodyText>
        </AppSurface>
      </ClientShell>
    );
  }

  let role: string | null = null;
  let isPlatformOperator = false;
  try {
    ({ role, isPlatformOperator } = await getServerActionAccess(workspaceId));
  } catch {
    return <ClientShell activeNav="projects"><div /></ClientShell>;
  }

  // ─── Stage 1: Core data (parallel) ───────────────────────────────────────────
  let project: Awaited<ReturnType<typeof getProject>>;
  let items: Awaited<ReturnType<typeof listProjectItems>>;
  let activityEvents: Awaited<ReturnType<typeof listProjectActivity>>;
  let milestones: Awaited<ReturnType<typeof listMilestones>>;
  try {
    [project, items, activityEvents, milestones] = await Promise.all([
      getProject(workspaceId, projectId),
      listProjectItems(workspaceId, projectId),
      listProjectActivity(workspaceId, projectId),
      listMilestones(workspaceId, projectId),
    ]);
  } catch {
    // Project doesn't exist in this workspace (e.g. workspace was switched)
    const Shell = isClientRole(role) && !isPlatformOperator ? SchoolShell : ClientShell;
    const nav = isClientRole(role) && !isPlatformOperator ? "home" : "projects";
    return (
      <Shell activeNav={nav}>
        <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
          <BodyText muted>This project wasn't found in the current workspace.</BodyText>
        </AppSurface>
      </Shell>
    );
  }

  // ─── Stage 2: Related data (needs item IDs from stage 1) ─────────────────────
  const itemIds = items.map((i) => i.id);

  let originRequest: Awaited<ReturnType<typeof getRequest>> | null = null;
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [rawVersions, rawAttachments] = await Promise.all([
    listVersionsForItems(workspaceId, itemIds),
    project.origin_request_id
      ? listRequestAttachments(workspaceId, project.origin_request_id)
      : Promise.resolve([]),
  ]);

  // Fetch origin request (best effort)
  if (project.origin_request_id) {
    try {
      originRequest = await getRequest(workspaceId, project.origin_request_id);
    } catch {
      // not critical
    }
  }

  // ─── Generate signed URLs for all versions ────────────────────────────────────
  const versionsWithUrls = await Promise.all(
    rawVersions.map(async (v) => {
      if (!v.file_url) return { ...v, signedUrl: null };
      const { data } = await serviceClient.storage
        .from("originals")
        .createSignedUrl(v.file_url, 3600);
      return { ...v, signedUrl: data?.signedUrl ?? null };
    })
  );

  // Group versions by item
  const versionsByItem: Record<string, typeof versionsWithUrls> = {};
  for (const v of versionsWithUrls) {
    (versionsByItem[v.item_id] ??= []).push(v);
  }

  // Generate signed URLs for attachments
  const attachmentsWithUrls = await Promise.all(
    rawAttachments.map(async (att) => {
      const { data } = await serviceClient.storage
        .from("originals")
        .createSignedUrl(att.file_url, 3600);
      return { ...att, signedUrl: data?.signedUrl ?? null };
    })
  );

  // Build delivered files list
  const deliveredItems = items.filter((item) => !!item.delivered_at);
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

  // ─── Resolve actor display names ──────────────────────────────────────────────
  const allActorIds = new Set(activityEvents.map((e) => e.actor_user_id));
  for (const v of rawVersions) allActorIds.add(v.created_by);
  for (const m of milestones) {
    if (m.assignee_id) allActorIds.add(m.assignee_id);
  }
  const actorIds = [...allActorIds];
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

  const canManage = canManageProjects(role, isPlatformOperator);
  const canUpdateStatus = canUpdateDeliverables(role, isPlatformOperator);

  // Base URL for tab switching (without tab param)
  const baseUrl = `/projects/${projectId}?workspace=${encodeURIComponent(workspaceId)}`;

  // ─── School (client) view ──────────────────────────────────────────────────────
  if (isClientRole(role) && !isPlatformOperator) {
    type Stage = "received" | "production" | "review" | "delivered";
    function computeStage(): Stage {
      if (!items.length) return "received";
      if (items.every((i) => !!i.delivered_at)) return "delivered";
      if (items.some((i) => i.status === "in_review" && !i.delivered_at)) return "review";
      if (items.some((i) => i.status === "in_progress")) return "production";
      return "received";
    }
    const stage = computeStage();
    const STAGE_ORDER: Stage[] = ["received", "production", "review", "delivered"];
    const stageIdx = STAGE_ORDER.indexOf(stage);

    const STEP_LABELS = ["Received", "In Production", "Ready for Review", "Delivered"];
    const reviewItems = items.filter((i) => i.status === "in_review" && !i.delivered_at);

    const STAGE_MESSAGE: Record<string, string> = {
      received: "We've received your job and are reviewing your brief. We'll update this page once production begins.",
      production: "We're working on your job now. We'll let you know when your proof is ready to review.",
      review: "Your proof is ready — please review and let us know what you think.",
      delivered: "Your files are ready to download below.",
    };

    // Brief fields from the origin request
    const briefDetails = (originRequest?.details ?? {}) as Record<string, string | null>;
    const briefEntries = Object.entries(briefDetails).filter(
      ([, v]) => typeof v === "string" && v.trim() !== ""
    ) as [string, string][];

    // Filter milestones: school clients only see visibility=all
    const clientMilestones = milestones.filter((m) => m.visibility === "all");
    const clientMilestonesCompleted = clientMilestones.filter(
      (m) => m.milestone_status === "completed"
    ).length;

    // Find next upcoming due date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDue = clientMilestones
      .filter((m) => m.due_date && m.milestone_status !== "completed")
      .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
      .at(0);

    const SCHOOL_TABS = [
      { key: "activity", label: "Activity" },
      ...(clientMilestones.length > 0 ? [{ key: "timeline", label: "Timeline" }] : []),
      { key: "files", label: "Files" },
      { key: "brief", label: "Brief" },
    ];
    const activeTab = SCHOOL_TABS.some((t) => t.key === rawTab) ? rawTab! : "activity";

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
              {project.title}
            </p>
            <p className="mt-1 text-[14px] text-[var(--text-muted)]">
              {STAGE_MESSAGE[stage]}
            </p>
          </div>

          {/* Journey steps */}
          <div className="flex items-center gap-0">
            {STEP_LABELS.map((label, i) => {
              const isComplete = i < stageIdx;
              const isActive = i === stageIdx;
              return (
                <div key={label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-colors ${
                        isComplete
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : isActive
                            ? "border-[var(--primary)] bg-white text-[var(--primary)]"
                            : "border-[var(--border)] bg-white text-[var(--text-muted)]"
                      }`}
                    >
                      {isComplete ? "✓" : i + 1}
                    </div>
                    <span
                      className={`text-center text-[11px] font-medium leading-tight ${
                        isActive ? "text-[var(--primary)]" : isComplete ? "text-[var(--text-muted)]" : "text-[var(--border)]"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className={`mx-1 flex-1 h-0.5 mb-5 ${i < stageIdx ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Action needed — proof ready */}
          {reviewItems.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-amber-600">
                Your proof is ready
              </p>
              <div className="mt-3 space-y-3">
                {reviewItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <p className="text-[14px] font-medium text-amber-900 truncate">{item.title}</p>
                    <Link
                      href={`/items/${item.id}?workspace=${encodeURIComponent(workspaceId)}&project=${project.id}`}
                      className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-amber-700 transition"
                    >
                      Review & give feedback →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All delivered */}
          {stage === "delivered" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-center">
              <p className="text-[15px] font-semibold text-emerald-700">All done!</p>
              <p className="mt-1 text-[13px] text-emerald-600">
                Everything has been delivered. Download your files from the Files tab.
              </p>
            </div>
          )}

          {/* Two-column: main content + sidebar */}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">

            {/* Left — tabs + tab content */}
            <div className="space-y-5">
              <ProjectTabs tabs={SCHOOL_TABS} activeTab={activeTab} baseUrl={baseUrl} />

              {activeTab === "activity" && (
                <AppSurface className="px-6 py-6 sm:px-8">
                  <ProjectMessageComposer workspaceId={workspaceId} projectId={projectId} />
                  <ActivityFeed events={activityEvents} nameMap={activityNameMap} />
                </AppSurface>
              )}

              {activeTab === "timeline" && clientMilestones.length > 0 && (
                <AppSurface className="px-6 py-6 sm:px-8">
                  <MilestoneTimeline
                    workspaceId={workspaceId}
                    projectId={projectId}
                    milestones={clientMilestones}
                    nameMap={activityNameMap}
                    canEdit={false}
                  />
                </AppSurface>
              )}

              {activeTab === "files" && (
                <ProjectFilesTab
                  items={items}
                  versionsByItem={versionsByItem}
                  requestAttachments={attachmentsWithUrls}
                  deliveredFiles={deliveredFiles}
                  workspaceId={workspaceId}
                  projectId={projectId}
                />
              )}

              {activeTab === "brief" && (
                <ProjectBriefTab briefEntries={briefEntries} />
              )}
            </div>

            {/* Right — sidebar */}
            <div className="space-y-5">
              {/* Job details */}
              <AppSurface className="px-6 py-6 sm:px-8">
                <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Details
                </p>
                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-[12px] text-[var(--text-muted)]">Type</dt>
                    <dd className="mt-0.5 text-[14px] text-[var(--foreground)]">
                      {formatLabel(project.workflow_family)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-[var(--text-muted)]">Submitted</dt>
                    <dd className="mt-0.5 text-[14px] text-[var(--foreground)]">
                      {formatDate(project.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-[var(--text-muted)]">Deliverables</dt>
                    <dd className="mt-0.5 text-[14px] text-[var(--foreground)]">
                      {items.length === 0 ? "None yet" : `${deliveredItems.length} of ${items.length} delivered`}
                    </dd>
                  </div>
                  {clientMilestones.length > 0 && (
                    <div>
                      <dt className="text-[12px] text-[var(--text-muted)]">Progress</dt>
                      <dd className="mt-0.5 text-[14px] text-[var(--foreground)]">
                        {clientMilestonesCompleted} of {clientMilestones.length} steps complete
                      </dd>
                    </div>
                  )}
                  {nextDue?.due_date && (
                    <div>
                      <dt className="text-[12px] text-[var(--text-muted)]">Next milestone</dt>
                      <dd className="mt-0.5 text-[14px] text-[var(--foreground)]">
                        {formatDate(nextDue.due_date)}
                      </dd>
                    </div>
                  )}
                </dl>
              </AppSurface>

              {/* Quick links to deliverables */}
              {items.length > 0 && (
                <AppSurface className="px-6 py-6 sm:px-8">
                  <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    Deliverables
                  </p>
                  <div className="mt-3 divide-y divide-[var(--border)]">
                    {items.map((item) => {
                      const isDelivered = !!item.delivered_at;
                      return (
                        <Link
                          key={item.id}
                          href={`/items/${item.id}?workspace=${encodeURIComponent(workspaceId)}&project=${project.id}`}
                          className="group flex items-center justify-between gap-3 py-3"
                        >
                          <p className="text-[13px] font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] truncate">
                            {item.title}
                          </p>
                          <span className={`shrink-0 text-[11px] font-medium ${
                            isDelivered ? "text-emerald-600"
                            : item.status === "in_review" ? "text-amber-600"
                            : item.status === "in_progress" ? "text-blue-600"
                            : "text-[var(--text-muted)]"
                          }`}>
                            {isDelivered ? "Delivered" : formatLabel(item.status)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </AppSurface>
              )}
            </div>
          </div>

        </div>
      </SchoolShell>
    );
  }

  // ─── Internal view ─────────────────────────────────────────────────────────────
  const originRequestHref = project.origin_request_id
    ? `/requests/${project.origin_request_id}?workspace=${encodeURIComponent(workspaceId)}`
    : null;

  const addItemForProject = addItemAction.bind(null, workspaceId, project.id, items.length);

  const INTERNAL_TABS = [
    { key: "activity", label: "Activity" },
    { key: "timeline", label: "Timeline" },
    { key: "deliverables", label: "Deliverables" },
    { key: "files", label: "Files" },
  ];
  const activeTab = INTERNAL_TABS.some((t) => t.key === rawTab) ? rawTab! : "activity";

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
            <div className="flex shrink-0 flex-wrap items-center gap-2">
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
              <DeleteProjectButton
                workspaceId={workspaceId}
                projectId={project.id}
                projectTitle={project.title}
              />
            </div>
          )}

          {/* Start next cycle — shown on completed/archived projects */}
          {canManage && (project.status === "completed" || project.status === "archived") && (
            <StartNextCycleButton
              workspaceId={workspaceId}
              requestType={
                project.workflow_family === "managed_communications"
                  ? "newsletter_request"
                  : "catalog_project"
              }
              suggestedTitle={project.title}
            />
          )}
        </div>

        {/* Tabs */}
        <ProjectTabs tabs={INTERNAL_TABS} activeTab={activeTab} baseUrl={baseUrl} />

        {/* Tab content */}
        {activeTab === "activity" && (
          <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
            <ProjectMessageComposer workspaceId={workspaceId} projectId={projectId} />
            <ActivityFeed events={activityEvents} nameMap={activityNameMap} />
          </AppSurface>
        )}

        {activeTab === "timeline" && (
          <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              Production Timeline
            </p>
            <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
              Track each step from start to delivery.
            </p>
            <div className="mt-5">
              <MilestoneTimeline
                workspaceId={workspaceId}
                projectId={projectId}
                milestones={milestones}
                nameMap={activityNameMap}
                canEdit={canManage}
              />
            </div>
            {canManage && (
              <MilestoneAddForm
                workspaceId={workspaceId}
                projectId={projectId}
              />
            )}
          </AppSurface>
        )}

        {activeTab === "deliverables" && (
          <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              Deliverables
            </p>
            <BodyText muted className="mt-0.5">
              Each deliverable is one file or output you're producing for this job.
            </BodyText>

            {items.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] px-5 py-6 text-center">
                <p className="text-[14px] font-medium text-[var(--foreground)]">No deliverables yet</p>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                  Add the individual outputs for this job above — one entry per file or design piece.
                </p>
              </div>
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
        )}

        {activeTab === "files" && (
          <ProjectFilesTab
            items={items}
            versionsByItem={versionsByItem}
            requestAttachments={attachmentsWithUrls}
            deliveredFiles={deliveredFiles}
            workspaceId={workspaceId}
            projectId={projectId}
          />
        )}

      </div>
    </ClientShell>
  );
}
