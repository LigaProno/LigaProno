"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n";
import RulesModal from "@/components/RulesModal";

type NavItem = {
  href: string;
  labelKey: MessageKey;
  match: (pathname: string) => boolean;
  icon: ReactNode;
};

const SIDEBAR_BG   = "#06080D";
const SIDEBAR_BDR  = "rgba(255,255,255,0.06)";

function LogoMark() {
  return (
    <div
      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
      style={{
        background: "linear-gradient(135deg, #22D3EE 0%, #0891B2 100%)",
        boxShadow: "0 0 14px rgba(34,211,238,0.28)",
      }}
    >
      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
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
    <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className="relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-100"
            style={{
              color:           active ? "#EEF2FF" : "rgba(255,255,255,0.42)",
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
                  backgroundColor: "#22D3EE",
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
    </nav>
  );
}

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  const navItems: NavItem[] = [
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
      href: "/matches",
      labelKey: "nav.matches",
      match: (p) => p === "/matches" || p.startsWith("/matches/"),
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      href: "/mini-jocuri",
      labelKey: "nav.miniGames",
      match: (p) => p === "/mini-jocuri" || p.startsWith("/mini-jocuri/"),
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: "/turnee/clasament",
      labelKey: "nav.globalLeaderboard",
      match: (p) => p === "/turnee/clasament",
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

  const logoArea = (onClick?: () => void) => (
    <div className="h-14 flex items-center px-4 shrink-0" style={{ borderBottom: `1px solid ${SIDEBAR_BDR}` }}>
      <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClick}>
        <LogoMark />
        <span className="font-bold text-base tracking-[-0.02em] text-white">
          Prono<span style={{ color: "#22D3EE" }}>Hub</span>
        </span>
      </Link>
    </div>
  );

  const bottomArea = (onClick?: () => void) => (
    <div className="p-4 shrink-0 flex flex-col gap-3" style={{ borderTop: `1px solid ${SIDEBAR_BDR}` }}>
      <LanguageSwitcher />
      <div className="flex items-center gap-3">
        <UserButton userProfileMode="navigation" userProfileUrl="/user-profile" />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{t("nav.account")}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ────────────────────────────────────────── */}
      <header
        className="flex md:hidden items-center justify-between px-4 h-14 shrink-0 w-full"
        style={{ backgroundColor: SIDEBAR_BG, borderBottom: `1px solid ${SIDEBAR_BDR}` }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-bold text-base tracking-[-0.02em] text-white">
            Prono<span style={{ color: "#22D3EE" }}>Hub</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <UserButton userProfileMode="navigation" userProfileUrl="/user-profile" />
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

      {/* ── Mobile drawer backdrop ─────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden transition-transform duration-200 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BDR}` }}
      >
        {logoArea(() => setOpen(false))}
        <NavLinks pathname={pathname} items={navItems} onClick={() => setOpen(false)} />
        <div className="px-3 pb-1">
          <div className="mb-1" style={{ borderTop: `1px solid ${SIDEBAR_BDR}` }} />
          <RulesModal />
        </div>
        {bottomArea(() => setOpen(false))}
      </aside>

      {/* ── Desktop sidebar ───────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0"
        style={{ backgroundColor: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BDR}` }}
      >
        {logoArea()}
        <NavLinks pathname={pathname} items={navItems} />
        <div className="px-3 pb-1">
          <div className="mb-1" style={{ borderTop: `1px solid ${SIDEBAR_BDR}` }} />
          <RulesModal />
        </div>
        {bottomArea()}
      </aside>
    </>
  );
}
