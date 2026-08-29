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

    let moments = [];
    if (effectiveUserId) {
      try {
        const userMoments = await ctx.db
          .query("moments")
          .withIndex("by_user", (q) => q.eq("userId", effectiveUserId))
          .order("desc")
          .take(limit);

        if (userMoments.length > 0) {
          moments = userMoments;
        } else {
          moments = await ctx.db.query("moments").order("desc").take(limit);
        }
      } catch {
        moments = await ctx.db.query("moments").order("desc").take(limit);
      }
    } else {
      moments = await ctx.db.query("moments").order("desc").take(limit);
    }

    // Attach postDraft and session info if available
    const enriched = await Promise.all(
      moments.map(async (m) => {
        try {
          const postDraft = await ctx.db
            .query("postDrafts")
            .withIndex("by_moment", (q) => q.eq("momentId", m._id))
            .first();
          return {
            ...m,
            postDraft,
          };
        } catch {
          return { ...m, postDraft: null };
        }
      })
    );

    return enriched;
  },
});

export const get = query({
  args: { momentId: v.id("moments") },
  handler: async (ctx, args) => {
    const moment = await ctx.db.get(args.momentId);
    if (!moment) return null;

    const postDraft = await ctx.db
      .query("postDrafts")
      .withIndex("by_moment", (q) => q.eq("momentId", moment._id))
      .first();

    return {
      ...moment,
      postDraft,
    };
  },
});

export const getBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const moment = await ctx.db
      .query("moments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!moment) return null;

    const postDraft = await ctx.db
      .query("postDrafts")
      .withIndex("by_moment", (q) => q.eq("momentId", moment._id))
      .first();

    return {
      ...moment,
      postDraft,
    };
  },
});

export const updateStatus = mutation({
  args: {
    momentId: v.id("moments"),
    status: v.string(), // "approved" | "edited" | "discarded"
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.momentId, {
      status: args.status,
    });
    return { success: true };
  },
});
