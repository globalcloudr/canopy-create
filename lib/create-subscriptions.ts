/**
 * Production subscription data layer for Canopy Create.
 *
 * Each workspace can opt into recurring production cycles:
 *   - catalog_fall          delivered ~August
 *   - catalog_winter_spring delivered ~November
 *   - catalog_summer        delivered ~May
 *   - newsletter_monthly    delivered 1st of each month
 *
 * Reminders are fired by the daily cron at /api/cron/production-reminders.
 */

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not configured.");
  return createClient(url, key);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SubscriptionType =
  | "catalog_fall"
  | "catalog_winter_spring"
  | "catalog_summer"
  | "newsletter_monthly";

export const SUBSCRIPTION_LABELS: Record<SubscriptionType, string> = {
  catalog_fall: "Fall Catalog",
  catalog_winter_spring: "Winter/Spring Catalog",
  catalog_summer: "Summer Catalog",
  newsletter_monthly: "Monthly Newsletter",
};

// Default delivery targets per catalog type
export const CATALOG_DELIVERY_DEFAULTS: Record<
  Exclude<SubscriptionType, "newsletter_monthly">,
  { month: number; day: number; label: string }
> = {
  catalog_fall:          { month: 8,  day: 1,  label: "August" },
  catalog_winter_spring: { month: 11, day: 1,  label: "November" },
  catalog_summer:        { month: 5,  day: 1,  label: "May" },
};

export type ProductionSubscription = {
  id: string;
  workspace_id: string;
  subscription_type: SubscriptionType;
  enabled: boolean;
  delivery_month: number | null;
  delivery_day: number;
  kickoff_lead_days: number;
  last_project_id: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertSubscriptionPayload = {
  enabled: boolean;
  delivery_month?: number | null;
  delivery_day?: number;
  kickoff_lead_days?: number;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns all subscriptions for a workspace, creating defaults for any missing types. */
export async function listWorkspaceSubscriptions(
  workspaceId: string
): Promise<ProductionSubscription[]> {
  const client = getServiceClient();

  const { data, error } = await client
    .from("create_production_subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductionSubscription[];
}

/** Upserts a subscription for a workspace + type. */
export async function upsertSubscription(
  workspaceId: string,
  subscriptionType: SubscriptionType,
  payload: UpsertSubscriptionPayload
): Promise<ProductionSubscription> {
  const client = getServiceClient();

  const { data, error } = await client
    .from("create_production_subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        subscription_type: subscriptionType,
        ...payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,subscription_type" }
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as ProductionSubscription;
}

/** Updates the last_project_id on a subscription after a cycle completes. */
export async function updateSubscriptionLastProject(
  workspaceId: string,
  subscriptionType: SubscriptionType,
  projectId: string
): Promise<void> {
  const client = getServiceClient();
  await client
    .from("create_production_subscriptions")
    .update({ last_project_id: projectId, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("subscription_type", subscriptionType);
}

/** Fetches all enabled subscriptions across all workspaces — used by the cron job. */
export async function getAllEnabledSubscriptions(): Promise<ProductionSubscription[]> {
  const client = getServiceClient();
  const { data, error } = await client
    .from("create_production_subscriptions")
    .select("*")
    .eq("enabled", true);

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductionSubscription[];
}

// ─── Reminder log ─────────────────────────────────────────────────────────────

/** True if this reminder has already been sent for the given date. */
export async function hasReminderBeenSent(
  subscriptionId: string,
  reminderType: string,
  triggerDate: Date
): Promise<boolean> {
  const client = getServiceClient();
  const dateStr = triggerDate.toISOString().split("T")[0];

  const { data } = await client
    .from("create_reminder_log")
    .select("id")
    .eq("subscription_id", subscriptionId)
    .eq("reminder_type", reminderType)
    .eq("trigger_date", dateStr)
    .maybeSingle();

  return !!data;
}

/** Records that a reminder was sent. */
export async function logReminderSent(
  workspaceId: string,
  subscriptionId: string,
  reminderType: string,
  triggerDate: Date
): Promise<void> {
  const client = getServiceClient();
  const dateStr = triggerDate.toISOString().split("T")[0];

  await client.from("create_reminder_log").upsert(
    {
      workspace_id: workspaceId,
      subscription_id: subscriptionId,
      reminder_type: reminderType,
      trigger_date: dateStr,
    },
    { onConflict: "subscription_id,reminder_type,trigger_date", ignoreDuplicates: true }
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Calculates the kickoff reminder date for a catalog subscription.
 * Returns the date that is `leadDays` before the next occurrence of
 * the target delivery month/day.
 */
export function getCatalogKickoffDate(
  deliveryMonth: number, // 1–12
  deliveryDay: number,   // 1–28
  leadDays: number,
  referenceDate: Date = new Date()
): Date {
  const year = referenceDate.getFullYear();

  // Try this year's delivery date first
  let delivery = new Date(year, deliveryMonth - 1, deliveryDay);

  // If the delivery date has already passed this year, use next year
  if (delivery <= referenceDate) {
    delivery = new Date(year + 1, deliveryMonth - 1, deliveryDay);
  }

  const kickoff = new Date(delivery);
  kickoff.setDate(kickoff.getDate() - leadDays);
  return kickoff;
}

/** Returns the full month name for a month number (1–12). */
export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" });
}

/** Returns the name of the next calendar month. */
export function nextMonthName(referenceDate: Date = new Date()): string {
  const next = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
  return next.toLocaleString("en-US", { month: "long" });
}
