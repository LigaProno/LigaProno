"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";
import { isLegalPath } from "@/lib/cookie-consent";

type Props = {
  open: boolean;
  hasExistingConsent: boolean;
  advertising: boolean;
  onClose: () => void;
  onSave: (advertising: boolean) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function CookieConsentBanner({
  open,
  hasExistingConsent,
  advertising,
  onClose,
  onSave,
}: Props) {
  const { t } = useLocale();
  const pathname = usePathname();
  const [ads, setAds] = useState(advertising);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setAds(advertising);
      setError(null);
    }
  }, [open, advertising]);

  const onLegalPage = isLegalPath(pathname);
  const mustAccept = !hasExistingConsent;
  const visible = open && !(mustAccept && onLegalPage);

  if (!visible) return null;

  const persist = (nextAds: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await onSave(nextAds);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{
          backgroundColor: "#12132B",
          borderColor: "rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 id="cookie-consent-title" className="text-xl font-bold text-white">
              {t("cookies.title")}
            </h2>
            <p className="text-sm text-white/60 leading-relaxed">{t("cookies.body")}</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
              <p className="text-sm font-semibold text-white">{t("cookies.necessaryTitle")}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                {t("cookies.necessaryBody")}
              </p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-[#D4AF37]/80">
                {t("cookies.required")}
              </p>
            </div>

            {hasExistingConsent ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={ads}
                  onChange={(e) => setAds(e.target.checked)}
                  className="mt-0.5 h-5 w-5 cursor-pointer rounded border-2 border-white/20 bg-white/5 checked:border-[#D4AF37] checked:bg-[#D4AF37]"
                />
                <span>
                  <span className="block text-sm font-semibold text-white">
                    {t("cookies.advertisingTitle")}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-white/55">
                    {t("cookies.advertisingBody")}
                  </span>
                </span>
              </label>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
                <p className="text-sm font-semibold text-white">{t("cookies.advertisingTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  {t("cookies.advertisingBody")}
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-white/45 leading-relaxed">
            {t("cookies.legalPrefix")}{" "}
            <Link
              href="/confidentialitate"
              target="_blank"
              className="font-medium text-[#67E8F9] hover:underline"
            >
              {t("footer.privacy")}
            </Link>{" "}
            {t("cookies.legalAnd")}{" "}
            <Link
              href="/termeni-si-conditii"
              target="_blank"
              className="font-medium text-[#67E8F9] hover:underline"
            >
              {t("footer.terms")}
            </Link>
            .
          </p>

          {error ? (
            <p className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-400">{error}</p>
          ) : null}

          {hasExistingConsent ? (
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => persist(ads)}
                disabled={isPending}
                className="w-full rounded-xl py-3 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                style={{ backgroundColor: "#D4AF37", color: "#0A0B1E" }}
              >
                {isPending ? t("common.loading") : t("cookies.save")}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50 sm:flex-1"
              >
                {t("cookies.close")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => persist(true)}
                disabled={isPending}
                className="w-full rounded-xl py-3 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                style={{ backgroundColor: "#D4AF37", color: "#0A0B1E" }}
              >
                {isPending ? t("common.loading") : t("cookies.acceptAll")}
              </button>
              <button
                type="button"
                onClick={() => persist(false)}
                disabled={isPending}
                className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
              >
                {t("cookies.acceptNecessary")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
