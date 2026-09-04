import { z } from "zod";

export const createConsultationSchema = z
  .strictObject({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    reason: z.string().trim().min(1).max(1000),
    scheduledAt: z.iso.datetime({ offset: true }),
  })
  .refine((value) => Date.parse(value.scheduledAt) > Date.now(), {
    path: ["scheduledAt"],
    message: "Consultation must be scheduled in the future",
  });

export type CreateConsultationInput = z.infer<
  typeof createConsultationSchema
>;
