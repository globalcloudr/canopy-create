"use server";

import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";
import { logPortalActivity } from "@/lib/portal-activity";
import { createClient } from "@supabase/supabase-js";

import {
  addRequestAttachment,
  createMilestonesBatch,
  createProject,
  createRequest,
  getRequest,
  getWorkspaceName,
  updateProject,
  updateRequest,
} from "@/lib/create-data";
import type { RequestStatus } from "@/lib/create-status";
import {
  createRequestSubmissionSchema,
  type CreateRequestSubmissionInput,
} from "@/lib/create-validators";
import { getServerActionAccess, getServerActionUser } from "@/lib/server-auth";
import { canManageProjects, canTriageRequests } from "@/lib/create-roles";
import {
  createPlaneProject,
  createPlaneIssuesBatch,
  getOrCreatePlaneLabel,
  getOrCreatePlaneCustomer,
  linkCustomerToPlaneIssue,
} from "@/lib/plane-client";
import { resolveTemplate, generateMilestonesFromTemplate, resolveStartDate } from "@/lib/create-templates";

export type CreateRequestActionState = {
  error: string | null;
  requestId: string | null;
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
        scope: input.scope ?? null,
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
    return { error: "Workspace is required.", requestId: null };
  }

  const parsed = createRequestSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields.",
      requestId: null,
    };
  }

  const input = parsed.data;
  const user = await getServerActionUser();

  const request = await createRequest(workspaceId, {
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

  void logPortalActivity({
    workspace_id: workspaceId,
    product_key:  "create_canopy",
    event_type:   "in_progress",
    title:        request.title,
    description:  request.request_type
      ? request.request_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Design request submitted",
    event_url:    `/auth/launch/create?path=/requests/${request.id}`,
  });

  return { error: null, requestId: request.id };
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

  const [request, workspaceName] = await Promise.all([
    getRequest(workspaceId, requestId),
    getWorkspaceName(workspaceId),
  ]);

  if (request.status === "converted" && request.converted_project_id) {
    redirect(
      `/projects/${request.converted_project_id}?workspace=${encodeURIComponent(workspaceId)}`
    );
  }

  // Resolve template before creating project so we can set template_key
  const template = resolveTemplate(request.workflow_family, request.request_type, request.details);

  const newProject = await createProject(workspaceId, {
    origin_request_id: request.id,
    title: request.title,
    workflow_family: request.workflow_family,
    status: "active",
    template_key: template?.key ?? null,
    plane_project_id: null,
    cycle_number: 1,
    origin_project_id: null,
  });

  // Sync to Plane — fire and store, never block on failure
  let planeProjectId: string | null = null;
  try {
    planeProjectId = await createPlaneProject(
      request.title,
      newProject.id, // full UUID — identifier builder uses last 8 chars
      `Client: ${workspaceName} | ${request.title} — Canopy Create`
    );
    await updateProject(workspaceId, newProject.id, { plane_project_id: planeProjectId });
    console.log(`[Plane sync] Project created: ${planeProjectId} for "${request.title}" (${workspaceName})`);
  } catch (err) {
    console.error("[Plane sync] Failed to create Plane project:", JSON.stringify(err));
  }

  // Associate school as a Plane Customer — requires Business tier, fire-and-forget
  let planeCustomerId: string | null = null;
  if (planeProjectId) {
    try {
      planeCustomerId = await getOrCreatePlaneCustomer(workspaceName);
      console.log(`[Plane sync] Customer linked: "${workspaceName}" (${planeCustomerId})`);
    } catch (err) {
      console.log(`[Plane sync] Customer association skipped (may require Business tier):`, String(err).slice(0, 120));
    }
  }

  // Auto-create milestones from template — fire-and-forget (never blocks conversion)
  if (template) {
    try {
      const startDate = resolveStartDate(template, request.details ?? {});
      const milestones = generateMilestonesFromTemplate(
        template.milestone_definitions,
        startDate
      );
      await createMilestonesBatch(workspaceId, newProject.id, milestones);

      // Sync milestone steps to Plane as work items with Timeline label + due dates
      if (planeProjectId) {
        try {
          // Create (or reuse) a "Timeline" label — purple to distinguish from deliverables
          const timelineLabelId = await getOrCreatePlaneLabel(
            planeProjectId,
            "Timeline",
            "#8B5CF6"
          );
          const planeItems = milestones.map((m) => ({
            title: m.title,
            description: m.description ?? undefined,
            dueDate: m.due_date ?? undefined,
            labelIds: [timelineLabelId],
          }));
          const createdIssues = await createPlaneIssuesBatch(planeProjectId, planeItems);

          // Link each work item to the school customer (Business tier feature, fire-and-forget)
          if (planeCustomerId) {
            for (const issue of createdIssues) {
              try {
                await linkCustomerToPlaneIssue(planeCustomerId, planeProjectId, issue.planeIssueId);
              } catch {
                // Silently skip — customer linking is best-effort
              }
            }
          }
        } catch (err) {
          console.error("[Plane sync] Failed to create milestone issues:", err);
        }
      }
    } catch (err) {
      console.error("[Template] Failed to auto-create milestones:", err);
    }
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
