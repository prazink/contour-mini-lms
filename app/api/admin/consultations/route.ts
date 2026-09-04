import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ADMIN_CONSULTATION_FIELDS =
  "id, student_id, first_name, last_name, reason, scheduled_at, status, created_at, updated_at";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (authError || !userId) {
    return errorResponse(401, "UNAUTHENTICATED", "Authentication is required");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.error("Failed to read user role", { code: profileError.code });
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "The request could not be completed",
    );
  }

  if (profile.role !== "admin") {
    return errorResponse(403, "FORBIDDEN", "Administrator access is required");
  }

  const { data, error } = await supabase
    .from("consultations")
    .select(ADMIN_CONSULTATION_FIELDS)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("Failed to list admin consultations", { code: error.code });
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "The request could not be completed",
    );
  }

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
