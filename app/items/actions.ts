"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { logPortalActivity } from "@/lib/portal-activity";

import {
  addItemComment,
  createItemVersion,
  getItem,
  getProject,
  getWorkspaceName,
  logActivity,
  submitApproval,
  updateItem,
} from "@/lib/create-data";
import type { ApprovalDecision } from "@/lib/create-status";
import { getServerActionAccess, getServerActionUser } from "@/lib/server-auth";
import { isInternalRole } from "@/lib/create-roles";
import {
  notifyDelivered,
  notifyChangesRequested,
} from "@/lib/create-notifications";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function addCommentAction(
  workspaceId: string,
  itemId: string,
  projectId: string,
  formData: FormData
): Promise<void> {
  const body = String(formData.get("body") ?? "").trim();
  if (!workspaceId || !itemId || !body) return;

  const user = await getServerActionUser();

  await addItemComment(workspaceId, {
    item_id: itemId,
    body,
    author_user_id: user.id,
  });

  if (projectId) {
    const item = await getItem(workspaceId, itemId);
    await logActivity(workspaceId, {
      project_id: projectId,
      item_id: itemId,
      actor_user_id: user.id,
      event_type: "comment_added",
      metadata: { item_title: item.title, preview: body.slice(0, 80) },
    });
  }

  revalidatePath(`/items/${itemId}`, "page");
}

export async function uploadVersionAction(
  workspaceId: string,
  itemId: string,
  projectId: string,
  formData: FormData
): Promise<{ error?: string }> {
  if (!workspaceId || !itemId) return { error: "Missing context." };

  const file = formData.get("file");
  const versionLabel = String(formData.get("version_label") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!versionLabel) return { error: "Version label is required." };
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };
  if (file.size > 50 * 1024 * 1024) return { error: "File must be 50 MB or smaller." };

  const user = await getServerActionUser();
  const serviceClient = getServiceClient();

  const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_").replace(/__+/g, "_");
  const storagePath = `create/${workspaceId}/items/${itemId}/versions/${Date.now()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await serviceClient.storage
    .from("originals")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("[Version upload] Storage error:", uploadError);
    return { error: "Upload failed. Please try again." };
  }

  await createItemVersion(workspaceId, {
    item_id: itemId,
    version_label: versionLabel,
    file_url: storagePath,
    notes,
    created_by: user.id,
  });

  if (projectId) {
    const item = await getItem(workspaceId, itemId);
    await logActivity(workspaceId, {
      project_id: projectId,
      item_id: itemId,
      actor_user_id: user.id,
      event_type: "version_uploaded",
      metadata: { item_title: item.title, version_label: versionLabel },
    });
  }

  revalidatePath(`/items/${itemId}`, "page");
  return {};
}

export async function submitApprovalAction(
  workspaceId: string,
  itemId: string,
  projectId: string,
  versionId: string | null,
  decision: ApprovalDecision,
  note: string | null
): Promise<void> {
  if (!workspaceId || !itemId) return;

  const user = await getServerActionUser();

  await submitApproval(workspaceId, {
    item_id: itemId,
    version_id: versionId,
    decision,
    note,
    decided_by: user.id,
  });

  const item = await getItem(workspaceId, itemId);

  if (projectId) {
    await logActivity(workspaceId, {
      project_id: projectId,
      item_id: itemId,
      actor_user_id: user.id,
      event_type: "item_approved",
      metadata: { item_title: item.title, decision },
    });
  }

  // Changes requested — notify the internal team so they know to revise
  if (decision === "changes_requested" && projectId) {
    const [project, workspaceName] = await Promise.all([
      getProject(workspaceId, projectId),
      getWorkspaceName(workspaceId),
    ]);
    void notifyChangesRequested({
      workspaceId,
      workspaceName,
      itemId,
      itemTitle: item.title,
      projectTitle: project.title,
      clientNote: note,
      actorUserId: user.id,
    });
  }

  revalidatePath(`/items/${itemId}`, "page");
}

export async function markDeliveredAction(
  workspaceId: string,
  itemId: string,
  projectId: string,
  finalVersionId: string | null
): Promise<{ error?: string }> {
  if (!workspaceId || !itemId) return { error: "Missing context." };

  const { user, role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  if (!isInternalRole(role) && !isPlatformOperator) {
    return { error: "Only internal team members can mark a deliverable as delivered." };
  }

  const item = await getItem(workspaceId, itemId);

  await updateItem(workspaceId, itemId, {
    delivered_at: new Date().toISOString(),
    final_version_id: finalVersionId,
    status: "completed",
  });

  if (projectId) {
    await logActivity(workspaceId, {
      project_id: projectId,
      item_id: itemId,
      actor_user_id: user.id,
      event_type: "item_delivered",
      metadata: { item_title: item.title },
    });
  }

  void logPortalActivity({
    workspace_id: workspaceId,
    product_key:  "create_canopy",
    event_type:   "deliverable_ready",
    title:        item.title,
    description:  item.item_type
      ? `${item.item_type.replace(/_/g, " ")} — ready for download`
      : "Deliverable ready for download",
    event_url:    `/auth/launch/create?path=/items/${itemId}`,
  });

  // File delivered — notify school clients
  if (projectId) {
    const [project, workspaceName] = await Promise.all([
      getProject(workspaceId, projectId),
      getWorkspaceName(workspaceId),
    ]);
    void notifyDelivered({
      workspaceId,
      workspaceName,
      itemId,
      itemTitle: item.title,
      projectTitle: project.title,
      actorUserId: user.id,
    });
  }

  revalidatePath(`/items/${itemId}`, "page");
  revalidatePath(`/projects/${projectId}`, "page");
  return {};
}
