"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AppShellContent,
  AppShellFrame,
  AppShellSidebar,
  AppSidebarPanel,
  AppSidebarPanelBody,
  AppSidebarSection,
  AppWorkspaceSwitcher,
  AppSurface,
  CanopyHeader,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  sidebarNavItemClass,
  cn,
} from "@globalcloudr/canopy-ui";
import { supabase } from "@/lib/supabase-client";
import { buildWorkspaceHref } from "@/lib/workspace-href";
import {
  readStoredWorkspaceId,
  writeStoredUserId,
  writeStoredWorkspaceId,
} from "@/lib/workspace-client";

/**
 * ProductShell — the root layout component for all product pages.
 *
 * Handles:
 *   - Portal launch handoff exchange (?launch= param → /api/auth/exchange-handoff)
 *   - Session loading from /api/app-session
 *   - Super admin workspace redirect (adds ?workspace= if missing)
 *   - Top bar with workspace switcher and product launcher
 *   - Left sidebar with configurable nav items
 *   - Portal return and cross-product switching via Portal POST handlers
 *
 * Usage:
 *   Wrap every page in <ProductShell activeNav="home" ...> ... </ProductShell>
 *   Define navItems once, e.g. in a constants file, and pass them on every page.
 *
 * TODO: Update navItems to match your product's navigation structure.
 */

// ─── Product identity — update for each new product ──────────────────────────
const PRODUCT_NAME = "Canopy Create";
// ─────────────────────────────────────────────────────────────────────────────

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://app.usecanopy.school";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrgOption = { id: string; name: string; slug: string | null };
type LauncherProductKey =
  | "photovault"
  | "stories_canopy"
  | "reach_canopy"
  | "create_canopy"
  | "community_canopy";

type AppSessionPayload = {
  user: { id: string; email: string; displayName: string };
  isPlatformOperator: boolean;
  workspaces: OrgOption[];
  activeWorkspace: OrgOption | null;
};

export type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
};

type ProductShellProps = {
  /** Nav key matching the current page — highlights that item in the sidebar */
  activeNav: string;
  /** Nav items to render in the sidebar */
  navItems: NavItem[];
  /** Page children — rendered in the content area */
  children: ReactNode;
};

// ─── Nav helpers ──────────────────────────────────────────────────────────────

function navClass(active: boolean) {
  return sidebarNavItemClass(active);
}

// ─── Session helpers ──────────────────────────────────────────────────────────

async function waitForSessionTokens() {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token && data.session.refresh_token) {
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  return new Promise<{ accessToken: string; refreshToken: string } | null>((resolve) => {
    const timeout = window.setTimeout(() => {
      subscription.unsubscribe();
      resolve(null);
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: unknown, session: { access_token?: string; refresh_token?: string } | null) => {
      if (session?.access_token && session.refresh_token) {
        window.clearTimeout(timeout);
        subscription.unsubscribe();
        resolve({ accessToken: session.access_token, refreshToken: session.refresh_token });
      }
    });
  });
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function ProductShell({ activeNav, navItems, children }: ProductShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [isPlatformOperator, setIsPlatformOperator] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [launcherProductKeys, setLauncherProductKeys] = useState<LauncherProductKey[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [launchingProductKey, setLaunchingProductKey] = useState<LauncherProductKey | null>(null);
  const [returningToPortal, setReturningToPortal] = useState(false);

  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) ?? null,
    [orgs, activeOrgId]
  );

  const initials = useMemo(() => {
    if (userName.trim()) {
      return userName.split(" ").map((p) => p[0] ?? "").join("").slice(0, 2).toUpperCase();
    }
    return (userEmail[0] ?? "U").toUpperCase();
  }, [userName, userEmail]);

  const displayName = userName.trim() || userEmail || "Canopy User";

  const orgInitials = activeOrg
    ? activeOrg.name.split(" ").map((p) => p[0] ?? "").join("").slice(0, 2).toUpperCase()
    : "W";

  const portalBase = PORTAL_URL.replace(/\/$/, "");
  const portalHomeHref = activeOrg?.slug
    ? `${portalBase}/?workspace=${encodeURIComponent(activeOrg.slug)}`
    : portalBase;

  // ── Load launcher products when workspace changes ──────────────────────────

  useEffect(() => {
    if (!activeOrgId) {
      setLauncherProductKeys([]);
      return;
    }

    const controller = new AbortController();

    async function loadLauncherProducts() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) { setLauncherProductKeys([]); return; }

        const response = await fetch(
          `/api/launcher-products?workspaceId=${encodeURIComponent(activeOrgId!)}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal }
        );

        if (!response.ok) { setLauncherProductKeys([]); return; }

        const payload = (await response.json()) as { products?: LauncherProductKey[] };
        setLauncherProductKeys(
          (payload.products ?? []).filter((v): v is LauncherProductKey =>
            v === "photovault" ||
            v === "stories_canopy" ||
            v === "reach_canopy" ||
            v === "create_canopy" ||
            v === "community_canopy"
          )
        );
      } catch {
        if (!controller.signal.aborted) setLauncherProductKeys([]);
      }
    }

    void loadLauncherProducts();
    return () => controller.abort();
  }, [activeOrgId]);

  // ── Load session (and handle handoff exchange) ─────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingSession(true);
      try {
        // 1. Exchange Portal launch code if present
        const launchCode = searchParams.get("launch")?.trim();
        if (launchCode) {
          const exchangeResponse = await fetch("/api/auth/exchange-handoff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: launchCode }),
          });

          if (!exchangeResponse.ok) {
            window.location.assign("/login");
            return;
          }

          const exchangePayload = (await exchangeResponse.json()) as {
            accessToken?: string;
            refreshToken?: string;
            workspaceSlug?: string | null;
          };

          if (!exchangePayload.accessToken || !exchangePayload.refreshToken) {
            window.location.assign("/login");
            return;
          }

          await supabase.auth.setSession({
            access_token: exchangePayload.accessToken,
            refresh_token: exchangePayload.refreshToken,
          });

          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("launch");
            if (exchangePayload.workspaceSlug) {
              url.searchParams.set("workspace", exchangePayload.workspaceSlug);
            }
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          }
        }

        // 2. Verify there is a valid session
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          window.location.assign("/login");
          return;
        }

        // 3. Load app session from server
        const requestedWorkspaceParam = searchParams.get("workspace")?.trim() || "";
        const sessionResponse = await fetch(
          `/api/app-session${requestedWorkspaceParam ? `?workspace=${encodeURIComponent(requestedWorkspaceParam)}` : ""}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
        );

        if (!sessionResponse.ok) {
          window.location.assign(PORTAL_URL);
          return;
        }

        const appSession = (await sessionResponse.json()) as AppSessionPayload;
        if (cancelled) { setLoadingSession(false); return; }

        // 4. Normalize the in-app workspace param to workspace id so all
        //    server-side data queries can use the same identifier.
        //    Use router.replace() so Next.js re-renders server components with the
        //    correct workspace param — replaceState silently updates the URL but
        //    server components never see the change.
        if (
          appSession.activeWorkspace?.id &&
          requestedWorkspaceParam !== appSession.activeWorkspace.id
        ) {
          const url = new URL(window.location.href);
          url.searchParams.set("workspace", appSession.activeWorkspace.id);
          router.replace(`${url.pathname}${url.search}${url.hash}`);
          return;
        }

        setUserEmail(appSession.user.email);
        setUserName(appSession.user.displayName);
        setIsPlatformOperator(appSession.isPlatformOperator);
        setOrgs(appSession.workspaces);
        setActiveOrgId(appSession.activeWorkspace?.id ?? null);
        writeStoredUserId(appSession.user.id);
        writeStoredWorkspaceId(appSession.activeWorkspace?.id ?? null);
      } catch {
        // Session not available — stay on page, shell shows loading state
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [searchParams]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut({ scope: "local" });
      window.location.assign(PORTAL_URL);
    } finally {
      setSigningOut(false);
    }
  }

  async function submitPortalForm(action: string, extraFields?: Record<string, string>) {
    const tokens = await waitForSessionTokens();
    if (!tokens) { window.location.assign(PORTAL_URL); return; }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = action;
    form.style.display = "none";

    const fields = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      workspaceSlug: activeOrg?.slug ?? "",
      ...extraFields,
    };

    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  }

  async function launchProduct(productKey: Exclude<LauncherProductKey, "create_canopy">) {
    if (launchingProductKey) return;
    setLaunchingProductKey(productKey);
    try {
      await submitPortalForm(`${portalBase}/auth/product-launch`, { productKey });
    } finally {
      setLaunchingProductKey(null);
    }
  }

  async function returnToPortal() {
    if (returningToPortal) return;
    setReturningToPortal(true);
    try {
      await submitPortalForm(`${portalBase}/auth/portal-return`);
    } finally {
      setReturningToPortal(false);
    }
  }

  // ── Switcher items ────────────────────────────────────────────────────────

  const launcherItems = [
    ...(launcherProductKeys.includes("photovault")
      ? [{ key: "photovault", label: "PhotoVault", productKey: "photovault" as const }]
      : []),
    ...(launcherProductKeys.includes("stories_canopy")
      ? [{ key: "stories_canopy", label: "Canopy Stories", productKey: "stories_canopy" as const }]
      : []),
    ...(launcherProductKeys.includes("reach_canopy")
      ? [{ key: "reach_canopy", label: "Canopy Reach", productKey: "reach_canopy" as const }]
      : []),
    { key: "create_canopy", label: "Canopy Create", href: "/", current: true as const },
    ...(launcherProductKeys.includes("community_canopy")
      ? [{ key: "community_canopy", label: "Canopy Community", productKey: "community_canopy" as const }]
      : []),
    { key: "portal", label: "Canopy Portal", portal: true as const },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[var(--app-shell-bg)] md:h-screen md:overflow-hidden">

      {/* Top bar */}
      <CanopyHeader
        brandHref={portalHomeHref}
        onBrandSelect={() => void returnToPortal()}
        workspaceLabel={activeOrg?.name ?? (loadingSession ? "Loading..." : "Select workspace")}
        workspaceContextLabel="School"
        workspaceLinks={
          orgs.map((org) => ({
            id: org.id,
            label: org.name,
            href: `${pathname}?workspace=${encodeURIComponent(org.id)}`,
            active: org.id === activeOrgId,
          }))
        }
        isPlatformOperator={isPlatformOperator}
        platformOverviewHref={PORTAL_URL}
        onPlatformOverviewSelect={() => void returnToPortal()}
        userInitials={loadingSession ? "…" : initials}
        displayName={displayName}
        email={userName ? userEmail : null}
        roleLabel={isPlatformOperator ? "operator" : null}
        accountMenuItems={[
          { label: "Portal overview", onSelect: () => void returnToPortal() },
        ]}
        onSignOut={() => void signOut()}
        signOutLabel={signingOut ? "Signing out…" : "Sign out"}
      />

      {/* Main layout */}
      <AppShellFrame>
        <AppShellSidebar>
          <div className="flex h-full flex-col">

            {/* Workspace lockup */}
            <AppWorkspaceSwitcher
              leading={
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-soft)] bg-[var(--accent)] text-[1.05rem] font-semibold tracking-[-0.02em] text-white shadow-[var(--shadow-sm)]">
                  {loadingSession ? "…" : orgInitials}
                </div>
              }
              title={activeOrg?.name ?? (loadingSession ? "Loading…" : "No workspace")}
              subtitle={PRODUCT_NAME}
              menuLabel={activeOrg?.name ?? "Workspace"}
            >
              <DropdownMenuGroup>
                {launcherItems.map((item) =>
                  "portal" in item ? (
                    <DropdownMenuItem
                      key={item.key}
                      onSelect={(e) => { e.preventDefault(); void returnToPortal(); }}
                    >
                      {item.label}
                      {returningToPortal && (
                        <span className="ml-auto text-[11px] text-[var(--text-muted)]">opening…</span>
                      )}
                    </DropdownMenuItem>
                  ) : "productKey" in item ? (
                    <DropdownMenuItem
                      key={item.key}
                      onSelect={(e) => { e.preventDefault(); void launchProduct(item.productKey!); }}
                    >
                      {item.label}
                      {launchingProductKey === item.productKey && (
                        <span className="ml-auto text-[11px] text-[var(--text-muted)]">opening…</span>
                      )}
                    </DropdownMenuItem>
                  ) : "current" in item ? (
                    <DropdownMenuItem key={item.key} asChild>
                      <Link href={item.href!}>
                        {item.label}
                        <span className="ml-auto text-[11px] text-[var(--text-muted)]">current</span>
                      </Link>
                    </DropdownMenuItem>
                  ) : null
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); void returnToPortal(); }}
              >
                Back to portal home
                {returningToPortal && (
                  <span className="ml-auto text-[11px] text-[var(--text-muted)]">opening…</span>
                )}
              </DropdownMenuItem>
            </AppWorkspaceSwitcher>

            {/* Nav */}
            <AppSidebarPanel>
              <AppSidebarPanelBody>
                <AppSidebarSection label="Navigation">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.key}
                        href={buildWorkspaceHref(item.href, activeOrg?.id)}
                        className={navClass(activeNav === item.key)}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </AppSidebarSection>
              </AppSidebarPanelBody>
            </AppSidebarPanel>
          </div>
        </AppShellSidebar>

        <AppShellContent containerClassName="px-6 py-8 sm:px-8 lg:px-10">
          {children}
        </AppShellContent>
      </AppShellFrame>
    </main>
  );
}
