"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrizesDisplay, type TournamentPrize } from "@/lib/tournament-prizes";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  WC_CYAN,
  WC_GOLD,
  WC_GREEN,
  WC_NAVY,
} from "@/components/world-cup/wc-theme";

const HERO_IMAGE = "/newhero.jpg";

export type HomeTournament = {
  id: string;
  name: string;
  memberCount: number;
  prizes: TournamentPrize[];
  competitionLabel: string | null;
};

type DashboardHomeProps = {
  tournaments: HomeTournament[];
};

function TournamentCard({ tt }: { tt: HomeTournament }) {
  const { t } = useLocale();
  const prizeText = formatPrizesDisplay(tt.prizes);

  return (
    <Link
      href={`/turnee/${tt.id}`}
      className="group flex flex-col rounded-2xl border overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        borderColor: prizeText ? "rgba(197,160,89,0.3)" : "rgba(255,255,255,0.1)",
        backgroundColor: "rgba(255,255,255,0.05)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      }}
    >
      {prizeText ? (
        <div
          className="px-4 py-2.5 border-b"
          style={{
            borderColor: "rgba(197,160,89,0.18)",
            background: "linear-gradient(90deg, rgba(197,160,89,0.14) 0%, rgba(197,160,89,0.03) 100%)",
          }}
        >
          <p className="text-xs leading-snug truncate" style={{ color: "rgba(255,255,255,0.8)" }}>
            <span className="font-bold" style={{ color: WC_GOLD }}>🎁 {t("dashboard.tournaments.prizes")}</span>{" "}
            {prizeText}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 p-5 flex-1">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-white truncate group-hover:underline underline-offset-2">
            {tt.name}
          </h3>
          {tt.competitionLabel ? (
            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
              {tt.competitionLabel}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between mt-auto pt-1">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            {t("dashboard.tournaments.members", { count: tt.memberCount })}
          </span>
          <span className="text-sm font-bold transition-transform group-hover:translate-x-0.5" style={{ color: WC_CYAN }}>
            {t("dashboard.tournaments.open")} →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardHome({ tournaments }: DashboardHomeProps) {
  const { t } = useLocale();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <section
        className="relative overflow-hidden min-h-[min(52vh,460px)] flex items-center"
        style={{ backgroundColor: WC_NAVY }}
      >
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,11,18,0.55) 0%, rgba(8,11,18,0.4) 45%, rgba(8,11,18,0.85) 100%)",
          }}
        />

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-14 py-14 sm:py-16 max-w-6xl mx-auto flex flex-col items-center justify-center text-center min-h-[inherit]">
          <span
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wide mb-5"
            style={{
              backgroundColor: "rgba(197,160,89,0.16)",
              color: WC_GOLD,
              border: "1px solid rgba(197,160,89,0.35)",
            }}
          >
            🎁 {t("dashboard.hero.badge")}
          </span>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight max-w-2xl">
            {t("dashboard.hero.titlePrefix")}{" "}
            <span style={{ color: WC_GOLD }}>{t("dashboard.hero.titleHighlight")}</span>
          </h1>

          <p
            className="text-base sm:text-lg max-w-xl mb-7 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.82)" }}
          >
            {t("dashboard.hero.subtitle")}
          </p>

          <Link
            href="/turnee"
            className="px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base shadow-lg transition hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: WC_CYAN, color: WC_NAVY }}
          >
            {t("dashboard.hero.predictCta")}
          </Link>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-1 opacity-80 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${WC_GREEN}, ${WC_GOLD}, ${WC_CYAN}, transparent)`,
          }}
        />
      </section>

      <div className="px-6 sm:px-10 lg:px-14 pb-16 max-w-6xl mx-auto mt-8">
        <section>
          <div className="flex items-end justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                {t("dashboard.tournaments.title")}
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                {t("dashboard.tournaments.subtitle")}
              </p>
            </div>
            <Link
              href="/turnee"
              className="shrink-0 text-sm font-semibold hover:underline underline-offset-2"
              style={{ color: WC_CYAN }}
            >
              {t("dashboard.tournaments.seeAll")} →
            </Link>
          </div>

          {tournaments.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center text-sm"
              style={{ borderColor: "rgba(255,255,255,0.1)", borderStyle: "dashed", color: "rgba(255,255,255,0.45)" }}
            >
              {t("dashboard.tournaments.empty")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tt) => (
                <TournamentCard key={tt.id} tt={tt} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
