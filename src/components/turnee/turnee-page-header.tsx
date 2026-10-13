import { TurneeHowItWorks } from "@/components/turnee/turnee-how-it-works";

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

        <TurneeHowItWorks stepLabels={stepLabels} />
      </div>
    </header>
  );
}
