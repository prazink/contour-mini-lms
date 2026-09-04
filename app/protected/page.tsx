import { StudentDashboard } from "@/components/consultations/student-dashboard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function DashboardContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.claims.sub)
    .single();

  if (profile?.role === "admin") {
    redirect("/admin");
  }

  return <StudentDashboard />;
}

export default function ProtectedPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <DashboardContent />
    </Suspense>
  );
}
