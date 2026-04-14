/**
 * Canopy Create role model.
 *
 * Roles come from memberships.role in the shared Supabase project.
 * Platform operators (super_admin / platform_staff) have full internal access.
 *
 * Client roles — submitted by schools:
 *   client_admin   Full client access: submit requests, view all work, approve
 *   client_staff   Submit requests and view their own submissions
 *
 * Internal roles — Akkedis team:
 *   owner          Full workspace control (same as internal_manager + settings)
 *   internal_manager  Triage, convert, assign, update status, approve
 *   designer       View and update deliverable status
 *   developer      View and update deliverable status
 *   reviewer       View and submit approvals
 *
 * In V1, roles map to two broad permission tiers:
 *   - "internal" — can manage workflow (convert, set status, add deliverables)
 *   - "client"   — can submit requests and view/approve their own work
 */

export type CreateRole =
  | "owner"
  | "internal_manager"
  | "designer"
  | "developer"
  | "reviewer"
  | "client_admin"
  | "client_staff";

const INTERNAL_ROLES: CreateRole[] = [
  "owner",
  "internal_manager",
  "designer",
  "developer",
  "reviewer",
];

const CLIENT_ROLES: CreateRole[] = ["client_admin", "client_staff"];

/** Roles that can convert requests to projects and manage project lifecycle */
const MANAGE_PROJECT_ROLES: CreateRole[] = ["owner", "internal_manager"];

/** Roles that can update request status (triage) */
const TRIAGE_ROLES: CreateRole[] = ["owner", "internal_manager"];

/** Roles that can update deliverable status */
const UPDATE_DELIVERABLE_ROLES: CreateRole[] = [
  "owner",
  "internal_manager",
  "designer",
  "developer",
];

export function isInternalRole(role: string | null): boolean {
  return INTERNAL_ROLES.includes(role as CreateRole);
}

export function isClientRole(role: string | null): boolean {
  return CLIENT_ROLES.includes(role as CreateRole);
}

export function canManageProjects(role: string | null, isPlatformOperator: boolean): boolean {
  return isPlatformOperator || MANAGE_PROJECT_ROLES.includes(role as CreateRole);
}

export function canTriageRequests(role: string | null, isPlatformOperator: boolean): boolean {
  return isPlatformOperator || TRIAGE_ROLES.includes(role as CreateRole);
}

export function canUpdateDeliverables(role: string | null, isPlatformOperator: boolean): boolean {
  return isPlatformOperator || UPDATE_DELIVERABLE_ROLES.includes(role as CreateRole);
}
