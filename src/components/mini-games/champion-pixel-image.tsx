"use client";

import { useState } from "react";

const DISPLAY = 208;

/** Pixelare progresivă — imagine mică scalată cu image-rendering: pixelated. */
function pixelInnerSize(attempts: number, solved: boolean): number {
  if (solved) return DISPLAY;
  const sizes = [10, 14, 20, 28, 40, 56];
  return sizes[Math.min(attempts, sizes.length - 1)] ?? 10;
}

export default function ChampionPixelImage({
  src,
  attempts,
  solved,
  alt = "",
}: {
  src: string;
  attempts: number;
  solved: boolean;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  const inner = pixelInnerSize(attempts, solved);
  const scale = DISPLAY / inner;

  if (failed || !src) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-white/10"
        style={{
          width: DISPLAY,
          height: DISPLAY,
          backgroundColor: "rgba(34,211,238,0.1)",
        }}
      >
        <span className="text-4xl text-cyan-300/40">?</span>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
      style={{ width: DISPLAY, height: DISPLAY }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={inner}
        height={inner}
        onError={() => setFailed(true)}
        className="absolute top-0 left-0 object-cover object-top"
        style={{
          width: inner,
          height: inner,
          imageRendering: solved ? "auto" : "pixelated",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        draggable={false}
      />
    </div>
  );
}
