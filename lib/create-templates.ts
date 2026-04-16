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

const NEWSLETTER_EMAIL_MILESTONES: MilestoneDefinition[] = [
  { title: "Content received from school", default_offset_days: 0, visibility: "all" },
  { title: "Content review and planning", default_offset_days: 3, visibility: "internal" },
  { title: "Design / layout in progress", default_offset_days: 7, visibility: "internal" },
  { title: "Internal review", default_offset_days: 10, visibility: "internal" },
  { title: "Client review", default_offset_days: 12, visibility: "all", description: "Newsletter draft shared for review" },
  { title: "Revisions", default_offset_days: 15, visibility: "internal" },
  { title: "Final approval", default_offset_days: 17, visibility: "all" },
  { title: "Send / publish", default_offset_days: 19, visibility: "all" },
];

const GENERAL_DESIGN_MILESTONES: MilestoneDefinition[] = [
  { title: "Brief review", default_offset_days: 0, visibility: "internal", description: "Review request details and confirm scope" },
  { title: "Design in progress", default_offset_days: 5, visibility: "internal" },
  { title: "Proof — client review", default_offset_days: 12, visibility: "all", description: "First proof shared for review" },
  { title: "Revisions", default_offset_days: 17, visibility: "internal" },
  { title: "Final approval", default_offset_days: 21, visibility: "all" },
  { title: "Deliver final files", default_offset_days: 23, visibility: "all" },
];

const WEBSITE_UPDATE_MILESTONES: MilestoneDefinition[] = [
  { title: "Request review", default_offset_days: 0, visibility: "internal", description: "Review update details and assess scope" },
  { title: "Development in progress", default_offset_days: 3, visibility: "internal" },
  { title: "Internal QA", default_offset_days: 7, visibility: "internal" },
  { title: "Client preview", default_offset_days: 9, visibility: "all", description: "Staging link shared for review" },
  { title: "Go live", default_offset_days: 12, visibility: "all" },
];

export interface DefaultTemplate {
  key: string;
  name: string;
  workflow_family: RequestFamily;
  /** If set, only matches this specific request type within the family */
  request_types?: RequestType[];
  description: string;
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
    milestone_definitions: NEWSLETTER_EMAIL_MILESTONES,
    deliverable_definitions: [
      { title: "Newsletter — Final", item_type: "deliverable" },
    ],
  },
  {
    key: "website_update",
    name: "Website Update",
    workflow_family: "website_update",
    description: "Website change request through go-live",
    milestone_definitions: WEBSITE_UPDATE_MILESTONES,
    deliverable_definitions: [],
  },
  {
    key: "general_design",
    name: "General Design",
    workflow_family: "design_production",
    description: "Standard design project — brief through final delivery",
    milestone_definitions: GENERAL_DESIGN_MILESTONES,
    deliverable_definitions: [
      { title: "Design — Final", item_type: "deliverable" },
    ],
  },
];

// ─── Template resolution ─────────────────────────────────────────────────────

/**
 * Find the best-matching default template for a given workflow family and
 * optional request type. Precedence:
 *   1. Exact request_type match within the family
 *   2. Family-level template with no request_types restriction
 *   3. null (no template found)
 */
export function resolveTemplate(
  workflowFamily: RequestFamily,
  requestType?: RequestType | null
): DefaultTemplate | null {
  const familyTemplates = DEFAULT_TEMPLATES.filter(
    (t) => t.workflow_family === workflowFamily
  );

  if (familyTemplates.length === 0) return null;

  // Prefer a template that explicitly lists this request type
  if (requestType) {
    const exact = familyTemplates.find(
      (t) => t.request_types?.includes(requestType)
    );
    if (exact) return exact;
  }

  // Fall back to a family-level template (no request_types restriction)
  const general = familyTemplates.find((t) => !t.request_types);
  return general ?? null;
}

// ─── Milestone generation ────────────────────────────────────────────────────

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
