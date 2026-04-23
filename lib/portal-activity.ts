// Writes to the shared activity_events table in the Canopy platform Supabase
// project. That table powers the workspace nerve-center dashboard in the portal
// ("In progress", "Going out this week", "Recent").
//
// Failures are always swallowed — activity logging must never break the main
// Create flow. Call with void: `void logPortalActivity({...})`.

type PortalActivityEvent = {
  workspace_id: string;
  product_key: string;
  event_type: string;
  title: string;
  description?: string | null;
  metric?: string | null;
  event_url?: string | null;
  scheduled_for?: string | null;
};

const PRODUCT_KEY = "create_canopy";

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return {
    supabaseUrl,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
  };
}

export async function logPortalActivity(event: PortalActivityEvent): Promise<void> {
  const cfg = getSupabaseConfig();
  if (!cfg) return;

  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/activity_events`, {
      method: "POST",
      headers: cfg.headers,
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      console.error(
        "[portal-activity] logPortalActivity insert failed:",
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (err) {
    console.error("[portal-activity] logPortalActivity fetch error:", err);
  }
}

/**
 * Replaces any existing in-progress activity_events rows for a given Create
 * project (identified by its portal-launch `event_url`) with a single fresh
 * row. Use whenever a project's progress changes (status flip, step update).
 *
 * We match on both the project's event_url and the "in_progress" / "draft" /
 * "in_review" event types so we don't stomp on unrelated rows (e.g. completed
 * deliverables in the Recent feed). Swallows all failures.
 */
export async function upsertPortalProjectActivity(
  event: PortalActivityEvent,
  projectEventUrl: string
): Promise<void> {
  const cfg = getSupabaseConfig();
  if (!cfg) return;

  try {
    const deleteUrl = new URL(`${cfg.supabaseUrl}/rest/v1/activity_events`);
    deleteUrl.searchParams.set("workspace_id", `eq.${event.workspace_id}`);
    deleteUrl.searchParams.set("product_key", `eq.${event.product_key}`);
    deleteUrl.searchParams.set(
      "event_type",
      `in.(in_progress,draft,in_review)`
    );
    deleteUrl.searchParams.set("event_url", `eq.${projectEventUrl}`);

    const deleteRes = await fetch(deleteUrl.toString(), {
      method: "DELETE",
      headers: cfg.headers,
    });
    if (!deleteRes.ok) {
      console.error(
        "[portal-activity] upsertPortalProjectActivity delete failed:",
        deleteRes.status,
        await deleteRes.text().catch(() => "")
      );
    }

    const insertRes = await fetch(`${cfg.supabaseUrl}/rest/v1/activity_events`, {
      method: "POST",
      headers: cfg.headers,
      body: JSON.stringify(event),
    });
    if (!insertRes.ok) {
      console.error(
        "[portal-activity] upsertPortalProjectActivity insert failed:",
        insertRes.status,
        await insertRes.text().catch(() => "")
      );
    }
  } catch (err) {
    console.error("[portal-activity] upsertPortalProjectActivity error:", err);
  }
}

/**
 * Deletes any in-progress/draft rows pointing at a specific Create entity
 * event_url. Useful when a request is converted into a project (we clean up
 * the request's in-progress row before logging the project's row) or when a
 * project is archived/deleted.
 *
 * Swallows all failures.
 */
export async function removePortalActivityByUrl(
  workspaceId: string,
  eventUrl: string
): Promise<void> {
  const cfg = getSupabaseConfig();
  if (!cfg) return;

  try {
    const deleteUrl = new URL(`${cfg.supabaseUrl}/rest/v1/activity_events`);
    deleteUrl.searchParams.set("workspace_id", `eq.${workspaceId}`);
    deleteUrl.searchParams.set("product_key", `eq.${PRODUCT_KEY}`);
    deleteUrl.searchParams.set("event_url", `eq.${eventUrl}`);

    const res = await fetch(deleteUrl.toString(), {
      method: "DELETE",
      headers: cfg.headers,
    });
    if (!res.ok) {
      console.error(
        "[portal-activity] removePortalActivityByUrl delete failed:",
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (err) {
    console.error("[portal-activity] removePortalActivityByUrl error:", err);
  }
}

/**
 * Helpers for building canonical event_urls for Create entities.
 * Using encodeURIComponent ensures the Portal `/auth/launch/create` route
 * parses the `path` param correctly.
 */
export function createRequestEventUrl(requestId: string): string {
  return `/auth/launch/create?path=${encodeURIComponent(`/requests/${requestId}`)}`;
}

export function createProjectEventUrl(projectId: string): string {
  return `/auth/launch/create?path=${encodeURIComponent(`/projects/${projectId}`)}`;
}

export function createItemEventUrl(itemId: string): string {
  return `/auth/launch/create?path=${encodeURIComponent(`/items/${itemId}`)}`;
}
