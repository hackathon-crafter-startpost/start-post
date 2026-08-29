/* Hallmark · Apple Design Authority & Creation Studio */
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@hackathon-craft-station/backend/convex/_generated/api";
import { SocialPostCard, HyperFramesPlayer } from "@hackathon-craft-station/image-renderer";
import type { ImageManifest } from "@hackathon-craft-station/shared-types";
import { toBlob } from "html-to-image";
import { toast } from "sonner";
import { BufferIntegrationModal } from "@/components/buffer-integration-modal";
import {
  Copy,
  Download,
  Check,
  ShieldCheck,
  Zap,
  Terminal,
  FileCode,
  Flame,
  ThumbsUp,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  ArrowUpRight,
  Activity,
  Layers,
  Film,
  Cpu,
  RefreshCw,
  ArrowLeft,
  SlidersHorizontal,
  Sparkles,
  Play,
  Share2,
  Send,
  Clock3,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const moments = useQuery(api.moments.list, { limit: 50 });
  const bufferSettings = useQuery(api.buffer.getSettings, {});
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"post" | "video" | "card" | "evidence">("post");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [mobileSection, setMobileSection] = useState<"feed" | "studio">("feed");

  // Post editor state
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editedHook, setEditedHook] = useState("");
  const [editedBody, setEditedBody] = useState("");

  // Buffer integration state
  const [isBufferModalOpen, setIsBufferModalOpen] = useState(false);
  const [isPublishingBuffer, setIsPublishingBuffer] = useState(false);
  const [showBufferMenu, setShowBufferMenu] = useState(false);

  // Visual card customizer state (Apple HIG Palette)
  const [customAuthor, setCustomAuthor] = useState("Diego");
  const [customAccent, setCustomAccent] = useState("#0066cc");
  const [customTemplate, setCustomTemplate] = useState<"bug-fix" | "lesson" | "before-after">("bug-fix");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const saveAsset = useMutation(api.assets.saveAsset);
  const registerFeedback = useMutation(api.feedback.register);
  const updatePostDraft = useMutation(api.generation.updatePostDraft);
  const analyzeWithGemini = useAction(api.generation.analyzeWithGoogleGemini);
  const publishToBuffer = useAction(api.buffer.publishPost);
  const createBufferIdea = useAction(api.buffer.createIdea);


  const handleGenerateWithGemini = async () => {
    if (!activeMoment?.sessionId) return;
    try {
      setIsGeneratingAi(true);
      toast.info("Sintetizando narrativa técnica con Gemini 2.5 Flash...");
      const res = await analyzeWithGemini({ sessionId: activeMoment.sessionId });
      toast.success("¡Síntesis completada con éxito!", {
        description:
          res.source === "gemini_ai"
            ? "Narrativa, tarjeta 1080x1350 y video HyperFrames sincronizados."
            : "Análisis completado.",
      });
    } catch (err: any) {
      toast.error("Error al sintetizar: " + (err?.message || ""));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Filter moments
  const filteredMoments = useMemo(() => {
    if (!moments) return [];
    return moments.filter((m: any) => {
      const matchesCategory =
        selectedCategory === "all" || m.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.lesson.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [moments, selectedCategory, searchQuery]);

  // Pick active moment or first available
  const activeMoment =
    filteredMoments.find((m: any) => m._id === selectedMomentId) ||
    filteredMoments[0] ||
    moments?.[0];


  const handleSelectMoment = (id: string) => {
    setSelectedMomentId(id);
    setIsEditingPost(false);
    setMobileSection("studio");
  };

  const handleCopyPost = async () => {
    if (!activeMoment?.postDraft) return;
    const fullText = `${activeMoment.postDraft.hook}\n\n${activeMoment.postDraft.body}\n\n${activeMoment.postDraft.hashtags.join(" ")}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success("Publicación copiada al portapapeles", {
        description: "Lista para publicar en LinkedIn o redes sociales.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar automáticamente");
    }
  };

  const handleStartEdit = () => {
    if (!activeMoment?.postDraft) return;
    setEditedHook(activeMoment.postDraft.hook);
    setEditedBody(activeMoment.postDraft.body);
    setIsEditingPost(true);
  };

  const handleSavePost = async () => {
    if (!activeMoment?.postDraft) return;
    try {
      await updatePostDraft({
        postDraftId: activeMoment.postDraft._id,
        hook: editedHook || activeMoment.postDraft.hook,
        body: editedBody || activeMoment.postDraft.body,
        hashtags: activeMoment.postDraft.hashtags,
        imageManifest: activeMoment.postDraft.imageManifest,
      });
      setIsEditingPost(false);
      toast.success("Publicación actualizada con éxito");
    } catch (err: any) {
      toast.error("Error al actualizar: " + (err?.message || ""));
    }
  };

  const handleDownloadPNG = async () => {
    const cardEl = document.getElementById("social-post-card");
    if (!cardEl) {
      toast.error("No se encontró el elemento visual de la tarjeta");
      return;
    }

    try {
      setIsExporting(true);
      toast.info("Renderizando tarjeta en alta resolución 1080×1350...");

      const blob = await toBlob(cardEl, {
        pixelRatio: 2,
        quality: 0.95,
        backgroundColor: "#18181b",
      });

      if (!blob) throw new Error("No se pudo generar la imagen");

      const filename = `buildsignal-card-${activeMoment?._id || "export"}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("¡Tarjeta descargada con éxito!", {
        description: "1080 × 1350 px (4:5) optimizada para LinkedIn.",
      });

      if (activeMoment?.postDraft?._id) {
        try {
          const uploadUrl = await generateUploadUrl();
          const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "image/png" },
            body: blob,
          });
          const { storageId } = await uploadRes.json();

          await saveAsset({
            postDraftId: activeMoment.postDraft._id,
            storageId,
            format: "png_1080x1350",
            width: 1080,
            height: 1350,
          });
        } catch {
          // background sync error
        }
      }
    } catch (err: any) {
      toast.error("Error al exportar: " + (err?.message || ""));
    } finally {
      setIsExporting(false);
    }
  };

  const handleApprove = async () => {
    if (!activeMoment?._id) return;
    try {
      await registerFeedback({
        momentId: activeMoment._id,
        action: "copied",
      });
      toast.success("Momento marcado como aprobado");
    } catch {
      toast.error("No se pudo registrar feedback");
    }
  };

  const handleDiscard = async () => {
    if (!activeMoment?._id) return;
    try {
      await registerFeedback({
        momentId: activeMoment._id,
        action: "discarded",
      });
      toast.info("Momento descartado");
    } catch {
      toast.error("No se pudo registrar feedback");
    }
  };

  const handlePublishToBuffer = async (mode: "addToQueue" | "now" | "idea") => {
    if (!activeMoment?._id) return;
    if (!bufferSettings?.apiKey) {
      toast.info("Abre la configuración de Buffer para conectar tu cuenta.");
      setIsBufferModalOpen(true);
      return;
    }


    try {
      setIsPublishingBuffer(true);
      setShowBufferMenu(false);

      if (mode === "idea") {
        toast.info("Creando Idea en Buffer...");
        const res = await createBufferIdea({
          momentId: activeMoment._id,
        });
        if (res.success) {
          toast.success("¡Idea creada en Buffer!", {
            description: "Añadida a tu banco de ideas en Buffer.",
          });
        } else {
          toast.error(res.error || "Error al crear la idea en Buffer");
        }
      } else {
        toast.info(
          mode === "now"
            ? "Publicando directamente a Buffer..."
            : "Añadiendo a la cola de Buffer..."
        );
        const res = await publishToBuffer({
          momentId: activeMoment._id,
          postDraftId: activeMoment.postDraft?._id,
          modeOverride: mode,
        });
        if (res.success) {
          toast.success(
            mode === "now"
              ? "¡Publicado en Buffer exitosamente!"
              : "¡Añadido a la cola de Buffer con éxito!",
            {
              description: `Canal: ${res.channelName || bufferSettings.channelName || "Canal configurado"}.`,
            }
          );
        } else {
          toast.error(res.error || "Error al publicar en Buffer");
        }
      }
    } catch (err: any) {
      toast.error("Error al conectar con Buffer: " + (err?.message || ""));
    } finally {
      setIsPublishingBuffer(false);
    }
  };

  // Merged image manifest
  const activeManifest: ImageManifest = {
    template: customTemplate,
    headline: activeMoment?.title || "Momento de Código Verificado",
    eyebrow: "LECCIÓN TÉCNICA",
    problem: activeMoment?.problem || "Problema observado durante la sesión.",
    codeBefore: activeMoment?.postDraft?.imageManifest?.codeBefore,
    codeAfter: activeMoment?.postDraft?.imageManifest?.codeAfter,
    result: activeMoment?.postDraft?.imageManifest?.result || "Tests 100% Passing",
    takeaway: activeMoment?.lesson || "Lección aprendida en la sesión.",
    accentColor: customAccent,
    authorName: customAuthor,
    category: activeMoment?.category || "bug_fix",
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors duration-300 pb-32">
      {/* Apple Hero Showcase Tile */}
      <section className="relative pt-12 sm:pt-16 pb-10 sm:pb-14 border-b border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
        <div className="container mx-auto px-4 sm:px-8 relative z-10">
          <div className="max-w-3xl">
            {/* Apple Frosted Pill Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full apple-acrylic-bar text-[12px] font-medium text-[#0066cc] dark:text-[#2997ff] mb-4 shadow-sm">
              <span className="size-2 rounded-full bg-[#30d158] animate-pulse" />
              <span>Observabilidad Creativa • HyperFrames, Gemini 2.5 & Buffer API</span>
            </div>

            {/* SF Pro Display Hero Headline (Apple 56px tight tracking) */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-[#1d1d1f] dark:text-white leading-[1.15]">
              Transforma tu código real en contenido interactivo y tarjetas de alto impacto.
            </h1>

            <p className="text-[15px] sm:text-[17px] text-[#6e6e73] dark:text-[#86868b] mt-3.5 leading-relaxed font-normal">
              Captura pasiva con Claude Code y Codex. Detección determinista de valor educativo, síntesis narrativa con Google Gemini, video HyperFrames y auto-publicación a Buffer.
            </p>

            {/* Top Action Pills */}
            <div className="flex flex-wrap items-center gap-3.5 mt-6">
              <Link
                href="/dashboard"
                className="apple-btn-secondary text-[14px]"
              >
                <Activity className="size-3.5 text-[#0066cc] dark:text-[#2997ff]" />
                <span>Telemetría en Vivo</span>
              </Link>

              <button
                onClick={() => setIsBufferModalOpen(true)}
                className="apple-btn-secondary text-[14px] flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="size-3.5 text-[#0066cc] dark:text-[#2997ff]" />
                <span>
                  {bufferSettings?.apiKey
                    ? `Buffer: ${bufferSettings.channelName || "Conectado"}`
                    : "Integrar Buffer"}
                </span>
                {bufferSettings?.autoPublish && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] font-mono">
                    Auto
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* Main Studio Container */}
      <main className="container mx-auto px-4 sm:px-8 pt-8 sm:pt-10">
        {/* Metric Bar: 4 Apple Acrylic Glass Cards (VisionOS Style) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
          <div className="apple-acrylic-card p-4 sm:p-5">
            <span className="text-[11px] sm:text-[12px] font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
              Momentos Detectados
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] dark:text-white mt-1">
              {moments?.length || 0}
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#30d158] font-medium mt-1 inline-block">
              En tiempo real
            </span>
          </div>

          <div className="apple-acrylic-card p-4 sm:p-5">
            <span className="text-[11px] sm:text-[12px] font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
              Score Promedio
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] dark:text-white mt-1">
              88/100
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#0066cc] dark:text-[#2997ff] font-medium mt-1 inline-block">
              Umbral &gt; 70 superado
            </span>
          </div>

          <div className="apple-acrylic-card p-4 sm:p-5">
            <span className="text-[11px] sm:text-[12px] font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
              Zero-Leak Engine
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-[#30d158] mt-1 flex items-center gap-1.5">
              <ShieldCheck className="size-5 sm:size-6 text-[#30d158]" />
              <span>100%</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#6e6e73] dark:text-[#86868b] mt-1 inline-block">
              Secretos Redactados
            </span>
          </div>

          <div className="apple-acrylic-card p-4 sm:p-5">
            <span className="text-[11px] sm:text-[12px] font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
              HyperFrames & IA
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-[#0066cc] dark:text-[#2997ff] mt-1">
              Activo
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#6e6e73] dark:text-[#86868b] mt-1 inline-block">
              Gemini 2.5 Flash
            </span>
          </div>
        </div>

        {/* Mobile View Switcher (Visible only on screens < lg) */}
        {moments && moments.length > 0 && (
          <div className="lg:hidden mb-6 flex justify-center">
            <div className="apple-segmented-track w-full max-w-sm grid grid-cols-2 p-1">
              <button
                onClick={() => setMobileSection("feed")}
                className={`py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  mobileSection === "feed"
                    ? "apple-segmented-thumb-active"
                    : "text-[#6e6e73] dark:text-[#86868b]"
                }`}
              >
                Feed de Momentos ({filteredMoments.length})
              </button>
              <button
                onClick={() => setMobileSection("studio")}
                className={`py-2 text-xs font-semibold rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mobileSection === "studio"
                    ? "apple-segmented-thumb-active text-[#0066cc] dark:text-[#2997ff]"
                    : "text-[#6e6e73] dark:text-[#86868b]"
                }`}
              >
                <span>Estudio de Creación</span>
              </button>
            </div>
          </div>
        )}

        {/* Studio Workspace Layout */}
        {!moments || moments.length === 0 ? (
          /* Apple Empty State */
          <div className="apple-acrylic-card p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-2xl mx-auto my-8 sm:my-12">
            <div className="size-14 sm:size-16 rounded-full bg-[#0066cc]/10 text-[#0066cc] dark:text-[#2997ff] flex items-center justify-center mb-5">
              <Terminal className="size-7 sm:size-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] dark:text-white tracking-tight font-sans">
              Esperando Eventos de tu Agente
            </h2>
            <p className="text-[#6e6e73] dark:text-[#86868b] text-[14px] sm:text-[15px] mt-2 max-w-md">
              Conecta los hooks en Claude Code o Codex para que BuildSignal capture tus sesiones de desarrollo con garantía Zero-Leak.
            </p>
            <div className="mt-6 p-4 rounded-[16px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 font-mono text-xs text-left max-w-md w-full">
              <div className="text-[#6e6e73] dark:text-[#86868b] mb-1.5"># Para enviar una prueba simulada desde tu terminal:</div>
              <div className="text-[#0066cc] dark:text-[#2997ff] font-semibold">pnpm buildsignal simulate</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN: Feed of Moments (5 Cols) */}
            <div
              className={`lg:col-span-5 flex flex-col gap-4 ${
                mobileSection === "studio" ? "hidden lg:flex" : "flex"
              }`}
            >
              {/* Segmented Category Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="apple-segmented-track overflow-x-auto py-1 max-w-full">
                  {["all", "bug_fix", "lesson", "performance", "architecture"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 text-[12px] font-medium capitalize transition-all cursor-pointer whitespace-nowrap ${
                        selectedCategory === cat
                          ? "apple-segmented-thumb-active"
                          : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
                      }`}
                    >
                      {cat === "all" ? "Todos" : cat.replace("_", " ")}
                    </button>
                  ))}
                </div>

                {/* Capsule Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#6e6e73] dark:text-[#86868b]" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="apple-input-capsule pl-8 pr-3 py-1 text-xs w-full sm:w-36"
                  />
                </div>
              </div>

              {/* Moments List */}
              <div className="flex flex-col gap-3.5 max-h-[750px] overflow-y-auto pr-1">
                {filteredMoments.map((m: any) => {
                  const isSelected = activeMoment?._id === m._id;
                  const isHighValue = m.score >= 70;


                  return (
                    <div
                      key={m._id}
                      onClick={() => handleSelectMoment(m._id)}
                      className={`apple-acrylic-card p-4 sm:p-5 transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-[#0066cc] dark:ring-[#2997ff] scale-[1.01]"
                          : "hover:scale-[1.005]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold uppercase ${
                              isHighValue
                                ? "bg-[#0066cc] text-white"
                                : "bg-black/5 dark:bg-white/10 text-[#6e6e73] dark:text-white"
                            }`}
                          >
                            #{m.category}
                          </span>
                          <span className="text-[11px] sm:text-[12px] text-[#6e6e73] dark:text-[#86868b] font-mono">
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Value Score Pill */}
                        <div className="flex items-center gap-1 px-2.5 sm:px-3 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[11px] sm:text-[12px] font-semibold text-[#1d1d1f] dark:text-white">
                          <Flame className="size-3 text-[#0066cc] dark:text-[#2997ff]" />
                          <span>{m.score}/100</span>
                        </div>
                      </div>

                      <h3 className="font-semibold text-[15px] sm:text-[17px] text-[#1d1d1f] dark:text-white mt-2.5 leading-snug tracking-tight font-sans">
                        {m.title}
                      </h3>

                      <p className="text-[13px] sm:text-[14px] text-[#6e6e73] dark:text-[#86868b] line-clamp-2 mt-1.5 leading-relaxed">
                        {m.problem}
                      </p>

                      {/* Score breakdown metrics */}
                      {m.scoreBreakdown && (
                        <div className="grid grid-cols-5 gap-1 mt-3.5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-[9px] sm:text-[10px] text-[#6e6e73] dark:text-[#86868b] font-mono">
                          <div>P: {m.scoreBreakdown.problem}</div>
                          <div>L: {m.scoreBreakdown.lesson}</div>
                          <div>R: {m.scoreBreakdown.reuse}</div>
                          <div>E: {m.scoreBreakdown.evidence}</div>
                          <div>C: {m.scoreBreakdown.clarity}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: Apple Studio Workspace (7 Cols) */}
            <div
              className={`lg:col-span-7 flex flex-col gap-4 lg:sticky lg:top-24 ${
                mobileSection === "feed" ? "hidden lg:flex" : "flex"
              }`}
            >
              {/* Mobile Back Button */}
              <div className="lg:hidden flex items-center justify-between pb-2">
                <button
                  onClick={() => setMobileSection("feed")}
                  className="apple-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Volver a la lista de momentos</span>
                </button>
              </div>

              {activeMoment ? (
                <div className="apple-acrylic-card p-5 sm:p-8">
                  {/* Studio Header & Segmented Tab Switcher */}
                  <div className="flex flex-col gap-4 pb-5 sm:pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] sm:text-[12px] font-semibold uppercase text-[#0066cc] dark:text-[#2997ff]">
                            Estudio de Creación
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-mono bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full text-[#6e6e73] dark:text-[#86868b]">
                            ID: {activeMoment._id.slice(0, 8)}
                          </span>
                        </div>
                        <h2 className="text-[18px] sm:text-[22px] font-semibold text-[#1d1d1f] dark:text-white mt-1 line-clamp-1 tracking-tight font-sans">
                          {activeMoment.title}
                        </h2>
                      </div>
                    </div>

                    {/* 4 Segmented Tabs: Post | HyperFrames | Tarjeta 4:5 | Evidencia */}
                    <div className="apple-segmented-track w-full grid grid-cols-2 sm:grid-cols-4 gap-1 p-1">
                      <button
                        onClick={() => setActiveTab("post")}
                        className={`py-2 px-2 text-[12px] font-medium transition-all cursor-pointer text-center rounded-full ${
                          activeTab === "post"
                            ? "apple-segmented-thumb-active"
                            : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
                        }`}
                      >
                        Post Escrito
                      </button>
                      <button
                        onClick={() => setActiveTab("video")}
                        className={`py-2 px-2 text-[12px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1 rounded-full ${
                          activeTab === "video"
                            ? "apple-segmented-thumb-active"
                            : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
                        }`}
                      >
                        <Film className="size-3" />
                        <span>HyperFrames</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("card")}
                        className={`py-2 px-2 text-[12px] font-medium transition-all cursor-pointer text-center rounded-full ${
                          activeTab === "card"
                            ? "apple-segmented-thumb-active"
                            : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
                        }`}
                      >
                        Tarjeta 4:5
                      </button>
                      <button
                        onClick={() => setActiveTab("evidence")}
                        className={`py-2 px-2 text-[12px] font-medium transition-all cursor-pointer text-center rounded-full ${
                          activeTab === "evidence"
                            ? "apple-segmented-thumb-active"
                            : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
                        }`}
                      >
                        Evidencia
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: LinkedIn Post Studio */}
                  {activeTab === "post" && (
                    <div className="mt-5 sm:mt-6 flex flex-col gap-4">
                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] sm:text-[14px] font-semibold text-[#1d1d1f] dark:text-white">
                            Historia Optimizada para Redes
                          </span>
                          {activeMoment.postDraft?.bufferStatus && (
                            <span
                              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                                activeMoment.postDraft.bufferStatus === "queued"
                                  ? "bg-[#0066cc]/10 text-[#0066cc] dark:text-[#2997ff] border border-[#0066cc]/20"
                                  : activeMoment.postDraft.bufferStatus === "published"
                                  ? "bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20"
                                  : "bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20"
                              }`}
                            >
                              <Share2 className="size-2.5" />
                              <span>
                                {activeMoment.postDraft.bufferStatus === "queued"
                                  ? "En Cola de Buffer"
                                  : activeMoment.postDraft.bufferStatus === "published"
                                  ? "Publicado en Buffer"
                                  : "Buffer Error"}
                              </span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isEditingPost ? (
                            <>
                              <button
                                onClick={handleSavePost}
                                className="apple-btn-primary text-[13px] py-1.5 px-3.5 min-h-[36px]"
                              >
                                <Check className="size-3.5" />
                                <span>Guardar</span>
                              </button>
                              <button
                                onClick={() => setIsEditingPost(false)}
                                className="apple-btn-secondary text-[13px] py-1.5 px-3.5 min-h-[36px]"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={handleGenerateWithGemini}
                                disabled={isGeneratingAi}
                                className="apple-btn-secondary text-[12px] sm:text-[13px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px]"
                                title="Sintetizar y optimizar la narrativa con Google Gemini 2.5 Flash"
                              >
                                <Zap className={`size-3.5 text-[#0066cc] dark:text-[#2997ff] ${isGeneratingAi ? "animate-spin" : ""}`} />
                                <span>{isGeneratingAi ? "Sintetizando..." : "Gemini 2.5"}</span>
                              </button>
                              <button
                                onClick={handleStartEdit}
                                className="apple-btn-secondary text-[12px] sm:text-[13px] py-1.5 px-3 min-h-[36px]"
                              >
                                <Edit3 className="size-3.5 mr-1" />
                                <span>Editar</span>
                              </button>

                              {/* Buffer Quick Publish Menu */}
                              <div className="relative">
                                <div className="inline-flex rounded-full overflow-hidden shadow-sm">
                                  <button
                                    onClick={() => handlePublishToBuffer("addToQueue")}
                                    disabled={isPublishingBuffer}
                                    className="apple-btn-secondary text-[12px] sm:text-[13px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px] rounded-r-none border-r-0"
                                    title={`Publicar en Buffer (${bufferSettings?.channelName || "Configurar"})`}
                                  >
                                    <Share2 className={`size-3.5 text-[#0066cc] dark:text-[#2997ff] ${isPublishingBuffer ? "animate-spin" : ""}`} />
                                    <span>{isPublishingBuffer ? "Enviando..." : "Buffer"}</span>
                                  </button>
                                  <button
                                    onClick={() => setShowBufferMenu((v) => !v)}
                                    disabled={isPublishingBuffer}
                                    className="apple-btn-secondary px-2 py-1.5 text-xs flex items-center justify-center cursor-pointer rounded-l-none min-h-[36px]"
                                  >
                                    <ChevronDown className="size-3" />
                                  </button>
                                </div>

                                {showBufferMenu && (
                                  <div className="absolute right-0 top-full mt-2 w-56 p-1.5 rounded-[18px] apple-acrylic-card border border-black/10 dark:border-white/15 shadow-xl z-30 flex flex-col gap-1 text-xs">
                                    <button
                                      onClick={() => handlePublishToBuffer("addToQueue")}
                                      className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-[#1d1d1f] dark:text-white cursor-pointer"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Clock3 className="size-3.5 text-[#0066cc] dark:text-[#2997ff]" />
                                        <span>Añadir a la Cola</span>
                                      </span>
                                      <span className="text-[10px] text-[#86868b] font-mono">Queue</span>
                                    </button>
                                    <button
                                      onClick={() => handlePublishToBuffer("now")}
                                      className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-[#1d1d1f] dark:text-white cursor-pointer"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Send className="size-3.5 text-[#30d158]" />
                                        <span>Publicar Ahora</span>
                                      </span>
                                      <span className="text-[10px] text-[#86868b] font-mono">Now</span>
                                    </button>
                                    <button
                                      onClick={() => handlePublishToBuffer("idea")}
                                      className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-[#1d1d1f] dark:text-white cursor-pointer"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Sparkles className="size-3.5 text-[#ff9f0a]" />
                                        <span>Guardar como Idea</span>
                                      </span>
                                      <span className="text-[10px] text-[#86868b] font-mono">Idea</span>
                                    </button>
                                    <div className="h-px bg-black/5 dark:bg-white/10 my-0.5" />
                                    <button
                                      onClick={() => {
                                        setShowBufferMenu(false);
                                        setIsBufferModalOpen(true);
                                      }}
                                      className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 text-[#0066cc] dark:text-[#2997ff] cursor-pointer"
                                    >
                                      <SlidersHorizontal className="size-3.5" />
                                      <span>Configurar Buffer</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={handleCopyPost}
                                className="apple-btn-primary text-[12px] sm:text-[13px] py-1.5 px-4 min-h-[36px]"
                              >
                                {copied ? (
                                  <>
                                    <Check className="size-3.5" />
                                    <span>¡Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="size-3.5" />
                                    <span>Copiar Post</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>


                      {/* Post Content Box */}
                      {isEditingPost ? (
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="text-[11px] uppercase font-semibold text-[#6e6e73] dark:text-[#86868b]">
                              Hook Inicial
                            </label>
                            <input
                              type="text"
                              value={editedHook}
                              onChange={(e) => setEditedHook(e.target.value)}
                              className="apple-input-capsule w-full mt-1 text-xs sm:text-sm py-2 px-3"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] uppercase font-semibold text-[#6e6e73] dark:text-[#86868b]">
                              Cuerpo de la Publicación
                            </label>
                            <textarea
                              rows={10}
                              value={editedBody}
                              onChange={(e) => setEditedBody(e.target.value)}
                              className="w-full mt-1 p-3.5 rounded-[16px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.1] text-xs sm:text-sm text-[#1d1d1f] dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 sm:p-6 rounded-[18px] sm:rounded-[20px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] text-[14px] sm:text-[15px] leading-relaxed flex flex-col gap-4 text-[#1d1d1f] dark:text-white">
                          <p className="font-semibold text-[#0066cc] dark:text-[#2997ff] text-[15px] sm:text-[16px]">
                            {activeMoment.postDraft?.hook || "¿Te ha pasado esto al programar? 👇"}
                          </p>
                          <div className="whitespace-pre-line text-[#3a3a3c] dark:text-[#d1d1d6] text-xs sm:text-sm leading-relaxed">
                            {activeMoment.postDraft?.body || activeMoment.problem}
                          </div>
                          {activeMoment.postDraft?.hashtags && (
                            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px] sm:text-xs font-mono text-[#0066cc] dark:text-[#2997ff]">
                              {activeMoment.postDraft.hashtags.map((tag: string, i: number) => (
                                <span key={i}>{tag}</span>
                              ))}
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: HyperFrames Interactive Motion Studio */}
                  {activeTab === "video" && (
                    <div className="mt-5 sm:mt-6 flex flex-col items-center">
                      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                        <div>
                          <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#1d1d1f] dark:text-white">
                            Video Interactivo HyperFrames
                          </h3>
                          <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                            Composición HTML seekable con diff animado y lección técnica.
                          </p>
                        </div>

                        <button
                          onClick={handleGenerateWithGemini}
                          disabled={isGeneratingAi}
                          className="apple-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 min-h-[34px]"
                        >
                          <Zap className="size-3.5 text-[#0066cc] dark:text-[#2997ff]" />
                          <span>Re-sintetizar con Gemini</span>
                        </button>
                      </div>

                      {/* Interactive HyperFrames Player */}
                      <HyperFramesPlayer
                        manifest={activeManifest}
                        authorName={customAuthor}
                        accentColor={customAccent}
                      />
                    </div>
                  )}

                  {/* TAB 3: 4:5 Image Studio (Apple Pedestal) */}
                  {activeTab === "card" && (
                    <div className="mt-5 sm:mt-6 flex flex-col items-center gap-6">
                      {/* Floating Apple Acrylic Palette Bar */}
                      <div className="apple-acrylic-bar p-2 px-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 w-full max-w-lg">
                        {/* Accent Colors */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-[#6e6e73] dark:text-[#86868b]">
                            Color:
                          </span>
                          {["#0066cc", "#30d158", "#ff9f0a", "#bf5af2", "#ff375f"].map((c) => (
                            <button
                              key={c}
                              onClick={() => setCustomAccent(c)}
                              style={{ backgroundColor: c }}
                              className={`size-4 sm:size-5 rounded-full transition-transform cursor-pointer ${
                                customAccent === c ? "scale-125 ring-2 ring-white" : "hover:scale-110"
                              }`}
                            />
                          ))}
                        </div>

                        {/* Author name input */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-[#6e6e73] dark:text-[#86868b]">
                            Autor:
                          </span>
                          <input
                            type="text"
                            value={customAuthor}
                            onChange={(e) => setCustomAuthor(e.target.value)}
                            className="apple-input-capsule text-xs py-0.5 px-2.5 w-20 sm:w-24"
                          />
                        </div>

                        {/* Download CTA */}
                        <button
                          onClick={handleDownloadPNG}
                          disabled={isExporting}
                          className="apple-btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5 min-h-[34px]"
                        >
                          <Download className="size-3.5" />
                          <span>{isExporting ? "Generando..." : "Descargar PNG"}</span>
                        </button>
                      </div>

                      {/* Card Preview on Apple Pedestal with Signature Drop-Shadow */}
                      <div className="w-full p-2 sm:p-4 rounded-[24px] sm:rounded-[28px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center overflow-x-auto">
                        <div className="apple-product-elevation rounded-[20px] sm:rounded-[24px] overflow-hidden my-2">
                          <SocialPostCard
                            manifest={activeManifest}
                            scale={0.38}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Technical Evidence & Diff */}
                  {activeTab === "evidence" && (
                    <div className="mt-5 sm:mt-6 flex flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[13px] sm:text-[14px] font-semibold text-[#1d1d1f] dark:text-white">
                          Evidencia de Depuración Sanitizada
                        </span>
                        <span className="text-xs font-mono text-[#30d158] bg-[#30d158]/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5" />
                          <span>Zero-Leak Audit Passed</span>
                        </span>
                      </div>

                      {/* Code Diff Display */}
                      <div className="p-4 sm:p-5 rounded-[16px] sm:rounded-[18px] bg-[#18181a] border border-white/10 font-mono text-xs text-white overflow-x-auto">
                        <div className="text-[#86868b] pb-2 mb-3 border-b border-white/10 flex justify-between">
                          <span>diff --git a/source.ts b/source.ts</span>
                          <span className="text-[#30d158]">Tests: 100% Passing</span>
                        </div>
                        {activeManifest.codeBefore && (
                          <div className="p-2.5 rounded bg-[#ff453a]/15 text-[#ff9b9b] border-l-4 border-[#ff453a] mb-2 overflow-x-auto">
                            - {activeManifest.codeBefore}
                          </div>
                        )}
                        {activeManifest.codeAfter && (
                          <div className="p-2.5 rounded bg-[#30d158]/15 text-[#a8f5ba] border-l-4 border-[#30d158] overflow-x-auto">
                            + {activeManifest.codeAfter}
                          </div>
                        )}
                      </div>

                      {/* Feedback buttons */}
                      <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                        <button
                          onClick={handleDiscard}
                          className="apple-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-[#ff453a] min-h-[36px]"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Descartar</span>
                        </button>
                        <button
                          onClick={handleApprove}
                          className="apple-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-[#30d158] min-h-[36px]"
                        >
                          <ThumbsUp className="size-3.5" />
                          <span>Aprobar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>

      {/* Buffer Integration Modal */}
      <BufferIntegrationModal
        isOpen={isBufferModalOpen}
        onClose={() => setIsBufferModalOpen(false)}
      />
    </div>
  );
}

