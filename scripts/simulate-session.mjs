#!/usr/bin/env node
/**
 * CLI script to simulate a live coding session sending events to BuildSignal
 */
import { sendEventBatch, loadConfig } from "@hackathon-craft-station/collector";

const config = loadConfig();
const sessionId = `cli_session_${Date.now()}`;
const installationId = config.installationId;
const endpoint = config.endpointUrl;

console.log("🚀 Iniciando simulación de sesión en vivo...");
console.log(`🔗 Endpoint: ${endpoint}`);
console.log(`🔑 Installation Token: ${installationId}`);
console.log(`📦 Session ID: ${sessionId}`);

const events = [
  {
    eventId: `evt_${Date.now()}_1`,
    sessionId,
    installationId,
    source: "claude-code",
    type: "user_prompt",
    timestamp: Date.now() - 60000,
    payload: {
      prompt: "Refactor cache layer to prevent dogpiling when tokens expire under high concurrency",
    },
    summary: "Refactorización de caché concurrente",
    sanitized: true,
  },
  {
    eventId: `evt_${Date.now()}_2`,
    sessionId,
    installationId,
    source: "claude-code",
    type: "test_failed",
    timestamp: Date.now() - 40000,
    payload: {
      command: "pnpm test",
      output: "FAIL test/cache.test.ts\n  ✕ Should lock key during refresh\n    Expected 1 backend request, received 120",
      exitCode: 1,
    },
    summary: "Test de concurrencia fallido: dogpiling detectado",
    sanitized: true,
  },
  {
    eventId: `evt_${Date.now()}_3`,
    sessionId,
    installationId,
    source: "claude-code",
    type: "file_changed",
    timestamp: Date.now() - 20000,
    payload: {
      filePath: "src/cache/lock.ts",
      codeBefore: "const value = await fetchFromOrigin();",
      codeAfter: "const value = await singleflight.do(key, () => fetchFromOrigin());",
      diff: "- const value = await fetchFromOrigin();\n+ const value = await singleflight.do(key, () => fetchFromOrigin());",
    },
    summary: "Implementación de Singleflight mutex para prevenir estampidas de caché",
    sanitized: true,
  },
  {
    eventId: `evt_${Date.now()}_4`,
    sessionId,
    installationId,
    source: "claude-code",
    type: "test_passed",
    timestamp: Date.now(),
    payload: {
      command: "pnpm test",
      output: "PASS test/cache.test.ts\n  ✓ Should lock key during refresh (1 request total)",
      exitCode: 0,
    },
    summary: "Todos los tests aprobados con Singleflight",
    sanitized: true,
  },
];

async function run() {
  const result = await sendEventBatch({
    endpointUrl: endpoint,
    installationId,
    sessionId,
    source: "claude-code",
    events,
  });

  if (result.success) {
    console.log(`✅ ¡Lote de ${result.ingestedCount} eventos enviado a Convex exitosamente!`);
    console.log("✨ Abre el dashboard para ver el momento y la historia detectada.");
  } else {
    console.error("❌ Error al enviar lote:", result.error);
  }
}

run();
