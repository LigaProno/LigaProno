"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n";

type NavItem = {
  href: string;
  labelKey: MessageKey;
  match: (pathname: string) => boolean;
  icon: ReactNode;
};

function LogoMark() {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#22D3EE" }}>
      <svg className="w-4 h-4" style={{ color: "#0F172A" }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
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
    <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer hover:bg-white/5 active:scale-[0.98]"
            style={{
              backgroundColor: active ? "rgba(34,211,238,0.12)" : "transparent",
              color: active ? "#22D3EE" : "rgba(255,255,255,0.65)",
            }}
          >
            <span style={{ color: active ? "#22D3EE" : "rgba(255,255,255,0.45)" }}>
              {item.icon}
            </span>
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      labelKey: "nav.dashboard",
      match: (p) => p === "/dashboard",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      href: "/matches",
      labelKey: "nav.matches",
      match: (p) => p === "/matches" || p.startsWith("/matches/"),
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      href: "/turnee",
      labelKey: "nav.tournaments",
      match: (p) =>
        p === "/turnee" ||
        (p.startsWith("/turnee/") && !p.startsWith("/turnee/clasament")),
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: "/turnee/clasament",
      labelKey: "nav.globalLeaderboard",
      match: (p) => p === "/turnee/clasament",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <header
        className="flex md:hidden items-center justify-between px-4 h-14 border-b shrink-0 w-full"
        style={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-bold text-base text-white">
            Prono<span style={{ color: "#22D3EE" }}>Hub</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <UserButton userProfileMode="navigation" userProfileUrl="/user-profile" />
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/10 active:scale-95"
            style={{ color: "rgba(255,255,255,0.7)" }}
            aria-label={t("nav.openMenu")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r md:hidden transition-transform duration-200 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="h-16 flex items-center px-5 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <LogoMark />
            <span className="font-bold text-lg text-white">
              Prono<span style={{ color: "#22D3EE" }}>Hub</span>
            </span>
          </Link>
        </div>

        <NavLinks pathname={pathname} items={navItems} onClick={() => setOpen(false)} />

        <div className="p-4 border-t flex flex-col gap-3 shrink-0" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <LanguageSwitcher />
          <div className="flex items-center gap-3">
            <UserButton userProfileMode="navigation" userProfileUrl="/user-profile" />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{t("nav.account")}</span>
          </div>
        </div>
      </aside>

      <aside
        className="hidden md:flex flex-col w-60 border-r shrink-0"
        style={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="h-16 flex items-center px-5 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-bold text-lg text-white">
              Prono<span style={{ color: "#22D3EE" }}>Hub</span>
            </span>
          </Link>
        </div>

        <NavLinks pathname={pathname} items={navItems} />

        <div className="p-4 border-t flex flex-col gap-3 shrink-0" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <LanguageSwitcher />
          <div className="flex items-center gap-3">
            <UserButton userProfileMode="navigation" userProfileUrl="/user-profile" />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{t("nav.account")}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
