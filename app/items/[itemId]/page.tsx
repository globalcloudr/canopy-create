import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { AppSurface, Badge } from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";
import SchoolShell from "@/app/_components/school-shell";
import ItemStatusSelect from "@/app/_components/item-status-select";
import ItemVersions from "@/app/_components/item-versions";
import ItemComments from "@/app/_components/item-comments";
import ClientProofReview from "@/app/_components/client-proof-review";
import {
  listItemVersions,
  listItemComments,
  listApprovals,
} from "@/lib/create-data";
import type { CreateItem } from "@/lib/create-types";
import type { ApprovalDecision } from "@/lib/create-status";
import { getServerActionAccess } from "@/lib/server-auth";
import { isInternalRole, canUpdateDeliverables, isClientRole } from "@/lib/create-roles";

type ItemDetailPageProps = {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ workspace?: string | string[]; project?: string | string[] }>;
};

function formatLabel(value: string) {
  return value
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-[var(--text-muted)]",
  in_progress: "text-blue-700",
  in_review: "text-amber-700",
  completed: "text-emerald-700",
};

export default async function ItemDetailPage({
  params,
  searchParams,
}: ItemDetailPageProps) {
  const { itemId } = await params;
  const resolved = await searchParams;

  const workspaceParam = resolved.workspace;
  const workspaceId =
    typeof workspaceParam === "string"
      ? workspaceParam
      : Array.isArray(workspaceParam)
        ? workspaceParam[0] ?? ""
        : "";

  const projectParam = resolved.project;
  const projectId =
    typeof projectParam === "string"
      ? projectParam
      : Array.isArray(projectParam)
        ? projectParam[0] ?? ""
        : "";

  if (!workspaceId) {
    return (
      <ClientShell activeNav="requests">
        <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
          <p className="text-[15px] text-[var(--text-muted)]">
            Select a workspace to view this deliverable.
          </p>
        </AppSurface>
      </ClientShell>
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const serviceClient = createClient(url, key);

  // Load item
  const { data: itemData } = await serviceClient
    .from("create_items")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", itemId)
    .maybeSingle();

  const item = itemData as CreateItem | null;

  if (!item) {
    return (
      <ClientShell activeNav="requests">
        <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
          <p className="text-[15px] text-[var(--text-muted)]">Deliverable not found.</p>
        </AppSurface>
      </ClientShell>
    );
  }

  const resolvedProjectId = projectId || item.project_id || "";

  // Load role + related data in parallel
  let role: string | null = null;
  let isPlatformOperator = false;
  try {
    ({ role, isPlatformOperator } = await getServerActionAccess(workspaceId));
  } catch {
    return <ClientShell activeNav="requests"><div /></ClientShell>;
  }

  const [rawVersions, rawComments, rawApprovals] = await Promise.all([
    listItemVersions(workspaceId, itemId),
    listItemComments(workspaceId, itemId),
    listApprovals(workspaceId, itemId),
  ]);

  const canUploadVersion = isInternalRole(role) || isPlatformOperator;
  const canUpdateStatus = canUpdateDeliverables(role, isPlatformOperator);

  // Generate signed URLs for versions
  const storageClient = serviceClient.storage.from("originals");
  const versions = await Promise.all(
    rawVersions.map(async (v) => {
      let signedUrl: string | null = null;
      let filename: string | null = null;
      if (v.file_url) {
        const { data } = await storageClient.createSignedUrl(v.file_url, 3600);
        signedUrl = data?.signedUrl ?? null;
        filename = v.file_url.split("/").pop() ?? null;
      }
      return {
        id: v.id,
        versionLabel: v.version_label,
        signedUrl,
        filename,
        notes: v.notes,
        createdAt: v.created_at,
      };
    })
  );

  // Look up commenter display names (best effort — use email prefix as fallback)
  const authorIds = [...new Set(rawComments.map((c) => c.author_user_id))];
  const nameMap: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("user_id,full_name,display_name")
      .in("user_id", authorIds);
    for (const p of profiles ?? []) {
      nameMap[p.user_id] = p.display_name ?? p.full_name ?? "User";
    }
  }

  const comments = rawComments.map((c) => ({
    id: c.id,
    body: c.body,
    authorName: nameMap[c.author_user_id] ?? "User",
    createdAt: c.created_at,
  }));

  const approvals = rawApprovals.map((a) => ({
    id: a.id,
    versionId: a.version_id,
    decision: a.decision as ApprovalDecision,
    note: a.note,
    decidedBy: a.decided_by,
    decidedAt: a.decided_at,
  }));

  const latestVersionId = rawVersions.at(-1)?.id ?? null;

  const projectHref = resolvedProjectId
    ? `/projects/${resolvedProjectId}?workspace=${encodeURIComponent(workspaceId)}`
    : `/requests?workspace=${encodeURIComponent(workspaceId)}`;

  // ─── School (client) view ─────────────────────────────────────────────────────
  if (isClientRole(role) && !isPlatformOperator) {
    const latestVersion = versions.at(-1) ?? null;
    const latestApproval = approvals.at(-1) ?? null;
    const existingApproval = latestApproval
      ? { decision: latestApproval.decision, note: latestApproval.note }
      : null;

    return (
      <SchoolShell activeNav="home">
        <div className="space-y-5 max-w-2xl">

          {/* Header */}
          <div>
            <Link
              href={resolvedProjectId
                ? `/projects/${resolvedProjectId}?workspace=${encodeURIComponent(workspaceId)}`
                : `/?workspace=${encodeURIComponent(workspaceId)}`}
              className="text-[12px] text-[var(--text-muted)] hover:text-[var(--foreground)]"
            >
              ← Back to job
            </Link>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              {item.title}
            </p>
            {item.status === "in_review" && !item.delivered_at && (
              <p className="mt-1.5 text-[14px] text-amber-600 font-medium">
                Your proof is ready — please review and let us know what you think.
              </p>
            )}
          </div>

          {/* Proof review */}
          <AppSurface className="px-6 py-6 sm:px-8">
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)] mb-4">
              {item.delivered_at ? "Your file" : "Proof"}
            </p>
            <ClientProofReview
              workspaceId={workspaceId}
              itemId={itemId}
              projectId={resolvedProjectId}
              latestVersion={latestVersion}
              existingApproval={existingApproval}
              isDelivered={!!item.delivered_at}
            />
          </AppSurface>

          {/* Messages */}
          <AppSurface className="px-6 py-6 sm:px-8">
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)] mb-4">
              Messages
            </p>
            <ItemComments
              workspaceId={workspaceId}
              itemId={itemId}
              projectId={resolvedProjectId}
              comments={comments}
            />
          </AppSurface>

        </div>
      </SchoolShell>
    );
  }

  // ─── Internal view ─────────────────────────────────────────────────────────────
  const projectLabel = resolvedProjectId ? "← Project" : "← Requests";

  return (
    <ClientShell activeNav="requests">
      <div className="space-y-5">

        {/* Header */}
        <div>
          <Link
            href={projectHref}
            className="text-[12px] text-[var(--text-muted)] hover:text-[var(--foreground)]"
          >
            {projectLabel}
          </Link>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              {item.title}
            </p>
            <div className="shrink-0">
              {canUpdateStatus ? (
                <ItemStatusSelect
                  workspaceId={workspaceId}
                  projectId={resolvedProjectId}
                  itemId={itemId}
                  currentStatus={item.status}
                />
              ) : (
                <Badge>{formatLabel(item.status)}</Badge>
              )}
            </div>
          </div>
          <div className="mt-2">
            <Badge>{formatLabel(item.approval_state)}</Badge>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">

          {/* Left — versions + approvals */}
          <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
            <ItemVersions
              workspaceId={workspaceId}
              itemId={itemId}
              projectId={resolvedProjectId}
              versions={versions}
              approvals={approvals}
              latestVersionId={latestVersionId}
              canUpload={canUploadVersion}
              deliveredAt={item.delivered_at}
            />
          </AppSurface>

          {/* Right — comments */}
          <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
            <ItemComments
              workspaceId={workspaceId}
              itemId={itemId}
              projectId={resolvedProjectId}
              comments={comments}
            />
          </AppSurface>
        </div>
      </div>
    </ClientShell>
  );
}
