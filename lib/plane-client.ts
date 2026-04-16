/**
 * Plane API client for Canopy Create.
 *
 * Canopy Create is the experience layer; Plane is the workflow engine.
 * This module handles all communication with the Plane API. It is
 * intentionally fire-and-forget from the caller's perspective — Plane
 * sync failures are logged but never block the Canopy Create action.
 *
 * Plane API docs: https://developers.plane.so/
 */

const PLANE_BASE = "https://api.plane.so/api/v1";

function getConfig() {
  const apiKey = process.env.PLANE_API_KEY;
  const workspaceSlug = process.env.PLANE_WORKSPACE_SLUG;

  if (!apiKey || !workspaceSlug) {
    throw new Error("Plane environment variables (PLANE_API_KEY, PLANE_WORKSPACE_SLUG) are not configured.");
  }

  return { apiKey, workspaceSlug };
}

async function planeRequest<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const { apiKey } = getConfig();

  const response = await fetch(`${PLANE_BASE}${path}`, {
    method,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Plane API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type PlaneProject = {
  id: string;
  name: string;
  identifier: string;
  description: string;
  network: number;
};

/**
 * Creates a Plane project for a Canopy Create project.
 * Returns the Plane project ID to store on create_projects.plane_project_id.
 */
export async function createPlaneProject(
  name: string,
  identifier: string,
  description?: string
): Promise<string> {
  const { workspaceSlug } = getConfig();

  // Plane identifiers: uppercase, 2–12 chars, alphanumeric only, must be unique
  // Use last 8 chars of UUID (most random part) to reduce collision risk
  const safeIdentifier = identifier
    .slice(-8)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10)
    .padEnd(2, "X");

  const project = await planeRequest<PlaneProject>(
    "POST",
    `/workspaces/${workspaceSlug}/projects/`,
    {
      name,
      identifier: safeIdentifier,
      description: description ?? "",
      network: 0, // 0 = secret (internal only)
    }
  );

  return project.id;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export type PlaneLabel = {
  id: string;
  name: string;
  color: string;
};

/**
 * Creates a label in a Plane project. Returns the label ID.
 * Safe to call even if a label with that name already exists — catches the
 * duplicate error and fetches the existing one.
 */
export async function getOrCreatePlaneLabel(
  planeProjectId: string,
  name: string,
  color: string
): Promise<string> {
  const { workspaceSlug } = getConfig();

  try {
    const label = await planeRequest<PlaneLabel>(
      "POST",
      `/workspaces/${workspaceSlug}/projects/${planeProjectId}/labels/`,
      { name, color }
    );
    return label.id;
  } catch {
    // Label likely already exists — fetch and find by name
    const response = await planeRequest<{ results: PlaneLabel[] }>(
      "GET",
      `/workspaces/${workspaceSlug}/projects/${planeProjectId}/labels/`
    );
    const existing = (response.results ?? []).find(
      (l) => l.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing.id;
    throw new Error(`Failed to create or find Plane label "${name}"`);
  }
}

// ─── Issues ───────────────────────────────────────────────────────────────────

export type PlaneIssue = {
  id: string;
  name: string;
  description_html: string;
  state: string;
  priority: string;
  sequence_id: number;
};

export interface CreatePlaneIssueOptions {
  description?: string;
  dueDate?: string | null;   // YYYY-MM-DD
  labelIds?: string[];
  priority?: "urgent" | "high" | "medium" | "low" | "none";
}

/**
 * Creates a Plane issue inside a project.
 * Returns the Plane issue ID to store on create_items.plane_issue_id.
 */
export async function createPlaneIssue(
  planeProjectId: string,
  title: string,
  options: CreatePlaneIssueOptions = {}
): Promise<string> {
  const { workspaceSlug } = getConfig();

  const body: Record<string, unknown> = {
    name: title,
    description_html: options.description
      ? `<p>${options.description}</p>`
      : "<p></p>",
    priority: options.priority ?? "medium",
  };

  if (options.dueDate) body.due_date = options.dueDate;
  if (options.labelIds?.length) body.label_ids = options.labelIds;

  const issue = await planeRequest<PlaneIssue>(
    "POST",
    `/workspaces/${workspaceSlug}/projects/${planeProjectId}/issues/`,
    body
  );

  return issue.id;
}

/**
 * Creates multiple Plane issues inside a project (e.g. from milestone templates).
 * Returns an array of { title, planeIssueId } for each successfully created issue.
 * Individual failures are logged but don't stop the batch.
 */
export async function createPlaneIssuesBatch(
  planeProjectId: string,
  items: { title: string; description?: string; dueDate?: string | null; labelIds?: string[] }[]
): Promise<{ title: string; planeIssueId: string }[]> {
  const results: { title: string; planeIssueId: string }[] = [];

  for (const item of items) {
    try {
      const issueId = await createPlaneIssue(planeProjectId, item.title, {
        description: item.description,
        dueDate: item.dueDate,
        labelIds: item.labelIds,
      });
      results.push({ title: item.title, planeIssueId: issueId });
    } catch (err) {
      console.error(`[Plane sync] Failed to create issue "${item.title}":`, err);
    }
  }

  return results;
}

/**
 * Updates a Plane issue's state by state ID.
 */
export async function updatePlaneIssueState(
  planeProjectId: string,
  planeIssueId: string,
  stateId: string
): Promise<void> {
  const { workspaceSlug } = getConfig();

  await planeRequest(
    "PATCH",
    `/workspaces/${workspaceSlug}/projects/${planeProjectId}/issues/${planeIssueId}/`,
    { state: stateId }
  );
}

/**
 * Lists the states available for a Plane project.
 * Use this to resolve state names (e.g. "In Progress") to state IDs.
 */
export type PlaneState = {
  id: string;
  name: string;
  group: "backlog" | "unstarted" | "started" | "completed" | "cancelled";
  color: string;
};

export async function listPlaneProjectStates(
  planeProjectId: string
): Promise<PlaneState[]> {
  const { workspaceSlug } = getConfig();

  const response = await planeRequest<{ results: PlaneState[] }>(
    "GET",
    `/workspaces/${workspaceSlug}/projects/${planeProjectId}/states/`
  );

  return response.results ?? [];
}

// ─── Customers ────────────────────────────────────────────────────────────────

export type PlaneCustomer = {
  id: string;
  name: string;
  email?: string;
  website?: string;
};

/**
 * Creates a Plane customer (school/client) if one with that name doesn't exist,
 * or returns the existing customer's ID.
 *
 * The Customers feature requires a Business-tier Plane subscription.
 * This function throws if not available — callers must catch and log.
 */
export async function getOrCreatePlaneCustomer(
  name: string,
  email?: string,
  website?: string
): Promise<string> {
  const { workspaceSlug } = getConfig();

  // Try creating first
  try {
    const customer = await planeRequest<PlaneCustomer>(
      "POST",
      `/workspaces/${workspaceSlug}/customers/`,
      { name, ...(email ? { email } : {}), ...(website ? { website } : {}) }
    );
    return customer.id;
  } catch {
    // Might already exist — search the list
    const response = await planeRequest<{ results: PlaneCustomer[] }>(
      "GET",
      `/workspaces/${workspaceSlug}/customers/`
    );
    const existing = (response.results ?? []).find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing.id;
    throw new Error(`Failed to create or find Plane customer "${name}"`);
  }
}

/**
 * Links a Plane customer to a specific work item (issue).
 * Call once per issue if you want the customer visible on each work item.
 *
 * Requires Business-tier Plane subscription — callers must wrap in try/catch.
 */
export async function linkCustomerToPlaneIssue(
  customerId: string,
  planeProjectId: string,
  planeIssueId: string
): Promise<void> {
  const { workspaceSlug } = getConfig();

  await planeRequest(
    "POST",
    `/workspaces/${workspaceSlug}/customers/${customerId}/work-items/`,
    {
      project_id: planeProjectId,
      issue_id: planeIssueId,
    }
  );
}
