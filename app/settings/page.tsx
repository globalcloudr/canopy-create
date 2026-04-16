import { Suspense } from "react";
import { AppSurface, BodyText } from "@canopy/ui";
import ClientShell from "@/app/_components/client-shell";
import SchoolShell from "@/app/_components/school-shell";
import SubscriptionSettings from "./subscription-settings";
import { getServerActionAccess } from "@/lib/server-auth";
import { isClientRole } from "@/lib/create-roles";
import { listWorkspaceSubscriptions } from "@/lib/create-subscriptions";

type SettingsPageProps = {
  searchParams: Promise<{ workspace?: string | string[] }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const workspaceId =
    typeof params.workspace === "string"
      ? params.workspace
      : Array.isArray(params.workspace)
        ? params.workspace[0] ?? ""
        : "";

  let isSchoolUser = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subscriptions: any[] = [];

  if (workspaceId) {
    try {
      const { role, isPlatformOperator } = await getServerActionAccess(workspaceId);
      isSchoolUser = isClientRole(role) && !isPlatformOperator;
      subscriptions = await listWorkspaceSubscriptions(workspaceId);
    } catch {
      // unauthenticated
    }
  }

  const Shell = isSchoolUser ? SchoolShell : ClientShell;

  return (
    <Shell activeNav="settings">
      <div className="space-y-6">
        <div>
          <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Settings
          </p>
          <BodyText muted className="mt-0.5">
            Manage your production schedule and notification preferences.
          </BodyText>
        </div>

        <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            Production Schedule
          </p>
          <BodyText muted className="mt-1 mb-6">
            Turn on recurring reminders so Canopy can notify you when it&apos;s time to kick off
            each production cycle. We&apos;ll send an email with a pre-filled link — you confirm
            the dates before anything is submitted.
          </BodyText>

          {!workspaceId ? (
            <BodyText muted>Select a workspace to manage your production schedule.</BodyText>
          ) : (
            <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">Loading…</div>}>
              <SubscriptionSettings
                workspaceId={workspaceId}
                initialSubscriptions={subscriptions}
              />
            </Suspense>
          )}
        </AppSurface>
      </div>
    </Shell>
  );
}
