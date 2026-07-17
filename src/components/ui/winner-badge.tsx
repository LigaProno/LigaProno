"use client";

import { useEffect, useId, useRef, useState } from "react";

export type WinnerBadgeEntry = {
  tournamentId: string;
  tournamentName: string;
};

/**
 * Trofeu lângă numele câștigătorilor de turnee publice.
 * Hover pe desktop, tap pe mobil (hover-ul nu există acolo).
 */
export function WinnerBadge({ wins }: { wins: WinnerBadgeEntry[] }) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (wins.length === 0) return null;

  const label =
    wins.length === 1
      ? `Câștigător: ${wins[0].tournamentName}`
      : `Câștigător a ${wins.length} turnee`;

  const tip = (
    <span
      className="flex flex-col gap-1 text-left"
      style={{ color: "rgba(226,232,240,0.95)" }}
    >
      <span className="font-semibold" style={{ color: "#E8C878" }}>
        {wins.length === 1 ? "Câștigător turneu" : `Câștigător a ${wins.length} turnee`}
      </span>
      {wins.map((w) => (
        <span key={w.tournamentId} className="leading-snug">
          {w.tournamentName}
        </span>
      ))}
    </span>
  );

  return (
    <span ref={rootRef} className="group/badge relative inline-flex align-middle shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tipId : undefined}
        onClick={(e) => {
          // Numele poate fi un link — nu naviga când userul deschide tooltipul.
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center cursor-pointer md:cursor-help touch-manipulation"
      >
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#E8C878"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          style={{ filter: "drop-shadow(0 0 3px rgba(212,175,55,0.45))" }}
        >
          <path d="M8 21h8M12 17v4" />
          <path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" fill="rgba(212,175,55,0.22)" />
          <path d="M17 5h2.5a.5.5 0 0 1 .5.5V7a3 3 0 0 1-3 3" />
          <path d="M7 5H4.5a.5.5 0 0 0-.5.5V7a3 3 0 0 0 3 3" />
        </svg>
        {wins.length > 1 ? (
          <span
            className="ml-0.5 text-[9px] font-bold leading-none"
            style={{ color: "#E8C878" }}
          >
            {wins.length}
          </span>
        ) : null}
      </button>

      {/* Mobil: tap */}
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="md:hidden absolute z-40 top-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-[min(15rem,calc(100vw-2rem))] rounded-lg border px-2.5 py-2 text-[11px] font-normal shadow-lg"
          style={{ borderColor: "rgba(212,175,55,0.4)", backgroundColor: "#0f172a" }}
        >
          {tip}
        </span>
      ) : null}

      {/* Desktop: hover */}
      <span
        role="tooltip"
        className="hidden md:block pointer-events-none absolute z-40 top-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-52 rounded-lg border px-2.5 py-2 text-[11px] font-normal shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover/badge:opacity-100 group-hover/badge:scale-100"
        style={{ borderColor: "rgba(212,175,55,0.4)", backgroundColor: "#0f172a" }}
      >
        {tip}
      </span>
    </span>
  );
}
