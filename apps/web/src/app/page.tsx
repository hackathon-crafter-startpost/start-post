"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@hackathon-craft-station/backend/convex/_generated/api";
import { SocialPostCard } from "@hackathon-craft-station/image-renderer";
import type { ImageManifest } from "@hackathon-craft-station/shared-types";
import { toBlob } from "html-to-image";
import { toast } from "sonner";
import {
  Sparkles,
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
  Share2,
} from "lucide-react";

export default function DashboardPage() {
  const moments = useQuery(api.moments.list, { limit: 50 });
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"post" | "card" | "evidence">("post");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Post editor state
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editedHook, setEditedHook] = useState("");
  const [editedBody, setEditedBody] = useState("");

  // Visual card customizer state (Apple HIG Palette)
  const [customAuthor, setCustomAuthor] = useState("Diego");
  const [customAccent, setCustomAccent] = useState("#2997ff");
  const [customTemplate, setCustomTemplate] = useState("bug-fix");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const saveAsset = useMutation(api.assets.saveAsset);
  const registerFeedback = useMutation(api.feedback.register);
  const updatePostDraft = useMutation(api.generation.updatePostDraft);
  const seedDemo = useMutation(api.demo.seedOratoriaDemoSession);
  const analyzeWithGemini = useAction(api.generation.analyzeWithGoogleGemini);

  const handleGenerateWithGemini = async () => {
    if (!activeMoment?.sessionId) return;
    try {
      setIsGeneratingAi(true);
      toast.info("Generando publicación y narrativa con Gemini 2.5 Flash...");
      const res = await analyzeWithGemini({ sessionId: activeMoment.sessionId });
      toast.success("¡Contenido generado exitosamente con Gemini AI!", {
        description: res.source === "gemini_ai" ? "Historia y tarjeta sintetizadas con IA." : "Análisis heurístico completado.",
      });
    } catch (err: any) {
      toast.error("Error al generar con Gemini: " + (err?.message || ""));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Filter moments
  const filteredMoments = useMemo(() => {
    if (!moments) return [];
    return moments.filter((m) => {
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
    filteredMoments.find((m) => m._id === selectedMomentId) ||
    filteredMoments[0] ||
    moments?.[0];

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
      toast.error("No se encontró el elemento visual");
      return;
    }

    try {
      setIsExporting(true);
      toast.info("Generando render de alta resolución (1080x1350)...");

      const blob = await toBlob(cardEl, {
        pixelRatio: 1,
        quality: 0.98,
      });

      if (!blob) throw new Error("Fallo al exportar blob de imagen");

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `buildsignal-${activeMoment?.category || "learning"}-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Imagen PNG (1080 × 1350) descargada con éxito");

      // Optional upload backup to Convex
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
            width: 1080,
            height: 1350,
            format: "image/png",
          });
        } catch {
          // Local download succeeded
        }
      }
    } catch (err: any) {
      toast.error("Error al exportar PNG: " + (err?.message || ""));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFeedback = async (action: "accept" | "discard") => {
    if (!activeMoment) return;
    try {
      await registerFeedback({
        momentId: activeMoment._id,
        action,
      });
      toast.success(
        action === "accept"
          ? "Momento guardado y validado"
          : "Momento descartado"
      );
    } catch (err: any) {
      toast.error("Error al registrar feedback: " + (err?.message || ""));
    }
  };

  // Safe image manifest fallback with Apple theme
  const currentManifest: ImageManifest = useMemo(() => {
    const templateName = (customTemplate as "bug-fix" | "lesson" | "before-after") || "bug-fix";
    if (activeMoment?.postDraft?.imageManifest) {
      return {
        ...activeMoment.postDraft.imageManifest,
        template: templateName,
        accentColor: customAccent,
        authorName: customAuthor,
      };
    }
    return {
      template: templateName,
      headline: activeMoment?.title || "El error de suavizado en Web Audio API",
      eyebrow: "LECCIÓN TÉCNICA",
      problem:
        activeMoment?.problem ||
        "El detector de muletillas arrojaba 40% de falsos positivos en grabaciones cortas.",
      codeBefore: "analyser.smoothingTimeConstant = 0.8; // default",
      codeAfter: "analyser.smoothingTimeConstant = 0.0; // fix",
      result: "Tests aprobados con 0.0% falsos positivos",
      takeaway:
        activeMoment?.lesson ||
        "Antes de culpar a tu algoritmo o modelo, audita el preprocesamiento por defecto de la API del navegador.",
      accentColor: customAccent,
      authorName: customAuthor,
      category: activeMoment?.category || "bug_fix",
    };
  }, [activeMoment, customAccent, customAuthor, customTemplate]);

  // Apple Material Color Choices
  const appleColorChoices = [
    { label: "Sky Blue", value: "#2997ff" },
    { label: "Action Blue", value: "#0071e3" },
    { label: "Titanium Gray", value: "#86868b" },
    { label: "Forest Green", value: "#30d158" },
    { label: "Crimson Red", value: "#ff453a" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] selection:bg-[#0071e3]/20 selection:text-[#0071e3] pb-32">
      {/* SECTION 1: Apple Hero Showcase Gallery Tile */}
      <section className="relative pt-20 pb-24 text-center overflow-hidden border-b border-black/[0.06] dark:border-white/[0.08]">
        {/* Subtle Ambient Radial Light (Apple VisionOS Light) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#0071e3]/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="container mx-auto px-4 max-w-4xl relative z-10">
          {/* Privacy Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full apple-acrylic-bar text-[13px] font-medium tracking-tight mb-6">
            <ShieldCheck className="size-4 text-[#0071e3] dark:text-[#2997ff]" />
            <span>Zero-Leak Local Privacy • 100% Filtrado en tu Máquina</span>
          </div>

          {/* Hero Headline in SF Pro Display (Negative Tracking) */}
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-[-0.03em] leading-[1.06] text-[#1d1d1f] dark:text-white max-w-3xl mx-auto">
            El código que creas.
            <br />
            <span className="text-[#0071e3] dark:text-[#2997ff]">
              La historia que compartes.
            </span>
          </h1>

          <p className="text-[19px] font-normal leading-[1.45] text-[#6e6e73] dark:text-[#86868b] mt-5 max-w-2xl mx-auto tracking-[-0.015em]">
            Observa de forma pasiva tus sesiones de desarrollo con Claude Code y Codex. Destila soluciones complejas y genera publicaciones e imágenes 4:5 de calidad editorial.
          </p>

          {/* Apple Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-9">
            <button
              onClick={() => seedDemo()}
              className="apple-btn-primary"
            >
              <span>Explorar Demo OratorIA</span>
              <ArrowUpRight className="size-4" />
            </button>
            <a
              href="#studio-section"
              className="apple-btn-secondary"
            >
              Ver Momentos Capturados
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 2: Apple Acrylic Metrics Strip */}
      <section className="py-12 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="container mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="apple-acrylic-card p-6 flex flex-col justify-between">
              <div className="text-[12px] font-mono font-medium text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider">
                Sesiones Observadas
              </div>
              <div className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f] dark:text-white mt-2 tracking-tight">
                {moments?.length || 0}
              </div>
            </div>

            <div className="apple-acrylic-card p-6 flex flex-col justify-between">
              <div className="text-[12px] font-mono font-medium text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider">
                Alto Valor Educativo
              </div>
              <div className="text-3xl sm:text-4xl font-semibold text-[#0071e3] dark:text-[#2997ff] mt-2 tracking-tight">
                {moments?.filter((m) => m.score >= 70).length || 0}
              </div>
            </div>

            <div className="apple-acrylic-card p-6 flex flex-col justify-between">
              <div className="text-[12px] font-mono font-medium text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider">
                Verificación Técnica
              </div>
              <div className="text-3xl sm:text-4xl font-semibold text-[#30d158] mt-2 tracking-tight">
                100%
              </div>
            </div>

            <div className="apple-acrylic-card p-6 flex flex-col justify-between">
              <div className="text-[12px] font-mono font-medium text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider">
                Secretos Filtrados
              </div>
              <div className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f] dark:text-white mt-2 tracking-tight">
                0
              </div>
            </div>
          </div>

          {/* Search & Apple Segmented Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
            {/* Apple Capsule Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-3 size-4 text-[#6e6e73] dark:text-[#86868b]" />
              <input
                type="text"
                placeholder="Buscar por bug o lección..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="apple-input-capsule w-full h-[42px] pl-11 pr-4 text-[14px]"
              />
            </div>

            {/* Apple Segmented Category Control */}
            <div className="apple-segmented-track overflow-x-auto max-w-full">
              {[
                { id: "all", label: "Todos" },
                { id: "bug_fix", label: "Bug Fixes" },
                { id: "lesson", label: "Lecciones" },
                { id: "performance", label: "Rendimiento" },
                { id: "architecture", label: "Arquitectura" },
              ].map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-1.5 text-[13px] font-medium tracking-tight whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? "apple-segmented-thumb-active"
                        : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Main Apple Studio Workspace */}
      <main id="studio-section" className="container mx-auto px-4 sm:px-8 pt-10">
        {(!moments || moments.length === 0) ? (
          /* Empty State in Acrylic Card */
          <div className="apple-acrylic-card p-16 text-center max-w-2xl mx-auto my-8">
            <div className="mx-auto size-16 rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-[#2997ff] flex items-center justify-center mb-5">
              <Sparkles className="size-8" />
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
              Esperando sesiones de desarrollo...
            </h3>
            <p className="text-[15px] text-[#6e6e73] dark:text-[#86868b] max-w-md mx-auto mt-2 leading-relaxed">
              Ejecuta tus agentes normalmente o prueba la simulación interactiva con un solo clic.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => seedDemo()}
                className="apple-btn-primary"
              >
                <span>Simular Sesión OratorIA</span>
              </button>
              <div className="rounded-full apple-acrylic-bar px-5 py-2 font-mono text-xs text-[#1d1d1f] dark:text-white">
                pnpm simulate
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Moments Feed (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                  Momentos Identificados ({filteredMoments.length})
                </span>
                <span className="text-[12px] text-[#0071e3] dark:text-[#2997ff] font-medium flex items-center gap-1">
                  <span className="size-2 rounded-full bg-[#30d158] animate-pulse" />
                  <span>En Vivo</span>
                </span>
              </div>

              <div className="flex flex-col gap-3.5 max-h-[780px] overflow-y-auto pr-1">
                {filteredMoments.map((m) => {
                  const isSelected = activeMoment?._id === m._id;
                  const isHighValue = m.score >= 70;

                  return (
                    <div
                      key={m._id}
                      onClick={() => {
                        setSelectedMomentId(m._id);
                        setIsEditingPost(false);
                      }}
                      className={`apple-acrylic-card p-5 transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-[#0071e3] dark:ring-[#2997ff] scale-[1.01]"
                          : "hover:scale-[1.005]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                              isHighValue
                                ? "bg-[#0071e3] text-white"
                                : "bg-black/5 dark:bg-white/10 text-[#6e6e73] dark:text-white"
                            }`}
                          >
                            #{m.category}
                          </span>
                          <span className="text-[12px] text-[#6e6e73] dark:text-[#86868b] font-mono">
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Value Score Pill */}
                        <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[12px] font-semibold text-[#1d1d1f] dark:text-white">
                          <Flame className="size-3 text-[#0071e3] dark:text-[#2997ff]" />
                          <span>{m.score}/100</span>
                        </div>
                      </div>

                      <h3 className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white mt-2.5 leading-snug tracking-tight">
                        {m.title}
                      </h3>

                      <p className="text-[14px] text-[#6e6e73] dark:text-[#86868b] line-clamp-2 mt-1.5 leading-relaxed">
                        {m.problem}
                      </p>

                      {/* Score breakdown metrics */}
                      {m.scoreBreakdown && (
                        <div className="grid grid-cols-5 gap-1 mt-3.5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-[10px] text-[#6e6e73] dark:text-[#86868b] font-mono">
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
            <div className="lg:col-span-7 flex flex-col gap-4">
              {activeMoment ? (
                <div className="apple-acrylic-card p-8">
                  {/* Studio Header & Segmented Tab Switcher */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold uppercase text-[#0071e3] dark:text-[#2997ff]">
                          Estudio de Creación
                        </span>
                        <span className="text-[11px] font-mono bg-black/5 dark:bg-white/10 px-2.5 py-0.5 rounded-full text-[#6e6e73] dark:text-[#86868b]">
                          ID: {activeMoment._id.slice(0, 8)}
                        </span>
                      </div>
                      <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white mt-1 line-clamp-1 tracking-tight">
                        {activeMoment.title}
                      </h2>
                    </div>

                    {/* Apple Segmented Tabs */}
                    <div className="apple-segmented-track">
                      <button
                        onClick={() => setActiveTab("post")}
                        className={`px-4 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
                          activeTab === "post"
                            ? "apple-segmented-thumb-active"
                            : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
                        }`}
                      >
                        Publicación
                      </button>
                      <button
                        onClick={() => setActiveTab("card")}
                        className={`px-4 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
                          activeTab === "card"
                            ? "apple-segmented-thumb-active"
                            : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
                        }`}
                      >
                        Imagen 4:5
                      </button>
                      <button
                        onClick={() => setActiveTab("evidence")}
                        className={`px-4 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
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
                    <div className="mt-6 flex flex-col gap-4">
                      {/* Action Bar */}
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">
                          Historia Optimizada para Redes
                        </span>

                        <div className="flex items-center gap-2">
                          {isEditingPost ? (
                            <>
                              <button
                                onClick={handleSavePost}
                                className="apple-btn-primary text-[14px] py-1.5 px-4"
                              >
                                <Check className="size-3.5" />
                                <span>Guardar</span>
                              </button>
                              <button
                                onClick={() => setIsEditingPost(false)}
                                className="apple-btn-secondary text-[14px] py-1.5 px-4"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={handleGenerateWithGemini}
                                disabled={isGeneratingAi}
                                className="apple-btn-secondary text-[13px] py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="Sintetizar y optimizar la narrativa con Google Gemini 2.5 AI"
                              >
                                <Sparkles className={`size-3.5 text-[#0071e3] dark:text-[#2997ff] ${isGeneratingAi ? "animate-spin" : ""}`} />
                                <span>{isGeneratingAi ? "Generando..." : "Gemini AI"}</span>
                              </button>
                              <button
                                onClick={handleStartEdit}
                                className="apple-btn-secondary text-[14px] py-1.5 px-4"
                              >
                                <Edit3 className="size-3.5 mr-1" />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={handleCopyPost}
                                className="apple-btn-primary text-[14px] py-1.5 px-5"
                              >
                                {copied ? (
                                  <>
                                    <Check className="size-4" />
                                    <span>¡Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="size-4" />
                                    <span>Copiar Publicación</span>
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
                            <label className="text-[12px] uppercase font-semibold text-[#6e6e73] dark:text-[#86868b]">
                              Hook / Gancho
                            </label>
                            <input
                              type="text"
                              value={editedHook}
                              onChange={(e) => setEditedHook(e.target.value)}
                              className="apple-input-capsule mt-1 w-full p-3.5 text-[14px]"
                            />
                          </div>

                          <div>
                            <label className="text-[12px] uppercase font-semibold text-[#6e6e73] dark:text-[#86868b]">
                              Cuerpo del Post
                            </label>
                            <textarea
                              rows={9}
                              value={editedBody}
                              onChange={(e) => setEditedBody(e.target.value)}
                              className="mt-1 w-full rounded-[20px] bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] p-4 text-[14px] leading-relaxed text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 rounded-[20px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] text-[15px] leading-relaxed whitespace-pre-line text-[#1d1d1f] dark:text-[#ffffff] select-text">
                          <p className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white">
                            {activeMoment.postDraft?.hook || "Post listo para revisar"}
                          </p>
                          <div className="my-3.5 border-t border-black/[0.06] dark:border-white/[0.08]" />
                          <p>{activeMoment.postDraft?.body}</p>
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {activeMoment.postDraft?.hashtags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[#0071e3] dark:text-[#2997ff] text-[13px] font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Educational Breakdown Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-4 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] text-[14px]">
                          <span className="font-semibold text-[#ff453a] text-[12px] block mb-1">
                            El Problema
                          </span>
                          <p className="text-[#1d1d1f] dark:text-[#cccccc]">{activeMoment.problem}</p>
                        </div>
                        <div className="p-4 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] text-[14px]">
                          <span className="font-semibold text-[#0071e3] dark:text-[#2997ff] text-[12px] block mb-1">
                            Causa Raíz
                          </span>
                          <p className="text-[#1d1d1f] dark:text-[#cccccc]">{activeMoment.discovery}</p>
                        </div>
                        <div className="p-4 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] text-[14px]">
                          <span className="font-semibold text-[#30d158] text-[12px] block mb-1">
                            Solución Verificada
                          </span>
                          <p className="text-[#1d1d1f] dark:text-[#cccccc]">{activeMoment.solution}</p>
                        </div>
                        <div className="p-4 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] text-[14px]">
                          <span className="font-semibold text-[#0071e3] dark:text-[#2997ff] text-[12px] block mb-1">
                            Aprendizaje Clave
                          </span>
                          <p className="text-[#1d1d1f] dark:text-[#cccccc]">{activeMoment.lesson}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Social Card Studio (1080 × 1350) with Signature Apple Product Elevation */}
                  {activeTab === "card" && (
                    <div className="mt-6 flex flex-col gap-5">
                      {/* Floating Acrylic Controls Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-full apple-acrylic-bar text-[14px]">
                        {/* Author Input */}
                        <div className="flex items-center gap-2">
                          <span className="text-[#6e6e73] dark:text-[#86868b]">Autor:</span>
                          <input
                            type="text"
                            value={customAuthor}
                            onChange={(e) => setCustomAuthor(e.target.value)}
                            placeholder="Tu Nombre"
                            className="apple-input-capsule px-3 py-1 text-[13px] w-28"
                          />
                        </div>

                        {/* Color Choices */}
                        <div className="flex items-center gap-2">
                          <span className="text-[#6e6e73] dark:text-[#86868b] mr-1">Paleta:</span>
                          {appleColorChoices.map((c) => (
                            <button
                              key={c.value}
                              onClick={() => setCustomAccent(c.value)}
                              style={{ backgroundColor: c.value }}
                              className={`size-5 rounded-full cursor-pointer transition-transform ${
                                customAccent === c.value
                                  ? "scale-125 ring-2 ring-[#0071e3] shadow-md"
                                  : "hover:scale-110"
                              }`}
                              title={c.label}
                            />
                          ))}
                        </div>

                        {/* Download High-Res PNG Button */}
                        <button
                          onClick={handleDownloadPNG}
                          disabled={isExporting}
                          className="apple-btn-primary text-[14px] py-1.5 px-5 disabled:opacity-50"
                        >
                          <Download className="size-3.5" />
                          <span>{isExporting ? "Exportando..." : "Descargar PNG"}</span>
                        </button>
                      </div>

                      {/* Scaled Preview Frame with Apple Product Elevation */}
                      <div className="flex justify-center overflow-hidden rounded-[24px] bg-black/5 dark:bg-[#121214] p-10 border border-black/[0.06] dark:border-white/[0.08]">
                        <div
                          style={{
                            width: "360px",
                            height: "450px",
                            overflow: "hidden",
                          }}
                          className="relative rounded-[20px] apple-product-elevation"
                        >
                          <SocialPostCard
                            manifest={currentManifest}
                            scale={360 / 1080}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Evidence & Technical Diff */}
                  {activeTab === "evidence" && (
                    <div className="mt-6 flex flex-col gap-4 text-xs font-mono">
                      <div className="p-4 rounded-[16px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] flex flex-col gap-2">
                        <span className="font-semibold text-[#0071e3] dark:text-[#2997ff] uppercase text-[11px]">
                          Eventos de Evidencia Registrados
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {activeMoment.evidenceEventIds.map((id) => (
                            <span
                              key={id}
                              className="px-3 py-1 rounded-full bg-white dark:bg-[#202022] border border-black/[0.06] dark:border-white/[0.08] text-[#1d1d1f] dark:text-white"
                            >
                              {id}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Diff Preview */}
                      <div className="rounded-[20px] border border-white/10 bg-[#1e1e20] p-5 text-white">
                        <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-[11px] text-[#86868b]">
                          <span>diff --git a/source.ts b/source.ts</span>
                          <span className="text-[#30d158]">Verificado</span>
                        </div>
                        <div className="mt-3.5 space-y-2">
                          <div className="p-3 rounded-xl bg-[#2d1b1f] border-l-4 border-[#ff453a] text-[#ffd2d2]">
                            - {currentManifest.codeBefore || "analyser.smoothingTimeConstant = 0.8;"}
                          </div>
                          <div className="p-3 rounded-xl bg-[#1b2d22] border-l-4 border-[#30d158] text-[#d2ffd8]">
                            + {currentManifest.codeAfter || "analyser.smoothingTimeConstant = 0.0;"}
                          </div>
                        </div>
                      </div>

                      {/* Test Result Box */}
                      <div className="p-4 rounded-[16px] bg-[#1b2d22]/40 border border-[#30d158]/40 text-[#d2ffd8]">
                        <div className="flex items-center gap-2 font-bold mb-1">
                          <CheckCircle2 className="size-4 text-[#30d158]" />
                          <span>Prueba de Regresión Validada</span>
                        </div>
                        <p className="font-sans text-xs text-white">
                          {currentManifest.result || "12/12 tests aprobados con 0 falsos positivos"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Feedback Bar */}
                  <div className="mt-7 flex items-center justify-between pt-5 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <span className="text-[13px] text-[#6e6e73] dark:text-[#86868b]">
                      ¿Te sirvió este momento? Tu feedback calibra el motor de valor.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFeedback("accept")}
                        className="apple-btn-primary text-[13px] py-1.5 px-4"
                      >
                        <ThumbsUp className="size-3.5" />
                        <span>Aprobar</span>
                      </button>
                      <button
                        onClick={() => handleFeedback("discard")}
                        className="apple-btn-secondary text-[13px] py-1.5 px-4 text-[#ff453a]"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Descartar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
