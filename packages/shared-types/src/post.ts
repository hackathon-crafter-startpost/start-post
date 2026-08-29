import { z } from "zod";
import { ImageManifestSchema } from "./image";

export const PostPlatformSchema = z.enum(["linkedin", "twitter", "threads"]);
export type PostPlatform = z.infer<typeof PostPlatformSchema>;

export const PostStatusSchema = z.enum(["draft", "edited", "ready", "exported"]);
export type PostStatus = z.infer<typeof PostStatusSchema>;

export const PostDraftSchema = z.object({
  platform: PostPlatformSchema.default("linkedin"),
  hook: z.string(),
  body: z.string(),
  takeaway: z.string(),
  cta: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  imageManifest: ImageManifestSchema,
  status: PostStatusSchema.default("draft"),
});
export type PostDraft = z.infer<typeof PostDraftSchema>;

export const FeedbackActionSchema = z.enum(["accept", "edit", "discard"]);
export type FeedbackAction = z.infer<typeof FeedbackActionSchema>;
