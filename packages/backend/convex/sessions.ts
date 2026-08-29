import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    let identitySubject: string | undefined;
    try {
      const identity = await ctx.auth.getUserIdentity();
      identitySubject = identity?.subject;
    } catch {}

    const effectiveUserId = args.userId || identitySubject;

    let sessionsList: any[] = [];
    if (effectiveUserId) {
      try {
        const userSessions = await ctx.db
          .query("sessions")
          .withIndex("by_user", (q) => q.eq("userId", effectiveUserId))
          .order("desc")
          .take(limit);

        if (userSessions.length > 0) {
          sessionsList = userSessions;
        }
      } catch {}
    }

    if (sessionsList.length === 0) {
      try {
        sessionsList = await ctx.db
          .query("sessions")
          .order("desc")
          .take(limit);
      } catch {
        sessionsList = [];
      }
    }

    // Filter out ghost/empty sessions (0 events or ping/health checks)
    return sessionsList.filter((s) => {
      const isPingOrHealth = s.sessionId?.startsWith("ping_") || s.sessionId?.startsWith("health_check");
      const hasEvents = (s.eventCount ?? 0) > 0;
      return hasEvents && !isPingOrHealth;
    });
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const create = mutation({
  args: {
    sessionId: v.optional(v.string()),
    installationId: v.string(),
    source: v.string(),
    projectId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let identitySubject: string | undefined;
    try {
      const identity = await ctx.auth.getUserIdentity();
      identitySubject = identity?.subject;
    } catch {}

    const inst = await ctx.db
      .query("installations")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.installationId))
      .first();

    return await ctx.db.insert("sessions", {
      sessionId: args.sessionId || `sess_${Date.now()}`,
      userId: identitySubject || inst?.userId,
      installationId: args.installationId,
      source: args.source,
      projectId: args.projectId,
      status: "active",
      startedAt: Date.now(),
      analysisStatus: "pending",
      eventCount: 0,
    });
  },
});

export const finish = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "completed",
      endedAt: Date.now(),
    });
    return { success: true };
  },
});

export const deleteSession = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return { success: false, reason: "Session not found" };

    if (session.sessionId) {
      const events = await ctx.db
        .query("events")
        .withIndex("by_session_id", (q) => q.eq("sessionId", session.sessionId!))
        .collect();
      for (const evt of events) {
        await ctx.db.delete(evt._id);
      }

      const moments = await ctx.db
        .query("moments")
        .withIndex("by_session", (q) => q.eq("sessionId", session.sessionId!))
        .collect();
      for (const m of moments) {
        const postDrafts = await ctx.db
          .query("postDrafts")
          .withIndex("by_moment", (q) => q.eq("momentId", m._id))
          .collect();
        for (const pd of postDrafts) {
          await ctx.db.delete(pd._id);
        }
        await ctx.db.delete(m._id);
      }
    }

    await ctx.db.delete(session._id);
    return { success: true };
  },
});

export const cleanEmptySessions = mutation({
  args: {},
  handler: async (ctx) => {
    const allSessions = await ctx.db.query("sessions").collect();
    let cleaned = 0;
    for (const s of allSessions) {
      const isPingOrHealth = s.sessionId?.startsWith("ping_") || s.sessionId?.startsWith("health_check");
      const hasZeroCount = (s.eventCount ?? 0) === 0;

      let eventCountInDb = 0;
      if (s.sessionId) {
        const events = await ctx.db
          .query("events")
          .withIndex("by_session_id", (q) => q.eq("sessionId", s.sessionId!))
          .take(1);
        eventCountInDb = events.length;
      }

      if (eventCountInDb === 0 && (hasZeroCount || isPingOrHealth || !s.sessionId)) {
        await ctx.db.delete(s._id);
        cleaned++;
      }
    }
    return { success: true, cleanedCount: cleaned };
  },
});
