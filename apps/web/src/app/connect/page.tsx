/* Hallmark · Apple Design Authority Agent Connection Hub */
"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, Authenticated, Unauthenticated } from "convex/react";
import { api } from "@hackathon-craft-station/backend/convex/_generated/api";
import {
  Terminal,
  Cpu,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  Laptop,
  CheckCircle2,
  ArrowRight,
  Zap,
  Sparkles,
  RefreshCw,
  Sliders,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";

export default function ConnectAgentPage() {
  const [token, setToken] = useState<string>("bs_tok_local_demo_key");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<"claude" | "codex">("claude");
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  const getOrCreateToken = useMutation(api.installations.getUserInstallationToken);
  const devices = useQuery(api.installations.listUserDevices);

  useEffect(() => {
    async function loadToken() {
      try {
        setIsGeneratingToken(true);
        const res = await getOrCreateToken();
        if (res?.token) {
          setToken(res.token);
        }
      } catch {
        // Fallback for unauthenticated or local dev
      } finally {
        setIsGeneratingToken(false);
      }
    }
    loadToken();
  }, [getOrCreateToken]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("¡Copiado al portapapeles!");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("No se pudo copiar automáticamente");
    }
  };

  const linkCommand = `npx buildsignal-cli@latest link ${token}`;
  const installCommand = `npx buildsignal-cli@latest install`;
  const simulateCommand = `npx buildsignal-cli@latest simulate`;

  const claudeManualConfig = JSON.stringify(
    {
      hooks: {
        onUserPrompt: "npx buildsignal-cli buildsignal-hook",
        onToolResult: "npx buildsignal-cli buildsignal-hook",
        onTurnStop: "npx buildsignal-cli buildsignal-hook",
      },
    },
    null,
    2
  );

  const codexManualConfig = JSON.stringify(
    {
      hooks: {
        onMessage: "npx buildsignal-cli buildsignal-hook",
        onToolCall: "npx buildsignal-cli buildsignal-hook",
      },
    },
    null,
    2
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] pb-32 transition-colors duration-300">
      {/* Hero HUD */}
      <section className="relative pt-12 sm:pt-16 pb-10 sm:pb-12 border-b border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
        <div className="container mx-auto px-4 sm:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full apple-acrylic-bar text-[12px] font-medium text-[#0066cc] dark:text-[#2997ff] mb-4">
              <Terminal className="size-3.5" />
              <span>Conexión de Agentes & CLI Hooks</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-[#1d1d1f] dark:text-white font-sans">
              Conecta tu Claude Code & Codex a tu cuenta.
            </h1>
            <p className="text-[15px] sm:text-[17px] text-[#6e6e73] dark:text-[#86868b] mt-3 max-w-2xl leading-relaxed">
              Ejecuta dos comandos rápidos en tu terminal para sincronizar automáticamente tus sesiones de programación con tu dashboard en la nube bajo estricta privacidad Zero-Leak.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <main className="container mx-auto px-4 sm:px-8 pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Quick Link Card & Instructions (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Step 1: Token Link Card */}
            <div className="apple-acrylic-card p-6 sm:p-8 relative overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-[#0066cc] text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
                      Vincula tu Terminal a tu Cuenta
                    </h2>
                    <span className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                      Asocia tus sesiones locales con tu usuario en Convex
                    </span>
                  </div>
                </div>

                <Unauthenticated>
                  <SignInButton mode="modal">
                    <button className="apple-btn-secondary py-1 px-3 text-xs">
                      Iniciar Sesión para Token Personal
                    </button>
                  </SignInButton>
                </Unauthenticated>
              </div>

              <div className="rounded-[16px] bg-[#121214] p-4 font-mono text-xs text-white border border-white/10 relative flex items-center justify-between">
                <div className="overflow-x-auto pr-16 py-1 select-all text-[#2997ff]">
                  {linkCommand}
                </div>
                <button
                  onClick={() => copyToClipboard(linkCommand, "link-cmd")}
                  className="apple-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey === "link-cmd" ? (
                    <>
                      <Check className="size-3 text-[#30d158]" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: Auto Install Hooks */}
            <div className="apple-acrylic-card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-9 items-center justify-center rounded-full bg-[#30d158] text-white font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
                    Instala los Hooks Automáticamente
                  </h2>
                  <span className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                    Configura ~/.claude/config.json y ~/.codex/config.json en un paso
                  </span>
                </div>
              </div>

              <div className="rounded-[16px] bg-[#121214] p-4 font-mono text-xs text-white border border-white/10 relative flex items-center justify-between">
                <div className="overflow-x-auto pr-16 py-1 select-all text-[#30d158]">
                  {installCommand}
                </div>
                <button
                  onClick={() => copyToClipboard(installCommand, "install-cmd")}
                  className="apple-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey === "install-cmd" ? (
                    <>
                      <Check className="size-3 text-[#30d158]" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 3: Test Simulation */}
            <div className="apple-acrylic-card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-9 items-center justify-center rounded-full bg-[#ff9f0a] text-white font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
                    Envía una Prueba Simulada
                  </h2>
                  <span className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                    Comprueba que los eventos lleguen a tu estudio en vivo
                  </span>
                </div>
              </div>

              <div className="rounded-[16px] bg-[#121214] p-4 font-mono text-xs text-white border border-white/10 relative flex items-center justify-between">
                <div className="overflow-x-auto pr-16 py-1 select-all text-[#ff9f0a]">
                  {simulateCommand}
                </div>
                <button
                  onClick={() => copyToClipboard(simulateCommand, "simulate-cmd")}
                  className="apple-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey === "simulate-cmd" ? (
                    <>
                      <Check className="size-3 text-[#30d158]" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Manual JSON Config Drawer */}
            <div className="apple-acrylic-card p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[15px] flex items-center gap-2">
                  <Code2 className="size-4 text-[#0066cc] dark:text-[#2997ff]" />
                  <span>Configuración Manual Alternativa</span>
                </h3>

                <div className="apple-segmented-track p-0.5">
                  <button
                    onClick={() => setSelectedAgent("claude")}
                    className={`px-3 py-1 text-xs rounded-full transition-all ${
                      selectedAgent === "claude"
                        ? "apple-segmented-thumb-active"
                        : "text-[#6e6e73]"
                    }`}
                  >
                    Claude Code
                  </button>
                  <button
                    onClick={() => setSelectedAgent("codex")}
                    className={`px-3 py-1 text-xs rounded-full transition-all ${
                      selectedAgent === "codex"
                        ? "apple-segmented-thumb-active"
                        : "text-[#6e6e73]"
                    }`}
                  >
                    OpenAI Codex
                  </button>
                </div>
              </div>

              <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mb-3">
                Si prefieres configurar manualmente tu archivo{" "}
                <code className="font-mono text-[#0066cc] dark:text-[#2997ff]">
                  {selectedAgent === "claude" ? "~/.claude/config.json" : "~/.codex/config.json"}
                </code>
                :
              </p>

              <div className="relative rounded-[16px] bg-[#121214] p-4 font-mono text-xs text-white border border-white/10">
                <pre className="overflow-x-auto">
                  {selectedAgent === "claude" ? claudeManualConfig : codexManualConfig}
                </pre>
                <button
                  onClick={() =>
                    copyToClipboard(
                      selectedAgent === "claude" ? claudeManualConfig : codexManualConfig,
                      "manual-json"
                    )
                  }
                  className="apple-btn-secondary absolute right-3 top-3 py-1 px-3 text-xs"
                >
                  {copiedKey === "manual-json" ? (
                    <>
                      <Check className="size-3 text-[#30d158]" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copiar JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Connected Devices & Security Guarantee (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Connected Devices HUD */}
            <div className="apple-acrylic-card p-6 sm:p-8">
              <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08] mb-4">
                <div className="flex items-center gap-2">
                  <Laptop className="size-4 text-[#0066cc] dark:text-[#2997ff]" />
                  <h3 className="font-semibold text-[16px] text-[#1d1d1f] dark:text-white">
                    Dispositivos Conectados ({devices?.length || 1})
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[#30d158] bg-[#30d158]/10 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#30d158] animate-pulse" />
                  <span>Sincronizando</span>
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {devices && devices.length > 0 ? (
                  devices.map((d) => (
                    <div
                      key={d._id}
                      className="p-4 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-xs text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                          <span>{d.deviceName}</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#6e6e73]">
                            {d.source}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-[#6e6e73] dark:text-[#86868b] mt-1">
                          Token: {d.token.slice(0, 14)}...
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#30d158]">
                          <CheckCircle2 className="size-3" />
                          <span>Activo</span>
                        </span>
                        <div className="text-[10px] text-[#6e6e73] font-mono mt-0.5">
                          {new Date(d.lastSeenAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                    <div>
                      <div className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        Estación de Trabajo Principal
                      </div>
                      <div className="text-[11px] font-mono text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                        Token: {token.slice(0, 14)}...
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#30d158]">
                      <CheckCircle2 className="size-3" />
                      <span>Listo para conectar</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Zero-Leak Security Callout */}
            <div className="apple-acrylic-card p-6 sm:p-8 border border-[#30d158]/20 bg-[#30d158]/[0.03]">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#30d158]/10 text-[#30d158] shrink-0">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[16px] text-[#1d1d1f] dark:text-white">
                    Privacidad Local Zero-Leak
                  </h3>
                  <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-1.5 leading-relaxed">
                    BuildSignal ejecuta su motor de sanitización de secretos en tu propia máquina antes de que cualquier byte sea transmitido. Tus API keys, rutas de usuario, credenciales .env y razonamiento interno quedan 100% blindados en tu disco local.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] font-mono text-[#30d158]">
                <div className="flex items-center gap-1.5 p-2 rounded-[10px] bg-[#30d158]/10">
                  <Check className="size-3" />
                  <span>Sin telemetría invasiva</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-[10px] bg-[#30d158]/10">
                  <Check className="size-3" />
                  <span>Redacción de .env</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-[10px] bg-[#30d158]/10">
                  <Check className="size-3" />
                  <span>Sin screen recording</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-[10px] bg-[#30d158]/10">
                  <Check className="size-3" />
                  <span>Control por proyecto</span>
                </div>
              </div>
            </div>

            {/* Studio Navigation CTA */}
            <div className="apple-acrylic-card p-6 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm text-[#1d1d1f] dark:text-white">
                  ¿Listo para ver tus historias?
                </h4>
                <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                  Revisa los momentos detectados en tu estudio de creación.
                </p>
              </div>
              <Link href="/" className="apple-btn-primary py-2 px-4 text-xs flex items-center gap-1">
                <span>Ir al Estudio</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
