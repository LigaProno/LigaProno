"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copyPredictionsToTournaments } from "@/app/actions/wc-predictions";
import { findCompetitionPickerOption } from "@/lib/competition";
import { useLocale } from "@/components/i18n/locale-provider";

export type CopyTargetTournament = {
  id: string;
  name: string;
  competition: string | null;
};

export function CopyPredictionsModal({
  sourceTournamentId,
  sourceCompetition,
  tournaments,
  beforeCopy,
  onClose,
}: {
  sourceTournamentId: string;
  sourceCompetition: string | null;
  tournaments: CopyTargetTournament[];
  beforeCopy?: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const compatible = (comp: string | null) => !!comp && comp === sourceCompetition;

  const handleCopy = () => {
    if (selected.size === 0) return;
    setError(null);
    setDone(null);
    startTransition(async () => {
      try {
        if (beforeCopy) await beforeCopy();
        const results = await copyPredictionsToTournaments(sourceTournamentId, [...selected]);
        const total = results.reduce((n, r) => n + r.copied, 0);
        setDone(t("party.copyPreds.done", { count: results.length, total }));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: "#0D1422", borderColor: "rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-white">{t("party.copyPreds.title")}</h3>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            {t("party.copyPreds.hint")}
          </p>
        </div>

        {tournaments.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
            {t("party.copyPreds.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {tournaments.map((tt) => {
              const ok = compatible(tt.competition);
              const isSel = selected.has(tt.id);
              return (
                <button
                  key={tt.id}
                  type="button"
                  disabled={!ok || isPending}
                  onClick={() => toggle(tt.id)}
                  className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed"
                  style={{
                    borderColor: isSel ? "#3B82F6" : "rgba(255,255,255,0.1)",
                    backgroundColor: isSel ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                    opacity: ok ? 1 : 0.5,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] font-bold"
                    style={{
                      backgroundColor: isSel ? "#3B82F6" : "transparent",
                      border: isSel ? "none" : "1.5px solid rgba(255,255,255,0.3)",
                      color: "#0A0B1E",
                    }}
                  >
                    {isSel ? "✓" : ""}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-white truncate">{tt.name}</span>
                    <span className="text-[11px]" style={{ color: ok ? "rgba(255,255,255,0.4)" : "#F87171" }}>
                      {ok
                        ? findCompetitionPickerOption(tt.competition).label
                        : t("party.copyPreds.differentComp")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {done ? <p className="text-sm" style={{ color: "#34D399" }}>{done}</p> : null}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/[0.06]"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {t("party.copyPreds.cancel")}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={selected.size === 0 || isPending}
            className="px-5 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "#3B82F6", color: "#0A0B1E" }}
          >
            {isPending ? t("party.copyPreds.copying") : t("party.copyPreds.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
