export const COOKIE_CONSENT_NAME = "liga-prono-cookie-consent";
export const REMEMBER_ME_COOKIE = "liga-prono-remember-me";
export const REMEMBER_ME_SESSION_FLAG = "liga-prono-session-alive";
export const REMEMBERED_EMAIL_KEY = "liga-prono-remembered-email";

/** Chrome/Chromium cap cookies at ~400 days. */
export const FIRST_PARTY_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export const LEGAL_PATHS = ["/confidentialitate", "/termeni-si-conditii", "/regulament"] as const;

export const FIRST_PARTY_COOKIE_OPTIONS = {
  path: "/",
  maxAge: FIRST_PARTY_COOKIE_MAX_AGE,
  sameSite: "lax" as const,
};

export type CookieConsent = {
  v: 1;
  necessary: true;
  advertising: boolean;
  at: string;
};

export function parseCookieConsent(raw: string | undefined | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (parsed?.v === 1 && parsed.necessary === true && typeof parsed.advertising === "boolean") {
      return {
        v: 1,
        necessary: true,
        advertising: parsed.advertising,
        at: typeof parsed.at === "string" ? parsed.at : "",
      };
    }
  } catch {
    // cookie corupt / vechi
  }
  return null;
}

export function createCookieConsent(advertising: boolean): CookieConsent {
  return {
    v: 1,
    necessary: true,
    advertising,
    at: new Date().toISOString(),
  };
}

export function isLegalPath(pathname: string): boolean {
  return LEGAL_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
