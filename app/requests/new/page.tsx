import { Suspense } from "react";
import NewRequestClient from "./client";
import { getServerActionAccess } from "@/lib/server-auth";
import { isClientRole } from "@/lib/create-roles";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string | string[] }>;
}) {
  const params = await searchParams;
  const workspaceId =
    typeof params.workspace === "string"
      ? params.workspace
      : Array.isArray(params.workspace)
        ? params.workspace[0] ?? ""
        : "";

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
      <NewRequestClient workspaceId={workspaceId} isSchoolUser={isSchoolUser} />
    </Suspense>
  );
}
