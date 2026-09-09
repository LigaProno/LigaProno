"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { CONTEST_PARTNERS, INSTAGRAM_URL } from "@/lib/social-links";

function IgLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-extrabold underline decoration-2 underline-offset-2 transition-colors"
      style={{ color: "#E8C878" }}
    >
      {children}
    </a>
  );
}

/**
 * Banner mare și vizibil, doar la turneele publice cu premii: pentru a câștiga
 * premii trebuie să dai follow pe Instagram la Liga Prono + parteneri (ex.
 * Kitman) ÎNAINTE de startul etapei.
 */
export function PrizeFollowBanner() {
  const { t } = useLocale();

  return (
    <div
      className="rounded-2xl border p-4 sm:p-5 flex items-start gap-3 sm:gap-4"
      style={{
        borderColor: "rgba(212,175,55,0.5)",
        background:
          "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 55%, rgba(212,175,55,0.02) 100%)",
      }}
    >
      <span className="text-3xl sm:text-4xl shrink-0 leading-none" aria-hidden>
        📸
      </span>
      <div className="flex flex-col gap-1.5 min-w-0">
        <h3
          className="text-base sm:text-lg font-extrabold uppercase tracking-wide"
          style={{ color: "#E8C878" }}
        >
          {t("party.followBanner.title")}
        </h3>
        <p className="text-base sm:text-xl font-bold leading-snug text-white">
          {t("party.followBanner.followOn")}{" "}
          <IgLink href={INSTAGRAM_URL}>Liga Prono</IgLink>
          {CONTEST_PARTNERS.map((partner) => (
            <span key={partner.name}>
              {" "}
              {t("party.followBanner.and")} <IgLink href={partner.instagramUrl}>{partner.name}</IgLink>
            </span>
          ))}{" "}
          <span style={{ color: "#E8C878" }}>{t("party.followBanner.beforeStart")}</span>.
        </p>
        <p className="text-xs sm:text-sm leading-relaxed text-white/60">
          {t("party.followBanner.orNoPrize")}
        </p>
      </div>
    </div>
  );
}
