"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExportingFrame, setIsExportingFrame] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());

  const mergedManifest: ImageManifest = {
    ...manifest,
    authorName: authorName || manifest.authorName,
    accentColor: accentColor || manifest.accentColor,
  };

  const htmlSrc = generateHyperFramesHtml({
    manifest: mergedManifest,
    aspectRatio,
    durationSeconds,
  });

  // Timeline loop
  useEffect(() => {
    lastTimeRef.current = Date.now();

    const tick = () => {
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

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, durationSeconds, isExportingVideo]);

  // Sync seek to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ seek: currentTime }, "*");
    }
  }, [currentTime]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ seek: val }, "*");
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([htmlSrc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buildsignal-hyperframe-${aspectRatio.replace(":", "x")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Draw a frame to canvas for video/image generation
  const drawFrameToCanvas = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ) => {
    const accent = mergedManifest.accentColor || "#0071e3";

    // 1. Background
    ctx.fillStyle = "#18181a";
    ctx.fillRect(0, 0, width, height);

    // 2. Radial Glow
    const glow = ctx.createRadialGradient(
      width / 2,
      0,
      10,
      width / 2,
      0,
      width * 0.6
    );
    glow.addColorStop(0, `${accent}44`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height * 0.6);

    // Header & Eyebrow
    ctx.fillStyle = accent;
    roundRect(ctx, 60, 60, 220, 40, 20);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(mergedManifest.eyebrow || "LECCIÓN TÉCNICA", 76, 86);

    ctx.fillStyle = "#86868b";
    ctx.font = "14px monospace";
    ctx.fillText("BuildSignal • Verified", width - 230, 86);

    // Determine current scene
    if (time < 2.8) {
      // Scene 1: Problem
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px -apple-system, BlinkMacSystemFont, sans-serif";
      wrapText(ctx, mergedManifest.headline || "Momento Técnico", 60, 160, width - 120, 48);

      // Glass Card
      ctx.fillStyle = "rgba(39, 39, 41, 0.9)";
      roundRect(ctx, 60, height / 2 - 120, width - 120, 240, 24);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ff453a";
      ctx.font = "bold 16px monospace";
      ctx.fillText("🔴 EL PROBLEMA OBSERVADO", 90, height / 2 - 70);

      ctx.fillStyle = "#ffffff";
      ctx.font = "24px -apple-system, BlinkMacSystemFont, sans-serif";
      wrapText(ctx, mergedManifest.problem || "", 90, height / 2 - 20, width - 180, 36);
    } else if (time >= 2.8 && time < 6.2) {
      // Scene 2: Code Diff & Tests
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Solución Verificada en Código", 60, 160);

      // Terminal Window
      const termY = height / 2 - 160;
      ctx.fillStyle = "#121214";
      roundRect(ctx, 60, termY, width - 120, 320, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.stroke();

      // Dots
      ctx.fillStyle = "#ff5f56";
      circle(ctx, 84, termY + 24, 6);
      ctx.fillStyle = "#ffbd2e";
      circle(ctx, 104, termY + 24, 6);
      ctx.fillStyle = "#27c93f";
      circle(ctx, 124, termY + 24, 6);

      // Terminal Header text
      ctx.fillStyle = "#86868b";
      ctx.font = "14px monospace";
      ctx.fillText("diff --git a/source.ts b/source.ts", 150, termY + 30);

      // Diff Lines
      if (mergedManifest.codeBefore) {
        ctx.fillStyle = "rgba(255, 69, 58, 0.2)";
        ctx.fillRect(62, termY + 60, width - 124, 50);
        ctx.fillStyle = "#ff9b9b";
        ctx.font = "16px monospace";
        ctx.fillText(`- ${mergedManifest.codeBefore}`, 90, termY + 92);
      }

      if (mergedManifest.codeAfter) {
        ctx.fillStyle = "rgba(48, 209, 88, 0.2)";
        ctx.fillRect(62, termY + 120, width - 124, 50);
        ctx.fillStyle = "#a8f5ba";
        ctx.font = "16px monospace";
        ctx.fillText(`+ ${mergedManifest.codeAfter}`, 90, termY + 152);
      }

      // Test pass badge
      ctx.fillStyle = "rgba(48, 209, 88, 0.15)";
      roundRect(ctx, 90, termY + 200, width - 180, 50, 12);
      ctx.fill();
      ctx.fillStyle = "#30d158";
      ctx.font = "bold 16px monospace";
      ctx.fillText(`✓ ${mergedManifest.result || "12/12 tests aprobados"}`, 110, termY + 232);
    } else {
      // Scene 3: Takeaway
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Lección de Ingeniería", 60, 160);

      // Glass Card
      ctx.fillStyle = "rgba(39, 39, 41, 0.9)";
      roundRect(ctx, 60, height / 2 - 120, width - 120, 240, 24);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.font = "bold 16px monospace";
      ctx.fillText("💡 APRENDIZAJE CLAVE", 90, height / 2 - 60);

      ctx.fillStyle = "#ffffff";
      ctx.font = "italic 26px -apple-system, BlinkMacSystemFont, sans-serif";
      wrapText(ctx, `"${mergedManifest.takeaway || ""}"`, 90, height / 2 - 10, width - 180, 38);
    }

    // Footer Bar
    ctx.fillStyle = "#86868b";
    ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`Autor: ${mergedManifest.authorName || "Diego"}`, 60, height - 60);
    ctx.fillText("Generado con BuildSignal • HyperFrames", width - 330, height - 60);
  };

  // Helper Canvas functions
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

  // Instant Frame PNG Exporter
  const handleDownloadFramePNG = () => {
    try {
      setIsExportingFrame(true);
      const canvas = document.createElement("canvas");
      let width = 1080;
      let height = 1350;
      if (aspectRatio === "16:9") {
        width = 1920;
        height = 1080;
      } else if (aspectRatio === "9:16") {
        width = 1080;
        height = 1920;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawFrameToCanvas(ctx, width, height, currentTime);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `buildsignal-frame-${currentTime.toFixed(1)}s.png`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExportingFrame(false);
      }, "image/png");
    } catch {
      setIsExportingFrame(false);
    }
  };

  // In-Browser WebM / MP4 Video Exporter
  const handleExportVideo = async () => {
    try {
      setIsExportingVideo(true);
      setIsPlaying(false);
      setExportProgress(0);

      const canvas = document.createElement("canvas");
      let width = 1080;
      let height = 1350;
      if (aspectRatio === "16:9") {
        width = 1920;
        height = 1080;
      } else if (aspectRatio === "9:16") {
        width = 1080;
        height = 1920;
      }
      canvas.width = width;
      canvas.height = height;
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
        videoBitsPerSecond: 5000000,
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

      // Render each frame sequentially
      for (let frame = 0; frame <= totalFrames; frame++) {
        const t = (frame / totalFrames) * durationSeconds;
        drawFrameToCanvas(ctx, width, height, t);
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
    } catch (err: any) {
      setIsExportingVideo(false);
      setIsPlaying(true);
    }
  };

  // Determine responsive dimensions based on ratio
  let playerWidth = 360;
  let playerHeight = 450;
  if (aspectRatio === "16:9") {
    playerWidth = 460;
    playerHeight = 258;
  } else if (aspectRatio === "9:16") {
    playerWidth = 270;
    playerHeight = 480;
  }

  // Active scene beat
  let beatLabel = "🔴 1. El Problema";
  if (currentTime >= 2.8 && currentTime < 6.2) {
    beatLabel = "🟢 2. Diff & Tests";
  } else if (currentTime >= 6.2) {
    beatLabel = "💡 3. Lección Clave";
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-full overflow-hidden">
      {/* Top Toolbar: Aspect Ratio & Scene Indicator */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-lg px-1">
        {/* Aspect Ratio Switcher */}
        <div className="apple-segmented-track w-full sm:w-auto grid grid-cols-3 sm:flex items-center">
          <button
            onClick={() => setAspectRatio("4:5")}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              aspectRatio === "4:5"
                ? "apple-segmented-thumb-active"
                : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            }`}
          >
            <span>4:5 (Post)</span>
          </button>
          <button
            onClick={() => setAspectRatio("16:9")}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              aspectRatio === "16:9"
                ? "apple-segmented-thumb-active"
                : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            }`}
          >
            <Monitor className="size-3" />
            <span>16:9 (X)</span>
          </button>
          <button
            onClick={() => setAspectRatio("9:16")}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              aspectRatio === "9:16"
                ? "apple-segmented-thumb-active"
                : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            }`}
          >
            <Smartphone className="size-3" />
            <span>9:16 (Shorts)</span>
          </button>
        </div>

        {/* Scene Indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs font-medium text-[#1d1d1f] dark:text-white self-center sm:self-auto">
          <Sparkles className="size-3.5 text-[#0071e3] dark:text-[#2997ff]" />
          <span>{beatLabel}</span>
        </div>
      </div>

      {/* Embedded HyperFrames Player Canvas Container */}
      <div className="w-full flex items-center justify-center overflow-x-auto py-2">
        <div
          className="relative apple-acrylic-card p-2 sm:p-3 shadow-2xl transition-all duration-300 flex items-center justify-center bg-black/40 border border-white/10 max-w-full"
          style={{
            width: `${Math.min(playerWidth + 20, 500)}px`,
            maxWidth: "100%",
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={htmlSrc}
            title="HyperFrames Animated Video Preview"
            className="rounded-[14px] border-0 overflow-hidden shadow-inner bg-black w-full"
            style={{
              height: `${playerHeight}px`,
              maxHeight: "65vh",
            }}
            sandbox="allow-scripts allow-same-origin"
          />

          {/* Video Export Overlay Progress */}
          {isExportingVideo && (
            <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md rounded-[16px] flex flex-col items-center justify-center p-6 text-center">
              <Film className="size-8 text-[#0071e3] dark:text-[#2997ff] animate-pulse mb-3" />
              <h4 className="text-sm font-semibold text-white">
                Renderizando Video HyperFrames ({exportProgress}%)
              </h4>
              <p className="text-xs text-[#86868b] mt-1">
                Generando secuencia a 30 FPS en resolución nativa...
              </p>
              <div className="w-48 h-1.5 bg-white/20 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-[#0071e3] transition-all duration-150 rounded-full"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="w-full max-w-lg apple-acrylic-card p-3.5 sm:p-4 flex flex-col gap-3">
        {/* Progress scrub bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[11px] font-mono text-[#6e6e73] dark:text-[#86868b] w-8 text-right shrink-0">
            {currentTime.toFixed(1)}s
          </span>
          <input
            type="range"
            min="0"
            max={durationSeconds}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-[#0071e3] cursor-pointer h-1.5 bg-black/10 dark:bg-white/15 rounded-full"
          />
          <span className="text-[11px] font-mono text-[#6e6e73] dark:text-[#86868b] w-8 shrink-0">
            {durationSeconds}s
          </span>
        </div>

        {/* Action buttons row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="apple-btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5 min-h-[36px]"
            >
              {isPlaying ? (
                <>
                  <Pause className="size-3.5" />
                  <span>Pausa</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              onClick={() => setCurrentTime(0)}
              className="apple-btn-secondary py-1.5 px-2.5 text-xs text-[#6e6e73] dark:text-white min-h-[36px]"
              title="Reiniciar reproducción"
            >
              <RotateCcw className="size-3.5" />
            </button>

            {/* Speed toggle */}
            <button
              onClick={() =>
                setPlaybackSpeed(
                  playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1
                )
              }
              className="apple-btn-secondary py-1.5 px-2.5 text-[11px] font-mono min-h-[36px]"
              title="Velocidad de reproducción"
            >
              {playbackSpeed}×
            </button>

            {/* Capture instant frame */}
            <button
              onClick={handleDownloadFramePNG}
              disabled={isExportingFrame}
              className="apple-btn-secondary py-1.5 px-2.5 text-xs min-h-[36px]"
              title="Capturar fotograma actual como imagen PNG"
            >
              <Camera className="size-3.5 text-[#0071e3] dark:text-[#2997ff]" />
            </button>
          </div>

          {/* Export Video & HTML Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              className="apple-btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1 min-h-[36px]"
              title="Descargar código HTML HyperFrames"
            >
              <Download className="size-3.5 text-[#6e6e73] dark:text-white" />
              <span>HTML</span>
            </button>

            <button
              onClick={handleExportVideo}
              disabled={isExportingVideo}
              className="apple-btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5 min-h-[36px]"
              title="Exportar video WebM/MP4 renderizado en el navegador"
            >
              <Film className="size-3.5" />
              <span>Exportar Video</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
