#!/usr/bin/env node
import fs from "fs";
import path from "path";
import os from "os";

/* =========================================================================
   Zero-Leak Sanitizer Engine (Inlined Standalone Hook)
========================================================================= */

const DEFAULT_IGNORED_PATTERNS = [
  /^\.env(\..+)?$/i,
  /^credentials[\/\\].+/i,
  /^private[\/\\].+/i,
  /^client-data[\/\\].+/i,
  /\.(key|pem|pfx|cert|crt)$/i,
  /^id_rsa/i,
  /\.keystore$/i,
];

const SECRET_REGEXES = [
  { name: "openai_key", regex: /sk-(?:proj-|ant-)?[a-zA-Z0-9_-]{20,}/g },
  { name: "clerk_key", regex: /(?:pk|sk)_(?:test|live)_[a-zA-Z0-9]{20,}/g },
  { name: "github_token", regex: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{30,}/g },
  { name: "aws_key", regex: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g },
  { name: "bearer_token", regex: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi },
  {
    name: "private_key",
    regex: /-----BEGIN (?:RSA |EC |PGP |OPENSSH )?PRIVATE KEY-----[^-]+-----END (?:RSA |EC |PGP |OPENSSH )?PRIVATE KEY-----/gs,
  },
  {
    name: "generic_secret",
    regex: /(?:api[_-]?key|secret[_-]?key|auth[_-]?token|password)['":\s=]+['"]?([a-zA-Z0-9_\-\.]{24,})['"]?/gi,
  },
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function sanitizeFilePath(filePath) {
  if (!filePath) return "";
  let normalized = filePath.replace(/\\/g, "/");
  normalized = normalized.replace(
    /(?:Error at |Found |Failed in )?[A-Za-z]:\/Users\/[^\/]+(?:\/.*?)?\/(src|apps|packages|lib|components|backend|convex|pages|plugins|code|repo)([\/].*)/i,
    "$1$2"
  );
  normalized = normalized.replace(
    /(?:Error at |Found |Failed in )?\/(?:Users|home)\/[^\/]+(?:\/.*?)?\/(src|apps|packages|lib|components|backend|convex|pages|plugins|code|repo)([\/].*)/i,
    "$1$2"
  );
  normalized = normalized.replace(/[A-Za-z]:\/Users\/[^\/]+/gi, "~");
  normalized = normalized.replace(/\/(?:Users|home)\/[^\/]+/gi, "~");
  return normalized;
}

function sanitizeText(text) {
  if (!text) return "";
  let sanitized = text;
  for (const { regex } of SECRET_REGEXES) {
    sanitized = sanitized.replace(regex, "[REDACTED_SECRET]");
  }
  sanitized = sanitized.replace(EMAIL_REGEX, "[EMAIL_REDACTED]");
  return sanitized;
}

function truncateOutput(output, maxLines = 20, maxLineChars = 200) {
  if (!output) return "";
  let lines = output.split("\n");
  lines = lines.map((line) =>
    line.length > maxLineChars ? line.slice(0, maxLineChars) + "..." : line
  );
  if (lines.length > maxLines) {
    const retained = lines.slice(0, maxLines);
    return `${retained.join("\n")}\n... [${lines.length - maxLines} lines truncated for brevity]`;
  }
  return lines.join("\n");
}

function sanitizePayload(payload, riskFlags) {
  if (typeof payload === "string") {
    const original = payload;
    let sanitized = sanitizeText(payload);
    sanitized = sanitizeFilePath(sanitized);
    sanitized = truncateOutput(sanitized);
    if (sanitized !== original && sanitized.includes("[REDACTED_SECRET]")) {
      riskFlags.add("secret_detected");
    }
    if (sanitized !== original && sanitized.includes("[EMAIL_REDACTED]")) {
      riskFlags.add("pii_detected");
    }
    return sanitized;
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item, riskFlags));
  }
  if (payload !== null && typeof payload === "object") {
    const result = {};
    for (const [key, value] of Object.entries(payload)) {
      result[key] = sanitizePayload(value, riskFlags);
    }
    return result;
  }
  return payload;
}

function sanitizeEvent(event) {
  const riskFlags = new Set(event.riskFlags || []);
  const sanitizedPayload = sanitizePayload(event.payload, riskFlags);
  const sanitizedSummary = event.summary ? sanitizeText(event.summary) : undefined;
  return {
    ...event,
    payload: sanitizedPayload,
    summary: sanitizedSummary,
    sanitized: true,
    riskFlags: riskFlags.size > 0 ? Array.from(riskFlags) : undefined,
  };
}

function generateEventId() {
  const rand = Math.random().toString(36).substring(2, 10);
  return `evt_${Date.now()}_${rand}`;
}

async function readStdin(timeoutMs = 150) {
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

function loadConfig() {
  const dir = path.join(os.homedir(), ".buildsignal");
  const file = path.join(dir, "config.json");

  let config = {
    installationId: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    endpointUrl:
      process.env.BUILDSIGNAL_ENDPOINT ||
      process.env.CONVEX_SITE_URL ||
      (process.env.NEXT_PUBLIC_CONVEX_URL
        ? `${process.env.NEXT_PUBLIC_CONVEX_URL.replace(/\.cloud$/, ".site")}/api/events/ingest`
        : "https://clever-labrador-928.convex.site/api/events/ingest"),
    enabled: true,
  };

  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      config = { ...config, ...parsed };
    } catch {}
  }

  if (process.env.BUILDSIGNAL_TOKEN) {
    config.installationId = process.env.BUILDSIGNAL_TOKEN;
  }
  if (process.env.BUILDSIGNAL_ENDPOINT) {
    config.endpointUrl = process.env.BUILDSIGNAL_ENDPOINT;
  }

  return config;
}

function normalizeClaudeEvent(raw, installationId) {
  const sessionId = raw.session_id || raw.conversation_id || "claude-session-default";
  let eventType = "turn_stopped";
  let payload = {};

  if (raw.type === "user_message" || raw.type === "prompt" || raw.user_prompt) {
    eventType = "user_prompt";
    payload = {
      prompt: raw.message || raw.user_prompt || raw.prompt || "",
    };
  } else if (raw.type === "tool_use" || raw.type === "tool_result") {
    const tool = raw.tool || raw.name || "";
    const command = raw.input?.command || raw.command || "";
    const output = raw.output || raw.result || "";
    const exitCode = raw.exit_code ?? (raw.error ? 1 : 0);

    if (command.includes("test") || command.includes("vitest") || command.includes("jest")) {
      eventType = exitCode === 0 ? "test_passed" : "test_failed";
    } else if (tool === "Edit" || tool === "Write" || tool === "replace_file_content") {
      eventType = "file_changed";
    } else {
      eventType = "tool_result";
    }

    payload = {
      tool,
      command,
      output,
      exitCode,
      filePath: raw.input?.file_path || raw.file_path || raw.filePath,
    };
  } else if (raw.type === "session_started") {
    eventType = "session_started";
    payload = { ...raw };
  } else if (raw.type === "session_ended") {
    eventType = "session_ended";
    payload = { ...raw };
  } else {
    payload = { ...raw };
  }

  const rawEvent = {
    eventId: generateEventId(),
    sessionId,
    installationId,
    source: "claude-code",
    type: eventType,
    timestamp: Date.now(),
    payload,
    summary: raw.summary,
    sanitized: false,
  };

  return sanitizeEvent(rawEvent);
}

class EventQueue {
  constructor() {
    const dir = path.join(os.homedir(), ".buildsignal");
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    this.filePath = path.join(dir, "queue.jsonl");
  }

  async enqueue(event) {
    try {
      const line = JSON.stringify(event) + "\n";
      fs.appendFileSync(this.filePath, line, "utf8");
    } catch {}
  }
}

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
    if (!config.enabled) return;

    const event = normalizeClaudeEvent(payload, config.installationId);

    // 1. Local resilient queue
    const queue = new EventQueue();
    await queue.enqueue(event);

    // 2. Best-effort async dispatch to Convex
    fetch(config.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-buildsignal-installation": config.installationId,
      },
      body: JSON.stringify({
        installationId: config.installationId,
        sessionId: event.sessionId,
        source: "claude-code",
        events: [event],
      }),
    }).catch(() => {});

  } catch {
    // Hooks must NEVER fail the parent AI agent process
  }
}

main();
