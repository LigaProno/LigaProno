"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinTournament } from "@/app/actions/tournament";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatCaughtError } from "@/lib/i18n/errors";

export default function JoinTournamentForm({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLocale();
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null); setSuccess(false);
    startTransition(async () => {
      try {
        await joinTournament(code.trim());
        setSuccess(true); setCode(""); router.refresh();
      } catch (err) { setError(formatCaughtError(err, t)); }
    });
  }

  return (
    <div
      className={embedded ? "flex flex-col gap-4" : "rounded-xl border p-6 flex flex-col gap-4"}
      style={embedded ? undefined : { backgroundColor: "#0D1422", borderColor: "rgba(255,255,255,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)" }}
    >
      {!embedded && (
        <div>
          <h2 className="text-white font-bold text-lg">{t("tournament.join.title")}</h2>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.42)" }}>{t("tournament.join.subtitle")}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder={t("tournament.join.codePlaceholder")}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 10))}
          maxLength={10}
          aria-label={t("tournament.join.codeLabel")}
          className="ph-input text-center tracking-[0.22em] uppercase font-bold"
          style={{ color: code ? "#22D3EE" : undefined, fontSize: "0.9rem" }}
        />
        {success && <p className="text-sm font-medium" style={{ color: "#BEF264" }}>{t("tournament.join.success")}</p>}
        {error  && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}
        <button type="submit" disabled={isPending || code.length < 4} className="ph-btn-lime w-full">
          {isPending ? t("common.loading") : t("tournament.join.submit")}
        </button>
      </form>
    </div>
  );
}
