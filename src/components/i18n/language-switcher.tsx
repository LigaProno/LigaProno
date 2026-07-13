"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { Locale } from "@/lib/i18n";

const options: { locale: Locale; label: string }[] = [
  { locale: "ro", label: "RO" },
  { locale: "en", label: "EN" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={t("language.label")}
    >
      {!compact && (
        <span className="text-[10px] uppercase tracking-wider mr-1 hidden sm:inline" style={{ color: "rgba(255,255,255,0.35)" }}>
          {t("language.label")}
        </span>
      )}
      {options.map(({ locale: loc, label }) => {
        const active = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => void setLocale(loc)}
            className="px-2 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors"
            style={{
              backgroundColor: active ? "rgba(59,130,246,0.18)" : "transparent",
              color: active ? "#3B82F6" : "rgba(255,255,255,0.55)",
              border: active ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(255,255,255,0.12)",
            }}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
