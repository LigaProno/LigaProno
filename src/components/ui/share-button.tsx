"use client";

import { useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

/**
 * Share pe mobil (native sheet → WhatsApp etc.), copiere în clipboard pe desktop.
 * `getText` e apelat la click ca să prindem gestul userului (cerut de ambele API-uri).
 */
export function ShareButton({ getText, className }: { getText: () => string; className?: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const text = getText();

    // Web Share doar dacă e disponibil (în practică: mobil). Pe desktop → clipboard.
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        // Anulare din sheet → nu tratăm ca eroare; altceva → cădem pe clipboard.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocat (context ne-securizat) — ultimă soluție.
      window.prompt(t("party.share.fallbackPrompt"), text);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
      }
      style={{ backgroundColor: "rgba(37,211,102,0.14)", color: "#25D366" }}
      aria-label={t("party.share.button")}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {copied ? t("common.copied") : t("party.share.button")}
    </button>
  );
}
