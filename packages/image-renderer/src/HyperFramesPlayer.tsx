"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { ImageManifest } from "@hackathon-craft-station/shared-types";
import { generateHyperFramesHtml } from "./hyperframes-generator";
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Sparkles,
  Film,
  Smartphone,
  Monitor,
  Camera,
  Check,
  Maximize2,
  Sliders,
  Layers,
  CheckCircle2,
} from "lucide-react";

export interface HyperFramesPlayerProps {
  manifest: ImageManifest;
  durationSeconds?: number;
  authorName?: string;
  accentColor?: string;
}

export const HyperFramesPlayer: React.FC<HyperFramesPlayerProps> = ({
  manifest,
  durationSeconds = 9,
  authorName,
  accentColor,
}) => {
  const [aspectRatio, setAspectRatio] = useState<"4:5" | "16:9" | "9:16">("4:5");
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [videoZoom, setVideoZoom] = useState<number>(0.42);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExportingFrame, setIsExportingFrame] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());

  const mergedManifest: ImageManifest = {
    ...manifest,
    authorName: authorName || manifest.authorName || "Diego",
    accentColor: accentColor || manifest.accentColor || "#0066cc",
  };

  // Dimensions based on aspect ratio
  const getNativeDimensions = useCallback(() => {
    if (aspectRatio === "16:9") {
      return { width: 1920, height: 1080 };
    }
    if (aspectRatio === "9:16") {
      return { width: 1080, height: 1920 };
    }
    return { width: 1080, height: 1350 }; // 4:5
  }, [aspectRatio]);

  const { width: nativeWidth, height: nativeHeight } = getNativeDimensions();

  // Helper canvas geometry functions
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const circle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    const words = text.split(" ");
    let line = "";
    let currY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currY);
        line = words[n] + " ";
        currY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currY);
  };

  // High-fidelity frame rendering function for canvas & video exporter
  const drawFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      time: number
    ) => {
      const accent = mergedManifest.accentColor || "#0066cc";
      const isLandscape = width > height;

      // 1. Clear & Dark Obsidian Canvas Background
      ctx.fillStyle = "#0c0d12";
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle Geometric Grid Pattern
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Ambient Lighting & Glow Gradients
      const topGlow = ctx.createRadialGradient(
        width / 2,
        -50,
        20,
        width / 2,
        -50,
        width * 0.7
      );
      topGlow.addColorStop(0, `${accent}40`);
      topGlow.addColorStop(0.5, `${accent}15`);
      topGlow.addColorStop(1, "transparent");
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, width, height * 0.7);

      const bottomGlow = ctx.createRadialGradient(
        width - 100,
        height + 50,
        10,
        width - 100,
        height + 50,
        width * 0.5
      );
      bottomGlow.addColorStop(0, "rgba(48, 209, 88, 0.2)");
      bottomGlow.addColorStop(1, "transparent");
      ctx.fillStyle = bottomGlow;
      ctx.fillRect(0, height * 0.4, width, height * 0.6);

      // Header layout coordinates
      const padX = isLandscape ? 80 : 64;
      const padY = isLandscape ? 60 : 72;

      // Header: Eyebrow Pill Badge & Verified Badge
      const eyebrowText = mergedManifest.eyebrow || "LECCIÓN DE INGENIERÍA";
      ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
      const eyebrowWidth = ctx.measureText(eyebrowText).width + 36;

      ctx.fillStyle = accent;
      roundRect(ctx, padX, padY, eyebrowWidth, 38, 19);
      ctx.fill();

      // Ping dot
      ctx.fillStyle = "#ffffff";
      circle(ctx, padX + 16, padY + 19, 4);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(eyebrowText, padX + 26, padY + 24);

      // Category tag
      const catText = `#${mergedManifest.category || "bug_fix"}`;
      ctx.font = "14px 'SF Mono', monospace";
      const catWidth = ctx.measureText(catText).width + 24;
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      roundRect(ctx, padX + eyebrowWidth + 12, padY, catWidth, 38, 19);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#d2d2d7";
      ctx.fillText(catText, padX + eyebrowWidth + 24, padY + 24);

      // Right Signal Verified Badge
      const verText = "BuildSignal • Verified";
      ctx.font = "bold 14px 'SF Mono', monospace";
      const verWidth = ctx.measureText(verText).width + 36;
      const verX = width - padX - verWidth;

      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      roundRect(ctx, verX, padY, verWidth, 38, 19);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.stroke();

      ctx.fillStyle = "#30d158";
      circle(ctx, verX + 16, padY + 19, 4);
      ctx.fillStyle = "#f5f5f7";
      ctx.fillText(verText, verX + 26, padY + 24);

      // =========================================================================
      // SCENE SEQUENCER (0.0s - 9.0s)
      // =========================================================================

      if (time < 2.8) {
        // -----------------------------------------------------------------------
        // SCENE 1: EL PROBLEMA OBSERVADO (0s - 2.8s)
        // -----------------------------------------------------------------------
        const sceneProgress = Math.min(1, time / 0.4); // quick smooth entry
        const sceneYOffset = (1 - sceneProgress) * 20;

        // Headline
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${isLandscape ? "42px" : "46px"} -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
        const headY = padY + (isLandscape ? 80 : 100) + sceneYOffset;
        wrapText(
          ctx,
          mergedManifest.headline || "Depuración y Solución Técnica",
          padX,
          headY,
          width - padX * 2,
          isLandscape ? 52 : 56
        );

        // Glassmorphism Problem Card
        const cardY = isLandscape ? height / 2 - 130 : height / 2 - 160;
        const cardHeight = isLandscape ? 280 : 320;
        const cardWidth = width - padX * 2;

        ctx.fillStyle = "rgba(24, 24, 28, 0.85)";
        roundRect(ctx, padX, cardY, cardWidth, cardHeight, 26);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Top inset highlight line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padX + 26, cardY + 1);
        ctx.lineTo(padX + cardWidth - 26, cardY + 1);
        ctx.stroke();

        // Card Eyebrow
        ctx.fillStyle = "#ff453a";
        ctx.font = "bold 15px 'SF Mono', monospace";
        ctx.fillText("🔴 EL PROBLEMA OBSERVADO EN PRODUCCIÓN", padX + 36, cardY + 54);

        // Problem Body
        ctx.fillStyle = "#f5f5f7";
        ctx.font = `${isLandscape ? "22px" : "24px"} -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif`;
        wrapText(
          ctx,
          mergedManifest.problem || "Comportamiento inesperado y discrepancia de estado detectada durante la ejecución.",
          padX + 36,
          cardY + 104,
          cardWidth - 72,
          isLandscape ? 34 : 38
        );

        // Step Counter in Card
        ctx.fillStyle = "#86868b";
        ctx.font = "13px 'SF Mono', monospace";
        ctx.fillText("FASE 1/3 • DETECCIÓN TELEMÉTRICA", padX + 36, cardY + cardHeight - 32);
      } else if (time >= 2.8 && time < 6.2) {
        // -----------------------------------------------------------------------
        // SCENE 2: SOLUCIÓN EN CÓDIGO & TESTS (2.8s - 6.2s)
        // -----------------------------------------------------------------------
        const headY = padY + (isLandscape ? 70 : 85);
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${isLandscape ? "36px" : "40px"} -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
        ctx.fillText("Solución Verificada en Código", padX, headY);

        ctx.fillStyle = "#86868b";
        ctx.font = "16px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText("Refactor validado con pruebas unitarias automáticas", padX, headY + 30);

        // macOS Terminal Window
        const termY = isLandscape ? height / 2 - 160 : height / 2 - 210;
        const termWidth = width - padX * 2;
        const termHeight = isLandscape ? 330 : 400;

        // Terminal Background
        ctx.fillStyle = "#121215";
        roundRect(ctx, padX, termY, termWidth, termHeight, 22);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Terminal Header Bar
        ctx.fillStyle = "#1c1c20";
        roundRect(ctx, padX, termY, termWidth, 48, 22);
        ctx.fill();
        ctx.fillRect(padX, termY + 22, termWidth, 26); // flatten bottom curve
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.stroke();

        // Window Traffic Light Dots
        ctx.fillStyle = "#ff5f56";
        circle(ctx, padX + 24, termY + 24, 6);
        ctx.fillStyle = "#ffbd2e";
        circle(ctx, padX + 44, termY + 24, 6);
        ctx.fillStyle = "#27c93f";
        circle(ctx, padX + 64, termY + 24, 6);

        // Terminal Title
        ctx.fillStyle = "#86868b";
        ctx.font = "13px 'SF Mono', monospace";
        ctx.fillText("diff --git a/source.ts b/source.ts", padX + 86, termY + 28);

        ctx.fillStyle = "#30d158";
        ctx.fillText("+1 / -1", termWidth + padX - 70, termY + 28);

        // Diff Line: Removed Code (-)
        const diffStartY = termY + 74;
        ctx.fillStyle = "rgba(255, 69, 58, 0.15)";
        ctx.fillRect(padX + 2, diffStartY, termWidth - 4, 56);
        ctx.fillStyle = "#ff453a";
        ctx.fillRect(padX + 2, diffStartY, 4, 56);

        ctx.fillStyle = "#ff9b9b";
        ctx.font = "16px 'SF Mono', 'Fira Code', monospace";
        ctx.fillText("-", padX + 24, diffStartY + 34);
        ctx.fillText(
          mergedManifest.codeBefore || "// Código anterior con fallo",
          padX + 48,
          diffStartY + 34
        );

        // Diff Line: Added Code (+)
        ctx.fillStyle = "rgba(48, 209, 88, 0.15)";
        ctx.fillRect(padX + 2, diffStartY + 64, termWidth - 4, 56);
        ctx.fillStyle = "#30d158";
        ctx.fillRect(padX + 2, diffStartY + 64, 4, 56);

        ctx.fillStyle = "#a8f5ba";
        ctx.font = "16px 'SF Mono', 'Fira Code', monospace";
        ctx.fillText("+", padX + 24, diffStartY + 98);
        ctx.fillText(
          mergedManifest.codeAfter || "// Solución optimizada",
          padX + 48,
          diffStartY + 98
        );

        // Animated Blinking Cursor on Added Line
        const isBlinkOn = Math.floor(time * 3) % 2 === 0;
        if (isBlinkOn) {
          const textMetrics = ctx.measureText(
            mergedManifest.codeAfter || "// Solución optimizada"
          );
          ctx.fillStyle = accent;
          ctx.fillRect(padX + 52 + textMetrics.width, diffStartY + 80, 9, 22);
        }

        // Test pass status banner inside terminal
        const testY = termY + termHeight - 80;
        ctx.fillStyle = "rgba(48, 209, 88, 0.12)";
        roundRect(ctx, padX + 20, testY, termWidth - 40, 52, 14);
        ctx.fill();
        ctx.strokeStyle = "rgba(48, 209, 88, 0.3)";
        ctx.stroke();

        ctx.fillStyle = "#30d158";
        ctx.font = "bold 15px 'SF Mono', monospace";
        ctx.fillText(
          `✓ ${mergedManifest.result || "12/12 pruebas de regresión aprobadas"}`,
          padX + 40,
          testY + 32
        );
      } else {
        // -----------------------------------------------------------------------
        // SCENE 3: LECCIÓN DE INGENIERÍA & TAKEAWAY (6.2s - 9.0s)
        // -----------------------------------------------------------------------
        const headY = padY + (isLandscape ? 70 : 85);
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${isLandscape ? "38px" : "42px"} -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
        ctx.fillText("Lección de Ingeniería", padX, headY);

        ctx.fillStyle = "#86868b";
        ctx.font = "16px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText("Conocimiento transferible para el equipo de desarrollo", padX, headY + 30);

        // Takeaway Highlighted Card
        const cardY = isLandscape ? height / 2 - 130 : height / 2 - 160;
        const cardWidth = width - padX * 2;
        const cardHeight = isLandscape ? 270 : 310;

        ctx.fillStyle = "rgba(24, 24, 28, 0.88)";
        roundRect(ctx, padX, cardY, cardWidth, cardHeight, 26);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Accent left ribbon
        ctx.fillStyle = accent;
        roundRect(ctx, padX, cardY, 8, cardHeight, 4);
        ctx.fill();

        // Card Tag
        ctx.fillStyle = accent;
        ctx.font = "bold 15px 'SF Mono', monospace";
        ctx.fillText("💡 APRENDIZAJE CLAVE DESTILADO", padX + 36, cardY + 54);

        // Quote Body
        ctx.fillStyle = "#ffffff";
        ctx.font = `italic ${isLandscape ? "24px" : "26px"} -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
        wrapText(
          ctx,
          `"${mergedManifest.takeaway || "Audita siempre el comportamiento por defecto de las dependencias externas."}"`,
          padX + 36,
          cardY + 106,
          cardWidth - 72,
          isLandscape ? 38 : 42
        );

        // Footer in Card
        ctx.fillStyle = "#2997ff";
        ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText("Compartido con la comunidad de ingeniería de software", padX + 36, cardY + cardHeight - 32);
      }

      // =========================================================================
      // FOOTER & METADATA BAR
      // =========================================================================
      const footY = height - (isLandscape ? 40 : 54);
      ctx.fillStyle = "#86868b";
      ctx.font = "14px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
      ctx.fillText(`Autor: ${mergedManifest.authorName || "Diego"}`, padX, footY);

      const engineText = "Generado con BuildSignal • HyperFrames 4K";
      const engineWidth = ctx.measureText(engineText).width;
      ctx.fillText(engineText, width - padX - engineWidth, footY);

      // =========================================================================
      // DYNAMIC PROGRESS BAR STRIP (Bottom Edge of Video)
      // =========================================================================
      const progressPercent = Math.min(1, Math.max(0, time / durationSeconds));
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(0, height - 6, width, 6);

      ctx.fillStyle = accent;
      ctx.fillRect(0, height - 6, width * progressPercent, 6);
    },
    [mergedManifest, durationSeconds]
  );

  // Real-time animation loop for canvas
  useEffect(() => {
    lastTimeRef.current = Date.now();

    const render = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying && !isExportingVideo) {
        setCurrentTime((prev) => {
          const next = prev + delta * playbackSpeed;
          if (next >= durationSeconds) {
            return 0; // loop
          }
          return next;
        });
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawFrame(ctx, nativeWidth, nativeHeight, currentTime);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isPlaying,
    playbackSpeed,
    durationSeconds,
    isExportingVideo,
    currentTime,
    drawFrame,
    nativeWidth,
    nativeHeight,
  ]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
    setShowPlayOverlay(true);
    setTimeout(() => setShowPlayOverlay(false), 500);
  };

  // Instant High-Res Frame PNG Exporter
  const handleDownloadFramePNG = () => {
    try {
      setIsExportingFrame(true);
      const canvas = document.createElement("canvas");
      canvas.width = nativeWidth;
      canvas.height = nativeHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawFrame(ctx, nativeWidth, nativeHeight, currentTime);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `buildsignal-frame-${aspectRatio.replace(":", "x")}-${currentTime.toFixed(1)}s.png`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExportingFrame(false);
      }, "image/png");
    } catch {
      setIsExportingFrame(false);
    }
  };

  // WebM / MP4 Native Video Exporter
  const handleExportVideo = async () => {
    try {
      setIsExportingVideo(true);
      setIsPlaying(false);
      setExportProgress(0);

      const canvas = document.createElement("canvas");
      canvas.width = nativeWidth;
      canvas.height = nativeHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo iniciar el canvas 2D");

      const fps = 30;
      const totalFrames = Math.round(durationSeconds * fps);
      const stream = canvas.captureStream(fps);

      let mimeType = "video/webm;codecs=vp9";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 6000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const videoBlob = new Blob(chunks, { type: "video/webm" });
          resolve(videoBlob);
        };
      });

      recorder.start();

      for (let frame = 0; frame <= totalFrames; frame++) {
        const t = (frame / totalFrames) * durationSeconds;
        drawFrame(ctx, nativeWidth, nativeHeight, t);
        setExportProgress(Math.round((frame / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, 1000 / fps));
      }

      recorder.stop();
      const videoBlob = await recordPromise;

      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buildsignal-video-${aspectRatio.replace(":", "x")}.webm`;
      a.click();
      URL.revokeObjectURL(url);

      setIsExportingVideo(false);
      setIsPlaying(true);
    } catch {
      setIsExportingVideo(false);
      setIsPlaying(true);
    }
  };

  const handleDownloadHtml = () => {
    const htmlSrc = generateHyperFramesHtml({
      manifest: mergedManifest,
      aspectRatio,
      durationSeconds,
    });
    const blob = new Blob([htmlSrc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buildsignal-hyperframe-${aspectRatio.replace(":", "x")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Active scene beat indicator
  let currentBeat = 1;
  let beatLabel = "🔴 1. El Problema";
  if (currentTime >= 2.8 && currentTime < 6.2) {
    currentBeat = 2;
    beatLabel = "🟢 2. Diff & Solución";
  } else if (currentTime >= 6.2) {
    currentBeat = 3;
    beatLabel = "💡 3. Lección Clave";
  }

  // Format time (00:02.4)
  const formatTimestamp = (sec: number) => {
    const s = Math.floor(sec);
    const ms = Math.floor((sec % 1) * 10);
    return `00:${s.toString().padStart(2, "0")}.${ms}`;
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-full overflow-hidden select-none">
      {/* TOP FLOATING ACRYLIC BAR: Ratio Switcher, Scenes & Zoom */}
      <div className="apple-acrylic-bar p-2 sm:p-2.5 px-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 w-full max-w-2xl">
        {/* Aspect Ratio Segmented Control */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase text-[#6e6e73] dark:text-[#86868b] mr-1 hidden sm:inline">
            Formato:
          </span>
          <div className="apple-segmented-track">
            <button
              onClick={() => {
                setAspectRatio("4:5");
                if (videoZoom > 0.45) setVideoZoom(0.42);
              }}
              className={`px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                aspectRatio === "4:5"
                  ? "apple-segmented-thumb-active"
                  : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
              }`}
            >
              <span>4:5 (Post)</span>
            </button>
            <button
              onClick={() => {
                setAspectRatio("16:9");
                setVideoZoom(0.38);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                aspectRatio === "16:9"
                  ? "apple-segmented-thumb-active"
                  : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
              }`}
            >
              <Monitor className="size-3" />
              <span>16:9 (X)</span>
            </button>
            <button
              onClick={() => {
                setAspectRatio("9:16");
                setVideoZoom(0.32);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                aspectRatio === "9:16"
                  ? "apple-segmented-thumb-active"
                  : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
              }`}
            >
              <Smartphone className="size-3" />
              <span>9:16 (Shorts)</span>
            </button>
          </div>
        </div>

        {/* Scene Jump Chips */}
        <div className="flex items-center gap-1">
          {[
            { id: 1, label: "1. Problema", time: 0.0 },
            { id: 2, label: "2. Diff", time: 2.9 },
            { id: 3, label: "3. Lección", time: 6.3 },
          ].map((sc) => (
            <button
              key={sc.id}
              onClick={() => setCurrentTime(sc.time)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                currentBeat === sc.id
                  ? "bg-[#0066cc] text-white shadow-xs font-semibold"
                  : "bg-black/5 dark:bg-white/10 text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>

        {/* Zoom Scale Controls */}
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 p-0.5 rounded-full text-xs">
          {[
            { label: "35%", val: 0.35 },
            { label: "42%", val: 0.42 },
            { label: "50%", val: 0.5 },
          ].map((z) => (
            <button
              key={z.label}
              onClick={() => setVideoZoom(z.val)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono transition-colors ${
                videoZoom === z.val
                  ? "bg-white dark:bg-white/20 text-[#1d1d1f] dark:text-white font-semibold shadow-xs"
                  : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIDEO PREVIEW PEDESTAL (Authentic Proportional Canvas) */}
      <div className="w-full min-h-[520px] p-4 sm:p-8 rounded-[28px] bg-black/[0.03] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex items-center justify-center overflow-auto relative">
        <div
          style={{
            width: `${nativeWidth * videoZoom}px`,
            height: `${nativeHeight * videoZoom}px`,
            maxWidth: "100%",
          }}
          className="apple-product-elevation rounded-[22px] sm:rounded-[26px] overflow-hidden relative shrink-0 transition-all duration-200 cursor-pointer group bg-black"
          onClick={handleTogglePlay}
          title="Click para Reproducir / Pausar"
        >
          {/* True 60 FPS Native Resolution Canvas */}
          <canvas
            ref={canvasRef}
            width={nativeWidth}
            height={nativeHeight}
            className="w-full h-full block object-contain select-none"
          />

          {/* Quick HUD Hover Indicator */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            {nativeWidth} × {nativeHeight} • 60 FPS
          </div>

          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#30d158] animate-pulse" />
            <span>{beatLabel}</span>
          </div>

          {/* Play/Pause Center Ripple Overlay */}
          {showPlayOverlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-xs animate-in fade-in-0 duration-200">
              <div className="size-16 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white shadow-2xl scale-110 transition-transform">
                {isPlaying ? <Play className="size-7 fill-white" /> : <Pause className="size-7 fill-white" />}
              </div>
            </div>
          )}

          {/* Video Exporting Overlay */}
          {isExportingVideo && (
            <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <Film className="size-9 text-[#0066cc] dark:text-[#2997ff] animate-pulse mb-3" />
              <h4 className="text-sm font-semibold text-white">
                Renderizando Video HyperFrames ({exportProgress}%)
              </h4>
              <p className="text-xs text-[#86868b] mt-1 max-w-xs">
                Generando fotogramas a {nativeWidth}×{nativeHeight} a 30 FPS sin pérdidas...
              </p>
              <div className="w-52 h-1.5 bg-white/20 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-[#0066cc] transition-all duration-150 rounded-full"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM FLOATING CONTROLS BAR: Play, Scrub, Speeds & Export */}
      <div className="w-full max-w-2xl apple-acrylic-card p-3.5 sm:p-4 flex flex-col gap-3">
        {/* Progress scrub bar with exact timestamps */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[11px] font-mono text-[#0066cc] dark:text-[#2997ff] font-semibold w-16 text-right shrink-0">
            {formatTimestamp(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={durationSeconds}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-[#0066cc] dark:accent-[#2997ff] cursor-pointer h-1.5 bg-black/10 dark:bg-white/15 rounded-full"
          />
          <span className="text-[11px] font-mono text-[#6e6e73] dark:text-[#86868b] w-16 shrink-0">
            {formatTimestamp(durationSeconds)}
          </span>
        </div>

        {/* Interactive Action buttons row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePlay}
              className="apple-btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5 min-h-[36px]"
            >
              {isPlaying ? (
                <>
                  <Pause className="size-3.5" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  <span>Reproducir</span>
                </>
              )}
            </button>

            <button
              onClick={() => setCurrentTime(0)}
              className="apple-btn-secondary py-1.5 px-2.5 text-xs text-[#6e6e73] dark:text-white min-h-[36px]"
              title="Reiniciar video desde 0s"
            >
              <RotateCcw className="size-3.5" />
            </button>

            {/* Speed toggle */}
            <button
              onClick={() =>
                setPlaybackSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))
              }
              className="apple-btn-secondary py-1.5 px-2.5 text-[11px] font-mono min-h-[36px]"
              title="Velocidad de reproducción"
            >
              {playbackSpeed}×
            </button>

            {/* Capture instant HD frame */}
            <button
              onClick={handleDownloadFramePNG}
              disabled={isExportingFrame}
              className="apple-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 min-h-[36px]"
              title="Descargar este fotograma exacto en PNG HD a resolución nativa"
            >
              <Camera className="size-3.5 text-[#0066cc] dark:text-[#2997ff]" />
              <span className="hidden sm:inline">Capturar Frame</span>
            </button>
          </div>

          {/* Export Video & HTML Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              className="apple-btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1 min-h-[36px]"
              title="Descargar código HTML seekable de HyperFrames"
            >
              <Download className="size-3.5 text-[#6e6e73] dark:text-white" />
              <span>HTML</span>
            </button>

            <button
              onClick={handleExportVideo}
              disabled={isExportingVideo}
              className="apple-btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5 min-h-[36px]"
              title="Exportar video WebM renderizado directamente en el navegador"
            >
              <Film className="size-3.5" />
              <span>{isExportingVideo ? "Exportando..." : "Exportar Video"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

