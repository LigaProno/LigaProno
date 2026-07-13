"use client";

import { useEffect, useId, useRef, useState } from "react";

type Align = "left" | "right";

export function ColumnHeaderTip({
  label,
  tip,
  align = "left",
  className = "",
}: {
  label: string;
  tip: string;
  align?: Align;
  className?: string;
}) {
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

  const alignClass = align === "right" ? "justify-end text-right" : "justify-start text-left";
  const tipPos =
    align === "right" ?
      "right-0 origin-top-right"
    : "left-0 origin-top-left";

  return (
    <span ref={rootRef} className={`relative inline-flex max-w-full ${alignClass} ${className}`}>
      <button
        type="button"
        className={`inline-flex items-center gap-1 max-w-full cursor-pointer md:cursor-help touch-manipulation ${alignClass}`}
        aria-describedby={open ? tipId : undefined}
        aria-label={`${label}: ${tip}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{label}</span>
        <svg
          className="w-3 h-3 shrink-0 opacity-55"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 10v6M12 7h.01" />
        </svg>
      </button>

      {/* Mobil: tap */}
      {open ?
        <span
          id={tipId}
          role="tooltip"
          className={`md:hidden absolute z-30 top-[calc(100%+6px)] ${tipPos} w-[min(16rem,calc(100vw-2rem))] rounded-lg border px-2.5 py-2 text-[11px] leading-snug font-normal normal-case tracking-normal shadow-lg`}
          style={{
            borderColor: "rgba(59,130,246,0.35)",
            backgroundColor: "#0f172a",
            color: "rgba(226,232,240,0.95)",
          }}
        >
          {tip}
        </span>
      : null}

      {/* Desktop: hover pe antet */}
      <span
        className={`hidden md:block pointer-events-none absolute z-30 top-[calc(100%+6px)] ${tipPos} w-52 rounded-lg border px-2.5 py-2 text-[11px] leading-snug font-normal normal-case tracking-normal shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover/th:opacity-100 group-hover/th:scale-100`}
        style={{
          borderColor: "rgba(59,130,246,0.35)",
          backgroundColor: "#0f172a",
          color: "rgba(226,232,240,0.95)",
        }}
      >
        {tip}
      </span>    </span>
  );
}

export function LeaderboardTh({
  label,
  tip,
  align = "left",
  className = "",
  hiddenMd = false,
}: {
  label: string;
  tip: string;
  align?: Align;
  className?: string;
  hiddenMd?: boolean;
}) {
  const alignClass = align === "right" ? "text-right" : "text-left";

  return (
    <th
      className={`group/th py-3 px-1.5 text-xs font-semibold tabular-nums ${alignClass} ${hiddenMd ? "hidden md:table-cell" : ""} ${className}`}
      style={{ color: "rgba(255,255,255,0.45)" }}
    >
      <ColumnHeaderTip label={label} tip={tip} align={align} />
    </th>
  );
}
