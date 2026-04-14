import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { AppSurface, Badge } from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";
import ItemStatusSelect from "@/app/_components/item-status-select";
import ItemVersions from "@/app/_components/item-versions";
import ItemComments from "@/app/_components/item-comments";
import {
  listItemVersions,
  listItemComments,
  listApprovals,
} from "@/lib/create-data";
import type { CreateItem } from "@/lib/create-types";
import type { ApprovalDecision } from "@/lib/create-status";

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

  // Load related data in parallel
  const [rawVersions, rawComments, rawApprovals] = await Promise.all([
    listItemVersions(workspaceId, itemId),
    listItemComments(workspaceId, itemId),
    listApprovals(workspaceId, itemId),
  ]);

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
              <ItemStatusSelect
                workspaceId={workspaceId}
                projectId={resolvedProjectId}
                itemId={itemId}
                currentStatus={item.status}
              />
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
