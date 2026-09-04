import { type Database } from "../database.types.ts";
import { type UpdateConsultationInput } from "./validation.ts";

type ConsultationStatus = Database["public"]["Enums"]["consultation_status"];

type TransitionPlan =
  | {
      kind: "apply";
      requiredStatus: ConsultationStatus;
      changes: { scheduled_at?: string; status?: ConsultationStatus };
    }
  | { kind: "noop" }
  | { kind: "invalid" };

export function planConsultationUpdate(
  currentStatus: ConsultationStatus,
  update: UpdateConsultationInput,
): TransitionPlan {
  if (update.action === "reschedule") {
    return currentStatus === "scheduled"
      ? {
          kind: "apply",
          requiredStatus: "scheduled",
          changes: { scheduled_at: update.scheduledAt },
        }
      : { kind: "invalid" };
  }

  if (update.action === "cancel") {
    return currentStatus === "scheduled"
      ? {
          kind: "apply",
          requiredStatus: "scheduled",
          changes: { status: "cancelled" },
        }
      : { kind: "invalid" };
  }

  const targetStatus = update.completed ? "completed" : "scheduled";

  if (currentStatus === targetStatus) {
    return { kind: "noop" };
  }

  const requiredStatus = update.completed ? "scheduled" : "completed";

  return currentStatus === requiredStatus
    ? {
        kind: "apply",
        requiredStatus,
        changes: { status: targetStatus },
      }
    : { kind: "invalid" };
}
