import { en } from "./messages/en";
import { ro } from "./messages/ro";
import type { Locale, MessageKey, Messages } from "./types";
import { DEFAULT_LOCALE } from "./types";

const catalogs: Record<Locale, Messages> = { ro, en };

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "ro" || value === "en";
}

export function resolveLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

export function createTranslator(locale: Locale) {
  const messages = getMessages(locale);
  return function t(
    key: MessageKey,
    params?: Record<string, string | number>,
  ): string {
    let text = messages[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  };
}

export function dateLocaleFor(locale: Locale): string {
  return locale === "ro" ? "ro-RO" : "en-GB";
}

export { DEFAULT_LOCALE, LOCALE_COOKIE } from "./types";
export type { Locale, MessageKey, Messages } from "./types";
