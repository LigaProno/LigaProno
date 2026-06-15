"use client";

import { useState } from "react";
import CreateTournamentForm from "@/components/CreateTournamentForm";
import JoinTournamentForm from "@/components/JoinTournamentForm";
import { useLocale } from "@/components/i18n/locale-provider";
import type { FootballDataCompetitionPickerOption } from "@/lib/competition";

type TabId = "create" | "join";

export default function TournamentActionsWidget({
  competitionPickerOptions,
  competitionsLoadError,
}: {
  competitionPickerOptions: FootballDataCompetitionPickerOption[];
  competitionsLoadError: string | null;
}) {
  const { t } = useLocale();
  const [tab, setTab] = useState<TabId>("create");

  const tabs: { id: TabId; label: string }[] = [
    { id: "create", label: t("tournament.create.title") },
    { id: "join", label: t("tournament.join.title") },
  ];

  return (
    <div
      className="rounded-2xl border p-5 sm:p-6 flex flex-col gap-4"
      style={{ backgroundColor: "#1E293B", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        role="tablist"
      >
        {tabs.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className="flex-1 rounded-lg py-2.5 px-3 text-sm font-bold transition-all cursor-pointer"
              style={
                active
                  ? {
                      backgroundColor: id === "create" ? "rgba(34,211,238,0.2)" : "rgba(190,242,100,0.15)",
                      color: id === "create" ? "#22D3EE" : "#BEF264",
                      border: `1px solid ${id === "create" ? "rgba(34,211,238,0.4)" : "rgba(190,242,100,0.35)"}`,
                    }
                  : {
                      color: "rgba(255,255,255,0.5)",
                      border: "1px solid transparent",
                    }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "create" ?
        <CreateTournamentForm
          embedded
          competitionPickerOptions={competitionPickerOptions}
          competitionsLoadError={competitionsLoadError}
        />
      : <JoinTournamentForm embedded />}
    </div>
  );
}
