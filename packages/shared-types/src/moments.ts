import { z } from "zod";

export const MomentCategorySchema = z.enum([
  "bug_fix",
  "lesson",
  "performance",
  "architecture",
  "automation",
]);
export type MomentCategory = z.infer<typeof MomentCategorySchema>;

export const MomentStatusSchema = z.enum([
  "detected",
  "suggested",
  "approved",
  "edited",
  "discarded",
]);
export type MomentStatus = z.infer<typeof MomentStatusSchema>;

export const ScoreBreakdownSchema = z.object({
  problem: z.number().min(0).max(25),
  lesson: z.number().min(0).max(25),
  reuse: z.number().min(0).max(20),
  evidence: z.number().min(0).max(15),
  clarity: z.number().min(0).max(15),
  penalty: z.number().min(0).max(50).default(0),
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

export const MomentAnalysisSchema = z.object({
  shouldCreate: z.boolean(),
  score: z.number().min(0).max(100),
  reason: z.string(),
  category: MomentCategorySchema,
  title: z.string(),
  problem: z.string(),
  discovery: z.string(),
  solution: z.string(),
  lesson: z.string(),
  evidenceEventIds: z.array(z.string()),
  sensitivityFlags: z.array(z.string()).default([]),
  scoreBreakdown: ScoreBreakdownSchema.optional(),
});
export type MomentAnalysis = z.infer<typeof MomentAnalysisSchema>;
