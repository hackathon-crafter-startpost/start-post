"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@hackathon-craft-station/backend/convex/_generated/api";
import { Terminal, Activity, FileCode, Clock, ShieldCheck, CheckCircle2, ArrowLeft, Cpu } from "lucide-react";
import Link from "next/link";

export default function DashboardSessionsPage() {
  const sessions = useQuery(api.sessions.list, { limit: 50 });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const activeSessionId =
    selectedSessionId || (sessions && sessions.length > 0 ? (sessions[0]._id as string) : "");

  const events = useQuery(
    api.events.listBySession,
    activeSessionId ? { sessionId: activeSessionId } : "skip"
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] pb-32">
      {/* Top Banner */}
      <section className="relative pt-16 pb-16 border-b border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-gradient-to-b from-[#0071e3]/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="container mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full apple-acrylic-bar text-[12px] font-medium text-[#0071e3] dark:text-[#2997ff] mb-3">
              <Activity className="size-3.5" />
              <span>Telemetría de Agentes en Vivo</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-[#1d1d1f] dark:text-white">
              Sesiones de Código & Stream de Eventos
            </h1>
            <p className="text-[16px] text-[#6e6e73] dark:text-[#86868b] mt-1.5 max-w-xl">
              Registro continuo y transparente de los eventos capturados por los hooks de Claude Code y Codex.
            </p>
          </div>

          <Link
            href="/"
            className="apple-btn-secondary text-[14px]"
          >
            <ArrowLeft className="size-3.5" />
            <span>Volver al Estudio</span>
          </Link>
        </div>
      </section>

      {/* Main Content Grid */}
      <main className="container mx-auto px-4 sm:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sessions List (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                Sesiones Registradas ({sessions?.length || 0})
              </span>
              <span className="text-[12px] text-[#0071e3] dark:text-[#2997ff] font-medium flex items-center gap-1">
                <span className="size-2 rounded-full bg-[#30d158] animate-pulse" />
                <span>Activo</span>
              </span>
            </div>

            {(!sessions || sessions.length === 0) ? (
              <div className="p-8 apple-acrylic-card text-center text-xs text-[#6e6e73]">
                No hay sesiones registradas aún.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 max-h-[700px] overflow-y-auto pr-1">
                {sessions.map((s) => {
                  const isSelected = activeSessionId === (s._id as string);
                  return (
                    <div
                      key={s._id}
                      onClick={() => setSelectedSessionId(s._id as string)}
                      className={`apple-acrylic-card p-5 transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-[#0071e3] dark:ring-[#2997ff] scale-[1.01]"
                          : "hover:scale-[1.005]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold uppercase text-[#1d1d1f] dark:text-white">
                          <Cpu className="size-3.5 text-[#0071e3] dark:text-[#2997ff]" />
                          <span>{s.source}</span>
                        </div>
                        <span className="text-[#6e6e73] dark:text-[#86868b] text-[11px] font-mono">
                          {new Date(s.startedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-[#6e6e73] dark:text-[#86868b] mt-2 truncate">
                        ID: {s._id}
                      </div>

                      <div className="flex items-center gap-2 mt-3 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#6e6e73] dark:text-white">
                          <Clock className="size-3" />
                          <span>{s.status}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#30d158]/10 text-[#30d158] font-medium">
                          <ShieldCheck className="size-3" />
                          <span>Sanitizado</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Real-time Event Stream (8 cols) */}
          <div className="lg:col-span-8 apple-acrylic-card p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <h2 className="font-semibold text-[18px] flex items-center gap-2 text-[#1d1d1f] dark:text-white tracking-tight">
                <Terminal className="size-4 text-[#0071e3] dark:text-[#2997ff]" />
                <span>Flujo de Eventos Sanitizados ({events?.length || 0})</span>
              </h2>
              <span className="text-[11px] font-mono text-[#6e6e73] dark:text-[#86868b] bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full">
                {activeSessionId || "Sin sesión seleccionada"}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3.5 max-h-[650px] overflow-y-auto pr-1">
              {(!events || events.length === 0) ? (
                <div className="text-center py-16 text-xs text-[#6e6e73] font-mono">
                  No hay eventos capturados para la sesión seleccionada.
                </div>
              ) : (
                events.map((evt) => {
                  const isFailure = evt.type === "test_failed";
                  const isSuccess = evt.type === "test_passed";
                  const isFile = evt.type === "file_changed";

                  return (
                    <div
                      key={evt._id}
                      className="p-5 rounded-[18px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] font-mono text-xs flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-semibold px-2.5 py-0.5 rounded-full text-[10px] uppercase ${
                            isFailure
                              ? "bg-[#ff453a]/15 text-[#ff453a]"
                              : isSuccess
                              ? "bg-[#30d158]/15 text-[#30d158]"
                              : isFile
                              ? "bg-[#ff9f0a]/15 text-[#ff9f0a]"
                              : "bg-[#0071e3]/15 text-[#0071e3] dark:text-[#2997ff]"
                          }`}
                        >
                          {evt.type}
                        </span>
                        <span className="text-[10px] text-[#6e6e73] dark:text-[#86868b]">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {evt.summary && (
                        <p className="text-[#1d1d1f] dark:text-white font-sans font-medium text-[14px]">
                          {evt.summary}
                        </p>
                      )}

                      <pre className="p-3.5 rounded-[14px] bg-black/[0.04] dark:bg-[#121214] text-[#1d1d1f] dark:text-[#f5f5f7] overflow-x-auto text-[11px] leading-relaxed border border-black/[0.06] dark:border-white/[0.08]">
                        {JSON.stringify(evt.payload, null, 2)}
                      </pre>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
