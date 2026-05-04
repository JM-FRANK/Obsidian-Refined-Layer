import { describe, expect, it } from "vitest";

import { redactSensitiveText, toSafeErrorMessage } from "../../src/runtime/redaction";

describe("redactSensitiveText", () => {
  it("redacts Bearer tokens with standard and JWT characters", () => {
    expect(redactSensitiveText("Authorization: Bearer sk-test123")).toBe("[REDACTED]");
    expect(redactSensitiveText("Bearer abcDEF123._-+/=")).toBe("[REDACTED]");
    expect(redactSensitiveText("Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0")).toBe("[REDACTED]");
  });

  it("redacts Authorization headers", () => {
    expect(redactSensitiveText("Authorization: Basic YWxhZGRpbjpvcGVuc2VzYW1l")).toBe("[REDACTED]");
    expect(redactSensitiveText("Authorization:Bearer token123")).toBe("[REDACTED]");
  });

  it("redacts api_key patterns with various delimiters", () => {
    expect(redactSensitiveText("api_key: 'sk-secret-value'")).toBe("[REDACTED]");
    expect(redactSensitiveText('api_key="abc123"')).toBe("[REDACTED]");
    expect(redactSensitiveText("apiKey = `backtick-key`")).toBe("[REDACTED]");
  });

  it("redacts token patterns", () => {
    expect(redactSensitiveText("token: 'my-secret-token'")).toBe("[REDACTED]");
    expect(redactSensitiveText('token="my-token"')).toBe("[REDACTED]");
  });

  it("redacts secret patterns", () => {
    expect(redactSensitiveText("secret: 'my-secret-value'")).toBe("[REDACTED]");
    expect(redactSensitiveText('secret="production-key"')).toBe("[REDACTED]");
  });

  it("redacts x-api-key headers", () => {
    expect(redactSensitiveText("x-api-key: abc123secret")).toBe("[REDACTED]");
    expect(redactSensitiveText("x-api-key=abc123")).toBe("[REDACTED]");
  });

  it("redacts OpenAI-style API keys (sk- prefix)", () => {
    expect(redactSensitiveText("sk-proj-abc123def456")).toBe("[REDACTED]");
    expect(redactSensitiveText("sk-test-key-value")).toBe("[REDACTED]");
  });

  it("redacts multiple secrets in one string", () => {
    const input = "Bearer token1 and api_key='secret2'";
    const result = redactSensitiveText(input);
    expect(result).not.toContain("token1");
    expect(result).not.toContain("secret2");
  });

  it("keeps non-secret text unchanged", () => {
    const input = "This is a normal log message about proposal validation.";
    expect(redactSensitiveText(input)).toBe(input);
  });

  it("does not redact false positives like hex hashes", () => {
    const input = "baseFileHash: abc123def456";
    expect(redactSensitiveText(input)).toBe(input);
  });
});

describe("toSafeErrorMessage", () => {
  it("redacts secrets in Error messages", () => {
    const error = new Error("API error with Authorization: Bearer sk-abc123");
    expect(toSafeErrorMessage(error)).not.toContain("sk-abc123");
    expect(toSafeErrorMessage(error)).toContain("[REDACTED]");
  });

  it("handles non-Error values", () => {
    expect(toSafeErrorMessage("simple string")).toBe("simple string");
    expect(toSafeErrorMessage({ message: "test" })).toContain("Object");
  });
});
