import { z } from "zod";

const futureDateTimeSchema = z
  .iso.datetime({ offset: true })
  .refine((value) => Date.parse(value) > Date.now(), {
    message: "Consultation must be scheduled in the future",
  });

export const createConsultationSchema = z
  .strictObject({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    reason: z.string().trim().min(1).max(1000),
    scheduledAt: futureDateTimeSchema,
  })
  .strict();

export const updateConsultationSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("reschedule"),
    scheduledAt: futureDateTimeSchema,
  }),
  z.strictObject({
    action: z.literal("setCompletion"),
    completed: z.boolean(),
  }),
  z.strictObject({
    action: z.literal("cancel"),
  }),
]);

export type CreateConsultationInput = z.infer<
  typeof createConsultationSchema
>;

export type UpdateConsultationInput = z.infer<
  typeof updateConsultationSchema
>;
