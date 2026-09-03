import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <Link href="/" className="font-semibold">
              Contour Consultations
            </Link>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>
        <section className="flex w-full max-w-5xl flex-1 items-center px-5 py-20">
          <div className="max-w-2xl space-y-6">
            <p className="text-sm font-medium text-muted-foreground">
              Student consultation portal
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Book and manage your consultations
            </h1>
            <p className="text-lg text-muted-foreground">
              Sign in to schedule consultations, reschedule appointments and
              keep track of completion.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/auth/sign-up">Create account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
        <footer className="flex w-full items-center justify-center gap-4 border-t py-6 text-sm text-muted-foreground">
          <span>Contour Consultations</span>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
