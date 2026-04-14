/**
 * Canopy Create role model.
 *
 * School workspace roles (stored in memberships.role — shared across all
 * Canopy products):
 *   owner        Full school workspace control
 *   admin        Can manage staff access; not the primary owner
 *   staff        General workspace access for day-to-day work
 *   social_media Communications staff (social posts, photo uploads)
 *   uploader     Can add media assets only
 *   viewer       Read-only access
 *
 * These roles identify the user as a school-side client in Canopy Create.
 * They get the simplified school-facing UX.
 *
 * Internal Canopy roles (future — for when designers have workspace
 * memberships in the designer marketplace):
 *   internal_manager   Triage, convert, assign, update status
 *   designer           View and update deliverable status
 *   developer          View and update deliverable status
 *   reviewer           View and submit approvals
 *
 * Platform operators (profiles.platform_role or is_super_admin):
 *   super_admin       Full platform access — always treated as internal
 *   platform_staff    Can view all workspaces — always treated as internal
 *
 * In practice today, the Canopy team accesses Create as platform operators.
 * School staff access it as workspace members with one of the school roles.
 */

// ─── School-side roles (actual platform roles) ───────────────────────────────

const SCHOOL_ROLES = [
  "owner",
  "admin",
  "staff",
  "social_media",
  "uploader",
  "viewer",
] as const;

// ─── Internal Canopy roles (future marketplace) ───────────────────────────────

const INTERNAL_ROLES = [
  "internal_manager",
  "designer",
  "developer",
  "reviewer",
] as const;

export type SchoolRole = (typeof SCHOOL_ROLES)[number];
export type InternalRole = (typeof INTERNAL_ROLES)[number];
export type CreateRole = SchoolRole | InternalRole;

// ─── Role checks ──────────────────────────────────────────────────────────────

/** True for any school workspace member — gets the school-facing UX. */
export function isClientRole(role: string | null): boolean {
  return SCHOOL_ROLES.includes(role as SchoolRole);
}

/** True for internal Canopy team roles (future marketplace designers). */
export function isInternalRole(role: string | null): boolean {
  return INTERNAL_ROLES.includes(role as InternalRole);
}

// ─── Permission checks ────────────────────────────────────────────────────────

/**
 * Can convert requests to projects and manage project lifecycle.
 * Today: platform operators only. Future: internal_manager.
 */
export function canManageProjects(
  role: string | null,
  isPlatformOperator: boolean
): boolean {
  return isPlatformOperator || role === "internal_manager";
}

/**
 * Can update request status (triage).
 * Today: platform operators only. Future: internal_manager.
 */
export function canTriageRequests(
  role: string | null,
  isPlatformOperator: boolean
): boolean {
  return isPlatformOperator || role === "internal_manager";
}

/**
 * Can update deliverable status and upload versions.
 * Today: platform operators only. Future: designer, developer, internal_manager.
 */
export function canUpdateDeliverables(
  role: string | null,
  isPlatformOperator: boolean
): boolean {
  return (
    isPlatformOperator ||
    role === "internal_manager" ||
    role === "designer" ||
    role === "developer"
  );
}
