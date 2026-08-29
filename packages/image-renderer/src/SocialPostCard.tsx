/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import React from "react";
import type { ImageManifest } from "@hackathon-craft-station/shared-types";

export interface SocialPostCardProps {
  manifest: ImageManifest;
  id?: string;
  scale?: number;
}

export const SocialPostCard: React.FC<SocialPostCardProps> = ({
  manifest,
  id = "social-post-card",
  scale = 1,
}) => {
  const accent = manifest.accentColor || "#0066cc";

  return (
    <div
      id={id}
      style={{
        width: "1080px",
        height: "1350px",
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
        backgroundColor: "#18181b", // Tactile Dark Tile
        color: "#ffffff",
        fontFamily:
          "SF Pro Text, -apple-system, BlinkMacSystemFont, 'Inter Variable', system-ui, sans-serif",
      }}
      className="relative flex flex-col justify-between p-20 box-border overflow-hidden select-none border border-white/10"
    >
      {/* Top Header & Category Tile */}
      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white"
              style={{ backgroundColor: accent }}
            >
              {manifest.eyebrow || "LECCIÓN TÉCNICA"}
            </span>
            {manifest.category && (
              <span className="px-3.5 py-1 rounded-full text-xs font-mono text-zinc-400 bg-zinc-800/80 border border-white/10">
                #{manifest.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 font-mono text-sm text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-[#30d158] animate-pulse" />
            <span className="font-semibold text-white">BuildSignal Verified</span>
          </div>
        </div>

        {/* Hero Display Headline (Roman, tight negative tracking) */}
        <h1
          style={{
            fontFamily: "SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: "44px",
            fontWeight: 600,
            lineHeight: 1.12,
            letterSpacing: "-0.03em",
          }}
          className="text-white mt-1"
        >
          {manifest.headline}
        </h1>
      </div>

      {/* Main Content Sections (Editorial museum layout) */}
      <div className="relative z-10 flex flex-col gap-5 my-auto">
        {/* Problem block */}
        <div className="rounded-[18px] p-6 bg-[#222226] border border-white/10">
          <div className="text-[#ff453a] text-xs font-mono font-semibold uppercase tracking-wider mb-2">
            El Problema Observado
          </div>
          <p className="text-xl text-white leading-relaxed font-normal">
            {manifest.problem}
          </p>
        </div>

        {/* Code Before & After block */}
        {(manifest.codeBefore || manifest.codeAfter) && (
          <div className="rounded-[18px] p-6 bg-[#121214] border border-white/10 font-mono text-sm">
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/10 text-xs text-zinc-400">
              <span>diff --git a/source.ts b/source.ts</span>
              <span className="text-[#2997ff] font-semibold">Solución Verificada</span>
            </div>

            {manifest.codeBefore && (
              <div className="p-3.5 mb-2.5 rounded-xl bg-[#2d1b1f] border-l-4 border-[#ff453a] text-[#ffd2d2]">
                <span className="text-[#ff453a] font-bold select-none mr-3">-</span>
                <code>{manifest.codeBefore}</code>
              </div>
            )}

            {manifest.codeAfter && (
              <div className="p-3.5 rounded-xl bg-[#1b2d22] border-l-4 border-[#30d158] text-[#d2ffd8]">
                <span className="text-[#30d158] font-bold select-none mr-3">+</span>
                <code>{manifest.codeAfter}</code>
              </div>
            )}
          </div>
        )}

        {/* Verification Result Pill */}
        {manifest.result && (
          <div className="flex items-center gap-3 px-6 py-3.5 rounded-full bg-[#1b2d22]/90 border border-[#30d158]/40">
            <span className="text-[#30d158] text-lg font-bold">✓</span>
            <span className="text-sm font-medium text-white">
              {manifest.result}
            </span>
          </div>
        )}

        {/* Key Takeaway box */}
        <div className="rounded-[18px] p-6 bg-[#222226] border border-white/10">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#2997ff] mb-1.5">
            Aprendizaje Clave
          </div>
          <p className="text-2xl font-semibold text-white leading-snug">
            "{manifest.takeaway}"
          </p>
        </div>
      </div>

      {/* Footer Section */}
      <div className="relative z-10 flex items-center justify-between pt-6 border-t border-white/10">
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-base shadow-sm"
            style={{ backgroundColor: accent }}
          >
            {(manifest.authorName || "BS").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-white text-base">
              {manifest.authorName || "Desarrollador"}
            </div>
            <div className="text-xs text-zinc-400">
              Build in public with BuildSignal
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-sm text-zinc-400">
          <div className="w-7 h-7 rounded-md bg-white text-black font-black text-xs flex items-center justify-center font-mono">
            BS
          </div>
          <span className="font-semibold text-white">buildsignal.dev</span>
        </div>
      </div>
    </div>
  );
};
