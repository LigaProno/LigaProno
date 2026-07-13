import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Glass } from "@/components/landing/glass-surface";

export function LandingHero() {
  return (
    <section className="relative flex min-h-[92vh] flex-col justify-center px-5 py-16 sm:px-8 lg:min-h-screen lg:px-12">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        {/* Typography stack — editorial, off-grid */}
        <div className="relative z-10">
          <p className="mb-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#D4AF37]/80">
            <span className="h-px w-8 bg-gradient-to-r from-[#C5A059] to-transparent" />
            Sezon deschis
          </p>

          <h1 className="select-none leading-[0.88]">
            <span className="block text-[clamp(3.5rem,14vw,7.5rem)] font-black tracking-[-0.04em] text-white/95">
              LIGA
            </span>
            <span className="relative block text-[clamp(3.5rem,14vw,7.5rem)] font-black tracking-[-0.04em]">
              <span className="bg-gradient-to-br from-[#E8C878] via-[#C5A059] to-[#8B6914] bg-clip-text text-transparent">
                PRONO
              </span>
              <span
                aria-hidden
                className="absolute -right-2 top-2 hidden h-3 w-3 rounded-full bg-[#C5A059] shadow-[0_0_24px_#C5A059] sm:block"
              />
            </span>
          </h1>

          <p className="mt-8 max-w-md text-base leading-relaxed text-white/55 sm:text-lg">
            Unde pronosticul devine competiție. Creează turnee cu prietenii, urmărește clasamentul
            live și lasă scorurile să vorbească.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/sign-up" className="landing-btn-glass-primary group">
              Creează cont
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link href="/sign-in" className="landing-btn-glass-ghost">
              Autentificare
            </Link>
          </div>
        </div>

        {/* Floating glass cluster */}
        <div className="relative mx-auto w-full max-w-sm lg:max-w-none lg:justify-self-end">
          <Glass className="glass-liquid glass-tilt-left absolute -left-4 top-8 z-20 hidden w-36 px-4 py-3 sm:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/90">Live</p>
            <p className="mt-1 text-sm font-semibold leading-snug text-white">Scoruri &amp; puncte</p>
            <p className="text-xs text-white/45">în timp real</p>
          </Glass>

          <div className="relative mx-auto flex aspect-square w-[min(100%,340px)] items-center justify-center lg:w-[380px]">
            <div aria-hidden className="glass-ring absolute inset-0 rounded-full" />
            <div aria-hidden className="glass-ring glass-ring-delay absolute inset-4 rounded-full" />
            <Glass className="glass-liquid glass-disc relative flex h-[72%] w-[72%] items-center justify-center rounded-full">
              <Image
                src="/logo-liga-prono.png"
                alt="Liga Prono"
                width={160}
                height={160}
                priority
                className="h-[68%] w-[68%] drop-shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
              />
            </Glass>
          </div>

          <Glass className="glass-liquid glass-tilt-right absolute -right-2 bottom-4 z-20 max-w-[200px] px-5 py-4">
            <p className="text-sm font-semibold leading-snug text-white">
              Fără pariuri. Doar pronosticuri între prieteni.
            </p>
          </Glass>
        </div>
      </div>
    </section>
  );
}
