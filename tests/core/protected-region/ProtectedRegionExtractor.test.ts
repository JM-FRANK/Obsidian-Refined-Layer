import { describe, expect, it } from "vitest";

import { rawRefinedProfile } from "../../../src/core/profile/rawRefinedProfile";
import { ProtectedRegionExtractor } from "../../../src/core/protected-region/ProtectedRegionExtractor";
import { hashText } from "../../../src/core/protected-region/hash";

describe("ProtectedRegionExtractor", () => {
  const extractor = new ProtectedRegionExtractor();
  const definition = rawRefinedProfile.protectedRegions.definitions[0];

  it("extracts the protected region from heading to end with exact newlines", () => {
    const result = extractor.extract("# Title\n\n## 原始内容\nline 1\nline 2\n", definition);

    expect(result).toEqual({
      ok: true,
      region: {
        id: "original-content",
        heading: "## 原始内容",
        mode: "from-heading-to-end",
        text: "## 原始内容\nline 1\nline 2\n",
      },
    });
  });

  it("preserves CRLF text exactly when extracting", () => {
    const result = extractor.extract("# Title\r\n\r\n## 原始内容\r\nline 1\r\nline 2\r\n", definition);

    expect(result).toEqual({
      ok: true,
      region: {
        id: "original-content",
        heading: "## 原始内容",
        mode: "from-heading-to-end",
        text: "## 原始内容\r\nline 1\r\nline 2\r\n",
      },
    });
  });

  it("returns missing-heading when the protected heading is absent", () => {
    const result = extractor.extract("# Title\n\n## Other\nline 1\n", definition);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "missing-heading",
        message: "Required heading ## 原始内容 was not found.",
      },
    });
  });

  it("returns multiple-heading when the protected heading appears twice", () => {
    const result = extractor.extract("## 原始内容\none\n\n## 原始内容\ntwo\n", definition);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "multiple-heading",
        message: "Protected heading ## 原始内容 appears multiple times.",
      },
    });
  });

  it("returns empty-protected-region when no content follows the protected heading", () => {
    const result = extractor.extract("# Title\n\n## 原始内容", definition);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "empty-protected-region",
        message: "Protected heading ## 原始内容 has no content after it.",
      },
    });
  });

  it("hashes file and protected-region text deterministically", () => {
    expect(hashText("abc")).toBe(hashText("abc"));
    expect(hashText("abc")).not.toBe(hashText("abcd"));
  });
});
