import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function DashboardContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <section className="w-full space-y-3">
      <h1 className="text-3xl font-bold tracking-tight">Student dashboard</h1>
      <p className="text-muted-foreground">
        Consultation management will be added in the next milestone.
      </p>
    </section>
  );
}

export default function ProtectedPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <DashboardContent />
    </Suspense>
  );
}
