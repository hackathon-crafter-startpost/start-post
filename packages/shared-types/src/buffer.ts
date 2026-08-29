import { z } from "zod";

export const BufferPublishModeSchema = z.enum([
  "addToQueue",
  "now",
  "next",
  "customScheduled",
]);
export type BufferPublishMode = z.infer<typeof BufferPublishModeSchema>;

export const BufferOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type BufferOrganization = z.infer<typeof BufferOrganizationSchema>;

export const BufferChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  service: z.string(), // "linkedin" | "twitter" | "threads" | "bluesky" | "facebook" | "instagram" | "pinterest" | "tiktok" | "youtube" | etc.
  avatar: z.string().optional(),
});
export type BufferChannel = z.infer<typeof BufferChannelSchema>;

export const BufferSettingsSchema = z.object({
  apiKey: z.string(),
  organizationId: z.string().optional(),
  organizationName: z.string().optional(),
  channelId: z.string().optional(),
  channelName: z.string().optional(),
  channelService: z.string().optional(),
  autoPublish: z.boolean().default(false),
  publishMode: BufferPublishModeSchema.default("addToQueue"),
  updatedAt: z.number().optional(),
});
export type BufferSettings = z.infer<typeof BufferSettingsSchema>;

export const BufferCreatePostInputSchema = z.object({
  channelId: z.string(),
  text: z.string(),
  schedulingType: z.enum(["automatic", "manual"]).default("automatic"),
  mode: BufferPublishModeSchema.default("addToQueue"),
  dueAt: z.string().optional(),
  imageUrl: z.string().optional(),
});
export type BufferCreatePostInput = z.infer<typeof BufferCreatePostInputSchema>;

export const BufferCreateIdeaInputSchema = z.object({
  organizationId: z.string(),
  title: z.string(),
  text: z.string(),
});
export type BufferCreateIdeaInput = z.infer<typeof BufferCreateIdeaInputSchema>;

export const BufferPublicationStatusSchema = z.enum([
  "scheduled",
  "published",
  "idea_created",
  "failed",
]);
export type BufferPublicationStatus = z.infer<typeof BufferPublicationStatusSchema>;

export const BufferPublicationRecordSchema = z.object({
  id: z.string().optional(),
  momentId: z.string(),
  postDraftId: z.string().optional(),
  bufferPostId: z.string().optional(),
  bufferIdeaId: z.string().optional(),
  channelId: z.string().optional(),
  channelName: z.string().optional(),
  channelService: z.string().optional(),
  status: BufferPublicationStatusSchema,
  mode: z.string(),
  text: z.string(),
  imageUrl: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.number(),
});
export type BufferPublicationRecord = z.infer<typeof BufferPublicationRecordSchema>;
