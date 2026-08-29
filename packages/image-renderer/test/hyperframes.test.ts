import { describe, it, expect } from "vitest";
import { generateHyperFramesHtml } from "../src/hyperframes-generator";
import type { ImageManifest } from "@hackathon-craft-station/shared-types";

describe("HyperFrames HTML Generator", () => {
  const sampleManifest: ImageManifest = {
    template: "bug-fix",
    headline: "Solución a falsos positivos en Web Audio API",
    eyebrow: "LECCIÓN TÉCNICA",
    problem: "AnalyserNode arrojaba 40% de falsos positivos",
    codeBefore: "analyser.smoothingTimeConstant = 0.8;",
    codeAfter: "analyser.smoothingTimeConstant = 0.0;",
    result: "12/12 pruebas pasadas",
    takeaway: "Audita siempre los valores por defecto del navegador",
    accentColor: "#0071e3",
    authorName: "Diego",
    category: "bug_fix",
  };

  it("should generate valid HTML with 4:5 dimensions by default", () => {
    const html = generateHyperFramesHtml({ manifest: sampleManifest, aspectRatio: "4:5" });
    expect(html).toContain('data-composition-id="buildsignal-hyperframe"');
    expect(html).toContain('data-width="1080"');
    expect(html).toContain('data-height="1350"');
    expect(html).toContain("Solución a falsos positivos en Web Audio API");
    expect(html).toContain("analyser.smoothingTimeConstant = 0.8;");
    expect(html).toContain("analyser.smoothingTimeConstant = 0.0;");
  });

  it("should generate 16:9 landscape dimensions for X and YouTube", () => {
    const html = generateHyperFramesHtml({ manifest: sampleManifest, aspectRatio: "16:9" });
    expect(html).toContain('data-width="1920"');
    expect(html).toContain('data-height="1080"');
  });

  it("should generate 9:16 vertical dimensions for Shorts and Reels", () => {
    const html = generateHyperFramesHtml({ manifest: sampleManifest, aspectRatio: "9:16" });
    expect(html).toContain('data-width="1080"');
    expect(html).toContain('data-height="1920"');
  });

  it("should embed seekable clips for each storytelling beat", () => {
    const html = generateHyperFramesHtml({ manifest: sampleManifest });
    expect(html).toContain('data-hf-id="scene-problem"');
    expect(html).toContain('data-hf-id="scene-diff"');
    expect(html).toContain('data-hf-id="scene-takeaway"');
    expect(html).toContain("window.seek = function(time)");
  });
});
