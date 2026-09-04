import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createConsultationSchema } from "../lib/consultations/validation.ts";

const validConsultation = {
  firstName: "Ada",
  lastName: "Lovelace",
  reason: "Discuss course planning",
  scheduledAt: "2099-01-10T09:00:00.000Z",
};

describe("createConsultationSchema", () => {
  it("accepts and trims valid consultation details", () => {
    const result = createConsultationSchema.parse({
      ...validConsultation,
      firstName: "  Ada  ",
    });

    assert.equal(result.firstName, "Ada");
  });

  it("rejects blank names", () => {
    const result = createConsultationSchema.safeParse({
      ...validConsultation,
      firstName: "   ",
    });

    assert.equal(result.success, false);
  });

  it("rejects datetimes without an explicit timezone", () => {
    const result = createConsultationSchema.safeParse({
      ...validConsultation,
      scheduledAt: "2099-01-10T09:00:00",
    });

    assert.equal(result.success, false);
  });

  it("rejects past consultations", () => {
    const result = createConsultationSchema.safeParse({
      ...validConsultation,
      scheduledAt: "2000-01-10T09:00:00.000Z",
    });

    assert.equal(result.success, false);
  });

  it("rejects reasons longer than the database limit", () => {
    const result = createConsultationSchema.safeParse({
      ...validConsultation,
      reason: "a".repeat(1001),
    });

    assert.equal(result.success, false);
  });

  it("rejects client-controlled ownership and status fields", () => {
    const result = createConsultationSchema.safeParse({
      ...validConsultation,
      studentId: "22222222-2222-4222-8222-222222222222",
      status: "completed",
    });

    assert.equal(result.success, false);
  });
});
