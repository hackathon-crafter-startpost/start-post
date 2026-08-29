import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "../index.css";
import { Geist, Geist_Mono } from "next/font/google";

import Header from "@/components/header";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BuildSignal — Observabilidad Creativa para Desarrolladores",
  description: "Detecta aprendizajes de código en tiempo real y transfórmalos en historias e imágenes 4:5 listas para publicar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-[#0066cc]/20 selection:text-[#0066cc]`}>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#0066cc",
              colorBackground: "#ffffff",
              borderRadius: "1.125rem",
              fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            },
            elements: {
              card: "border border-[#e0e0e0] bg-white shadow-2xl rounded-[18px]",
              headerTitle: "text-[#1d1d1f] font-semibold text-xl tracking-tight",
              headerSubtitle: "text-[#7a7a7a] text-xs",
              socialButtonsBlockButton: "border border-[#e0e0e0] bg-[#f5f5f7] hover:bg-[#e0e0e0] text-[#1d1d1f] rounded-full transition-all",
              formButtonPrimary: "bg-[#0066cc] hover:bg-[#0071e3] text-white font-normal rounded-full shadow-xs transition-all active:scale-95",
              formFieldInput: "border-[#e0e0e0] bg-white text-[#1d1d1f] rounded-full focus:border-[#0071e3] transition-colors",
              footerActionLink: "text-[#0066cc] hover:underline font-medium",
              userButtonAvatarBox: "size-8 rounded-full border border-[#0066cc]/30 shadow-xs",
              userButtonPopoverCard: "border border-[#e0e0e0] bg-white shadow-2xl rounded-[18px]",
              userButtonPopoverActionButton: "hover:bg-[#f5f5f7] rounded-xl text-[#1d1d1f] transition-colors",
              userPreviewMainIdentifier: "text-[#1d1d1f] font-semibold",
              userPreviewSecondaryIdentifier: "text-[#7a7a7a] text-xs font-mono",
            },
          }}
        >
          <Providers>
            <div className="grid grid-rows-[auto_1fr] min-h-screen">
              <Header />
              {children}
            </div>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
