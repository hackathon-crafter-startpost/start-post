"use client";

import React, { useState } from "react";
import { Terminal, Copy, Check, X, Shield, Cpu, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface CliSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CliSetupModal({ isOpen, onClose }: CliSetupModalProps) {
  const [activeTab, setActiveTab] = useState<"claude" | "codex">("claude");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const claudeConfig = JSON.stringify(
    {
      hooks: {
        onUserPrompt: "node ./plugins/claude-code/bin/buildsignal-hook.mjs",
        onToolResult: "node ./plugins/claude-code/bin/buildsignal-hook.mjs",
        onTurnStop: "node ./plugins/claude-code/bin/buildsignal-hook.mjs",
      },
    },
    null,
    2
  );

  const codexConfig = JSON.stringify(
    {
      hooks: {
        onMessage: "node ./plugins/codex/bin/codex-hook.mjs",
        onToolCall: "node ./plugins/codex/bin/codex-hook.mjs",
      },
    },
    null,
    2
  );

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("¡Configuración copiada al portapapeles!");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("No se pudo copiar automáticamente");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl apple-acrylic-card p-8 shadow-2xl">
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
              Configuración de Hooks CLI
            </h2>
            <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
              Conecta BuildSignal a tus agentes locales con 0 filtración de secretos.
            </p>
          </div>
        </div>

        {/* Apple Segmented Control */}
        <div className="apple-segmented-track mb-6">
          <button
            onClick={() => setActiveTab("claude")}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              activeTab === "claude"
                ? "apple-segmented-thumb-active"
                : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            }`}
          >
            <Cpu className="size-3.5" />
            <span>Claude Code CLI</span>
          </button>
          <button
            onClick={() => setActiveTab("codex")}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              activeTab === "codex"
                ? "apple-segmented-thumb-active"
                : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            }`}
          >
            <Terminal className="size-3.5" />
            <span>OpenAI Codex CLI</span>
          </button>
        </div>

        {/* Content Box */}
        {activeTab === "claude" ? (
          <div className="space-y-4">
            <div className="rounded-[16px] bg-black/[0.03] dark:bg-white/[0.04] p-4 text-xs text-[#6e6e73] dark:text-[#86868b] leading-relaxed border border-black/[0.05] dark:border-white/[0.06]">
              Agrega este bloque a tu archivo de configuración de Claude Code (usualmente en{" "}
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
        ) : (
          <div className="space-y-4">
            <div className="rounded-[16px] bg-black/[0.03] dark:bg-white/[0.04] p-4 text-xs text-[#6e6e73] dark:text-[#86868b] leading-relaxed border border-black/[0.05] dark:border-white/[0.06]">
              Agrega este bloque a tu configuración de Codex (usualmente en{" "}
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

        {/* Security callout */}
        <div className="mt-6 flex items-start gap-2.5 rounded-[16px] bg-[#30d158]/10 p-3.5 text-xs text-[#30d158] border border-[#30d158]/20">
          <Shield className="size-4 shrink-0 mt-0.5" />
          <p className="leading-snug text-[#1d1d1f] dark:text-white">
            <span className="font-semibold text-[#30d158]">Garantía Zero-Leak:</span> El hook ejecuta localmente el motor de redacción de secretos antes de despachar eventos a Convex.
          </p>
        </div>

        {/* Footer actions */}
        <div className="mt-7 flex justify-end">
          <button
            onClick={onClose}
            className="apple-btn-primary py-2 px-6 text-xs"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
