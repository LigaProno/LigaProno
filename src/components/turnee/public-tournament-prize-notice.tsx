"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { INSTAGRAM_URL } from "@/lib/social-links";

export function PublicTournamentPrizeNotice() {
  const { t } = useLocale();

  return (
    <p className="text-xs leading-relaxed text-white/45">
      {t("tournament.page.prizeEligibilityPrefix")}{" "}
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#D4AF37] transition-colors hover:text-[#E8C878]"
      >
        Instagram
      </a>
      .
    </p>
  );
}
