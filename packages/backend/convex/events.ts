import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const ingestBatch = mutation({
  args: {
    installationId: v.string(),
    sessionId: v.string(),
    source: v.string(),
    events: v.array(
      v.object({
        eventId: v.string(),
        sessionId: v.string(),
        installationId: v.string(),
        source: v.string(),
        type: v.string(),
        timestamp: v.number(),
        payload: v.any(),
        summary: v.optional(v.string()),
        sanitized: v.optional(v.boolean()),
        riskFlags: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    let newEventsCount = 0;

    // Ensure session exists or create it
    const sessionByInstallation = await ctx.db
      .query("sessions")
      .withIndex("by_installation", (q) => q.eq("installationId", args.installationId))
      .first();

    if (!sessionByInstallation) {
      await ctx.db.insert("sessions", {
        installationId: args.installationId,
        source: args.source,
        status: "active",
        startedAt: Date.now(),
        analysisStatus: "pending",
        eventCount: args.events.length,
      });
    }

    for (const evt of args.events) {
      // Idempotency check: check if eventId already exists
      const existing = await ctx.db
        .query("events")
        .withIndex("by_event_id", (q) => q.eq("eventId", evt.eventId))
        .first();

      if (!existing) {
        await ctx.db.insert("events", {
          sessionId: args.sessionId,
          eventId: evt.eventId,
          type: evt.type,
          summary: evt.summary,
          payload: evt.payload,
          timestamp: evt.timestamp || Date.now(),
          riskFlags: evt.riskFlags,
        });
        newEventsCount++;
      }
    }

    return { success: true, ingested: newEventsCount };
  },
});

export const listBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});
