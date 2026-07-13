"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";
import MiniGamesLeaderboard from "@/components/mini-games/mini-games-leaderboard";
import { formatCountdown } from "@/components/mini-games/format-countdown";
import type { MiniGameLeaderboardPeriod, MiniGameLeaderboardRow } from "@/lib/mini-games/types";

type GameCard = {
  href: string;
  titleKey: "miniGames.card.trivia" | "miniGames.card.champion" | "miniGames.card.bingo";
  descKey: "miniGames.card.triviaDesc" | "miniGames.card.championDesc" | "miniGames.card.bingoDesc";
  progress: string;
  done: boolean;
};

export default function MiniGamesHub({
  resetMs,
  streak,
  cards,
  leaderboardRows,
  leaderboardPeriod,
  currentUserId,
}: {
  resetMs: number;
  streak: number;
  cards: GameCard[];
  leaderboardRows: MiniGameLeaderboardRow[];
  leaderboardPeriod: MiniGameLeaderboardPeriod;
  currentUserId?: string;
}) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t("miniGames.page.title")}</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          {t("miniGames.page.subtitle")}
        </p>
        <p className="text-xs mt-2 text-cyan-300/80">
          {t("miniGames.resetIn", { time: formatCountdown(resetMs) })}
          {streak > 0 && (
            <span className="ml-3 text-amber-300">
              🔥 {t("miniGames.streak", { count: String(streak) })}
            </span>
          )}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border p-5 transition-all hover:border-cyan-400/30 active:scale-[0.98]"
            style={{
              borderColor: card.done ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          >
            <h2 className="font-semibold text-white mb-1">{t(card.titleKey)}</h2>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t(card.descKey)}
            </p>
            <p className="text-sm font-medium" style={{ color: card.done ? "#86efac" : "#3B82F6" }}>
              {card.progress}
            </p>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-bold text-white mb-4">{t("miniGames.lb.title")}</h2>
        <MiniGamesLeaderboard
          rows={leaderboardRows}
          period={leaderboardPeriod}
          onPeriodChange={(p) => router.push(`/mini-jocuri?period=${p}`)}
          currentUserId={currentUserId}
        />
      </section>
    </div>
  );
}
