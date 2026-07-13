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
      className="rounded-xl border flex flex-col gap-0 overflow-hidden"
      style={{
        backgroundColor: "#0D1422",
        borderColor: "rgba(255,255,255,0.08)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="flex border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
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
              className="flex-1 py-3.5 px-4 text-sm font-semibold transition-colors duration-100 cursor-pointer relative"
              style={{
                color: active ? "#EEF2FF" : "rgba(255,255,255,0.35)",
                backgroundColor: active ? "rgba(255,255,255,0.04)" : "transparent",
              }}
            >
              {active && (
                <span
                  className="absolute bottom-0 left-4 right-4 h-px"
                  style={{ backgroundColor: id === "create" ? "#22D3EE" : "#BEF264" }}
                />
              )}
              {label}
            </button>
          );
        })}
      </div>
      <div className="p-5 sm:p-6">

      {tab === "create" ?
        <CreateTournamentForm
          embedded
          competitionPickerOptions={competitionPickerOptions}
          competitionsLoadError={competitionsLoadError}
        />
      : <JoinTournamentForm embedded />}
      </div>
    </div>
  );
}
