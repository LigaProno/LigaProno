"use client";

import { useEffect } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import {
  REMEMBER_ME_COOKIE,
  REMEMBER_ME_SESSION_FLAG,
  REMEMBERED_EMAIL_KEY,
} from "@/lib/cookie-consent";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/**
 * Dacă userul a debifat „Ține-mă minte”, sesiunea rămâne doar cât e deschis browserul.
 * La o vizită nouă (fără sessionStorage) îl deconectăm.
 */
export function RememberMeGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (readCookie(REMEMBER_ME_COOKIE) !== "0") return;
    if (sessionStorage.getItem(REMEMBER_ME_SESSION_FLAG) === "1") return;
    void signOut({ redirectUrl: "/sign-in" });
  }, [isLoaded, isSignedIn, signOut]);

  return null;
}

export function markEphemeralSession() {
  sessionStorage.setItem(REMEMBER_ME_SESSION_FLAG, "1");
}

export function persistRememberedEmail(email: string) {
  try {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
  } catch {
    // private mode / storage blocked
  }
}

export function readRememberedEmail(): string {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearRememberedEmail() {
  try {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // ignore
  }
}
