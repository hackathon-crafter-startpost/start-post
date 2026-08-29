"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ImageManifest } from "@hackathon-craft-station/shared-types";
import { generateHyperFramesHtml } from "./hyperframes-generator";
import { Play, Pause, RotateCcw, Download, Sparkles, Film, Smartphone, Monitor } from "lucide-react";

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

      if (isPlaying) {
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
  }, [isPlaying, playbackSpeed, durationSeconds]);

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
              onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1)}
              className="apple-btn-secondary py-1.5 px-2.5 text-[11px] font-mono min-h-[36px]"
              title="Velocidad de reproducción"
            >
              {playbackSpeed}×
            </button>
          </div>

          {/* Export HTML Composition */}
          <button
            onClick={handleDownloadHtml}
            className="apple-btn-secondary py-1.5 px-3.5 text-xs flex items-center gap-1.5 min-h-[36px] w-full sm:w-auto justify-center"
            title="Descargar código fuente HTML de HyperFrames para renderizar MP4 con CLI"
          >
            <Film className="size-3.5 text-[#0071e3] dark:text-[#2997ff]" />
            <span>Exportar HTML</span>
          </button>
        </div>
      </div>
    </div>
  );
};
