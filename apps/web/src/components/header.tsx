/* Hallmark · Apple Design Authority Header */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, Authenticated, Unauthenticated } from "convex/react";
import { api } from "@hackathon-craft-station/backend/convex/_generated/api";
import { CliSetupModal } from "./cli-setup-modal";
import { BufferIntegrationModal } from "./buffer-integration-modal";
import { ModeToggle } from "./mode-toggle";
import { Terminal, Activity, Share2 } from "lucide-react";
import { UserButton, SignInButton } from "@clerk/nextjs";

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBufferModalOpen, setIsBufferModalOpen] = useState(false);
  const bufferSettings = useQuery(api.buffer.getSettings, {});

  const isBufferConnected = Boolean(bufferSettings?.apiKey);

  return (
    <>
      {/* TIER 1: Apple Global Nav (44px, Pure Black #000000 in dark / Frosted White #ffffff in light, 12px font) */}
      <nav className="sticky top-0 z-50 w-full h-[44px] bg-white/80 dark:bg-[#000000]/90 text-[#1d1d1f] dark:text-white flex items-center border-b border-black/[0.08] dark:border-white/[0.08] backdrop-blur-xl select-none transition-colors duration-200">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-8 text-[12px] font-normal tracking-[-0.12px]">
          {/* Left: Brand Mark */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="size-5 rounded-md bg-[#1d1d1f] text-white dark:bg-white dark:text-black font-black text-[10px] flex items-center justify-center font-mono transition-colors">
              BS
            </div>
            <span className="font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
              BuildSignal
            </span>
          </Link>

          {/* Center Links (Apple quiet link style) */}
          <div className="hidden md:flex items-center gap-8 text-[#6e6e73] dark:text-[#d2d2d7]">
            <Link href="/" className="hover:text-[#1d1d1f] dark:hover:text-white transition-colors">
              Estudio de Creación
            </Link>
            <Link href="/connect" className="hover:text-[#1d1d1f] dark:hover:text-white transition-colors flex items-center gap-1.5">
              <Terminal className="size-3 text-[#0066cc] dark:text-[#2997ff]" />
              <span>Conectar Agentes</span>
            </Link>
            <Link href="/dashboard" className="hover:text-[#1d1d1f] dark:hover:text-white transition-colors flex items-center gap-1.5">
              <Activity className="size-3 text-[#0066cc] dark:text-[#2997ff]" />
              <span>Telemetría en Vivo</span>
            </Link>
            <button
              onClick={() => setIsBufferModalOpen(true)}
              className="hover:text-[#1d1d1f] dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="size-3 text-[#0066cc] dark:text-[#2997ff]" />
              <span>Buffer</span>
              {isBufferConnected ? (
                <span className="size-1.5 rounded-full bg-[#30d158]" />
              ) : (
                <span className="text-[10px] text-[#86868b]">(Configurar)</span>
              )}
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setIsBufferModalOpen(true)}
              className="inline-flex md:hidden items-center gap-1 text-[#6e6e73] dark:text-[#d2d2d7] hover:text-[#1d1d1f] dark:hover:text-white transition-colors cursor-pointer"
            >
              <Share2 className="size-3 text-[#0066cc] dark:text-[#2997ff]" />
              <span>Buffer</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 text-[#6e6e73] dark:text-[#d2d2d7] hover:text-[#1d1d1f] dark:hover:text-white transition-colors cursor-pointer"
            >
              <Terminal className="size-3 text-[#0066cc] dark:text-[#2997ff]" />
              <span className="hidden sm:inline">Hooks CLI</span>
            </button>

            <ModeToggle />

            <Authenticated>
              <UserButton />
            </Authenticated>
            <Unauthenticated>
              <SignInButton mode="modal">
                <button className="text-[#0066cc] dark:text-[#2997ff] hover:underline cursor-pointer font-medium">
                  Iniciar Sesión
                </button>
              </SignInButton>
            </Unauthenticated>
          </div>
        </div>
      </nav>

      {/* TIER 2: Apple Frosted Sub-Nav (52px, Parchment #f5f5f7 @ 80% with backdrop-blur) */}
      <header className="sticky top-[44px] z-40 w-full h-[52px] bg-[#f5f5f7]/85 dark:bg-[#1c1c1e]/85 backdrop-blur-xl border-b border-[#e0e0e0] dark:border-white/10 flex items-center transition-colors duration-200">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-8">
          {/* Sub-nav Category Title in SF Pro Display 21px / 600 */}
          <div className="flex items-center gap-3">
            <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[0.231px] text-[#1d1d1f] dark:text-white leading-none">
              Observabilidad Creativa
            </h2>
            <span className="hidden sm:inline-block text-[11px] font-mono text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider">
              para Desarrolladores
            </span>
          </div>

          {/* Sub-nav Primary Pill Action CTA */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsBufferModalOpen(true)}
              className="apple-btn-secondary py-1.5 px-3 text-[13px] sm:text-[14px] flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="size-3.5 text-[#0066cc] dark:text-[#2997ff]" />
              <span>{isBufferConnected ? "Buffer Conectado" : "Conectar Buffer"}</span>
            </button>

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

      {/* Buffer Integration Modal */}
      <BufferIntegrationModal
        isOpen={isBufferModalOpen}
        onClose={() => setIsBufferModalOpen(false)}
      />
    </>
  );
}

