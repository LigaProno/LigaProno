"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { CONTEST_PARTNERS, INSTAGRAM_URL } from "@/lib/social-links";

function IgLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[#D4AF37] transition-colors hover:text-[#E8C878]"
    >
      {children}
    </a>
  );
}

export function PublicTournamentPrizeNotice() {
  const { t } = useLocale();

  return (
    <p className="text-xs leading-relaxed text-white/45">
      {t("tournament.page.prizeEligibilityPrefix")}{" "}
      <IgLink href={INSTAGRAM_URL}>Liga Prono</IgLink>
      {CONTEST_PARTNERS.length > 0 ? (
        <>
          {" "}
          {t("tournament.page.prizeEligibilityAndPartners")}{" "}
          {CONTEST_PARTNERS.map((partner, index) => (
            <span key={partner.name}>
              {index > 0 ? ", " : null}
              <IgLink href={partner.instagramUrl}>{partner.name}</IgLink>
            </span>
          ))}
        </>
      ) : null}
      .{" "}
      <Link
        href="/regulament"
        className="font-medium text-white/70 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white"
      >
        {t("tournament.page.prizeEligibilityRules")}
      </Link>
    </p>
  );
}
