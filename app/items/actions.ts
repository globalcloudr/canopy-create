"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import {
  addItemComment,
  createItemVersion,
  submitApproval,
  updateItem,
} from "@/lib/create-data";
import type { ApprovalDecision } from "@/lib/create-status";
import { getServerActionAccess, getServerActionUser } from "@/lib/server-auth";
import { isInternalRole } from "@/lib/create-roles";

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

  revalidatePath(`/items/${itemId}`, "page");
  return {};
}

export async function submitApprovalAction(
  workspaceId: string,
  itemId: string,
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

  revalidatePath(`/items/${itemId}`, "page");
}

export async function markDeliveredAction(
  workspaceId: string,
  itemId: string,
  projectId: string,
  finalVersionId: string | null
): Promise<{ error?: string }> {
  if (!workspaceId || !itemId) return { error: "Missing context." };

  const { role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  if (!isInternalRole(role) && !isPlatformOperator) {
    return { error: "Only internal team members can mark a deliverable as delivered." };
  }

  await updateItem(workspaceId, itemId, {
    delivered_at: new Date().toISOString(),
    final_version_id: finalVersionId,
    status: "completed",
  });

  revalidatePath(`/items/${itemId}`, "page");
  revalidatePath(`/projects/${projectId}`, "page");
  return {};
}
