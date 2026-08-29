import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
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
    return await ctx.db.insert("sessions", {
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
