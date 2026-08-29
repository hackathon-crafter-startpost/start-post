#!/usr/bin/env node
import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";
import {
  EventQueue,
  flushQueue,
  loadConfig,
  saveConfig,
  linkAccountToken,
  installClaudeHooks,
  installCodexHooks,
  sendEventBatch,
} from "@hackathon-craft-station/collector";
import { sanitizeText } from "@hackathon-craft-station/sanitizer";

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

  // Check queue
  const queue = new EventQueue();
  const pending = await queue.peekBatch(100);
  console.log(`[Queue]  Offline events  : ${pending.length} evento(s) pendiente(s) en ~/.buildsignal/queue.jsonl`);

  // Test Zero-Leak Sanitizer
  const testSecret = "sk-ant-api03-abcdef1234567890abcdef1234567890";
  const sanitized = sanitizeText(`Mi token secreto es ${testSecret}`);
  const isSanitizing = !sanitized.includes("sk-ant-api03");
  console.log(`[Priv]   Zero-Leak Engine: ${isSanitizing ? "OK (Redacción activa de secretos)" : "FAIL"}`);

  // Test Convex HTTP Action connectivity
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
  const codexHookPath = path.resolve(scriptDir, "../../codex/bin/codex-hook.mjs");

  if (target === "all" || target === "claude") {
    const res = installClaudeHooks(claudeHookPath);
    console.log(`✅ Claude Code hooks configurados en: ${res.configPath}`);
  }

  if (target === "all" || target === "codex") {
    const res = installCodexHooks(codexHookPath);
    console.log(`✅ OpenAI Codex hooks configurados en: ${res.configPath}`);
  }

  console.log("\n🚀 ¡Listo! Tus sesiones de Claude Code y Codex reportarán eventos automáticamente con Zero-Leak.\n");
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
    console.log(`   👉 http://localhost:3000/ o la URL deployada\n`);
  } else {
    console.error(`\n❌ Error al enviar sesión: ${res.error}\n`);
  }
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
    case "logout":
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
