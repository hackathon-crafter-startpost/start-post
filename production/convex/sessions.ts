import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const identity = await ctx.auth.getUserIdentity();
    const effectiveUserId = args.userId || identity?.subject;

    if (effectiveUserId) {
      const userSessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", effectiveUserId))
        .order("desc")
        .take(limit);

      if (userSessions.length > 0) {
        return userSessions;
      }
    }

    return await ctx.db
      .query("sessions")
      .order("desc")
      .take(limit);
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
    installationId: v.string(),
    source: v.string(),
    projectId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const inst = await ctx.db
      .query("installations")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.installationId))
      .first();

    return await ctx.db.insert("sessions", {
      userId: identity?.subject || inst?.userId,
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
