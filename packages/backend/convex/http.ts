import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/api/events/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { installationId, sessionId, source, events } = body;

      if (!installationId || !sessionId || !events || !Array.isArray(events)) {
        return new Response(
          JSON.stringify({ error: "Invalid payload format" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 1. Ingest event batch
      const ingestResult = await ctx.runMutation(api.events.ingestBatch, {
        installationId,
        sessionId,
        source: source || "claude-code",
        events,
      });

      // 2. Automatically trigger value analysis if session has events
      if (events.length > 0) {
        await ctx.runMutation(api.generation.analyzeSession, {
          sessionId,
        });
      }

      return new Response(
        JSON.stringify({ success: true, ingested: ingestResult.ingested }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err?.message || "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// Preflight CORS handler
http.route({
  path: "/api/events/ingest",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-buildsignal-installation",
      },
    });
  }),
});

export default http;
