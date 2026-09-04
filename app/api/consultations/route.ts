import { createConsultationSchema } from "@/lib/consultations/validation";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const CONSULTATION_FIELDS =
  "id, first_name, last_name, reason, scheduled_at, status, created_at, updated_at";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required",
      },
    },
    { status: 401 },
  );
}

function databaseErrorResponse() {
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed",
      },
    },
    { status: 500 },
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const studentId = authData?.claims?.sub;

  if (authError || !studentId) {
    return unauthorizedResponse();
  }

  const { data, error } = await supabase
    .from("consultations")
    .select(CONSULTATION_FIELDS)
    .eq("student_id", studentId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("Failed to list consultations", { code: error.code });
    return databaseErrorResponse();
  }

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const studentId = authData?.claims?.sub;

  if (authError || !studentId) {
    return unauthorizedResponse();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON",
        },
      },
      { status: 400 },
    );
  }

  const parsed = createConsultationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Consultation details are invalid",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const { firstName, lastName, reason, scheduledAt } = parsed.data;
  const { data, error } = await supabase
    .from("consultations")
    .insert({
      student_id: studentId,
      first_name: firstName,
      last_name: lastName,
      reason,
      scheduled_at: scheduledAt,
    })
    .select(CONSULTATION_FIELDS)
    .single();

  if (error) {
    console.error("Failed to create consultation", { code: error.code });
    return databaseErrorResponse();
  }

  return NextResponse.json(
    { data },
    {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
