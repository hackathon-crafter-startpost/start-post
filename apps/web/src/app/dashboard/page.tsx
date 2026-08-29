/* Hallmark · Apple Design Authority Telemetry Dashboard */
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@hackathon-craft-station/backend/convex/_generated/api";
import { Terminal, Activity, FileCode, Clock, ShieldCheck, CheckCircle2, ArrowLeft, Cpu, Filter } from "lucide-react";
import Link from "next/link";

export default function DashboardSessionsPage() {
  const sessions = useQuery(api.sessions.list, { limit: 50 });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const activeSessionId =
    selectedSessionId || (sessions && sessions.length > 0 ? (sessions[0]._id as string) : "");

  const events = useQuery(
    api.events.listBySession,
    activeSessionId ? { sessionId: activeSessionId } : "skip"
  );

  const filteredEvents = React.useMemo(() => {
    if (!events) return [];
    if (filterType === "all") return events;
    return events.filter((e) => e.type === filterType);
  }, [events, filterType]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] pb-32 transition-colors duration-300">
      {/* Top Banner / Hero HUD */}
      <section className="relative pt-12 sm:pt-16 pb-10 sm:pb-12 border-b border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
        <div className="container mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full apple-acrylic-bar text-[12px] font-medium text-[#0066cc] dark:text-[#2997ff] mb-3">
              <Activity className="size-3.5" />
              <span>Telemetría de Agentes en Tiempo Real</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#1d1d1f] dark:text-white font-sans">
              Sesiones de Código & Stream de Eventos
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[#6e6e73] dark:text-[#86868b] mt-2 max-w-xl leading-relaxed">
              Registro continuo e inspección transparente de los eventos capturados por los hooks de Claude Code y Codex con sanitización Zero-Leak.
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
      <main className="container mx-auto px-4 sm:px-8 pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Sessions List (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] sm:text-[12px] font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                Sesiones Registradas ({sessions?.length || 0})
              </span>
              <span className="text-[11px] sm:text-[12px] text-[#30d158] font-medium flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#30d158] animate-pulse" />
                <span>En vivo</span>
              </span>
            </div>

            {!sessions || sessions.length === 0 ? (
              <div className="p-8 apple-acrylic-card text-center text-xs text-[#6e6e73] font-mono">
                No hay sesiones registradas aún.
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[720px] overflow-y-auto pr-1">
                {sessions.map((s) => {
                  const isSelected = activeSessionId === (s._id as string);
                  return (
                    <div
                      key={s._id}
                      onClick={() => setSelectedSessionId(s._id as string)}
                      className={`apple-acrylic-card p-4 sm:p-5 transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-[#0066cc] dark:ring-[#2997ff] scale-[1.01]"
                          : "hover:scale-[1.005]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold uppercase text-[#1d1d1f] dark:text-white">
                          <Cpu className="size-3.5 text-[#0066cc] dark:text-[#2997ff]" />
                          <span>{s.source}</span>
                        </div>
                        <span className="text-[#6e6e73] dark:text-[#86868b] text-[11px] font-mono">
                          {new Date(s.startedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-[#6e6e73] dark:text-[#86868b] mt-1.5 truncate">
                        ID: {s._id}
                      </div>

                      <div className="flex items-center gap-2 mt-3 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#6e6e73] dark:text-white font-mono">
                          <Clock className="size-3" />
                          <span>{s.status}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#30d158]/10 text-[#30d158] font-medium font-mono border border-[#30d158]/20">
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
          <div className="lg:col-span-8 apple-acrylic-card p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2 text-[#1d1d1f] dark:text-white tracking-tight font-sans">
                  <Terminal className="size-4 text-[#0066cc] dark:text-[#2997ff]" />
                  <span>Flujo de Eventos Sanitizados ({filteredEvents.length})</span>
                </h2>
                <span className="text-[11px] font-mono text-[#6e6e73] dark:text-[#86868b] mt-0.5 inline-block">
                  Sesión activa: {activeSessionId || "Sin sesión"}
                </span>
              </div>

              {/* Event Type Filter */}
              <div className="apple-segmented-track overflow-x-auto py-1 max-w-full">
                {["all", "test_passed", "test_failed", "file_changed", "tool_use"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1 text-[11px] font-medium capitalize transition-all cursor-pointer whitespace-nowrap ${
                      filterType === t
                        ? "apple-segmented-thumb-active"
                        : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
                    }`}
                  >
                    {t === "all" ? "Todos" : t.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3.5 max-h-[650px] overflow-y-auto pr-1">
              {!filteredEvents || filteredEvents.length === 0 ? (
                <div className="text-center py-16 text-xs text-[#6e6e73] font-mono">
                  No hay eventos capturados para el filtro seleccionado.
                </div>
              ) : (
                filteredEvents.map((evt) => {
                  const isFailure = evt.type === "test_failed";
                  const isSuccess = evt.type === "test_passed";
                  const isFile = evt.type === "file_changed";

                  return (
                    <div
                      key={evt._id}
                      className="p-4 sm:p-5 rounded-[18px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] font-mono text-xs flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-semibold px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono ${
                            isFailure
                              ? "bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/20"
                              : isSuccess
                              ? "bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/20"
                              : isFile
                              ? "bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/20"
                              : "bg-[#0066cc]/15 text-[#0066cc] dark:text-[#2997ff] border border-[#0066cc]/20"
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
