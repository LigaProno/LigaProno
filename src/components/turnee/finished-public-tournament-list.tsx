"use client";

import { useState } from "react";
import { loadRemainingFinishedPublicTournaments } from "@/app/actions/finished-public-tournaments";
import { useLocale } from "@/components/i18n/locale-provider";
import { TurneePublicTournamentCard } from "@/components/turnee/turnee-public-tournament-card";
import { formatCaughtError } from "@/lib/i18n/errors";
import type { FinishedPublicCardData } from "@/lib/public-tournaments";

export function FinishedPublicTournamentList({
  initial,
  total,
  emptyText,
  openLabel,
  finishedLabel,
}: {
  initial: FinishedPublicCardData[];
  total: number;
  emptyText: string;
  openLabel: string;
  finishedLabel: string;
}) {
  const { t } = useLocale();
  const [extra, setExtra] = useState<FinishedPublicCardData[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hiddenCount = Math.max(0, total - initial.length);
  const visible = expanded && extra ? [...initial, ...extra] : initial;

  async function showMore() {
    if (extra) {
      setExpanded(true);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const rest = await loadRemainingFinishedPublicTournaments(initial.map((tournament) => tournament.id));
      setExtra(rest);
      setExpanded(true);
    } catch (err) {
      setError(formatCaughtError(err, t));
    } finally {
      setPending(false);
    }
  }

  if (visible.length === 0) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{ borderColor: "rgba(255,255,255,0.08)", borderStyle: "dashed" }}
      >
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          {emptyText}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {visible.map((tournament) => (
        <TurneePublicTournamentCard
          key={tournament.id}
          id={tournament.id}
          name={tournament.name}
          memberCount={tournament.memberCount}
          prizesRaw={tournament.prizesRaw}
          isJoined={tournament.isJoined}
          openLabel={openLabel}
          isFinished
          finishedLabel={finishedLabel}
          prizePool={tournament.prizePool}
        />
      ))}

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            if (expanded) setExpanded(false);
            else void showMore();
          }}
          disabled={pending}
          className="w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.72)",
            backgroundColor: "rgba(255,255,255,0.03)",
          }}
        >
          {pending
            ? t("common.loading")
            : expanded
              ? t("tournament.page.showLessFinished")
              : t("tournament.page.showMoreFinished", { count: hiddenCount })}
        </button>
      ) : null}

      {error ? (
        <p className="text-sm text-center" style={{ color: "#f87171" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
