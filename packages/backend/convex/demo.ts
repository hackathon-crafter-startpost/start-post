import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedOratoriaDemoSession = mutation({
  args: {},
  handler: async (ctx) => {
    const sessionId = `demo_oratoria_${Date.now()}`;
    const installationId = "demo_installation_local";

    // 1. Create Session
    await ctx.db.insert("sessions", {
      sessionId,
      installationId,
      source: "claude-code",
      status: "completed",
      startedAt: Date.now() - 300000,
      endedAt: Date.now(),
      analysisStatus: "analyzed",
      eventCount: 4,
    });

    // 2. Insert Events
    const now = Date.now();
    const demoEvents = [
      {
        sessionId,
        eventId: `evt_demo_1_${now}`,
        type: "user_prompt",
        summary: "Investigar tasa alta de falsos positivos en el detector de muletillas de voz",
        payload: {
          prompt: "The audio speech filler word detector is having a high false positive rate (42%) during short vocal segments. Why is it detecting filler words when silence or background noise occurs?",
        },
        timestamp: now - 240000,
      },
      {
        sessionId,
        eventId: `evt_demo_2_${now}`,
        type: "test_failed",
        summary: "Ejecución de test de precisión espectral",
        payload: {
          command: "pnpm --filter audio-engine test",
          output: "FAIL test/speech-detector.test.ts\n  ✕ Should not trigger filler detection on short audio clips\n    Expected false positive rate <= 5%, received 42.8%",
          exitCode: 1,
        },
        timestamp: now - 180000,
      },
      {
        sessionId,
        eventId: `evt_demo_3_${now}`,
        type: "file_changed",
        summary: "Corrección de smoothingTimeConstant en AnalyserNode",
        payload: {
          filePath: "src/audio/spectrum-analyser.ts",
          codeBefore: "analyser.smoothingTimeConstant = 0.8; // Web Audio default blurs transient peaks",
          codeAfter: "analyser.smoothingTimeConstant = 0.0; // Disabled smoothing for crisp FFT slices",
          diff: "- analyser.smoothingTimeConstant = 0.8;\n+ analyser.smoothingTimeConstant = 0.0;",
        },
        timestamp: now - 90000,
      },
      {
        sessionId,
        eventId: `evt_demo_4_${now}`,
        type: "test_passed",
        summary: "Tests de regresión aprobados con 0 falsos positivos",
        payload: {
          command: "pnpm --filter audio-engine test",
          output: "PASS test/speech-detector.test.ts (12/12 passed)\n  ✓ Precision score: 99.4%\n  ✓ False positive rate: 0.0%",
          exitCode: 0,
        },
        timestamp: now - 30000,
      },
    ];

    for (const evt of demoEvents) {
      await ctx.db.insert("events", evt);
    }

    // 3. Create Moment
    const title = "El error de suavizado en Web Audio API";
    const problem = "El detector de muletillas arrojaba 40% de falsos positivos en grabaciones cortas.";
    const discovery = "Web Audio AnalyserNode tiene smoothingTimeConstant = 0.8 por defecto, promediando espectros entre frames consecutivos y distorsionando transitorios rápidos.";
    const solution = "Desactivar el suavizado temporal (smoothingTimeConstant = 0.0) y ampliar la ventana de análisis espectral.";
    const lesson = "Antes de culpar a tu algoritmo o modelo, audita el preprocesamiento por defecto de la API del navegador.";

    const momentId = await ctx.db.insert("moments", {
      sessionId,
      category: "bug_fix",
      title,
      problem,
      discovery,
      solution,
      lesson,
      score: 92,
      scoreBreakdown: {
        problem: 23,
        lesson: 24,
        reuse: 19,
        evidence: 15,
        clarity: 14,
        penalty: 0,
      },
      evidenceEventIds: [demoEvents[1].eventId, demoEvents[3].eventId],
      sensitivityFlags: [],
      status: "detected",
      createdAt: Date.now(),
    });

    // 4. Create Post Draft
    const hook = `¿Te ha pasado que pasas horas depurando un bug y la causa era una configuración por defecto invisible? 🐛👇`;
    const body = `Hoy durante una sesión de desarrollo me topé con un problema interesante con Web Audio API:

🔴 El Problema:
${problem}

🔍 Lo que descubrí:
${discovery}

🟢 La Solución:
${solution}

💡 El Aprendizaje clave:
${lesson}

Comparte tu experiencia: ¿Has tenido un bug similar con APIs del navegador o librerías externas?`;

    const hashtags = [
      "#SoftwareEngineering",
      "#WebDev",
      "#WebAudio",
      "#Coding",
      "#LearnInPublic",
      "#BuildSignal",
    ];

    const imageManifest = {
      template: "bug-fix",
      headline: title,
      eyebrow: "APRENDIZAJE DE CÓDIGO REAL",
      problem,
      codeBefore: "analyser.smoothingTimeConstant = 0.8; // default",
      codeAfter: "analyser.smoothingTimeConstant = 0.0; // fix",
      result: "Tests aprobados con 0.0% falsos positivos",
      takeaway: lesson,
      accentColor: "#10b981",
      authorName: "Diego",
      category: "bug_fix",
    };

    const postDraftId = await ctx.db.insert("postDrafts", {
      momentId,
      platform: "linkedin",
      hook,
      body,
      takeaway: lesson,
      cta: "¿Te ha sucedido algo similar? Te leo en comentarios 👇",
      hashtags,
      imageManifest,
      status: "ready",
      updatedAt: Date.now(),
    });

    return {
      success: true,
      sessionId,
      momentId,
      postDraftId,
    };
  },
});
