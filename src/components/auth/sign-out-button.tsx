"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const { signOut } = useClerk();
  const { t } = useLocale();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
      style={{
        color: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        backgroundColor: "transparent",
      }}
      title={t("nav.signOut")}
      aria-label={t("nav.signOut")}
    >
      <svg
        className="w-3.5 h-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      {!compact ? <span>{pending ? "…" : t("nav.signOut")}</span> : null}
    </button>
  );
}
