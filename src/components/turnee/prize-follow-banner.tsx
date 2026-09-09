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
      className="rounded-2xl border-2 p-5 sm:p-7 flex flex-col gap-2"
      style={{
        borderColor: "#D4AF37",
        background:
          "linear-gradient(135deg, rgba(212,175,55,0.32) 0%, rgba(212,175,55,0.14) 55%, rgba(212,175,55,0.06) 100%)",
        boxShadow: "0 0 0 1px rgba(212,175,55,0.25), 0 10px 40px rgba(212,175,55,0.15)",
      }}
    >
      <div className="flex flex-col gap-2 min-w-0">
        <h3
          className="text-lg sm:text-2xl font-extrabold uppercase tracking-wide"
          style={{ color: "#F0D585" }}
        >
          {t("party.followBanner.title")}
        </h3>
        <p className="text-xl sm:text-3xl font-extrabold leading-tight text-white">
          {t("party.followBanner.followOn")}{" "}
          <IgLink href={INSTAGRAM_URL}>Liga Prono</IgLink>
          {CONTEST_PARTNERS.map((partner) => (
            <span key={partner.name}>
              {" "}
              {t("party.followBanner.and")} <IgLink href={partner.instagramUrl}>{partner.name}</IgLink>
            </span>
          ))}{" "}
          <span
            className="inline-block px-1.5 rounded"
            style={{ color: "#0A0B1E", backgroundColor: "#F0D585" }}
          >
            {t("party.followBanner.beforeStart")}
          </span>
          !
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-white/70">
          {t("party.followBanner.orNoPrize")}
        </p>
      </div>
    </div>
  );
}
