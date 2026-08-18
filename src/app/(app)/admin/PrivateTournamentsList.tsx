"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type PrivateTournamentRow = {
  id: string;
  name: string;
  inviteCode: string;
  closed: boolean;
  competitionLabel: string;
  memberCount: number;
  creatorLabel: string;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function PrivateTournamentsList({ tournaments }: { tournaments: PrivateTournamentRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return tournaments;
    return tournaments.filter((t) => normalize(t.name).includes(q));
  }, [query, tournaments]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-lg font-semibold text-white">Turnee private</h2>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          {query.trim()
            ? `${filtered.length} din ${tournaments.length} turnee`
            : `${tournaments.length} turnee`}
        </span>
      </div>

      {tournaments.length > 0 ? (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caută după nume..."
          aria-label="Caută turnee private după nume"
          className="w-full px-3 py-2.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
        />
      ) : null}

      {tournaments.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
        >
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
            Niciun turneu privat creat încă.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
        >
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
            Niciun turneu cu numele „{query.trim()}”.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                borderColor: "rgba(255,255,255,0.08)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-white font-semibold truncate">{t.name}</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {t.creatorLabel} · {t.memberCount} membri
                </span>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
                  >
                    {t.competitionLabel}
                  </span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-md font-mono"
                    style={{ backgroundColor: "rgba(96,165,250,0.1)", color: "#60A5FA" }}
                  >
                    {t.inviteCode}
                  </span>
                  {t.closed ? (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                    >
                      Închis
                    </span>
                  ) : null}
                </div>
              </div>
              <Link
                href={`/turnee/${t.id}`}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 shrink-0 self-start sm:self-auto"
                style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#FFFFFF" }}
              >
                Deschide
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
