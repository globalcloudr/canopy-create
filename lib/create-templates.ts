import type { MilestoneDefinition, DeliverableDefinition, CreateProjectTemplate } from "@/lib/create-types";
import type { MilestoneVisibility } from "@/lib/create-status";
import type { RequestFamily, RequestType } from "@/lib/create-request-types";
import type { CreateMilestonePayload } from "@/lib/create-data";

// ─── Default templates (code-first) ──────────────────────────────────────────
// These are the initial source of truth. The DB `create_project_templates` table
// enables future per-workspace customization without needing template management
// UI yet.

const CATALOG_PRODUCTION_MILESTONES: MilestoneDefinition[] = [
  { title: "Notice sent to school contacts", default_offset_days: 0, visibility: "all" },
  { title: "Content collection begins", default_offset_days: 7, visibility: "all", description: "School sends source documents, text, photos, and reference materials" },
  { title: "Content collection deadline", default_offset_days: 28, visibility: "all" },
  { title: "Coordinator reviews content", default_offset_days: 35, visibility: "internal", description: "Review all submitted materials for completeness" },
  { title: "Admin approval on content", default_offset_days: 42, visibility: "all", description: "School admin reviews and approves content before design begins" },
  { title: "Handoff to designer", default_offset_days: 44, visibility: "internal" },
  { title: "Draft 1 — design in progress", default_offset_days: 58, visibility: "internal" },
  { title: "Draft 1 — internal review", default_offset_days: 62, visibility: "internal", description: "Coordinator reviews draft before sharing with client" },
  { title: "Draft 1 — client review", default_offset_days: 65, visibility: "all", description: "First proof shared with school for review and markup" },
  { title: "Revisions round 1", default_offset_days: 72, visibility: "internal" },
  { title: "Draft 2 — client review", default_offset_days: 79, visibility: "all", description: "Revised proof for final review" },
  { title: "Final edits", default_offset_days: 84, visibility: "internal" },
  { title: "Final approval from school", default_offset_days: 88, visibility: "all", description: "School signs off on the final version" },
  { title: "Files sent to printer", default_offset_days: 90, visibility: "all" },
  { title: "Proof review from printer", default_offset_days: 95, visibility: "internal", description: "Review printer proof for color and trim accuracy" },
  { title: "Print production", default_offset_days: 100, visibility: "all" },
  { title: "Delivery to school", default_offset_days: 114, visibility: "all" },
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
