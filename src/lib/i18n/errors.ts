import type { MessageKey } from "./types";

export class I18nError extends Error {
  readonly key: MessageKey;
  readonly params?: Record<string, string | number>;

  constructor(key: MessageKey, params?: Record<string, string | number>) {
    super(key);
    this.name = "I18nError";
    this.key = key;
    this.params = params;
  }
}

export function isI18nError(err: unknown): err is I18nError {
  return err instanceof I18nError;
}

export function formatCaughtError(
  err: unknown,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): string {
  if (isI18nError(err)) return t(err.key, err.params);
  if (err instanceof Error) return err.message;
  return t("errors.generic");
}
