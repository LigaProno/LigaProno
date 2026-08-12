"use client";

import Image from "next/image";
import { useLocale } from "@/components/i18n/locale-provider";

type PageLoadingProps = {
  className?: string;
};

/**
 * Branded route loading — large, centered mark + ring spinner.
 * No entrance fade (avoids flash when overlay ↔ loading.tsx swap).
 */
export function PageLoading({ className = "" }: PageLoadingProps) {
  const { t } = useLocale();

  return (
    <div
      className={`page-loading flex flex-col items-center justify-center px-6 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex h-36 w-36 items-center justify-center sm:h-44 sm:w-44">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.24)_0%,transparent_68%)] blur-2xl"
        />
        <div
          aria-hidden
          className="page-loading-spinner absolute inset-0 rounded-full border-[3px] border-[#C5A059]/20 border-t-[#C5A059] sm:border-[3.5px]"
        />
        <Image
          src="/logo-liga-prono.png"
          alt=""
          width={112}
          height={112}
          className="relative h-20 w-20 object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.45)] sm:h-28 sm:w-28"
          priority
        />
      </div>

      <p className="mt-9 text-base font-medium tracking-wide text-white/50 sm:text-lg">
        {t("common.loading")}
      </p>
    </div>
  );
}
