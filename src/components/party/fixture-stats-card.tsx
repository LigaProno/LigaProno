"use client";

import { useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

export type StatMember = { userId: string; displayName: string };

export type FixtureStats = {
  mostWins: { count: number; members: StatMember[] } | null;
  mostPointsSingle: { points: number; matchday: number; members: StatMember[] } | null;
  bestStreak: { streak: number; members: StatMember[] } | null;
} | null;

function StatRow({
  icon,
  label,
  value,
  sub,
  members,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  members: StatMember[];
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const leader = members[0];
  const extra = members.length - 1;
  if (!leader) return null;

  return (
    <div className="flex flex-col gap-1.5 py-3 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
            <span aria-hidden>{icon}</span> {label}
          </span>
          <span className="text-sm font-semibold text-white truncate">
            {leader.displayName}
            {extra > 0 && !open ? (
              <span className="font-medium" style={{ color: "rgba(255,255,255,0.45)" }}> +{extra}</span>
            ) : null}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-base font-extrabold" style={{ color: "#60A5FA" }}>{value}</span>
          {sub ? <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</div> : null}
        </div>
      </div>

      {extra > 0 ? (
        <div className="flex flex-col gap-1">
          {open ? (
            <ul className="flex flex-col gap-0.5 pl-0.5">
              {members.slice(1).map((m) => (
                <li key={m.userId} className="text-xs truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {m.displayName}
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="self-start text-[11px] font-medium transition-colors hover:text-white/80"
            style={{ color: "#67E8F9" }}
          >
            {open ? t("party.fixtureStats.less") : t("party.fixtureStats.more", { count: extra })}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Card lateral cu statistici pe etape (doar turnee private). */
export function FixtureStatsCard({ stats }: { stats: FixtureStats }) {
  const { t } = useLocale();
  if (!stats) return null;

  return (
    <aside
      className="w-full rounded-2xl border p-4 flex flex-col gap-1"
      style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" }}
    >
      <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
        📊 {t("party.fixtureStats.title")}
      </h3>

      {stats.mostWins ? (
        <StatRow
          icon="🏆"
          label={t("party.fixtureStats.mostWins")}
          value={String(stats.mostWins.count)}
          sub={t("party.fixtureStats.winsUnit")}
          members={stats.mostWins.members}
        />
      ) : null}

      {stats.mostPointsSingle ? (
        <StatRow
          icon="🔥"
          label={t("party.fixtureStats.mostPoints")}
          value={String(stats.mostPointsSingle.points)}
          sub={t("party.fixtureStats.matchdayTag", { matchday: stats.mostPointsSingle.matchday })}
          members={stats.mostPointsSingle.members}
        />
      ) : null}

      {stats.bestStreak ? (
        <StatRow
          icon="🎯"
          label={t("party.fixtureStats.bestStreak")}
          value={String(stats.bestStreak.streak)}
          sub={t("party.fixtureStats.streakUnit")}
          members={stats.bestStreak.members}
        />
      ) : null}
    </aside>
  );
}
