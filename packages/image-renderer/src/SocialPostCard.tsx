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
  const author = manifest.authorName || "Desarrollador";
  const category = manifest.category || "bug_fix";
  const hasMetrics = Array.isArray(manifest.metrics) && manifest.metrics.length > 0;
  const hasDiagram = Array.isArray(manifest.diagramNodes) && manifest.diagramNodes.length > 0;

  return (
    <div
      id={id}
      style={{
        width: "1080px",
        height: "1350px",
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
        backgroundColor: "#0c0d12",
        color: "#ffffff",
        fontFamily:
          "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter Variable', system-ui, sans-serif",
      }}
      className="relative flex flex-col justify-between p-14 box-border overflow-hidden select-none border border-white/10 shadow-2xl"
    >
      {/* Ambient Lighting & Glow Gradients */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[450px] rounded-full pointer-events-none opacity-45 blur-[120px]"
        style={{
          background: `radial-gradient(circle, ${accent} 0%, rgba(0, 102, 204, 0.4) 40%, transparent 70%)`,
        }}
      />
      <div
        className="absolute -bottom-24 right-0 w-[550px] h-[450px] rounded-full pointer-events-none opacity-25 blur-[100px]"
        style={{
          background: "radial-gradient(circle, #30d158 0%, rgba(48, 209, 88, 0.3) 40%, transparent 70%)",
        }}
      />

      {/* Modern Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* TOP HEADER: Badges & Verification Signal */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white shadow-lg backdrop-blur-md"
            style={{
              backgroundColor: `${accent}dd`,
              border: `1px solid ${accent}`,
              boxShadow: `0 0 20px ${accent}44`,
            }}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>{manifest.eyebrow || "APRENDIZAJE REAL EN CÓDIGO"}</span>
          </div>

          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-medium text-zinc-300 bg-white/[0.06] border border-white/10 backdrop-blur-sm uppercase">
            #{category}
          </span>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30d158] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#30d158]" />
          </span>
          <span className="font-mono text-xs font-semibold text-zinc-200 tracking-tight">
            BuildSignal • Verified
          </span>
        </div>
      </div>

      {/* HEADLINE: Editorial typography */}
      <div className="relative z-10 mt-5 mb-1">
        <h1
          style={{
            fontSize: "42px",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.035em",
          }}
          className="text-white drop-shadow-sm font-sans"
        >
          {manifest.headline}
        </h1>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="relative z-10 flex flex-col gap-4 my-auto">
        {/* The Problem / Challenge */}
        <div className="rounded-[22px] p-5 bg-white/[0.04] border border-white/[0.12] backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-2 text-[#ff453a] text-xs font-mono font-semibold uppercase tracking-wider mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ff453a]" />
            <span>El Desafío / Lo que parecía imposible</span>
          </div>
          <p className="text-lg text-zinc-100 leading-relaxed font-normal">
            {manifest.problem}
          </p>
        </div>

        {/* Visual Metric Infographics if present */}
        {hasMetrics && manifest.metrics && (
          <div className="grid grid-cols-2 gap-3">
            {manifest.metrics.map((m, idx) => (
              <div
                key={idx}
                className="p-4 rounded-[20px] bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col gap-1"
              >
                <div className="text-xs font-mono uppercase text-zinc-400 font-medium">
                  {m.label}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-mono text-[#ff453a] line-through opacity-80">
                    {m.before}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">→</span>
                  <span className="text-xl font-bold font-mono text-[#30d158]">
                    {m.after}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Visual Architecture Diagram Flow if present */}
        {hasDiagram && manifest.diagramNodes && (
          <div className="p-4 rounded-[20px] bg-[#07080a] border border-white/[0.12] flex items-center justify-between gap-2 overflow-hidden font-mono text-xs">
            {manifest.diagramNodes.map((node, idx) => (
              <React.Fragment key={idx}>
                <div className="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-zinc-200 text-center font-medium shadow-sm">
                  {node}
                </div>
                {idx < manifest.diagramNodes!.length - 1 && (
                  <span className="text-[#0066cc] font-bold text-base">➔</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* IDE Diff Window */}
        {(manifest.codeBefore || manifest.codeAfter) && (
          <div className="rounded-[22px] overflow-hidden bg-[#07080a] border border-white/[0.14] shadow-2xl font-mono text-sm">
            <div className="flex items-center justify-between px-5 py-3 bg-white/[0.03] border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                <span className="text-xs text-zinc-400 font-mono ml-2">
                  solution.ts • Diff Verificado
                </span>
              </div>

              <span className="text-[11px] font-semibold text-[#30d158] bg-[#30d158]/10 px-2.5 py-0.5 rounded-full border border-[#30d158]/20">
                Tests 100% OK
              </span>
            </div>

            <div className="p-4 flex flex-col gap-2">
              {manifest.codeBefore && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#ff453a]/10 border border-[#ff453a]/25 text-[#ffb4b0]">
                  <span className="text-[#ff453a] font-bold select-none text-base leading-none">-</span>
                  <code className="text-[13.5px] leading-relaxed break-all font-mono">
                    {manifest.codeBefore}
                  </code>
                </div>
              )}

              {manifest.codeAfter && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#30d158]/10 border border-[#30d158]/25 text-[#b8f5c4]">
                  <span className="text-[#30d158] font-bold select-none text-base leading-none">+</span>
                  <code className="text-[13.5px] leading-relaxed break-all font-mono font-medium">
                    {manifest.codeAfter}
                  </code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Takeaway & Anti-Imposter Callout */}
        <div
          className="rounded-[22px] p-5 bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-white/[0.14] backdrop-blur-xl shadow-xl relative overflow-hidden"
          style={{
            borderLeft: `5px solid ${accent}`,
          }}
        >
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#2997ff] mb-1">
            <span>💡 Lección & Recordatorio</span>
          </div>
          <p className="text-xl font-semibold text-white leading-snug tracking-tight">
            "{manifest.takeaway}"
          </p>
        </div>
      </div>

      {/* FOOTER SECTION: Author Profile & Signature */}
      <div className="relative z-10 flex items-center justify-between pt-5 border-t border-white/[0.12]">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base shadow-lg ring-2 ring-white/20"
            style={{
              background: `linear-gradient(135deg, ${accent}, #003366)`,
            }}
          >
            {author.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-white text-base flex items-center gap-1.5">
              <span>{author}</span>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0066cc] text-white text-[10px]">
                ✓
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-medium">
              Software Engineer • #LearnInPublic
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2.5 backdrop-blur-md shadow-sm">
            <div className="w-6 h-6 rounded-md bg-white text-black font-black text-xs flex items-center justify-center font-mono">
              BS
            </div>
            <span className="font-semibold text-white text-sm tracking-tight font-mono">
              buildsignal.dev
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
