import { z } from "zod";

export const EventSourceSchema = z.enum(["claude-code", "codex", "antigravity", "manual-demo"]);
export type EventSource = z.infer<typeof EventSourceSchema>;

export const EventTypeSchema = z.enum([
  "session_started",
  "user_prompt",
  "tool_result",
  "file_changed",
  "test_failed",
  "test_passed",
  "turn_stopped",
  "session_ended",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const SessionEventSchema = z.object({
  eventId: z.string(),
  sessionId: z.string(),
  installationId: z.string(),
  source: EventSourceSchema,
  type: EventTypeSchema,
  timestamp: z.number(),
  payload: z.record(z.string(), z.unknown()),
  sanitized: z.boolean().default(true),
  riskFlags: z.array(z.string()).optional(),
  summary: z.string().optional(),
});
export type SessionEvent = z.infer<typeof SessionEventSchema>;

export const EventBatchSchema = z.object({
  installationId: z.string(),
  sessionId: z.string(),
  source: EventSourceSchema,
  events: z.array(SessionEventSchema),
});
export type EventBatch = z.infer<typeof EventBatchSchema>;
