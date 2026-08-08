"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { INSTAGRAM_URL } from "@/lib/social-links";

const SUPPORT_EMAIL = "support.ligaprono@gmail.com";
const GOLD = "#C5A059";

type SiteFooterProps = {
  /** `public` = landing / pagini fără auth; `app` = shell autentificat */
  variant?: "public" | "app";
};

export function SiteFooter({ variant = "public" }: SiteFooterProps) {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  const explore =
    variant === "app" ?
      [
        { href: "/dashboard", label: t("nav.dashboard") },
        { href: "/turnee", label: t("nav.tournaments") },
        { href: "/matches", label: t("nav.matches") },
        { href: "/support", label: t("nav.support") },
      ]
    : [
        { href: "/sign-up", label: t("footer.getStarted") },
        { href: "/sign-in", label: t("footer.signIn") },
      ];

  const legal = [
    { href: "/confidentialitate", label: t("footer.privacy") },
  ];

  return (
    <footer
      className="relative shrink-0 border-t"
      style={{
        borderColor: "rgba(197,160,89,0.14)",
        background:
          "linear-gradient(180deg, rgba(10,11,30,0) 0%, rgba(8,9,22,0.92) 28%, #070814 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-80"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(197,160,89,0.45), transparent)",
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-8">
          <div className="flex flex-col gap-4">
            <Link
              href={variant === "app" ? "/dashboard" : "/"}
              className="group inline-flex items-center gap-3 w-fit"
            >
              <Image
                src="/logo-liga-prono.png"
                alt="Liga Prono"
                width={40}
                height={40}
                className="h-10 w-10 object-contain transition-transform duration-300 group-hover:scale-[1.04]"
              />
              <span className="text-lg font-extrabold tracking-tight text-white">
                Liga{" "}
                <span style={{ color: GOLD }}>Prono</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-white/45">
              {t("footer.tagline")}
            </p>
          </div>

          <FooterCol title={t("footer.explore")}>
            {explore.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title={t("footer.legal")}>
            {legal.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title={t("footer.contact")}>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              {SUPPORT_EMAIL}
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
            >
              <InstagramIcon />
              {t("nav.instagram")}
            </a>
          </FooterCol>
        </div>

        <div
          className="mt-10 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/30">
            © {year} Liga Prono
          </p>
          <p className="text-[11px] text-white/25">{t("footer.madeForFans")}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: "rgba(197,160,89,0.75)" }}
      >
        {title}
      </p>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="w-fit text-sm text-white/55 transition-colors hover:text-white"
    >
      {children}
    </Link>
  );
}

function InstagramIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
