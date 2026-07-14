"use client";

import { useMemo, useState } from "react";
import type { ProfileCompetitionOption, ProfileTeamOption } from "@/app/actions/profile";
import { useLocale } from "@/components/i18n/locale-provider";

export function FavoriteTeamPicker({
  competitions,
  competitionKey,
  onCompetitionChange,
  teams,
  teamsLoading,
  value,
  onChange,
  disabled,
}: {
  competitions: ProfileCompetitionOption[];
  competitionKey: string;
  onCompetitionChange: (storageKey: string) => void;
  teams: ProfileTeamOption[];
  teamsLoading?: boolean;
  value: number | null;
  onChange: (teamId: number) => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((team) => team.name.toLowerCase().includes(q));
  }, [query, teams]);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/45">
          {t("profile.favoriteTeam.competitionLabel")}
        </label>
        <select
          value={competitionKey}
          onChange={(e) => onCompetitionChange(e.target.value)}
          disabled={disabled || teamsLoading}
          className="auth-input w-full"
        >
          {competitions.map((c) => (
            <option key={c.storageKey} value={c.storageKey}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-white/35">{t("profile.favoriteTeam.competitionHint")}</p>
      </div>

      {teamsLoading ?
        <p className="text-sm text-white/45">{t("common.loading")}</p>
      : teams.length === 0 ?
        <p className="text-sm text-white/45">{t("profile.favoriteTeam.unavailable")}</p>
      : (
        <>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/45">
              {t("profile.favoriteTeam.teamLabel")}
            </label>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("profile.favoriteTeam.search")}
              className="auth-input w-full"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2 max-h-72 overflow-y-auto pr-1 sm:grid-cols-2">
            {filtered.map((team) => {
              const selected = value === team.id;
              return (
                <button
                  key={team.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(team.id)}
                  className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50"
                  style={{
                    borderColor: selected ? "rgba(197,160,89,0.55)" : "rgba(255,255,255,0.08)",
                    backgroundColor: selected ? "rgba(197,160,89,0.12)" : "rgba(255,255,255,0.03)",
                  }}
                >
                  {team.crest ?
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.crest} alt="" className="h-7 w-7 shrink-0 object-contain" />
                  : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                      {team.name.slice(0, 2).toUpperCase()}
                    </span>
                  }
                  <span className="text-sm font-medium text-white/90">{team.name}</span>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 ?
            <p className="text-sm text-white/45">{t("profile.favoriteTeam.noResults")}</p>
          : null}
        </>
      )}
    </div>
  );
}
