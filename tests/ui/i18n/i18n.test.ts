import { describe, expect, it } from "vitest";

import { t } from "../../../src/ui/i18n";

describe("i18n", () => {
  it("returns translated strings for both languages", () => {
    expect(t("zh-CN", "review.button.apply")).toBe("Apply selected changes");
    expect(t("en", "review.button.apply")).toBe("Apply selected changes");
  });

  it("interpolates template variables", () => {
    expect(t("en", "review.toggle.tag.add", { tag: "#ai/generated" })).toBe(
      "Accept added tag: #ai/generated",
    );
  });
});
