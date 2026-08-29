import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEvent,
  normalizeClaudeEvent,
  normalizeCodexEvent,
  normalizeAntigravityEvent,
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

  it("normalizes Antigravity hook / harness step data into SessionEvents", () => {
    const rawAgyPrompt = {
      type: "USER_INPUT",
      content: "Corrige el problema de fuga de memoria en el stream de audio",
      conversation_id: "agy-conv-777",
    };

    const promptEvt = normalizeAntigravityEvent(rawAgyPrompt, "inst-agy");
    expect(promptEvt?.type).toBe("user_prompt");
    expect(promptEvt?.source).toBe("antigravity");
    expect(promptEvt?.sessionId).toBe("agy-conv-777");
    expect(promptEvt?.payload.prompt).toBe("Corrige el problema de fuga de memoria en el stream de audio");

    const rawAgyToolCall = {
      type: "PLANNER_RESPONSE",
      conversation_id: "agy-conv-777",
      status: "DONE",
      tool_calls: [
        {
          name: "replace_file_content",
          args: {
            TargetFile: "C:/PROYECTOS/repo/src/stream.ts",
            TargetContent: "buffer.dispose = false;",
            ReplacementContent: "buffer.dispose = true;",
          },
        },
      ],
    };

    const toolEvt = normalizeAntigravityEvent(rawAgyToolCall, "inst-agy");
    expect(toolEvt?.type).toBe("file_changed");
    expect(toolEvt?.source).toBe("antigravity");
    expect(toolEvt?.payload.tool).toBe("replace_file_content");
    expect(toolEvt?.payload.codeBefore).toBe("buffer.dispose = false;");
    expect(toolEvt?.payload.codeAfter).toBe("buffer.dispose = true;");
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
      endpointUrl: "https://events.smithery.ai/ingest",
      installationId: "i1",
      sessionId: "s1",
      source: "claude-code",
      events: [event],
    });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("manages local configuration and links account token", async () => {
    const { loadConfig, saveConfig, linkAccountToken } = await import("../src/index");
    
    const initial = loadConfig();
    expect(initial.installationId).toBeDefined();
    expect(initial.endpointUrl).toBeDefined();

    const saved = saveConfig({
      installationId: "bs_tok_test_12345",
      deviceName: "MacBook Pro M3",
    });
    expect(saved.installationId).toBe("bs_tok_test_12345");
    expect(saved.deviceName).toBe("MacBook Pro M3");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    const linkRes = await linkAccountToken({
      token: "bs_tok_verified_999",
      deviceName: "Linux Workstation",
    });

    expect(linkRes.success).toBe(true);
    expect(linkRes.installationId).toBe("bs_tok_verified_999");
  });

  it("returns null for empty inputs to prevent noise and empty sessions", () => {
    expect(normalizeClaudeEvent({}, "inst-1")).toBeNull();
    expect(normalizeClaudeEvent(null as any, "inst-1")).toBeNull();
    expect(normalizeCodexEvent({}, "inst-1")).toBeNull();
  });

  it("manages and groups active session ID for the same workspace", async () => {
    const { getActiveSessionId } = await import("../src/index");
    const id1 = getActiveSessionId("C:/projects/test-repo");
    const id2 = getActiveSessionId("C:/projects/test-repo");
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^sess_\d+_[a-z0-9]+$/);
  });
});
