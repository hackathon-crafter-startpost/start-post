"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, Authenticated, Unauthenticated } from "convex/react";
import { api } from "@hackathon-craft-station/backend/convex/_generated/api";
import { CliSetupModal } from "./cli-setup-modal";
import { Sparkles, Terminal, Activity, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { UserButton, SignInButton } from "@clerk/nextjs";

export default function Header() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const seedDemo = useMutation(api.demo.seedOratoriaDemoSession);

  const handleRunDemo = async () => {
    try {
      setIsSeeding(true);
      await seedDemo();
      toast.success("¡Sesión OratorIA simulada con éxito!", {
        description: "Momento de alto valor educativo detectado, post generado e imagen lista.",
      });
    } catch (err: any) {
      toast.error("Error al simular demo: " + (err?.message || ""));
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <>
      {/* TIER 1: Apple Global Nav (44px, Pure Black #000000, 12px font) */}
      <nav className="sticky top-0 z-50 w-full h-[44px] bg-[#000000] text-white flex items-center border-b border-white/[0.08]">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-8 text-[12px] font-normal tracking-[-0.12px]">
          {/* Left: Brand Mark */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="size-5 rounded-md bg-white text-black font-black text-[10px] flex items-center justify-center">
              BS
            </div>
            <span className="font-semibold text-white tracking-tight">
              BuildSignal
            </span>
          </Link>

          {/* Center Links (Apple quiet link style) */}
          <div className="hidden md:flex items-center gap-8 text-[#d2d2d7]">
            <Link href="/" className="hover:text-white transition-colors">
              Estudio de Contenido
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Activity className="size-3 text-[#2997ff]" />
              <span>Telemetría en Vivo</span>
            </Link>
            <span className="text-[#7a7a7a] flex items-center gap-1">
              <ShieldCheck className="size-3 text-[#2997ff]" />
              <span>Zero-Leak Local</span>
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 text-[#d2d2d7] hover:text-white transition-colors cursor-pointer"
            >
              <Terminal className="size-3" />
              <span className="hidden sm:inline">Hooks CLI</span>
            </button>

            <Authenticated>
              <UserButton />
            </Authenticated>
            <Unauthenticated>
              <SignInButton mode="modal">
                <button className="text-[#2997ff] hover:underline cursor-pointer">
                  Iniciar Sesión
                </button>
              </SignInButton>
            </Unauthenticated>
          </div>
        </div>
      </nav>

      {/* TIER 2: Apple Frosted Sub-Nav (52px, Parchment #f5f5f7 @ 80% with backdrop-blur) */}
      <header className="sticky top-[44px] z-40 w-full h-[52px] bg-[#f5f5f7]/80 dark:bg-[#272729]/80 backdrop-blur-xl border-b border-[#e0e0e0] dark:border-white/10 flex items-center">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-8">
          {/* Sub-nav Category Title in SF Pro Display 21px / 600 */}
          <div className="flex items-center gap-3">
            <h2 className="text-[21px] font-semibold tracking-[0.231px] text-[#1d1d1f] dark:text-white leading-none">
              Observabilidad Creativa
            </h2>
            <span className="hidden sm:inline-block text-[11px] font-mono text-[#7a7a7a] dark:text-[#cccccc] uppercase tracking-wider">
              para Desarrolladores
            </span>
          </div>

          {/* Sub-nav Primary Pill Action CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunDemo}
              disabled={isSeeding}
              className="inline-flex items-center gap-2 bg-[#0066cc] hover:bg-[#0071e3] text-white rounded-full px-4 py-1.5 text-[14px] font-normal tracking-[-0.224px] transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Sparkles className={`size-3.5 ${isSeeding ? "animate-spin" : ""}`} />
              <span>{isSeeding ? "Generando..." : "Demo OratorIA"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* CLI Setup Modal */}
      <CliSetupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
