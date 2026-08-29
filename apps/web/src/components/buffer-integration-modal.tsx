/* Hallmark · Apple Design Authority Buffer Integration Modal */
"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@hackathon-craft-station/backend/convex/_generated/api";
import {
  Share2,
  Check,
  ExternalLink,
  Zap,
  ShieldCheck,
  AlertCircle,
  Radio,
  Sliders,
  RefreshCw,
  Trash2,
  Layers,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface BufferIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BufferIntegrationModal({
  isOpen,
  onClose,
}: BufferIntegrationModalProps) {
  const settings = useQuery(api.buffer.getSettings, {});
  const saveSettings = useMutation(api.buffer.saveSettings);
  const disconnect = useMutation(api.buffer.disconnect);
  const testConnection = useAction(api.buffer.testConnection);
  const fetchChannels = useAction(api.buffer.fetchChannels);

  const [apiKey, setApiKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [channels, setChannels] = useState<Array<{ id: string; name: string; service: string; avatar?: string }>>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [publishMode, setPublishMode] = useState<"addToQueue" | "now" | "next">("addToQueue");
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (settings) {
      if (settings.apiKey) setApiKey(settings.apiKey);
      if (settings.organizationId) setSelectedOrgId(settings.organizationId);
      if (settings.channelId) setSelectedChannelId(settings.channelId);
      if (typeof settings.autoPublish === "boolean") setAutoPublish(settings.autoPublish);
      if (settings.publishMode) setPublishMode(settings.publishMode as any);
      setConnectionStatus("success");
    }
  }, [settings]);

  // When modal opens and settings exist, load channels
  useEffect(() => {
    if (isOpen && settings?.apiKey && settings?.organizationId) {
      fetchChannels({
        organizationId: settings.organizationId,
        apiKeyOverride: settings.apiKey,
      })
        .then((ch) => setChannels(ch || []))
        .catch(() => {});
    }
  }, [isOpen, settings, fetchChannels]);

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (!apiKey.trim()) {
      toast.error("Por favor ingresa tu API Key de Buffer");
      return;
    }

    try {
      setIsVerifying(true);
      setErrorMessage("");
      toast.info("Conectando con Buffer GraphQL API...");

      const res = await testConnection({ apiKeyOverride: apiKey.trim() });

      if (res.success) {
        setConnectionStatus("success");
        setOrganizations(res.organizations || []);
        if (res.organizations && res.organizations.length > 0) {
          const firstOrgId = res.organizations[0].id;
          setSelectedOrgId(firstOrgId);

          const ch = await fetchChannels({
            organizationId: firstOrgId,
            apiKeyOverride: apiKey.trim(),
          });
          setChannels(ch || []);
          if (ch && ch.length > 0) {
            setSelectedChannelId(ch[0].id);
          }
        }
        toast.success("¡Conexión exitosa con Buffer!", {
          description: `Cuenta verificada. ${res.channels?.length || 0} canales detectados.`,
        });
      } else {
        setConnectionStatus("error");
        setErrorMessage(res.error || "No se pudo verificar la API Key");
        toast.error(res.error || "Error de verificación con Buffer");
      }
    } catch (err: any) {
      setConnectionStatus("error");
      setErrorMessage(err.message || "Error al conectar con Buffer");
      toast.error("Error: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("Ingresa una API Key válida");
      return;
    }

    try {
      setIsSaving(true);
      const selectedChannel = channels.find((c) => c.id === selectedChannelId);
      const selectedOrg = organizations.find((o) => o.id === selectedOrgId);

      await saveSettings({
        apiKey: apiKey.trim(),
        organizationId: selectedOrgId || undefined,
        organizationName: selectedOrg?.name || undefined,
        channelId: selectedChannelId || undefined,
        channelName: selectedChannel?.name || undefined,
        channelService: selectedChannel?.service || undefined,
        channelAvatar: selectedChannel?.avatar || undefined,
        autoPublish,
        publishMode,
      });

      toast.success("Configuración de Buffer guardada", {
        description: autoPublish
          ? "La publicación automática a tu cola de Buffer está activa."
          : "Listo para publicar tus historias técnicas con un clic.",
      });
      onClose();
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect({});
      setApiKey("");
      setSelectedOrgId("");
      setSelectedChannelId("");
      setChannels([]);
      setOrganizations([]);
      setConnectionStatus("idle");
      toast.info("Integración con Buffer desconectada");
      onClose();
    } catch {
      toast.error("Error al desconectar");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[24px] sm:rounded-[28px] bg-[#fbfbfd] dark:bg-[#161618] border border-black/10 dark:border-white/10 p-6 sm:p-8 shadow-2xl text-[#1d1d1f] dark:text-[#f5f5f7]">
        {/* Header HUD */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-[14px] bg-[#231f20] text-white flex items-center justify-center font-bold shadow-md">
              <Share2 className="size-6 text-[#2997ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight font-sans">
                  Integración con Buffer
                </h2>
                {settings?.apiKey ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20 font-mono">
                    <Check className="size-3" />
                    <span>Conectado</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 text-[#6e6e73] font-mono">
                    GraphQL Beta
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                Publica automáticamente las historias de código y tarjetas visuales en LinkedIn, Twitter/X y tus canales de Buffer.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#6e6e73] hover:text-[#1d1d1f] dark:hover:text-white text-xl p-1 leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          {/* Step 1: API Key input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b] flex items-center gap-1.5">
                <span>1. Buffer API Key</span>
              </label>
              <a
                href="https://publish.buffer.com/settings/api"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#0066cc] dark:text-[#2997ff] hover:underline flex items-center gap-1"
              >
                <span>Obtener API Key en Buffer</span>
                <ExternalLink className="size-3" />
              </a>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="buf_1234567890abcdef..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setConnectionStatus("idle");
                }}
                className="apple-input-capsule flex-1 py-2 px-3.5 text-xs sm:text-sm font-mono"
              />
              <button
                onClick={handleVerify}
                disabled={isVerifying || !apiKey.trim()}
                className="apple-btn-secondary py-2 px-4 text-xs font-medium flex items-center gap-1.5 shrink-0 disabled:opacity-50 min-h-[38px]"
              >
                <Zap className={`size-3.5 text-[#0066cc] dark:text-[#2997ff] ${isVerifying ? "animate-spin" : ""}`} />
                <span>{isVerifying ? "Verificando..." : "Verificar"}</span>
              </button>
            </div>

            {errorMessage && (
              <div className="mt-2 text-xs text-[#ff453a] flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Step 2: Channel Selection */}
          {channels.length > 0 && (
            <div className="p-4 sm:p-5 rounded-[20px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08]">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b] block mb-3">
                2. Canal Social de Destino
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {channels.map((chan) => {
                  const isSelected = selectedChannelId === chan.id;
                  return (
                    <div
                      key={chan.id}
                      onClick={() => setSelectedChannelId(chan.id)}
                      className={`p-3 rounded-[16px] border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#0066cc]/10 border-[#0066cc] text-[#0066cc] dark:text-[#2997ff]"
                          : "bg-white/80 dark:bg-white/5 border-black/10 dark:border-white/10 hover:border-black/20 text-[#1d1d1f] dark:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {chan.avatar ? (
                          <img
                            src={chan.avatar}
                            alt={chan.name}
                            className="size-7 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="size-7 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">
                            {chan.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="font-semibold text-xs truncate">{chan.name}</div>
                          <div className="text-[10px] uppercase font-mono text-[#6e6e73] dark:text-[#86868b]">
                            {chan.service}
                          </div>
                        </div>
                      </div>

                      {isSelected && <Check className="size-4 shrink-0 text-[#0066cc] dark:text-[#2997ff]" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Auto-Publishing Automation & Mode */}
          <div className="p-4 sm:p-5 rounded-[20px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-sm text-[#1d1d1f] dark:text-white flex items-center gap-2">
                  <Sparkles className="size-4 text-[#0066cc] dark:text-[#2997ff]" />
                  <span>Publicación Automática</span>
                </div>
                <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                  Publica automáticamente al detectar momentos con score de valor educativo ≥ 70/100.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPublish}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-black/20 peer-focus:outline-none rounded-full peer dark:bg-white/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#30d158]"></div>
              </label>
            </div>

            {/* Publishing Mode */}
            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b] block mb-2">
                Modo de Programación en Buffer
              </label>

              <div className="apple-segmented-track grid grid-cols-3 p-1">
                {[
                  { id: "addToQueue", label: "Añadir a la Cola" },
                  { id: "next", label: "Siguiente en Cola" },
                  { id: "now", label: "Publicar Ahora" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setPublishMode(mode.id as any)}
                    className={`py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                      publishMode === mode.id
                        ? "apple-segmented-thumb-active"
                        : "text-[#6e6e73] dark:text-[#86868b]"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
            {settings?.apiKey ? (
              <button
                onClick={handleDisconnect}
                className="apple-btn-secondary text-xs py-2 px-3.5 text-[#ff453a] hover:bg-[#ff453a]/10 flex items-center gap-1.5 min-h-[38px]"
              >
                <Trash2 className="size-3.5" />
                <span>Desconectar</span>
              </button>
            ) : (
              <div className="text-xs text-[#6e6e73] flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-[#30d158]" />
                <span>Tu API Key se almacena de forma segura</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="apple-btn-secondary text-xs py-2 px-4 min-h-[38px]"
              >
                Cerrar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !apiKey.trim()}
                className="apple-btn-primary text-xs py-2 px-5 min-h-[38px] flex items-center gap-1.5"
              >
                <Check className="size-3.5" />
                <span>{isSaving ? "Guardando..." : "Guardar Cambios"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
