"use client";

import { venueLabel } from "@/lib/football-data";
import type { FootballDataMatch } from "@/lib/football-data";
import { formatMatchKickoff } from "@/lib/match-datetime";
import { useLocale } from "@/components/i18n/locale-provider";
import { matchResultHtFt, matchResultFtWithSuffix } from "@/lib/wc-pred-display";
import Image from "next/image";

function isLiveStatus(status?: string): boolean {
  return status === "IN_PLAY" || status === "PAUSED" || status === "LIVE";
}

export function FootballDataMatchCard({ m }: { m: FootballDataMatch }) {
  const { t, dateLocale, locale } = useLocale();
  const venue = venueLabel(m);
  const when = formatMatchKickoff(m.utcDate, dateLocale);
  const home = m.homeTeam.name ?? m.homeTeam.shortName ?? "—";
  const away = m.awayTeam.name ?? m.awayTeam.shortName ?? "—";
  const hl = m.homeTeam.crest;
  const al = m.awayTeam.crest;
  const { ht, ft } = matchResultHtFt(m);
  const ftDisplay = matchResultFtWithSuffix(m, locale === "en" ? "en" : "ro") ?? ft;
  const live = isLiveStatus(m.status);
  const finished = m.status === "FINISHED";
  const hasScore = ht != null || ft != null;

  return (
    <div
      className="max-w-xl mx-auto w-full rounded-2xl border overflow-hidden relative"
      style={{
        borderColor: live ? "rgba(248,113,113,0.35)" : "rgba(34,211,238,0.22)",
        background:
          "linear-gradient(145deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.88) 100%)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-70"
        style={{
          background:
            "linear-gradient(90deg, transparent, #22D3EE, #BEF264, transparent)",
        }}
      />
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid grid-cols-[1fr_minmax(8rem,1.2fr)_1fr] gap-3 sm:gap-5 items-stretch">
          <div className="flex flex-col items-center justify-center gap-2.5 text-center min-w-0 px-3 py-2">
            {hl ? (
              <Image
                src={hl}
                alt=""
                width={40}
                height={40}
                className="rounded-lg bg-white/90 p-0.5 mx-auto object-contain shrink-0"
                unoptimized
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg shrink-0 mx-auto"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              />
            )}
            <span className="font-bold text-white text-sm sm:text-base leading-snug break-words hyphens-auto">
              {home}
            </span>
          </div>

          <div
            className="flex flex-col items-center justify-center text-center px-4 py-4 rounded-xl min-h-[5rem]"
            style={{
              backgroundColor: "rgba(0,0,0,0.28)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {hasScore ?
              <>
                {live ?
                  <span className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#F87171" }}>
                    {t("matches.live")}
                  </span>
                : finished ?
                  <span className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {t("matches.finished")}
                  </span>
                : null}
                <span className="text-xl sm:text-2xl font-black tabular-nums text-white tracking-wide">
                  {ftDisplay ?? "—"}
                </span>
                {ht ?
                  <span className="text-[11px] mt-1 tabular-nums" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {t("party.lb.ht")} {ht}
                  </span>
                : null}
              </>
            : <>
                <span
                  className="text-[11px] sm:text-xs font-semibold leading-snug line-clamp-4 px-1"
                  style={{ color: "#67E8F9" }}
                >
                  {venue ?? t("matches.stadiumTbd")}
                </span>
                <span
                  className="text-[10px] mt-2 font-medium tabular-nums"
                  style={{ color: "#BEF264" }}
                >
                  {when} {t("matches.romaniaTimeSuffix")}
                </span>
              </>
            }
          </div>

          <div className="flex flex-col items-center justify-center gap-2.5 text-center min-w-0 px-3 py-2">
            {al ? (
              <Image
                src={al}
                alt=""
                width={40}
                height={40}
                className="rounded-lg bg-white/90 p-0.5 mx-auto object-contain shrink-0"
                unoptimized
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg shrink-0 mx-auto"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              />
            )}
            <span className="font-bold text-white text-sm sm:text-base leading-snug break-words hyphens-auto">
              {away}
            </span>
          </div>
        </div>

        {hasScore ?
          <p className="text-center text-[10px] mt-3 tabular-nums" style={{ color: "rgba(255,255,255,0.38)" }}>
            {when} {t("matches.romaniaTimeSuffix")}
            {venue ? ` · ${venue}` : ""}
          </p>
        : null}
      </div>
    </div>
  );
}
