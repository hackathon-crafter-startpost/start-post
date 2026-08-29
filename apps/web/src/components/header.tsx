/* Hallmark · Apple Design Authority Header */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, Authenticated, Unauthenticated } from "convex/react";
import { api } from "@hackathon-craft-station/backend/convex/_generated/api";
import { CliSetupModal } from "./cli-setup-modal";
import { Terminal, Activity, ShieldCheck, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { UserButton, SignInButton } from "@clerk/nextjs";

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* TIER 1: Apple Global Nav (44px, Pure Black #000000, 12px font) */}
      <nav className="sticky top-0 z-50 w-full h-[44px] bg-[#000000] text-white flex items-center border-b border-white/[0.08] select-none">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-8 text-[12px] font-normal tracking-[-0.12px]">
          {/* Left: Brand Mark */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="size-5 rounded-md bg-white text-black font-black text-[10px] flex items-center justify-center font-mono">
              BS
            </div>
            <span className="font-semibold text-white tracking-tight">
              BuildSignal
            </span>
          </Link>

          {/* Center Links (Apple quiet link style) */}
          <div className="hidden md:flex items-center gap-8 text-[#d2d2d7]">
            <Link href="/" className="hover:text-white transition-colors">
              Estudio de Creación
            </Link>
            <Link href="/connect" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Terminal className="size-3 text-[#2997ff]" />
              <span>Conectar Agentes</span>
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Activity className="size-3 text-[#2997ff]" />
              <span>Telemetría en Vivo</span>
            </Link>
            <span className="text-[#7a7a7a] flex items-center gap-1">
              <ShieldCheck className="size-3 text-[#30d158]" />
              <span>Zero-Leak Local</span>
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 text-[#d2d2d7] hover:text-white transition-colors cursor-pointer"
            >
              <Terminal className="size-3 text-[#2997ff]" />
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
            <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[0.231px] text-[#1d1d1f] dark:text-white leading-none">
              Observabilidad Creativa
            </h2>
            <span className="hidden sm:inline-block text-[11px] font-mono text-[#7a7a7a] dark:text-[#cccccc] uppercase tracking-wider">
              para Desarrolladores
            </span>
          </div>

          {/* Sub-nav Primary Pill Action CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="apple-btn-primary py-1.5 px-4 text-[13px] sm:text-[14px] flex items-center gap-2 cursor-pointer"
            >
              <Terminal className="size-3.5 text-[#2997ff]" />
              <span>Conectar CLI</span>
            </button>
          </div>
        </div>
      </header>

      {/* CLI Setup Modal */}
      <CliSetupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
