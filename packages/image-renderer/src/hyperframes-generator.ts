import type { ImageManifest } from "@hackathon-craft-station/shared-types";

export interface GenerateCompositionOptions {
  manifest: ImageManifest;
  aspectRatio?: "4:5" | "16:9" | "9:16";
  durationSeconds?: number;
}

export function generateHyperFramesHtml(options: GenerateCompositionOptions): string {
  const { manifest, aspectRatio = "4:5", durationSeconds = 9 } = options;
  const accent = manifest.accentColor || "#0071e3";

  let width = 1080;
  let height = 1350;

  if (aspectRatio === "16:9") {
    width = 1920;
    height = 1080;
  } else if (aspectRatio === "9:16") {
    width = 1080;
    height = 1920;
  }

  const headline = escapeHtml(manifest.headline || "Depuración y Solución Técnica");
  const eyebrow = escapeHtml(manifest.eyebrow || "LECCIÓN DE INGENIERÍA");
  const problem = escapeHtml(manifest.problem || "Comportamiento inesperado detectado durante los tests.");
  const codeBefore = escapeHtml(manifest.codeBefore || "// Código previo con fallo");
  const codeAfter = escapeHtml(manifest.codeAfter || "// Código corregido y optimizado");
  const result = escapeHtml(manifest.result || "12/12 pruebas de regresión aprobadas");
  const takeaway = escapeHtml(manifest.takeaway || "Audita siempre el comportamiento por defecto de las librerías externas.");
  const author = escapeHtml(manifest.authorName || "Diego");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${headline} - HyperFrames</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #000000;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter Variable", system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }
    #main {
      width: ${width}px;
      height: ${height}px;
      position: relative;
      background: #18181a;
      overflow: hidden;
      border-radius: 0px;
    }
    .gradient-glow {
      position: absolute;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      width: 700px;
      height: 350px;
      background: radial-gradient(circle, ${accent}33 0%, transparent 70%);
      pointer-events: none;
    }
    .clip {
      position: absolute;
      inset: 0;
      padding: ${aspectRatio === "16:9" ? "60px 80px" : "80px 60px"};
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      opacity: 0;
      transition: opacity 0.4s ease, transform 0.4s ease;
      pointer-events: none;
    }
    .clip.active {
      opacity: 1;
      pointer-events: auto;
    }

    /* Apple Glass Card */
    .glass-card {
      background: rgba(39, 39, 41, 0.85);
      backdrop-filter: blur(40px) saturate(190%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 20px 40px rgba(0, 0, 0, 0.5);
      border-radius: 24px;
      padding: 32px;
    }

    .pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: ${accent};
      color: #ffffff;
    }

    .headline {
      font-size: ${aspectRatio === "16:9" ? "42px" : "46px"};
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin-top: 16px;
      color: #ffffff;
    }

    /* Terminal Chrome */
    .terminal-window {
      background: #121214;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
      font-family: "SF Mono", "Fira Code", monospace;
    }
    .terminal-header {
      background: #1e1e20;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .terminal-dots {
      display: flex;
      gap: 8px;
    }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot.red { background: #ff5f56; }
    .dot.yellow { background: #ffbd2e; }
    .dot.green { background: #27c93f; }

    .diff-line {
      padding: 12px 20px;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .diff-line.removed {
      background: rgba(255, 69, 58, 0.15);
      color: #ff9b9b;
      border-left: 4px solid #ff453a;
    }
    .diff-line.added {
      background: rgba(48, 209, 88, 0.15);
      color: #a8f5ba;
      border-left: 4px solid #30d158;
    }
    .cursor {
      display: inline-block;
      width: 8px;
      height: 18px;
      background: ${accent};
      animation: blink 1s infinite;
      vertical-align: middle;
      margin-left: 4px;
    }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

    .footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      color: #86868b;
    }
  </style>
</head>
<body>
  <div
    id="main"
    data-composition-id="buildsignal-hyperframe"
    data-start="0"
    data-duration="${durationSeconds}"
    data-width="${width}"
    data-height="${height}"
  >
    <div class="gradient-glow"></div>

    <!-- BEAT 1: El Problema (0s - 2.8s) -->
    <div id="clip-1" class="clip active" data-start="0" data-duration="3.0" data-hf-id="scene-problem">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="pill-badge">${eyebrow}</span>
          <span style="font-family: monospace; font-size: 13px; color: #86868b;">BuildSignal • Moment</span>
        </div>
        <h1 class="headline">${headline}</h1>
      </div>

      <div class="glass-card" style="margin: auto 0;">
        <div style="color: #ff453a; font-size: 12px; font-weight: 700; font-family: monospace; text-transform: uppercase; margin-bottom: 8px;">
          🔴 El Problema Técnico Observado
        </div>
        <p style="font-size: 20px; line-height: 1.4; color: #ffffff;">
          ${problem}
        </p>
      </div>

      <div class="footer-bar">
        <span>Autor: <strong style="color: #ffffff;">${author}</strong></span>
        <span>Paso 1 de 3: Identificación</span>
      </div>
    </div>

    <!-- BEAT 2: Diff Animado & Solución (2.8s - 6.2s) -->
    <div id="clip-2" class="clip" data-start="2.8" data-duration="3.4" data-hf-id="scene-diff">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="pill-badge" style="background: #30d158;">SOLUCIÓN VERIFICADA</span>
          <span style="font-family: monospace; font-size: 13px; color: #30d158;">✓ ${result}</span>
        </div>
        <h2 style="font-size: 28px; font-weight: 600; margin-top: 12px;">Refactor & Corrección en Código</h2>
      </div>

      <div class="terminal-window" style="margin: auto 0;">
        <div class="terminal-header">
          <div class="terminal-dots">
            <div class="dot red"></div>
            <div class="dot yellow"></div>
            <div class="dot green"></div>
          </div>
          <span style="font-size: 12px; color: #86868b;">diff --git a/source.ts b/source.ts</span>
          <span style="font-size: 11px; color: #30d158;">+1 / -1</span>
        </div>
        <div style="padding: 16px 0;">
          <div class="diff-line removed">
            <span style="color: #ff453a; font-weight: bold;">-</span>
            <code>${codeBefore}</code>
          </div>
          <div class="diff-line added">
            <span style="color: #30d158; font-weight: bold;">+</span>
            <code>${codeAfter}</code>
            <span class="cursor"></span>
          </div>
        </div>
      </div>

      <div class="footer-bar">
        <span>Motor: <strong>Zero-Leak Sanitized</strong></span>
        <span>Paso 2 de 3: Diff Verificado</span>
      </div>
    </div>

    <!-- BEAT 3: Aprendizaje Clave & Takeaway (6.2s - 9.0s) -->
    <div id="clip-3" class="clip" data-start="6.2" data-duration="2.8" data-hf-id="scene-takeaway">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="pill-badge" style="background: ${accent};">💡 APRENDIZAJE CLAVE</span>
          <span style="font-family: monospace; font-size: 13px; color: #2997ff;">BuildSignal Verified</span>
        </div>
        <h2 class="headline" style="font-size: 36px;">Lección de Ingeniería Transferible</h2>
      </div>

      <div class="glass-card" style="margin: auto 0; border-left: 6px solid ${accent};">
        <p style="font-size: 22px; font-style: italic; line-height: 1.45; color: #ffffff;">
          "${takeaway}"
        </p>
      </div>

      <div class="footer-bar">
        <span style="color: #2997ff; font-weight: 600;">Compartido con la comunidad técnica</span>
        <span>Generado por BuildSignal</span>
      </div>
    </div>
  </div>

  <script>
    // HyperFrames Seekable Player Runtime Controller
    const totalDuration = ${durationSeconds};
    const clips = [
      { id: "clip-1", start: 0, end: 2.8 },
      { id: "clip-2", start: 2.8, end: 6.2 },
      { id: "clip-3", start: 6.2, end: 9.0 }
    ];

    function updateTime(currentTime) {
      clips.forEach(c => {
        const el = document.getElementById(c.id);
        if (!el) return;
        if (currentTime >= c.start && currentTime < c.end) {
          el.classList.add("active");
        } else {
          el.classList.remove("active");
        }
      });
    }

    // Expose HyperFrames Seek API
    window.seek = function(time) {
      updateTime(Math.min(totalDuration, Math.max(0, time)));
    };

    window.addEventListener("message", (event) => {
      if (event.data && typeof event.data.seek === "number") {
        window.seek(event.data.seek);
      }
    });
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
