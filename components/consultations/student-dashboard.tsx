"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ConsultationSummary } from "@/lib/database.types";
import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

type BookingForm = {
  firstName: string;
  lastName: string;
  reason: string;
  scheduledAt: string;
};

type FieldErrors = Partial<Record<keyof BookingForm, string[]>>;

type ApiError = {
  error?: {
    fields?: FieldErrors;
    message?: string;
  };
};

const EMPTY_FORM: BookingForm = {
  firstName: "",
  lastName: "",
  reason: "",
  scheduledAt: "",
};

function sortByScheduledTime(consultations: ConsultationSummary[]) {
  return [...consultations].sort(
    (left, right) =>
      Date.parse(left.scheduled_at) - Date.parse(right.scheduled_at),
  );
}

function formatScheduledTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ConsultationList({
  consultations,
  isLoading,
}: {
  consultations: ConsultationSummary[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading consultations…
      </p>
    );
  }

  if (consultations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <CalendarDays
          aria-hidden="true"
          className="mx-auto mb-3 size-8 text-muted-foreground"
        />
        <p className="font-medium">No consultations booked</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the booking form to schedule your first consultation.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {consultations.map((consultation) => (
        <li key={consultation.id}>
          <article className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  {consultation.first_name} {consultation.last_name}
                </h3>
                <time
                  className="mt-1 block text-sm text-muted-foreground"
                  dateTime={consultation.scheduled_at}
                >
                  {formatScheduledTime(consultation.scheduled_at)}
                </time>
              </div>
              <Badge
                variant={
                  consultation.status === "cancelled"
                    ? "destructive"
                    : consultation.status === "completed"
                      ? "secondary"
                      : "outline"
                }
                className="capitalize"
              >
                {consultation.status}
              </Badge>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm">
              {consultation.reason}
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
}

export function StudentDashboard() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<ConsultationSummary[]>([]);
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadConsultations() {
      try {
        const response = await fetch("/api/consultations", {
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace("/auth/login");
          return;
        }

        const payload = (await response.json()) as {
          data?: ConsultationSummary[];
          error?: { message?: string };
        };

        if (!response.ok || !payload.data) {
          throw new Error(
            payload.error?.message ?? "Unable to load consultations",
          );
        }

        setConsultations(sortByScheduledTime(payload.data));
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setPageError(error.message);
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

  function updateField(field: keyof BookingForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const scheduledDate = new Date(form.scheduledAt);

    if (Number.isNaN(scheduledDate.getTime())) {
      setFieldErrors({ scheduledAt: ["Enter a valid date and time"] });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scheduledAt: scheduledDate.toISOString(),
        }),
      });

      if (response.status === 401) {
        router.replace("/auth/login");
        return;
      }

      const payload = (await response.json()) as
        | { data: ConsultationSummary }
        | ApiError;

      if (!response.ok || !("data" in payload)) {
        const error = "error" in payload ? payload.error : undefined;
        setFieldErrors(error?.fields ?? {});
        throw new Error(error?.message ?? "Unable to book consultation");
      }

      setConsultations((current) =>
        sortByScheduledTime([...current, payload.data]),
      );
      setForm(EMPTY_FORM);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to book consultation",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Student consultation portal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Student dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Book a consultation and keep track of your appointments.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Your consultations</h2>
            <CardDescription>
              Appointments are shown in chronological order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pageError ? (
              <p className="text-sm text-destructive" role="alert">
                {pageError}
              </p>
            ) : (
              <ConsultationList
                consultations={consultations}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Book a consultation</h2>
            <CardDescription>
              Choose a future date and provide a short reason.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  maxLength={100}
                  required
                  value={form.firstName}
                  onChange={(event) =>
                    updateField("firstName", event.target.value)
                  }
                  aria-invalid={Boolean(fieldErrors?.firstName)}
                />
                {fieldErrors?.firstName?.[0] && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.firstName[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  maxLength={100}
                  required
                  value={form.lastName}
                  onChange={(event) =>
                    updateField("lastName", event.target.value)
                  }
                  aria-invalid={Boolean(fieldErrors?.lastName)}
                />
                {fieldErrors?.lastName?.[0] && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.lastName[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for consultation</Label>
                <Textarea
                  id="reason"
                  maxLength={1000}
                  required
                  value={form.reason}
                  onChange={(event) =>
                    updateField("reason", event.target.value)
                  }
                  aria-invalid={Boolean(fieldErrors?.reason)}
                />
                {fieldErrors?.reason?.[0] && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.reason[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Date and time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  required
                  value={form.scheduledAt}
                  onChange={(event) =>
                    updateField("scheduledAt", event.target.value)
                  }
                  aria-invalid={Boolean(fieldErrors?.scheduledAt)}
                />
                {fieldErrors?.scheduledAt?.[0] && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.scheduledAt[0]}
                  </p>
                )}
              </div>

              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}

              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Booking…" : "Book consultation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
