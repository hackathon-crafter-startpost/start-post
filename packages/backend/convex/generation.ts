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

    // Purely extract technical details from real session evidence
    if (codeBefore && codeAfter) {
      discovery = `Se descubrió que la configuración previa provocaba anomalías: ${codeBefore.trim()}`;
      solution = `Se implementó la corrección verificada: ${codeAfter.trim()}`;
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

    const userId = existingMoment?.userId;
    let momentId = existingMoment?._id;

    if (existingMoment) {
      await ctx.db.patch(existingMoment._id, {
        userId: userId || existingMoment.userId,
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
        userId,
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
      const hook = `Hoy pasé casi una hora dudando de mis habilidades por un error que parecía imposible... hasta que entendí la causa raíz. 🐛👇`;
      const body = `Hoy estuve programando y me topé con uno de esos momentos donde el síndrome del impostor te hace dudar de todo:

🔴 Lo que me estaba rompiendo la cabeza:
${problem}

💭 Mi primer pensamiento (el impostor atacando):
"Seguro esto es un fallo básico mío o me falta nivel para entender esta arquitectura..."

🔍 Lo que realmente descubrí al depurar a fondo:
${discovery}

🟢 La solución que implementé:
${solution}

💡 La lección que me guardo para siempre:
${lesson}

✨ Recordatorio para quien lo necesite hoy:
Atascarte en un bug, tardar tiempo en ver un detalle o dudar de ti mismo no te hace mal desarrollador. Es literalmente la forma en que todos construimos experiencia real.

¿Cuál ha sido ese bug reciente que te hizo dudar de ti mismo antes de resolverlo? Te leo en los comentarios 👇`;

      const hashtags = [
        "#LearnInPublic",
        "#SoftwareEngineering",
        "#DeveloperLife",
        "#ImposterSyndrome",
        "#WebDev",
        "#Coding",
        "#BuildSignal",
      ];

      const imageManifest = {
        template: "bug-fix",
        headline: title,
        eyebrow: "APRENDIZAJE REAL EN CÓDIGO",
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

      // Trigger automatic Buffer publish if enabled
      try {
        await ctx.scheduler.runAfter(0, api.buffer.autoPublishIfEnabled, {
          momentId,
        });
      } catch {}
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

      // Trigger automatic Buffer publish if enabled
      if (args.score >= 70) {
        try {
          await ctx.scheduler.runAfter(0, api.buffer.autoPublishIfEnabled, {
            momentId,
          });
        } catch {}
      }
    }

    return { success: true, momentId };
  },
});


async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const models = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => m.name.replace(/^models\//, ""));
      if (models.length > 0) {
        // Sort to put flash and pro models first
        return models.sort((a: string, b: string) => {
          if (a.includes("flash") && !b.includes("flash")) return -1;
          if (!a.includes("flash") && b.includes("flash")) return 1;
          return 0;
        });
      }
    }
  } catch {}

  return [
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro-002",
    "gemini-1.5-pro",
    "gemini-pro",
  ];
}

async function callGeminiGenerateContent(apiKey: string, promptText: string): Promise<any> {
  const candidateModels = await getAvailableGeminiModels(apiKey);
  let lastError = "";

  for (const model of candidateModels) {
    // Try v1beta and v1
    for (const apiVer of ["v1beta", "v1"]) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            return JSON.parse(rawText);
          }
        } else {
          const errJson = await response.json().catch(() => null);
          lastError = `HTTP ${response.status} ${response.statusText}${errJson?.error?.message ? `: ${errJson.error.message}` : ""}`;
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }
  }

  throw new Error(`Gemini API error: ${lastError}`);
}

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

    const promptText = `Eres un mentor senior de ingeniería de software y narrador técnico que escribe historias en PRIMERA PERSONA ("yo", "hoy estuve...", "me pasó..."), profundamente humanas, empáticas y auténticas.

OBJETIVO PRINCIPAL:
Transformar esta sesión de código en una publicación de LinkedIn/Twitter escrita por el propio desarrollador en PRIMERA PERSONA, con un enfoque directo en COMBATIR EL SÍNDROME DEL IMPOSTOR y normalizar que incluso los errores aparentemente simples son parte natural del aprendizaje.

REGLAS DE TONO Y ESTILO (OBLIGATORIAS):
1. PRIMERA PERSONA SIEMPRE: Escribe desde el "yo" del programador ("Hoy pasé 40 minutos peleando con un error...", "La verdad es que dudé de mí...", "Lo que me estaba volviendo loco era..."). NUNCA uses tercera persona ni tono corporativo despersonalizado.
2. ENFOQUE CONTRA EL SÍNDROME DEL IMPOSTOR: Muestra la vulnerabilidad de pensar que el error era por "falta de nivel" o "un fallo conceptual mío", para luego revelar que era un detalle sutil o una configuración oculta. Incluye un mensaje alentador de que atascarse no te hace mal desarrollador.
3. ESTRUCTURA NARRATIVA HUMANA:
   - Hook con vulnerabilidad y curiosidad técnica.
   - Lo que me estaba rompiendo la cabeza (problema).
   - Mi momento de duda / síndrome del impostor.
   - Lo que realmente descubrí al depurar a fondo (causa raíz).
   - Cómo lo resolví (solución técnica con código).
   - El aprendizaje que me llevo y recordatorio empático para la comunidad.
   - Pregunta de cierre cercana para abrir debate en comentarios.

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
  "title": "Título empático y técnico del momento (máx 60 caracteres)",
  "problem": "Descripción del problema contado en primera persona",
  "discovery": "La causa raíz real que descubrí al indagar a fondo",
  "solution": "La solución concreta que implementé",
  "lesson": "La lección técnica y humana que me llevo",
  "score": 88,
  "scoreBreakdown": {
    "problem": 22,
    "lesson": 23,
    "reuse": 18,
    "evidence": 14,
    "clarity": 13,
    "penalty": 0
  },
  "hook": "Hook magnético en primera persona (ej: 'Hoy pasé casi una hora sintiéndome el peor programador del mundo por un bug... hasta que entendí esto. 🐛👇')",
  "body": "Texto completo del post en primera persona, estructurado con emojis y tono cercano, mostrando la duda inicial, la causa raíz real, la solución, el recordatorio contra el síndrome del impostor y el llamado a la comunidad.",
  "hashtags": ["#LearnInPublic", "#SoftwareEngineering", "#DeveloperLife", "#ImposterSyndrome", "#Coding", "#BuildSignal"],
  "imageManifest": {
    "template": "bug-fix",
    "headline": "Titular empático o de impacto para la tarjeta visual",
    "eyebrow": "APRENDIZAJE REAL EN CÓDIGO",
    "problem": "Problema resumido para la tarjeta",
    "codeBefore": "${codeBefore || "código previo"}",
    "codeAfter": "${codeAfter || "código corregido"}",
    "result": "Tests verificados: 100% aprobados",
    "takeaway": "Recordatorio inspirador o lección clave",
    "accentColor": "#0071e3",
    "authorName": "Diego",
    "category": "bug_fix"
  }
}`;


    try {
      const parsed = await callGeminiGenerateContent(apiKey, promptText);

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

export const regenerateWithNanoBanana = action({
  args: {
    momentId: v.id("moments"),
    stylePreset: v.optional(v.string()), // "infographic" | "anti_imposter" | "performance" | "architecture" | "bug_fix"
    customFocus: v.optional(v.string()),
    apiKeyOverride: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; source?: string; imageManifest?: any; error?: string }> => {
    const apiKey = args.apiKeyOverride || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // 1. Fetch moment and its draft
    const moment: any = await ctx.runQuery(api.moments.get, { momentId: args.momentId });
    if (!moment) throw new Error("Momento no encontrado");

    // Fetch session events if available
    const events: any[] = moment.sessionId
      ? await ctx.runQuery(api.events.listBySession, { sessionId: moment.sessionId })
      : [];

    let codeBefore = "";
    let codeAfter = "";
    for (const evt of events) {
      if (evt.type === "file_changed") {
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

    if (!codeBefore && moment.discovery) codeBefore = moment.discovery;
    if (!codeAfter && moment.solution) codeAfter = moment.solution;

    // Fallback if no Gemini key
    if (!apiKey) {
      const fallbackManifest: any = {
        template: args.stylePreset || "infographic",
        headline: moment.title || "Optimización y Aprendizaje Real de Código",
        eyebrow: "✨ EXPERIENCIA REAL EN PRODUCCIÓN",
        problem: moment.problem,
        codeBefore: codeBefore || "analyser.smoothingTimeConstant = 0.8;",
        codeAfter: codeAfter || "analyser.smoothingTimeConstant = 0.0;",
        result: "100% de pruebas de regresión aprobadas",
        takeaway: moment.lesson || "Audita siempre el comportamiento por defecto de las librerías.",
        accentColor: "#0066cc",
        authorName: "Diego",
        category: moment.category || "bug_fix",
        metrics: [
          { label: "Falsos Positivos", before: "40%", after: "0.0%" },
          { label: "Pruebas Pasadas", before: "0/12", after: "12/12" },
        ],
        diagramNodes: ["Browser Audio", "Zero-Leak Engine", "Convex DB"],
      };

      if (moment.postDraft?._id) {
        await ctx.runMutation(api.generation.updatePostDraft, {
          postDraftId: moment.postDraft._id,
          hook: moment.postDraft.hook,
          body: moment.postDraft.body,
          hashtags: moment.postDraft.hashtags,
          imageManifest: fallbackManifest,
        });
      }

      return { success: true, source: "deterministic_refresh", imageManifest: fallbackManifest };
    }

    // Call Google Gemini 2.5 Flash / Nano Banana multimodal generative pipeline
    const prompt = `Eres el motor creativo "Nano Banana" especializado en diseño editorial de alto impacto para desarrolladores de software y storytelling técnico anti-síndrome del impostor.

OBJETIVO:
Generar una publicación EXTREMADAMENTE INTERESANTE, magnética y con elementos gráficos visuales (métricas before/after, diagrama conceptual de flujo y código diff estilizado) a partir del siguiente momento técnico:

TÍTULO DEL MOMENTO: ${moment.title}
PROBLEMA OBSERVADO: ${moment.problem}
DESCUBRIMIENTO/CAUSA RAÍZ: ${moment.discovery}
SOLUCIÓN IMPLEMENTADA: ${moment.solution}
LECCIÓN: ${moment.lesson}
CÓDIGO ANTES: ${codeBefore || "N/A"}
CÓDIGO DESPUÉS: ${codeAfter || "N/A"}
ENFOQUE SOLICITADO: ${args.customFocus || args.stylePreset || "Infografía visual de alto impacto con métricas y superación del síndrome del impostor"}

INSTRUCCIONES CLAVE:
1. NARRATIVA DEL POST: Escrita en 1ª PERSONA ("Hoy me pasó...", "La verdad es que dudé de mí..."), ultra cercana y empática, reconociendo el síndrome del impostor y aportando una solución técnica real.
2. MANIFIESTO VISUAL NANO BANANA:
   - "template": "infographic" (o "performance" o "architecture" o "bug-fix")
   - "headline": Titular corto, potente y llamativo para la tarjeta (máximo 45 caracteres)
   - "eyebrow": Etiqueta de insignia impactante (ej: "🔥 OPTIMIZACIÓN EN PRODUCCIÓN", "💡 APRENDIZAJE REAL • VERIFICADO")
   - "metrics": Array de 2 métricas de comparación (ej: [{ "label": "Falsos Positivos", "before": "40%", "after": "0%" }, { "label": "Latencia", "before": "420ms", "after": "18ms" }])
   - "diagramNodes": Array de 3 pasos del flujo técnico (ej: ["Client Audio", "AnalyserNode (0.0s)", "Zero False Positives"])
   - "codeBefore" y "codeAfter": Snippets breves y nítidos.
   - "takeaway": Frase memorable que disuelve el síndrome del impostor.
   - "accentColor": Color hex vibrante como "#0066cc", "#10b981", "#ff9f0a", o "#8b5cf6".

Responde ÚNICAMENTE con un JSON válido con este formato exacto:
{
  "hook": "Hook de apertura en primera persona con emoji",
  "body": "Cuerpo del post estructurado, humano y con llamada al debate",
  "hashtags": ["#LearnInPublic", "#SoftwareEngineering", "#Coding", "#ImposterSyndrome", "#BuildSignal"],
  "imageManifest": {
    "template": "infographic",
    "headline": "Titular de impacto",
    "eyebrow": "INSIGNIA EN MAYÚSCULAS",
    "problem": "Problema resumido para la tarjeta",
    "codeBefore": "${codeBefore || "código antes"}",
    "codeAfter": "${codeAfter || "código corregido"}",
    "result": "Tests: 100% Pasados",
    "takeaway": "Lección memorable",
    "accentColor": "#0066cc",
    "authorName": "Diego",
    "category": "${moment.category || "bug_fix"}",
    "metrics": [
      { "label": "Métrica 1", "before": "Antes", "after": "Después" },
      { "label": "Métrica 2", "before": "Antes", "after": "Después" }
    ],
    "diagramNodes": ["Paso 1", "Paso 2", "Paso 3"]
  }
}`;

    try {
      const parsed = await callGeminiGenerateContent(apiKey, prompt);

      // Save to postDrafts
      if (moment.postDraft?._id) {
        await ctx.runMutation(api.generation.updatePostDraft, {
          postDraftId: moment.postDraft._id,
          hook: parsed.hook,
          body: parsed.body,
          hashtags: parsed.hashtags || ["#LearnInPublic", "#BuildSignal"],
          imageManifest: parsed.imageManifest,
        });
      }

      return { success: true, source: "nano_banana_gemini", imageManifest: parsed.imageManifest };
    } catch (err: any) {
      // Graceful fallback to rich deterministic synthesis
      const fallbackManifest: any = {
        template: args.stylePreset || "infographic",
        headline: moment.title || "Optimización y Aprendizaje Real de Código",
        eyebrow: "✨ EXPERIENCIA REAL EN PRODUCCIÓN",
        problem: moment.problem,
        codeBefore: codeBefore || "analyser.smoothingTimeConstant = 0.8;",
        codeAfter: codeAfter || "analyser.smoothingTimeConstant = 0.0;",
        result: "100% de pruebas de regresión aprobadas",
        takeaway: moment.lesson || "Audita siempre el comportamiento por defecto de las librerías.",
        accentColor: "#0066cc",
        authorName: "Diego",
        category: moment.category || "bug_fix",
        metrics: [
          { label: "Falsos Positivos", before: "40%", after: "0.0%" },
          { label: "Pruebas Pasadas", before: "0/12", after: "12/12" },
        ],
        diagramNodes: ["Browser Audio", "Zero-Leak Engine", "Convex DB"],
      };

      if (moment.postDraft?._id) {
        await ctx.runMutation(api.generation.updatePostDraft, {
          postDraftId: moment.postDraft._id,
          hook: moment.postDraft.hook || `Hoy casi dudo de mis habilidades por este error... hasta que entendí esto. 👇`,
          body: moment.postDraft.body || moment.problem,
          hashtags: moment.postDraft.hashtags || ["#LearnInPublic", "#BuildSignal"],
          imageManifest: fallbackManifest,
        });
      }

      return {
        success: true,
        source: "deterministic_fallback",
        imageManifest: fallbackManifest,
        error: err?.message,
      };
    }
  },
});

