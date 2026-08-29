import type { SessionEvent } from "@hackathon-craft-station/shared-types";

// Default contentignore patterns
const DEFAULT_IGNORED_PATTERNS = [
  /^\.env(\..+)?$/i,
  /^credentials[\/\\].+/i,
  /^private[\/\\].+/i,
  /^client-data[\/\\].+/i,
  /\.(key|pem|pfx|cert|crt)$/i,
  /^id_rsa/i,
  /\.keystore$/i,
];

// Secret Detection RegExes
const SECRET_REGEXES: { name: string; regex: RegExp }[] = [
  { name: "openai_key", regex: /sk-(?:proj-|ant-)?[a-zA-Z0-9_-]{20,}/g },
  { name: "clerk_key", regex: /(?:pk|sk)_(?:test|live)_[a-zA-Z0-9]{20,}/g },
  { name: "github_token", regex: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{30,}/g },
  { name: "aws_key", regex: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g },
  { name: "bearer_token", regex: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi },
  {
    name: "private_key",
    regex: /-----BEGIN (?:RSA |EC |PGP |OPENSSH )?PRIVATE KEY-----[^-]+-----END (?:RSA |EC |PGP |OPENSSH )?PRIVATE KEY-----/gs,
  },
  {
    name: "generic_secret",
    regex: /(?:api[_-]?key|secret[_-]?key|auth[_-]?token|password)['":\s=]+['"]?([a-zA-Z0-9_\-\.]{24,})['"]?/gi,
  },
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Strips personal machine directory paths from error traces and filenames.
 */
export function sanitizeFilePath(filePath: string): string {
  if (!filePath) return "";
  let normalized = filePath.replace(/\\/g, "/");

  // Remove Windows User directory (e.g. Error at C:/Users/diego/projects/app/src/index.ts:24)
  normalized = normalized.replace(
    /(?:Error at |Found |Failed in )?[A-Za-z]:\/Users\/[^\/]+(?:\/.*?)?\/(src|apps|packages|lib|components|backend|convex|pages|plugins|code|repo)([\/].*)/i,
    "$1$2"
  );

  // Remove Unix / macOS User directory (e.g. Failed in /Users/sarah/repo/backend/server.ts:12)
  normalized = normalized.replace(
    /(?:Error at |Found |Failed in )?\/(?:Users|home)\/[^\/]+(?:\/.*?)?\/(src|apps|packages|lib|components|backend|convex|pages|plugins|code|repo)([\/].*)/i,
    "$1$2"
  );

  // General fallback for remaining user home directories
  normalized = normalized.replace(/[A-Za-z]:\/Users\/[^\/]+/gi, "~");
  normalized = normalized.replace(/\/(?:Users|home)\/[^\/]+/gi, "~");

  return normalized;
}

/**
 * Checks if a given path or filename matches .contentignore rules.
 */
export function isIgnoredPath(filePath: string, customPatterns: RegExp[] = []): boolean {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
  const patterns = [...DEFAULT_IGNORED_PATTERNS, ...customPatterns];

  for (const pattern of patterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Redacts secrets, tokens, and emails from arbitrary text.
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  let sanitized = text;

  // Redact private keys & specific API tokens
  for (const { regex } of SECRET_REGEXES) {
    sanitized = sanitized.replace(regex, "[REDACTED_SECRET]");
  }

  // Redact emails
  sanitized = sanitized.replace(EMAIL_REGEX, "[EMAIL_REDACTED]");

  return sanitized;
}

/**
 * Truncates output to maximum line count and line character length.
 */
export function truncateOutput(
  output: string,
  maxLines: number = 20,
  maxLineChars: number = 200
): string {
  if (!output) return "";
  let lines = output.split("\n");

  // Truncate each individual line length
  lines = lines.map((line) =>
    line.length > maxLineChars ? line.slice(0, maxLineChars) + "..." : line
  );

  // Truncate total lines
  if (lines.length > maxLines) {
    const retained = lines.slice(0, maxLines);
    return `${retained.join("\n")}\n... [${lines.length - maxLines} lines truncated for brevity]`;
  }

  return lines.join("\n");
}

/**
 * Recursively sanitizes any JavaScript object or primitive.
 */
export function sanitizePayload(payload: unknown, riskFlags: Set<string>): unknown {
  if (typeof payload === "string") {
    const original = payload;
    let sanitized = sanitizeText(payload);
    sanitized = sanitizeFilePath(sanitized);
    sanitized = truncateOutput(sanitized);

    if (sanitized !== original && sanitized.includes("[REDACTED_SECRET]")) {
      riskFlags.add("secret_detected");
    }
    if (sanitized !== original && sanitized.includes("[EMAIL_REDACTED]")) {
      riskFlags.add("pii_detected");
    }
    return sanitized;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item, riskFlags));
  }

  if (payload !== null && typeof payload === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      // Check if property is a filename/filePath that is ignored
      if ((key === "filePath" || key === "file" || key === "path") && typeof value === "string") {
        if (isIgnoredPath(value)) {
          riskFlags.add("ignored_file_path");
        }
      }
      result[key] = sanitizePayload(value, riskFlags);
    }
    return result;
  }

  return payload;
}

/**
 * Fully sanitizes an incoming SessionEvent before it leaves the local environment.
 */
export function sanitizeEvent(event: SessionEvent): SessionEvent {
  const riskFlags = new Set<string>(event.riskFlags || []);

  const sanitizedPayload = sanitizePayload(
    event.payload,
    riskFlags
  ) as Record<string, unknown>;

  const sanitizedSummary = event.summary ? sanitizeText(event.summary) : undefined;

  return {
    ...event,
    payload: sanitizedPayload,
    summary: sanitizedSummary,
    sanitized: true,
    riskFlags: riskFlags.size > 0 ? Array.from(riskFlags) : undefined,
  };
}
