import { z } from "zod";

export const ImageTemplateSchema = z.enum([
  "bug-fix",
  "before-after",
  "lesson",
  "infographic",
  "performance",
  "architecture",
]);
export type ImageTemplate = z.infer<typeof ImageTemplateSchema>;

export const ImageMetricSchema = z.object({
  label: z.string(),
  before: z.string(),
  after: z.string(),
});

export const ImageManifestSchema = z.object({
  template: ImageTemplateSchema.default("bug-fix"),
  headline: z.string(),
  eyebrow: z.string(),
  problem: z.string(),
  codeBefore: z.string().optional(),
  codeAfter: z.string().optional(),
  result: z.string(),
  takeaway: z.string(),
  accentColor: z.string().default("#0066cc"),
  authorName: z.string().optional(),
  category: z.string().optional(),
  graphicType: z.string().optional(),
  metrics: z.array(ImageMetricSchema).optional(),
  diagramNodes: z.array(z.string()).optional(),
  visualBadge: z.string().optional(),
});
export type ImageManifest = z.infer<typeof ImageManifestSchema>;

