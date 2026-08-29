#!/usr/bin/env node
import { readStdin, normalizeCodexEvent, EventQueue, sendEventBatch } from "@hackathon-craft-station/collector";

async function main() {
  try {
    const rawInput = await readStdin(150);
    let payload = {};

    if (rawInput && rawInput.trim()) {
      try {
        payload = JSON.parse(rawInput);
      } catch {
        payload = { user_input: rawInput.trim() };
      }
    } else if (process.argv.length > 2) {
      payload = { user_input: process.argv.slice(2).join(" ") };
    }

    const installationId = process.env.BUILDSIGNAL_INSTALLATION_ID || "inst_codex_local";
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "https://clever-labrador-928.convex.site";
    const endpoint = `${convexUrl.replace(/\.cloud$/, ".site")}/api/events/ingest`;

    const event = normalizeCodexEvent(payload, installationId);

    const queue = new EventQueue();
    await queue.enqueue(event);

    sendEventBatch({
      endpointUrl: endpoint,
      installationId,
      sessionId: event.sessionId,
      source: "codex",
      events: [event],
    }).catch(() => {});

  } catch {
    // Fail silently in parent process
  }
}

main();
