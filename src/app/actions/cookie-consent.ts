"use server";

import { cookies } from "next/headers";
import {
  COOKIE_CONSENT_NAME,
  FIRST_PARTY_COOKIE_OPTIONS,
  REMEMBER_ME_COOKIE,
  createCookieConsent,
  type CookieConsent,
} from "@/lib/cookie-consent";

export async function saveCookieConsent(
  advertising: boolean,
): Promise<{ ok: true; consent: CookieConsent } | { ok: false; error: string }> {
  try {
    const consent = createCookieConsent(advertising);
    const store = await cookies();
    store.set(COOKIE_CONSENT_NAME, JSON.stringify(consent), FIRST_PARTY_COOKIE_OPTIONS);
    return { ok: true, consent };
  } catch (e) {
    console.error("[cookie-consent] save failed:", e);
    return { ok: false, error: "Eroare la salvare. Încearcă din nou." };
  }
}

export async function saveRememberMe(remember: boolean): Promise<void> {
  const store = await cookies();
  store.set(REMEMBER_ME_COOKIE, remember ? "1" : "0", FIRST_PARTY_COOKIE_OPTIONS);
}
