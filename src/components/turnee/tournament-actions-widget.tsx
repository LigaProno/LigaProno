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

  const tabs: { id: TabId; label: string; hint: string }[] = [
    { id: "create", label: t("tournament.create.title"), hint: t("tournament.page.createTabHint") },
    { id: "join", label: t("tournament.join.title"), hint: t("tournament.page.joinTabHint") },
  ];

  const activeTab = tabs.find((x) => x.id === tab)!;

  return (
    <div className="turnee-actions-widget">
      <div className="turnee-panel-accent" aria-hidden />

      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="turnee-kicker">{t("tournament.page.actionsKicker")}</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
          {activeTab.hint}
        </p>
      </div>

      <div className="flex p-1.5 gap-1" role="tablist" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
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
              style={{
                color: active ? "#071428" : "rgba(255,255,255,0.55)",
                background: active ?
                  "linear-gradient(135deg, #C5A059 0%, #D4AF37 100%)"
                : "transparent",
                boxShadow: active ? "0 4px 16px rgba(197,160,89,0.22)" : "none",
              }}
            >
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
