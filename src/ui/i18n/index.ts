import { enStrings } from "./en";
import { zhCNStrings } from "./zh-CN";

export type UiLanguage = "zh-CN" | "en";

const dictionaries = {
  "zh-CN": zhCNStrings,
  en: enStrings,
} as const;

export type I18nKey = keyof typeof zhCNStrings;

export function t(language: UiLanguage, key: I18nKey, variables: Record<string, string | number> = {}): string {
  const template: string = dictionaries[language][key] ?? dictionaries.en[key] ?? key;

  return Object.entries(variables).reduce<string>(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    template,
  );
}
