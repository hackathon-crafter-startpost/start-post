import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    contentStyle: v.optional(v.string()), // "cercano" | "técnico" | "profesional" | "directo"
    audienceLevel: v.optional(v.string()), // "principiante" | "intermedio" | "avanzado"
    preferredPlatform: v.optional(v.string()), // "linkedin" | "twitter"
    accentColor: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkUserId"]),

  installations: defineTable({
    userId: v.optional(v.string()),
    source: v.string(), // "claude-code" | "codex" | "manual-demo"
    tokenHash: v.string(),
    deviceName: v.optional(v.string()),
    lastSeenAt: v.number(),
    enabled: v.boolean(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_user", ["userId"]),

  projects: defineTable({
    userId: v.optional(v.string()),
    repositoryHash: v.string(),
    displayName: v.string(),
    privacyMode: v.string(), // "standard" | "strict" | "offline"
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_repo_hash", ["repositoryHash"]),

  sessions: defineTable({
    sessionId: v.optional(v.string()),
    userId: v.optional(v.string()),
    projectId: v.optional(v.string()),
    installationId: v.string(),
    source: v.string(), // "claude-code" | "codex" | "manual-demo"
    status: v.string(), // "active" | "completed" | "analyzed"
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    analysisStatus: v.string(), // "pending" | "analyzed" | "skipped"
    eventCount: v.optional(v.number()),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_installation", ["installationId"])
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  events: defineTable({
    sessionId: v.string(),
    eventId: v.string(),
    type: v.string(), // "user_prompt" | "tool_result" | "file_changed" | "test_failed" | "test_passed" | "turn_stopped"
    summary: v.optional(v.string()),
    payload: v.any(),
    timestamp: v.number(),
    riskFlags: v.optional(v.array(v.string())),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_event_id", ["eventId"]),

  moments: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.string(),
    category: v.string(), // "bug_fix" | "lesson" | "performance" | "architecture" | "automation"
    title: v.string(),
    problem: v.string(),
    discovery: v.string(),
    solution: v.string(),
    lesson: v.string(),
    score: v.number(),
    scoreBreakdown: v.optional(
      v.object({
        problem: v.number(),
        lesson: v.number(),
        reuse: v.number(),
        evidence: v.number(),
        clarity: v.number(),
        penalty: v.number(),
      })
    ),
    evidenceEventIds: v.array(v.string()),
    sensitivityFlags: v.array(v.string()),
    status: v.string(), // "detected" | "suggested" | "approved" | "edited" | "discarded"
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  postDrafts: defineTable({
    momentId: v.id("moments"),
    platform: v.string(), // "linkedin" | "twitter"
    hook: v.string(),
    body: v.string(),
    takeaway: v.string(),
    cta: v.optional(v.string()),
    hashtags: v.array(v.string()),
    imageManifest: v.object({
      template: v.string(),
      headline: v.string(),
      eyebrow: v.string(),
      problem: v.string(),
      codeBefore: v.optional(v.string()),
      codeAfter: v.optional(v.string()),
      result: v.string(),
      takeaway: v.string(),
      accentColor: v.string(),
      authorName: v.optional(v.string()),
      category: v.optional(v.string()),
    }),
    status: v.string(), // "draft" | "edited" | "ready"
    updatedAt: v.number(),
  }).index("by_moment", ["momentId"]),

  assets: defineTable({
    postDraftId: v.id("postDrafts"),
    storageId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    format: v.string(),
    createdAt: v.number(),
  }).index("by_post_draft", ["postDraftId"]),

  feedback: defineTable({
    momentId: v.id("moments"),
    action: v.string(), // "accept" | "edit" | "discard"
    editedFields: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_moment", ["momentId"]),
});
