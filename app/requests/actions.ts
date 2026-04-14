"use server";

import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import {
  addRequestAttachment,
  createProject,
  createRequest,
  getRequest,
  updateProject,
  updateRequest,
} from "@/lib/create-data";
import type { RequestStatus } from "@/lib/create-status";
import {
  createRequestSubmissionSchema,
  type CreateRequestSubmissionInput,
} from "@/lib/create-validators";
import { getServerActionAccess, getServerActionUser } from "@/lib/server-auth";
import { canManageProjects, canTriageRequests, isClientRole } from "@/lib/create-roles";
import { createPlaneProject } from "@/lib/plane-client";

export type CreateRequestActionState = {
  error: string | null;
};

function buildRequestDetails(input: CreateRequestSubmissionInput) {
  switch (input.formType) {
    case "design_project":
      return {
        description: input.description,
        audience: input.audience ?? null,
        format: input.format ?? null,
        quantity: input.quantity ?? null,
        delivery_date: input.deliveryDate ?? null,
      };
    case "website_update":
      return {
        target_url: input.targetUrl,
        update_details: input.updateDetails,
        priority: input.priority ?? null,
        desired_go_live_date: input.desiredGoLiveDate ?? null,
      };
    case "newsletter_brief":
      return {
        audience_segment: input.audienceSegment ?? null,
        target_send_date: input.targetSendDate,
        subject_line_idea: input.subjectLineIdea ?? null,
        key_topics: input.keyTopics,
        featured_events: input.featuredEvents ?? null,
      };
    case "social_request":
      return {
        target_platforms: input.targetPlatforms,
        tone: input.tone ?? null,
        campaign_goals: input.campaignGoals,
        call_to_action: input.callToAction ?? null,
        desired_post_date: input.desiredPostDate ?? null,
      };
  }
}

export async function submitCreateRequestAction(
  workspaceId: string,
  payload: CreateRequestSubmissionInput
): Promise<CreateRequestActionState> {
  if (!workspaceId) {
    return { error: "Workspace is required." };
  }

  const parsed = createRequestSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Please correct the highlighted fields.",
    };
  }

  const input = parsed.data;
  const [user, { role, isPlatformOperator }] = await Promise.all([
    getServerActionUser(),
    getServerActionAccess(workspaceId),
  ]);
  const schoolUser = isClientRole(role) && !isPlatformOperator;

  await createRequest(workspaceId, {
    title: input.title,
    workflow_family: input.workflowFamily,
    request_type: input.requestType,
    details: buildRequestDetails(input),
    status: "submitted",
    approval_required: false,
    submitted_by_user_id: user.id,
    assigned_to_user_id: null,
    converted_project_id: null,
    converted_item_id: null,
  });

  if (schoolUser) {
    redirect(`/?workspace=${encodeURIComponent(workspaceId)}`);
  }
  redirect(`/requests?workspace=${encodeURIComponent(workspaceId)}`);
}

export async function changeRequestStatus(
  workspaceId: string,
  requestId: string,
  newStatus: RequestStatus
): Promise<void> {
  if (!workspaceId || !requestId) return;

  const { role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  if (!canTriageRequests(role, isPlatformOperator)) {
    throw new Error("You do not have permission to update request status.");
  }

  await updateRequest(workspaceId, requestId, { status: newStatus });
  revalidatePath(`/requests/${requestId}`, "page");
}

export async function convertRequestToProject(
  workspaceId: string,
  requestId: string
): Promise<void> {
  if (!workspaceId) {
    throw new Error("Workspace is required.");
  }

  const { role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  if (!canManageProjects(role, isPlatformOperator)) {
    throw new Error("You do not have permission to convert requests to projects.");
  }

  const request = await getRequest(workspaceId, requestId);

  if (request.status === "converted" && request.converted_project_id) {
    redirect(
      `/projects/${request.converted_project_id}?workspace=${encodeURIComponent(workspaceId)}`
    );
  }

  const newProject = await createProject(workspaceId, {
    origin_request_id: request.id,
    title: request.title,
    workflow_family: request.workflow_family,
    status: "active",
    template_key: null,
    plane_project_id: null,
  });

  // Sync to Plane — fire and store, never block on failure
  try {
    const planeProjectId = await createPlaneProject(
      request.title,
      newProject.id.slice(0, 8), // use first 8 chars of UUID as identifier seed
      `${request.title} — Canopy Create`
    );
    await updateProject(workspaceId, newProject.id, { plane_project_id: planeProjectId });
  } catch (err) {
    console.error("[Plane sync] Failed to create Plane project:", err);
  }

  await updateRequest(workspaceId, requestId, {
    status: "converted",
    converted_project_id: newProject.id,
  });

  redirect(`/projects/${newProject.id}?workspace=${encodeURIComponent(workspaceId)}`);
}

export async function uploadAttachmentAction(
  workspaceId: string,
  requestId: string,
  formData: FormData
): Promise<{ error?: string }> {
  if (!workspaceId || !requestId) {
    return { error: "Workspace and request are required." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file provided." };
  }

  if (file.size > 25 * 1024 * 1024) {
    return { error: "File must be 25 MB or smaller." };
  }

  const user = await getServerActionUser();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are not configured.");
  const serviceClient = createClient(url, key);

  // Sanitize filename — strip non-safe characters, collapse whitespace
  const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_").replace(/__+/g, "_");
  const storagePath = `create/${workspaceId}/requests/${requestId}/${Date.now()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await serviceClient.storage
    .from("originals")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("[Attachment upload] Storage error:", uploadError);
    return { error: "Upload failed. Please try again." };
  }

  await addRequestAttachment(workspaceId, {
    request_id: requestId,
    filename: file.name,
    file_url: storagePath,
    uploaded_by: user.id,
  });

  revalidatePath(`/requests/${requestId}`, "page");
  return {};
}

export async function deleteAttachmentAction(
  workspaceId: string,
  requestId: string,
  attachmentId: string,
  storagePath: string
): Promise<void> {
  if (!workspaceId || !attachmentId) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are not configured.");
  const serviceClient = createClient(url, key);

  await serviceClient.storage.from("originals").remove([storagePath]);
  await serviceClient
    .from("create_request_attachments")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", attachmentId);

  revalidatePath(`/requests/${requestId}`, "page");
}
