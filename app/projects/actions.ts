"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createItem,
  createMilestone,
  getItem,
  getProject,
  logActivity,
  updateItem,
  updateMilestone,
  updateProject,
} from "@/lib/create-data";
import type { ItemStatus, ProjectStatus } from "@/lib/create-status";
import { getServerActionAccess } from "@/lib/server-auth";
import { canManageProjects, canUpdateDeliverables } from "@/lib/create-roles";
import { createPlaneIssue } from "@/lib/plane-client";

export async function addMilestoneAction(
  workspaceId: string,
  projectId: string,
  formData: FormData
): Promise<void> {
  if (!workspaceId || !projectId) {
    throw new Error("Workspace and project are required.");
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    throw new Error("Milestone title is required.");
  }

  await createMilestone(workspaceId, projectId, title);

  redirect(`/projects/${projectId}?workspace=${encodeURIComponent(workspaceId)}`);
}

export async function toggleMilestoneStatusAction(
  workspaceId: string,
  projectId: string,
  milestoneId: string,
  currentStatus: "pending" | "completed",
  milestoneTitle: string
): Promise<void> {
  if (!workspaceId || !projectId || !milestoneId) {
    throw new Error("Workspace, project, and milestone are required.");
  }

  const { user, role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  if (!canManageProjects(role, isPlatformOperator)) {
    throw new Error("You do not have permission to update production steps.");
  }

  const newStatus = currentStatus === "completed" ? "pending" : "completed";
  await updateMilestone(workspaceId, milestoneId, newStatus);

  await logActivity(workspaceId, {
    project_id: projectId,
    item_id: null,
    actor_user_id: user.id,
    event_type: newStatus === "completed" ? "milestone_completed" : "milestone_uncompleted",
    metadata: { title: milestoneTitle },
  });

  revalidatePath(`/projects/${projectId}`, "page");
}

export async function changeProjectStatus(
  workspaceId: string,
  projectId: string,
  newStatus: string
): Promise<void> {
  if (!workspaceId || !projectId) {
    throw new Error("Workspace and project are required.");
  }

  const { user, role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  if (!canManageProjects(role, isPlatformOperator)) {
    throw new Error("You do not have permission to update project status.");
  }

  const allowedStatuses: ProjectStatus[] = ["active", "completed", "archived"];
  if (!allowedStatuses.includes(newStatus as ProjectStatus)) {
    throw new Error("Invalid project status.");
  }

  const project = await getProject(workspaceId, projectId);

  await updateProject(workspaceId, projectId, {
    status: newStatus as ProjectStatus,
  });

  await logActivity(workspaceId, {
    project_id: projectId,
    item_id: null,
    actor_user_id: user.id,
    event_type: "project_status_changed",
    metadata: { from: project.status, to: newStatus },
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?workspace=${encodeURIComponent(workspaceId)}`);
}

export async function addItemAction(
  workspaceId: string,
  projectId: string,
  sortOrder: number,
  formData: FormData
): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  if (!workspaceId || !projectId || !title) return;

  const { user, role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  if (!canManageProjects(role, isPlatformOperator)) {
    throw new Error("You do not have permission to add deliverables.");
  }

  const item = await createItem(workspaceId, {
    project_id: projectId,
    request_id: null,
    title,
    item_type: "deliverable",
    status: "pending",
    approval_state: "pending",
    due_date: null,
    assignee_id: null,
    plane_issue_id: null,
    delivered_at: null,
    final_version_id: null,
    sort_order: sortOrder,
  });

  await logActivity(workspaceId, {
    project_id: projectId,
    item_id: item.id,
    actor_user_id: user.id,
    event_type: "item_created",
    metadata: { item_title: title },
  });

  // Sync to Plane — fire and store, never block on failure
  try {
    const project = await getProject(workspaceId, projectId);
    if (project.plane_project_id) {
      const planeIssueId = await createPlaneIssue(project.plane_project_id, title);
      await updateItem(workspaceId, item.id, { plane_issue_id: planeIssueId });
    }
  } catch (err) {
    console.error("[Plane sync] Failed to create Plane issue:", err);
  }

  revalidatePath(`/projects/${projectId}`, "page");
}

export async function changeItemStatusAction(
  workspaceId: string,
  projectId: string,
  itemId: string,
  newStatus: string
): Promise<void> {
  if (!workspaceId || !itemId) return;

  const { user, role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  if (!canUpdateDeliverables(role, isPlatformOperator)) {
    throw new Error("You do not have permission to update deliverable status.");
  }

  const allowedStatuses: ItemStatus[] = ["pending", "in_progress", "in_review", "completed"];
  if (!allowedStatuses.includes(newStatus as ItemStatus)) return;

  const item = await getItem(workspaceId, itemId);
  const fromStatus = item.status;

  await updateItem(workspaceId, itemId, { status: newStatus as ItemStatus });

  await logActivity(workspaceId, {
    project_id: projectId,
    item_id: itemId,
    actor_user_id: user.id,
    event_type: "item_status_changed",
    metadata: { item_title: item.title, from: fromStatus, to: newStatus },
  });

  revalidatePath(`/projects/${projectId}`, "page");
}

export async function addProjectMessageAction(
  workspaceId: string,
  projectId: string,
  formData: FormData
): Promise<void> {
  const body = String(formData.get("body") ?? "").trim();
  if (!workspaceId || !projectId || !body) return;

  const { user } = await getServerActionAccess(workspaceId);

  await logActivity(workspaceId, {
    project_id: projectId,
    item_id: null,
    actor_user_id: user.id,
    event_type: "comment_added",
    metadata: { body, preview: body.slice(0, 120) },
  });

  revalidatePath(`/projects/${projectId}`, "page");
}
