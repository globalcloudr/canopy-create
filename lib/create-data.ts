import { createClient } from "@supabase/supabase-js";

import type {
  CreateActivityEvent,
  CreateApproval,
  CreateItem,
  CreateItemComment,
  CreateItemVersion,
  CreateRequest,
  CreateRequestAttachment,
  CreateProject,
  CreateProjectTemplate,
  Milestone,
} from "@/lib/create-types";
import type { ApprovalDecision, MilestoneVisibility, MilestoneStatus } from "@/lib/create-status";

// ─── Service client ───────────────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(url, key);
}

function requireSingleRow<T>(data: T | null, error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Record not found.");
  }

  return data;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveWorkspaceId(
  client: ReturnType<typeof getServiceClient>,
  workspaceRef: string
) {
  const normalized = workspaceRef.trim();

  if (!normalized) {
    throw new Error("Workspace is required.");
  }

  if (UUID_PATTERN.test(normalized)) {
    return normalized;
  }

  const { data, error } = await client
    .from("organizations")
    .select("id")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    throw new Error("Workspace not found.");
  }

  return data.id as string;
}

export async function listRequests(
  workspaceId: string,
  status?: CreateRequest["status"] | CreateRequest["status"][]
): Promise<CreateRequest[]> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);
  let query = client
    .from("create_requests")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId);

  if (Array.isArray(status) && status.length > 0) {
    query = query.in("status", status);
  } else if (typeof status === "string") {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CreateRequest[];
}

export async function getRequest(
  workspaceId: string,
  requestId: string
): Promise<CreateRequest> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_requests")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("id", requestId)
    .maybeSingle();

  return requireSingleRow(data as CreateRequest | null, error);
}

export async function createRequest(
  workspaceId: string,
  payload: Omit<
    CreateRequest,
    "id" | "workspace_id" | "created_at" | "updated_at"
  >
): Promise<CreateRequest> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_requests")
    .insert({
      workspace_id: resolvedWorkspaceId,
      ...payload,
    })
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .single();

  return requireSingleRow(data as CreateRequest | null, error);
}

export async function updateRequest(
  workspaceId: string,
  requestId: string,
  payload: Partial<CreateRequest>
): Promise<CreateRequest> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);
  const {
    id: _id,
    workspace_id: _workspaceId,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...updatePayload
  } = payload;

  const { data, error } = await client
    .from("create_requests")
    .update(updatePayload)
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("id", requestId)
    .select("*")
    .maybeSingle();

  return requireSingleRow(data as CreateRequest | null, error);
}

export async function listProjects(
  workspaceId: string,
  status?: CreateProject["status"] | CreateProject["status"][]
): Promise<CreateProject[]> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);
  let query = client
    .from("create_projects")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId);

  if (Array.isArray(status) && status.length > 0) {
    query = query.in("status", status);
  } else if (typeof status === "string") {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CreateProject[];
}

export async function getProject(
  workspaceId: string,
  projectId: string
): Promise<CreateProject> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_projects")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("id", projectId)
    .maybeSingle();

  return requireSingleRow(data as CreateProject | null, error);
}

export async function createProject(
  workspaceId: string,
  payload: Omit<
    CreateProject,
    "id" | "workspace_id" | "created_at" | "updated_at"
  >
): Promise<CreateProject> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_projects")
    .insert({
      workspace_id: resolvedWorkspaceId,
      ...payload,
    })
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .single();

  return requireSingleRow(data as CreateProject | null, error);
}

export async function updateProject(
  workspaceId: string,
  projectId: string,
  payload: Partial<CreateProject>
): Promise<CreateProject> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);
  const {
    id: _id,
    workspace_id: _workspaceId,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...updatePayload
  } = payload;

  const { data, error } = await client
    .from("create_projects")
    .update(updatePayload)
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("id", projectId)
    .select("*")
    .maybeSingle();

  return requireSingleRow(data as CreateProject | null, error);
}

export async function listProjectItems(
  workspaceId: string,
  projectId: string
): Promise<CreateItem[]> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_items")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CreateItem[];
}

export async function createItem(
  workspaceId: string,
  payload: Omit<CreateItem, "id" | "workspace_id" | "created_at" | "updated_at">
): Promise<CreateItem> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_items")
    .insert({
      workspace_id: resolvedWorkspaceId,
      ...payload,
    })
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .single();

  return requireSingleRow(data as CreateItem | null, error);
}

export async function updateItem(
  workspaceId: string,
  itemId: string,
  payload: Partial<Pick<CreateItem, "title" | "status" | "sort_order" | "plane_issue_id" | "delivered_at" | "final_version_id" | "approval_state">>
): Promise<CreateItem> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_items")
    .update(payload)
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("id", itemId)
    .select("*")
    .maybeSingle();

  return requireSingleRow(data as CreateItem | null, error);
}

export async function listMilestones(
  workspaceId: string,
  projectId: string
): Promise<Milestone[]> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_milestones")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Milestone[];
}

/** Load milestones for multiple projects in a single query */
export async function listMilestonesForProjects(
  workspaceId: string,
  projectIds: string[]
): Promise<Milestone[]> {
  if (projectIds.length === 0) return [];
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_milestones")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Milestone[];
}

/** Load all items for a workspace, optionally filtered by project IDs */
export async function listItemsForProjects(
  workspaceId: string,
  projectIds: string[]
): Promise<CreateItem[]> {
  if (projectIds.length === 0) return [];
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_items")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CreateItem[];
}

export interface CreateMilestonePayload {
  title: string;
  description?: string | null;
  due_date?: string | null;
  assignee_id?: string | null;
  visibility?: MilestoneVisibility;
  milestone_status?: MilestoneStatus;
  sort_order?: number;
}

export async function createMilestone(
  workspaceId: string,
  projectId: string,
  payload: string | CreateMilestonePayload
): Promise<Milestone> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const row =
    typeof payload === "string"
      ? { title: payload }
      : payload;

  const { data, error } = await client
    .from("create_milestones")
    .insert({
      workspace_id: resolvedWorkspaceId,
      project_id: projectId,
      status: "pending",
      milestone_status: row.milestone_status ?? "not_started",
      visibility: row.visibility ?? "all",
      title: row.title,
      description: row.description ?? null,
      due_date: row.due_date ?? null,
      assignee_id: row.assignee_id ?? null,
      sort_order: row.sort_order ?? 0,
    })
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .single();

  return requireSingleRow(data as Milestone | null, error);
}

/** Bulk-insert milestones for a project (e.g. from a template). */
export async function createMilestonesBatch(
  workspaceId: string,
  projectId: string,
  milestones: CreateMilestonePayload[]
): Promise<void> {
  if (milestones.length === 0) return;
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const rows = milestones.map((m, i) => ({
    workspace_id: resolvedWorkspaceId,
    project_id: projectId,
    status: "pending",
    milestone_status: m.milestone_status ?? "not_started",
    visibility: m.visibility ?? "all",
    title: m.title,
    description: m.description ?? null,
    due_date: m.due_date ?? null,
    assignee_id: m.assignee_id ?? null,
    sort_order: m.sort_order ?? i,
  }));

  const { error } = await client
    .from("create_milestones")
    .insert(rows);

  if (error) throw new Error(error.message);
}

export type UpdateMilestonePayload = Partial<{
  status: string;
  milestone_status: MilestoneStatus;
  title: string;
  description: string | null;
  due_date: string | null;
  assignee_id: string | null;
  visibility: MilestoneVisibility;
  sort_order: number;
}>;

export async function updateMilestone(
  workspaceId: string,
  milestoneId: string,
  payload: string | UpdateMilestonePayload
): Promise<Milestone> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const updateData = typeof payload === "string" ? { status: payload } : payload;

  const { data, error } = await client
    .from("create_milestones")
    .update(updateData)
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("id", milestoneId)
    .select("*")
    .maybeSingle();

  return requireSingleRow(data as Milestone | null, error);
}

// ─── Item versions ────────────────────────────────────────────────────────────

export async function listItemVersions(
  workspaceId: string,
  itemId: string
): Promise<CreateItemVersion[]> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_item_versions")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("item_id", itemId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CreateItemVersion[];
}

export async function createItemVersion(
  workspaceId: string,
  payload: Omit<CreateItemVersion, "id" | "workspace_id" | "created_at">
): Promise<CreateItemVersion> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_item_versions")
    .insert({ workspace_id: resolvedWorkspaceId, ...payload })
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .single();

  return requireSingleRow(data as CreateItemVersion | null, error);
}

// ─── Item comments ────────────────────────────────────────────────────────────

export async function listItemComments(
  workspaceId: string,
  itemId: string
): Promise<CreateItemComment[]> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_item_comments")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("item_id", itemId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CreateItemComment[];
}

export async function addItemComment(
  workspaceId: string,
  payload: Omit<CreateItemComment, "id" | "workspace_id" | "created_at">
): Promise<CreateItemComment> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_item_comments")
    .insert({ workspace_id: resolvedWorkspaceId, ...payload })
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .single();

  return requireSingleRow(data as CreateItemComment | null, error);
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export async function listApprovals(
  workspaceId: string,
  itemId: string
): Promise<CreateApproval[]> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_approvals")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("item_id", itemId)
    .order("decided_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CreateApproval[];
}

export async function submitApproval(
  workspaceId: string,
  payload: {
    item_id: string;
    version_id: string | null;
    decision: ApprovalDecision;
    note: string | null;
    decided_by: string;
  }
): Promise<CreateApproval> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_approvals")
    .insert({ workspace_id: resolvedWorkspaceId, ...payload })
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .single();

  return requireSingleRow(data as CreateApproval | null, error);
}

// ─── Request attachments ──────────────────────────────────────────────────────

export async function listRequestAttachments(
  workspaceId: string,
  requestId: string
): Promise<CreateRequestAttachment[]> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_request_attachments")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CreateRequestAttachment[];
}

export async function addRequestAttachment(
  workspaceId: string,
  payload: Omit<CreateRequestAttachment, "id" | "workspace_id" | "created_at">
): Promise<CreateRequestAttachment> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_request_attachments")
    .insert({ workspace_id: resolvedWorkspaceId, ...payload })
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .single();

  return requireSingleRow(data as CreateRequestAttachment | null, error);
}

// ─── Item lookup ──────────────────────────────────────────────────────────────

export async function getItem(
  workspaceId: string,
  itemId: string
): Promise<CreateItem> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_items")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("id", itemId)
    .maybeSingle();

  return requireSingleRow(data as CreateItem | null, error);
}

// ─── Activity feed ────────────────────────────────────────────────────────────

/**
 * Fire-and-forget activity logger. Never throws — failures are logged to
 * console so they never surface as user-facing errors.
 */
export async function logActivity(
  workspaceId: string,
  event: Omit<CreateActivityEvent, "id" | "workspace_id" | "created_at">
): Promise<void> {
  try {
    const client = getServiceClient();
    const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);
    await client
      .from("create_activity_events")
      .insert({ workspace_id: resolvedWorkspaceId, ...event });
  } catch (err) {
    console.error("[Activity log] Failed to record event:", err);
  }
}

export async function listProjectActivity(
  workspaceId: string,
  projectId: string,
  limit = 50
): Promise<CreateActivityEvent[]> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_activity_events")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as CreateActivityEvent[];
}

// ─── Batch queries (cross-item) ─────────────────────────────────────────────

export async function listCommentsForItems(
  workspaceId: string,
  itemIds: string[]
): Promise<CreateItemComment[]> {
  if (itemIds.length === 0) return [];
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_item_comments")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .in("item_id", itemIds)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CreateItemComment[];
}

export async function listVersionsForItems(
  workspaceId: string,
  itemIds: string[]
): Promise<CreateItemVersion[]> {
  if (itemIds.length === 0) return [];
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_item_versions")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .in("item_id", itemIds)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CreateItemVersion[];
}

export async function listApprovalsForItems(
  workspaceId: string,
  itemIds: string[]
): Promise<CreateApproval[]> {
  if (itemIds.length === 0) return [];
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_approvals")
    .select("*")
    .eq("workspace_id", resolvedWorkspaceId)
    .in("item_id", itemIds)
    .order("decided_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CreateApproval[];
}

// ─── Project templates ──────────────────────────────────────────────────────

export async function getTemplate(
  templateId: string
): Promise<CreateProjectTemplate> {
  const client = getServiceClient();

  const { data, error } = await client
    .from("create_project_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  return requireSingleRow(data as CreateProjectTemplate | null, error);
}

export async function listTemplates(
  workspaceId: string
): Promise<CreateProjectTemplate[]> {
  const client = getServiceClient();
  const resolvedWorkspaceId = await resolveWorkspaceId(client, workspaceId);

  const { data, error } = await client
    .from("create_project_templates")
    .select("*")
    .or(`workspace_id.eq.${resolvedWorkspaceId},workspace_id.is.null`)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CreateProjectTemplate[];
}
