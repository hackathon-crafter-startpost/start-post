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
