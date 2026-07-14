import type { CSSProperties, ReactNode } from "react";

const GOLD = "#C5A059";

export function TurneePanel({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`turnee-panel ${className}`.trim()} style={style}>
      <div className="turnee-panel-accent" aria-hidden />
      {children}
    </div>
  );
}

export function TurneeSectionTitle({
  title,
  badge,
  count,
}: {
  title: string;
  badge?: string;
  count?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-4">
      <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
      {badge ? (
        <span className="turnee-badge">{badge}</span>
      ) : null}
      {count != null ? (
        <span
          className="text-xs font-mono px-2 py-0.5 rounded-md"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.38)" }}
        >
          {count}
        </span>
      ) : null}
    </div>
  );
}

export function TurneeEmptyState({ message }: { message: string }) {
  return (
    <TurneePanel className="p-10 text-center">
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
        {message}
      </p>
    </TurneePanel>
  );
}

export function TurneeMetaChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "gold" | "neutral" | "code";
}) {
  const styles =
    tone === "gold" ?
      { backgroundColor: "rgba(197,160,89,0.14)", color: GOLD, border: "1px solid rgba(197,160,89,0.28)" }
    : tone === "code" ?
      { backgroundColor: "rgba(255,255,255,0.04)", color: GOLD, border: "1px solid rgba(197,160,89,0.22)" }
    : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0"
      style={styles}
    >
      {children}
    </span>
  );
}
