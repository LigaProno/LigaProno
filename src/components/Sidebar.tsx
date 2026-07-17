"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n";
import RulesModal from "@/components/RulesModal";
import { INSTAGRAM_URL } from "@/lib/social-links";

type NavItem = {
  href: string;
  labelKey: MessageKey;
  match: (pathname: string) => boolean;
  icon: ReactNode;
};

const SIDEBAR_BG = "rgba(10,11,30,0.85)";
const SIDEBAR_BDR = "rgba(255,255,255,0.06)";
const GOLD = "#C5A059";

function LogoMark() {
  return (
    <Image
      src="/logo-liga-prono.png"
      alt="Liga Prono"
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 object-contain"
      priority
    />
  );
}

function NavLinks({
  pathname,
  items,
  onClick,
}: {
  pathname: string;
  items: NavItem[];
  onClick?: () => void;
}) {
  const { t } = useLocale();

  return (
    <>
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className="relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-100"
            style={{
              color: active ? "#EEF2FF" : "rgba(255,255,255,0.42)",
              backgroundColor: active ? "rgba(255,255,255,0.05)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.72)";
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.42)";
            }}
          >
            {active && (
              <span
                className="absolute top-1.5 bottom-1.5"
                style={{
                  left: 0,
                  width: "2px",
                  backgroundColor: GOLD,
                  borderRadius: "0 2px 2px 0",
                }}
              />
            )}
            <span
              style={{ color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.30)" }}
            >
              {item.icon}
            </span>
            <span className="tracking-[-0.01em]">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </>
  );
}

const profileIcon = (
  <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const supportIcon = (
  <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const instagramIcon = (
  <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

function SocialLinks({ onClick }: { onClick?: () => void }) {
  const { t } = useLocale();
  const items = [
    { href: INSTAGRAM_URL, label: t("nav.instagram"), icon: instagramIcon },
  ];

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-100"
          style={{ color: "rgba(255,255,255,0.42)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.72)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.42)";
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.30)" }}>{item.icon}</span>
          <span className="tracking-[-0.01em]">{item.label}</span>
        </a>
      ))}
    </div>
  );
}

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  const mainNavItems: NavItem[] = [
    {
      href: "/dashboard",
      labelKey: "nav.dashboard",
      match: (p) => p === "/dashboard",
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      href: "/turnee",
      labelKey: "nav.tournaments",
      match: (p) => p === "/turnee" || p.startsWith("/turnee/"),
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    ...(isAdmin ? [{
      href: "/admin",
      labelKey: "nav.admin" as const,
      match: (p: string) => p === "/admin" || p.startsWith("/admin/"),
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    }] : []),
  ];

  const bottomNavItems: NavItem[] = [
    {
      href: "/profil",
      labelKey: "nav.profile",
      match: (p) => p === "/profil" || p.startsWith("/profil/"),
      icon: profileIcon,
    },
    {
      href: "/support",
      labelKey: "nav.support",
      match: (p) => p === "/support",
      icon: supportIcon,
    },
  ];

  const logoArea = (onClick?: () => void) => (
    <div className="h-14 flex items-center px-4 shrink-0" style={{ borderBottom: `1px solid ${SIDEBAR_BDR}` }}>
      <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClick}>
        <LogoMark />
        <span className="font-bold text-base tracking-[-0.02em] text-white">
          Liga <span style={{ color: GOLD }}>Prono</span>
        </span>
      </Link>
    </div>
  );

  const bottomArea = (onClick?: () => void) => (
    <div className="p-4 shrink-0 flex flex-col gap-3" style={{ borderTop: `1px solid ${SIDEBAR_BDR}` }}>
      <div className="px-0 flex flex-col gap-0.5">
        <NavLinks pathname={pathname} items={bottomNavItems} onClick={onClick} />
      </div>
      <SocialLinks onClick={onClick} />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <LanguageSwitcher />
        <SignOutButton />
      </div>
    </div>
  );

  return (
    <>
      <header
        className="flex md:hidden items-center justify-between px-4 h-14 shrink-0 w-full"
        style={{ backgroundColor: SIDEBAR_BG, borderBottom: `1px solid ${SIDEBAR_BDR}` }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-bold text-base tracking-[-0.02em] text-white">
            Liga <span style={{ color: GOLD }}>Prono</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <SignOutButton compact />
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-md transition-colors hover:bg-white/8"
            style={{ color: "rgba(255,255,255,0.55)" }}
            aria-label={t("nav.openMenu")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden transition-transform duration-200 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BDR}` }}
      >
        {logoArea(() => setOpen(false))}
        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <NavLinks pathname={pathname} items={mainNavItems} onClick={() => setOpen(false)} />
        </nav>
        <div className="px-3 pb-1">
          <div className="mb-1" style={{ borderTop: `1px solid ${SIDEBAR_BDR}` }} />
          <RulesModal />
        </div>
        {bottomArea(() => setOpen(false))}
      </aside>

      <aside
        className="hidden md:flex flex-col w-56 shrink-0"
        style={{ backgroundColor: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BDR}` }}
      >
        {logoArea()}
        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <NavLinks pathname={pathname} items={mainNavItems} />
        </nav>
        <div className="px-3 pb-1">
          <div className="mb-1" style={{ borderTop: `1px solid ${SIDEBAR_BDR}` }} />
          <RulesModal />
        </div>
        {bottomArea()}
      </aside>
    </>
  );
}
