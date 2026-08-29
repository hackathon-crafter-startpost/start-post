import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  sanitizeFilePath,
  isIgnoredPath,
  truncateOutput,
  sanitizeEvent,
} from "../src/index";
import type { SessionEvent } from "@hackathon-craft-station/shared-types";

describe("Sanitizer Engine (Privacy & Security)", () => {
  it("redacts API keys and tokens (OpenAI, Clerk, GitHub, AWS, Bearer)", () => {
    const input = `
      sk-proj-abc1234567890abcdef1234567890
      pk_test_aHVtYmxlLWltcGFsYS0yOTA2LmNsZXJrLmFjY291bnRzLmRldiQ
      sk_test_ckp9eQEMQR755oiA36RIt4VkmNQUd4hDxszBBb3ql5
      ghp_1234567890abcdef1234567890abcdef1234
      Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M
      AKIAIOSFODNN7EXAMPLE
    `;

    const sanitized = sanitizeText(input);
    expect(sanitized).not.toContain("sk-proj-abc1234567890abcdef1234567890");
    expect(sanitized).not.toContain("pk_test_aHVtYmxlLWltcGFsYS0yOTA2LmNsZXJrLmFjY291bnRzLmRldiQ");
    expect(sanitized).not.toContain("sk_test_ckp9eQEMQR755oiA36RIt4VkmNQUd4hDxszBBb3ql5");
    expect(sanitized).not.toContain("ghp_1234567890abcdef1234567890abcdef1234");
    expect(sanitized).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(sanitized).toContain("[REDACTED_SECRET]");
  });

  it("masks email addresses", () => {
    const text = "Contact developer at john.doe@company.org or dev-admin@gmail.com for details";
    const sanitized = sanitizeText(text);
    expect(sanitized).not.toContain("john.doe@company.org");
    expect(sanitized).not.toContain("dev-admin@gmail.com");
    expect(sanitized).toContain("[EMAIL_REDACTED]");
  });

  it("strips personal user home directory paths", () => {
    const winPath = "Error at C:\\Users\\diego\\projects\\app\\src\\index.ts:24";
    const unixPath = "Failed in /Users/sarah/repo/backend/server.ts:12";
    const linuxPath = "Found /home/developer/code/main.go";

    expect(sanitizeFilePath(winPath)).toBe("src/index.ts:24");
    expect(sanitizeFilePath(unixPath)).toBe("backend/server.ts:12");
    expect(sanitizeFilePath(linuxPath)).toBe("code/main.go");
  });

  it("matches files against .contentignore patterns", () => {
    expect(isIgnoredPath(".env")).toBe(true);
    expect(isIgnoredPath(".env.local")).toBe(true);
    expect(isIgnoredPath(".env.production")).toBe(true);
    expect(isIgnoredPath("credentials/prod.json")).toBe(true);
    expect(isIgnoredPath("private/keys.pem")).toBe(true);
    expect(isIgnoredPath("client-data/users.csv")).toBe(true);
    expect(isIgnoredPath("server.key")).toBe(true);
    expect(isIgnoredPath("cert.pem")).toBe(true);

    expect(isIgnoredPath("src/components/button.tsx")).toBe(false);
    expect(isIgnoredPath("packages/backend/schema.ts")).toBe(false);
  });

  it("truncates excessive lines and long terminal output", () => {
    const longLines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join("\n");
    const truncated = truncateOutput(longLines, 20, 200);
    const lines = truncated.split("\n");
    expect(lines.length).toBeLessThanOrEqual(21); // 20 lines + truncation notice
    expect(truncated).toContain("truncated");

    const veryLongSingleLine = "x".repeat(500);
    const truncatedSingle = truncateOutput(veryLongSingleLine, 20, 200);
    expect(truncatedSingle.length).toBeLessThanOrEqual(230);
  });

  it("sanitizes an entire SessionEvent seamlessly and removes secrets", () => {
    const rawEvent: SessionEvent = {
      eventId: "evt-123",
      sessionId: "sess-456",
      installationId: "inst-789",
      source: "claude-code",
      type: "tool_result",
      timestamp: Date.now(),
      sanitized: false,
      payload: {
        command: "cat .env",
        output: "CLERK_SECRET_KEY=sk_test_ckp9eQEMQR755oiA36RIt4VkmNQUd4hDxszBBb3ql5\nUSER=john.doe@test.com",
        filePath: "C:\\Users\\diego\\project\\.env.local",
      },
    };

    const sanitizedEvent = sanitizeEvent(rawEvent);
    expect(sanitizedEvent.sanitized).toBe(true);
    expect(sanitizedEvent.payload.output).not.toContain("sk_test_ckp9eQEMQR755oiA36RIt4VkmNQUd4hDxszBBb3ql5");
    expect(sanitizedEvent.payload.output).not.toContain("john.doe@test.com");
    expect(sanitizedEvent.riskFlags).toBeDefined();
    expect(sanitizedEvent.riskFlags?.length).toBeGreaterThan(0);
  });
});
