type ClerkErrorItem = {
  code?: string;
  longMessage?: string;
  message?: string;
};

type ClerkLikeError = {
  code?: string;
  longMessage?: string;
  message?: string;
  errors?: ClerkErrorItem[];
};

function collectErrorItems(error: unknown): ClerkErrorItem[] {
  if (!error || typeof error !== "object") return [];
  const e = error as ClerkLikeError;
  const items: ClerkErrorItem[] = [];

  if (Array.isArray(e.errors)) {
    items.push(...e.errors);
  }

  if (e.code || e.message || e.longMessage) {
    items.push({
      code: e.code,
      message: e.message,
      longMessage: e.longMessage,
    });
  }

  return items;
}

export function getClerkErrorCode(error: unknown): string | undefined {
  return collectErrorItems(error).find((item) => item.code)?.code;
}

export function getClerkErrorMessage(error: unknown): string | undefined {
  const items = collectErrorItems(error);
  const first = items[0];
  if (!first) return undefined;
  return first.longMessage ?? first.message;
}

export function isSessionExistsError(error: unknown): boolean {
  const items = collectErrorItems(error);
  if (items.some((item) => item.code === "session_exists")) return true;

  const text = items
    .map((item) => `${item.longMessage ?? ""} ${item.message ?? ""}`)
    .join(" ")
    .toLowerCase();

  return text.includes("already signed in");
}

export function getHookGlobalError(
  errors?: {
    global?: Array<{ longMessage?: string; message?: string; code?: string }> | null;
  } | null,
): string | undefined {
  const first = errors?.global?.[0];
  if (!first) return undefined;
  return first.longMessage ?? first.message;
}

export function isHookSessionExistsError(
  errors?: {
    global?: Array<{ longMessage?: string; message?: string; code?: string }> | null;
  } | null,
): boolean {
  const first = errors?.global?.[0];
  if (!first) return false;
  if (first.code === "session_exists") return true;
  const text = `${first.longMessage ?? ""} ${first.message ?? ""}`.toLowerCase();
  return text.includes("already signed in");
}
