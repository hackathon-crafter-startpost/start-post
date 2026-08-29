import { z } from "zod";

export const ImageTemplateSchema = z.enum(["bug-fix", "before-after", "lesson"]);
export type ImageTemplate = z.infer<typeof ImageTemplateSchema>;

export const ImageManifestSchema = z.object({
  template: ImageTemplateSchema.default("bug-fix"),
  headline: z.string(),
  eyebrow: z.string(),
  problem: z.string(),
  codeBefore: z.string().optional(),
  codeAfter: z.string().optional(),
  result: z.string(),
  takeaway: z.string(),
  accentColor: z.string().default("#3b82f6"),
  authorName: z.string().optional(),
  category: z.string().optional(),
});
export type ImageManifest = z.infer<typeof ImageManifestSchema>;
