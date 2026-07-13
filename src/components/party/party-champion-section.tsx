"use client";

import Image from "next/image";
import type { FootballDataTeam } from "@/lib/football-data";
import { WC_BORDER, WC_CYAN } from "@/components/world-cup/wc-theme";

export function PartyChampionSection({
  allTeams,
  championId,
  onSelect,
  disabled = false,
}: {
  allTeams: FootballDataTeam[];
  championId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const sorted = [...allTeams]
    .filter((t) => t.id != null)
    .sort((a, b) =>
      (a.name ?? a.shortName ?? "").localeCompare(b.name ?? b.shortName ?? ""),
    );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Campion mondial</h3>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          Alege echipa pe care o vezi ridicând trofeul. Punctaj maxim la finală.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[min(60vh,28rem)] overflow-y-auto pr-1">
        {sorted.map((t) => {
          const id = String(t.id);
          const selected = championId === id;
          const name = t.name ?? t.shortName ?? `#${t.id}`;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(selected ? "" : id)}
              className="flex flex-col items-center gap-2 rounded-xl px-3 py-3 border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{
                borderColor: selected ? "rgba(59,130,246,0.45)" : WC_BORDER,
                backgroundColor:
                  selected ? "rgba(59,130,246,0.12)" : "rgba(0,0,0,0.2)",
                boxShadow:
                  selected ? "0 0 0 1px rgba(59,130,246,0.25)" : undefined,
              }}
            >
              {t.crest ?
                <Image
                  src={t.crest}
                  alt=""
                  width={44}
                  height={44}
                  className="rounded-lg bg-white/90 p-0.5 object-contain"
                  unoptimized
                />
              : (
                <div
                  className="w-11 h-11 rounded-lg"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                />
              )}
              <span
                className="text-xs sm:text-sm font-semibold text-white text-center leading-snug line-clamp-2"
              >
                {name}
              </span>
              {selected ?
                <span
                  className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: WC_CYAN }}
                >
                  Ales
                </span>
              : null}
            </button>
          );
        })}
      </div>

      {championId && !disabled ?
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Apasă „Salvează” pentru a confirma alegerea.
        </p>
      : null}
    </div>
  );
}
