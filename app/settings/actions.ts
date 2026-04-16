"use server";

import { revalidatePath } from "next/cache";
import { getServerActionAccess } from "@/lib/server-auth";
import { upsertSubscription, type SubscriptionType } from "@/lib/create-subscriptions";

export async function saveSubscriptionAction(
  workspaceId: string,
  subscriptionType: SubscriptionType,
  formData: FormData
): Promise<{ error?: string }> {
  if (!workspaceId) return { error: "Workspace is required." };

  try {
    await getServerActionAccess(workspaceId);
    // Any authenticated workspace member can manage their own subscriptions
    // (platform operators implicitly pass too)
  } catch {
    return { error: "You must be signed in to update settings." };
  }

  const enabled = formData.get("enabled") === "true";
  const deliveryMonthRaw = formData.get("delivery_month");
  const deliveryDayRaw = formData.get("delivery_day");
  const kickoffLeadDaysRaw = formData.get("kickoff_lead_days");

  const deliveryMonth = deliveryMonthRaw ? parseInt(String(deliveryMonthRaw), 10) : null;
  const deliveryDay = deliveryDayRaw ? parseInt(String(deliveryDayRaw), 10) : 1;
  const kickoffLeadDays = kickoffLeadDaysRaw ? parseInt(String(kickoffLeadDaysRaw), 10) : 56;

  try {
    await upsertSubscription(workspaceId, subscriptionType, {
      enabled,
      delivery_month: deliveryMonth,
      delivery_day: deliveryDay,
      kickoff_lead_days: kickoffLeadDays,
    });
  } catch (err) {
    console.error("[Settings] Failed to save subscription:", err);
    return { error: "Failed to save. Please try again." };
  }

  revalidatePath("/settings");
  return {};
}
