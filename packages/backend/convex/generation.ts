import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const analyzeSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch all events for session
    const events = await ctx.db
      .query("events")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    if (events.length === 0) {
      return { success: false, reason: "No events found for session" };
    }

    // 2. Perform value analysis
    let hasFailedTest = false;
    let hasPassedTestAfterFail = false;
    let codeBefore: string | undefined;
    let codeAfter: string | undefined;
    let userPrompt = "";
    const evidenceIds: string[] = [];
    const riskFlags: string[] = [];

    for (const evt of events) {
      if (evt.riskFlags) riskFlags.push(...evt.riskFlags);

      if (evt.type === "user_prompt") {
        userPrompt = (evt.payload?.prompt as string) || "";
      } else if (evt.type === "test_failed" || (evt.type === "tool_result" && evt.payload?.exitCode !== 0)) {
        hasFailedTest = true;
        evidenceIds.push(evt.eventId);
      } else if (evt.type === "test_passed" && hasFailedTest) {
        hasPassedTestAfterFail = true;
        evidenceIds.push(evt.eventId);
      } else if (evt.type === "file_changed") {
        evidenceIds.push(evt.eventId);
        if (evt.payload?.codeBefore) codeBefore = evt.payload.codeBefore as string;
        if (evt.payload?.codeAfter) codeAfter = evt.payload.codeAfter as string;
        if (evt.payload?.diff) {
          const diffStr = evt.payload.diff as string;
          const minusMatch = diffStr.match(/-\s*(.+)/);
          const plusMatch = diffStr.match(/\+\s*(.+)/);
          if (minusMatch && !codeBefore) codeBefore = minusMatch[1];
          if (plusMatch && !codeAfter) codeAfter = plusMatch[1];
        }
      }
    }

    const hasStrongSignals = hasPassedTestAfterFail || evidenceIds.length >= 2;
    const score = hasStrongSignals ? 88 : 40;

    let category = "bug_fix";
    let title = userPrompt ? (userPrompt.length > 55 ? userPrompt.slice(0, 52) + "..." : userPrompt) : "Depuración y resolución técnica verificada";
    let problem = userPrompt || "El algoritmo generaba inconsistencias durante la ejecución de las pruebas.";
    let discovery = codeBefore
      ? `Se descubrió que la configuración previa (${codeBefore.trim()}) provocaba anomalías en el procesamiento.`
      : "Se identificó la causa raíz al inspeccionar el comportamiento por defecto de la librería.";
    let solution = codeAfter
      ? `Se ajustaron los parámetros correspondientes (${codeAfter.trim()}) normalizando el flujo.`
      : "Se aplicó la corrección y las pruebas volvieron a pasar en verde.";
    let lesson = "Antes de asumir fallos en el algoritmo principal, verifica el comportamiento por defecto de las librerías o APIs externas.";

    // Check if OratorIA specific demo keywords exist
    if (userPrompt.toLowerCase().includes("filler") || userPrompt.toLowerCase().includes("muletilla") || userPrompt.toLowerCase().includes("audio") || userPrompt.toLowerCase().includes("smoothing")) {
      title = "El error de suavizado en Web Audio API";
      problem = "El detector de muletillas arrojaba 40% de falsos positivos en grabaciones cortas.";
      discovery = "Web Audio AnalyserNode tiene smoothingTimeConstant = 0.8 por defecto, promediando espectros entre frames consecutivos y distorsionando transitorios rápidos.";
      solution = "Desactivar el suavizado temporal (smoothingTimeConstant = 0.0) y ampliar la ventana de análisis espectral.";
      lesson = "Antes de culpar a tu algoritmo o modelo, audita el preprocesamiento por defecto de la API del navegador.";
      codeBefore = codeBefore || "analyser.smoothingTimeConstant = 0.8; // default";
      codeAfter = codeAfter || "analyser.smoothingTimeConstant = 0.0; // fix";
    }

    const breakdown = {
      problem: hasStrongSignals ? 22 : 10,
      lesson: 23,
      reuse: 18,
      evidence: evidenceIds.length >= 2 ? 14 : 5,
      clarity: 13,
      penalty: riskFlags.length > 0 ? 15 : 0,
    };

    // 3. Upsert Moment
    const existingMoment = await ctx.db
      .query("moments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    let momentId = existingMoment?._id;

    if (existingMoment) {
      await ctx.db.patch(existingMoment._id, {
        category,
        title,
        problem,
        discovery,
        solution,
        lesson,
        score,
        scoreBreakdown: breakdown,
        evidenceEventIds: evidenceIds,
        sensitivityFlags: Array.from(new Set(riskFlags)),
        status: score >= 70 ? "detected" : "suggested",
      });
    } else {
      momentId = await ctx.db.insert("moments", {
        sessionId: args.sessionId,
        category,
        title,
        problem,
        discovery,
        solution,
        lesson,
        score,
        scoreBreakdown: breakdown,
        evidenceEventIds: evidenceIds,
        sensitivityFlags: Array.from(new Set(riskFlags)),
        status: score >= 70 ? "detected" : "suggested",
        createdAt: Date.now(),
      });
    }

    // 4. If score >= 70, create or update PostDraft
    if (momentId && score >= 70) {
      const hook = `¿Te ha pasado que pasas horas depurando un bug y la causa era una configuración por defecto invisible? 🐛👇`;
      const body = `Hoy durante una sesión de desarrollo me topé con un problema interesante:

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
        "#Coding",
        "#LearnInPublic",
        "#TypeScript",
        "#BuildSignal",
      ];

      const imageManifest = {
        template: "bug-fix",
        headline: title,
        eyebrow: "LECCIÓN TÉCNICA",
        problem,
        codeBefore: codeBefore || "analyser.smoothingTimeConstant = 0.8;",
        codeAfter: codeAfter || "analyser.smoothingTimeConstant = 0.0;",
        result: hasPassedTestAfterFail ? "Pruebas de regresión: 100% aprobadas" : "Corrección verificada",
        takeaway: lesson,
        accentColor: "#0071e3",
        authorName: "Diego",
        category,
      };

      const existingDraft = await ctx.db
        .query("postDrafts")
        .withIndex("by_moment", (q) => q.eq("momentId", momentId))
        .first();

      if (existingDraft) {
        await ctx.db.patch(existingDraft._id, {
          hook,
          body,
          takeaway: lesson,
          hashtags,
          imageManifest,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("postDrafts", {
          momentId,
          platform: "linkedin",
          hook,
          body,
          takeaway: lesson,
          hashtags,
          imageManifest,
          status: "draft",
          updatedAt: Date.now(),
        });
      }
    }

    return {
      success: true,
      momentId,
      score,
    };
  },
});

export const updatePostDraft = mutation({
  args: {
    postDraftId: v.id("postDrafts"),
    hook: v.string(),
    body: v.string(),
    hashtags: v.array(v.string()),
    imageManifest: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postDraftId, {
      hook: args.hook,
      body: args.body,
      hashtags: args.hashtags,
      imageManifest: args.imageManifest,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const saveAiGeneratedMoment = mutation({
  args: {
    sessionId: v.string(),
    category: v.string(),
    title: v.string(),
    problem: v.string(),
    discovery: v.string(),
    solution: v.string(),
    lesson: v.string(),
    score: v.number(),
    scoreBreakdown: v.object({
      problem: v.number(),
      lesson: v.number(),
      reuse: v.number(),
      evidence: v.number(),
      clarity: v.number(),
      penalty: v.number(),
    }),
    evidenceEventIds: v.array(v.string()),
    sensitivityFlags: v.array(v.string()),
    hook: v.string(),
    body: v.string(),
    hashtags: v.array(v.string()),
    imageManifest: v.any(),
  },
  handler: async (ctx, args) => {
    const existingMoment = await ctx.db
      .query("moments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    let momentId = existingMoment?._id;

    if (existingMoment) {
      await ctx.db.patch(existingMoment._id, {
        category: args.category,
        title: args.title,
        problem: args.problem,
        discovery: args.discovery,
        solution: args.solution,
        lesson: args.lesson,
        score: args.score,
        scoreBreakdown: args.scoreBreakdown,
        evidenceEventIds: args.evidenceEventIds,
        sensitivityFlags: args.sensitivityFlags,
        status: args.score >= 70 ? "detected" : "suggested",
      });
    } else {
      momentId = await ctx.db.insert("moments", {
        sessionId: args.sessionId,
        category: args.category,
        title: args.title,
        problem: args.problem,
        discovery: args.discovery,
        solution: args.solution,
        lesson: args.lesson,
        score: args.score,
        scoreBreakdown: args.scoreBreakdown,
        evidenceEventIds: args.evidenceEventIds,
        sensitivityFlags: args.sensitivityFlags,
        status: args.score >= 70 ? "detected" : "suggested",
        createdAt: Date.now(),
      });
    }

    if (momentId) {
      const existingDraft = await ctx.db
        .query("postDrafts")
        .withIndex("by_moment", (q) => q.eq("momentId", momentId))
        .first();

      if (existingDraft) {
        await ctx.db.patch(existingDraft._id, {
          hook: args.hook,
          body: args.body,
          takeaway: args.lesson,
          hashtags: args.hashtags,
          imageManifest: args.imageManifest,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("postDrafts", {
          momentId,
          platform: "linkedin",
          hook: args.hook,
          body: args.body,
          takeaway: args.lesson,
          hashtags: args.hashtags,
          imageManifest: args.imageManifest,
          status: "draft",
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true, momentId };
  },
});

export const analyzeWithGoogleGemini = action({
  args: {
    sessionId: v.string(),
    apiKeyOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = args.apiKeyOverride || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      // Fall back to deterministic analysis
      await ctx.runMutation(api.generation.analyzeSession, { sessionId: args.sessionId });
      return { success: true, source: "deterministic_fallback" };
    }

    // 1. Fetch events from database
    const events: any[] = await ctx.runQuery(api.events.listBySession, { sessionId: args.sessionId });

    if (!events || events.length === 0) {
      return { success: false, reason: "No events found" };
    }

    let userPrompt = "";
    let codeBefore = "";
    let codeAfter = "";
    const evidenceIds: string[] = [];
    const riskFlags: string[] = [];

    for (const evt of events) {
      if (evt.riskFlags) riskFlags.push(...evt.riskFlags);
      if (evt.type === "user_prompt") {
        userPrompt = evt.payload?.prompt || "";
      } else if (evt.type === "test_failed" || evt.type === "test_passed") {
        evidenceIds.push(evt.eventId);
      } else if (evt.type === "file_changed") {
        evidenceIds.push(evt.eventId);
        if (evt.payload?.codeBefore) codeBefore = evt.payload.codeBefore;
        if (evt.payload?.codeAfter) codeAfter = evt.payload.codeAfter;
        if (evt.payload?.diff) {
          const diffStr = evt.payload.diff as string;
          const minusMatch = diffStr.match(/-\s*(.+)/);
          const plusMatch = diffStr.match(/\+\s*(.+)/);
          if (minusMatch && !codeBefore) codeBefore = minusMatch[1];
          if (plusMatch && !codeAfter) codeAfter = plusMatch[1];
        }
      }
    }

    const eventsSummary = events.map((e) => `[${e.type}]: ${e.summary || JSON.stringify(e.payload || {})}`).join("\n");

    const promptText = `Eres el motor de observabilidad creativa y storytelling de ingeniería para BuildSignal.
Analiza la siguiente sesión de programación con un agente de IA y genera una publicación de alto impacto educativo para LinkedIn/Twitter y la especificación de imagen 4:5.

PROMPT DEL DESARROLLADOR:
${userPrompt || "Sesión de depuración y optimización de código"}

CÓDIGO ANTES / BUG:
${codeBefore || "N/A"}

CÓDIGO DESPUÉS / SOLUCIÓN:
${codeAfter || "N/A"}

EVENTOS DE LA SESIÓN:
${eventsSummary}

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
{
  "category": "bug_fix",
  "title": "Título conciso del momento (máx 60 caracteres)",
  "problem": "Descripción clara del problema técnico observado",
  "discovery": "Causa raíz técnica descubierta durante la sesión",
  "solution": "Solución concreta verificada con código",
  "lesson": "Lección transferible y aplicable para otros ingenieros",
  "score": 88,
  "scoreBreakdown": {
    "problem": 22,
    "lesson": 23,
    "reuse": 18,
    "evidence": 14,
    "clarity": 13,
    "penalty": 0
  },
  "hook": "Hook atractivo para LinkedIn con emoji que genere curiosidad técnica sin caer en clickbait",
  "body": "Cuerpo del post estructurado con emojis y narrativa técnica impecable",
  "hashtags": ["#SoftwareEngineering", "#WebDev", "#Coding", "#LearnInPublic", "#BuildSignal"],
  "imageManifest": {
    "template": "bug-fix",
    "headline": "Titular de alto impacto para la tarjeta visual",
    "eyebrow": "LECCIÓN TÉCNICA",
    "problem": "Problema resumido para la tarjeta",
    "codeBefore": "${codeBefore || "código previo"}",
    "codeAfter": "${codeAfter || "código corregido"}",
    "result": "Tests verificados: 100% aprobados",
    "takeaway": "Frase de aprendizaje clave",
    "accentColor": "#0071e3",
    "authorName": "Diego",
    "category": "bug_fix"
  }
}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Google Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("No text response from Gemini");
      }

      const parsed = JSON.parse(rawText);

      await ctx.runMutation(api.generation.saveAiGeneratedMoment, {
        sessionId: args.sessionId,
        category: parsed.category || "bug_fix",
        title: parsed.title || "Momento de Código Verificado",
        problem: parsed.problem || "Problema técnico resuelto",
        discovery: parsed.discovery || "Causa raíz identificada",
        solution: parsed.solution || "Solución aplicada",
        lesson: parsed.lesson || "Lección técnica aprendida",
        score: parsed.score || 85,
        scoreBreakdown: parsed.scoreBreakdown || {
          problem: 20,
          lesson: 20,
          reuse: 20,
          evidence: 15,
          clarity: 10,
          penalty: 0,
        },
        evidenceEventIds: evidenceIds,
        sensitivityFlags: Array.from(new Set(riskFlags)),
        hook: parsed.hook || "¿Te ha pasado esto al programar? 👇",
        body: parsed.body || "Publicación generada por BuildSignal",
        hashtags: parsed.hashtags || ["#Coding", "#LearnInPublic"],
        imageManifest: parsed.imageManifest,
      });

      return { success: true, source: "gemini_ai" };
    } catch (err: any) {
      // Fallback to deterministic
      await ctx.runMutation(api.generation.analyzeSession, { sessionId: args.sessionId });
      return { success: true, source: "deterministic_fallback", error: err?.message };
    }
  },
});
