#!/usr/bin/env node
import {
  readStdin,
  normalizeCodexEvent,
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
        payload = { user_input: rawInput.trim() };
      }
    } else if (process.argv.length > 2) {
      payload = { user_input: process.argv.slice(2).join(" ") };
    }

    const config = loadConfig();
    const installationId = config.installationId;
    const endpoint = config.endpointUrl;

    if (!config.enabled) {
      return;
    }

    const event = normalizeCodexEvent(payload, installationId);
    if (!event) {
      return;
    }

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
