import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateToken(): string {
  const rand = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
  return `bs_tok_${rand}`;
}

export const getUserInstallationToken = mutation({
  args: {},
  handler: async (ctx) => {
    let userId = "demo-user";
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity?.subject) {
        userId = identity.subject;
      }
    } catch {
      // Gracefully handle auth error
    }

    try {
      const existing = await ctx.db
        .query("installations")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("enabled"), true))
        .first();

      if (existing) {
        return {
          token: existing.tokenHash,
          installationId: existing.tokenHash,
          deviceName: existing.deviceName || "Primary Device",
          source: existing.source,
          lastSeenAt: existing.lastSeenAt,
        };
      }
    } catch {
      // Index fallback
    }

    const token = generateToken();
    try {
      await ctx.db.insert("installations", {
        userId,
        tokenHash: token,
        source: "claude-code",
        deviceName: "Primary Workstation",
        lastSeenAt: Date.now(),
        enabled: true,
      });
    } catch {}

    return {
      token,
      installationId: token,
      deviceName: "Primary Workstation",
      source: "claude-code",
      lastSeenAt: Date.now(),
    };
  },
});

export const linkDevice = mutation({
  args: {
    token: v.string(),
    deviceName: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId: string | undefined;
    try {
      const identity = await ctx.auth.getUserIdentity();
      userId = identity?.subject;
    } catch {}

    const existing = await ctx.db
      .query("installations")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.token))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: userId || existing.userId,
        deviceName: args.deviceName || existing.deviceName || "CLI Device",
        source: args.source || existing.source || "claude-code",
        lastSeenAt: Date.now(),
        enabled: true,
      });

      return {
        success: true,
        token: existing.tokenHash,
        deviceName: args.deviceName || existing.deviceName,
        userId: userId || existing.userId,
      };
    }

    await ctx.db.insert("installations", {
      userId: userId || undefined,
      tokenHash: args.token,
      source: args.source || "claude-code",
      deviceName: args.deviceName || "CLI Device",
      lastSeenAt: Date.now(),
      enabled: true,
    });

    return {
      success: true,
      token: args.token,
      deviceName: args.deviceName || "CLI Device",
      userId,
    };
  },
});

export const listUserDevices = query({
  args: {},
  handler: async (ctx) => {
    let userId = "demo-user";
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity?.subject) {
        userId = identity.subject;
      }
    } catch {
      // Graceful fallback on auth issues
    }

    try {
      const devices = await ctx.db
        .query("installations")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      if (devices && devices.length > 0) {
        return devices.map((d) => ({
          _id: d._id,
          token: d.tokenHash,
          deviceName: d.deviceName || "Estación de Trabajo",
          source: d.source,
          lastSeenAt: d.lastSeenAt,
          enabled: d.enabled,
          isOnline: Date.now() - d.lastSeenAt < 1000 * 60 * 10,
        }));
      }
    } catch {}

    // Fallback: list all enabled installations if demo user
    try {
      const all = await ctx.db
        .query("installations")
        .filter((q) => q.eq(q.field("enabled"), true))
        .take(10);

      return all.map((d) => ({
        _id: d._id,
        token: d.tokenHash,
        deviceName: d.deviceName || "Estación de Trabajo",
        source: d.source,
        lastSeenAt: d.lastSeenAt,
        enabled: d.enabled,
        isOnline: Date.now() - d.lastSeenAt < 1000 * 60 * 10,
      }));
    } catch {
      return [];
    }
  },
});

export const verifyToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const inst = await ctx.db
      .query("installations")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.token))
      .first();

    if (!inst || !inst.enabled) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: inst.userId,
      deviceName: inst.deviceName,
      source: inst.source,
      lastSeenAt: inst.lastSeenAt,
    };
  },
});
