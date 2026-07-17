"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import type { LiveFixture } from "@/lib/live-fixtures";

const POLL_MS = 60_000;

export function LiveFixtureBanner({
  tournamentId,
  initial,
}: {
  tournamentId: string;
  initial: LiveFixture[];
}) {
  const { t } = useLocale();
  const [fixtures, setFixtures] = useState<LiveFixture[]>(initial);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/tournament-live?id=${tournamentId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { fixtures?: LiveFixture[] };
        if (!cancelled && Array.isArray(data.fixtures)) setFixtures(data.fixtures);
      } catch {
        // Rețea picată — păstrăm ultimul scor cunoscut.
      }
    }

    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [tournamentId]);

  if (fixtures.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {fixtures.map((f) => {
        const paused = f.status === "PAUSED";
        return (
          <div
            key={f.matchId}
            className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
            style={{
              borderColor: "rgba(248,113,113,0.28)",
              backgroundColor: "rgba(248,113,113,0.07)",
            }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0"
              style={{
                backgroundColor: paused ? "rgba(255,255,255,0.1)" : "rgba(248,113,113,0.18)",
                color: paused ? "rgba(255,255,255,0.7)" : "#F87171",
              }}
            >
              {paused ? null : (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full" style={{ backgroundColor: "#F87171" }} />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#F87171" }} />
                </span>
              )}
              {paused ? t("party.live.paused") : t("party.live.live")}
            </span>

            <div className="flex items-center gap-2 min-w-0 flex-1 justify-center text-sm">
              <span className="flex items-center gap-1.5 min-w-0 justify-end flex-1">
                <span className="text-white font-medium truncate">{f.home}</span>
                {f.homeCrest ? (
                  <Image src={f.homeCrest} alt="" width={18} height={18} className="rounded bg-white/90 p-0.5 object-contain shrink-0" unoptimized />
                ) : null}
              </span>
              <span className="font-bold tabular-nums text-white shrink-0 px-1">
                {f.homeScore}–{f.awayScore}
              </span>
              <span className="flex items-center gap-1.5 min-w-0 flex-1">
                {f.awayCrest ? (
                  <Image src={f.awayCrest} alt="" width={18} height={18} className="rounded bg-white/90 p-0.5 object-contain shrink-0" unoptimized />
                ) : null}
                <span className="text-white font-medium truncate">{f.away}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
