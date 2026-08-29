#!/usr/bin/env node
import {
  readStdin,
  normalizeClaudeEvent,
  EventQueue,
  sendEventBatch,
  loadConfig,
} from "@hackathon-craft-station/collector";

async function main() {
  try {
    const rawInput = await readStdin(150);
    let payload = {};

    if (rawInput && rawInput.trim()) {
      try {
        payload = JSON.parse(rawInput);
      } catch {
        payload = { message: rawInput.trim() };
      }
    } else if (process.argv.length > 2) {
      payload = { message: process.argv.slice(2).join(" ") };
    }

    const config = loadConfig();
    const installationId = config.installationId;
    const endpoint = config.endpointUrl;

    if (!config.enabled) {
      return;
    }

    const event = normalizeClaudeEvent(payload, installationId);

    // 1. Local resilient queue
    const queue = new EventQueue();
    await queue.enqueue(event);

    // 2. Best-effort dispatch to Convex
    sendEventBatch({
      endpointUrl: endpoint,
      installationId,
      sessionId: event.sessionId,
      source: "claude-code",
      events: [event],
    }).catch(() => {});

  } catch {
    // Hooks must never crash the parent AI agent process
  }
}

main();
