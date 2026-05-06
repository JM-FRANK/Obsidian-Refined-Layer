import { describe, expect, it } from "vitest";

import { t } from "../../../src/ui/i18n";
import { zhCNStrings } from "../../../src/ui/i18n/zh-CN";

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

  it("uses cache record wording for session-cache settings", () => {
    expect(t("zh-CN", "settings.title.sessionCache")).toBe("缓存记录");
    expect(t("zh-CN", "settings.title.sessionCacheLimit")).toContain("缓存记录");
    expect(t("zh-CN", "settings.title.openSessionCache")).toBe("查看缓存记录");
    expect(t("zh-CN", "settings.title.sessionCache")).not.toContain("历史记录");
    expect(zhCNStrings["settings.title.historyLimit"]).toBe("缓存记录数量上限");
  });

  it("uses Key ID wording for user-facing secret settings", () => {
    expect(t("zh-CN", "settings.title.secretRef")).toBe("密钥 ID");
    expect(t("zh-CN", "notice.provider.missingSecretRef", { provider: "openai-compatible" })).toContain("密钥 ID");
    expect(t("en", "settings.title.secretRef")).toBe("Key ID");
    expect(t("en", "notice.provider.missingSecretRef", { provider: "openai-compatible" })).toContain("Key ID");
  });
});
