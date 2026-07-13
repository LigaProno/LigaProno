import { Glass } from "@/components/landing/glass-surface";

const STEPS = [
  {
    n: "01",
    title: "Cont",
    line: "Email sau Google. Gata în 30 de secunde.",
  },
  {
    n: "02",
    title: "Turneu",
    line: "Turneu privat cu cod de invitație sau turneu public deschis tuturor.",
  },
  {
    n: "03",
    title: "Pronostic",
    line: "Scor exact înainte de fluier. Blocat, fair, fără trișat.",
  },
  {
    n: "04",
    title: "Clasament",
    line: "Puncte live după fiecare meci. Cine e campionul?",
  },
] as const;

export function LandingFlow() {
  return (
    <section className="relative px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-xs text-3xl font-black tracking-tight text-white sm:text-4xl">
            De la zero
            <br />
            <span className="text-white/40">la primul loc</span>
          </h2>
          
        </div>

        <ol className="relative space-y-4">
          <div aria-hidden className="landing-flow-line absolute bottom-6 left-[1.65rem] top-6 hidden w-px sm:block" />

          {STEPS.map(({ n, title, line }) => (
            <li
              key={n}
              className="relative grid items-center gap-4 sm:grid-cols-[auto_1fr] sm:gap-8"
            >
              <div className="relative z-10 flex items-center gap-4 sm:w-24 sm:flex-col sm:items-start sm:gap-2">
                <span className="glass glass-pill flex h-14 w-14 shrink-0 items-center justify-center text-lg font-black text-[#D4AF37]">
                  {n}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/35 sm:mt-1">
                  {title}
                </span>
              </div>

              <Glass as="article" className="glass-liquid glass-flow-panel px-6 py-5 sm:px-8 sm:py-6">
                <p className="text-lg font-semibold leading-snug text-white sm:text-xl">{line}</p>
              </Glass>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
