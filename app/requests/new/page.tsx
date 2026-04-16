import { Suspense } from "react";
import NewRequestClient from "./client";
import { getServerActionAccess } from "@/lib/server-auth";
import { isClientRole } from "@/lib/create-roles";

function firstString(val: string | string[] | undefined): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val[0] ?? "";
  return "";
}

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{
    workspace?: string | string[];
    type?: string | string[];
    suggest_title?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const workspaceId = firstString(params.workspace);
  // ?type=catalog_project pre-selects the form and skips the type picker
  const preselectedType = firstString(params.type) || null;
  // ?suggest_title=Fall+2026+Catalog pre-fills the title field
  const suggestedTitle = firstString(params.suggest_title) || null;

  let isSchoolUser = false;
  if (workspaceId) {
    try {
      const { role, isPlatformOperator } = await getServerActionAccess(workspaceId);
      isSchoolUser = isClientRole(role) && !isPlatformOperator;
    } catch {
      // unauthenticated — treat as non-school user
    }
  }

  return (
    <Suspense>
      <NewRequestClient
        workspaceId={workspaceId}
        isSchoolUser={isSchoolUser}
        preselectedType={preselectedType}
        suggestedTitle={suggestedTitle}
      />
    </Suspense>
  );
}
