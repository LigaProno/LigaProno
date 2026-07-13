"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTournament } from "@/app/actions/tournament";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatCaughtError } from "@/lib/i18n/errors";
import type { FootballDataCompetitionPickerOption } from "@/lib/competition";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function CreateTournamentForm({
  competitionPickerOptions = [],
  competitionsLoadError = null,
  embedded = false,
}: {
  competitionPickerOptions?: FootballDataCompetitionPickerOption[];
  competitionsLoadError?: string | null;
  embedded?: boolean;
}) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeReady, setCodeReady] = useState(false);

  useEffect(() => { setCode(generateCode()); setCodeReady(true); }, []);

  const [competitionKey, setCompetitionKey] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canSubmit = name.trim() && codeReady && code.trim() && competitionKey.trim() && competitionPickerOptions.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await createTournament(name.trim(), code.trim(), competitionKey.trim());
        setCreatedCode(result.inviteCode);
        setName(""); setCode(generateCode()); setCompetitionKey("");
        router.refresh();
      } catch (err) { setError(formatCaughtError(err, t)); }
    });
  }

  function copyCode() {
    if (!createdCode) return;
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={embedded ? "flex flex-col gap-4" : "rounded-xl border p-6 flex flex-col gap-4"}
      style={embedded ? undefined : { backgroundColor: "#0D1422", borderColor: "rgba(255,255,255,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)" }}
    >
      {!embedded && (
        <div>
          <h2 className="text-white font-bold text-lg">{t("tournament.create.title")}</h2>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.42)" }}>{t("tournament.create.subtitle")}</p>
        </div>
      )}

      {createdCode ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold" style={{ color: "#BEF264" }}>{t("tournament.create.success")}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg px-4 py-3 text-center text-lg font-bold tracking-[0.25em]"
              style={{ backgroundColor: "#060911", color: "#22D3EE", border: "1px solid rgba(34,211,238,0.2)" }}>
              {createdCode}
            </div>
            <button onClick={copyCode} className="ph-btn-primary shrink-0 rounded-lg text-sm" style={{ padding: "11px 16px" }}>
              {copied ? t("common.copied") : t("common.copy")}
            </button>
          </div>
          <button onClick={() => setCreatedCode(null)} className="text-sm text-center transition-opacity hover:opacity-70"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            {t("tournament.create.createAnother")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.35)" }}>
              {t("tournament.create.nameLabel")}
            </label>
            <input type="text" placeholder={t("tournament.create.namePlaceholder")} value={name}
              onChange={(e) => setName(e.target.value)} maxLength={50} className="ph-input" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.35)" }}>
              {t("tournament.create.competitionLabel")}
            </label>
            {competitionsLoadError && <p className="text-xs" style={{ color: "#fbbf24" }}>{competitionsLoadError}</p>}
            {competitionPickerOptions.length === 0 ? (
              <p className="text-xs" style={{ color: "#fbbf24" }}>{t("tournament.create.noWorldCup")}</p>
            ) : (
              <select value={competitionKey} onChange={(e) => setCompetitionKey(e.target.value)} required
                className="ph-input" style={{ color: competitionKey ? "#EEF2FF" : "rgba(255,255,255,0.28)" }}>
                <option value="" disabled style={{ backgroundColor: "#060911" }}>{t("tournament.create.competitionHint")}</option>
                {competitionPickerOptions.map((c) => (
                  <option key={c.storageKey} value={c.storageKey} style={{ color: "#EEF2FF", backgroundColor: "#060911" }}>{c.label}</option>
                ))}
              </select>
            )}
          </div>

          <div className="rounded-lg px-3.5 py-3 flex items-start gap-2.5 text-xs leading-relaxed"
            style={{ backgroundColor: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.16)" }}>
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#22D3EE" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ color: "rgba(226,232,240,0.78)" }}>{t("tournament.create.predictionLockInfo")}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.35)" }}>
              {t("tournament.create.inviteCodeLabel")}
            </label>
            <div className="flex items-center gap-2 rounded-lg px-4 py-3"
              style={{ backgroundColor: "#060911", border: "1px solid rgba(255,255,255,0.10)" }}>
              <span className="flex-1 text-sm font-bold tracking-[0.18em]" style={{ color: "#22D3EE" }} suppressHydrationWarning>
                {codeReady ? code : "··········"}
              </span>
              <button type="button" disabled={!codeReady} onClick={() => setCode(generateCode())}
                className="transition-colors" style={{ color: "rgba(255,255,255,0.28)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fff")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)")}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

          <button type="submit" disabled={isPending || !canSubmit} className="ph-btn-primary w-full mt-1">
            {isPending ? t("common.loading") : t("tournament.create.submit")}
          </button>
        </form>
      )}
    </div>
  );
}
