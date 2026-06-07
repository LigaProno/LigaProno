"use client";

import { useLocale } from "@/components/i18n/locale-provider";

export function MatchesLoading() {
  const { t } = useLocale();
  return (
    <div
      className="min-h-[40vh] flex items-center justify-center text-sm"
      style={{ color: "rgba(255,255,255,0.45)" }}
    >
      {t("matches.loading")}
    </div>
  );
}
