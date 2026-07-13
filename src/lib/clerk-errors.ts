type ClerkLikeError = {
  longMessage?: string;
  message?: string;
  errors?: Array<{ longMessage?: string; message?: string }>;
};

export function getClerkErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as ClerkLikeError;

  if (Array.isArray(e.errors) && e.errors.length > 0) {
    return e.errors[0]?.longMessage ?? e.errors[0]?.message;
  }

  return e.longMessage ?? e.message;
}

export function getHookGlobalError(
  errors?: {
    global?: Array<{ longMessage?: string; message?: string }> | null;
  } | null,
): string | undefined {
  const first = errors?.global?.[0];
  if (!first) return undefined;
  return first.longMessage ?? first.message;
}
