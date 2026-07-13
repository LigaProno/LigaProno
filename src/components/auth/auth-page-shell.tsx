"use client";

import Image from "next/image";

type AuthPageShellProps = {
  children: React.ReactNode;
  subtitle?: string;
};

export function AuthPageShell({ children, subtitle }: AuthPageShellProps) {
  return (
    <main className="auth-page min-h-screen flex flex-col items-center justify-center px-4 py-10 page-transition">
      <div className="mb-8 flex w-full max-w-[420px] flex-col items-center text-center">
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 scale-125 rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.28)_0%,transparent_70%)] blur-xl"
          />
          <Image
            src="/logo-liga-prono.png"
            alt="Liga Prono"
            width={112}
            height={112}
            priority
            className="relative h-24 w-24 drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:h-28 sm:w-28"
          />
        </div>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-[2rem]">
          Liga{" "}
          <span className="bg-gradient-to-r from-[#C5A059] to-[#E8C878] bg-clip-text text-transparent">
            Prono
          </span>
        </h1>

        <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/55">
          {subtitle ?? "Platforma ta de pronosticuri sportive"}
        </p>
      </div>

      {children}
    </main>
  );
}
