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

  const hook = `Hoy pasé casi una hora dudando de mis habilidades por un error que parecía imposible... hasta que entendí la causa raíz. 🐛👇`;

  const body = `Hoy estuve programando y me topé con uno de esos momentos donde el síndrome del impostor te hace dudar de todo:

🔴 Lo que me estaba rompiendo la cabeza:
${moment.problem}

💭 Mi primer pensamiento (el impostor atacando):
"Seguro esto es un fallo básico mío o me falta nivel para entender esta arquitectura..."

🔍 Lo que realmente descubrí al depurar a fondo:
${moment.discovery}

🟢 La solución que implementé:
${moment.solution}

💡 La lección que me guardo para siempre:
${moment.lesson}

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

  const imageManifest: ImageManifest = {
    template: "bug-fix",
    headline: moment.title || "Bug resuelto: causa raíz y solución",
    eyebrow: "APRENDIZAJE REAL EN CÓDIGO",
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
    cta: "¿Cuál ha sido ese bug reciente que te hizo dudar de ti mismo antes de resolverlo? Te leo en los comentarios 👇",
    hashtags,
    imageManifest,
    status: "draft",
  };

}
