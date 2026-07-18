"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Badge cu flacără + numărul de scoruri exacte ghicite la rând (best ever, public).
 * Nu apare sub 2. Hover pe desktop, tap pe mobil.
 */
export function StreakBadge({ streak }: { streak: number }) {
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

  if (streak < 2) return null;

  const label = `${streak} scoruri exacte ghicite la rând`;

  return (
    <span ref={rootRef} className="group/streak relative inline-flex align-middle shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tipId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 cursor-pointer md:cursor-help touch-manipulation"
        style={{ backgroundColor: "rgba(249,115,22,0.16)" }}
      >
        <svg
          className="w-3 h-3 shrink-0"
          viewBox="0 0 24 24"
          fill="#F97316"
          aria-hidden
          style={{ filter: "drop-shadow(0 0 3px rgba(249,115,22,0.5))" }}
        >
          <path d="M12 2c1 3-1 4.5-2.5 6C8 9.5 7 11 7 13a5 5 0 0 0 10 0c0-1.7-.7-3.2-1.8-4.4C14 10 13 9 13 7c0-2-.5-3.5-1-5Z" />
        </svg>
        <span className="text-[10px] font-extrabold leading-none" style={{ color: "#F97316" }}>
          {streak}
        </span>
      </button>

      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="md:hidden absolute z-40 top-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-[min(15rem,calc(100vw-2rem))] rounded-lg border px-2.5 py-2 text-[11px] font-normal shadow-lg text-left"
          style={{ borderColor: "rgba(249,115,22,0.4)", backgroundColor: "#0f172a", color: "rgba(226,232,240,0.95)" }}
        >
          <span className="font-semibold" style={{ color: "#F97316" }}>
            {streak} la rând
          </span>
          <br />
          Scoruri exacte ghicite consecutiv (turnee publice).
        </span>
      ) : null}

      <span
        role="tooltip"
        className="hidden md:block pointer-events-none absolute z-40 top-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-52 rounded-lg border px-2.5 py-2 text-[11px] font-normal shadow-lg text-left opacity-0 scale-95 transition-all duration-150 group-hover/streak:opacity-100 group-hover/streak:scale-100"
        style={{ borderColor: "rgba(249,115,22,0.4)", backgroundColor: "#0f172a", color: "rgba(226,232,240,0.95)" }}
      >
        <span className="font-semibold" style={{ color: "#F97316" }}>
          {streak} la rând
        </span>
        <br />
        Scoruri exacte ghicite consecutiv (turnee publice).
      </span>
    </span>
  );
}
