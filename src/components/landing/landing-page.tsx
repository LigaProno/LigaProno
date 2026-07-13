import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LandingAmbient } from "@/components/landing/landing-ambient";
import { LandingBento } from "@/components/landing/landing-bento";
import { LandingFlow } from "@/components/landing/landing-flow";
import { LandingHero } from "@/components/landing/landing-hero";
import { Glass } from "@/components/landing/glass-surface";

export function LandingPage() {
  return (
    <main className="landing-page relative min-h-screen overflow-x-hidden">
      <LandingAmbient />

      <div className="relative z-10">
        <LandingHero />
        <LandingFlow />
        <LandingBento />

        {/* CTA — glass slab, not a card box */}
        <section className="px-5 pb-28 pt-8 sm:px-8 lg:px-12">
          <Glass className="glass-liquid glass-cta mx-auto max-w-6xl overflow-hidden px-8 py-14 sm:px-14 sm:py-16">
            <div aria-hidden className="glass-cta-shine" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#D4AF37]/80">
                  Kick-off
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Terenul e liber.
                  <br />
                  <span className="text-white/40">Tu tragi primul.</span>
                </h2>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Link href="/sign-up" className="landing-btn-glass-primary group">
                  Începe acum
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link href="/sign-in" className="landing-btn-glass-ghost">
                  Am cont deja
                </Link>
              </div>
            </div>
          </Glass>
        </section>

        <footer className="px-5 pb-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/25">
            © {new Date().getFullYear()} Liga Prono
          </p>
        </footer>
      </div>
    </main>
  );
}
