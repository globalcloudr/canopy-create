import { NextResponse } from "next/server";
import { createPlaneProject } from "@/lib/plane-client";
import { createClient } from "@supabase/supabase-js";

// Temporary debug endpoint — remove after fixing Plane sync
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const client = createClient(url, key);

  // Get a project with no plane_project_id
  const { data: project } = await client
    .from("create_projects")
    .select("id, title")
    .is("plane_project_id", null)
    .limit(1)
    .single();

  if (!project) {
    return NextResponse.json({ message: "No projects need syncing." });
  }

  try {
    const identifier = project.id.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const planeProjectId = await createPlaneProject(
      project.title,
      identifier,
      `${project.title} — Canopy Create`
    );

    await client
      .from("create_projects")
      .update({ plane_project_id: planeProjectId })
      .eq("id", project.id);

    return NextResponse.json({
      success: true,
      project: project.title,
      planeProjectId,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      project: project.title,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
