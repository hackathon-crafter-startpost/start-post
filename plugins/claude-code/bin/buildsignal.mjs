#!/usr/bin/env node
import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";

/* =========================================================================
   Zero-Leak Sanitizer Engine (Inlined Standalone)
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

export function sanitizeFilePath(filePath) {
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

export function sanitizeText(text) {
  if (!text) return "";
  let sanitized = text;
  for (const { regex } of SECRET_REGEXES) {
    sanitized = sanitized.replace(regex, "[REDACTED_SECRET]");
  }
  sanitized = sanitized.replace(EMAIL_REGEX, "[EMAIL_REDACTED]");
  return sanitized;
}

export function truncateOutput(output, maxLines = 20, maxLineChars = 200) {
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

export function sanitizePayload(payload, riskFlags) {
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

export function sanitizeEvent(event) {
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

/* =========================================================================
   Event Queue & Config (Inlined Standalone)
========================================================================= */

export class EventQueue {
  constructor(storagePath) {
    if (storagePath === ":memory:") {
      this.filePath = undefined;
      this.memoryQueue = [];
    } else {
      const dir = storagePath || path.join(os.homedir(), ".buildsignal");
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch {}
      }
      this.filePath = path.join(dir, "queue.jsonl");
      this.memoryQueue = [];
    }
  }

  async enqueue(event) {
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

  async peekBatch(limit = 20) {
    if (!this.filePath) {
      return this.memoryQueue.slice(0, limit);
    }
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const content = fs.readFileSync(this.filePath, "utf8");
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      const events = [];
      for (let i = 0; i < Math.min(lines.length, limit); i++) {
        try {
          events.push(JSON.parse(lines[i]));
        } catch {}
      }
      return events;
    } catch {
      return this.memoryQueue.slice(0, limit);
    }
  }

  async acknowledge(eventIds) {
    const idSet = new Set(eventIds);
    if (!this.filePath) {
      this.memoryQueue = this.memoryQueue.filter((e) => !idSet.has(e.eventId));
      return;
    }
    try {
      if (!fs.existsSync(this.filePath)) return;
      const content = fs.readFileSync(this.filePath, "utf8");
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      const remaining = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (!idSet.has(parsed.eventId)) {
            remaining.push(line);
          }
        } catch {}
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

export function getConfigDir() {
  return path.join(os.homedir(), ".buildsignal");
}

export function getConfigPath() {
  return path.join(getConfigDir(), "config.json");
}

export function loadConfig() {
  const dir = getConfigDir();
  const file = getConfigPath();

  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }

  let config = {
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
    } catch {}
  } else {
    try {
      fs.writeFileSync(file, JSON.stringify(config, null, 2), "utf8");
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

export function saveConfig(updates) {
  const current = loadConfig();
  const updated = {
    ...current,
    ...updates,
  };
  const dir = getConfigDir();
  const file = getConfigPath();
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  try {
    fs.writeFileSync(file, JSON.stringify(updated, null, 2), "utf8");
  } catch {}
  return updated;
}

export async function sendEventBatch(options) {
  const payload = {
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

      const data = await response.json();
      return {
        success: data.success ?? true,
        ingestedCount: data.ingested ?? options.events.length,
      };
    } catch (err) {
      if (attempts >= maxAttempts) {
        return {
          success: false,
          ingestedCount: 0,
          error: err?.message || "Failed to send batch",
        };
      }
      await new Promise((r) => setTimeout(r, attempts * 50));
    }
  }

  return {
    success: false,
    ingestedCount: 0,
    error: "Max attempts exceeded",
  };
}

export async function flushQueue(endpointUrl, installationId, source = "claude-code") {
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
      break;
    }
  }

  return { flushed: totalFlushed, errors: errorCount };
}

export async function linkAccountToken(options) {
  const config = loadConfig();
  const endpoint = options.endpointUrl || config.endpointUrl;
  const deviceName = options.deviceName || config.deviceName || `${os.hostname()} (${os.platform()})`;

  try {
    const pingBatch = {
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
  } catch (err) {
    saveConfig({
      installationId: options.token,
      endpointUrl: endpoint,
      deviceName,
      linkedAt: new Date().toISOString(),
    });

    return {
      success: true,
      installationId: options.token,
      error: `Guardado en configuración local. Advertencia: ${err?.message}`,
    };
  }
}

export function installClaudeHooks(customHookPath) {
  const claudeDir = path.join(os.homedir(), ".claude");
  const claudeConfigPath = path.join(claudeDir, "config.json");

  if (!fs.existsSync(claudeDir)) {
    try {
      fs.mkdirSync(claudeDir, { recursive: true });
    } catch {}
  }

  let claudeConfig = {};
  if (fs.existsSync(claudeConfigPath)) {
    try {
      claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, "utf8"));
    } catch {
      claudeConfig = {};
    }
  }

  const hookCmd = customHookPath
    ? `node "${customHookPath}"`
    : `npx buildsignal-hook`;

  claudeConfig.hooks = {
    ...claudeConfig.hooks,
    onUserPrompt: hookCmd,
    onToolResult: hookCmd,
    onTurnStop: hookCmd,
  };

  fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2), "utf8");
  return { success: true, configPath: claudeConfigPath };
}

export function installCodexHooks(customHookPath) {
  const codexDir = path.join(os.homedir(), ".codex");
  const codexConfigPath = path.join(codexDir, "config.json");

  if (!fs.existsSync(codexDir)) {
    try {
      fs.mkdirSync(codexDir, { recursive: true });
    } catch {}
  }

  let codexConfig = {};
  if (fs.existsSync(codexConfigPath)) {
    try {
      codexConfig = JSON.parse(fs.readFileSync(codexConfigPath, "utf8"));
    } catch {
      codexConfig = {};
    }
  }

  const hookCmd = customHookPath
    ? `node "${customHookPath}"`
    : `npx buildsignal-hook`;

  codexConfig.hooks = {
    ...codexConfig.hooks,
    onMessage: hookCmd,
    onToolCall: hookCmd,
  };

  fs.writeFileSync(codexConfigPath, JSON.stringify(codexConfig, null, 2), "utf8");
  return { success: true, configPath: codexConfigPath };
}

export function normalizeAntigravityEvent(raw, installationId) {
  if (!raw || typeof raw !== "object") return null;

  const hasUserInput = raw.type === "USER_INPUT" || !!raw.user_input || !!raw.prompt || !!raw.message;
  const hasToolCalls = Array.isArray(raw.tool_calls) && raw.tool_calls.length > 0;
  const hasTool = !!(raw.tool || raw.toolName || raw.name || hasToolCalls);
  const hasContent = !!raw.content;
  const hasStatus = !!raw.status;

  if (!hasUserInput && !hasTool && !hasContent && !hasStatus && !raw.type && !raw.summary) {
    return null;
  }

  const explicitSessionId =
    raw.conversation_id ||
    raw.conversationId ||
    raw.session_id ||
    raw.sessionId ||
    process.env.ANTIGRAVITY_CONVERSATION_ID ||
    process.env.SESSION_ID;

  const sessionId = explicitSessionId || getActiveSessionId(process.cwd());
  let eventType = "tool_result";
  let payload = {};

  if (raw.type === "USER_INPUT" || (hasUserInput && !hasTool)) {
    eventType = "user_prompt";
    payload = {
      prompt: raw.content || raw.user_input || raw.prompt || raw.message || "",
    };
  } else if (hasToolCalls) {
    const firstTool = raw.tool_calls[0];
    const toolName = firstTool.name || firstTool.tool || "";
    const args = firstTool.args || firstTool.parameters || {};

    if (toolName === "replace_file_content" || toolName === "write_to_file") {
      eventType = "file_changed";
      payload = {
        tool: toolName,
        filePath: args.TargetFile || args.path || args.file_path,
        diff: args.TargetContent ? `-${args.TargetContent}\n+${args.ReplacementContent}` : undefined,
        codeBefore: args.TargetContent,
        codeAfter: args.ReplacementContent || args.CodeContent,
      };
    } else if (toolName === "run_command") {
      const cmd = args.CommandLine || args.command || "";
      const isTest =
        cmd.includes("test") ||
        cmd.includes("vitest") ||
        cmd.includes("jest") ||
        cmd.includes("pytest") ||
        cmd.includes("cargo test") ||
        cmd.includes("go test");

      const exitCode = raw.status === "ERROR" || raw.exitCode === 1 ? 1 : 0;
      eventType = isTest ? (exitCode === 0 ? "test_passed" : "test_failed") : "tool_result";
      payload = {
        tool: toolName,
        command: cmd,
        output: raw.content || raw.output || "",
        exitCode,
      };
    } else {
      eventType = "tool_result";
      payload = {
        tool: toolName,
        args,
        output: raw.content || "",
      };
    }
  } else if (raw.type === "file_changed" || raw.filePath || raw.TargetFile) {
    eventType = "file_changed";
    payload = {
      filePath: raw.filePath || raw.TargetFile || raw.path,
      diff: raw.diff,
      codeBefore: raw.codeBefore || raw.TargetContent,
      codeAfter: raw.codeAfter || raw.ReplacementContent || raw.CodeContent,
    };
  } else if (raw.command || raw.CommandLine) {
    const cmd = raw.command || raw.CommandLine || "";
    const isTest =
      cmd.includes("test") ||
      cmd.includes("vitest") ||
      cmd.includes("jest") ||
      cmd.includes("pytest") ||
      cmd.includes("cargo test") ||
      cmd.includes("go test");

    const exitCode = raw.exitCode ?? raw.exit_code ?? (raw.status === "ERROR" ? 1 : 0);
    eventType = isTest ? (exitCode === 0 ? "test_passed" : "test_failed") : "tool_result";
    payload = {
      command: cmd,
      exitCode,
      output: raw.output || raw.content || "",
    };
  } else {
    payload = { ...raw };
  }

  const rawEvent = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
    sessionId,
    installationId,
    source: "antigravity",
    type: eventType,
    timestamp: Date.now(),
    payload,
    summary: raw.summary,
    sanitized: false,
  };

  return sanitizeEvent(rawEvent);
}

export function installAntigravityHooks(customHookPath) {
  const agyDir = path.join(os.homedir(), ".gemini", "antigravity-cli");
  const agyHooksDir = path.join(agyDir, "hooks");

  if (!fs.existsSync(agyHooksDir)) {
    try {
      fs.mkdirSync(agyHooksDir, { recursive: true });
    } catch {}
  }

  const hookTarget = path.join(agyHooksDir, "buildsignal-antigravity.json");
  const hookCmd = customHookPath
    ? `node "${customHookPath}"`
    : `npx buildsignal-hook --source antigravity`;

  const config = {
    name: "buildsignal-collector",
    source: "antigravity",
    command: hookCmd,
    enabled: true,
    installedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(hookTarget, JSON.stringify(config, null, 2), "utf8");
  } catch {}

  return { success: true, configPath: hookTarget };
}


/* =========================================================================
   CLI Command Handlers
========================================================================= */

const command = process.argv[2] || "status";
const param = process.argv[3];

async function handleLink(tokenArg) {
  let token = tokenArg;

  if (!token) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    token = await new Promise((resolve) => {
      rl.question("\n🔑 Pega tu Token de Instalación de BuildSignal: ", (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });
  }

  if (!token) {
    console.log("\n❌ Error: Debes proporcionar un token. Ejemplo: buildsignal link bs_tok_xxxx\n");
    return;
  }

  console.log(`\n[BuildSignal] Vinculando dispositivo con el token: ${token.slice(0, 10)}...`);
  const result = await linkAccountToken({
    token,
    deviceName: `${os.hostname()} (${os.platform()})`,
  });

  if (result.success) {
    console.log("\n✅ ¡Dispositivo vinculado exitosamente a tu cuenta de BuildSignal!");
    console.log(`   Token de sesión : ${result.installationId}`);
    console.log(`   Dispositivo     : ${os.hostname()} (${os.platform()})`);
    console.log("   Tus agentes (Claude Code / Codex) enviarán eventos a tu dashboard personal.\n");
  } else {
    console.log(`\n⚠️ ${result.error || "No se pudo verificar el token online, pero se guardó localmente."}\n`);
  }
}

async function handleLogin() {
  console.log("\n=======================================================");
  console.log("             BuildSignal — Conectar Cuenta");
  console.log("=======================================================\n");

  const config = loadConfig();
  const webBaseUrl = config.endpointUrl.includes("localhost")
    ? "http://localhost:3000"
    : config.endpointUrl.replace(/\/api\/events\/ingest$/, "").replace(/\.site$/, ".cloud");

  console.log("1. Abre tu navegador e inicia sesión en BuildSignal:");
  console.log(`   👉 ${webBaseUrl}/connect\n`);
  console.log("2. Copia tu Token de Instalación único y pégalo a continuación.\n");

  await handleLink();
}

async function handleWhoami() {
  const config = loadConfig();
  console.log("\n=======================================================");
  console.log("             BuildSignal — Información de Cuenta");
  console.log("=======================================================\n");

  const isLinked = config.installationId.startsWith("bs_tok_");
  console.log(`Estado de vinculación : ${isLinked ? "✅ VINCULADO A TU CUENTA" : "⚡ MODO LOCAL / ANÓNIMO"}`);
  console.log(`Token / ID Instalación: ${config.installationId}`);
  console.log(`Nombre de dispositivo : ${config.deviceName || os.hostname()}`);
  console.log(`Endpoint de Convex    : ${config.endpointUrl}`);
  if (config.linkedAt) {
    console.log(`Fecha de vinculación  : ${new Date(config.linkedAt).toLocaleString()}`);
  }
  console.log("\n=======================================================\n");
}

async function handleUnlink() {
  const newLocalId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  saveConfig({
    installationId: newLocalId,
    linkedAt: undefined,
  });
  console.log("\n✅ Dispositivo desvinculado de la cuenta remota.");
  console.log(`   Nuevo ID anónimo local: ${newLocalId}\n`);
}

async function handleStatus() {
  console.log("\n=======================================================");
  console.log("             BuildSignal CLI Diagnostics");
  console.log("=======================================================\n");

  const config = loadConfig();
  const isLinked = config.installationId.startsWith("bs_tok_");
  console.log(`[Cuenta] Estado          : ${isLinked ? "CONECTADO A CUENTA PERSONAL" : "LOCAL / DEV"}`);
  console.log(`[Config] Installation ID : ${config.installationId}`);
  console.log(`[Config] Dispositivo     : ${config.deviceName || os.hostname()}`);
  console.log(`[Config] Endpoint        : ${config.endpointUrl}`);
  console.log(`[Config] Habilitado      : ${config.enabled ? "SÍ (Activo)" : "NO (Desactivado)"}`);

  const queue = new EventQueue();
  const pending = await queue.peekBatch(100);
  console.log(`[Queue]  Offline events  : ${pending.length} evento(s) pendiente(s) en ~/.buildsignal/queue.jsonl`);

  const testSecret = "sk-ant-api03-abcdef1234567890abcdef1234567890";
  const sanitized = sanitizeText(`Mi token secreto es ${testSecret}`);
  const isSanitizing = !sanitized.includes("sk-ant-api03");
  console.log(`[Priv]   Zero-Leak Engine: ${isSanitizing ? "OK (Redacción activa de secretos)" : "FAIL"}`);

  try {
    const startTime = Date.now();
    const testBatch = {
      installationId: config.installationId,
      sessionId: "health_check_session",
      source: "claude-code",
      events: [],
    };
    const res = await fetch(config.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-buildsignal-installation": config.installationId,
      },
      body: JSON.stringify(testBatch),
    });
    const latency = Date.now() - startTime;
    if (res.ok) {
      console.log(`[Convex] Ingest Endpoint : ONLINE (${latency}ms, HTTP ${res.status})`);
    } else {
      console.log(`[Convex] Ingest Endpoint : WARNING (HTTP ${res.status})`);
    }
  } catch (err) {
    console.log(`[Convex] Ingest Endpoint : OFFLINE (${err.message})`);
  }

  console.log("\n=======================================================\n");
}

async function handleInstall(target = "all") {
  console.log("\n[BuildSignal] Instalando configuración de hooks...");
  const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
  const claudeHookPath = path.resolve(scriptDir, "buildsignal-hook.mjs");
  const codexHookPath = path.resolve(scriptDir, "buildsignal-hook.mjs");
  const agyHookPath = path.resolve(scriptDir, "buildsignal-hook.mjs");

  if (target === "all" || target === "claude") {
    const res = installClaudeHooks(claudeHookPath);
    console.log(`✅ Claude Code hooks configurados en: ${res.configPath}`);
  }

  if (target === "all" || target === "codex") {
    const res = installCodexHooks(codexHookPath);
    console.log(`✅ OpenAI Codex hooks configurados en: ${res.configPath}`);
  }

  if (target === "all" || target === "antigravity" || target === "agy") {
    const res = installAntigravityHooks(agyHookPath);
    console.log(`✅ Antigravity agent hooks configurados en: ${res.configPath}`);
  }

  console.log("\n🚀 ¡Listo! Tus sesiones de Claude Code, Codex y Antigravity reportarán eventos automáticamente con Zero-Leak.\n");
}

async function handleFlush() {
  console.log("\n[BuildSignal] Drenando cola de eventos offline hacia Convex...");
  const config = loadConfig();
  const res = await flushQueue(config.endpointUrl, config.installationId, "claude-code");
  console.log(`[BuildSignal] Drenados ${res.flushed} evento(s) con ${res.errors} error(es).\n`);
}

async function handleSimulate() {
  console.log("\n[BuildSignal] Enviando sesión de prueba simulada...");
  const config = loadConfig();
  const sessionId = `sess_sim_${Date.now()}`;

  const sampleEvents = [
    {
      eventId: `evt_${Date.now()}_1`,
      sessionId,
      installationId: config.installationId,
      source: "claude-code",
      type: "user_prompt",
      timestamp: Date.now() - 30000,
      payload: { prompt: "Corregir distorsión espectral en AnalyserNode Web Audio API" },
      sanitized: true,
    },
    {
      eventId: `evt_${Date.now()}_2`,
      sessionId,
      installationId: config.installationId,
      source: "claude-code",
      type: "test_failed",
      timestamp: Date.now() - 20000,
      payload: {
        command: "pnpm test",
        exitCode: 1,
        output: "FAIL: 40% false positives in audio analyzer spectrum",
      },
      sanitized: true,
    },
    {
      eventId: `evt_${Date.now()}_3`,
      sessionId,
      installationId: config.installationId,
      source: "claude-code",
      type: "file_changed",
      timestamp: Date.now() - 10000,
      payload: {
        filePath: "src/audio-detector.ts",
        diff: "- analyser.smoothingTimeConstant = 0.8;\n+ analyser.smoothingTimeConstant = 0.0;",
        codeBefore: "analyser.smoothingTimeConstant = 0.8; // Web Audio default",
        codeAfter: "analyser.smoothingTimeConstant = 0.0; // Desactivado para transitorios",
      },
      sanitized: true,
    },
    {
      eventId: `evt_${Date.now()}_4`,
      sessionId,
      installationId: config.installationId,
      source: "claude-code",
      type: "test_passed",
      timestamp: Date.now(),
      payload: {
        command: "pnpm test",
        exitCode: 0,
        output: "PASS: 12/12 tests passed with 0.0% false positives",
      },
      sanitized: true,
    },
  ];

  const res = await sendEventBatch({
    endpointUrl: config.endpointUrl,
    installationId: config.installationId,
    sessionId,
    source: "claude-code",
    events: sampleEvents,
  });

  if (res.success) {
    console.log(`\n🎉 ¡Sesión ${sessionId} enviada exitosamente a Convex!`);
    console.log(`   Token de usuario : ${config.installationId}`);
    console.log(`   Abre el Estudio de Creación para ver el momento detectado:`);
    console.log(`   👉 http://localhost:3000/ o tu URL deployada\n`);
  } else {
    console.error(`\n❌ Error al enviar sesión: ${res.error}\n`);
  }
}

async function handleClean() {
  const dir = getConfigDir();
  const queueFile = path.join(dir, "queue.jsonl");
  const sessionFile = path.join(dir, "active_sessions.json");
  if (fs.existsSync(queueFile)) {
    try {
      fs.unlinkSync(queueFile);
    } catch {}
  }
  if (fs.existsSync(sessionFile)) {
    try {
      fs.unlinkSync(sessionFile);
    } catch {}
  }
  console.log("\n✅ Cola local de eventos y sesiones activas reiniciadas con éxito.\n");
}

function handleHelp() {
  console.log(`
BuildSignal CLI — Copiloto de Contenido Técnico para Desarrolladores

Uso:
  buildsignal <comando> [argumentos]

Comandos principales:
  link <token>   Vincula tu terminal con tu cuenta de BuildSignal.
  login          Inicia el flujo de conexión en el navegador.
  install [all]  Instala automáticamente los hooks en Claude Code y Codex.
  whoami         Muestra el estado de tu cuenta vinculada y dispositivo.
  status         Ejecuta diagnósticos del sistema, cola offline y Zero-Leak.
  simulate       Envía una sesión de prueba verificada para comprobar la conexión.
  flush          Drena la cola de eventos locales pendientes a Convex.
  clean          Limpia la cola local y reinicia las sesiones activas.
  unlink         Desvincula el dispositivo y regresa a modo anónimo.
  help           Muestra esta ayuda.

Ejemplos:
  npx buildsignal link bs_tok_abc12345
  npx buildsignal install
  npx buildsignal simulate
  npx buildsignal status
  `);
}

async function run() {
  switch (command) {
    case "link":
      await handleLink(param);
      break;
    case "login":
      await handleLogin();
      break;
    case "whoami":
      await handleWhoami();
      break;
    case "unlink":
      await handleUnlink();
      break;
    case "install":
    case "setup":
      await handleInstall(param);
      break;
    case "status":
      await handleStatus();
      break;
    case "flush":
      await handleFlush();
      break;
    case "clean":
    case "reset":
      await handleClean();
      break;
    case "simulate":
      await handleSimulate();
      break;
    case "help":
    case "--help":
    case "-h":
    default:
      handleHelp();
      break;
  }
}

run();
