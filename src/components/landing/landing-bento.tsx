import { Glass } from "@/components/landing/glass-surface";

const TOURNAMENT_MODES = [
  {
    id: "private",
    tag: "Privat",
    tagGold: false,
    title: "Turnee private",
    body: "Creezi competiția, inviți cu cod și joci doar cu gașca ta. Clasament separat, vibe de vestiar închis.",
  },
  {
    id: "public",
    tag: "Public · Premii",
    tagGold: true,
    title: "Turnee publice",
    body: "Competiții deschise tuturor. Urci în clasament, te bați cu comunitatea și câștigi premiile turneului.",
  },
] as const;

const PLATFORM_FEATURES = [
  {
    label: "Clasament live",
    detail: "Puncte actualizate automat după fiecare meci.",
  },
  {
    label: "Multiplicatori",
    detail: "Rezultate surpriză — puncte bonus proporțional cu dificultatea.",
  },
  {
    label: "Reguli clare",
    detail: "Pronosticul se blochează înainte de start. Fără trișat.",
  },
] as const;

export function LandingBento() {
  return (
    <section className="relative px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#D4AF37]/70">
          Toolkit
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Două moduri de a juca.
          <span className="block text-white/35">Același nivel de competiție.</span>
        </h2>

        {/* Turnee — egal ca importanță */}
        <ul className="mt-12 grid gap-4 sm:gap-5 lg:grid-cols-2">
          {TOURNAMENT_MODES.map(({ id, tag, tagGold, title, body }) => (
            <li key={id}>
              <Glass className="glass-liquid toolkit-panel h-full px-7 py-8 sm:px-8 sm:py-9">
                <span
                  className={`toolkit-tag ${tagGold ? "toolkit-tag-gold" : ""}`}
                >
                  {tag}
                </span>
                <h3 className="toolkit-title">{title}</h3>
                <p className="toolkit-body">{body}</p>
              </Glass>
            </li>
          ))}
        </ul>

        {/* Features — bandă uniformă */}
        <Glass className="glass-liquid toolkit-strip mt-4 px-6 py-7 sm:mt-5 sm:px-8 sm:py-8">
          <ul className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            {PLATFORM_FEATURES.map(({ label, detail }, i) => (
              <li
                key={label}
                className={`toolkit-feature ${i > 0 ? "sm:border-l sm:border-white/10 sm:pl-6" : ""}`}
              >
                <p className="toolkit-feature-label">{label}</p>
                <p className="toolkit-body mt-2">{detail}</p>
              </li>
            ))}
          </ul>
        </Glass>
      </div>
    </section>
  );
}
