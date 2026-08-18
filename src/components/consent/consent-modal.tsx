"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveConsent, updateMarketingConsent } from "@/app/actions/consent";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  needsTerms: boolean;
  needsMarketing: boolean;
};

export function ConsentModal({ needsTerms, needsMarketing }: Props) {
  const { t, locale } = useLocale();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const marketingOnly = needsMarketing && !needsTerms;

  if (done) return null;

  const finish = () => setDone(true);

  const handleCombinedSubmit = () => {
    if (needsTerms && !termsAccepted) {
      setError(t("consent.termsRequired"));
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await saveConsent({
        termsAccepted: true,
        ...(needsMarketing ? { marketingConsent } : {}),
      });
      if (result.ok) {
        finish();
      } else {
        setError(result.error);
      }
    });
  };

  const handleMarketingChoice = (consent: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await updateMarketingConsent(consent);
      if (result.ok) {
        finish();
      } else {
        setError(result.error);
      }
    });
  };

  const ro = locale === "ro";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{
          backgroundColor: "#12132B",
          borderColor: "rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 id="consent-title" className="text-xl font-bold text-white">
              {marketingOnly ? t("consent.marketingTitle") : t("consent.welcomeTitle")}
            </h2>
            <p className="text-sm text-white/60 leading-relaxed">
              {marketingOnly ? t("consent.marketingBody") : t("consent.welcomeBody")}
            </p>
          </div>

          {needsTerms ? (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-5 w-5 cursor-pointer rounded border-2 border-white/20 bg-white/5 checked:border-[#D4AF37] checked:bg-[#D4AF37]"
              />
              <span className="text-sm leading-relaxed text-white/80">
                {ro ? (
                  <>
                    Am citit și accept{" "}
                    <Link
                      href="/termeni-si-conditii"
                      target="_blank"
                      className="font-medium text-[#67E8F9] hover:underline"
                    >
                      Termenii și condițiile
                    </Link>{" "}
                    și{" "}
                    <Link
                      href="/confidentialitate"
                      target="_blank"
                      className="font-medium text-[#67E8F9] hover:underline"
                    >
                      Politica de confidențialitate
                    </Link>
                    . <span className="text-red-400">*</span>
                  </>
                ) : (
                  <>
                    I have read and accept the{" "}
                    <Link
                      href="/termeni-si-conditii"
                      target="_blank"
                      className="font-medium text-[#67E8F9] hover:underline"
                    >
                      Terms and Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/confidentialitate"
                      target="_blank"
                      className="font-medium text-[#67E8F9] hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    . <span className="text-red-400">*</span>
                  </>
                )}
              </span>
            </label>
          ) : null}

          {needsMarketing && !marketingOnly ? (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 cursor-pointer rounded border-2 border-white/20 bg-white/5 checked:border-[#D4AF37] checked:bg-[#D4AF37]"
              />
              <span className="text-sm leading-relaxed text-white/80">
                {t("consent.marketingLabel")}
              </span>
            </label>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-400">{error}</p>
          ) : null}

          {marketingOnly ? (
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => handleMarketingChoice(true)}
                disabled={isPending}
                className="w-full rounded-xl py-3 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                style={{ backgroundColor: "#D4AF37", color: "#0A0B1E" }}
              >
                {isPending ? t("consent.saving") : t("consent.marketingYes")}
              </button>
              <button
                type="button"
                onClick={() => handleMarketingChoice(false)}
                disabled={isPending}
                className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
              >
                {t("consent.marketingNo")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCombinedSubmit}
              disabled={isPending || (needsTerms && !termsAccepted)}
              className="w-full rounded-xl py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: !needsTerms || termsAccepted ? "#D4AF37" : "rgba(255,255,255,0.1)",
                color: !needsTerms || termsAccepted ? "#0A0B1E" : "rgba(255,255,255,0.4)",
              }}
            >
              {isPending ? t("consent.saving") : t("consent.continue")}
            </button>
          )}

          <p className="text-center text-xs text-white/40">{t("consent.profileHint")}</p>
        </div>
      </div>
    </div>
  );
}
