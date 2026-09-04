import { planConsultationUpdate } from "@/lib/consultations/transitions";
import { updateConsultationSchema } from "@/lib/consultations/validation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { NextResponse } from "next/server";

const CONSULTATION_FIELDS =
  "id, first_name, last_name, reason, scheduled_at, status, created_at, updated_at";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!z.uuid().safeParse(id).success) {
    return errorResponse(404, "NOT_FOUND", "Consultation was not found");
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const studentId = authData?.claims?.sub;

  if (authError || !studentId) {
    return errorResponse(401, "UNAUTHENTICATED", "Authentication is required");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Request body must be valid JSON",
    );
  }

  const parsed = updateConsultationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Consultation update is invalid",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const { data: current, error: readError } = await supabase
    .from("consultations")
    .select(CONSULTATION_FIELDS)
    .eq("id", id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (readError) {
    console.error("Failed to read consultation", { code: readError.code });
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "The request could not be completed",
    );
  }

  if (!current) {
    return errorResponse(404, "NOT_FOUND", "Consultation was not found");
  }

  const plan = planConsultationUpdate(current.status, parsed.data);

  if (plan.kind === "noop") {
    return NextResponse.json(
      { data: current },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (plan.kind === "invalid") {
    return errorResponse(
      409,
      "INVALID_STATE",
      "This action is not available for the consultation's current status",
    );
  }

  const { data, error } = await supabase
    .from("consultations")
    .update(plan.changes)
    .eq("id", id)
    .eq("student_id", studentId)
    .eq("status", plan.requiredStatus)
    .select(CONSULTATION_FIELDS)
    .maybeSingle();

  if (error) {
    console.error("Failed to update consultation", { code: error.code });
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "The request could not be completed",
    );
  }

  if (!data) {
    return errorResponse(
      409,
      "CONCURRENT_UPDATE",
      "The consultation changed before this request completed",
    );
  }

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
