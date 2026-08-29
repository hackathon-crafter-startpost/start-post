import type {
  SessionEvent,
  MomentAnalysis,
  ScoreBreakdown,
  PostDraft,
  ImageManifest,
  MomentCategory,
  PostPlatform,
} from "@hackathon-craft-station/shared-types";

export interface PreFilterResult {
  hasLearningSignal: boolean;
  signals: string[];
}

/**
 * Deterministic pre-filter to prevent invoking costly AI models for trivial non-learning sessions.
 */
export function evaluateDeterministicPreFilter(events: SessionEvent[]): PreFilterResult {
  const signals: string[] = [];
  if (!events || events.length === 0) {
    return { hasLearningSignal: false, signals: [] };
  }

  let hasFailedTest = false;
  let hasPassedTestAfterFail = false;
  let fileChangesCount = 0;
  let hasRootCauseClues = false;

  const discoveryKeywords = [
    "root cause",
    "the problem was",
    "discovered",
    "descubrí",
    "causa",
    "solución",
    "solved",
    "fixed",
    "fix",
    "bug",
    "smoothing",
    "timeout",
    "config",
    "memory leak",
    "invalid",
    "false positive",
  ];

  for (const evt of events) {
    if (evt.type === "test_failed") {
      hasFailedTest = true;
    } else if (evt.type === "test_passed" && hasFailedTest) {
      hasPassedTestAfterFail = true;
      signals.push("test_failed_then_passed");
    } else if (evt.type === "file_changed") {
      fileChangesCount++;
    }

    // Check payload and summaries for discovery signals
    const textBlob = (
      JSON.stringify(evt.payload || {}) + (evt.summary || "")
    ).toLowerCase();

    for (const kw of discoveryKeywords) {
      if (textBlob.includes(kw)) {
        hasRootCauseClues = true;
        break;
      }
    }
  }

  if (hasPassedTestAfterFail) {
    signals.push("verified_fix_loop");
  }
  if (fileChangesCount > 0 && (hasFailedTest || hasRootCauseClues)) {
    signals.push("code_remediation");
  }
  if (hasRootCauseClues && fileChangesCount > 0) {
    signals.push("discovery_insight");
  }

  return {
    hasLearningSignal: signals.length > 0,
    signals,
  };
}

/**
 * Calculates total value score based on 5 dimensions minus penalties.
 */
export function calculateValueScore(breakdown: ScoreBreakdown): number {
  const sum =
    breakdown.problem +
    breakdown.lesson +
    breakdown.reuse +
    breakdown.evidence +
    breakdown.clarity;

  const finalScore = sum - (breakdown.penalty || 0);
  return Math.min(100, Math.max(0, Math.round(finalScore)));
}

/**
 * Heuristic & semantic analyzer to produce a MomentAnalysis from session events.
 */
export function analyzeSessionEvents(events: SessionEvent[]): MomentAnalysis {
  const prefilter = evaluateDeterministicPreFilter(events);
  const evidenceIds: string[] = [];
  const riskFlags: string[] = [];

  let promptText = "";
  let problem = "";
  let solution = "";
  let discovery = "";
  let lesson = "";
  let codeBefore: string | undefined;
  let codeAfter: string | undefined;

  for (const evt of events) {
    if (evt.riskFlags && evt.riskFlags.length > 0) {
      riskFlags.push(...evt.riskFlags);
    }

    if (evt.type === "user_prompt") {
      promptText = (evt.payload.prompt as string) || "";
    } else if (evt.type === "test_failed" || (evt.type === "tool_result" && evt.payload.exitCode !== 0)) {
      evidenceIds.push(evt.eventId);
      if (!problem) {
        problem = (evt.payload.output as string) || (evt.payload.error as string) || "Fallo en validación o ejecución de tests";
      }
    } else if (evt.type === "file_changed") {
      evidenceIds.push(evt.eventId);
      if (evt.payload.codeBefore) codeBefore = evt.payload.codeBefore as string;
      if (evt.payload.codeAfter) codeAfter = evt.payload.codeAfter as string;
    } else if (evt.type === "test_passed") {
      evidenceIds.push(evt.eventId);
    }
  }

  // Derive title & category
  let category: MomentCategory = "bug_fix";
  if (promptText.toLowerCase().includes("perf") || promptText.toLowerCase().includes("optim")) {
    category = "performance";
  } else if (promptText.toLowerCase().includes("arch") || promptText.toLowerCase().includes("refactor")) {
    category = "architecture";
  }

  if (!problem) {
    problem = promptText ? `Problema identificado: ${promptText}` : "Inconsistencia detectada durante la sesión de desarrollo.";
  }
  if (!discovery) {
    discovery = codeBefore
      ? `Se detectó que la configuración previa causaba anomalías (${codeBefore.trim()}).`
      : "Se identificó la causa raíz analizando los registros y parámetros de entrada.";
  }
  if (!solution) {
    solution = codeAfter
      ? `Ajuste del código y parámetros correspondientes (${codeAfter.trim()}).`
      : "Corrección implementada y verificada exitosamente.";
  }
  if (!lesson) {
    lesson = "Antes de asumir fallos en el algoritmo principal, verifica el comportamiento por defecto de las librerías o APIs externas.";
  }

  const title = promptText
    ? promptText.length > 55 ? promptText.slice(0, 52) + "..." : promptText
    : "Resolución de error técnico verificado";

  // Compute breakdown
  const hasStrongEvidence = evidenceIds.length >= 2;
  const breakdown: ScoreBreakdown = {
    problem: prefilter.hasLearningSignal ? 22 : 8,
    lesson: 23,
    reuse: 18,
    evidence: hasStrongEvidence ? 14 : 5,
    clarity: 13,
    penalty: riskFlags.length > 0 ? 20 : 0,
  };

  const score = calculateValueScore(breakdown);
  const shouldCreate = score >= 70;

  return {
    shouldCreate,
    score,
    category,
    title,
    problem,
    discovery,
    solution,
    lesson,
    evidenceEventIds: evidenceIds,
    sensitivityFlags: Array.from(new Set(riskFlags)),
    scoreBreakdown: breakdown,
    reason: `Sesión analizada con score ${score}/100. ${prefilter.signals.join(", ")}`,
  };
}

export interface GeneratePostOptions {
  codeBefore?: string;
  codeAfter?: string;
  authorName?: string;
  accentColor?: string;
  platform?: PostPlatform;
}

/**
 * Builds a structured, narrative-first LinkedIn/social post and matching ImageManifest.
 */
export function generatePostDraftFromMoment(
  moment: MomentAnalysis,
  options: GeneratePostOptions = {}
): PostDraft {
  const platform = options.platform || "linkedin";
  const author = options.authorName || "Desarrollador";
  const accent = options.accentColor || "#10b981";

  const hook = `¿Te ha pasado que pasas horas depurando un bug y la causa era una configuración por defecto invisible? 🐛👇`;

  const body = `Hoy durante una sesión de desarrollo me topé con un problema interesante:

🔴 El Problema:
${moment.problem}

🔍 Lo que descubrí:
${moment.discovery}

🟢 La Solución:
${moment.solution}

💡 El Aprendizaje clave:
${moment.lesson}

Comparte tu experiencia: ¿Has tenido un bug similar con APIs del navegador o librerías externas?`;

  const hashtags = [
    "#SoftwareEngineering",
    "#WebDev",
    "#Coding",
    "#LearnInPublic",
    "#TypeScript",
    "#BuildSignal",
  ];

  const imageManifest: ImageManifest = {
    template: "bug-fix",
    headline: moment.title || "Bug resuelto: causa raíz y solución",
    eyebrow: "APRENDIZAJE DE CÓDIGO REAL",
    problem: moment.problem,
    codeBefore: options.codeBefore,
    codeAfter: options.codeAfter,
    result: "Tests aprobados con 0 falsos positivos",
    takeaway: moment.lesson,
    accentColor: accent,
    authorName: author,
    category: moment.category,
  };

  return {
    platform,
    hook,
    body,
    takeaway: moment.lesson,
    cta: "¿Te ha sucedido algo similar? Te leo en comentarios 👇",
    hashtags,
    imageManifest,
    status: "draft",
  };
}
