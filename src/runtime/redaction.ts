const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._\-\+\/=]+/gi,
  /Authorization:\s*\S+(\s+\S+)?/gi,
  /api[_-]?key["'`]?\s*[:=]\s*["'`][^"'`]+["'`]/gi,
  /token["'`]?\s*[:=]\s*["'`][^"'`]+["'`]/gi,
  /secret["'`]?\s*[:=]\s*["'`][^"'`]+["'`]/gi,
  /x-api-key["']?\s*[:=]\s*[^\s,;]+/gi,
  /sk-[A-Za-z0-9_\-]+/gi,
];

export function redactSensitiveText(text: string): string {
  return SECRET_PATTERNS.reduce(
    (result, pattern) => result.replace(pattern, "[REDACTED]"),
    text,
  );
}

export function toSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return redactSensitiveText(error.message);
  }

  return redactSensitiveText(String(error));
}
