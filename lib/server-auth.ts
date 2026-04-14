import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createServerActionClient } from "@/lib/supabase-server";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileRow = {
  is_super_admin?: boolean | null;
  platform_role?: string | null;
};

type MembershipRow = {
  org_id: string;
  role?: string | null;
};

/** Raw membership role string from the database. Extend as needed per product. */
export type WorkspaceRole = string | null;

// ─── Config ───────────────────────────────────────────────────────────────────

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return { url, anonKey, serviceRoleKey };
}

// ─── Auth error ───────────────────────────────────────────────────────────────

export class RouteAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ─── Token extraction ─────────────────────────────────────────────────────────

function getBearerToken(request: Request): string {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new RouteAuthError(401, "Authentication required.");
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new RouteAuthError(401, "Authentication required.");
  }

  return token;
}

// ─── Platform operator check ──────────────────────────────────────────────────

function isPlatformOperator(profile: ProfileRow | null) {
  return (
    profile?.is_super_admin === true ||
    profile?.platform_role === "super_admin" ||
    profile?.platform_role === "platform_staff"
  );
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Validates the Bearer token and returns the authenticated Supabase user.
 * Throws RouteAuthError(401) if the token is missing or invalid.
 */
export async function requireAuthenticatedUser(request: Request): Promise<{
  user: User;
}> {
  const token = getBearerToken(request);
  const { url, anonKey } = getConfig();
  const authClient = createClient(url, anonKey);

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    throw new RouteAuthError(401, "Authentication required.");
  }

  return { user: data.user };
}

/**
 * Validates the Bearer token, looks up the user's platform role and workspace
 * memberships, and returns a consolidated access object.
 *
 * Platform operators (super_admin / platform_staff) bypass the membership check
 * and get full access to all workspaces.
 */
export async function getRequestAccess(request: Request): Promise<{
  user: User;
  isPlatformOperator: boolean;
  memberships: MembershipRow[];
}> {
  const { user } = await requireAuthenticatedUser(request);
  const { url, serviceRoleKey } = getConfig();
  const serviceClient = createClient(url, serviceRoleKey);

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("is_super_admin,platform_role")
    .eq("user_id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    throw new Error(profileError.message);
  }

  const operator = isPlatformOperator((profile as ProfileRow | null) ?? null);
  if (operator) {
    return { user, isPlatformOperator: true, memberships: [] };
  }

  const { data: memberships, error: membershipError } = await serviceClient
    .from("memberships")
    .select("org_id,role")
    .eq("user_id", user.id);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  return {
    user,
    isPlatformOperator: false,
    memberships: ((memberships as MembershipRow[] | null) ?? []).filter(
      (row) => Boolean(row.org_id)
    ),
  };
}

/**
 * Validates workspace access for the authenticated user.
 * Platform operators are always granted access.
 * Regular users must have a membership in the requested workspace.
 *
 * Throws RouteAuthError(401) if unauthenticated, RouteAuthError(403) if
 * the user has no access to the workspace.
 */
export async function requireWorkspaceAccess(
  request: Request,
  workspaceId: string
): Promise<{
  user: User;
  isPlatformOperator: boolean;
  membershipRole: WorkspaceRole;
}> {
  const access = await getRequestAccess(request);

  if (access.isPlatformOperator) {
    return { user: access.user, isPlatformOperator: true, membershipRole: null };
  }

  const membership = access.memberships.find((row) => row.org_id === workspaceId);
  if (!membership) {
    throw new RouteAuthError(403, "You do not have access to this workspace.");
  }

  return {
    user: access.user,
    isPlatformOperator: false,
    membershipRole: membership.role ?? null,
  };
}

/**
 * Returns the authenticated user from the current server action context.
 * Uses the cookie-backed Supabase session set by the browser client.
 * Throws if the user is not authenticated.
 */
export async function getServerActionUser(): Promise<User> {
  const client = await createServerActionClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required.");
  }

  return user;
}

/**
 * Returns the authenticated user plus their workspace role and platform
 * operator flag — for use in Server Actions (cookie-based session).
 *
 * Throws if unauthenticated. Returns role: null for platform operators
 * (they have full access regardless of membership).
 */
export async function getServerActionAccess(workspaceId: string): Promise<{
  user: User;
  role: string | null;
  isPlatformOperator: boolean;
}> {
  const user = await getServerActionUser();
  const { url, serviceRoleKey } = getConfig();
  const serviceClient = createClient(url, serviceRoleKey);

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("is_super_admin,platform_role")
    .eq("user_id", user.id)
    .maybeSingle();

  const operator = isPlatformOperator(
    (profile as { is_super_admin?: boolean | null; platform_role?: string | null } | null) ?? null
  );

  if (operator) {
    return { user, role: null, isPlatformOperator: true };
  }

  const { data: membership } = await serviceClient
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", workspaceId)
    .maybeSingle();

  return {
    user,
    role: (membership as { role?: string | null } | null)?.role ?? null,
    isPlatformOperator: false,
  };
}

/**
 * Converts an error to a NextResponse.
 * RouteAuthError messages are forwarded as-is (they are intentionally user-facing).
 * All other errors are logged server-side and return a generic fallback message.
 */
export function toErrorResponse(err: unknown, fallbackMessage: string) {
  if (err instanceof RouteAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  console.error(err);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
