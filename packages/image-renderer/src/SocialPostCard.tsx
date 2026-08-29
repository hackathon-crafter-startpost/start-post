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
  const accent = manifest.accentColor || "#2997ff";

  return (
    <div
      id={id}
      style={{
        width: "1080px",
        height: "1350px",
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
        backgroundColor: "#272729", // Apple Surface Tile 1
        color: "#ffffff",
        fontFamily:
          "SF Pro Text, -apple-system, BlinkMacSystemFont, 'Inter Variable', system-ui, sans-serif",
      }}
      className="relative flex flex-col justify-between p-20 box-border overflow-hidden select-none border border-white/10"
    >
      {/* Top Header & Category Tile */}
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white"
              style={{ backgroundColor: "#0066cc" }} // Action Blue pill
            >
              {manifest.eyebrow || "LECCIÓN TÉCNICA"}
            </span>
            {manifest.category && (
              <span className="px-3.5 py-1 rounded-full text-xs font-mono text-[#cccccc] bg-[#2a2a2c] border border-white/10">
                #{manifest.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 font-mono text-sm text-[#cccccc]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2997ff] animate-pulse" />
            <span className="font-semibold text-white">BuildSignal Verified</span>
          </div>
        </div>

        {/* Hero Display Headline (Apple 56px tight tracking) */}
        <h1
          style={{
            fontFamily: "SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: "46px",
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: "-0.28px",
          }}
          className="text-white mt-2"
        >
          {manifest.headline}
        </h1>
      </div>

      {/* Main Content Sections (Editorial museum layout) */}
      <div className="relative z-10 flex flex-col gap-6 my-auto">
        {/* Problem block (Clean tile on #2a2a2c) */}
        <div className="rounded-[18px] p-7 bg-[#2a2a2c] border border-white/10">
          <div className="text-[#ff453a] text-xs font-mono font-semibold uppercase tracking-wider mb-2">
            El Problema Observado
          </div>
          <p className="text-xl text-[#ffffff] leading-relaxed font-normal">
            {manifest.problem}
          </p>
        </div>

        {/* Code Before & After block */}
        {(manifest.codeBefore || manifest.codeAfter) && (
          <div className="rounded-[18px] p-7 bg-[#202022] border border-white/10 font-mono text-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 text-xs text-[#cccccc]">
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
          <div className="flex items-center gap-3 px-6 py-4 rounded-full bg-[#1b2d22]/80 border border-[#30d158]/40">
            <span className="text-[#30d158] text-xl font-bold">✓</span>
            <span className="text-sm font-medium text-white">
              {manifest.result}
            </span>
          </div>
        )}

        {/* Key Takeaway box */}
        <div className="rounded-[18px] p-7 bg-[#2a2a2c] border border-white/10">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#2997ff] mb-2">
            💡 Aprendizaje Clave
          </div>
          <p className="text-2xl font-semibold text-white leading-snug">
            "{manifest.takeaway}"
          </p>
        </div>
      </div>

      {/* Footer Section */}
      <div className="relative z-10 flex items-center justify-between pt-8 border-t border-white/10">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base shadow-sm"
            style={{ backgroundColor: "#0066cc" }}
          >
            {(manifest.authorName || "BS").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-white text-base">
              {manifest.authorName || "Desarrollador"}
            </div>
            <div className="text-xs text-[#cccccc]">
              Build in public with BuildSignal
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-sm text-[#cccccc]">
          <div className="w-7 h-7 rounded-md bg-white text-black font-black text-xs flex items-center justify-center">
            BS
          </div>
          <span className="font-semibold text-white">buildsignal.dev</span>
        </div>
      </div>
    </div>
  );
};
