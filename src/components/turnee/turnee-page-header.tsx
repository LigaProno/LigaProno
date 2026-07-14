const STEP_NUMBERS = ["01", "02", "03"] as const;

export function TurneePageHeader({
  title,
  subtitle,
  stepsLabel,
  stepLabels,
}: {
  title: string;
  subtitle: string;
  stepsLabel: string;
  stepLabels: Array<{ title: string; desc: string }>;
}) {
  return (
    <header className="turnee-hero lg:col-span-2">
      <div className="turnee-hero-accent" aria-hidden />
      <div className="relative z-[1] flex flex-col gap-6">
        <div className="max-w-2xl">
          <p className="turnee-kicker">{stepsLabel}</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm sm:text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.52)" }}>
            {subtitle}
          </p>
        </div>

        <ol className="grid gap-3 sm:grid-cols-3">
          {STEP_NUMBERS.map((n, i) => (
            <li key={n} className="turnee-step">
              <span className="turnee-step-num">{n}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{stepLabels[i]?.title}</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
                  {stepLabels[i]?.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </header>
  );
}
