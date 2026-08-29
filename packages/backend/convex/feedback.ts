import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const register = mutation({
  args: {
    momentId: v.id("moments"),
    action: v.string(), // "accept" | "edit" | "discard"
    editedFields: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Record feedback entry
    const id = await ctx.db.insert("feedback", {
      momentId: args.momentId,
      action: args.action,
      editedFields: args.editedFields,
      createdAt: Date.now(),
    });

    // Update moment status
    const status =
      args.action === "accept"
        ? "approved"
        : args.action === "edit"
        ? "edited"
        : "discarded";

    await ctx.db.patch(args.momentId, { status });

    return { success: true, feedbackId: id };
  },
});
