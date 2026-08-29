import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEvent,
  normalizeClaudeEvent,
  normalizeCodexEvent,
  EventQueue,
  sendEventBatch,
} from "../src/index";

describe("Collector Engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a standardized and sanitized SessionEvent with idempotent ID", () => {
    const event = createEvent({
      sessionId: "session-1",
      installationId: "install-1",
      source: "claude-code",
      type: "user_prompt",
      payload: {
        prompt: "Fix smoothingTimeConstant bug in audio detector",
      },
    });

    expect(event.eventId).toMatch(/^evt_\d+_[a-z0-9]+$/);
    expect(event.sessionId).toBe("session-1");
    expect(event.sanitized).toBe(true);
    expect(event.type).toBe("user_prompt");
    expect(event.payload.prompt).toBe("Fix smoothingTimeConstant bug in audio detector");
  });

  it("normalizes Claude Code hook stdin data into SessionEvents", () => {
    const rawClaudePrompt = {
      type: "user_message",
      message: "Why is the vocal detector throwing false positives with sk-123456789012345678901234?",
      session_id: "claude-sess-99",
    };

    const event = normalizeClaudeEvent(rawClaudePrompt, "inst-abc");
    expect(event.type).toBe("user_prompt");
    expect(event.source).toBe("claude-code");
    expect(event.payload.prompt).not.toContain("sk-123456789012345678901234");
    expect(event.sanitized).toBe(true);

    const rawClaudeTool = {
      type: "tool_use",
      tool: "Bash",
      input: { command: "pnpm test" },
      output: "Tests failed: expected 0 false positives but got 4",
      exit_code: 1,
      session_id: "claude-sess-99",
    };

    const toolEvent = normalizeClaudeEvent(rawClaudeTool, "inst-abc");
    expect(toolEvent.type).toBe("test_failed");
    expect(toolEvent.payload.command).toBe("pnpm test");
  });

  it("normalizes Codex hook stdin data into SessionEvents", () => {
    const rawCodexEvent = {
      event_type: "prompt",
      user_input: "Optimize FFT buffer size",
      conversation_id: "codex-conv-1",
    };

    const event = normalizeCodexEvent(rawCodexEvent, "inst-xyz");
    expect(event.type).toBe("user_prompt");
    expect(event.source).toBe("codex");
    expect(event.sessionId).toBe("codex-conv-1");
  });

  it("queues and retrieves events in memory/disk queue", async () => {
    const queue = new EventQueue(":memory:");
    const evt1 = createEvent({
      sessionId: "s1",
      installationId: "i1",
      source: "claude-code",
      type: "user_prompt",
      payload: { text: "hello" },
    });
    const evt2 = createEvent({
      sessionId: "s1",
      installationId: "i1",
      source: "claude-code",
      type: "turn_stopped",
      payload: { text: "done" },
    });

    await queue.enqueue(evt1);
    await queue.enqueue(evt2);

    const pending = await queue.peekBatch(10);
    expect(pending.length).toBe(2);

    await queue.acknowledge([evt1.eventId]);
    const remaining = await queue.peekBatch(10);
    expect(remaining.length).toBe(1);
    expect(remaining[0].eventId).toBe(evt2.eventId);
  });

  it("sends batch of events to Convex endpoint and handles response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, ingested: 1 }),
    });
    global.fetch = mockFetch;

    const event = createEvent({
      sessionId: "s1",
      installationId: "i1",
      source: "claude-code",
      type: "user_prompt",
      payload: { text: "test" },
    });

    const result = await sendEventBatch({
      endpointUrl: "https://clever-labrador-928.convex.site/api/events/ingest",
      installationId: "i1",
      sessionId: "s1",
      source: "claude-code",
      events: [event],
    });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
