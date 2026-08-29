import { describe, it, expect } from "vitest";
import {
  evaluateDeterministicPreFilter,
  calculateValueScore,
  analyzeSessionEvents,
  generatePostDraftFromMoment,
} from "../src/index";
import type { SessionEvent, MomentAnalysis } from "@hackathon-craft-station/shared-types";

describe("Value Engine & Detection", () => {
  it("rejects trivial sessions in prefilter (e.g. single read or prompt with no code/test change)", () => {
    const trivialEvents: SessionEvent[] = [
      {
        eventId: "e1",
        sessionId: "s1",
        installationId: "i1",
        source: "claude-code",
        type: "session_started",
        timestamp: 1000,
        sanitized: true,
        payload: {},
      },
      {
        eventId: "e2",
        sessionId: "s1",
        installationId: "i1",
        source: "claude-code",
        type: "user_prompt",
        timestamp: 1010,
        sanitized: true,
        payload: { prompt: "hola, que hora es?" },
      },
      {
        eventId: "e3",
        sessionId: "s1",
        installationId: "i1",
        source: "claude-code",
        type: "turn_stopped",
        timestamp: 1020,
        sanitized: true,
        payload: {},
      },
    ];

    const filterResult = evaluateDeterministicPreFilter(trivialEvents);
    expect(filterResult.hasLearningSignal).toBe(false);
  });

  it("identifies strong learning signals when tests fail and later pass with code changes", () => {
    const oratoriaEvents: SessionEvent[] = [
      {
        eventId: "e1",
        sessionId: "oratoria-sess",
        installationId: "i1",
        source: "claude-code",
        type: "user_prompt",
        timestamp: 1000,
        sanitized: true,
        payload: { prompt: "The audio speech filler word detector is having high false positive rate" },
      },
      {
        eventId: "e2",
        sessionId: "oratoria-sess",
        installationId: "i1",
        source: "claude-code",
        type: "test_failed",
        timestamp: 1100,
        sanitized: true,
        payload: { command: "pnpm test", output: "FAIL: false positive rate 42% > 5%" },
      },
      {
        eventId: "e3",
        sessionId: "oratoria-sess",
        installationId: "i1",
        source: "claude-code",
        type: "file_changed",
        timestamp: 1200,
        sanitized: true,
        payload: {
          filePath: "src/audio/detector.ts",
          diff: "- analyser.smoothingTimeConstant = 0.8;\n+ analyser.smoothingTimeConstant = 0.0;",
        },
      },
      {
        eventId: "e4",
        sessionId: "oratoria-sess",
        installationId: "i1",
        source: "claude-code",
        type: "test_passed",
        timestamp: 1300,
        sanitized: true,
        payload: { command: "pnpm test", output: "PASS: all 12 tests passed, 0 false positives" },
      },
    ];

    const filterResult = evaluateDeterministicPreFilter(oratoriaEvents);
    expect(filterResult.hasLearningSignal).toBe(true);
    expect(filterResult.signals).toContain("test_failed_then_passed");
  });

  it("calculates value score accurately using the 5 weighted dimensions and penalties", () => {
    const breakdown = {
      problem: 22,
      lesson: 23,
      reuse: 18,
      evidence: 14,
      clarity: 13,
      penalty: 0,
    };

    const score = calculateValueScore(breakdown);
    expect(score).toBe(90);

    const penalizedScore = calculateValueScore({
      ...breakdown,
      penalty: 25,
    });
    expect(penalizedScore).toBe(65);
  });

  it("analyzes session events into a structured MomentAnalysis", () => {
    const events: SessionEvent[] = [
      {
        eventId: "e1",
        sessionId: "s1",
        installationId: "i1",
        source: "claude-code",
        type: "user_prompt",
        timestamp: 1000,
        sanitized: true,
        payload: { prompt: "Fix Web Audio spectrum blurring bug in filler detector" },
      },
      {
        eventId: "e2",
        sessionId: "s1",
        installationId: "i1",
        source: "claude-code",
        type: "test_failed",
        timestamp: 1100,
        sanitized: true,
        payload: { output: "Test failed with 4 false positives" },
      },
      {
        eventId: "e3",
        sessionId: "s1",
        installationId: "i1",
        source: "claude-code",
        type: "file_changed",
        timestamp: 1200,
        sanitized: true,
        payload: {
          filePath: "src/detector.ts",
          codeBefore: "analyser.smoothingTimeConstant = 0.8;",
          codeAfter: "analyser.smoothingTimeConstant = 0.0;",
        },
      },
      {
        eventId: "e4",
        sessionId: "s1",
        installationId: "i1",
        source: "claude-code",
        type: "test_passed",
        timestamp: 1300,
        sanitized: true,
        payload: { output: "All tests passing" },
      },
    ];

    const analysis = analyzeSessionEvents(events);
    expect(analysis.shouldCreate).toBe(true);
    expect(analysis.score).toBeGreaterThanOrEqual(70);
    expect(analysis.category).toBe("bug_fix");
    expect(analysis.evidenceEventIds).toContain("e2");
    expect(analysis.evidenceEventIds).toContain("e4");
  });

  it("generates a complete PostDraft and ImageManifest from an approved MomentAnalysis", () => {
    const moment: MomentAnalysis = {
      shouldCreate: true,
      score: 88,
      category: "bug_fix",
      reason: "High educational value audio processing bug with verified test before/after",
      title: "El error de suavizado en Web Audio API",
      problem: "El detector de muletillas arrojaba 40% de falsos positivos en grabaciones cortas.",
      discovery: "Web Audio AnalyserNode tiene smoothingTimeConstant = 0.8 por defecto, promediando espectros entre frames consecutivos.",
      solution: "Desactivar el suavizado temporal (smoothingTimeConstant = 0) para transitorios rápidos de audio.",
      lesson: "Antes de culpar a tu algoritmo o modelo, audita el preprocesamiento por defecto de la API del navegador.",
      evidenceEventIds: ["e2", "e4"],
      sensitivityFlags: [],
    };

    const postDraft = generatePostDraftFromMoment(moment, {
      codeBefore: "analyser.smoothingTimeConstant = 0.8;",
      codeAfter: "analyser.smoothingTimeConstant = 0.0;",
      authorName: "Diego",
      accentColor: "#10b981",
    });

    expect(postDraft.hook).toBeTruthy();
    expect(postDraft.body).toContain(moment.problem);
    expect(postDraft.body).toContain(moment.lesson);
    expect(postDraft.hashtags.length).toBeGreaterThan(0);
    expect(postDraft.imageManifest.template).toBe("bug-fix");
    expect(postDraft.imageManifest.codeBefore).toBe("analyser.smoothingTimeConstant = 0.8;");
    expect(postDraft.imageManifest.codeAfter).toBe("analyser.smoothingTimeConstant = 0.0;");
  });
});
