"use client";

import { useState, type ReactNode } from "react";

/**
 * Tab-uri pentru turneele publice: în desfășurare / încheiate.
 * Ambele liste vin randate din server; aici doar comutăm între ele.
 */
export function TurneePublicTabs({
  ongoing,
  finished,
  ongoingCount,
  finishedCount,
  ongoingLabel,
  finishedLabel,
}: {
  ongoing: ReactNode;
  finished: ReactNode;
  ongoingCount: number;
  finishedCount: number;
  ongoingLabel: string;
  finishedLabel: string;
}) {
  // Dacă nu e nimic în desfășurare, deschidem direct pe „încheiate".
  const [tab, setTab] = useState<"ongoing" | "finished">(
    ongoingCount === 0 && finishedCount > 0 ? "finished" : "ongoing",
  );

  const tabs = [
    { id: "ongoing" as const, label: ongoingLabel, count: ongoingCount },
    { id: "finished" as const, label: finishedLabel, count: finishedCount },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map(({ id, label, count }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
              style={
                active
                  ? { backgroundColor: "rgba(197,160,89,0.16)", color: "#C5A059", border: "1px solid rgba(197,160,89,0.35)" }
                  : { backgroundColor: "transparent", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }
              }
            >
              {label}
              {count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {tab === "ongoing" ? ongoing : finished}
    </div>
  );
}
