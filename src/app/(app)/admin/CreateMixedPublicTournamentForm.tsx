"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createMixedPublicTournament,
  fetchMixedTournamentMatchOptions,
  type MixedMatchPickerRow,
} from "@/app/actions/admin";
import type { FootballDataCompetitionPickerOption } from "@/lib/competition";
import { PRIZE_OPTIONS } from "@/lib/tournament-prizes";
import { PrizeSelectors } from "@/components/moderation/prize-selectors";
import { darkOptionStyle, darkSelectStyle } from "@/components/moderation/dark-select-styles";

function isRowEffectivelyPostponed(row: MixedMatchPickerRow, nowMs = Date.now()): boolean {
  if (row.status === "POSTPONED") return true;
  const st = row.status ?? "";
  if (st !== "SCHEDULED" && st !== "TIMED" && st !== "") return false;
  const kick = Date.parse(row.utcDate);
  if (!Number.isFinite(kick)) return false;
  return nowMs - kick > 4 * 60 * 60 * 1000;
}

/** Sortare etape după primul kickoff real (nu amânare); etape doar-amânări la final. */
function matchdaySortKey(md: number, rows: MixedMatchPickerRow[]): number {
  const dayRows = rows.filter((r) => r.matchday === md);
  const scheduled = dayRows.filter((r) => !isRowEffectivelyPostponed(r));
  const pool = scheduled.length > 0 ? scheduled : dayRows;
  let min = Number.POSITIVE_INFINITY;
  for (const r of pool) {
    const t = Date.parse(r.utcDate);
    if (Number.isFinite(t) && t < min) min = t;
  }
  // Doar amânări: după toate etapele cu dată reală
  if (scheduled.length === 0) return Number.MAX_SAFE_INTEGER - 1_000_000 + md;
  return Number.isFinite(min) ? min : Number.MAX_SAFE_INTEGER;
}

function matchdaysFromRows(rows: MixedMatchPickerRow[]): number[] {
  return [
    ...new Set(
      rows
        .map((r) => r.matchday)
        .filter((md): md is number => typeof md === "number" && md > 0),
    ),
  ].sort((a, b) => {
    const ka = matchdaySortKey(a, rows);
    const kb = matchdaySortKey(b, rows);
    if (ka !== kb) return ka - kb;
    return a - b;
  });
}

/** Prima etapă cu cel puțin un meci încă programat (nu doar amânări). */
function preferredUpcomingMatchday(rows: MixedMatchPickerRow[]): number | null {
  const days = matchdaysFromRows(rows);
  for (const md of days) {
    const dayRows = rows.filter((r) => r.matchday === md);
    if (dayRows.some((r) => !isRowEffectivelyPostponed(r))) return md;
  }
  return days[0] ?? null;
}

function matchdayOptionLabel(
  md: number,
  rows: MixedMatchPickerRow[],
  preferredUpcoming: number | null,
): string {
  const dayRows = rows.filter((r) => r.matchday === md);
  const onlyPostponed =
    dayRows.length > 0 && dayRows.every((r) => isRowEffectivelyPostponed(r));
  if (onlyPostponed) return `Etapa ${md} (amânări)`;
  if (preferredUpcoming === md) return `Etapa ${md} (urmează)`;
  return `Etapa ${md}`;
}

/** Cronologic după kickoff; amânările fără dată clară la final. */
function compareRowsChronologically(a: MixedMatchPickerRow, b: MixedMatchPickerRow): number {
  const aPost = isRowEffectivelyPostponed(a);
  const bPost = isRowEffectivelyPostponed(b);
  if (aPost !== bPost) return aPost ? 1 : -1;
  const tA = Date.parse(a.utcDate);
  const tB = Date.parse(b.utcDate);
  if (Number.isFinite(tA) && Number.isFinite(tB) && tA !== tB) return tA - tB;
  const mdA = a.matchday ?? 9999;
  const mdB = b.matchday ?? 9999;
  if (mdA !== mdB) return mdA - mdB;
  return a.matchId - b.matchId;
}

export default function CreateMixedPublicTournamentForm({
  competitionPickerOptions,
}: {
  competitionPickerOptions: FootballDataCompetitionPickerOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedCompetitions, setSelectedCompetitions] = useState<string[]>([]);
  const [matchOptions, setMatchOptions] = useState<MixedMatchPickerRow[]>([]);
  /** Vizualizare etapă per competiție: număr sau „all”. */
  const [matchdayByCompetition, setMatchdayByCompetition] = useState<
    Record<string, number | "all">
  >({});
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<number>>(new Set());
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [prizeCount, setPrizeCount] = useState(0);
  const [prizeSelections, setPrizeSelections] = useState<string[]>([]);
  const [customPrizes, setCustomPrizes] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handlePrizeCountChange(count: number) {
    setPrizeCount(count);
    setPrizeSelections((prev) => {
      const next = [...prev];
      const fallback = customPrizes[0] ?? PRIZE_OPTIONS[0];
      while (next.length < count) next.push(fallback);
      return next.slice(0, count);
    });
  }

  function toggleCompetition(key: string) {
    setSelectedCompetitions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
    setMatchOptions([]);
    setMatchdayByCompetition({});
    setSelectedMatchIds(new Set());
  }

  async function loadMatches() {
    if (selectedCompetitions.length === 0) return;
    setLoadingMatches(true);
    setError(null);
    try {
      const rows = await fetchMixedTournamentMatchOptions(selectedCompetitions);
      setMatchOptions(rows);
      setSelectedMatchIds(new Set());

      const nextDays: Record<string, number | "all"> = {};
      for (const key of selectedCompetitions) {
        const forComp = rows.filter((r) => r.competitionKey === key);
        nextDays[key] = preferredUpcomingMatchday(forComp) ?? "all";
      }
      setMatchdayByCompetition(nextDays);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut încărca meciurile.");
    } finally {
      setLoadingMatches(false);
    }
  }

  function toggleMatch(id: number) {
    setSelectedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const competitionsWithMatches = useMemo(() => {
    const map = new Map<string, MixedMatchPickerRow[]>();
    for (const row of matchOptions) {
      const list = map.get(row.competitionKey) ?? [];
      list.push(row);
      map.set(row.competitionKey, list);
    }
    return map;
  }, [matchOptions]);

  const canSubmit = name.trim() && selectedMatchIds.size > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSuccess(null);
    const prizes = prizeSelections.map((prize, i) => ({ place: i + 1, prize }));
    startTransition(async () => {
      try {
        await createMixedPublicTournament(
          name.trim(),
          selectedCompetitions,
          [...selectedMatchIds],
          prizes,
        );
        setSuccess("Turneu mix creat cu succes!");
        setName("");
        setSelectedCompetitions([]);
        setMatchOptions([]);
        setMatchdayByCompetition({});
        setSelectedMatchIds(new Set());
        setPrizeCount(0);
        setPrizeSelections([]);
        setCustomPrizes([]);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare necunoscută.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-w-0">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          Nume turneu
        </label>
        <input
          type="text"
          placeholder="ex. Weekend Mix — PL + La Liga"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", color: "#fff", borderColor: "rgba(255,255,255,0.12)" }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          Campionate
        </label>
        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
          {competitionPickerOptions.map((c) => {
            const checked = selectedCompetitions.includes(c.storageKey);
            return (
              <label
                key={c.storageKey}
                className="flex items-center gap-2 text-sm cursor-pointer rounded-lg px-2 py-1.5"
                style={{ backgroundColor: checked ? "rgba(59,130,246,0.12)" : "transparent" }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCompetition(c.storageKey)}
                />
                <span className="truncate" style={{ color: "#fff" }}>{c.label}</span>
              </label>
            );
          })}
        </div>
        <button
          type="button"
          onClick={loadMatches}
          disabled={selectedCompetitions.length === 0 || loadingMatches}
          className="mt-1 self-start px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer"
          style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#fff" }}
        >
          {loadingMatches ? "Se încarcă…" : "Încarcă meciurile"}
        </button>
      </div>

      {matchOptions.length > 0 ? (
        <div className="flex flex-col gap-4 min-w-0">
          <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            Selectează etapa, apoi meciurile ({selectedMatchIds.size} selectate)
          </label>
          <p className="text-[11px] -mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
            Poți bifa meciuri din mai multe etape — schimbarea etapei nu șterge selecția.
            La „Toate etapele”, lista e cronologică (ex. un restanț din etapa 4 din octombrie apare lângă meciurile din octombrie).
          </p>

          {[...competitionsWithMatches.entries()].map(([key, rows]) => {
            const matchdays = matchdaysFromRows(rows);
            const preferred = preferredUpcomingMatchday(rows);
            const selectedView = matchdayByCompetition[key] ?? preferred ?? "all";
            const selectedInComp = rows.filter((r) => selectedMatchIds.has(r.matchId)).length;
            const list =
              selectedView === "all"
                ? [...rows].sort(compareRowsChronologically)
                : rows
                    .filter((r) => r.matchday === selectedView)
                    .sort(compareRowsChronologically);

            return (
              <div
                key={key}
                className="rounded-xl border p-3 flex flex-col gap-2 min-w-0"
                style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {rows[0]?.competitionLabel ?? key}
                  </p>
                  {selectedInComp > 0 ? (
                    <span className="text-[10px] font-semibold" style={{ color: "#60A5FA" }}>
                      {selectedInComp} bifate
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Etapă
                  </label>
                  <select
                    value={selectedView === "all" ? "all" : String(selectedView)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const view: number | "all" = raw === "all" ? "all" : Number(raw);
                      setMatchdayByCompetition((prev) => ({ ...prev, [key]: view }));
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border"
                    style={darkSelectStyle}
                  >
                    <option value="all" style={darkOptionStyle}>
                      Toate etapele ({rows.length} meciuri)
                    </option>
                    {matchdays.map((md) => (
                      <option key={md} value={md} style={darkOptionStyle}>
                        {matchdayOptionLabel(md, rows, preferred)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1">
                  {list.length === 0 ? (
                    <p className="text-xs py-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Niciun meci pe această etapă.
                    </p>
                  ) : (
                    list.map((row) => {
                      const checked = selectedMatchIds.has(row.matchId);
                      const postponed = isRowEffectivelyPostponed(row);
                      const date = postponed
                        ? "Amânat — dată de confirmat"
                        : new Date(row.utcDate).toLocaleString("ro-RO", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                      return (
                        <label
                          key={row.matchId}
                          className="flex items-start gap-2 text-sm cursor-pointer rounded-lg px-2 py-2 min-w-0"
                          style={{ backgroundColor: checked ? "rgba(59,130,246,0.15)" : "transparent" }}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 shrink-0"
                            checked={checked}
                            onChange={() => toggleMatch(row.matchId)}
                          />
                          <span className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-white font-medium break-words">
                              {selectedView === "all" && row.matchday != null ? (
                                <span className="text-[10px] font-bold mr-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                                  E{row.matchday}
                                </span>
                              ) : null}
                              {row.home} – {row.away}
                              {postponed ? (
                                <span className="ml-1.5 text-[10px] font-bold" style={{ color: "#FBBF24" }}>
                                  AMÂNAT
                                </span>
                              ) : null}
                            </span>
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                              {date}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <PrizeSelectors
        prizeCount={prizeCount}
        prizeSelections={prizeSelections}
        onPrizeCountChange={handlePrizeCountChange}
        onPrizeChange={(index, value) => {
          setPrizeSelections((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
          });
        }}
        customPrizes={customPrizes}
        onAddCustomPrize={(prize) => {
          setCustomPrizes((prev) => (prev.includes(prize) ? prev : [...prev, prize]));
        }}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm" style={{ color: "#60A5FA" }}>{success}</p>}

      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
        style={{ backgroundColor: "#3B82F6", color: "#0A0B1E" }}
      >
        {isPending ? "Se creează…" : "Creează turneu mix"}
      </button>
    </form>
  );
}
