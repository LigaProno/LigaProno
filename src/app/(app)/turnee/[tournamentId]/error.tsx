"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function TournamentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[TournamentError]", error);
  }, [error]);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
      <Link
        href="/turnee"
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Înapoi la turnee
      </Link>

      <div
        className="rounded-2xl border p-6 sm:p-8 flex flex-col items-center text-center gap-4"
        style={{
          borderColor: "rgba(248,113,113,0.35)",
          backgroundColor: "rgba(127,29,29,0.15)",
        }}
      >
        <div className="text-4xl" aria-hidden>⚠️</div>
        <h1 className="text-xl font-bold text-white">
          Eroare la încărcarea turneului
        </h1>
        <p className="text-sm max-w-md" style={{ color: "rgba(255,255,255,0.6)" }}>
          A apărut o eroare la încărcarea paginii turneului. Aceasta poate fi cauzată de o
          problemă temporară cu serverul sau cu conexiunea la baza de date.
        </p>
        {error.digest && (
          <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
            Cod eroare: {error.digest}
          </p>
        )}
        <div className="flex gap-3 mt-2">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer"
            style={{ backgroundColor: "#3B82F6", color: "#0f172a" }}
          >
            Încearcă din nou
          </button>
          <Link
            href="/turnee"
            className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors"
            style={{
              borderColor: "rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Mergi la turnee
          </Link>
        </div>
      </div>
    </div>
  );
}
