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
}: {
  competitionPickerOptions?: FootballDataCompetitionPickerOption[];
  competitionsLoadError?: string | null;
}) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeReady, setCodeReady] = useState(false);

  useEffect(() => {
    setCode(generateCode());
    setCodeReady(true);
  }, []);

  const [competitionKey, setCompetitionKey] = useState("");
  useEffect(() => {
    if (competitionPickerOptions.length === 1 && !competitionKey) {
      setCompetitionKey(competitionPickerOptions[0]!.storageKey);
    }
  }, [competitionPickerOptions, competitionKey]);

  const [allowChangesDuringCompetition, setAllowChangesDuringCompetition] =
    useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canSubmit =
    name.trim() &&
    codeReady &&
    code.trim() &&
    competitionKey.trim() &&
    competitionPickerOptions.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await createTournament(
          name.trim(),
          code.trim(),
          competitionKey.trim(),
          allowChangesDuringCompetition,
        );
        setCreatedCode(result.inviteCode);
        setName("");
        setCode(generateCode());
        if (competitionPickerOptions.length === 1) {
          setCompetitionKey(competitionPickerOptions[0]!.storageKey);
        } else {
          setCompetitionKey("");
        }
        setAllowChangesDuringCompetition(false);
        router.refresh();
      } catch (err) {
        setError(formatCaughtError(err, t));
      }
    });
  }

  function copyCode() {
    if (!createdCode) return;
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border p-6 flex flex-col gap-4" style={{ backgroundColor: "#1E293B", borderColor: "rgba(255,255,255,0.08)" }}>
      <div>
        <h2 className="text-white font-bold text-lg">{t("tournament.create.title")}</h2>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
          {t("tournament.create.subtitle")}
        </p>
      </div>

      {createdCode ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium" style={{ color: "#BEF264" }}>{t("tournament.create.success")}</p>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-[0.25em]"
              style={{ backgroundColor: "#0F172A", color: "#22D3EE" }}
            >
              {createdCode}
            </div>
            <button
              onClick={copyCode}
              className="px-4 py-3 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer hover:opacity-90 active:scale-95"
              style={{ backgroundColor: copied ? "#BEF264" : "#22D3EE", color: "#0F172A" }}
            >
              {copied ? t("common.copied") : t("common.copy")}
            </button>
          </div>
          <button
            onClick={() => setCreatedCode(null)}
            className="text-sm text-center cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {t("tournament.create.createAnother")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
              {t("tournament.create.nameLabel")}
            </label>
            <input
              type="text"
              placeholder={t("tournament.create.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors"
              style={{ backgroundColor: "#0F172A", color: "#ffffff", borderColor: "rgba(255,255,255,0.12)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
              {t("tournament.create.competitionLabel")}
            </label>
            {competitionsLoadError ?
              <p className="text-xs" style={{ color: "#fbbf24" }}>
                {competitionsLoadError}
              </p>
            : null}
            {competitionPickerOptions.length === 0 ?
              <p className="text-xs" style={{ color: "#fbbf24" }}>
                {t("tournament.create.noWorldCup")}
              </p>
            : (
              <select
                value={competitionKey}
                onChange={(e) => setCompetitionKey(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors"
                style={{
                  backgroundColor: "#0F172A",
                  color: "#ffffff",
                  borderColor: "rgba(255,255,255,0.12)",
                }}
              >
                {competitionPickerOptions.map((c) => (
                  <option key={c.storageKey} value={c.storageKey}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
              {t("tournament.create.competitionHint")}
            </p>
          </div>

          <fieldset className="flex flex-col gap-2 rounded-xl border px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <legend className="text-xs font-medium px-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              {t("tournament.create.predictionWindowLabel")}
            </legend>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="predWindow"
                className="mt-1 shrink-0"
                checked={!allowChangesDuringCompetition}
                onChange={() => setAllowChangesDuringCompetition(false)}
              />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.88)" }}>
                {t("tournament.create.predictionWindowLocked")}
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="predWindow"
                className="mt-1 shrink-0"
                checked={allowChangesDuringCompetition}
                onChange={() => setAllowChangesDuringCompetition(true)}
              />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.88)" }}>
                {t("tournament.create.predictionWindowPenalty")}
              </span>
            </label>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
              {t("tournament.create.inviteCodeLabel")}
            </label>
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 border" style={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.12)" }}>
              <span
                className="flex-1 text-sm font-bold tracking-[0.15em] min-h-[1.25rem]"
                style={{ color: "#22D3EE" }}
                suppressHydrationWarning
              >
                {codeReady ? code : "··········"}
              </span>
              <button
                type="button"
                disabled={!codeReady}
                onClick={() => setCode(generateCode())}
                title={t("common.copy")}
                className="transition-all cursor-pointer active:scale-95 shrink-0"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

          <button
            type="submit"
            disabled={isPending || !canSubmit}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 mt-1 cursor-pointer hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
          >
            {isPending ? t("common.loading") : t("tournament.create.submit")}
          </button>
        </form>
      )}
    </div>
  );
}
