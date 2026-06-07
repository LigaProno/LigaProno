"use client";

import Image from "next/image";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatMatchKickoff } from "@/lib/match-datetime";

export type NextThreeTeamSide = {
  name: string;
  shortName?: string;
  crest?: string;
};

export type NextThreeMatchPreds = {
  matchId: number;
  utcDate: string;
  homeTeam: NextThreeTeamSide;
  awayTeam: NextThreeTeamSide;
  venue?: string | null;
  rows: { userId: string; displayName: string; pred: string }[];
};

function TeamSide({ team }: { team: NextThreeTeamSide }) {
  const label = team.shortName ?? team.name;

  return (
    <div className="flex flex-col items-center gap-2.5 min-w-0 flex-1 max-w-[7rem] sm:max-w-[9rem]">
      {team.crest ? (
        <Image
          src={team.crest}
          alt=""
          width={52}
          height={52}
          className="rounded-xl bg-white/95 p-1 object-contain shrink-0 shadow-md"
          unoptimized
        />
      ) : (
        <div
          className="w-[3.25rem] h-[3.25rem] rounded-xl shrink-0"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        />
      )}
      <span
        className="font-bold text-white text-sm sm:text-base text-center leading-snug line-clamp-2"
        title={team.name}
      >
        {label}
      </span>
    </div>
  );
}

function MatchPredictionsBlock({
  block,
  currentUserId,
  dateLocale,
  stadiumTbd,
  romaniaTimeSuffix,
}: {
  block: NextThreeMatchPreds;
  currentUserId: string;
  dateLocale: string;
  stadiumTbd: string;
  romaniaTimeSuffix: string;
}) {
  const when = formatMatchKickoff(block.utcDate, dateLocale);
  const venue = block.venue ?? stadiumTbd;

  return (
    <article
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(34,211,238,0.18)" }}
    >
      <div
        className="px-4 py-5 sm:px-6 sm:py-6"
        style={{
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.92) 100%)",
        }}
      >
        <div className="flex items-center justify-center gap-3 sm:gap-6 max-w-lg mx-auto">
          <TeamSide team={block.homeTeam} />

          <div
            className="flex flex-col items-center justify-center shrink-0 px-3 py-3 rounded-xl min-w-[6.5rem] sm:min-w-[7.5rem]"
            style={{
              backgroundColor: "rgba(0,0,0,0.32)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              vs
            </span>
            <span
              className="mt-1.5 text-xs sm:text-sm font-semibold tabular-nums text-center leading-snug"
              style={{ color: "#67E8F9" }}
            >
              {when}
            </span>
            <span className="text-[10px] mt-1" style={{ color: "#BEF264" }}>
              {romaniaTimeSuffix}
            </span>
            <span
              className="text-[10px] mt-2 text-center line-clamp-2 leading-snug max-w-[9rem]"
              style={{ color: "rgba(255,255,255,0.42)" }}
            >
              {venue}
            </span>
          </div>

          <TeamSide team={block.awayTeam} />
        </div>
      </div>

      <div
        className="px-4 py-3 sm:px-5 sm:py-3.5 flex flex-wrap gap-x-4 gap-y-2"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          backgroundColor: "rgba(15,23,42,0.55)",
        }}
      >
        {block.rows.map((row) => (
          <span
            key={row.userId}
            className="inline-flex items-baseline gap-1.5 text-xs sm:text-sm"
          >
            <span
              className="font-medium truncate max-w-[8rem] sm:max-w-[10rem]"
              style={{
                color:
                  row.userId === currentUserId ? "#22D3EE" : "rgba(255,255,255,0.55)",
              }}
              title={row.displayName}
            >
              {row.displayName}
            </span>
            <span
              className="font-mono font-semibold tabular-nums shrink-0"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              {row.pred || "—"}
            </span>
          </span>
        ))}
      </div>
    </article>
  );
}

export function NextThreePredictionsPanel({
  matches,
  currentUserId,
}: {
  matches: NextThreeMatchPreds[];
  currentUserId: string;
}) {
  const { t, dateLocale } = useLocale();

  if (matches.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-white font-semibold text-sm px-0.5">
        {t("party.nextThree.title")}
      </h3>
      <div className="flex flex-col gap-4">
        {matches.map((block) => (
          <MatchPredictionsBlock
            key={block.matchId}
            block={block}
            currentUserId={currentUserId}
            dateLocale={dateLocale}
            stadiumTbd={t("matches.stadiumTbd")}
            romaniaTimeSuffix={t("matches.romaniaTimeSuffix")}
          />
        ))}
      </div>
    </section>
  );
}
