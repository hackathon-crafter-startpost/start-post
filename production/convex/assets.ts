import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const saveAsset = mutation({
  args: {
    postDraftId: v.id("postDrafts"),
    storageId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    format: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assets", {
      postDraftId: args.postDraftId,
      storageId: args.storageId,
      width: args.width,
      height: args.height,
      format: args.format,
      createdAt: Date.now(),
    });
  },
});

export const getAssetUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
