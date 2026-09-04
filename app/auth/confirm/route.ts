import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

const DEFAULT_REDIRECT_PATH = "/protected";

function getSafeRedirectPath(next: string | null) {
  if (!next?.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const errorUrl = new URL("/auth/error", request.url);
  errorUrl.searchParams.set("error", "confirmation_failed");

  return NextResponse.redirect(errorUrl);
}
