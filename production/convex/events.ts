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

    // 1. Look up installation to link userId and update activity
    const installation = await ctx.db
      .query("installations")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.installationId))
      .first();

    let userId: string | undefined = installation?.userId;

    if (installation) {
      await ctx.db.patch(installation._id, {
        lastSeenAt: Date.now(),
      });
    }

    // If events array is empty (e.g. heartbeat, ping, link check, status check),
    // DO NOT create an empty/ghost session. Just update installation lastSeenAt.
    if (!args.events || args.events.length === 0) {
      return { success: true, ingested: 0 };
    }

    // 2. Ensure session exists or create it
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      await ctx.db.insert("sessions", {
        sessionId: args.sessionId,
        userId,
        installationId: args.installationId,
        source: args.source,
        status: "active",
        startedAt: Date.now(),
        analysisStatus: "pending",
        eventCount: args.events.length,
      });
    } else {
      await ctx.db.patch(session._id, {
        userId: userId || session.userId,
        eventCount: (session.eventCount || 0) + args.events.length,
      });
    }

    // 3. Ingest events idempotently
    for (const evt of args.events) {
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
