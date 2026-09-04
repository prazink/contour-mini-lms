import { AdminDashboard } from "@/components/consultations/admin-dashboard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function AdminContent() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (authError || !userId) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role !== "admin") {
    redirect("/protected");
  }

  return <AdminDashboard />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <AdminContent />
    </Suspense>
  );
}
