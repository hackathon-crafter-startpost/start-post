"use client";

import React, { useState, useEffect } from "react";
import { Terminal, Copy, Check, X, Shield, Cpu, ExternalLink, Zap, Laptop, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, Authenticated, Unauthenticated } from "convex/react";
import { api } from "@hackathon-craft-station/backend/convex/_generated/api";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";

interface CliSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CliSetupModal({ isOpen, onClose }: CliSetupModalProps) {
  const [activeTab, setActiveTab] = useState<"quick" | "claude" | "codex" | "antigravity">("quick");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [token, setToken] = useState<string>("bs_tok_local_dev_key");

  const getOrCreateToken = useMutation(api.installations.getUserInstallationToken);
  const devices = useQuery(api.installations.listUserDevices);

  useEffect(() => {
    if (isOpen) {
      getOrCreateToken()
        .then((res) => {
          if (res?.token) setToken(res.token);
        })
        .catch(() => {});
    }
  }, [isOpen, getOrCreateToken]);

  if (!isOpen) return null;

  const linkCommand = `npx buildsignal-cli@latest link ${token}`;
  const installCommand = `npx buildsignal-cli@latest install`;

  const claudeConfig = JSON.stringify(
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

  const codexConfig = JSON.stringify(
    {
      hooks: {
        onMessage: "npx buildsignal-cli buildsignal-hook",
        onToolCall: "npx buildsignal-cli buildsignal-hook",
      },
    },
    null,
    2
  );

  const antigravityConfig = JSON.stringify(
    {
      name: "buildsignal-collector",
      source: "antigravity",
      command: "npx buildsignal-cli buildsignal-hook --source antigravity",
      enabled: true,
    },
    null,
    2
  );

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("¡Comando copiado al portapapeles!");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("No se pudo copiar automáticamente");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl apple-acrylic-card p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-[#6e6e73] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="flex size-11 items-center justify-center rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-[#2997ff]">
            <Terminal className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
              Conectar Agentes a tu Cuenta
            </h2>
            <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
              Tus sesiones de Claude Code y Codex se enviarán a tu estudio personal.
            </p>
          </div>
        </div>

        {/* Apple Segmented Control */}
        <div className="apple-segmented-track mb-6">
          <button
            onClick={() => setActiveTab("quick")}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              activeTab === "quick"
                ? "apple-segmented-thumb-active"
                : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            }`}
          >
            <Zap className="size-3.5 text-[#0071e3] dark:text-[#2997ff]" />
            <span>Setup Rápido (2 Comandos)</span>
          </button>
          <button
            onClick={() => setActiveTab("claude")}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              activeTab === "claude"
                ? "apple-segmented-thumb-active"
                : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            }`}
          >
            <Cpu className="size-3.5" />
            <span>Claude Code JSON</span>
          </button>
          <button
            onClick={() => setActiveTab("codex")}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              activeTab === "codex"
                ? "apple-segmented-thumb-active"
                : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            }`}
          >
            <Terminal className="size-3.5" />
            <span>Codex</span>
          </button>
          <button
            onClick={() => setActiveTab("antigravity")}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              activeTab === "antigravity"
                ? "apple-segmented-thumb-active"
                : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            }`}
          >
            <Zap className="size-3.5 text-[#ff9f0a]" />
            <span>Antigravity</span>
          </button>
        </div>

        {/* Tab 1: Quick Command Setup */}
        {activeTab === "quick" && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-[#1d1d1f] dark:text-white mb-1.5 flex items-center justify-between">
                <span>1. Vincula tu terminal con tu token personal:</span>
                <span className="font-mono text-[11px] text-[#30d158]">Paso 1 de 2</span>
              </div>
              <div className="relative rounded-[14px] bg-[#121214] p-3.5 font-mono text-xs text-white border border-white/10 flex items-center justify-between">
                <div className="overflow-x-auto pr-14 text-[#2997ff] select-all">
                  {linkCommand}
                </div>
                <button
                  onClick={() => copyToClipboard(linkCommand, "link")}
                  className="apple-btn-secondary absolute right-2.5 top-2.5 py-1 px-2.5 text-xs"
                >
                  {copiedKey === "link" ? <Check className="size-3 text-[#30d158]" /> : <Copy className="size-3" />}
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#1d1d1f] dark:text-white mb-1.5 flex items-center justify-between">
                <span>2. Instala los hooks en tus configuraciones locales:</span>
                <span className="font-mono text-[11px] text-[#30d158]">Paso 2 de 2</span>
              </div>
              <div className="relative rounded-[14px] bg-[#121214] p-3.5 font-mono text-xs text-white border border-white/10 flex items-center justify-between">
                <div className="overflow-x-auto pr-14 text-[#30d158] select-all">
                  {installCommand}
                </div>
                <button
                  onClick={() => copyToClipboard(installCommand, "install")}
                  className="apple-btn-secondary absolute right-2.5 top-2.5 py-1 px-2.5 text-xs"
                >
                  {copiedKey === "install" ? <Check className="size-3 text-[#30d158]" /> : <Copy className="size-3" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Claude Code JSON */}
        {activeTab === "claude" && (
          <div className="space-y-4">
            <div className="rounded-[16px] bg-black/[0.03] dark:bg-white/[0.04] p-4 text-xs text-[#6e6e73] dark:text-[#86868b] leading-relaxed border border-black/[0.05] dark:border-white/[0.06]">
              Agrega este bloque a tu archivo de configuración de Claude Code (en{" "}
              <code className="font-mono text-[#0071e3] dark:text-[#2997ff] font-semibold">
                ~/.claude/config.json
              </code>
              ):
            </div>

            <div className="relative rounded-[16px] bg-[#121214] p-4 font-mono text-xs text-white border border-white/10">
              <pre className="overflow-x-auto">{claudeConfig}</pre>
              <button
                onClick={() => copyToClipboard(claudeConfig, "claude")}
                className="apple-btn-secondary absolute right-3 top-3 py-1 px-3 text-xs"
              >
                {copiedKey === "claude" ? (
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
        )}

        {/* Tab 3: Codex JSON */}
        {activeTab === "codex" && (
          <div className="space-y-4">
            <div className="rounded-[16px] bg-black/[0.03] dark:bg-white/[0.04] p-4 text-xs text-[#6e6e73] dark:text-[#86868b] leading-relaxed border border-black/[0.05] dark:border-white/[0.06]">
              Agrega este bloque a tu configuración de Codex (en{" "}
              <code className="font-mono text-[#0071e3] dark:text-[#2997ff] font-semibold">
                ~/.codex/config.json
              </code>
              ):
            </div>

            <div className="relative rounded-[16px] bg-[#121214] p-4 font-mono text-xs text-white border border-white/10">
              <pre className="overflow-x-auto">{codexConfig}</pre>
              <button
                onClick={() => copyToClipboard(codexConfig, "codex")}
                className="apple-btn-secondary absolute right-3 top-3 py-1 px-3 text-xs"
              >
                {copiedKey === "codex" ? (
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
        )}

        {/* Tab 4: Antigravity Agent Harness */}
        {activeTab === "antigravity" && (
          <div className="space-y-4">
            <div className="rounded-[16px] bg-black/[0.03] dark:bg-white/[0.04] p-4 text-xs text-[#6e6e73] dark:text-[#86868b] leading-relaxed border border-black/[0.05] dark:border-white/[0.06]">
              Para probar con tu <span className="text-[#ff9f0a] font-semibold">harness de Antigravity</span> o registrar el hook en{" "}
              <code className="font-mono text-[#ff9f0a] font-semibold">
                ~/.gemini/antigravity-cli/hooks/
              </code>
              :
            </div>

            <div className="relative rounded-[16px] bg-[#121214] p-4 font-mono text-xs text-white border border-white/10">
              <pre className="overflow-x-auto">{antigravityConfig}</pre>
              <button
                onClick={() => copyToClipboard(antigravityConfig, "antigravity")}
                className="apple-btn-secondary absolute right-3 top-3 py-1 px-3 text-xs"
              >
                {copiedKey === "antigravity" ? (
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
        )}

        {/* Security Callout */}
        <div className="mt-5 flex items-start gap-2.5 rounded-[14px] bg-[#30d158]/10 p-3 text-xs text-[#30d158] border border-[#30d158]/20">
          <Shield className="size-4 shrink-0 mt-0.5" />
          <p className="leading-snug text-[#1d1d1f] dark:text-white">
            <span className="font-semibold text-[#30d158]">Zero-Leak Local:</span> Los secretos, API keys y rutas de archivos son redactados en tu disco antes del envío.
          </p>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
          <Link
            href="/connect"
            onClick={onClose}
            className="text-xs text-[#0071e3] dark:text-[#2997ff] hover:underline flex items-center gap-1"
          >
            <span>Ver Hub de Conexión Completo</span>
            <ArrowRight className="size-3" />
          </Link>

          <button
            onClick={onClose}
            className="apple-btn-primary py-1.5 px-5 text-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
