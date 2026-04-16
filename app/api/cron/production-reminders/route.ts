/**
 * Daily cron job: fire production schedule reminders.
 *
 * Runs at 9:00 AM UTC every day via Vercel Cron (see vercel.json).
 * Checks all enabled subscriptions and sends reminders for any that
 * are due today. Uses create_reminder_log to prevent duplicate sends.
 *
 * Security: authenticated via the CRON_SECRET env var that Vercel
 * automatically injects as a Bearer token on each cron invocation.
 */

import { NextResponse } from "next/server";
import {
  getAllEnabledSubscriptions,
  hasReminderBeenSent,
  logReminderSent,
  getCatalogKickoffDate,
} from "@/lib/create-subscriptions";
import {
  sendCatalogKickoffReminder,
  sendNewsletterContentStartReminder,
  sendNewsletterDeadlineReminder,
} from "@/lib/create-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const dayOfMonth = today.getDate();
  const results: { subscription_id: string; type: string; action: string }[] = [];

  let subscriptions;
  try {
    subscriptions = await getAllEnabledSubscriptions();
  } catch (err) {
    console.error("[Cron] Failed to fetch subscriptions:", err);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }

  for (const sub of subscriptions) {
    try {
      if (sub.subscription_type === "newsletter_monthly") {
        // 15th of month — content gathering starts
        if (dayOfMonth === 15) {
          const alreadySent = await hasReminderBeenSent(sub.id, "content_start", today);
          if (!alreadySent) {
            await sendNewsletterContentStartReminder(sub, today);
            await logReminderSent(sub.workspace_id, sub.id, "content_start", today);
            results.push({ subscription_id: sub.id, type: sub.subscription_type, action: "content_start" });
            console.log(`[Cron] Newsletter content-start sent for workspace ${sub.workspace_id}`);
          }
        }

        // 25th of month — content deadline
        if (dayOfMonth === 25) {
          const alreadySent = await hasReminderBeenSent(sub.id, "content_deadline", today);
          if (!alreadySent) {
            await sendNewsletterDeadlineReminder(sub, today);
            await logReminderSent(sub.workspace_id, sub.id, "content_deadline", today);
            results.push({ subscription_id: sub.id, type: sub.subscription_type, action: "content_deadline" });
            console.log(`[Cron] Newsletter content-deadline sent for workspace ${sub.workspace_id}`);
          }
        }
      } else {
        // Catalog — check if today is the kickoff date
        if (!sub.delivery_month) continue;

        const kickoffDate = getCatalogKickoffDate(
          sub.delivery_month,
          sub.delivery_day,
          sub.kickoff_lead_days,
          today
        );

        const isTodayKickoff =
          kickoffDate.getFullYear() === today.getFullYear() &&
          kickoffDate.getMonth() === today.getMonth() &&
          kickoffDate.getDate() === today.getDate();

        if (isTodayKickoff) {
          const alreadySent = await hasReminderBeenSent(sub.id, "kickoff", today);
          if (!alreadySent) {
            await sendCatalogKickoffReminder(sub, today);
            await logReminderSent(sub.workspace_id, sub.id, "kickoff", today);
            results.push({ subscription_id: sub.id, type: sub.subscription_type, action: "kickoff" });
            console.log(`[Cron] Catalog kickoff sent for ${sub.subscription_type} workspace ${sub.workspace_id}`);
          }
        }
      }
    } catch (err) {
      console.error(`[Cron] Error processing subscription ${sub.id}:`, err);
      // Continue processing other subscriptions
    }
  }

  console.log(`[Cron] Production reminders complete — ${results.length} sent of ${subscriptions.length} subscriptions checked`);
  return NextResponse.json({ ok: true, sent: results.length, results });
}
