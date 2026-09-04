"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ConsultationSummary } from "@/lib/database.types";
import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type UpdatePayload =
  | { action: "reschedule"; scheduledAt: string }
  | { action: "setCompletion"; completed: boolean }
  | { action: "cancel" };

type ConsultationListProps = {
  consultations: ConsultationSummary[];
  isLoading: boolean;
  onUpdated: (consultation: ConsultationSummary) => void;
};

function formatScheduledTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localTime.toISOString().slice(0, 16);
}

export function ConsultationList({
  consultations,
  isLoading,
  onUpdated,
}: ConsultationListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  async function updateConsultation(id: string, update: UpdatePayload) {
    setActionId(id);
    setActionError(null);

    try {
      const response = await fetch(`/api/consultations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });

      if (response.status === 401) {
        router.replace("/auth/login");
        return;
      }

      const payload = (await response.json()) as {
        data?: ConsultationSummary;
        error?: { message?: string };
      };

      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Unable to update consultation",
        );
      }

      onUpdated(payload.data);
      setEditingId(null);
    } catch (error) {
      setActionError({
        id,
        message:
          error instanceof Error
            ? error.message
            : "Unable to update consultation",
      });
    } finally {
      setActionId(null);
    }
  }

  function beginReschedule(consultation: ConsultationSummary) {
    setEditingId(consultation.id);
    setRescheduleAt(toLocalDateTimeInput(consultation.scheduled_at));
    setActionError(null);
  }

  function handleReschedule(
    event: FormEvent<HTMLFormElement>,
    consultationId: string,
  ) {
    event.preventDefault();
    const scheduledDate = new Date(rescheduleAt);

    if (Number.isNaN(scheduledDate.getTime())) {
      setActionError({
        id: consultationId,
        message: "Enter a valid date and time",
      });
      return;
    }

    void updateConsultation(consultationId, {
      action: "reschedule",
      scheduledAt: scheduledDate.toISOString(),
    });
  }

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
      {consultations.map((consultation) => {
        const isUpdating = actionId === consultation.id;
        const isEditing = editingId === consultation.id;

        return (
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

              {consultation.status !== "cancelled" && !isEditing && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={isUpdating}
                    onClick={() =>
                      void updateConsultation(consultation.id, {
                        action: "setCompletion",
                        completed: consultation.status === "scheduled",
                      })
                    }
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {consultation.status === "completed"
                      ? "Mark incomplete"
                      : "Mark complete"}
                  </Button>

                  {consultation.status === "scheduled" && (
                    <>
                      <Button
                        disabled={isUpdating}
                        onClick={() => beginReschedule(consultation)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Reschedule
                      </Button>
                      <Button
                        disabled={isUpdating}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Cancel this consultation? This cannot be undone.",
                            )
                          ) {
                            void updateConsultation(consultation.id, {
                              action: "cancel",
                            });
                          }
                        }}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              )}

              {isEditing && (
                <form
                  className="mt-4 space-y-3 rounded-md bg-muted/40 p-3"
                  onSubmit={(event) =>
                    handleReschedule(event, consultation.id)
                  }
                >
                  <div className="space-y-2">
                    <Label htmlFor={`reschedule-${consultation.id}`}>
                      New date and time
                    </Label>
                    <Input
                      id={`reschedule-${consultation.id}`}
                      disabled={isUpdating}
                      onChange={(event) => setRescheduleAt(event.target.value)}
                      required
                      type="datetime-local"
                      value={rescheduleAt}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={isUpdating} size="sm" type="submit">
                      {isUpdating ? "Saving…" : "Save new time"}
                    </Button>
                    <Button
                      disabled={isUpdating}
                      onClick={() => setEditingId(null)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Close
                    </Button>
                  </div>
                </form>
              )}

              {actionError?.id === consultation.id && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {actionError.message}
                </p>
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
