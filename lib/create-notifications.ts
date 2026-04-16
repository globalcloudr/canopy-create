/**
 * Canopy Create — transactional email notifications.
 *
 * All public functions are fire-and-log safe. They fetch workspace
 * recipients from Supabase, build the appropriate email template,
 * and dispatch via Resend. Failures are logged but never thrown.
 *
 * School clients (owner / admin / staff / social_media / uploader / viewer)
 * receive client-facing emails (proof ready, file delivered).
 *
 * Internal team members receive operational emails (changes requested).
 * Today the internal team are platform operators — not workspace members —
 * so "changes requested" sends to the RESEND_NOTIFY_INTERNAL_EMAIL
 * catch-all address instead of querying membership.
 */

import { createClient } from "@supabase/supabase-js";
import { sendEmailSafe } from "@/lib/email-client";
import {
  proofReadyEmail,
  deliveredEmail,
  changesRequestedEmail,
} from "@/lib/email-templates";

// ─── Constants ─────────────────────────────────────────────────────────────────

// School-side roles — matches SCHOOL_ROLES in create-roles.ts
const CLIENT_ROLES = [
  "owner",
  "admin",
  "staff",
  "social_media",
  "uploader",
  "viewer",
] as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

type Recipient = {
  userId: string;
  email: string;
  name: string;
};

// ─── Supabase service client ───────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not configured.");
  return createClient(url, key);
}

// ─── Recipient resolution ──────────────────────────────────────────────────────

/**
 * Returns email + name for all school-role members of a workspace.
 * Excludes any user matching excludeUserId (the actor).
 */
async function getClientRecipients(
  workspaceId: string,
  excludeUserId?: string
): Promise<Recipient[]> {
  const client = getServiceClient();

  // 1. Get workspace members with school roles
  const { data: members, error: membersError } = await client
    .from("memberships")
    .select("user_id, role")
    .eq("org_id", workspaceId)
    .in("role", CLIENT_ROLES);

  if (membersError || !members?.length) return [];

  const userIds = members
    .map((m) => m.user_id as string)
    .filter((id) => id !== excludeUserId);

  if (!userIds.length) return [];

  // 2. Fetch profiles for those users
  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("user_id, email, display_name, full_name")
    .in("user_id", userIds);

  if (profilesError || !profiles?.length) return [];

  return profiles
    .filter((p) => p.email)
    .map((p) => ({
      userId: p.user_id as string,
      email: p.email as string,
      name: (p.display_name ?? p.full_name ?? "there") as string,
    }));
}

// ─── Notification dispatchers ──────────────────────────────────────────────────

export type ProofReadyParams = {
  workspaceId: string;
  workspaceName: string;
  itemId: string;
  itemTitle: string;
  projectTitle: string;
  versionLabel?: string;
  actorUserId: string; // uploader — excluded from recipients
};

/**
 * Sends "Your proof is ready for review" to all school-role members
 * of the workspace, excluding the uploader.
 */
export async function notifyProofReady(params: ProofReadyParams): Promise<void> {
  let recipients: Recipient[];
  try {
    recipients = await getClientRecipients(params.workspaceId, params.actorUserId);
  } catch (err) {
    console.error("[Notifications] Failed to fetch proof-ready recipients:", String(err));
    return;
  }

  if (!recipients.length) return;

  for (const recipient of recipients) {
    const { subject, html } = proofReadyEmail({
      recipientName: recipient.name,
      deliverableName: params.itemTitle,
      projectTitle: params.projectTitle,
      workspaceName: params.workspaceName,
      versionLabel: params.versionLabel,
      itemId: params.itemId,
      workspaceId: params.workspaceId,
    });

    await sendEmailSafe(
      { to: [recipient.email], subject, html },
      `proof-ready → ${recipient.email}`
    );
  }
}

export type DeliveredParams = {
  workspaceId: string;
  workspaceName: string;
  itemId: string;
  itemTitle: string;
  projectTitle: string;
  actorUserId: string; // deliverer — excluded from recipients
};

/**
 * Sends "Your file is ready to download" to all school-role members.
 */
export async function notifyDelivered(params: DeliveredParams): Promise<void> {
  let recipients: Recipient[];
  try {
    recipients = await getClientRecipients(params.workspaceId, params.actorUserId);
  } catch (err) {
    console.error("[Notifications] Failed to fetch delivered recipients:", String(err));
    return;
  }

  if (!recipients.length) return;

  for (const recipient of recipients) {
    const { subject, html } = deliveredEmail({
      recipientName: recipient.name,
      deliverableName: params.itemTitle,
      projectTitle: params.projectTitle,
      workspaceName: params.workspaceName,
      itemId: params.itemId,
      workspaceId: params.workspaceId,
    });

    await sendEmailSafe(
      { to: [recipient.email], subject, html },
      `delivered → ${recipient.email}`
    );
  }
}

export type ChangesRequestedParams = {
  workspaceId: string;
  workspaceName: string;
  itemId: string;
  itemTitle: string;
  projectTitle: string;
  clientNote: string | null;
  actorUserId: string; // the school client who requested changes
};

/**
 * Sends "Changes have been requested" to the internal team catch-all.
 *
 * The internal Canopy team are platform operators — not workspace members —
 * so we send to RESEND_NOTIFY_INTERNAL_EMAIL rather than querying memberships.
 * Set that env var to e.g. "production@canopyschool.us".
 */
export async function notifyChangesRequested(
  params: ChangesRequestedParams
): Promise<void> {
  const internalEmail = process.env.RESEND_NOTIFY_INTERNAL_EMAIL;
  if (!internalEmail) {
    // Not configured — silently skip rather than error
    return;
  }

  // Fetch the requesting client's name for personalisation
  let actorName = "A client";
  try {
    const client = getServiceClient();
    const { data } = await client
      .from("profiles")
      .select("display_name, full_name")
      .eq("user_id", params.actorUserId)
      .maybeSingle();
    if (data) {
      actorName = data.display_name ?? data.full_name ?? actorName;
    }
  } catch {
    // Non-fatal — use default name
  }

  const { subject, html } = changesRequestedEmail({
    recipientName: "team",
    deliverableName: params.itemTitle,
    projectTitle: params.projectTitle,
    workspaceName: params.workspaceName,
    clientNote: params.clientNote,
    itemId: params.itemId,
    workspaceId: params.workspaceId,
  });

  await sendEmailSafe(
    { to: [internalEmail], subject, html },
    `changes-requested → ${internalEmail}`
  );
}
