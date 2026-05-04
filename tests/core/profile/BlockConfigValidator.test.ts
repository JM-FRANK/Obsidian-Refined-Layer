import { describe, expect, it } from "vitest";

import type { ABlockConfig, BBlockConfig } from "../../../src/core/profile/BlockConfig";
import { BlockConfigValidator } from "../../../src/core/profile/BlockConfigValidator";

function makeABlock(overrides: Partial<ABlockConfig> = {}): ABlockConfig {
  return {
    id: "summary",
    name: "摘要",
    heading: "摘要",
    headingLevel: 2,
    prompt: "test prompt",
    order: 1,
    enabled: true,
    ...overrides,
  };
}

function makeBBlock(overrides: Partial<BBlockConfig> = {}): BBlockConfig {
  return {
    id: "original-content",
    name: "原始内容",
    heading: "原始内容",
    headingLevel: 2,
    required: true,
    ...overrides,
  };
}

describe("BlockConfigValidator", () => {
  const validator = new BlockConfigValidator();

  // ── protectH1 = true (min level 2) ──

  it("accepts valid config with protectH1=true and level>=2 blocks", () => {
    const result = validator.validate(
      [makeABlock({ id: "a1", headingLevel: 2 })],
      makeBBlock({ headingLevel: 2 }),
      true,
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects A block with headingLevel=1 when protectH1=true", () => {
    const result = validator.validate(
      [makeABlock({ id: "a1", headingLevel: 1 })],
      makeBBlock({ headingLevel: 2 }),
      true,
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      code: "a-block-heading-level-too-low",
      blockId: "a1",
    });
  });

  it("rejects B block with headingLevel=1 when protectH1=true", () => {
    const result = validator.validate(
      [makeABlock({ headingLevel: 2 })],
      makeBBlock({ headingLevel: 1 }),
      true,
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      code: "b-block-heading-level-too-low",
      blockId: "original-content",
    });
  });

  // ── protectH1 = false (min level 1) ──

  it("accepts blocks with headingLevel=1 when protectH1=false", () => {
    const result = validator.validate(
      [makeABlock({ id: "a1", headingLevel: 1 })],
      makeBBlock({ headingLevel: 1 }),
      false,
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ── Invalid heading levels ──

  it.each([0, 7, -1, 99])("rejects A block with out-of-range headingLevel=%i", (level) => {
    const result = validator.validate(
      [makeABlock({ headingLevel: level as 1 })],
      makeBBlock({ headingLevel: 2 }),
      false,
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({
      code: "invalid-heading-level",
    });
  });

  it("rejects B block with out-of-range headingLevel", () => {
    const result = validator.validate(
      [makeABlock({ headingLevel: 2 })],
      makeBBlock({ headingLevel: 7 as 2 }),
      false,
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({
      code: "invalid-heading-level",
    });
  });

  // ── Duplicate A block IDs ──

  it("rejects duplicate A block ids", () => {
    const result = validator.validate(
      [makeABlock({ id: "dup" }), makeABlock({ id: "dup" })],
      makeBBlock(),
      false,
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      code: "duplicate-a-block-id",
      blockId: "dup",
    });
  });

  // ── No A blocks ──

  it("rejects empty A block list", () => {
    const result = validator.validate([], makeBBlock(), false);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      code: "no-a-blocks",
    });
  });

  // ── Multiple errors aggregated ──

  it("returns all errors when multiple violations exist", () => {
    const result = validator.validate(
      [
        makeABlock({ id: "dup", headingLevel: 1 }),
        makeABlock({ id: "dup", headingLevel: 0 as 1 }),
      ],
      makeBBlock({ headingLevel: 1 }),
      true,
    );

    expect(result.ok).toBe(false);
    // At least: duplicate id, 2x too-low heading level, 1x invalid level, b-block too-low
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });

  // ── protectH1 edge cases ──

  it("allows H1 A block when protectH1 is explicitly false", () => {
    const result = validator.validate(
      [makeABlock({ headingLevel: 1 })],
      makeBBlock({ headingLevel: 2 }),
      false,
    );

    expect(result.ok).toBe(true);
  });

  it("rejects H1 A block when protectH1 is true (default)", () => {
    const result = validator.validate(
      [makeABlock({ headingLevel: 1 })],
      makeBBlock({ headingLevel: 2 }),
      true,
    );

    expect(result.ok).toBe(false);
  });
});
