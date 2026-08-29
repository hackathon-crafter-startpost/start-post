#!/usr/bin/env node
import fs from "fs";
import path from "path";
import os from "os";
import {
  EventQueue,
  flushQueue,
  normalizeClaudeEvent,
  sendEventBatch,
} from "@hackathon-craft-station/collector";
import { sanitizeText } from "@hackathon-craft-station/sanitizer";

const command = process.argv[2] || "status";

const CONVEX_SITE_URL =
  process.env.CONVEX_SITE_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL?.replace(/\.cloud$/, ".site") ||
  "https://clever-labrador-928.convex.site";

const ENDPOINT_URL = `${CONVEX_SITE_URL}/api/events/ingest`;
const BUILDSIGNAL_DIR = path.join(os.homedir(), ".buildsignal");
const CONFIG_PATH = path.join(BUILDSIGNAL_DIR, "config.json");

function getOrInitConfig() {
  if (!fs.existsSync(BUILDSIGNAL_DIR)) {
    fs.mkdirSync(BUILDSIGNAL_DIR, { recursive: true });
  }

  let config = {
    installationId: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    endpointUrl: ENDPOINT_URL,
    enabled: true,
    createdAt: new Date().toISOString(),
  };

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    } catch {
      // keep default
    }
  } else {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  }

  return config;
}

async function handleStatus() {
  console.log("\n=======================================================");
  console.log("             BuildSignal CLI Diagnostics");
  console.log("=======================================================\n");

  const config = getOrInitConfig();
  console.log(`[Config] Installation ID : ${config.installationId}`);
  console.log(`[Config] Endpoint        : ${config.endpointUrl}`);
  console.log(`[Config] Enabled         : ${config.enabled ? "YES (Active)" : "NO (Disabled)"}`);

  // Check queue
  const queue = new EventQueue();
  const pending = await queue.peekBatch(100);
  console.log(`[Queue]  Offline events  : ${pending.length} event(s) pending in ~/.buildsignal/queue.jsonl`);

  // Test Zero-Leak Sanitizer
  const testSecret = "sk-ant-api03-abcdef1234567890abcdef1234567890";
  const sanitized = sanitizeText(`Mi token secreto es ${testSecret}`);
  const isSanitizing = !sanitized.includes("sk-ant-api03");
  console.log(`[Priv]   Zero-Leak Engine: ${isSanitizing ? "OK (Secret redaction active)" : "FAIL"}`);

  // Test Convex HTTP Action connectivity
  try {
    const testBatch = {
      installationId: config.installationId,
      sessionId: "health_check_session",
      source: "claude-code",
      events: [],
    };
    const res = await fetch(config.endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testBatch),
    });
    if (res.ok) {
      console.log(`[Convex] Ingest Endpoint : ONLINE (HTTP ${res.status})`);
    } else {
      console.log(`[Convex] Ingest Endpoint : WARNING (HTTP ${res.status})`);
    }
  } catch (err) {
    console.log(`[Convex] Ingest Endpoint : OFFLINE (${err.message})`);
  }

  console.log("\n=======================================================\n");
}

async function handleInstall() {
  console.log("\n[BuildSignal] Instalando configuración de hooks para Claude Code...");
  const config = getOrInitConfig();
  const claudeDir = path.join(os.homedir(), ".claude");
  const claudeConfigPath = path.join(claudeDir, "config.json");

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  let claudeConfig = {};
  if (fs.existsSync(claudeConfigPath)) {
    try {
      claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, "utf8"));
    } catch {
      claudeConfig = {};
    }
  }

  const hookScriptPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")),
    "buildsignal-hook.mjs"
  );

  claudeConfig.hooks = {
    ...claudeConfig.hooks,
    onUserPrompt: `node "${hookScriptPath}"`,
    onToolResult: `node "${hookScriptPath}"`,
    onTurnStop: `node "${hookScriptPath}"`,
  };

  fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2), "utf8");
  console.log(`[BuildSignal] Configuración escrita exitosamente en: ${claudeConfigPath}`);
  console.log("[BuildSignal] Los hooks de Claude Code ahora reportarán eventos a BuildSignal con Zero-Leak activado.\n");
}

async function handleFlush() {
  console.log("\n[BuildSignal] Drenando cola de eventos offline hacia Convex...");
  const config = getOrInitConfig();
  const res = await flushQueue(config.endpointUrl, config.installationId, "claude-code");
  console.log(`[BuildSignal] Drenados ${res.flushed} evento(s) con ${res.errors} error(es).\n`);
}

async function handleSimulate() {
  console.log("\n[BuildSignal] Enviando sesión de prueba simulada...");
  const config = getOrInitConfig();
  const sessionId = `sess_sim_${Date.now()}`;

  const sampleEvents = [
    {
      eventId: `evt_${Date.now()}_1`,
      sessionId,
      installationId: config.installationId,
      source: "claude-code",
      type: "user_prompt",
      timestamp: Date.now() - 30000,
      payload: { prompt: "Arreglar error de falsos positivos en Web Audio API" },
      sanitized: true,
    },
    {
      eventId: `evt_${Date.now()}_2`,
      sessionId,
      installationId: config.installationId,
      source: "claude-code",
      type: "test_failed",
      timestamp: Date.now() - 20000,
      payload: { command: "pnpm test", exitCode: 1, output: "FAIL: 40% false positives in audio analyzer" },
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
        codeBefore: "analyser.smoothingTimeConstant = 0.8;",
        codeAfter: "analyser.smoothingTimeConstant = 0.0;",
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
      payload: { command: "pnpm test", exitCode: 0, output: "PASS: 12/12 tests passed with 0.0% false positives" },
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
    console.log(`[BuildSignal] ¡Sesión ${sessionId} enviada exitosamente a Convex!`);
    console.log(`[BuildSignal] Revisa el Dashboard en tiempo real en: http://localhost:3001/\n`);
  } else {
    console.error(`[BuildSignal] Error al enviar sesión: ${res.error}\n`);
  }
}

function handleHelp() {
  console.log(`
Uso: buildsignal <comando>

Comandos disponibles:
  status     Muestra el estado de la configuración, la cola local y la conexión a Convex.
  install    Configura automáticamente los hooks en ~/.claude/config.json.
  flush      Envía todos los eventos pendientes en la cola local a Convex.
  simulate   Envía una sesión de prueba con un bug resuelto y tests aprobados.
  help       Muestra este manual de ayuda.
  `);
}

async function run() {
  switch (command) {
    case "status":
      await handleStatus();
      break;
    case "install":
      await handleInstall();
      break;
    case "flush":
      await handleFlush();
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
