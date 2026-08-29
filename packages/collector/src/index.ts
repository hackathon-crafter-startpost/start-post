import fs from "fs";
import path from "path";
import os from "os";
import type {
  SessionEvent,
  EventSource,
  EventType,
  EventBatch,
} from "@hackathon-craft-station/shared-types";
import { sanitizeEvent } from "@hackathon-craft-station/sanitizer";

/**
 * Generates an idempotent, timestamped event ID.
 */
export function generateEventId(): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `evt_${Date.now()}_${rand}`;
}

/**
 * Safely reads JSON or string data from stdin with a timeout to avoid blocking parent agents.
 */
export async function readStdin(timeoutMs = 150): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => resolve(data), timeoutMs);

    if (process.stdin.isTTY) {
      clearTimeout(timer);
      return resolve("");
    }

    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

export interface CreateEventOptions {
  sessionId: string;
  installationId: string;
  source: EventSource;
  type: EventType;
  payload: Record<string, unknown>;
  summary?: string;
}

/**
 * Creates and automatically sanitizes a SessionEvent.
 */
export function createEvent(options: CreateEventOptions): SessionEvent {
  const rawEvent: SessionEvent = {
    eventId: generateEventId(),
    sessionId: options.sessionId,
    installationId: options.installationId,
    source: options.source,
    type: options.type,
    timestamp: Date.now(),
    payload: options.payload,
    summary: options.summary,
    sanitized: false,
  };

  return sanitizeEvent(rawEvent);
}

/**
 * Manages active session IDs mapped by workspace directory with a 30-minute sliding window.
 */
export function getActiveSessionId(cwd: string = process.cwd()): string {
  try {
    const dir = path.join(os.homedir(), ".buildsignal");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const sessionFile = path.join(dir, "active_sessions.json");
    let state: Record<string, { sessionId: string; lastSeenAt: number }> = {};
    if (fs.existsSync(sessionFile)) {
      try {
        state = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
      } catch {}
    }

    const key = Buffer.from(cwd.toLowerCase().replace(/\\/g, "/")).toString("base64").substring(0, 16);
    const now = Date.now();
    const existing = state[key];

    // Session window: 30 minutes of inactivity
    if (existing && existing.sessionId && now - existing.lastSeenAt < 30 * 60 * 1000) {
      state[key] = { sessionId: existing.sessionId, lastSeenAt: now };
      try {
        fs.writeFileSync(sessionFile, JSON.stringify(state, null, 2), "utf8");
      } catch {}
      return existing.sessionId;
    }

    const rand = Math.random().toString(36).substring(2, 8);
    const newSessionId = `sess_${now}_${rand}`;
    state[key] = { sessionId: newSessionId, lastSeenAt: now };
    try {
      fs.writeFileSync(sessionFile, JSON.stringify(state, null, 2), "utf8");
    } catch {}
    return newSessionId;
  } catch {
    return `sess_${Date.now()}_default`;
  }
}

/**
 * Normalizes Claude Code CLI hook messages into standard SessionEvents.
 */
export function normalizeClaudeEvent(
  raw: Record<string, any>,
  installationId: string
): SessionEvent | null {
  if (!raw || typeof raw !== "object") return null;

  const hasPrompt = !!(raw.prompt || raw.message || raw.user_prompt || raw.input?.prompt || raw.text);
  const hasTool = !!(raw.tool || raw.name || raw.tool_name || raw.toolName || raw.command || raw.input?.command);
  const hasFile = !!(raw.file_path || raw.filePath || raw.diff || raw.input?.file_path || raw.input?.filePath);
  const hasOutput = !!(raw.output || raw.result || raw.tool_result);
  const isLifecycle = raw.type === "session_started" || raw.type === "session_ended";

  if (!hasPrompt && !hasTool && !hasFile && !hasOutput && !isLifecycle && !raw.type && !raw.summary) {
    return null;
  }

  const explicitSessionId =
    raw.session_id ||
    raw.conversation_id ||
    raw.sessionId ||
    process.env.CLAUDE_SESSION_ID ||
    process.env.SESSION_ID ||
    process.env.CONVERSATION_ID;

  const sessionId = explicitSessionId || getActiveSessionId(process.cwd());
  let eventType: EventType = "tool_result";
  let payload: Record<string, unknown> = {};

  if (raw.type === "user_message" || raw.type === "prompt" || (hasPrompt && !hasTool && !hasFile)) {
    eventType = "user_prompt";
    payload = {
      prompt: raw.prompt || raw.message || raw.user_prompt || raw.input?.prompt || raw.text || "",
    };
  } else if (raw.type === "tool_use" || raw.type === "tool_result" || hasTool || hasFile) {
    const tool = raw.tool || raw.name || raw.tool_name || raw.toolName || "";
    const command = raw.command || raw.cmd || raw.input?.command || raw.tool_input?.command || "";
    const output = raw.output || raw.result || raw.tool_result || raw.stdout || raw.stderr || "";
    const exitCode = raw.exit_code ?? raw.exitCode ?? (raw.error ? 1 : 0);
    const filePath = raw.file_path || raw.filePath || raw.path || raw.input?.file_path || raw.input?.path || "";

    if (
      command &&
      (command.includes("test") ||
        command.includes("vitest") ||
        command.includes("jest") ||
        command.includes("pytest") ||
        command.includes("cargo test") ||
        command.includes("go test"))
    ) {
      eventType = exitCode === 0 ? "test_passed" : "test_failed";
    } else if (
      tool === "Edit" ||
      tool === "Write" ||
      tool === "replace_file_content" ||
      tool === "write_to_file" ||
      hasFile
    ) {
      eventType = "file_changed";
    } else {
      eventType = "tool_result";
    }

    payload = {
      tool,
      command,
      output,
      exitCode,
      filePath,
      diff: raw.diff || raw.changes || raw.input?.diff,
      codeBefore: raw.codeBefore || raw.code_before,
      codeAfter: raw.codeAfter || raw.code_after,
    };
  } else if (raw.type === "session_started") {
    eventType = "session_started";
    payload = { ...raw };
  } else if (raw.type === "session_ended") {
    eventType = "session_ended";
    payload = { ...raw };
  } else if (raw.type === "turn_stopped" || raw.type === "stop") {
    eventType = "turn_stopped";
    payload = { ...raw };
  } else {
    payload = { ...raw };
  }

  return createEvent({
    sessionId,
    installationId,
    source: "claude-code",
    type: eventType,
    payload,
    summary: raw.summary,
  });
}

/**
 * Normalizes Codex CLI hook messages into standard SessionEvents.
 */
export function normalizeCodexEvent(
  raw: Record<string, any>,
  installationId: string
): SessionEvent | null {
  if (!raw || typeof raw !== "object") return null;

  const hasPrompt = !!(raw.user_input || raw.prompt || raw.message);
  const hasCommand = !!(raw.command || raw.cmd);
  const hasFile = !!(raw.file_path || raw.filePath || raw.diff);
  const hasEvent = !!raw.event_type || !!raw.type;

  if (!hasPrompt && !hasCommand && !hasFile && !hasEvent && !raw.summary) {
    return null;
  }

  const explicitSessionId =
    raw.conversation_id ||
    raw.session_id ||
    raw.sessionId ||
    process.env.CODEX_SESSION_ID ||
    process.env.SESSION_ID;

  const sessionId = explicitSessionId || getActiveSessionId(process.cwd());
  let eventType: EventType = "tool_result";
  let payload: Record<string, unknown> = {};

  if (raw.event_type === "prompt" || raw.type === "prompt" || (hasPrompt && !hasCommand && !hasFile)) {
    eventType = "user_prompt";
    payload = {
      prompt: raw.user_input || raw.prompt || raw.message || "",
    };
  } else if (raw.event_type === "file_change" || hasFile) {
    eventType = "file_changed";
    payload = {
      filePath: raw.file_path || raw.filePath,
      diff: raw.diff,
      codeBefore: raw.codeBefore,
      codeAfter: raw.codeAfter,
    };
  } else if (raw.event_type === "command_result" || hasCommand) {
    const cmd = raw.command || raw.cmd || "";
    const exitCode = raw.exit_code ?? raw.exitCode ?? 0;
    if (
      cmd &&
      (cmd.includes("test") ||
        cmd.includes("vitest") ||
        cmd.includes("jest") ||
        cmd.includes("pytest") ||
        cmd.includes("cargo test") ||
        cmd.includes("go test"))
    ) {
      eventType = exitCode === 0 ? "test_passed" : "test_failed";
    } else {
      eventType = "tool_result";
    }
    payload = {
      command: cmd,
      exitCode,
      output: raw.output || raw.result || "",
      ...raw,
    };
  } else {
    payload = { ...raw };
  }

  return createEvent({
    sessionId,
    installationId,
    source: "codex",
    type: eventType,
    payload,
    summary: raw.summary,
  });
}

/**
 * Local resilient queue for storing events before sending to Convex.
 */
export class EventQueue {
  private memoryQueue: SessionEvent[] = [];
  private filePath?: string;

  constructor(storagePath?: string) {
    if (storagePath === ":memory:") {
      this.filePath = undefined;
    } else {
      const dir = storagePath || path.join(os.homedir(), ".buildsignal");
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch {
          // Fallback to memory if homedir not writable
        }
      }
      this.filePath = path.join(dir, "queue.jsonl");
    }
  }

  async enqueue(event: SessionEvent): Promise<void> {
    if (!this.filePath) {
      this.memoryQueue.push(event);
      return;
    }

    try {
      const line = JSON.stringify(event) + "\n";
      fs.appendFileSync(this.filePath, line, "utf8");
    } catch {
      this.memoryQueue.push(event);
    }
  }

  async peekBatch(limit: number = 20): Promise<SessionEvent[]> {
    if (!this.filePath) {
      return this.memoryQueue.slice(0, limit);
    }

    try {
      if (!fs.existsSync(this.filePath)) return [];
      const content = fs.readFileSync(this.filePath, "utf8");
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      const events: SessionEvent[] = [];
      for (let i = 0; i < Math.min(lines.length, limit); i++) {
        try {
          events.push(JSON.parse(lines[i]));
        } catch {
          // ignore corrupted line
        }
      }
      return events;
    } catch {
      return this.memoryQueue.slice(0, limit);
    }
  }

  async acknowledge(eventIds: string[]): Promise<void> {
    const idSet = new Set(eventIds);
    if (!this.filePath) {
      this.memoryQueue = this.memoryQueue.filter((e) => !idSet.has(e.eventId));
      return;
    }

    try {
      if (!fs.existsSync(this.filePath)) return;
      const content = fs.readFileSync(this.filePath, "utf8");
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      const remaining: string[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (!idSet.has(parsed.eventId)) {
            remaining.push(line);
          }
        } catch {
          // ignore corrupted line
        }
      }

      fs.writeFileSync(
        this.filePath,
        remaining.length > 0 ? remaining.join("\n") + "\n" : "",
        "utf8"
      );
    } catch {
      this.memoryQueue = this.memoryQueue.filter((e) => !idSet.has(e.eventId));
    }
  }
}

export interface SendEventBatchOptions {
  endpointUrl: string;
  installationId: string;
  sessionId: string;
  source: EventSource;
  events: SessionEvent[];
}

export interface SendEventBatchResult {
  success: boolean;
  ingestedCount: number;
  error?: string;
}

/**
 * Sends a batch of sanitized SessionEvents to the Convex HTTP Action ingest endpoint.
 */
export async function sendEventBatch(
  options: SendEventBatchOptions
): Promise<SendEventBatchResult> {
  const payload: EventBatch = {
    installationId: options.installationId,
    sessionId: options.sessionId,
    source: options.source,
    events: options.events,
  };

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const response = await fetch(options.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-buildsignal-installation": options.installationId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as { success?: boolean; ingested?: number };
      return {
        success: data.success ?? true,
        ingestedCount: data.ingested ?? options.events.length,
      };
    } catch (err: any) {
      if (attempts >= maxAttempts) {
        return {
          success: false,
          ingestedCount: 0,
          error: err?.message || "Failed to send batch",
        };
      }
      // Exponential backoff wait (50ms, 100ms...)
      await new Promise((r) => setTimeout(r, attempts * 50));
    }
  }

  return {
    success: false,
    ingestedCount: 0,
    error: "Max attempts exceeded",
  };
}

/**
 * Flushes all queued events from local storage to the Convex endpoint.
 */
export async function flushQueue(
  endpointUrl: string,
  installationId: string,
  source: EventSource = "claude-code"
): Promise<{ flushed: number; errors: number }> {
  const queue = new EventQueue();
  let totalFlushed = 0;
  let errorCount = 0;

  while (true) {
    const batch = await queue.peekBatch(20);
    if (batch.length === 0) break;

    const res = await sendEventBatch({
      endpointUrl,
      installationId,
      sessionId: batch[0].sessionId,
      source,
      events: batch,
    });

    if (res.success) {
      await queue.acknowledge(batch.map((e) => e.eventId));
      totalFlushed += batch.length;
    } else {
      errorCount++;
      break; // stop on failure to avoid looping
    }
  }

  return { flushed: totalFlushed, errors: errorCount };
}

/* =========================================================================
   CLI & Account Configuration Helpers
========================================================================= */

export interface BuildSignalConfig {
  installationId: string;
  endpointUrl: string;
  enabled: boolean;
  deviceName?: string;
  userId?: string;
  linkedAt?: string;
  createdAt: string;
}

export function getConfigDir(): string {
  return path.join(os.homedir(), ".buildsignal");
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

export function loadConfig(): BuildSignalConfig {
  const dir = getConfigDir();
  const file = getConfigPath();

  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }

  let config: BuildSignalConfig = {
    installationId: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    endpointUrl:
      process.env.BUILDSIGNAL_ENDPOINT ||
      process.env.CONVEX_SITE_URL ||
      (process.env.NEXT_PUBLIC_CONVEX_URL
        ? `${process.env.NEXT_PUBLIC_CONVEX_URL.replace(/\.cloud$/, ".site")}/api/events/ingest`
        : "https://opulent-caterpillar-373.convex.site/api/events/ingest"),
    enabled: true,
    deviceName: `${os.hostname()} (${os.platform()})`,
    createdAt: new Date().toISOString(),
  };

  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      config = { ...config, ...parsed };
    } catch {
      // keep fallback
    }
  } else {
    try {
      fs.writeFileSync(file, JSON.stringify(config, null, 2), "utf8");
    } catch {
      // ignore
    }
  }

  if (process.env.BUILDSIGNAL_TOKEN) {
    config.installationId = process.env.BUILDSIGNAL_TOKEN;
  }
  if (process.env.BUILDSIGNAL_ENDPOINT) {
    config.endpointUrl = process.env.BUILDSIGNAL_ENDPOINT;
  }

  return config;
}

export function saveConfig(updates: Partial<BuildSignalConfig>): BuildSignalConfig {
  const current = loadConfig();
  const updated: BuildSignalConfig = {
    ...current,
    ...updates,
  };

  const dir = getConfigDir();
  const file = getConfigPath();

  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }

  try {
    fs.writeFileSync(file, JSON.stringify(updated, null, 2), "utf8");
  } catch {
    // ignore
  }

  return updated;
}

export async function linkAccountToken(options: {
  token: string;
  endpointUrl?: string;
  deviceName?: string;
}): Promise<{ success: boolean; installationId: string; error?: string }> {
  const config = loadConfig();
  const endpoint = options.endpointUrl || config.endpointUrl;
  const deviceName = options.deviceName || config.deviceName || `${os.hostname()} (${os.platform()})`;

  try {
    const pingBatch: EventBatch = {
      installationId: options.token,
      sessionId: `ping_${Date.now()}`,
      source: "claude-code",
      events: [],
    };

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-buildsignal-installation": options.token,
      },
      body: JSON.stringify(pingBatch),
    });

    saveConfig({
      installationId: options.token,
      endpointUrl: endpoint,
      deviceName,
      linkedAt: new Date().toISOString(),
    });

    return {
      success: true,
      installationId: options.token,
    };
  } catch (err: any) {
    saveConfig({
      installationId: options.token,
      endpointUrl: endpoint,
      deviceName,
      linkedAt: new Date().toISOString(),
    });

    return {
      success: true,
      installationId: options.token,
      error: `Guardado en configuración local. Advertencia de conexión: ${err?.message}`,
    };
  }
}

export function installClaudeHooks(customHookPath?: string): { success: boolean; configPath: string } {
  const claudeDir = path.join(os.homedir(), ".claude");
  const claudeConfigPath = path.join(claudeDir, "config.json");

  if (!fs.existsSync(claudeDir)) {
    try {
      fs.mkdirSync(claudeDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  let claudeConfig: any = {};
  if (fs.existsSync(claudeConfigPath)) {
    try {
      claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, "utf8"));
    } catch {
      claudeConfig = {};
    }
  }

  const hookCmd = customHookPath
    ? `node "${customHookPath}"`
    : `node "${path.resolve(path.join(getConfigDir(), "hooks", "buildsignal-hook.mjs"))}"`;

  claudeConfig.hooks = {
    ...claudeConfig.hooks,
    onUserPrompt: hookCmd,
    onToolResult: hookCmd,
    onTurnStop: hookCmd,
  };

  fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2), "utf8");
  return { success: true, configPath: claudeConfigPath };
}

export function installCodexHooks(customHookPath?: string): { success: boolean; configPath: string } {
  const codexDir = path.join(os.homedir(), ".codex");
  const codexConfigPath = path.join(codexDir, "config.json");

  if (!fs.existsSync(codexDir)) {
    try {
      fs.mkdirSync(codexDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  let codexConfig: any = {};
  if (fs.existsSync(codexConfigPath)) {
    try {
      codexConfig = JSON.parse(fs.readFileSync(codexConfigPath, "utf8"));
    } catch {
      codexConfig = {};
    }
  }

  const hookCmd = customHookPath
    ? `node "${customHookPath}"`
    : `node "${path.resolve(path.join(getConfigDir(), "hooks", "codex-hook.mjs"))}"`;

  codexConfig.hooks = {
    ...codexConfig.hooks,
    onMessage: hookCmd,
    onToolCall: hookCmd,
  };

  fs.writeFileSync(codexConfigPath, JSON.stringify(codexConfig, null, 2), "utf8");
  return { success: true, configPath: codexConfigPath };
}
