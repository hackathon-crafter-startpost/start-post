import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import {
  fetchBufferAccountAndOrgs,
  fetchBufferChannels,
  createBufferPost,
  createBufferIdea,
  type BufferChannelData,
} from "./lib/bufferClient";



export const getSettings = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let effectiveUserId = args.userId;
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity?.subject) effectiveUserId = identity.subject;
    } catch {}

    let settings = null;
    if (effectiveUserId) {
      settings = await ctx.db
        .query("bufferSettings")
        .withIndex("by_user", (q) => q.eq("userId", effectiveUserId))
        .first();
    }

    if (!settings) {
      settings = await ctx.db.query("bufferSettings").first();
    }

    const envApiKey = process.env.BUFFER_API_KEY;
    const effectiveApiKey = settings?.apiKey || envApiKey;

    if (!effectiveApiKey) return null;

    // Mask API key for client display
    return {
      _id: settings?._id,
      apiKey: effectiveApiKey,
      maskedApiKey:
        effectiveApiKey.length > 8
          ? `${effectiveApiKey.slice(0, 4)}...${effectiveApiKey.slice(-4)}`
          : "••••••••",
      organizationId: settings?.organizationId,
      organizationName: settings?.organizationName,
      channelId: settings?.channelId,
      channelName: settings?.channelName,
      channelService: settings?.channelService,
      channelAvatar: settings?.channelAvatar,
      autoPublish: settings?.autoPublish ?? false,
      publishMode: settings?.publishMode || "addToQueue",
      isFromEnv: !settings?.apiKey && Boolean(envApiKey),
    };
  },
});


export const saveSettings = mutation({
  args: {
    apiKey: v.string(),
    organizationId: v.optional(v.string()),
    organizationName: v.optional(v.string()),
    channelId: v.optional(v.string()),
    channelName: v.optional(v.string()),
    channelService: v.optional(v.string()),
    channelAvatar: v.optional(v.string()),
    autoPublish: v.boolean(),
    publishMode: v.string(), // "addToQueue" | "now" | "next" | "customScheduled"
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let effectiveUserId = args.userId;
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity?.subject) effectiveUserId = identity.subject;
    } catch {}

    const existing = effectiveUserId
      ? await ctx.db
          .query("bufferSettings")
          .withIndex("by_user", (q) => q.eq("userId", effectiveUserId))
          .first()
      : await ctx.db.query("bufferSettings").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        apiKey: args.apiKey,
        organizationId: args.organizationId,
        organizationName: args.organizationName,
        channelId: args.channelId,
        channelName: args.channelName,
        channelService: args.channelService,
        channelAvatar: args.channelAvatar,
        autoPublish: args.autoPublish,
        publishMode: args.publishMode,
        updatedAt: Date.now(),
      });
      return { success: true, settingsId: existing._id };
    } else {
      const id = await ctx.db.insert("bufferSettings", {
        userId: effectiveUserId,
        apiKey: args.apiKey,
        organizationId: args.organizationId,
        organizationName: args.organizationName,
        channelId: args.channelId,
        channelName: args.channelName,
        channelService: args.channelService,
        channelAvatar: args.channelAvatar,
        autoPublish: args.autoPublish,
        publishMode: args.publishMode,
        updatedAt: Date.now(),
      });
      return { success: true, settingsId: id };
    }
  },
});

export const disconnect = mutation({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let effectiveUserId = args.userId;
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity?.subject) effectiveUserId = identity.subject;
    } catch {}

    const existing = effectiveUserId
      ? await ctx.db
          .query("bufferSettings")
          .withIndex("by_user", (q) => q.eq("userId", effectiveUserId))
          .first()
      : await ctx.db.query("bufferSettings").first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});

export const testConnection = action({
  args: {
    apiKeyOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rawSettings: any = await ctx.runQuery(api.buffer.getSettings, {});
    const apiKey =
      args.apiKeyOverride ||
      rawSettings?.apiKey ||
      process.env.BUFFER_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "No se proporcionó API Key de Buffer",
      };
    }

    try {
      const { accountId, email, organizations } =
        await fetchBufferAccountAndOrgs(apiKey);

      let channels: BufferChannelData[] = [];
      if (organizations.length > 0) {
        try {
          channels = await fetchBufferChannels(apiKey, organizations[0].id);
        } catch {
          // Channels fetch is optional in initial test
        }
      }

      return {
        success: true,
        accountId,
        email,
        organizations,
        channels,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Error al conectar con Buffer GraphQL API",
      };
    }
  },
});

export const fetchOrganizations = action({
  args: {
    apiKeyOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rawSettings: any = await ctx.runQuery(api.buffer.getSettings, {});
    const apiKey =
      args.apiKeyOverride ||
      rawSettings?.apiKey ||
      process.env.BUFFER_API_KEY;

    if (!apiKey) {
      throw new Error("No hay API Key de Buffer configurada");
    }

    const { organizations } = await fetchBufferAccountAndOrgs(apiKey);
    return organizations;
  },
});

export const fetchChannels = action({
  args: {
    organizationId: v.string(),
    apiKeyOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rawSettings: any = await ctx.runQuery(api.buffer.getSettings, {});
    const apiKey =
      args.apiKeyOverride ||
      rawSettings?.apiKey ||
      process.env.BUFFER_API_KEY;

    if (!apiKey) {
      throw new Error("No hay API Key de Buffer configurada");
    }

    const channels = await fetchBufferChannels(apiKey, args.organizationId);
    return channels;
  },
});

export const recordPublication = mutation({
  args: {
    momentId: v.id("moments"),
    postDraftId: v.optional(v.id("postDrafts")),
    bufferPostId: v.optional(v.string()),
    bufferIdeaId: v.optional(v.string()),
    channelId: v.optional(v.string()),
    channelName: v.optional(v.string()),
    channelService: v.optional(v.string()),
    status: v.string(), // "scheduled" | "published" | "idea_created" | "failed"
    mode: v.string(),
    text: v.string(),
    imageUrl: v.optional(v.string()),
    dueAt: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pubId = await ctx.db.insert("bufferPublications", {
      momentId: args.momentId,
      postDraftId: args.postDraftId,
      bufferPostId: args.bufferPostId,
      bufferIdeaId: args.bufferIdeaId,
      channelId: args.channelId,
      channelName: args.channelName,
      channelService: args.channelService,
      status: args.status,
      mode: args.mode,
      text: args.text,
      imageUrl: args.imageUrl,
      dueAt: args.dueAt,
      errorMessage: args.errorMessage,
      createdAt: Date.now(),
    });

    if (args.postDraftId) {
      await ctx.db.patch(args.postDraftId, {
        bufferStatus: args.status === "failed" ? "failed" : "queued",
        bufferPostId: args.bufferPostId,
        bufferPublishedAt: Date.now(),
        status: args.status === "failed" ? "ready" : "published",
      });
    }

    return pubId;
  },
});

export const publishPost = action({
  args: {
    momentId: v.id("moments"),
    postDraftId: v.optional(v.id("postDrafts")),
    channelIdOverride: v.optional(v.string()),
    modeOverride: v.optional(v.string()), // "addToQueue" | "now" | "next" | "customScheduled"
    dueAtOverride: v.optional(v.string()),
    apiKeyOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch Buffer settings
    const settings: any = await ctx.runQuery(api.buffer.getSettings, {});
    const apiKey =
      args.apiKeyOverride ||
      settings?.apiKey ||
      process.env.BUFFER_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "Buffer no está configurado. Añade tu API Key en la configuración de Buffer.",
      };
    }

    let channelId = args.channelIdOverride || settings?.channelId;
    let channelName = settings?.channelName;
    let channelService = settings?.channelService;

    if (!channelId) {
      // Auto-discover the first channel connected to the Buffer account
      try {
        const { organizations } = await fetchBufferAccountAndOrgs(apiKey);
        if (organizations.length > 0) {
          const channels = await fetchBufferChannels(apiKey, organizations[0].id);
          if (channels.length > 0) {
            channelId = channels[0].id;
            channelName = channels[0].name;
            channelService = channels[0].service;
          }
        }
      } catch (err: any) {
        return {
          success: false,
          error: `No se pudo encontrar canales en Buffer: ${err.message}`,
        };
      }
    }

    if (!channelId) {
      return {
        success: false,
        error: "No se encontró ningún canal conectado en tu cuenta de Buffer. Conecta un canal (LinkedIn, Twitter, etc.) en Buffer.",
      };
    }


    // 2. Fetch Moment and PostDraft
    const moment: any = await ctx.runQuery(api.moments.get, {
      momentId: args.momentId,
    });

    if (!moment) {
      return { success: false, error: "Momento no encontrado" };
    }

    const draft = moment.postDraft;
    const hook = draft?.hook || "¿Te ha pasado esto al programar? 👇";
    const body = draft?.body || moment.problem;
    const hashtags = draft?.hashtags || [];
    const fullText = `${hook}\n\n${body}${
      hashtags.length > 0 ? `\n\n${hashtags.join(" ")}` : ""
    }`;

    // 3. Check for rendered asset image
    let imageUrl: string | undefined = undefined;
    if (draft?._id) {
      const asset: any = await ctx.runQuery(api.buffer.getLatestAssetForDraft, {
        postDraftId: draft._id,
      });
      if (asset?.storageId) {
        const url = await ctx.runQuery(api.assets.getAssetUrl, {
          storageId: asset.storageId,
        });
        imageUrl = url || undefined;
      }
    }


    const mode = (args.modeOverride || settings?.publishMode || "addToQueue") as
      | "addToQueue"
      | "now"
      | "next"
      | "customScheduled";

    // 4. Send GraphQL mutation to Buffer
    const result = await createBufferPost(apiKey, {
      channelId,
      text: fullText,
      mode,
      schedulingType: "automatic",
      dueAt: args.dueAtOverride,
      imageUrl: imageUrl || undefined,
    });

    // 5. Record result
    if (result.success && result.post) {
      await ctx.runMutation(api.buffer.recordPublication, {
        momentId: args.momentId,
        postDraftId: draft?._id,
        bufferPostId: result.post.id,
        channelId,
        channelName: channelName || settings?.channelName,
        channelService: channelService || settings?.channelService,
        status: mode === "now" ? "published" : "scheduled",
        mode,
        text: fullText,
        imageUrl,
        dueAt: result.post.dueAt,
      });

      return {
        success: true,
        postId: result.post.id,
        status: result.post.status || mode,
        channelName: channelName || settings?.channelName,
      };
    } else {
      await ctx.runMutation(api.buffer.recordPublication, {
        momentId: args.momentId,
        postDraftId: draft?._id,
        channelId,
        channelName: channelName || settings?.channelName,
        channelService: channelService || settings?.channelService,
        status: "failed",
        mode,
        text: fullText,
        imageUrl,
        errorMessage: result.error,
      });


      return {
        success: false,
        error: result.error || "Error al crear la publicación en Buffer",
      };
    }
  },
});

export const createIdea = action({
  args: {
    momentId: v.id("moments"),
    organizationIdOverride: v.optional(v.string()),
    apiKeyOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const settings: any = await ctx.runQuery(api.buffer.getSettings, {});
    const apiKey =
      args.apiKeyOverride ||
      settings?.apiKey ||
      process.env.BUFFER_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "Buffer no está configurado. Añade tu API Key de Buffer.",
      };
    }

    const organizationId =
      args.organizationIdOverride || settings?.organizationId;
    if (!organizationId) {
      return {
        success: false,
        error: "No se ha seleccionado ninguna Organización de Buffer.",
      };
    }

    const moment: any = await ctx.runQuery(api.moments.get, {
      momentId: args.momentId,
    });

    if (!moment) {
      return { success: false, error: "Momento no encontrado" };
    }

    const title = moment.title || "Momento de Código";
    const text = `🔴 Problema:\n${moment.problem}\n\n🟢 Solución:\n${moment.solution}\n\n💡 Aprendizaje:\n${moment.lesson}`;

    const result = await createBufferIdea(apiKey, {
      organizationId,
      title,
      text,
    });

    if (result.success && result.idea) {
      await ctx.runMutation(api.buffer.recordPublication, {
        momentId: args.momentId,
        postDraftId: moment.postDraft?._id,
        bufferIdeaId: result.idea.id,
        status: "idea_created",
        mode: "idea",
        text,
      });

      return {
        success: true,
        ideaId: result.idea.id,
      };
    } else {
      return {
        success: false,
        error: result.error || "Error al crear la idea en Buffer",
      };
    }
  },
});

export const listPublications = query({
  args: {
    momentId: v.optional(v.id("moments")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    if (args.momentId) {
      return await ctx.db
        .query("bufferPublications")
        .withIndex("by_moment", (q) => q.eq("momentId", args.momentId!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db.query("bufferPublications").order("desc").take(limit);
  },
});

export const getLatestAssetForDraft = query({
  args: {
    postDraftId: v.id("postDrafts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assets")
      .withIndex("by_post_draft", (q) => q.eq("postDraftId", args.postDraftId))
      .order("desc")
      .first();
  },
});

export const autoPublishIfEnabled = action({
  args: {
    momentId: v.id("moments"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    skipped?: boolean;
    reason?: string;
    success?: boolean;
    postId?: string;
    status?: string;
    channelName?: string;
    error?: string;
  }> => {
    const settings: any = await ctx.runQuery(api.buffer.getSettings, {});
    if (!settings || !settings.autoPublish || !settings.channelId || !settings.apiKey) {
      return { skipped: true, reason: "Auto-publish not configured or disabled" };
    }

    const moment: any = await ctx.runQuery(api.moments.get, { momentId: args.momentId });
    if (!moment || moment.score < 70) {
      return { skipped: true, reason: "Moment score below auto-publish threshold" };
    }

    return (await ctx.runAction(api.buffer.publishPost, {
      momentId: args.momentId,
    })) as any;
  },
});

