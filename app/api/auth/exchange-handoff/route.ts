import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/exchange-handoff
 *
 * Exchanges a short-lived Portal launch code for Supabase session tokens.
 * Called by the product shell on first load when a ?launch= param is present.
 *
 * The Portal creates a row in product_launch_handoffs with:
 *   - handoff_code: single-use random code
 *   - product_key: must match PRODUCT_KEY below
 *   - access_token / refresh_token: Supabase session tokens
 *   - expires_at: ~5 minutes from creation
 *
 * This route marks the row consumed so it cannot be replayed.
 *
 * Product key must match the value registered in canopy-platform for Canopy Create.
 */

// ─── Portal product key (must match product_launch_handoffs.product_key) ─────
const PRODUCT_KEY = "create_canopy";
// ─────────────────────────────────────────────────────────────────────────────

type HandoffRow = {
  access_token: string;
  refresh_token: string;
  workspace_slug: string | null;
};

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return { url, serviceRoleKey };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim();

    if (!code) {
      return NextResponse.json({ error: "Launch code is required." }, { status: 400 });
    }

    const { url, serviceRoleKey } = getConfig();
    const serviceClient = createClient(url, serviceRoleKey);
    const now = new Date().toISOString();

    const { data, error } = await serviceClient
      .from("product_launch_handoffs")
      .update({ consumed_at: now })
      .eq("handoff_code", code)
      .eq("product_key", PRODUCT_KEY)
      .is("consumed_at", null)
      .gt("expires_at", now)
      .select("access_token,refresh_token,workspace_slug")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        { error: "Launch code is invalid or expired." },
        { status: 400 }
      );
    }

    const handoff = data as HandoffRow;
    return NextResponse.json({
      accessToken: handoff.access_token,
      refreshToken: handoff.refresh_token,
      workspaceSlug: handoff.workspace_slug,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to exchange launch code." },
      { status: 500 }
    );
  }
}
