"use client";

import { Badge } from "@/components/ui/badge";
import { type Consultation } from "@/lib/database.types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatScheduledTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminDashboard() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadConsultations() {
      try {
        const response = await fetch("/api/admin/consultations", {
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace("/auth/login");
          return;
        }

        if (response.status === 403) {
          router.replace("/protected");
          return;
        }

        const payload = (await response.json()) as {
          data?: Consultation[];
          error?: { message?: string };
        };

        if (!response.ok || !payload.data) {
          throw new Error(
            payload.error?.message ?? "Unable to load consultations",
          );
        }

        setConsultations(payload.data);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadConsultations();

    return () => controller.abort();
  }, [router]);

  return (
    <section className="w-full space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          All consultations
        </h1>
        <p className="mt-2 text-muted-foreground">
          Read-only visibility across every student consultation.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground" role="status">
          Loading consultations…
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!isLoading && !error && consultations.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">No consultations found</p>
        </div>
      )}

      {!isLoading && !error && consultations.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <caption className="sr-only">
              Consultations across all students
            </caption>
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-medium" scope="col">
                  Student
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Date and time
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Reason
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Status
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Owner ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {consultations.map((consultation) => (
                <tr key={consultation.id}>
                  <td className="px-4 py-3 font-medium">
                    {consultation.first_name} {consultation.last_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <time dateTime={consultation.scheduled_at}>
                      {formatScheduledTime(consultation.scheduled_at)}
                    </time>
                  </td>
                  <td className="max-w-sm whitespace-pre-wrap px-4 py-3 text-muted-foreground">
                    {consultation.reason}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className="capitalize"
                      variant={
                        consultation.status === "cancelled"
                          ? "destructive"
                          : consultation.status === "completed"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {consultation.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {consultation.student_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
