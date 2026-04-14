"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createItem,
  createMilestone,
  updateItem,
  updateMilestone,
  updateProject,
} from "@/lib/create-data";
import type { ItemStatus, ProjectStatus } from "@/lib/create-status";
import { getServerActionAccess } from "@/lib/server-auth";
import { canManageProjects, canUpdateDeliverables } from "@/lib/create-roles";
import { createPlaneIssue } from "@/lib/plane-client";
import { getProject } from "@/lib/create-data";

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
  currentStatus: "pending" | "completed"
): Promise<void> {
  if (!workspaceId || !projectId || !milestoneId) {
    throw new Error("Workspace, project, and milestone are required.");
  }

  const { role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  if (!canManageProjects(role, isPlatformOperator)) {
    throw new Error("You do not have permission to update production steps.");
  }

  await updateMilestone(
    workspaceId,
    milestoneId,
    currentStatus === "completed" ? "pending" : "completed"
  );

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

  const { role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  if (!canManageProjects(role, isPlatformOperator)) {
    throw new Error("You do not have permission to update project status.");
  }

  const allowedStatuses: ProjectStatus[] = ["active", "completed", "archived"];
  if (!allowedStatuses.includes(newStatus as ProjectStatus)) {
    throw new Error("Invalid project status.");
  }

  await updateProject(workspaceId, projectId, {
    status: newStatus as ProjectStatus,
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

  const { role, isPlatformOperator } = await getServerActionAccess(workspaceId);
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

  const { role, isPlatformOperator } = await getServerActionAccess(workspaceId);
  if (!canUpdateDeliverables(role, isPlatformOperator)) {
    throw new Error("You do not have permission to update deliverable status.");
  }

  const allowedStatuses: ItemStatus[] = ["pending", "in_progress", "in_review", "completed"];
  if (!allowedStatuses.includes(newStatus as ItemStatus)) return;

  await updateItem(workspaceId, itemId, { status: newStatus as ItemStatus });
  revalidatePath(`/projects/${projectId}`, "page");
}
