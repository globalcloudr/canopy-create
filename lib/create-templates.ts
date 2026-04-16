import type { MilestoneDefinition, DeliverableDefinition, CreateProjectTemplate } from "@/lib/create-types";
import type { MilestoneVisibility } from "@/lib/create-status";
import type { RequestFamily, RequestType } from "@/lib/create-request-types";
import type { CreateMilestonePayload } from "@/lib/create-data";

// ─── Default templates (code-first) ──────────────────────────────────────────
// These are the initial source of truth. The DB `create_project_templates` table
// enables future per-workspace customization without needing template management
// UI yet.

// Milestones are offset from the content collection date (Day 0 = when school
// submits program updates). Based on Julie Vo's Mountain View–Los Altos Adult
// School production schedule — 57-day cycle from content to delivery.
const CATALOG_PRODUCTION_MILESTONES: MilestoneDefinition[] = [
  {
    title: "Program updates due from coordinators",
    default_offset_days: 0,
    visibility: "all",
    description: "School submits course listings, descriptions, and any content changes for this catalog cycle",
  },
  {
    title: "Files handed off to designer",
    default_offset_days: 7,
    visibility: "internal",
    description: "All content packaged and sent to catalog designer",
  },
  {
    title: "Draft 1 — back from designer for school review",
    default_offset_days: 14,
    visibility: "all",
    description: "First catalog draft shared with school contacts for proofing",
  },
  {
    title: "School proofing team completes review",
    default_offset_days: 18,
    visibility: "all",
    description: "School proofing team marks up corrections and returns to Canopy",
  },
  {
    title: "Corrections back to designer",
    default_offset_days: 20,
    visibility: "internal",
    description: "All school corrections compiled and sent to designer for final revision",
  },
  {
    title: "Files sent to printer",
    default_offset_days: 29,
    visibility: "all",
    description: "Print-ready PDF uploaded to printer production portal",
  },
  {
    title: "Hardcopy proof received by school",
    default_offset_days: 39,
    visibility: "all",
    description: "Physical printer proof arrives at school for final sign-off",
  },
  {
    title: "School approves printer proof",
    default_offset_days: 42,
    visibility: "all",
    description: "School returns signed proof approval to printer",
  },
  {
    title: "Final proof confirmed at printer",
    default_offset_days: 47,
    visibility: "internal",
  },
  {
    title: "Catalog delivered to school",
    default_offset_days: 57,
    visibility: "all",
    description: "Printed catalogs arrive at school — ready for distribution and registration",
  },
];

// 14-day cycle — anchored to the 1st-of-month send date.
// School submits content on the 15th → 16 days of production time → 2-day buffer.
const NEWSLETTER_EMAIL_MILESTONES: MilestoneDefinition[] = [
  { title: "Content received from school", default_offset_days: 0, visibility: "all", description: "School submits articles, announcements, and featured events for this issue" },
  { title: "Content review and planning", default_offset_days: 2, visibility: "internal", description: "Content organised, layout planned, and any gaps flagged back to school" },
  { title: "Design / layout in progress", default_offset_days: 5, visibility: "internal" },
  { title: "Internal review", default_offset_days: 8, visibility: "internal" },
  { title: "Client review", default_offset_days: 10, visibility: "all", description: "Newsletter draft shared with school for final review" },
  { title: "Revisions", default_offset_days: 12, visibility: "internal" },
  { title: "Final approval", default_offset_days: 13, visibility: "all" },
  { title: "Send / publish", default_offset_days: 14, visibility: "all" },
];

const GENERAL_DESIGN_MILESTONES: MilestoneDefinition[] = [
  { title: "Brief review", default_offset_days: 0, visibility: "internal", description: "Review request details and confirm scope" },
  { title: "Design in progress", default_offset_days: 5, visibility: "internal" },
  { title: "Proof — client review", default_offset_days: 12, visibility: "all", description: "First proof shared for review" },
  { title: "Revisions", default_offset_days: 17, visibility: "internal" },
  { title: "Final approval", default_offset_days: 21, visibility: "all" },
  { title: "Deliver final files", default_offset_days: 23, visibility: "all" },
];

// Quick fix — 2 days, today-forward.
// Typo correction, image swap, contact info update, or any change under an hour.
const WEBSITE_QUICK_FIX_MILESTONES: MilestoneDefinition[] = [
  { title: "Request reviewed — fix confirmed", default_offset_days: 0, visibility: "internal", description: "Scope confirmed, no unexpected complexity" },
  { title: "Fix applied", default_offset_days: 1, visibility: "internal" },
  { title: "QA verified and live", default_offset_days: 2, visibility: "all", description: "Change verified in production and client notified" },
];

// Standard update — 7 days, backwards from go-live date.
// New page, navigation change, content section, or feature addition.
const WEBSITE_STANDARD_MILESTONES: MilestoneDefinition[] = [
  { title: "Request review — scope and approach confirmed", default_offset_days: 0, visibility: "internal", description: "Update scoped and development approach agreed" },
  { title: "Development in progress", default_offset_days: 1, visibility: "internal" },
  { title: "Internal QA", default_offset_days: 4, visibility: "internal" },
  { title: "Client preview on staging", default_offset_days: 5, visibility: "all", description: "Staging link shared for client review" },
  { title: "Changes live", default_offset_days: 7, visibility: "all" },
];

// Website redesign — 45 days, backwards from go-live date.
// Full site overhaul, new structure, or major visual refresh. Typically 6–8 weeks.
const WEBSITE_REDESIGN_MILESTONES: MilestoneDefinition[] = [
  { title: "Discovery and requirements", default_offset_days: 0, visibility: "all", description: "Goals, audience, sitemap scope, and technical requirements confirmed" },
  { title: "Sitemap and wireframes", default_offset_days: 7, visibility: "all", description: "Page structure and layout wireframes shared for approval" },
  { title: "Design mockups", default_offset_days: 14, visibility: "internal" },
  { title: "Client review of mockups", default_offset_days: 21, visibility: "all", description: "Visual design shared for feedback and approval" },
  { title: "Design revisions", default_offset_days: 25, visibility: "internal" },
  { title: "Development begins", default_offset_days: 30, visibility: "internal", description: "Approved designs moved into full build" },
  { title: "Internal QA and testing", default_offset_days: 38, visibility: "internal" },
  { title: "Client staging review", default_offset_days: 41, visibility: "all", description: "Full site on staging for final client walkthrough" },
  { title: "Final revisions", default_offset_days: 44, visibility: "internal" },
  { title: "Go live", default_offset_days: 45, visibility: "all" },
];

export interface DefaultTemplate {
  key: string;
  name: string;
  workflow_family: RequestFamily;
  /** If set, only matches this specific request type within the family */
  request_types?: RequestType[];
  description: string;
  /**
   * How milestone dates are anchored.
   *
   * "backwards" — the last milestone maps to the client's target date (delivery
   *   date, send date, go-live date). Start = target − template_span. Good for
   *   long-form jobs with a hard external deadline (catalog, newsletter, web).
   *
   * "forwards" — Day 0 = today (project creation date). Milestones count forward.
   *   Good for short-turnaround jobs (banners, flyers, etc.) where the client's
   *   "needed by" date is a soft preference, not a production anchor.
   *
   */
  date_anchor: "backwards" | "forwards";
  /** Key in request.details containing the target date string (for "backwards") */
  details_date_field?: string;
  /**
   * Scope-based matching. When set, this template is only selected when
   * request.details[scope_field] === scope_value. Templates without a
   * scope_field act as the fallback when no scope-specific template matches.
   */
  scope_field?: string;
  scope_value?: string;
  milestone_definitions: MilestoneDefinition[];
  deliverable_definitions: DeliverableDefinition[];
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    key: "catalog_production",
    name: "Catalog Production",
    workflow_family: "design_production",
    request_types: ["catalog_project"],
    description: "Full catalog production timeline — content collection through print delivery",
    date_anchor: "backwards",
    details_date_field: "delivery_date",
    milestone_definitions: CATALOG_PRODUCTION_MILESTONES,
    deliverable_definitions: [
      { title: "Catalog — Print-ready PDF", item_type: "deliverable" },
    ],
  },
  {
    key: "newsletter_email",
    name: "Newsletter / Email",
    workflow_family: "managed_communications",
    request_types: ["newsletter_request"],
    description: "Newsletter or email campaign from content through send",
    date_anchor: "backwards",
    details_date_field: "target_send_date",
    milestone_definitions: NEWSLETTER_EMAIL_MILESTONES,
    deliverable_definitions: [
      { title: "Newsletter — Final", item_type: "deliverable" },
    ],
  },
  {
    // Fallback — used when scope is "standard_update" or not specified
    key: "website_standard",
    name: "Website — Standard Update",
    workflow_family: "website_update",
    description: "New page, navigation change, content section, or feature addition. Typically 5–7 days.",
    date_anchor: "backwards",
    details_date_field: "desired_go_live_date",
    milestone_definitions: WEBSITE_STANDARD_MILESTONES,
    deliverable_definitions: [],
  },
  {
    key: "website_quick_fix",
    name: "Website — Quick Fix",
    workflow_family: "website_update",
    description: "Typo correction, image swap, contact info update, or any change under an hour. Typically live within 1–2 days.",
    date_anchor: "forwards",
    scope_field: "scope",
    scope_value: "quick_fix",
    milestone_definitions: WEBSITE_QUICK_FIX_MILESTONES,
    deliverable_definitions: [],
  },
  {
    key: "website_redesign",
    name: "Website — Redesign",
    workflow_family: "website_update",
    description: "Full site overhaul, new structure, or major visual refresh. Typically 6–8 weeks.",
    date_anchor: "backwards",
    details_date_field: "desired_go_live_date",
    scope_field: "scope",
    scope_value: "website_redesign",
    milestone_definitions: WEBSITE_REDESIGN_MILESTONES,
    deliverable_definitions: [],
  },
  {
    key: "general_design",
    name: "General Design",
    workflow_family: "design_production",
    description: "Standard design project — brief through final delivery",
    date_anchor: "forwards",
    milestone_definitions: GENERAL_DESIGN_MILESTONES,
    deliverable_definitions: [
      { title: "Design — Final", item_type: "deliverable" },
    ],
  },
];

// ─── Template resolution ─────────────────────────────────────────────────────

/**
 * Find the best-matching default template for a given workflow family,
 * optional request type, and optional request details (for scope matching).
 *
 * Precedence:
 *   1. Exact request_type match + scope match
 *   2. Exact request_type match (no scope requirement)
 *   3. Family-level match + scope match
 *   4. Family-level match (no scope requirement) — fallback
 *   5. null
 */
export function resolveTemplate(
  workflowFamily: RequestFamily,
  requestType?: RequestType | null,
  requestDetails?: Record<string, unknown> | null
): DefaultTemplate | null {
  const familyTemplates = DEFAULT_TEMPLATES.filter(
    (t) => t.workflow_family === workflowFamily
  );

  if (familyTemplates.length === 0) return null;

  // Narrow to request_type candidates
  let candidates = familyTemplates;
  if (requestType) {
    const typeMatches = familyTemplates.filter(
      (t) => t.request_types?.includes(requestType)
    );
    candidates = typeMatches.length > 0
      ? typeMatches
      : familyTemplates.filter((t) => !t.request_types);
  } else {
    candidates = familyTemplates.filter((t) => !t.request_types);
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Multiple candidates — try to narrow by scope field in request details
  if (requestDetails) {
    const scopeMatch = candidates.find(
      (t) =>
        t.scope_field &&
        t.scope_value &&
        requestDetails[t.scope_field] === t.scope_value
    );
    if (scopeMatch) return scopeMatch;
  }

  // Fall back to the first candidate without a scope requirement
  return candidates.find((t) => !t.scope_field) ?? candidates[0];
}

// ─── Milestone generation ────────────────────────────────────────────────────

/**
 * Returns the total duration of a template in days (max offset across all milestones).
 */
function getTemplateSpan(definitions: MilestoneDefinition[]): number {
  if (definitions.length === 0) return 0;
  return Math.max(...definitions.map((d) => d.default_offset_days));
}

/**
 * Resolves the milestone start date for a template given the request details.
 *
 * "backwards" templates (catalog, newsletter, website):
 *   - Read the target date from request.details[details_date_field]
 *   - Subtract the template span to get the start date
 *   - If the resulting start date is already in the past (delivery date is too
 *     soon for the full template), log a warning and fall back to today-forward
 *   - If no target date was provided, fall back to today-forward
 *
 * "forwards" templates (banners, flyers, brochures, etc.):
 *   - Always use today as the start date
 */
export function resolveStartDate(
  template: DefaultTemplate,
  requestDetails: Record<string, unknown>
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (template.date_anchor === "backwards" && template.details_date_field) {
    const rawDate = requestDetails[template.details_date_field];
    if (typeof rawDate === "string" && rawDate) {
      const targetDate = new Date(rawDate);
      if (!isNaN(targetDate.getTime())) {
        const span = getTemplateSpan(template.milestone_definitions);
        const startDate = new Date(targetDate);
        startDate.setDate(startDate.getDate() - span);
        startDate.setHours(0, 0, 0, 0);

        if (startDate < today) {
          // Delivery date is too soon for the full template — use today-forward
          // so milestones don't start in the past
          console.log(
            `[Template] "${template.key}": target date ${rawDate} leaves only ` +
            `${Math.round((targetDate.getTime() - today.getTime()) / 86400000)}d for a ${span}d template — ` +
            `falling back to today-forward`
          );
          return today;
        }

        return startDate;
      }
    }
  }

  return today;
}

/**
 * Generate concrete milestone payloads from a template's definitions.
 * Each milestone's due_date is calculated as startDate + default_offset_days.
 */
export function generateMilestonesFromTemplate(
  definitions: MilestoneDefinition[],
  startDate: Date
): CreateMilestonePayload[] {
  return definitions.map((def, index) => {
    const due = new Date(startDate);
    due.setDate(due.getDate() + def.default_offset_days);
    // Format as YYYY-MM-DD for the date column
    const dueDateStr = due.toISOString().split("T")[0];

    return {
      title: def.title,
      description: def.description ?? null,
      due_date: dueDateStr,
      visibility: def.visibility,
      milestone_status: "not_started" as const,
      sort_order: index,
      assignee_id: null, // assignee_role is informational — no auto-assignment yet
    };
  });
}
