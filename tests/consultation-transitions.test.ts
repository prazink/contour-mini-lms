import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planConsultationUpdate } from "../lib/consultations/transitions.ts";

describe("planConsultationUpdate", () => {
  it("plans a reschedule only from scheduled", () => {
    const update = {
      action: "reschedule" as const,
      scheduledAt: "2099-02-10T09:00:00.000Z",
    };

    assert.deepEqual(planConsultationUpdate("scheduled", update), {
      kind: "apply",
      requiredStatus: "scheduled",
      changes: { scheduled_at: update.scheduledAt },
    });
    assert.deepEqual(planConsultationUpdate("completed", update), {
      kind: "invalid",
    });
  });

  it("plans cancellation only from scheduled", () => {
    assert.deepEqual(
      planConsultationUpdate("scheduled", { action: "cancel" }),
      {
        kind: "apply",
        requiredStatus: "scheduled",
        changes: { status: "cancelled" },
      },
    );
    assert.deepEqual(
      planConsultationUpdate("completed", { action: "cancel" }),
      { kind: "invalid" },
    );
  });

  it("moves scheduled consultations to completed", () => {
    assert.deepEqual(
      planConsultationUpdate("scheduled", {
        action: "setCompletion",
        completed: true,
      }),
      {
        kind: "apply",
        requiredStatus: "scheduled",
        changes: { status: "completed" },
      },
    );
  });

  it("moves completed consultations back to scheduled", () => {
    assert.deepEqual(
      planConsultationUpdate("completed", {
        action: "setCompletion",
        completed: false,
      }),
      {
        kind: "apply",
        requiredStatus: "completed",
        changes: { status: "scheduled" },
      },
    );
  });

  it("treats repeated completion changes as idempotent", () => {
    assert.deepEqual(
      planConsultationUpdate("completed", {
        action: "setCompletion",
        completed: true,
      }),
      { kind: "noop" },
    );
  });

  it("keeps cancelled consultations immutable", () => {
    assert.deepEqual(
      planConsultationUpdate("cancelled", {
        action: "setCompletion",
        completed: true,
      }),
      { kind: "invalid" },
    );
  });
});
