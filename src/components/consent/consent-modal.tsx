"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveConsent } from "@/app/actions/consent";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  onComplete: () => void;
};

export function ConsentModal({ onComplete }: Props) {
  const { t, locale } = useLocale();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ro = locale === "ro";

  const handleSubmit = () => {
    if (!termsAccepted) {
      setError(ro ? "Trebuie să accepți termenii și condițiile." : "You must accept the terms and conditions.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await saveConsent({ termsAccepted, marketingConsent });
      if (result.ok) {
        onComplete();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{
          backgroundColor: "#12132B",
          borderColor: "rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-white">
              {ro ? "Bine ai venit pe Liga Prono!" : "Welcome to Liga Prono!"}
            </h2>
            <p className="text-sm text-white/60">
              {ro
                ? "Pentru a continua, te rugăm să accepți termenii și condițiile."
                : "To continue, please accept the terms and conditions."}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-colors"
              />
              <span className="text-sm text-white/80 leading-relaxed">
                {ro ? (
                  <>
                    Am citit și accept{" "}
                    <Link
                      href="/termeni-si-conditii"
                      target="_blank"
                      className="text-[#67E8F9] hover:underline font-medium"
                    >
                      Termenii și condițiile
                    </Link>{" "}
                    și{" "}
                    <Link
                      href="/confidentialitate"
                      target="_blank"
                      className="text-[#67E8F9] hover:underline font-medium"
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
                      className="text-[#67E8F9] hover:underline font-medium"
                    >
                      Terms and Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/confidentialitate"
                      target="_blank"
                      className="text-[#67E8F9] hover:underline font-medium"
                    >
                      Privacy Policy
                    </Link>
                    . <span className="text-red-400">*</span>
                  </>
                )}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-colors"
              />
              <span className="text-sm text-white/80 leading-relaxed">
                {ro
                  ? "Doresc să primesc noutăți, promoții și informații despre Liga Prono prin email. Mă pot dezabona oricând."
                  : "I want to receive news, promotions and information about Liga Prono by email. I can unsubscribe anytime."}
              </span>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending || !termsAccepted}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: termsAccepted ? "#3B82F6" : "rgba(255,255,255,0.1)",
              color: termsAccepted ? "#0A0B1E" : "rgba(255,255,255,0.4)",
            }}
          >
            {isPending
              ? (ro ? "Se salvează..." : "Saving...")
              : (ro ? "Continuă" : "Continue")}
          </button>

          <p className="text-xs text-white/40 text-center">
            {ro
              ? "Poți modifica preferințele de email oricând din setările profilului."
              : "You can change your email preferences anytime from profile settings."}
          </p>
        </div>
      </div>
    </div>
  );
}
